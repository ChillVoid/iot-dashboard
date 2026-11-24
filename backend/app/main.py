from datetime import timedelta
from contextlib import asynccontextmanager
import asyncio
import anyio
from time import monotonic
import hashlib
import hmac
import json
import re
import secrets
import uuid
from urllib.parse import urlsplit
from typing import Literal

from fastapi import FastAPI, HTTPException, Request, Response, WebSocket, WebSocketDisconnect
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field
from starlette.concurrency import run_in_threadpool
from sqlalchemy.exc import IntegrityError, SQLAlchemyError

from .config import Settings, BACKEND
from .assistant import Assistant, Question, basic_response, REQUEST_SECONDS
from .analytics import collect, Period, Source
from .assistant_training import TrainingStore, Proposal, Review
from .evaluation_review import CaseReview, read_reviews, save_review
from .origins import origin_allowed
from .player_assistant import answer as player_answer
from .database import make_engine, one, all_rows, execute
from .live import LiveHub, record_change
from .request_limits import RequestSizeLimit
from .machine_status import cabinet_state
from .device_commands import CommandAcknowledgement, poll_commands, acknowledge, requires_review, hold_for_review
from .device_protocol import APIInput, Placement, Result, BootRegistration, JournalEvent, RecoveryReason, RecoveryResolution
from .device_recovery import require_boot, register_boot, journal, request_fence, recovery_view, resolve
from .game import active_rules, stored_rules, rules_hash, canonical, replay, simulated_result, DEVICE_RULESETS
from .security import passwords, DUMMY_HASH, now, digest, csrf_for, verify_csrf, identity_lookup, encrypt_identity, set_cookie


