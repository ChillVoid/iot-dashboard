"""Run real browser flows against a disposable XAMPP database and dedicated ports."""
import os
import secrets
import subprocess
import shutil
import socket
import sys
import time
import base64
from dataclasses import replace
from pathlib import Path
import pymysql
import httpx
from sqlalchemy.engine import URL
from app.config import Settings
from app.database import make_engine
from setup_local import migrate, seed

ROOT=Path(__file__).resolve().parents[1]
def executable(candidates):
    return next((str(Path(p)) for p in candidates if p and Path(p).is_file()), None)

def wait_for(url, children):
    for _ in range(60):
        if any(child.poll() is not None for child in children):
            raise RuntimeError('A dedicated test server stopped before becoming ready.')
        try:
            if httpx.get(url, timeout=2).status_code==200: return
        except httpx.HTTPError: pass
        time.sleep(.5)
    raise RuntimeError('Dedicated test servers did not start')


def main(arguments):
    node = executable([os.getenv('STACK_TEST_NODE'), shutil.which('node'),
        *sorted((Path(os.getenv('LOCALAPPDATA',''))/'Programs').glob('node-v*-win-x64/node.exe'),reverse=True),
        Path(os.getenv('ProgramFiles','C:/Program Files'))/'nodejs/node.exe'])
    if not node:
        raise SystemExit('Node.js is unavailable. Install Node or set STACK_TEST_NODE to node.exe.')
    for port in (8001,5174):
        with socket.socket() as probe:
            if probe.connect_ex(('127.0.0.1',port)) == 0:
                raise SystemExit(f'Test port {port} is occupied. Keep the other app intact and stop its own test terminal first.')
    database='stack_moko_test_'+secrets.token_hex(5)
    password='Disposable-browser-test-password'
    root=pymysql.connect(host='127.0.0.1',user='root',password=os.getenv('STACK_DB_ROOT_PASSWORD',''),autocommit=True)
    children=[]
    try:
        migrate(root,database)
        url=URL.create('mysql+pymysql',username='root',password=os.getenv('STACK_DB_ROOT_PASSWORD',''),host='127.0.0.1',database=database).render_as_string(hide_password=False)
        settings=Settings(database_url=url,identity_key=secrets.token_bytes(32),lookup_key=secrets.token_bytes(32),csrf_key=secrets.token_bytes(32),device_token='disposable-browser-device-token',public_url='http://127.0.0.1:5174')
        engine=make_engine(url);seed(engine,settings,password)
        if os.getenv('STACK_TEST_RULESET') in ('matrix-v1','matrix-v2'):
            from app.database import execute
            with engine.begin() as c:
                execute(c,"UPDATE events SET settings=JSON_SET(settings,'$.active_ruleset',:code) WHERE code='acs-day'",code=os.getenv('STACK_TEST_RULESET'))
        engine.dispose()
        env=dict(os.environ,STACK_DATABASE_URL=url,STACK_PUBLIC_URL=settings.public_url,STACK_API_TARGET='http://127.0.0.1:8001',STACK_TEST_URL=settings.public_url,STACK_TEST_PASSWORD=password)
        env.update({f'STACK_{name}_KEY':base64.urlsafe_b64encode(value).decode() for name,value in [('IDENTITY',settings.identity_key),('LOOKUP',settings.lookup_key),('CSRF',settings.csrf_key)]})
        env['STACK_DEVICE_TOKEN']=settings.device_token
        browser=executable([os.getenv('STACK_TEST_BROWSER_PATH'),
            Path(os.getenv('ProgramFiles(x86)','C:/Program Files (x86)'))/'Microsoft/Edge/Application/msedge.exe',
            Path(os.getenv('ProgramFiles','C:/Program Files'))/'BraveSoftware/Brave-Browser/Application/brave.exe',
            Path(os.getenv('ProgramFiles','C:/Program Files'))/'Google/Chrome/Application/chrome.exe'])
        if browser: env['STACK_TEST_BROWSER_PATH']=browser
        env.pop('STACK_SKIP_DEFAULT_APP',None)
        hidden={'creationflags':subprocess.CREATE_NO_WINDOW} if os.name=='nt' else {}
        children.append(subprocess.Popen([sys.executable,'-m','uvicorn','app.main:app','--host','127.0.0.1','--port','8001','--no-access-log','--ws-max-size','1024','--ws-max-queue','4'],cwd=ROOT/'backend',env=env,stdout=subprocess.DEVNULL,**hidden))
        wait_for('http://127.0.0.1:8001/api/health', children)
        children.append(subprocess.Popen([node,'node_modules/vite/bin/vite.js','--host','127.0.0.1','--port','5174','--strictPort'],cwd=ROOT/'frontend',env=env,stdout=subprocess.DEVNULL,**hidden))
        for _ in range(60):
            if any(child.poll() is not None for child in children): raise RuntimeError('A dedicated test server stopped before becoming ready.')
            try:
                if httpx.get(settings.public_url+'/api/health').status_code==200: break
            except httpx.HTTPError: pass
            time.sleep(.5)
        else: raise RuntimeError('Dedicated test servers did not start')
        result=subprocess.run([str(node),'node_modules/@playwright/test/cli.js','test',*arguments],cwd=ROOT/'frontend',env=env)
    finally:
        for child in reversed(children):
            child.terminate()
            try: child.wait(timeout=10)
            except subprocess.TimeoutExpired: child.kill()
        assert database.startswith('stack_moko_test_') and len(database)==26
        with root.cursor() as c:c.execute(f'DROP DATABASE `{database}`')
        root.close()
    return result.returncode


if __name__=='__main__':
    sys.exit(main(sys.argv[1:]))
