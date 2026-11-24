# Stack Moko Baby — backend

FastAPI service that owns the player queue, staff sessions, validated scores, the cabinet protocol, live updates and the optional Stack Intelligence assistant. It runs on Python 3.13 with SQLAlchemy Core against the local XAMPP MariaDB 10.11 database.

Scope: one event (`acs-day`) and one cabinet (`cabinet-01`), played by one game device at a time: the web game screen (default since 25 November 2026) or the optional LED cabinet; both use the same device protocol. Current rules: **Matrix v2** on the web game screen (20 columns, 17 levels, 60-second limit, one point per kept row; 90 ms per cell on level 1, 6 ms faster each level, floor 35 ms; migration `008_matrix_v2_rules.sql`). The LED cabinet uses **Matrix v1** (16 columns, 15 levels; see [`contracts/matrix-v1.rules.json`](../contracts/matrix-v1.rules.json)). Pairing a device selects its ruleset. Classic v1, Matrix v1 and Matrix v2 results are kept and ranked separately.

## Setup

Requirements: Python 3.13 and XAMPP with **MySQL** started.

```powershell
cd D:\iot-dashboard
python -m venv backend\.venv
.\backend\.venv\Scripts\python.exe -m pip install -r backend\requirements.txt
.\backend\.venv\Scripts\python.exe backend\setup_local.py
```

`setup_local.py`:
- creates only the named project database and applies every migration in `migrations/` that has not run yet;
- creates a restricted application account (the running API never uses `root`);
- generates `backend/.env` (database URL, identity, lookup, CSRF and device keys) and `backend/.admin-credentials.txt`;
- keeps existing data, keys and passwords when re-run. Re-run it after pulling new migrations.

If your XAMPP `root` account has a password, provide it only for this command through the environment variable `STACK_DB_ROOT_PASSWORD`. Do not change your root password to suit the project.

## Running

| Command (project root) | What it does |
|---|---|
| `npm run dev` | API on port 8000 (with reload) and the Vite frontend on 5173 |
| `npm run dev:backend` | API only |
| `npm run online` | Event mode: builds the frontend, serves it from the API on the real database, opens a Cloudflare tunnel, takes backups, starts MySQL if needed |

Manual start: `backend\.venv\Scripts\python.exe -m uvicorn app.main:app --app-dir backend --host 127.0.0.1 --port 8000 --no-access-log`. Run **one** worker; live updates are in-process.

## Code layout

| Path | Responsibility |
|---|---|
| `app/main.py` | App factory, routes, sessions, queue, roles, re-entry, staff accounts |
| `app/config.py` | Settings from `backend/.env` and `STACK_*` environment variables |
| `app/security.py` | Argon2id passwords, cookies, CSRF, student-ID HMAC lookup and AES-GCM encryption |
| `app/database.py` | Engine and small query helpers (`one`, `all_rows`, `execute`) |
| `app/game.py` | Ruleset storage and server-side score replay |
| `app/device_protocol.py`, `device_commands.py`, `device_recovery.py` | Cabinet requests, command delivery and boot-bound recovery |
| `app/machine_status.py` | Cabinet state shown to staff and players |
| `app/live.py` | Durable outbox and WebSocket revision hints |
| `app/analytics.py` | Read-only event analytics shared by the dashboard and the assistant |
| `app/assistant*.py` | Stack Intelligence: language handling, routing, memory, learning, training review |
| `app/evaluation_review.py` | Private human review of practice questions |
| `app/identity_retention.py` | Student-ID purge (used by `npm run db:purge-ids`) |
| `app/player_assistant.py` | Player Stack Intelligence: deterministic English/Taglish answers from rules, the line, today's scores and the player's own ticket |
| `app/origins.py`, `request_limits.py`, `web_frontend.py` | Origin checks, 64 KiB body limit, serving the built frontend |
| `migrations/` | Versioned SQL (`001`–`007`) applied by `setup_local.py` |
| `tests/` | pytest suites, each on a generated throwaway database |

## API overview

All routes are under `/api`. Staff and player sessions are separate cookies; every state-changing staff or player request needs the `X-CSRF-Token` header.

| Area | Routes |
|---|---|
| Health | `GET /health` (schema, migrations and configuration readiness) |
| Player | `POST /player/entry` (checked QR → entry grant), `POST /player/register`, `GET /player/context`, `POST /player/cancel`, `GET /player/leaderboard`, `POST /player/reenter`, `GET /player/lobby` (public line status), `POST /player/assistant` (player Stack Intelligence, 20 questions/min per visitor) |
| Staff session | `POST /admin/login`, `GET /admin/session` (includes role), `POST /admin/logout` |
| Dashboard | `GET /admin/snapshot`, `GET /admin/analytics` |
| Queue | `POST /admin/queue/call-next` (idempotent), `POST /admin/queue/{ticket}/skip`, `POST /admin/admissions` |
| Players | `GET /admin/players?search=` (nickname or code), `POST /admin/players/{id}/reentry` (one-time code, 10 minutes) |
| Rounds | `POST /admin/sessions/{id}/review`, `…/fence`, `…/resolve` (release, void or recover; void and recover are admin-only) |
| Staff accounts (admin) | `GET`/`POST /admin/staff`, `POST /admin/staff/{id}/password`, `POST /admin/staff/{id}/enabled` |
| Game device (admin) | `POST /admin/screen/pair` (new token for the web game screen, returned once), `POST /admin/screen/use-led-cabinet` (restore the configured LED cabinet token) |
| Simulator (admin) | `POST /admin/simulator/{ready,start,win,loss,release}` |
| Assistant | `/admin/assistant/{status,prepare,query,memory}`, training review (admin) under `/admin/assistant/training`, `/admin/evaluation-review` (admin) |
| Cabinet (device token) | `GET /device/enrollment`, `POST /device/boot`, `POST /device/heartbeat`, `GET /device/commands`, `POST /device/commands/{id}/ack`, `POST /device/journal`, `POST /device/sessions/{id}/start`, `POST /device/sessions/{id}/result` |
| Live | WebSocket `/live/admin` and `/live/player` (cookie-authenticated, revision hints only) |

