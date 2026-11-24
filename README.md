# Stack Moko Baby

**An IoT stacking game for the ACS Carnival, played on a web game screen with a physical arcade button, with a private phone queue and an operator dashboard. The original LED-matrix cabinet is still supported.**

![Status: event preparation](https://img.shields.io/badge/status-event_preparation-f59e0b)
![React 19](https://img.shields.io/badge/React-19-149eca?logo=react&logoColor=white)
![Vite 8](https://img.shields.io/badge/Vite-8-646cff?logo=vite&logoColor=white)
![Tailwind CSS 4](https://img.shields.io/badge/Tailwind_CSS-4-38bdf8?logo=tailwindcss&logoColor=white)
![FastAPI](https://img.shields.io/badge/FastAPI-Python_3.13-009688?logo=fastapi&logoColor=white)
![MariaDB](https://img.shields.io/badge/XAMPP-MariaDB_10.11-fb7a24?logo=mariadb&logoColor=white)
![ESP32](https://img.shields.io/badge/ESP32-Arduino-e7352c?logo=espressif&logoColor=white)

Players scan a QR code with their own phone, register with a nickname and student ID, and wait in a first-come, first-served line. When the cabinet is free, an operator calls the next player. That player presses the big arcade button to drop each moving row onto the stack on the **game screen**: 17 levels on a 20-wide board, 60 seconds, one point per level, with the row speeding up every level (Matrix v2). The result appears on their phone and unlocks the leaderboard.

**Web game screen (since 25 November 2026):** the game migrated from the LED-matrix cabinet to a full-screen web page on a second laptop. The arcade button reaches it through an ESP32 **button bridge** over USB (Web Serial), and the ESP32 timestamps each press, so button timing never waits for the network. The **server owns the queue** and saves a score only after replaying the game's placement record. The **LED cabinet stays supported**: same device protocol, rules and leaderboard, switched in Settings → Game screen. See [the web game screen](docs/game-screen.md).

> **Status, 24 November 2026.** The software passes its automated backend, frontend and browser tests. A 5-minute rehearsal with 60 simulated phones and back-to-back rounds passed on the PC and through a real Cloudflare tunnel (0 errors, 95% of requests under 0.65 s). On 25 November the game migrated to the **web game screen**, which passes its own automated and browser tests. **The real button through the ESP32 bridge, the two laptops on the hotspot and real phones have not been tested together yet; the optional LED cabinet has never run on hardware.** See [what is left before the event](docs/remaining-work.md).

---

## Contents

- [How it works](#how-it-works)
- [Features](#features)
- [Technology](#technology)
- [The hardware](#the-hardware)
- [Getting started](#getting-started)
- [Running the event](#running-the-event)
- [Command reference](#command-reference)
- [Staff accounts and roles](#staff-accounts-and-roles)
- [Configuration](#configuration)
- [Testing](#testing)
- [Repository layout](#repository-layout)
- [Documentation](#documentation)
- [Security and privacy](#security-and-privacy)
- [Known limitations](#known-limitations)
- [Contributing](#contributing)

## How it works

```mermaid
flowchart LR
    subgraph Screen[Laptop 2: game screen]
        GAME[Chrome / Edge /screen<br/>game engine + sounds]
        ESP[ESP32 button bridge] -- USB serial --> GAME
        BTN[60 mm arcade button] --- ESP
    end
    subgraph PC[Laptop 1: operator]
        API[FastAPI + React app<br/>port 8000] --- DB[(XAMPP MariaDB)]
        API --- AI[Ollama<br/>optional]
    end
    GAME -- HTTPS --> CF[Cloudflare HTTPS tunnel]
    PHONES[Players' phones<br/>own mobile data] --> CF
    CF --> API
    OPS[Operator dashboard] --> API
```

1. **Scan.** The operator shows the Registration QR from the dashboard on a screen. A player scans it with the phone camera (or uploads a photo of it).
2. **Register.** Nickname and student ID. The student ID is encrypted and never shown again. The player gets a private ticket with their place in line.
3. **Call.** When the game screen reports "ready", the operator presses **Call next player**. The ticket says it is their turn and the screen shows *Your turn! Press the button to start*.
4. **Play.** The button starts a 3-2-1 countdown. Each press drops the moving row; any part hanging over the stack is cut off, so the row gets narrower. A complete miss or the 60-second timer ends the round.
5. **Result.** The game screen uploads its placement record; the server replays it, saves the score, and the player's phone shows the result and the leaderboard.

All game-screen traffic is outgoing HTTPS, so no router needs port forwarding.

## Features

**For players**
- Camera or photo QR scanning; registration needs a code the server has just checked, so a copied link alone is not enough.
- A private ticket that survives refreshes, live position updates, a "your turn" alert and the result with leaderboard access.
- If the ticket is lost (new phone, cleared browser, or a restart that changed the address), the operator can give a one-time **re-entry QR**.
- **A small player website:** Home (scan), About and Contact behind one header, in three colours (Cloud, Ink, Lime).
- **Stack Intelligence for players** (a sticky robot in the corner of every player page that opens and closes): ask how to play, how long the line is, today's top score, "When is my turn?" or "How did I do?" in English or Taglish, before joining and while waiting. Answers come from checked templates and live data (no AI model), show their source, and never expose other players or student IDs.
- A live line strip on the scan page: people in line, cabinet status and the estimated wait.

**For operators and administrators**
- Light and dark dashboard: Overview, Analytics, Queue, Sessions, Machine and Settings.
- Queue controls: call next, skip with a reason, pause or open admissions, **Player didn't come** (frees the cabinet only after it confirms the round never started) and **re-entry QR**.
- Machine page: last heartbeat, signal strength, command delivery and guarded recovery after a power loss (release, void or recover a result, each audited).
- **Staff accounts:** separate operator logins for booth helpers; only an administrator can change scores, accounts or assistant training.
- **Stack Intelligence (staff):** a local, read-only English/Taglish assistant that answers questions about the event from saved data (optional; needs Ollama).
- A development simulator for testing the full flow without a cabinet; simulator scores are labelled and ranked separately.

**Reliability**
- Live updates over authenticated WebSockets with a polling fallback.
- Boot-bound device journal: a round interrupted by a power cut is never resumed or scored automatically.
- Encrypted automatic backups (at start, every 15 minutes, on Ctrl+C) with a verified restore.
- The launcher starts XAMPP MySQL if needed and restarts it if it stops.
- The optional LED cabinet follows a new tunnel address over USB without reflashing; the web game screen is paired again from Settings.

## Technology

| Layer | Stack |
|---|---|
| Frontend | React 19 (JavaScript/JSX), Vite 8, Tailwind CSS 4, React Router 7, Radix UI, Recharts, html5-qrcode, qrcode.react, Font Awesome, Open Sans Variable |
| Backend | Python 3.13, FastAPI, SQLAlchemy Core, PyMySQL, Argon2id (pwdlib), cryptography (AES-GCM, Fernet) |
| Database | XAMPP MySQL service (MariaDB 10.11), versioned SQL migrations |
| Game screen | Canvas game engine (Matrix v1 port), Web Serial (button), Web Audio (beeps), Screen Wake Lock, browser-storage device journal |
| Button bridge | ESP32 (Arduino core), interrupt + debounce, USB serial |
| LED cabinet (optional) | ESP32 (Arduino core), Adafruit NeoPixel, ArduinoJson, NVS journal, HTTPS client |
| Hosting | This PC plus a free Cloudflare Quick Tunnel (`npm run online`) |
| Assistant | Local Ollama (`qwen3:4b-instruct` by default), optional |
| Tests | pytest, Vitest + Testing Library, Playwright with axe accessibility checks |
| Project map | [Graphify](docs/graphify-setup.md) knowledge graph in `graphify-out/` |

## The hardware

### Web game screen (default)

| Part | Connection |
|---|---|
| Laptop 2 (game screen) | Chrome or Edge, full screen at `https://<tunnel>/screen`, paired from Settings → Game screen |
| ESP32 DevKit (button bridge) | USB to laptop 2; flashed with `npm run device:bridge` (prints `PRESS <ms>` per press) |
| 60 mm LED arcade button | Switch COM → GND, NO → GPIO27; light + → ESP32 5V/VIN, − → GND |

The LED panels, their power lead and the speaker are not needed for the web screen. Setup, pairing, switching and fixes: [docs/game-screen.md](docs/game-screen.md) and section 0 of the **[Wiring and Operation Guide (PDF)](docs/Stack-Moko-Baby-Wiring-and-Operation-Guide.pdf)**.

### LED cabinet (optional, still supported)

Flash the game firmware (`npm run online:device`), then in Settings → Game screen choose **Use the LED cabinet instead**.

| Part | Connection |
|---|---|
| ESP32 DevKit | Powered and programmed from laptop USB port 1 |
| 8×32 WS2812 matrix (HUD, top) | First on the data line: GPIO18 → 330 Ω → DIN |
| Two 16×16 WS2812 panels (blocks, below) | Chained after the HUD; 5 V fed to each panel from laptop USB port 2 |
| 60 mm LED arcade button | Switch COM → GND, NO → GPIO27; its light on the 5 V lead |
| Speaker | GPIO26 → 220 Ω → speaker → GND (beeps generated by the firmware) |

The laptop is the only power source, so the firmware caps LED current (`STACK_LED_BUDGET_MA`, 400 mA by default). The full illustrated wiring, self-test and operating guide is the **[Wiring and Operation Guide (PDF)](docs/Stack-Moko-Baby-Wiring-and-Operation-Guide.pdf)**. Firmware details: [firmware/README.md](firmware/README.md).

## Getting started

### Set up (one command)

After cloning, from the project folder:

```powershell
npm run setup -- --check   # read-only report of what is missing
npm run setup              # installs and configures the operator/server laptop
```

It needs Node.js 22.12+ to start. It checks Python 3.13 and XAMPP MySQL and prints the `winget` command for anything missing (or installs it with `--yes`). Then it installs the frontend and backend packages, creates the database, migrations and private secrets (`backend/.env`, `backend/.admin-credentials.txt`), downloads the tunnel helper and checks the API health. Use `--role developer` for the project map and test tools, or `--role bridge` for the ESP32 toolchain. The game screen laptop needs only Chrome or Edge. Roles, manual configuration, rules for coding agents and troubleshooting: **[SETUP.md](SETUP.md)**.

### Run locally

```powershell
cd D:\iot-dashboard
npm run dev
```

This starts FastAPI on port 8000, waits until the API and database are ready, then starts Vite on port 5173. Open <http://localhost:5173/admin/login>. Ctrl+C stops what it started.

**No game device yet?** In **Queue**, use the development simulator: **Set simulator ready → Call next player → Start test round → Finish: win / loss**. More detail and troubleshooting: [local setup](docs/local-setup.md).

## Running the event

| When | What to do |
|---|---|
| **Day before** | On the event laptop: `npm run event:check` (add `-- --fix-power` to stop sleep, lid and USB power-saving). `npm run db:verify`. Copy `backend/.env` to a USB drive kept apart from the laptop. Install Windows updates, then pause them. |
| **Game screen (laptop 2)** | Open the tunnel address in Chrome or Edge, sign in as administrator, Settings → **Game screen** → pair, then Operator → **Connect button (USB)** and **Full screen**. Pair again after each new tunnel address. |
| **LED cabinet (optional): first start / after a firmware or Wi-Fi change** | Set the hotspot name and password for this PowerShell window, then `npm run online:device` (builds, opens the tunnel and flashes the cabinet over USB without erasing its journal). |
| **Every later start** | `npm run online`. It prints the **Admin** and **Player scanner** links and, if the LED cabinet is plugged in, sends it the new address over USB. Keep the window open. |
| **During the event** | Show the Registration QR from **Overview** on a screen. Run the line from **Queue**. Helpers use their own operator accounts. |
| **After the event** | Ctrl+C (final backup). `npm run db:purge-ids` to see the count, then `npm run db:purge-ids -- --all --apply` to delete stored student IDs; scores stay. |

```powershell
# first time on a new hotspot (values stay in this window only)
$env:STACK_FIRMWARE_WIFI_SSID = "YOUR-HOTSPOT-NAME"
$env:STACK_FIRMWARE_WIFI_PASSWORD = "YOUR-HOTSPOT-PASSWORD"
npm run online:device
```

The free Quick Tunnel gives a new address on every start and, per Cloudflare, has no uptime guarantee and handles up to 200 requests at once (plan for fewer than about 150 phones with the ticket open at the same time). See [free online operation](docs/free-online.md) and [physical bring-up](docs/hardware-bringup.md).

## Command reference

Run from the project root.

| Command | Purpose |
|---|---|
| `npm run dev` | Local development: API and Vite together |
| `npm run dev:backend` / `npm run dev:frontend` | Start one side only |
| `npm run online` | Event mode: build, Cloudflare tunnel, API on the real database, backups, LED cabinet address over USB if plugged in |
| `npm run online:device` | As above, and flash the hotspot-configured game firmware to the LED cabinet |
| `npm run online:firmware` | As above, but build a private firmware image (Wokwi) instead of flashing |
| `npm run device:bridge` | Flash the button bridge for the web game screen |
| `npm run device:selftest` | Flash the wiring self-test (displays, button, speaker) |
| `npm run device:flash` | Flash firmware only |
| `npm run device:url` | Send the current tunnel address to the LED cabinet over USB |
| `npm run db:backup` | Manual encrypted backup (kept outside the project) |
| `npm run db:verify` | Restore the newest backup into a throwaway database and compare row counts |
| `npm run db:purge-ids` | Student-ID retention: dry run by default; `-- --all --apply` after the event |
| `npm run event:check` | Event-laptop readiness report; `-- --fix-power` fixes power settings |

## Staff accounts and roles

| Role | Can do |
|---|---|
| **Operator** | Overview, Sessions, Analytics; call next, skip, pause or open admissions, Player didn't come, re-entry QR; request a device stop, hold a round for review, release a no-show; Stack Intelligence chat |
| **Administrator** | Everything an operator can, plus void or recover an interrupted round's score, the simulator, practice-question review and assistant training, and **Settings → Staff accounts** |

An administrator creates operator accounts in Settings; each gets a server-generated password shown once. Resetting a password or switching an account off signs that operator out immediately.

## Configuration

`setup_local.py` writes `backend/.env`; you rarely need to edit it. Useful settings (names only; never commit values):

| Variable | Meaning |
|---|---|
| `STACK_PUBLIC_URL`, `STACK_ALLOWED_ORIGINS` | The public address(es) the app accepts; set automatically by `npm run online` |
| `STACK_SIMULATOR_ENABLED` | `false` hides the development simulator |
| `STACK_AI_ENABLED`, `STACK_OLLAMA_URL`, `STACK_OLLAMA_MODEL` | Stack Intelligence |
| `STACK_BACKUP_MINUTES`, `STACK_BACKUP_DIR`, `STACK_BACKUP_KEEP` | Automatic backups (default every 15 min, outside the project) |
| `STACK_XAMPP_DIR` | XAMPP location if not `C:\xampp` |
| `STACK_LED_BUDGET_MA` (firmware, `display_layout.h`) | LED current cap for laptop USB power |

## Testing

All tests use generated throwaway databases and never touch event data.

```powershell
# backend (from backend\)
.\.venv\Scripts\python.exe -m pytest tests -q
# frontend unit tests and build (from frontend\)
npm test
npm run build
# real-browser journeys on dedicated ports 8001/5174 (from backend\)
.\.venv\Scripts\python.exe run_browser_tests.py
# event load rehearsal: 60 phones for 5 minutes (add --tunnel for the real internet path)
.\.venv\Scripts\python.exe rehearse_event.py
```

Latest results (25 November 2026, web game screen): **498** backend tests passed; **95** frontend unit tests passed; **16** browser journeys passed, with three skipped by design (the Matrix and web game screen journeys need `STACK_TEST_RULESET=matrix-v1`, where both pass; the visual capture needs `VISUAL_LABEL`). A 39-page screenshot comparison changed only the pages edited for the web game screen. Two offline NLP-lab test files need the separate NLP-lab environment. Rehearsal (24 November, LED-cabinet protocol): 60 phones, 0 errors on loopback and through a real tunnel.

## Repository layout

```text
backend/     FastAPI app (app/), SQL migrations, tests, setup, emulators, rehearsal and quality tools
frontend/    React app (src/pages, src/components, src/state), Vitest tests, Playwright e2e/
firmware/    ESP32 sketches: button_bridge/ (web game screen, USB button) and stack_moko_baby/ (optional LED cabinet game, Wokwi diagram)
scripts/     Launchers (dev, online), device flashing, backups, ID purge, event check, Graphify
contracts/   Example JSON for the device, game-result and assistant contracts; Matrix v1 rules and engine test vectors
docs/        Specifications, setup and operation guides, the PDF guide, evaluation records
deploy/      Inactive Render/MariaDB alternative (used with the root Dockerfile and render.yaml)
graphify-out/ Generated project knowledge graph
```

## Documentation

Start with **[docs/README.md](docs/README.md)**, the full documentation index. Most useful:

| Topic | Document |
|---|---|
| Wiring, self-test and event operation (printable) | [Wiring and Operation Guide (PDF)](docs/Stack-Moko-Baby-Wiring-and-Operation-Guide.pdf) |
| Web game screen (default display) | [game-screen.md](docs/game-screen.md) |
| LED cabinet bring-up (optional) | [hardware-bringup.md](docs/hardware-bringup.md) |
| Event hosting with the tunnel | [free-online.md](docs/free-online.md) |
| Player flow, access and roles | [player-flow-and-access.md](docs/player-flow-and-access.md) |
| What is left, ranked by event risk | [remaining-work.md](docs/remaining-work.md) |
| Backups, restore and student-ID purge | [backups.md](docs/backups.md) |
| Daily development and troubleshooting | [local-setup.md](docs/local-setup.md) |
| Architecture and database | [tech-stack.md](docs/tech-stack.md), [schema.md](docs/schema.md) |
| Device protocol and recovery | [esp32-online.md](docs/esp32-online.md), [device-recovery.md](docs/device-recovery.md) |
| Stack Intelligence | [admin-assistant.md](docs/admin-assistant.md) |

## Security and privacy

- **Student IDs** are required but private: looked up by a keyed HMAC, stored encrypted with AES-256-GCM, never returned by any API, never put in URLs, browser storage, logs, the knowledge graph or the assistant. `npm run db:purge-ids` deletes them after the event.
- **Sessions:** separate HttpOnly, SameSite=Strict cookies for players and staff, CSRF tokens on every change, same-origin checks, Argon2id staff passwords, and a login limit of 8 failures per visitor and username in 15 minutes (the visitor's real address is used behind the tunnel).
- **Scores** are never accepted from a player's or staff browser. Only the game device (the paired web game screen or the LED cabinet) can submit one, with a device token, and the server recomputes each score from its placement record.
- **Audit log:** skips, no-shows, recoveries, re-entry codes, staff account changes and ID purges are recorded without personal data.
- **Never commit** `backend/.env`, `backend/.admin-credentials.txt`, `firmware/stack_moko_baby/config.h`, backups or exports. All are git-ignored.

## Known limitations

- The web game screen passed automated and browser tests, but the **real button through the ESP32 bridge, the two laptops on the hotspot and real phones are not yet tested together**; game timing values are proposals until play-tested.
- A new tunnel address means pairing the game screen and connecting the button again (browser storage and serial permission are per address).
- The free Quick Tunnel has no uptime guarantee and changes address on restart; a fixed address needs a domain and a firmware change.
- No push notifications to closed tabs: players keep the ticket page open (the game screen and the operator also call the next player).
- Stack Intelligence is experimental: on its reused 325-question evaluation sets it routes about 61–64% of questions correctly (regression evidence, not fresh accuracy). It is read-only and never changes data.
- One event, one game device at a time (web game screen or LED cabinet), one API worker.

## Contributing

Read [AGENTS.md](AGENTS.md) and [docs/README.md](docs/README.md) first. Keep student IDs, credentials, backups and the configured `config.h` out of commits and out of the knowledge graph. After code changes, refresh the graph with `scripts\graphify.cmd update .`. There is no CI; run the tests above before pushing.

This repository does not include a licence file. All rights are reserved by the project authors unless a licence is added.
