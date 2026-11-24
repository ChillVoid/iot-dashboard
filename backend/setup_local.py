"""Provision only the named local project database; reruns preserve existing data."""
import base64
import os
from pathlib import Path
import re
import secrets
import uuid
from datetime import timedelta

import pymysql
from app.config import Settings
from app.database import make_engine, execute, one
from app.game import RULES, RULES_HASH, MATRIX_RULES, MATRIX_V2_RULES, rules_hash, canonical
from app.security import passwords, digest, now

ROOT = Path(__file__).parent


def migrate(connection, database):
    if not re.fullmatch(r"stack_moko_(baby|test_[a-z0-9_]+)", database):
        raise ValueError("Only project databases may be provisioned")
    with connection.cursor() as cur:
        cur.execute(f"CREATE DATABASE IF NOT EXISTS `{database}` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci")
        cur.execute(f"USE `{database}`")
        cur.execute("CREATE TABLE IF NOT EXISTS schema_migrations (version VARCHAR(80) PRIMARY KEY, applied_at DATETIME DEFAULT CURRENT_TIMESTAMP)")
        for path in sorted((ROOT / "migrations").glob("*.sql")):
            cur.execute("SELECT version FROM schema_migrations WHERE version=%s", (path.name,))
            if cur.fetchone():
                continue
            sql = re.sub(r"--[^\n]*", "", path.read_text(encoding="utf-8"))
            for statement in sql.split(";"):
                statement = statement.strip()
                if statement and not re.match(r"^(CREATE DATABASE|USE )", statement, re.I):
                    cur.execute(statement)
            cur.execute("INSERT INTO schema_migrations(version) VALUES (%s)", (path.name,))


def seed(engine, settings, password):
    with engine.begin() as c:
        if one(c, "SELECT id FROM staff_users LIMIT 1"):
            return False
        staff = execute(c, "INSERT INTO staff_users(username,password_hash,role) VALUES('admin',:hash,'admin')", hash=passwords.hash(password)).lastrowid
        execute(c, "INSERT INTO events(id,public_id,code,name,status,starts_at,ends_at,settings) VALUES(1,:uuid,'acs-day','ACS Carnival','open',:start,:end,:settings)", uuid=str(uuid.uuid4()), start=now(), end=now()+timedelta(days=30), settings='{}')
        execute(c, "INSERT INTO rulesets(id,code,version,config,config_hash,created_by) VALUES(1,'classic-v1',1,:config,:hash,:staff)", config=canonical(RULES), hash=RULES_HASH, staff=staff)
        execute(c, "INSERT INTO rulesets(code,version,config,config_hash,created_by) VALUES('matrix-v1',1,:config,:hash,:staff)", config=canonical(MATRIX_RULES), hash=rules_hash(MATRIX_RULES), staff=staff)
        execute(c, "INSERT INTO rulesets(code,version,config,config_hash,created_by) VALUES('matrix-v2',1,:config,:hash,:staff)", config=canonical(MATRIX_V2_RULES), hash=rules_hash(MATRIX_V2_RULES), staff=staff)
        execute(c, "INSERT INTO machines(id,public_id,event_id,code,name,device_token_hash,observed_state) VALUES(1,:uuid,1,'cabinet-01','Cabinet 01',:hash,'offline')", uuid=str(uuid.uuid4()), hash=digest(settings.device_token))
        execute(c, "INSERT INTO qr_links(token,event_id,machine_id) VALUES(:token,1,1)", token=secrets.token_urlsafe(32))
    return True


if __name__ == '__main__':
    env = ROOT / '.env'
    # STACK_SETUP_DATABASE lets the fresh-clone check (scripts/setup.mjs) use a throwaway
    # stack_moko_test_* database; migrate() refuses any other name.
    database = os.getenv('STACK_SETUP_DATABASE', 'stack_moko_baby')
    app_user = 'stack_moko_app' if database == 'stack_moko_baby' else f'{database}_app'
    root = pymysql.connect(host='127.0.0.1', user='root', password=os.getenv('STACK_DB_ROOT_PASSWORD', ''), autocommit=True)
    migrate(root, database)
    if not env.exists():
        password = secrets.token_urlsafe(30)
        with root.cursor() as cur:
            cur.execute(f"CREATE USER IF NOT EXISTS '{app_user}'@'127.0.0.1' IDENTIFIED BY %s", (password,))
            cur.execute(f"GRANT SELECT, INSERT, UPDATE, DELETE ON `{database}`.* TO '{app_user}'@'127.0.0.1'")
        values = {
            'STACK_DATABASE_URL': f'mysql+pymysql://{app_user}:{password}@127.0.0.1:3306/{database}?charset=utf8mb4',
            **{f'STACK_{key}_KEY':base64.urlsafe_b64encode(secrets.token_bytes(32)).decode() for key in ['IDENTITY','LOOKUP','CSRF']},
            'STACK_DEVICE_TOKEN':secrets.token_urlsafe(40), 'STACK_PUBLIC_URL':'http://127.0.0.1:5173',
            'STACK_COOKIE_SECURE':'false', 'STACK_SIMULATOR_ENABLED':'true', 'STACK_ENV':'development',
        }
        env.write_text('\n'.join(f'{k}={v}' for k,v in values.items())+'\n', encoding='utf-8')
    root.close()
    settings = Settings.load()
    admin_password = secrets.token_urlsafe(18)
    if seed(make_engine(settings.database_url), settings, admin_password):
        (ROOT / '.admin-credentials.txt').write_text(f'Stack Moko Baby local administrator\nUsername: admin\nPassword: {admin_password}\n\nKeep this file private. It is excluded from Git and Graphify.\n', encoding='utf-8')
    with make_engine(settings.database_url).begin() as c:
        # A fresh install plays Matrix v2 on the web game screen. Never override a choice made
        # since (switching to the LED cabinet selects matrix-v1).
        execute(c,"UPDATE events SET settings=JSON_SET(settings,'$.active_ruleset','matrix-v2') WHERE code='acs-day' AND COALESCE(JSON_UNQUOTE(JSON_EXTRACT(settings,'$.active_ruleset')),'classic-v1')='classic-v1'")
    print('Local database migrations applied. Administrator credentials are in backend/.admin-credentials.txt (not printed).')