def create_app(settings=None):
    settings = settings or Settings.load()
    engine = make_engine(settings.database_url)
    assistant = Assistant(settings, engine)
    training = TrainingStore(engine)
    live = LiveHub(engine)
    migration_files = tuple((BACKEND/'migrations').glob('*.sql'))
    required_migrations = {path.name for path in migration_files}
    required_tables = {'schema_migrations'} | {match.group(1) for path in migration_files
        for match in re.finditer(r'CREATE TABLE (?:IF NOT EXISTS )?([A-Za-z0-9_]+)',path.read_text(encoding='utf-8'))}
    @asynccontextmanager
    async def lifespan(_app):
        live.start()
        try: yield
        finally:
            await live.close()
            await assistant.close()
    app = FastAPI(title='Stack Moko Baby', docs_url=None, redoc_url=None, openapi_url=None,lifespan=lifespan)
    app.state.engine = engine
    app.state.settings = settings
    app.state.live = live
    app.add_middleware(RequestSizeLimit)

    @app.exception_handler(IntegrityError)
    async def conflicting_write(request, exc):
        return JSONResponse({'detail':'This record changed. Refresh and try again.'}, status_code=409)

    @app.exception_handler(SQLAlchemyError)
    async def database_unavailable(request, exc):
        # Do not expose SQL parameters, identity material or connection credentials.
        return JSONResponse({'detail':'The event database is unavailable. Please try again shortly.'}, status_code=503)

    @app.exception_handler(RequestValidationError)
    async def invalid_input(request, exc):
        # Never reflect a student's submitted ID (including malformed input) in errors.
        return JSONResponse({'detail':'Check the submitted fields.'}, status_code=422)

    @app.middleware('http')
    async def boundaries(request, call_next):
        if request.method not in ('GET','HEAD','OPTIONS'):
            origin = request.headers.get('origin')
            if origin and not origin_allowed(request, origin, settings):
                return JSONResponse({'detail':'This request origin is not allowed.'}, status_code=403)
        response = await call_next(request)
        response.headers['Cache-Control'] = 'no-store'
        response.headers['X-Content-Type-Options'] = 'nosniff'
        response.headers['Referrer-Policy'] = 'no-referrer'
        return response

    def subject(c, request, kind, write=False, required=True):
        raw = request.cookies.get('sm_admin' if kind=='admin' else 'sm_player', '')
        row = one(c, '''SELECT a.*,s.username,s.role,s.enabled AS staff_enabled FROM auth_sessions a
          LEFT JOIN staff_users s ON s.id=a.staff_user_id WHERE a.token_hash=:hash
          AND a.expires_at>:now AND a.revoked_at IS NULL''', hash=digest(raw), now=now()) if raw else None
        valid = row and (row['staff_user_id'] and row['staff_enabled'] if kind=='admin' else row['player_id'])
        if not valid:
            if required: raise HTTPException(401, 'Please sign in.' if kind=='admin' else 'Scan the cabinet QR code to join.')
            return None
        if write: verify_csrf(request, raw)
        return dict(row, csrf=csrf_for(settings, raw))

    def require_admin(p):
        # Operators run the line; only administrators change scores, accounts, training and the simulator.
        if p['role']!='admin': raise HTTPException(403,'Only an administrator can do this.')
        return p

    def session(c, response, kind, player_id=None, staff_id=None):
        raw=secrets.token_urlsafe(40)
        execute(c, '''INSERT INTO auth_sessions(token_hash,csrf_token_hash,player_id,staff_user_id,expires_at)
          VALUES(:hash,:csrf,:player,:staff,:expires)''', hash=digest(raw), csrf=digest(csrf_for(settings,raw)), player=player_id, staff=staff_id, expires=now()+timedelta(hours=12 if kind=='admin' else 24))
        set_cookie(response, settings, 'sm_admin' if kind=='admin' else 'sm_player', raw, 43200 if kind=='admin' else 86400)
        return csrf_for(settings,raw)

    def event_lock(c):
        return one(c, "SELECT * FROM events WHERE code='acs-day' FOR UPDATE")

    def live_identity(websocket, role):
        with engine.connect() as c:
            p = subject(c, websocket, role)
            event = one(c, "SELECT revision FROM events WHERE code='acs-day'")
            principal = (role, p['staff_user_id'] if role == 'admin' else p['player_id'])
            return principal, event['revision']

    @app.websocket('/api/live/{role}')
    async def live_updates(websocket:WebSocket, role:str):
        # Cookies are HttpOnly and never appear in the URL or outgoing frames.
        if role not in ('admin','player') or not origin_allowed(websocket, websocket.headers.get('origin'), settings):
            await websocket.close(code=1008)
            return
        try:
            principal, _ = await asyncio.to_thread(live_identity, websocket, role)
        except HTTPException:
            await websocket.close(code=1008)
            return
        except SQLAlchemyError:
            await websocket.close(code=1013)
            return
        queue = live.subscribe(principal)
        if queue is None:
            await websocket.close(code=1013)
            return
        receiver = None
        getter = None
        try:
            await websocket.accept()
            # Subscribe before reading the revision: a concurrent commit is either
            # represented here or queued by the dispatcher (possibly both).
            _, revision = await asyncio.to_thread(live_identity, websocket, role)
            await websocket.send_json({'type':'ready','revision':revision})
            receiver = asyncio.create_task(websocket.receive())
            while True:
                getter = asyncio.create_task(queue.get())
                done, _ = await asyncio.wait((receiver, getter), timeout=live.heartbeat,
                                             return_when=asyncio.FIRST_COMPLETED)
                if receiver in done:
                    # This is a server-only invalidation channel, not a command API.
                    if receiver.result()['type'] != 'websocket.disconnect':
                        await websocket.close(code=1008)
                    break
                changed = getter in done
                if not changed:
                    getter.cancel()
                    await asyncio.gather(getter, return_exceptions=True)
                # Recheck expiry, logout and account disabling before every frame.
                _, revision = await asyncio.to_thread(live_identity, websocket, role)
                await asyncio.wait_for(websocket.send_json({
                    'type':'invalidate' if changed else 'heartbeat','revision':revision}), timeout=5)
        except HTTPException:
            await websocket.close(code=1008)
        except SQLAlchemyError:
            await websocket.close(code=1013)
        except (WebSocketDisconnect, RuntimeError, TimeoutError):
            pass
        except asyncio.CancelledError:
            # ASGI shutdown/disconnect may cancel while a DB check is in flight.
            pass
        finally:
            live.unsubscribe(queue)
            tasks = [task for task in (receiver, getter) if task is not None]
            for task in tasks: task.cancel()
            with anyio.CancelScope(shield=True):
                await asyncio.gather(*tasks, return_exceptions=True)

    def machine(c, lock=False):
        return one(c, "SELECT * FROM machines WHERE code='cabinet-01'"+(' FOR UPDATE' if lock else ''))

    def active(c):
        return one(c, '''SELECT g.*,p.nickname,p.public_code FROM game_sessions g JOIN players p ON p.id=g.player_id
          WHERE g.active_machine_id=1 LIMIT 1''')

    def machine_state(m,g):
        return cabinet_state(m,g,now(),settings.simulator_enabled)

    def rounds(c, source=None, ruleset_id=None):
        if ruleset_id is None:
            rules_row,rules=active_rules(c)
            ruleset_id=rules_row['id']
        else:
            _,rules=stored_rules(c,ruleset_id=ruleset_id)
        rows=all_rows(c, '''SELECT g.*,p.nickname,p.public_code FROM game_sessions g JOIN players p ON p.id=g.player_id
          WHERE g.status='completed' AND g.invalidated_at IS NULL AND g.ruleset_id=:rules AND (:source IS NULL OR g.result_source=:source)
          ORDER BY g.completed_at DESC,g.id DESC''', source=source,rules=ruleset_id)
        proofs={}
        for p in all_rows(c, '''SELECT p.* FROM placements p JOIN game_sessions g ON g.id=p.session_id
          WHERE g.status='completed' AND g.invalidated_at IS NULL AND g.ruleset_id=:rules AND (:source IS NULL OR g.result_source=:source)
          ORDER BY p.session_id,p.sequence_no''',source=source,rules=ruleset_id):
            proofs.setdefault(p['session_id'],[]).append(p)
        result=[]
        for r in rows:
            placements=proofs.get(r['id'],[])
            result.append({'id':r['public_id'],'code':r['public_code'],'nickname':r['nickname'], 'won':r['outcome']=='win',
              'reason':{'target_reached':'Target reached','zero_overlap':'No overlap','timeout':'Time expired'}[r['end_reason']],
              'ruleset':rules['code'],'maxLevel':rules['levels'],
              'score':r['score'],'level':r['highest_level'],'perfect':r['perfect_rows'], 'overlap':r['overlap_total'],
              'totalWidth':r['attempted_width_total'],'accuracy':round(100*r['overlap_total']/r['attempted_width_total'],1) if r['attempted_width_total'] else 0,
              'duration':round(r['duration_ms']/1000,2),'hour':(r['completed_at'].hour+8)%24,
              'completedAt':r['completed_at'].isoformat()+'Z','source':r['result_source'],
              'placements':[{'level':p['level_no'],'overlap':p['overlap_width'],'width':p['candidate_width']} for p in placements]})
        return result

    def player_context(c, request):
        generated_at=now().isoformat()+'Z'
        p=subject(c,request,'player',required=False)
        raw=request.cookies.get('sm_entry','')
        grant=one(c, '''SELECT e.*,q.enabled FROM entry_grants e JOIN qr_links q ON q.id=e.qr_link_id
          WHERE e.token_hash=:hash AND e.expires_at>:now''',hash=digest(raw),now=now()) if raw else None
        event=one(c,"SELECT status,revision FROM events WHERE code='acs-day'")
        result={'game':active_rules(c)[1], 'canRegister':bool(grant and grant['enabled'] and not grant['used_at']), 'admissionsOpen':event['status']=='open',
          'revision':event['revision'],'generatedAt':generated_at,
          'csrf':p['csrf'] if p else csrf_for(settings,raw) if grant else '', 'ticket':None, 'notifications':[]}
        if not p: return result
        cabinet_state=machine_state(machine(c),active(c))
        result['cabinetState']=cabinet_state
        result['queueState']=('paused' if event['status']!='open' else
          'offline' if cabinet_state=='offline' else 'review' if cabinet_state=='review' else
          'awaiting_operator' if cabinet_state=='ready' else 'busy')
        q=one(c, '''SELECT q.*,p.nickname,p.public_code,g.public_id AS session_uuid,g.status AS game_status,g.outcome,g.score,g.highest_level,g.result_source,g.ruleset_id
          FROM queue_entries q JOIN players p ON p.id=q.player_id LEFT JOIN game_sessions g ON g.queue_entry_id=q.id
          WHERE q.player_id=:player ORDER BY q.id DESC LIMIT 1''',player=p['player_id'])
        if q:
            position=one(c,"SELECT COUNT(*) AS n FROM queue_entries WHERE event_id=:event AND status='waiting' AND (joined_at<:joined OR (joined_at=:joined AND id<=:id))",event=q['event_id'],joined=q['joined_at'],id=q['id'])['n'] if q['status']=='waiting' else None
            status= 'completed' if q['game_status']=='completed' else 'review' if q['game_status']=='review' else 'playing' if q['game_status']=='playing' else 'called' if q['status']=='assigned' else q['status']
            result['ticket']={'id':q['public_id'],'nickname':q['nickname'],'code':q['public_code'],'status':status,'position':position,
              'game':stored_rules(c,ruleset_id=q['ruleset_id'])[1] if q['ruleset_id'] else result['game'],
              'sessionId':q['session_uuid'],'outcome':q['outcome'],'score':q['score'],'level':q['highest_level'],'source':q['result_source']}
        result['notifications']=[{'id':r['public_id'],'outcome':r['outcome'],'score':r['score']} for r in all_rows(c,'''SELECT n.public_id,g.outcome,g.score FROM player_notifications n JOIN game_sessions g ON g.id=n.session_id WHERE n.player_id=:player ORDER BY n.id DESC LIMIT 5''',player=p['player_id'])]
        return result

    def audit(c,staff,action,entity=None,reason=None,entity_type='queue',details=None):
        execute(c,'''INSERT INTO audit_logs(event_id,staff_user_id,action,entity_type,entity_public_id,reason,details_safe,request_id)
          VALUES(1,:staff,:action,:kind,:entity,:reason,:details,:request)''',staff=staff,action=action,kind=entity_type,entity=entity,reason=reason,details=json.dumps(details or {}),request=str(uuid.uuid4()))

    @app.get('/api/health')
    def health():
        with engine.connect() as c:
            tables={next(iter(row.values())) for row in all_rows(c,'SHOW TABLES')}
            if not required_tables<=tables:
                raise HTTPException(503,'Database setup is incomplete. Follow the project setup guide.')
            applied={row['version'] for row in all_rows(c,'SELECT version FROM schema_migrations')}
            if not required_migrations or not required_migrations<=applied:
                raise HTTPException(503,'Database migrations are incomplete. Follow the project setup guide.')
            configured=one(c,"SELECT e.id FROM events e JOIN machines m ON m.event_id=e.id AND m.code='cabinet-01' WHERE e.code='acs-day' AND e.id=1 AND m.id=1")
            if not configured: raise HTTPException(503,'The initial event configuration is incomplete.')
            try: active_rules(c)
            except ValueError: raise HTTPException(503,'The game rules configuration is incomplete.') from None
        return {'status':'ok','application':'stack-moko-baby','database':'MariaDB'}

    def visitor_address(request):
        # Behind the Cloudflare tunnel every request arrives from cloudflared on this PC, so one
        # stranger's failed guesses would lock out every staff member. Cloudflare replaces
        # CF-Connecting-IP with the real visitor address; trust it only from a loopback peer.
        peer=request.client.host if request.client else ''
        forwarded=request.headers.get('cf-connecting-ip','').strip()
        if peer in ('127.0.0.1','::1') and forwarded and len(forwarded)<=45 and re.fullmatch(r'[0-9A-Fa-f:.]+',forwarded):
            return 'cf:'+forwarded
        return peer

    @app.post('/api/admin/login')
    def login(body:Login, request:Request,response:Response):
        key=digest(visitor_address(request)+'\0'+body.username.lower())
        with engine.begin() as c:
            execute(c, 'INSERT IGNORE INTO login_attempts(key_hash,attempts,window_start) VALUES(:key,0,:now)',key=key,now=now())
            a=one(c,'SELECT * FROM login_attempts WHERE key_hash=:key FOR UPDATE',key=key)
            count=a['attempts'] if (now()-a['window_start']).total_seconds()<900 else 0
            if count>=8: return JSONResponse({'detail':'Too many attempts. Try again in 15 minutes.'},status_code=429)
            user=one(c,'SELECT * FROM staff_users WHERE username=:name',name=body.username)
            try: valid=passwords.verify(body.password,user['password_hash'] if user else DUMMY_HASH)
            except Exception: valid=False
            if not valid or not user or not user['enabled']:
                execute(c,'UPDATE login_attempts SET attempts=:count,window_start=:start WHERE key_hash=:key',key=key,count=count+1,start=a['window_start'] if count else now())
                return JSONResponse({'detail':'Username or password is incorrect.'},status_code=401)
            execute(c,'DELETE FROM login_attempts WHERE key_hash=:key',key=key)
            old=request.cookies.get('sm_admin')
            if old: execute(c,'UPDATE auth_sessions SET revoked_at=:now WHERE token_hash=:hash',now=now(),hash=digest(old))
            return {'username':user['username'],'role':user['role'],'csrf':session(c,response,'admin',staff_id=user['id'])}

    @app.get('/api/admin/session')
    def admin_session(request:Request):
        with engine.connect() as c:
            p=subject(c,request,'admin')
            return {'username':p['username'],'role':p['role'],'csrf':p['csrf']}

    @app.post('/api/admin/logout')
    def logout(request:Request,response:Response):
        with engine.begin() as c:
            p=subject(c,request,'admin',write=True)
            execute(c,'UPDATE auth_sessions SET revoked_at=:now WHERE id=:id',now=now(),id=p['id'])
        response.delete_cookie('sm_admin',path='/api')
        return {'ok':True}

    @app.get('/api/admin/snapshot')
    def snapshot(request:Request):
        generated_at=now().isoformat()+'Z'
        with engine.connect().execution_options(isolation_level='REPEATABLE READ') as c:
            subject(c,request,'admin')
            m=machine(c);g=active(c)
            event=one(c,"SELECT * FROM events WHERE code='acs-day'")
            qr=one(c,'SELECT token FROM qr_links WHERE enabled=1 AND machine_id=:id LIMIT 1',id=m['id'])
            queue=all_rows(c,"SELECT q.public_id,p.nickname,p.public_code,q.joined_at FROM queue_entries q JOIN players p ON p.id=q.player_id WHERE q.event_id=1 AND q.status='waiting' ORDER BY q.joined_at,q.id")
            commands=all_rows(c, '''SELECT d.public_id,d.command_type,d.status,d.expected_revision,
              d.created_at,d.acknowledged_at,d.applied_at,d.expires_at,d.rejection_code,
              g.public_id AS session_uuid,g.result_source FROM device_commands d LEFT JOIN game_sessions g ON g.id=d.session_id
              WHERE d.machine_id=:id ORDER BY d.id DESC LIMIT 5''', id=m['id'])
            return {'game':active_rules(c)[1], 'revision':event['revision'],'generatedAt':generated_at,
              'queue':[{'id':q['public_id'],'nickname':q['nickname'],'code':q['public_code'],'joinedAt':q['joined_at'].isoformat()+'Z'} for q in queue],
              'admissionsOpen':event['status']=='open','machineState':machine_state(m,g),'machine':{'lastSeen':m['last_seen_at'].isoformat()+'Z' if m['last_seen_at'] else None,'health':json.loads(m['health'] or '{}'),'firmware':m['firmware_version']},
              'currentPlayer':{'nickname':g['nickname'],'code':g['public_code'],'sessionId':g['public_id'],'source':g['result_source'],
                'revision':g['revision'],'status':g['status'],'reviewRequired':requires_review(g)} if g else None,
              'deviceRecovery':recovery_view(c,m,g) if g and g['result_source']=='device' else None,
              'deviceCommands':[{'id':d['public_id'],'type':d['command_type'],'status':d['status'],
                'source':d['result_source'],
                'expectedRevision':d['expected_revision'],'sessionId':d['session_uuid'], 'rejectionCode':d['rejection_code'],
                **{key:d[column].isoformat()+'Z' if d[column] else None for key,column in (
                  ('createdAt','created_at'),('acknowledgedAt','acknowledged_at'),('appliedAt','applied_at'),('expiresAt','expires_at'))}} for d in commands],
              'rounds':rounds(c),'qrPath':'/join/'+qr['token'] if qr else None,'simulatorEnabled':settings.simulator_enabled}

    def assistant_staff(request,write=False,admin=False):
        with engine.connect() as c:
            p=subject(c,request,'admin',write=write)
            return (require_admin(p) if admin else p)['staff_user_id']

    @app.get('/api/admin/assistant/status')
    async def assistant_status(request:Request):
        await run_in_threadpool(assistant_staff,request)
        return await assistant.status()

    @app.get('/api/admin/analytics')
    def analytics(request:Request,period:Period='event_to_date',source:Source='simulator'):
        with engine.connect() as c: subject(c,request,'admin')
        return collect(engine,period,source,simulator_enabled=settings.simulator_enabled)

    @app.post('/api/admin/assistant/prepare')
    async def assistant_prepare(request:Request):
        await asyncio.to_thread(assistant_staff,request,True)
        return await assistant.prepare()

    @app.get('/api/admin/assistant/memory')
    async def assistant_memory(request:Request):
        staff_id=await asyncio.to_thread(assistant_staff,request)
        return await assistant.memory_view(staff_id)

    @app.delete('/api/admin/assistant/memory')
    async def assistant_forget_memory(request:Request):
        staff_id=await asyncio.to_thread(assistant_staff,request,True)
        return await assistant.forget_memory(staff_id)

    @app.get('/api/admin/evaluation-review')
    def evaluation_questions(request:Request,response:Response):
        response.headers['Cache-Control']='private, no-store'
        with engine.connect() as c:
            owner=require_admin(subject(c,request,'admin'))['staff_user_id']
            return read_reviews(c,owner)

    @app.put('/api/admin/evaluation-review/{case_id}')
    def evaluation_decision(case_id:str,body:CaseReview,request:Request):
        with engine.begin() as c:
            owner=require_admin(subject(c,request,'admin',write=True))['staff_user_id']
            return save_review(c,owner,case_id,body)

    @app.get('/api/admin/assistant/training/options')
    def assistant_training_options(request:Request):
        assistant_staff(request,admin=True)
        return training.options()

    @app.get('/api/admin/assistant/training')
    def assistant_training_list(request:Request,before:int|None=None):
        staff_id=assistant_staff(request,admin=True)
        return training.list(staff_id,before)

    @app.post('/api/admin/assistant/training')
    def assistant_training_propose(body:Proposal,request:Request):
        staff_id=assistant_staff(request,True,admin=True)
        return training.propose(staff_id,body)

    @app.patch('/api/admin/assistant/training/{example_id}')
    def assistant_training_review(example_id:uuid.UUID,body:Review,request:Request):
        staff_id=assistant_staff(request,True,admin=True)
        return training.review(staff_id,str(example_id),body)

    @app.delete('/api/admin/assistant/training/{example_id}')
    def assistant_training_remove(example_id:uuid.UUID,request:Request):
        staff_id=assistant_staff(request,True,admin=True)
        return training.remove(staff_id,str(example_id))

    @app.post('/api/admin/assistant/training/export')
    def assistant_training_export(request:Request):
        staff_id=assistant_staff(request,True,admin=True)
        return training.export(staff_id)

    @app.post('/api/admin/assistant/query')
    async def assistant_query(body:Question,request:Request):
        async def within_deadline():
            staff_id=None
            started=monotonic()
            try:
                async with asyncio.timeout(REQUEST_SECONDS):
                    staff_id=await asyncio.to_thread(assistant_staff,request,True)
                    return await assistant.ask(body,staff_id,started=started)
            except asyncio.TimeoutError:
                if staff_id is None:
                    raise HTTPException(503,'Sign-in verification took too long. Please retry shortly.')
                result=basic_response(body,'unavailable','The assistant request reached its time limit. Please retry shortly. Ordinary dashboard functions remain available.','timeout')
                assistant.enqueue_audit(staff_id,result,'timeout',{},int((monotonic()-started)*1000))
                return result
        async def disconnected():
            while not await request.is_disconnected(): await asyncio.sleep(0.25)
        answer=asyncio.create_task(within_deadline())
        disconnect=asyncio.create_task(disconnected())
        try:
            done,_=await asyncio.wait([answer,disconnect],return_when=asyncio.FIRST_COMPLETED)
            if answer in done: return await answer
            return Response(status_code=499)
        finally:
            for task in (answer,disconnect):
                if not task.done(): task.cancel()
            await asyncio.gather(answer,disconnect,return_exceptions=True)

    @app.post('/api/player/entry')
    def entry(body:Entry,request:Request,response:Response):
        try:
            scanned=urlsplit(body.qrContent.strip())
            scanned_origin=f'{scanned.scheme.lower()}://{scanned.netloc.lower()}'
            match=re.fullmatch(r'/join/([A-Za-z0-9_-]{43})',scanned.path)
            if scanned.scheme not in ('http','https') or not origin_allowed(request, scanned_origin, settings) or scanned.username or scanned.password or scanned.query or scanned.fragment or not match:
                raise ValueError()
            token=match.group(1)
        except ValueError:
            raise HTTPException(422,'Scan a Stack Moko Baby QR code for this event website.')
        with engine.begin() as c:
            event_lock(c)
            qr=one(c,'SELECT * FROM qr_links WHERE token=:token AND enabled=1',token=token)
            if not qr: raise HTTPException(404,'This QR code is no longer active. Ask the operator for the current code.')
            raw=secrets.token_urlsafe(40)
            execute(c,'INSERT INTO entry_grants(token_hash,qr_link_id,expires_at) VALUES(:hash,:qr,:expires)',hash=digest(raw),qr=qr['id'],expires=now()+timedelta(hours=2))
            set_cookie(response,settings,'sm_entry',raw,7200)
        return {'ok':True}

    @app.get('/api/player/context')
    def context(request:Request):
        with engine.connect().execution_options(isolation_level='REPEATABLE READ') as c:
            return player_context(c,request)

    @app.post('/api/player/register')
    def register(body:Registration,request:Request,response:Response):
        nickname=body.nickname.strip();student=body.studentId.strip()
        if not re.fullmatch(r'[\w .\-]{2,24}',nickname) or not re.fullmatch(r'[A-Za-z0-9\-]{4,32}',student) or not body.acknowledged:
            raise HTTPException(422,'Enter a valid nickname and student ID, and acknowledge the privacy notice.')
        with engine.begin() as c:
            event=event_lock(c)
            raw=request.cookies.get('sm_entry','')
            grant=one(c,'''SELECT e.*,q.enabled FROM entry_grants e JOIN qr_links q ON q.id=e.qr_link_id WHERE e.token_hash=:hash AND e.expires_at>:now FOR UPDATE''',hash=digest(raw),now=now())
            if not grant or not grant['enabled']: raise HTTPException(403,'Scan the cabinet QR code first.')
            player=subject(c,request,'player',required=False)
            verify_csrf(request,request.cookies.get('sm_player') if player else raw)
            if grant['used_at']:
                if not player or player['player_id']!=grant['player_id']: raise HTTPException(409,'This entry has already been used. Scan the QR again.')
                return {'ok':True}
            if event['status']!='open': raise HTTPException(409,'Admissions are paused. Please check with the operator.')
            identity=one(c,"SELECT player_id FROM student_identities WHERE institution_code='institution' AND lookup_key_version=1 AND id_lookup=:hash",hash=identity_lookup(settings,student))
            if identity and (not player or player['player_id']!=identity['player_id']):
                raise HTTPException(409,'We could not create a new ticket. Use your existing ticket or ask the operator for help.')
            if player and (not identity or identity['player_id']!=player['player_id']):
                raise HTTPException(409,'Use your existing player identity and ticket, or ask the operator for help.')
            if identity:
                pid=identity['player_id']
                if one(c,"SELECT id FROM queue_entries WHERE player_id=:id AND status IN ('waiting','assigned')",id=pid):
                    raise HTTPException(409,'Your ticket is already active. Open your queue ticket.')
                execute(c,'UPDATE players SET nickname=:name WHERE id=:id',name=nickname,id=pid)
            else:
                public=str(uuid.uuid4())
                pid=execute(c,"INSERT INTO players(public_id,public_code,nickname,notice_version,notice_ack_at) VALUES(:id,:code,:name,'2026-11-v1',:now)",id=public,code='SMB-'+secrets.token_hex(8).upper(),name=nickname,now=now()).lastrowid
                encrypted,nonce,tag=encrypt_identity(settings,student,public)
                execute(c,"INSERT INTO student_identities(player_id,institution_code,id_lookup,lookup_key_version,encrypted_id,nonce,auth_tag,encryption_key_version,purge_after) VALUES(:id,'institution',:hash,1,:encrypted,:nonce,:tag,1,:purge)",id=pid,hash=identity_lookup(settings,student),encrypted=encrypted,nonce=nonce,tag=tag,purge=event['ends_at']+timedelta(days=30))
            execute(c,"INSERT INTO queue_entries(public_id,event_id,player_id) VALUES(:uuid,1,:id)",uuid=str(uuid.uuid4()),id=pid)
            execute(c,'UPDATE entry_grants SET used_at=:now,player_id=:id WHERE id=:grant',now=now(),id=pid,grant=grant['id'])
            if player:
                execute(c,'UPDATE auth_sessions SET revoked_at=:now WHERE id=:id',now=now(),id=player['id'])
            session(c,response,'player',player_id=pid)
            record_change(c,'queue.changed')
        return {'ok':True}

    # ---- Operator-assisted ticket re-entry (24 Nov 2026) ----
    # After a lost phone, cleared browser or a new tunnel hostname, a player's cookie is gone
    # and re-registering is refused (the student ID already exists). The operator, who can see
    # the person, issues a one-time QR that restores that player's own session.
    def staff_view(r):
        return {'id':r['id'],'username':r['username'],'role':r['role'],'enabled':bool(r['enabled']),
                'createdAt':r['created_at'].isoformat()+'Z'}

    def one_time_password():
        alphabet='abcdefghjkmnpqrstuvwxyz23456789'  # no look-alike characters; easy to read out
        return '-'.join(''.join(secrets.choice(alphabet) for _ in range(4)) for _ in range(4))

    def operator_account(c,staff_id):
        row=one(c,'SELECT * FROM staff_users WHERE id=:id FOR UPDATE',id=staff_id)
        if not row: raise HTTPException(404,'Staff account not found.')
        if row['role']!='operator': raise HTTPException(403,'Administrator accounts are managed on the laptop, not here.')
        return row

    @app.get('/api/admin/staff')
    def list_staff(request:Request,response:Response):
        response.headers['Cache-Control']='private, no-store'
        with engine.connect() as c:
            require_admin(subject(c,request,'admin'))
            rows=all_rows(c,"SELECT id,username,role,enabled,created_at FROM staff_users ORDER BY role='operator',username")
        return {'staff':[staff_view(r) for r in rows]}

    @app.post('/api/admin/staff')
    def add_operator(body:NewOperator,request:Request,response:Response):
        response.headers['Cache-Control']='private, no-store'
        name=body.username.strip().lower()
        if not re.fullmatch(r'[a-z0-9][a-z0-9._-]{2,39}',name):
            raise HTTPException(422,'Use 3-40 letters, numbers, dots, dashes or underscores.')
        password=one_time_password()
        with engine.begin() as c:
            p=require_admin(subject(c,request,'admin',write=True))
            if one(c,'SELECT id FROM staff_users WHERE username=:name',name=name):
                raise HTTPException(409,'That username is already taken.')
            staff_id=execute(c,"INSERT INTO staff_users(username,password_hash,role) VALUES(:name,:hash,'operator')",
                             name=name,hash=passwords.hash(password)).lastrowid
            audit(c,p['staff_user_id'],'staff_created',str(staff_id),entity_type='staff',details={'username':name,'role':'operator'})
            row=one(c,'SELECT * FROM staff_users WHERE id=:id',id=staff_id)
        return {'staff':staff_view(row),'password':password}

    @app.post('/api/admin/staff/{staff_id}/password')
    def reset_operator_password(staff_id:int,request:Request,response:Response):
        response.headers['Cache-Control']='private, no-store'
        password=one_time_password()
        with engine.begin() as c:
            p=require_admin(subject(c,request,'admin',write=True))
            row=operator_account(c,staff_id)
            execute(c,'UPDATE staff_users SET password_hash=:hash WHERE id=:id',hash=passwords.hash(password),id=row['id'])
            execute(c,'UPDATE auth_sessions SET revoked_at=:now WHERE staff_user_id=:id AND revoked_at IS NULL',now=now(),id=row['id'])
            audit(c,p['staff_user_id'],'staff_password_reset',str(row['id']),entity_type='staff',details={'username':row['username']})
        return {'staff':staff_view(row),'password':password}

    @app.post('/api/admin/staff/{staff_id}/enabled')
    def set_operator_enabled(staff_id:int,body:StaffEnabled,request:Request):
        with engine.begin() as c:
            p=require_admin(subject(c,request,'admin',write=True))
            row=operator_account(c,staff_id)
            execute(c,'UPDATE staff_users SET enabled=:on WHERE id=:id',on=body.enabled,id=row['id'])
            if not body.enabled:
                execute(c,'UPDATE auth_sessions SET revoked_at=:now WHERE staff_user_id=:id AND revoked_at IS NULL',now=now(),id=row['id'])
            audit(c,p['staff_user_id'],'staff_enabled' if body.enabled else 'staff_disabled',str(row['id']),entity_type='staff',details={'username':row['username']})
            row=one(c,'SELECT * FROM staff_users WHERE id=:id',id=row['id'])
        return {'staff':staff_view(row)}

    @app.get('/api/admin/players')
    def find_players(request:Request, search:str=''):
        term=search.strip()[:40]
        like='%'+re.sub(r'([\\%_])',r'\\\1',term)+'%'
        with engine.connect() as c:
            subject(c,request,'admin')
            rows=all_rows(c,'''SELECT p.public_id,p.nickname,p.public_code,
                (SELECT q.status FROM queue_entries q WHERE q.player_id=p.id ORDER BY q.id DESC LIMIT 1) AS ticket,
                (SELECT MAX(q.joined_at) FROM queue_entries q WHERE q.player_id=p.id) AS joined
              FROM players p WHERE (:term='' OR p.nickname LIKE :like OR p.public_code LIKE :like)
              ORDER BY joined DESC, p.id DESC LIMIT 20''',term=term,like=like)
        return {'players':[{'id':r['public_id'],'nickname':r['nickname'],'code':r['public_code'],'ticket':r['ticket']} for r in rows]}

    @app.post('/api/admin/players/{public}/reentry')
    def issue_reentry(public:str,request:Request):
        with engine.begin() as c:
            p=subject(c,request,'admin',write=True)
            player=one(c,'SELECT id,public_id FROM players WHERE public_id=:id FOR UPDATE',id=public)
            if not player: raise HTTPException(404,'Player not found.')
            # Only the newest code works; an older unused one is cancelled.
            execute(c,'UPDATE player_reentry_tokens SET used_at=:now WHERE player_id=:id AND used_at IS NULL',now=now(),id=player['id'])
            raw=secrets.token_urlsafe(32); expires=now()+timedelta(minutes=REENTRY_MINUTES)
            execute(c,'''INSERT INTO player_reentry_tokens(token_hash,player_id,issued_by,expires_at)
              VALUES(:hash,:player,:staff,:expires)''',hash=digest(raw),player=player['id'],staff=p['staff_user_id'],expires=expires)
            audit(c,p['staff_user_id'],'player_reentry_issued',public,entity_type='player')
        # The token rides in the URL fragment, which browsers never send to the server or tunnel.
        return {'path':'/reenter#'+raw,'expiresAt':expires.isoformat()+'Z','minutes':REENTRY_MINUTES}

    @app.post('/api/player/reenter')
    def reenter(body:Reentry,response:Response):
        with engine.begin() as c:
            token=one(c,'''SELECT * FROM player_reentry_tokens WHERE token_hash=:hash
              AND used_at IS NULL AND expires_at>:now FOR UPDATE''',hash=digest(body.token),now=now())
            if not token:
                raise HTTPException(410,'This re-entry code has expired or was already used. Ask the operator for a new one.')
            execute(c,'UPDATE player_reentry_tokens SET used_at=:now WHERE id=:id',now=now(),id=token['id'])
            # One active device per player: the restored phone replaces any older session.
            execute(c,'UPDATE auth_sessions SET revoked_at=:now WHERE player_id=:id AND revoked_at IS NULL',now=now(),id=token['player_id'])
            session(c,response,'player',player_id=token['player_id'])
        return {'ok':True}

    # ---------- Stack Intelligence for players (read-only, deterministic, nothing stored) ----------
    asked = {}  # visitor -> recent question times (single API worker)
    ASK_LIMIT, ASK_WINDOW = 20, 60

    def manila_day_start():
        return (now()+timedelta(hours=8)).replace(hour=0,minute=0,second=0,microsecond=0)-timedelta(hours=8)

    def player_facts(c, request=None):
        rules_row,rules=active_rules(c)
        event=one(c,"SELECT status FROM events WHERE code='acs-day'")
        state=machine_state(machine(c),active(c))
        in_line=one(c,"SELECT COUNT(*) AS n FROM queue_entries WHERE event_id=1 AND status='waiting'")['n']
        recent=one(c,'''SELECT AVG(TIMESTAMPDIFF(SECOND,reserved_at,completed_at)) AS s FROM (SELECT reserved_at,completed_at
          FROM game_sessions WHERE status='completed' AND completed_at IS NOT NULL ORDER BY completed_at DESC LIMIT 10) r''')['s']
        start=manila_day_start()
        source='device' if one(c,'''SELECT id FROM game_sessions WHERE status='completed' AND result_source='device'
          AND ruleset_id=:rules AND completed_at>=:start LIMIT 1''',rules=rules_row['id'],start=start) or not settings.simulator_enabled else 'simulator'
        best=one(c,'''SELECT MAX(score) AS best, COUNT(DISTINCT CASE WHEN highest_level>=:top THEN player_id END) AS top FROM game_sessions
          WHERE status='completed' AND invalidated_at IS NULL AND ruleset_id=:rules AND result_source=:source AND completed_at>=:start''',
          top=rules['levels'],rules=rules_row['id'],source=source,start=start)
        facts={'rules':rules,'admissionsOpen':event['status']=='open','inLine':int(in_line),
               'cabinet':'ready' if state=='ready' else 'offline' if state=='offline' else 'busy',
               'roundSeconds':min(300.0,max(45.0,float(recent))) if recent else 90.0,
               'bestToday':best['best'],'topCount':int(best['top'] or 0),'ticket':None,'round':None}
        if request is None: return facts
        ticket=player_context(c,request).get('ticket')
        facts['ticket']=ticket
        if ticket and ticket['status']=='completed' and ticket.get('sessionId'):
            g=one(c,'SELECT * FROM game_sessions WHERE public_id=:id',id=ticket['sessionId'])
            if g and g['score'] is not None:
                same='''FROM game_sessions WHERE status='completed' AND invalidated_at IS NULL AND ruleset_id=:rules
                  AND result_source=:source AND completed_at>=:start'''
                first=one(c,'''SELECT level_no,overlap_width,candidate_width FROM placements WHERE session_id=:id
                  AND overlap_width<candidate_width ORDER BY sequence_no LIMIT 1''',id=g['id'])
                facts['round']={'won':g['outcome']=='win','score':g['score'],'level':g['highest_level'],'reason':g['end_reason'],
                  'higherToday':int(one(c,'SELECT COUNT(*) AS n '+same+' AND score>:score',rules=g['ruleset_id'],source=g['result_source'],start=start,score=g['score'])['n']),
                  'roundsToday':int(one(c,'SELECT COUNT(*) AS n '+same,rules=g['ruleset_id'],source=g['result_source'],start=start)['n']),
                  'firstLoss':{'level':first['level_no'],'kept':first['overlap_width'],'width':first['candidate_width']} if first else None}
        return facts

    @app.get('/api/player/lobby')
    def lobby():
        with engine.connect() as c:
            f=player_facts(c)
        # Aggregates only: no nicknames before a player has finished their own round.
        return {'inLine':f['inLine'],'cabinet':f['cabinet'],'admissionsOpen':f['admissionsOpen'],
                'waitMinutes':round(f['roundSeconds']*f['inLine']/60),
                'bestToday':f['bestToday'],'topCount':f['topCount'],'levels':f['rules']['levels'],
                'roundSeconds':f['rules']['round_limit_ms']//1000}

    @app.post('/api/player/assistant')
    def player_assistant(body:PlayerQuestion,request:Request):
        key=visitor_address(request); moment=monotonic()
        recent=[t for t in asked.get(key,[]) if moment-t<ASK_WINDOW]
        if len(recent)>=ASK_LIMIT:
            raise HTTPException(429,'That’s a lot of questions! Try again in a minute.')
        asked[key]=recent+[moment]
        if len(asked)>5000:  # forget idle visitors
            for stale in [k for k,v in asked.items() if moment-v[-1]>=ASK_WINDOW]: asked.pop(stale,None)
        with engine.connect() as c:
            facts=player_facts(c,request)
        return player_answer(body.question,facts)

    @app.post('/api/player/cancel')
    def cancel(request:Request):
        with engine.begin() as c:
            event_lock(c);p=subject(c,request,'player',write=True)
            changed=execute(c,"UPDATE queue_entries SET status='cancelled',closed_at=:now,revision=revision+1 WHERE player_id=:id AND status='waiting'",now=now(),id=p['player_id']).rowcount
            if changed: record_change(c,'queue.changed')
        return {'ok':True}

    @app.get('/api/player/leaderboard')
    def leaderboard(request:Request):
        with engine.connect() as c:
            p=subject(c,request,'player')
            completed=one(c,"SELECT g.result_source,g.status,g.ruleset_id FROM queue_entries q LEFT JOIN game_sessions g ON g.queue_entry_id=q.id WHERE q.player_id=:id ORDER BY q.id DESC LIMIT 1",id=p['player_id'])
            if not completed or completed['status']!='completed': raise HTTPException(403,'Finish your game to unlock the leaderboard.')
            return {'rounds':rounds(c,completed['result_source'],completed['ruleset_id']),'source':completed['result_source'],'game':stored_rules(c,ruleset_id=completed['ruleset_id'])[1]}

    @app.post('/api/admin/admissions')
    def admissions(body:Admissions,request:Request):
        with engine.begin() as c:
            p=subject(c,request,'admin',write=True);event=event_lock(c)
            status='open' if body.open else 'paused'
            if event['status'] != status:
                execute(c,'UPDATE events SET status=:status WHERE id=1',status=status)
                record_change(c,'event.changed')
            audit(c,p['staff_user_id'],'admissions_open' if body.open else 'admissions_paused')
        return {'ok':True}

    @app.post('/api/admin/queue/{ticket}/skip')
    def skip(ticket:str,body:Reason,request:Request):
        with engine.begin() as c:
            p=subject(c,request,'admin',write=True);event_lock(c)
            changed=execute(c,"UPDATE queue_entries SET status='cancelled',closed_at=:now,revision=revision+1 WHERE public_id=:id AND status='waiting'",now=now(),id=ticket).rowcount
            if not changed: raise HTTPException(409,'This ticket is no longer waiting.')
            record_change(c,'queue.changed',ticket)
            audit(c,p['staff_user_id'],'queue_skipped',ticket,body.reason.strip())
        return {'ok':True}

    @app.post('/api/admin/queue/call-next')
    def call_next(request:Request):
        with engine.begin() as c:
            p=subject(c,request,'admin',write=True);event=event_lock(c);m=machine(c,True)
            key=request.headers.get('Idempotency-Key','')
            if not re.fullmatch(r'[a-f0-9-]{36}',key): raise HTTPException(422,'A request key is required.')
            receipt=one(c,"SELECT response_safe FROM request_receipts WHERE actor_scope=:actor AND operation='call-next' AND idempotency_key=:key",actor='staff:'+str(p['staff_user_id']),key=key)
            if receipt: return json.loads(receipt['response_safe'])
            if event['status']!='open' or machine_state(m,active(c))!='ready': raise HTTPException(409,'The cabinet must be ready and admissions open.')
            q=one(c,"SELECT * FROM queue_entries WHERE event_id=1 AND status='waiting' ORDER BY joined_at,id LIMIT 1 FOR UPDATE")
            if not q: raise HTTPException(409,'No players are waiting.')
            source='simulator' if json.loads(m['health'] or '{}').get('source')=='simulator' else 'device'
            public=str(uuid.uuid4())
            rules_row,rules=active_rules(c)
            sid=execute(c,"INSERT INTO game_sessions(public_id,event_id,machine_id,queue_entry_id,player_id,ruleset_id,ready_deadline_at,result_source) VALUES(:uuid,1,1,:queue,:player,:rules,:deadline,:source)",uuid=public,queue=q['id'],player=q['player_id'],rules=rules_row['id'],deadline=now()+timedelta(minutes=3),source=source).lastrowid
            execute(c,"UPDATE queue_entries SET status='assigned',revision=revision+1 WHERE id=:id",id=q['id'])
            execute(c,"INSERT INTO device_commands(public_id,machine_id,session_id,command_type,expected_revision,payload,issued_by,expires_at) VALUES(:uuid,1,:sid,'reserve',1,:payload,:staff,:expires)",uuid=str(uuid.uuid4()),sid=sid,payload=json.dumps({'sessionId':public,'rules':rules,'rulesHash':rules_hash(rules).hex(),'source':source}),staff=p['staff_user_id'],expires=now()+timedelta(minutes=3))
            result={'sessionId':public}
            execute(c,"INSERT INTO request_receipts(actor_scope,operation,idempotency_key,request_hash,response_status,response_safe) VALUES(:actor,'call-next',:key,:hash,200,:response)",actor='staff:'+str(p['staff_user_id']),key=key,hash=digest('call-next'),response=json.dumps(result))
            audit(c,p['staff_user_id'],'player_called',public)
            record_change(c,'session.changed',public)
        return result

    def switch_game_device(request,token,action,message,device_kind):
        # Cabinet 01 is played by one device at a time: the web game screen (default since
        # 25 Nov 2026) or the LED cabinet. Switching replaces the device token, so the other one stops.
        with engine.begin() as c:
            p=require_admin(subject(c,request,'admin',write=True));event_lock(c);m=machine(c,True);g=active(c)
            if g and g['status'] in ('reserved','countdown','playing','awaiting_result'):
                raise HTTPException(409,message)
            execute(c,"UPDATE machines SET device_token_hash=:hash,observed_state='offline',last_seen_at=NULL WHERE id=:id",hash=digest(token),id=m['id'])
            # Each device plays its own ruleset (web screen: Matrix v2, LED firmware: Matrix v1).
            # Only new assignments use it; saved rounds keep the ruleset they were played under.
            stored_rules(c,code=DEVICE_RULESETS[device_kind])
            execute(c,"UPDATE events SET settings=JSON_SET(COALESCE(settings,'{}'),'$.active_ruleset',:code),revision=revision+1 WHERE id=1",code=DEVICE_RULESETS[device_kind])
            record_change(c,'machine.changed')
            audit(c,p['staff_user_id'],action,m['public_id'],entity_type='machine')

    @app.post('/api/admin/screen/pair')
    def pair_screen(request:Request):
        # A fresh device token for this browser only, returned once.
        token=secrets.token_urlsafe(32)
        switch_game_device(request,token,'screen_paired','Finish the current round before pairing a game screen.','screen')
        return JSONResponse({'ok':True,'deviceToken':token},headers={'Cache-Control':'no-store'})

    @app.post('/api/admin/screen/use-led-cabinet')
    def use_led_cabinet(request:Request):
        # Back to the LED cabinet: restore the configured STACK_DEVICE_TOKEN (the one the launcher
        # builds into the private firmware config.h). Any paired game screen stops working.
        switch_game_device(request,settings.device_token,'led_cabinet_restored','Finish the current round before switching to the LED cabinet.','led')
        return {'ok':True}

    def device(c,request,lock=True,boot_check=True):
        raw=request.headers.get('X-Device-Token','')
        m=machine(c,lock)
        if not raw or not hmac.compare_digest(digest(raw),m['device_token_hash']): raise HTTPException(401,'Device authentication required.')
        if boot_check: require_boot(c,m,request.headers.get('X-Device-Boot-Id'))
        return m

    def legacy_device(c,m):
        if require_boot(c,m,None):
            raise HTTPException(409,'Use the boot-bound journal protocol for this cabinet.')

    def start(c,public,source):
        g=one(c,'SELECT * FROM game_sessions WHERE public_id=:id FOR UPDATE',id=public)
        if not g or g['result_source']!=source: raise HTTPException(409,'This round does not belong to this source.')
        if g['status']=='playing': return {'ok':True}
        if g['status']!='reserved' or g['ready_deadline_at']<now(): raise HTTPException(409,'This reservation is not ready to start. Ask the operator.')
        if source=='device':
            m=machine(c)
            accepted=one(c, "SELECT id FROM device_commands WHERE session_id=:id AND command_type='reserve' AND status='accepted' AND receipt_hash IS NOT NULL AND expected_revision=:revision AND expires_at>:now",id=g['id'],revision=g['revision'],now=now())
            if not accepted or not m['enabled'] or m['maintenance']:
                raise HTTPException(409,'The device must durably accept the reservation before starting.')
        execute(c,"UPDATE game_sessions SET status='playing',started_at=:now,revision=revision+1 WHERE id=:id",now=now(),id=g['id'])
        execute(c,"UPDATE device_commands SET status='applied',applied_at=:now WHERE session_id=:id AND command_type='reserve' AND status IN ('pending','accepted')",now=now(),id=g['id'])
        record_change(c,'session.changed',public)
        return {'ok':True}

    def finish(c,public,body,source):
        g=one(c,'SELECT * FROM game_sessions WHERE public_id=:id FOR UPDATE',id=public)
        if not g or g['result_source']!=source: raise HTTPException(409,'This round does not belong to this source.')
        payload=body.model_dump(mode='json') if isinstance(body,BaseModel) else body
        hashed=hashlib.sha256(canonical(payload).encode()).digest()
        if g['status']=='completed':
            if g['terminal_id']==payload['terminalId'] and hmac.compare_digest(g['result_hash'],hashed): return {'ok':True,'score':g['score']}
            raise HTTPException(409,'A different terminal result was already recorded.')
        if g['status']!='playing': raise HTTPException(409,'Start this round before submitting a result.')
        _,rules=stored_rules(c,ruleset_id=g['ruleset_id'])
        if payload['rulesHash']!=rules_hash(rules).hex(): raise HTTPException(422,'Ruleset mismatch.')
        try: result=replay(payload['placements'],payload['durationMs'],payload['outcome'],rules)
        except (ValueError,KeyError,TypeError): raise HTTPException(422,'The placement trace is not valid for this ruleset.')
        if source=='device' and (now()-g['started_at']).total_seconds()*1000+2000<payload['durationMs']: raise HTTPException(422,'Result timing is not valid.')
        for seq,p in enumerate(result['placements'],1):
            execute(c,'''INSERT INTO placements(session_id,sequence_no,level_no,candidate_x,candidate_width,support_x,support_width,overlap_width,locked_at_ms)
              VALUES(:id,:seq,:level,:x,:width,:sx,:sw,:overlap,:locked)''',id=g['id'],seq=seq,level=p['level'],x=p['x'],width=p['width'],sx=p['support_x'],sw=p['support_width'],overlap=p['overlap'],locked=p['locked'])
        execute(c,'''UPDATE game_sessions SET status='completed',completed_at=:now,received_at=:now,terminal_id=:terminal,result_hash=:hash,
          outcome=:outcome,end_reason=:reason,duration_ms=:duration,score=:score,highest_level=:level,perfect_rows=:perfect,
          overlap_total=:retained,attempted_width_total=:attempted,revision=revision+1 WHERE id=:id''',now=now(),terminal=payload['terminalId'],hash=hashed,outcome=payload['outcome'],reason=result['reason'],duration=payload['durationMs'],score=result['score'],level=result['level'],perfect=result['perfect'],retained=result['retained'],attempted=result['attempted'],id=g['id'])
        execute(c,"UPDATE queue_entries SET status='served',closed_at=:now,revision=revision+1 WHERE id=:id",now=now(),id=g['queue_entry_id'])
        execute(c,"UPDATE machines SET observed_state='ready',last_seen_at=:now WHERE id=1",now=now())
        execute(c,'INSERT INTO player_notifications(public_id,player_id,session_id) VALUES(:uuid,:player,:session)',uuid=str(uuid.uuid4()),player=g['player_id'],session=g['id'])
        record_change(c,'round.completed',public)
        return {'ok':True,'score':result['score']}

    @app.post('/api/admin/simulator/{action}')
    def simulator(action:str,request:Request):
        if not settings.simulator_enabled: raise HTTPException(404,'Simulator disabled.')
        with engine.begin() as c:
            p=require_admin(subject(c,request,'admin',write=True));event_lock(c);machine(c,True);g=active(c)
            if action=='ready':
                if g: raise HTTPException(409,'Finish or release the active round first.')
                execute(c,"UPDATE machines SET observed_state='ready',last_seen_at=:now,health=:health WHERE id=1",now=now(),health='{"source":"simulator"}')
                record_change(c,'machine.changed')
                result={'ok':True}
            elif action=='start' and g: result=start(c,g['public_id'],'simulator')
            elif action in ('win','loss') and g: result=finish(c,g['public_id'],simulated_result(action,stored_rules(c,ruleset_id=g['ruleset_id'])[1]),'simulator')
            elif action=='release' and g and g['result_source']=='simulator':
                execute(c,"UPDATE game_sessions SET status='aborted',end_reason='operator_abort',revision=revision+1 WHERE id=:id",id=g['id'])
                execute(c,"UPDATE queue_entries SET status='cancelled',closed_at=:now,revision=revision+1 WHERE id=:id",now=now(),id=g['queue_entry_id'])
                execute(c,"UPDATE device_commands SET status='expired' WHERE session_id=:id AND status='pending'",id=g['id'])
                record_change(c,'session.changed',g['public_id'])
                result={'ok':True}
            else: raise HTTPException(409,'This action is not available for the current round.')
            audit(c,p['staff_user_id'],'simulator_'+action,g['public_id'] if g else None)
        return result

    @app.post('/api/device/heartbeat')
    def heartbeat(body:Heartbeat,request:Request):
        with engine.begin() as c:
            event_lock(c);m=device(c,request)
            g=active(c)
            if g and g['result_source']=='simulator':
                raise HTTPException(409,'A simulator round currently owns this cabinet.')
            if g and requires_review(g) and g['status']!='review':
                hold_for_review(c,g)
            execute(c,'UPDATE machines SET observed_state=:state,last_seen_at=:now,firmware_version=:firmware,health=:health WHERE id=1',state=body.state,now=now(),firmware=body.firmware,health=json.dumps({'source':'device','rssi':body.rssi}))
            previous=json.loads(m['health'] or '{}')
            if (m['observed_state'] != body.state or m['firmware_version'] != body.firmware
                    or previous != {'source':'device','rssi':body.rssi}
                    or not m['last_seen_at'] or (now()-m['last_seen_at']).total_seconds()>=15):
                record_change(c,'machine.changed')
            g=active(c)
            rules=stored_rules(c,ruleset_id=g['ruleset_id'])[1] if g else active_rules(c)[1]
            return {'activeSession':g['public_id'] if g and g['result_source']=='device' else None,'rules':rules,'rulesHash':rules_hash(rules).hex()}

    @app.get('/api/device/enrollment')
    def enrollment(request:Request):
        # Read-only lineage discovery for erased flash/Wokwi resets. A new
        # storageId still forces review and cannot prove an old game unstarted.
        from .device_recovery import current_boot
        with engine.connect() as c:
            m=device(c,request,lock=False,boot_check=False)
            boot=current_boot(c,m['id'])
            return {'currentBootId':boot['public_id'] if boot else None}

    @app.post('/api/device/boot')
    def device_boot(body:BootRegistration,request:Request):
        with engine.begin() as c:
            event_lock(c);m=device(c,request,boot_check=False)
            return register_boot(c,m,body)

    @app.post('/api/device/journal')
    def device_journal(body:JournalEvent,request:Request):
        with engine.begin() as c:
            event_lock(c);m=device(c,request)
            result=journal(c,m,require_boot(c,m,request.headers.get('X-Device-Boot-Id')),body,start,finish)
        return result if result['ok'] else JSONResponse({key:value for key,value in result.items() if key in ('detail','code')},status_code=409)

    @app.get('/api/device/commands')
    def device_commands(request:Request):
        with engine.connect().execution_options(isolation_level='REPEATABLE READ') as c:
            return poll_commands(c,device(c,request,False))

    @app.post('/api/device/commands/{public}/ack')
    def device_ack(public:str,body:CommandAcknowledgement,request:Request):
        with engine.begin() as c:
            event_lock(c);m=device(c,request)
            legacy_device(c,m)
            result=acknowledge(c,m,public,body)
        return result if result['ok'] else JSONResponse({'detail':result['detail']},status_code=409)

    @app.post('/api/admin/sessions/{public}/review')
    def flag_review(public:str,body:ReviewRound,request:Request):
        with engine.begin() as c:
            p=subject(c,request,'admin',write=True);event_lock(c);machine(c,True)
            g=one(c,'SELECT * FROM game_sessions WHERE public_id=:id AND machine_id=1 FOR UPDATE',id=public)
            if not g or g['result_source']!='device': raise HTTPException(409,'Select an active physical-device round.')
            if body.expectedRevision!=g['revision']: raise HTTPException(409,'The round changed. Refresh and review it again.')
            if hold_for_review(c,g): audit(c,p['staff_user_id'],'device_review_requested',public,body.reason.strip(),entity_type='session')
        return {'ok':True}

    @app.post('/api/admin/sessions/{public}/fence')
    def fence_round(public:str,body:RecoveryReason,request:Request):
        return recovery_action(public,body,request,'fence')

    @app.post('/api/admin/sessions/{public}/resolve')
    def resolve_round(public:str,body:RecoveryResolution,request:Request):
        return recovery_action(public,body,request,'resolve')

    def recovery_action(public,body,request,operation):
        with engine.begin() as c:
            p=subject(c,request,'admin',write=True)
            # Releasing a no-show keeps no score, so operators may do it; voiding or recovering a score is admin-only.
            if operation=='resolve' and body.action!='release_unstarted': require_admin(p)
            event_lock(c);m=machine(c,True)
            key=request.headers.get('Idempotency-Key','')
            if not re.fullmatch(r'[a-f0-9-]{36}',key): raise HTTPException(422,'A request key is required.')
            actor='staff:'+str(p['staff_user_id']);op='device-'+operation
            hashed=digest(canonical({'sessionId':public,**body.model_dump()}))
            receipt=one(c,'''SELECT * FROM request_receipts WHERE actor_scope=:actor
              AND operation=:op AND idempotency_key=:key''',actor=actor,op=op,key=key)
            if receipt:
                if not hmac.compare_digest(receipt['request_hash'],hashed):
                    raise HTTPException(409,'This request key already belongs to a different action.')
                return json.loads(receipt['response_safe'])
            g=one(c,'SELECT * FROM game_sessions WHERE public_id=:id AND machine_id=1 FOR UPDATE',id=public)
            if not g or g['result_source']!='device': raise HTTPException(409,'Select a physical-device round.')
            result=(request_fence(c,m,g,body,p['staff_user_id']) if operation=='fence'
                    else resolve(c,m,g,body,finish))
            audit(c,p['staff_user_id'],'device_'+operation,public,body.reason.strip(),entity_type='session',
                  details={'revision':body.expectedRevision,**({'evidenceId':body.evidenceId,'resolution':body.action} if operation=='resolve' else {'commandId':result['commandId']})})
            execute(c,'''INSERT INTO request_receipts(actor_scope,operation,idempotency_key,request_hash,response_status,response_safe)
              VALUES(:actor,:op,:key,:hash,200,:response)''',actor=actor,op=op,key=key,hash=hashed,response=canonical(result))
        return result

    @app.post('/api/device/sessions/{public}/start')
    def device_start(public:str,request:Request):
        with engine.begin() as c:
            event_lock(c);m=device(c,request);legacy_device(c,m)
            return start(c,public,'device')

    @app.post('/api/device/sessions/{public}/result')
    def device_result(public:str,body:Result,request:Request):
        with engine.begin() as c:
            event_lock(c);m=device(c,request);legacy_device(c,m)
            return finish(c,public,body,'device')

    import os
    if directory := os.getenv('STACK_FRONTEND_DIST'):
        from .web_frontend import mount_frontend
        mount_frontend(app,directory)
    return app


class Login(APIInput):
    username:str=Field(min_length=1,max_length=80)
    password:str=Field(min_length=1,max_length=200)
class Entry(APIInput):
    model_config={'extra':'forbid'}
    qrContent:str=Field(min_length=20,max_length=1024)
    method:Literal['camera','upload']
class Registration(APIInput):
    nickname:str=Field(min_length=2,max_length=24)
    studentId:str=Field(min_length=4,max_length=32)
    acknowledged:bool=Field(strict=True)
REENTRY_MINUTES=10
class PlayerQuestion(APIInput):
    model_config={'extra':'forbid'}
    question:str=Field(min_length=1,max_length=300)
class NewOperator(APIInput):
    model_config={'extra':'forbid'}
    username:str=Field(min_length=3,max_length=40)
class StaffEnabled(APIInput):
    model_config={'extra':'forbid'}
    enabled:bool=Field(strict=True)
class Reentry(APIInput):
    model_config={'extra':'forbid'}
    token:str=Field(min_length=40,max_length=64,pattern=r'^[A-Za-z0-9_-]+$')
class Admissions(APIInput):
    open:bool=Field(strict=True)
class Reason(APIInput):
    reason:str=Field(min_length=1,max_length=160,pattern=r'.*\S.*')
class ReviewRound(Reason):
    model_config={'extra':'forbid'}
    expectedRevision:int=Field(strict=True,ge=1)
class Heartbeat(APIInput):
    state:str=Field(pattern=r'^(ready|playing|offline)$')
    firmware:str=Field(max_length=64)
    rssi:int|None=Field(default=None,ge=-120,le=0)


app=create_app() if __name__!='__main__' and __import__('os').getenv('STACK_SKIP_DEFAULT_APP')!='1' else None
