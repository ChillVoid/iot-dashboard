"""Plan B web game screen (25 Nov 2026): pairing a browser as the cabinet device, and a
round played with a Matrix v1 trace from the shared vectors, against a disposable database."""
import json
import os
os.environ['STACK_SKIP_DEFAULT_APP'] = '1'
from pathlib import Path
import uuid

from fastapi.testclient import TestClient

from app.database import execute, one
from test_player_flow import environment, join, post  # noqa: F401
from test_staff_roles import add_operator, sign_in

# Pairing a web game screen makes Matrix v2 active, so its rounds use the v2 vectors.
VECTORS = json.loads((Path(__file__).resolve().parents[2] / 'contracts' / 'matrix-v2.vectors.json').read_text(encoding='utf-8'))


def uid():
    return str(uuid.uuid4())


def matrix(engine):
    with engine.begin() as c:
        execute(c, "UPDATE events SET settings=JSON_SET(settings,'$.active_ruleset','matrix-v1') WHERE id=1")


def pair(admin):
    response = admin.post('/api/admin/screen/pair')
    assert response.status_code == 200, response.text
    assert 'no-store' in response.headers['cache-control']
    return response.json()['deviceToken']


def screen(app, token):
    device = TestClient(app, headers={'X-Device-Token': token})
    current = device.get('/api/device/enrollment').json()['currentBootId']
    registration = {'bootId': uid(), 'previousBootId': current, 'storageId': uid(), 'uptimeMs': 0}
    assert device.post('/api/device/boot', json=registration).status_code == 200
    device.headers['X-Device-Boot-Id'] = registration['bootId']
    return device, registration


def test_only_an_administrator_pairs_and_the_old_token_stops_working(environment):
    app, admin, token, engine, settings = environment
    created = add_operator(admin, 'screen.helper')
    operator, _ = sign_in(app, 'screen.helper', created['password'])
    assert operator.post('/api/admin/screen/pair').status_code == 403
    assert TestClient(app).post('/api/admin/screen/pair').status_code in (401, 403)

    old = TestClient(app, headers={'X-Device-Token': settings.device_token})
    assert old.get('/api/device/enrollment').status_code == 200
    first = pair(admin)
    assert old.get('/api/device/enrollment').status_code == 401
    assert TestClient(app, headers={'X-Device-Token': first}).get('/api/device/enrollment').status_code == 200
    second = pair(admin)
    assert second != first
    assert TestClient(app, headers={'X-Device-Token': first}).get('/api/device/enrollment').status_code == 401
    with engine.connect() as c:
        assert one(c, "SELECT COUNT(*) AS n FROM audit_logs WHERE action='screen_paired'")['n'] == 2
        logged = json.dumps([dict(r._mapping) for r in c.exec_driver_sql('SELECT details_safe,reason FROM audit_logs').fetchall()], default=str)
    assert second not in logged and first not in logged


def test_screen_plays_a_ranked_round_and_pairing_waits_for_it(environment):
    app, admin, token, engine, settings = environment
    matrix(engine)
    device, registration = screen(app, pair(admin))
    assert admin.get('/api/admin/snapshot').json()['game']['code'] == 'matrix-v2'
    player = join(app, token, 1)
    assert device.post('/api/device/heartbeat', json={'state': 'ready', 'firmware': 'web-screen-1'}).status_code == 200
    session = post(admin, '/api/admin/queue/call-next').json()['sessionId']
    command = device.get('/api/device/commands').json()['commands'][0]
    assert 'Test 1' not in json.dumps(command)  # device commands never carry player identity
    assert admin.post('/api/admin/screen/pair').status_code == 409  # a called player keeps the screen

    vector = min((v for v in VECTORS['vectors'] if v['expected']['durationMs'] < 1500), key=lambda v: v['expected']['durationMs'])
    base = {'sessionId': session, 'commandId': command['id'], 'expectedRevision': command['expectedRevision']}
    start = {'roundBootId': registration['bootId'], 'startUptimeMs': 120}
    expected = vector['expected']
    result = {'terminalId': uid(), 'rulesHash': VECTORS['rulesHash'], 'outcome': expected['outcome'],
              'durationMs': expected['durationMs'], 'placements': expected['placements']}
    events = [
        {'eventId': uid(), 'sequence': 1, 'uptimeMs': 100, 'phase': 'reserved', **base},
        {'eventId': uid(), 'sequence': 2, 'uptimeMs': 120, 'phase': 'started', **base, **start},
        {'eventId': uid(), 'sequence': 3, 'uptimeMs': 120 + expected['durationMs'], 'phase': 'terminal',
         **base, **start, 'terminal': result},
    ]
    for event in events:
        response = device.post('/api/device/journal', json=event)
        assert response.status_code == 200, response.text
    assert response.json()['score'] == expected['score']
    ticket = player.get('/api/player/context').json()['ticket']
    assert ticket['status'] == 'completed' and ticket['score'] == expected['score']
    with engine.connect() as c:
        row = one(c, 'SELECT result_source,score FROM game_sessions WHERE public_id=:id', id=session)
        assert row['result_source'] == 'device' and row['score'] == expected['score']
        assert one(c, 'SELECT firmware_version FROM machines WHERE id=1')['firmware_version'] == 'web-screen-1'
    assert admin.post('/api/admin/screen/pair').status_code == 200


def test_switching_back_to_the_led_cabinet_restores_its_configured_token(environment):
    app, admin, token, engine, settings = environment
    created = add_operator(admin, 'led.helper')
    operator, _ = sign_in(app, 'led.helper', created['password'])
    screen_token = pair(admin)
    led = TestClient(app, headers={'X-Device-Token': settings.device_token})
    assert led.get('/api/device/enrollment').status_code == 401
    assert operator.post('/api/admin/screen/use-led-cabinet').status_code == 403
    response = admin.post('/api/admin/screen/use-led-cabinet')
    assert response.status_code == 200 and response.json() == {'ok': True}
    assert settings.device_token not in response.text
    assert led.get('/api/device/enrollment').status_code == 200
    # The LED firmware is built for Matrix v1, so switching back makes it the active ruleset.
    assert admin.get('/api/admin/snapshot').json()['game']['code'] == 'matrix-v1'
    assert TestClient(app, headers={'X-Device-Token': screen_token}).get('/api/device/enrollment').status_code == 401
    with engine.connect() as c:
        assert one(c, "SELECT COUNT(*) AS n FROM audit_logs WHERE action='led_cabinet_restored'")['n'] == 1
