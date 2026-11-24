# Setting up Stack Moko Baby on a new laptop

This is the one place to start after you **fork and clone** this repository. It is written so that you, or your coding agent (Claude Code, Codex, Copilot and similar), can set the system up from nothing. It says what to install, what to run and what to configure, by role.

Everything is Windows-first (PowerShell), the way the event laptops run it. Commands are run from the **project folder**, meaning wherever you cloned it; nothing depends on `D:\iot-dashboard`.

## TL;DR

```powershell
git clone https://github.com/<you>/iot-dashboard.git
cd iot-dashboard
npm run setup -- --check      # read-only: what is missing?
npm run setup                 # install and configure (operator laptop)
npm run dev                   # http://localhost:5173/admin/login
```

`npm run setup` needs only Node.js to start. It reports each item as `[ok]`, `[!!]` (needs you; the line says how to fix it) or `[--]` (optional or skipped). It is safe to run again at any time: finished steps are skipped, and existing data and passwords are kept.

**Printable version:** section 0 of the [Wiring and Operation Guide (PDF)](docs/Stack-Moko-Baby-Wiring-and-Operation-Guide.pdf) has the two-laptop wiring diagram, these setup steps and the event-day checklist.

## Which laptop are you setting up?

| Role | What it is | Command |
|---|---|---|
| **Operator** (server) | Runs the backend, database, tunnel and admin dashboard. One per event. | `npm run setup` |
| **Game screen** | Shows the game full screen; the arcade button plugs into it. | Nothing to install: Chrome or Edge only. See [Game screen laptop](#game-screen-laptop) |
| **Bridge flashing** | Any laptop that flashes the ESP32 button bridge (often the game screen laptop). | `npm run setup -- --role bridge` |
| **Developer** | Changes code and runs the tests. Includes the operator role. | `npm run setup -- --role developer` |

Roles combine, for example `--role operator,bridge`, or `--role all`.

## 1. Install the programs (once per laptop)

`npm run setup` checks these for you. With `--yes` it installs missing ones with winget; otherwise it prints the exact command. **Open a new terminal after installing**, so `PATH` updates.

| Program | Needed for | winget command |
|---|---|---|
| Git | cloning | `winget install --id Git.Git --exact` |
| Node.js 22.12+ (LTS) | everything | `winget install --id OpenJS.NodeJS.LTS --exact` |
| Python 3.13 | backend, tools | `winget install --id Python.Python.3.13 --exact` |
| XAMPP 8.2 (MySQL/MariaDB) | operator, developer | `winget install --id ApacheFriends.Xampp.8.2 --exact` |
| Arduino CLI | bridge | `winget install --id ArduinoSA.CLI --exact` |
| Microsoft Edge | developer (browser tests), game screen | usually preinstalled: `winget install --id Microsoft.Edge --exact` |
| Ollama (optional) | Stack Intelligence's local model | `winget install --id Ollama.Ollama --exact` |

XAMPP is expected at `C:\xampp`. If yours is elsewhere, set `$env:STACK_XAMPP_DIR = "D:\xampp"` before running setup. Only **MySQL** is used from XAMPP. Apache is not needed.

## 2. What `npm run setup` does

| Step | Roles | Result |
|---|---|---|
| Check Node, Python 3.13, XAMPP | all | `[!!]` with an install command for anything missing |
| Start XAMPP MySQL if stopped | operator | MySQL on port 3306 (left running) |
| `npm ci` in `frontend/` | operator | `frontend/node_modules` |
| Create `backend/.venv`, install `backend/requirements.txt` | operator | Python packages |
| Run `backend/setup_local.py` | operator | Database `stack_moko_baby`, migrations, a restricted DB user, **`backend/.env`** (secrets) and **`backend/.admin-credentials.txt`** (the `admin` password) |
| Start a throwaway API and call `/api/health` | operator | Proves the API and database work together |
| Download cloudflared (SHA-256 checked) | operator | `.tools/free-online/cloudflared.exe`, used by `npm run online` |
| Check Ollama | operator | Optional |
| Install Graphify `graphifyy==0.9.109` | developer | `.tools/graphify-py313`; `scripts\graphify.cmd query "..."` works |
| Check Edge | developer | Needed by the Playwright tests |
| Install ESP32 core `esp32:esp32@3.3.12` (replaces older cores), compile the bridge | bridge | `npm run device:bridge` is ready |

**What you configure by hand:**
- **MySQL root password.** Only if your XAMPP `root` account has one: `$env:STACK_DB_ROOT_PASSWORD = "..."` in the same terminal before `npm run setup`.
- **The admin password.** Read it from `backend/.admin-credentials.txt`. Each laptop gets its own database and its own secrets; nothing is shared through Git.
- **Event settings** live in `backend/.env`. Change them only if a doc tells you to. `npm run online` sets the public address, secure cookies and production mode for you.

**Never commit or share:** `backend/.env`, `backend/.admin-credentials.txt`, `firmware/**/config.h`, database backups and exports. They are already in `.gitignore`.

## 3. Run it

| What | Command | Then |
|---|---|---|
| Local development | `npm run dev` | <http://localhost:5173/admin/login>, user `admin`. With no game device, use the development simulator on the **Queue** page. |
| Event day (operator laptop) | `npm run online` | It prints the public `https://…trycloudflare.com` address and the player QR. Keep the window open. |
| Laptop readiness | `npm run event:check` (`-- --fix-power` to stop sleep) | Before the event |

## Game screen laptop

No clone, no installs: the game is a web page served by the operator laptop.

1. Use **Chrome or Edge**, with the laptop plugged in and set never to sleep while charging.
2. Plug in the ESP32 button bridge by USB. It is flashed once with `npm run device:bridge -- --port COMx` from any laptop set up with `--role bridge`.
3. Open the operator's `https://…trycloudflare.com/admin/login`, sign in as an administrator, then go to **Settings → Game screen → Use this laptop as the game screen**.
4. On the screen: **Operator → Connect button (USB)**, then **Full screen**.

Pair again whenever the tunnel address changes. Details and fixes: [docs/game-screen.md](docs/game-screen.md). The optional LED cabinet is switched on in the same Settings card: [docs/hardware-bringup.md](docs/hardware-bringup.md).

## For coding agents

Follow these rules in this repository:

1. **Start with** `npm run setup -- --check` and fix every `[!!]` line, using `npm run setup` or the command it prints. Do not hand-edit `backend/.env` or invent secrets; `setup_local.py` generates them.
2. **Never print, commit or send** the contents of `backend/.env`, `backend/.admin-credentials.txt`, `config.h`, student IDs, database rows or backups. Tell the user where the admin password file is instead of reading it out.
3. **Read** [AGENTS.md](AGENTS.md) and [docs/README.md](docs/README.md) before changing code. They hold the project rules and the documentation index.
4. **Project map.** If `scripts\graphify.cmd --version` works, use `scripts\graphify.cmd query "<question>"` before searching the code, and run `scripts\graphify.cmd update .` after code changes. If it does not work, run `npm run setup -- --role developer`, or read files directly and say that the map is unavailable.
5. **Tests**, which use throwaway databases and never touch `stack_moko_baby`:

   ```powershell
   # from the project folder
   Push-Location backend; .\.venv\Scripts\python.exe -m pytest -q --ignore=tests/test_nlp_lab.py --ignore=tests/test_history_experiment.py; Pop-Location
   npm --prefix frontend test
   Push-Location backend; .\.venv\Scripts\python.exe run_browser_tests.py; Pop-Location     # needs ports 8001 and 5174 free
   Push-Location backend; $env:STACK_TEST_RULESET = "matrix-v1"; .\.venv\Scripts\python.exe run_browser_tests.py e2e/matrix.spec.js e2e/screen-game.spec.js; Remove-Item Env:STACK_TEST_RULESET; Pop-Location
   ```

6. **Hardware.** Do not claim a hardware, phone or event check passed unless it was actually run.
7. **Git.** Commit or push only when the user asks.

## Troubleshooting

| Symptom | Fix |
|---|---|
| `[!!] Python 3.13 - not found` after installing | Open a new terminal. If several Pythons exist, set `$env:STACK_PYTHON` to the 3.13 `python.exe`. |
| `MySQL root has a password` | `$env:STACK_DB_ROOT_PASSWORD = "..."`, then `npm run setup` again. |
| `XAMPP not found at C:\xampp` | Install XAMPP, or set `$env:STACK_XAMPP_DIR`. |
| MySQL will not start | Open the XAMPP Control Panel → MySQL → Start, and read its log. Another MySQL service on port 3306 must be stopped first. |
| `API health check` fails | Run `npm run dev` and read the backend error. Common causes are MySQL stopped or a half-finished setup; `npm run setup` again applies missing migrations. |
| Port 8000 or 5173 in use | Close the other `npm run dev` window. Only one dashboard runs per laptop. |
| No COM port for the ESP32 | Use a data-capable USB cable, and install the CP210x or CH340 driver for your board. |
| `npm ci` fails behind a proxy or on a slow network | Re-run `npm run setup`; it only redoes the unfinished steps. |

More detail: [local setup](docs/local-setup.md), [backend](backend/README.md), [frontend](frontend/README.md), [event hosting](docs/free-online.md), [game screen](docs/game-screen.md).