Request and response examples: [`contracts/`](../contracts). Device protocol: [esp32-online.md](../docs/esp32-online.md), [device-command-delivery.md](../docs/device-command-delivery.md) and [device-recovery.md](../docs/device-recovery.md).

## Roles

`staff_users.role` is enforced on the server. **Operators** run the line (queue, admissions, skip, no-show release, re-entry QR, device stop, review hold, analytics, assistant chat). **Administrators** also void or recover scores, use the simulator, review practice questions and training examples, and manage operator accounts. Admin-only routes return `403 "Only an administrator can do this."` Administrator accounts are not editable through the API.

## Security model

- Argon2id staff passwords; opaque session tokens stored hashed; HttpOnly, SameSite=Strict cookies; server-side expiry and logout revocation; CSRF tokens; exact-origin checks on writes and WebSockets.
- Login limit: 8 failures per visitor address and username per 15 minutes. Behind the Cloudflare tunnel the visitor address comes from `CF-Connecting-IP`, trusted only from a loopback peer.
- Student IDs: keyed HMAC lookup (prevents duplicate registration) plus AES-256-GCM ciphertext with a per-record nonce. Neither the ID nor its lookup or ciphertext is ever returned. `purge_after` is the event end plus 30 days; `npm run db:purge-ids` deletes them.
- Queue integrity: FIFO by `(joined_at, id)`; event then cabinet row locks; one live ticket per player and one active round per cabinet enforced by the database; idempotency receipts on call-next and recovery actions.
- Scores: the cabinet's placement trace is replayed against the stored ruleset; the result, queue completion, notification and outbox entry commit together. Conflicting terminal results are refused.
- Re-entry codes: random, stored only as a hash, single use, 10-minute expiry, newest code only, audited; they travel in the URL fragment so they never reach server or tunnel logs.
- JSON bodies are limited to 64 KiB; unknown fields are rejected; validation errors never echo submitted values.

## Tools

| Script | Purpose |
|---|---|
| `setup_local.py` | Provision or migrate the local database (keeps data) |
| `run_browser_tests.py` | Playwright journeys on ports 8001/5174 with a throwaway database |
| `rehearse_event.py` | Event load rehearsal: N phones and back-to-back rounds; `--tunnel` for the real internet path |
| `check_quality.py` | Loopback load, process restart and synthetic dump/restore checks |
| `check_assistant_quality.py` | Stack Intelligence regression cases against the local Ollama model |
| `device_emulator.py`, `recovery_emulator.py` | Software cabinets for the v1 protocol and the boot-bound journal |
| `evaluate_*.py`, `replay_consumed_holdout.py`, `holdout_*.py`, `measure_admission.py` | NLP evaluation and regression measurement |
| `build_*.py`, `fetch_nlp_datasets.py`, `prepare_candidate_holdout.py`, `experiment_history.py` | NLP data preparation and offline experiments |

`backend/evaluation/` holds frozen evaluation material: it stays outside the knowledge graph and is never copied into runtime data.

## Tests

From `backend\` with MySQL running:

```powershell
.\.venv\Scripts\python.exe -m pytest tests -q
.\.venv\Scripts\python.exe run_browser_tests.py
```

Every suite creates and drops its own `stack_moko_test_<10 hex>` database; the event database is never touched. Browser runs need free ports 8001 and 5174, Node and an installed Edge or Brave (`STACK_TEST_NODE`, `STACK_TEST_BROWSER_PATH` override them). `test_nlp_lab.py` and `test_history_experiment.py` belong to the separate NLP-lab environment: they fail to import in the app environment because numpy is not installed there (use `--continue-on-collection-errors` to run everything else). Do not run two server-owning tools at the same time.

Latest run (24 November 2026): 488 passed.

## Related documents

[Local setup](../docs/local-setup.md) · [Free online operation](../docs/free-online.md) · [Backups](../docs/backups.md) · [Schema](../docs/schema.md) · [Live updates](../docs/live-updates.md) · [Player flow and access](../docs/player-flow-and-access.md) · [Stack Intelligence](../docs/admin-assistant.md) · [Quality audit](../docs/quality-audit.md)
