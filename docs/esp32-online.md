# ESP32, Wokwi and online operation (LED cabinet)

**Display migration, 25 November 2026:** the game moved from the LED-matrix cabinet to a **web game screen** (a second laptop at `/screen`, played with the same arcade button through an ESP32 USB button bridge). The LED cabinet stays supported: it uses the same device protocol, Matrix v1 rules and leaderboard, and an administrator switches between the two in Settings → Game screen. See [the web game screen](game-screen.md). This page covers the LED cabinet firmware and protocol, which remain supported; the web screen uses the same protocol from the browser.

**Latest choice:** the user selected the completely free [PC + XAMPP + HTTPS tunnel](free-online.md) after reviewing Render costs. `npm run online:firmware` now launches that setup and builds a private image. Local/public HTTPS health and private compilation passed. Render preparation below is retained as an inactive alternative; no paid deployment is authorized.

Updated 22 November 2026. The user confirmed **online registration, queue and dashboard with physical-button gameplay**, currently tested in **Wokwi**. The user selected the uploaded sketch's **16-column, 15-level, one-point-per-level** rules instead of Classic v1. No remote browser play button is provided.

**Physical cabinet, 23 November 2026:** for the real ESP32 on a phone hotspot, follow [physical bring-up](hardware-bringup.md). It adds the `STACK_HARDWARE_TEST` self-test build (`npm run device:selftest`), `npm run online:device` (hotspot `config.h` plus USB upload that refuses to write NVS), plain-language Wi-Fi/time diagnostics, and local-HTTP acceptance of 172.16–31.x (iPhone hotspot) addresses alongside 192.168.x/10.x. The game build with these changes compiled at 942,497 bytes; it has not run on hardware.

## What is implemented

`firmware/stack_moko_baby/` contains a connected replacement for the uploaded standalone sketch, plus Wokwi wiring and library files. Keep the downloaded original as reference. The firmware uses the existing authenticated **protocol v2**, not the sketch's hypothetical `/api/esp32/scores` endpoint. There is no inbound web server on the ESP32.

Flow: scan public event QR → register privately → waiting ticket → operator calls next → firmware polls an assigned reservation → persists/acknowledges it → cabinet turns green → physical button → countdown → local game → persisted terminal trace → backend replay → atomic score, served ticket and player notification → leaderboard unlocked. The idle button cannot bypass registration or assignment.

The application serves the built React UI and API from one origin for online use. Administrator login remains `/admin/login`; players have no dashboard authorization. The QR must contain that same public origin. Result notifications work while the ticket page is connected; closed-tab push is still unavailable.

## Rules and historical results

Migration `006_matrix_rules.sql` installs immutable `matrix-v1` and selects it for subsequent assignments. A fresh normal setup also selects it. The original `classic-v1` record and completed results remain intact. Existing reserved sessions retain their original ruleset; a matrix-only firmware will hold an older Classic assignment for operator resolution rather than play it incorrectly.

| Property | Matrix v1 |
| --- | --- |
| Logical display | 16 columns; 15 successful placements |
| Physical display | 8×32 WS2812 HUD on top + two 16×16 WS2812 block panels below (changed 23 November 2026; previously three 16×16 panels) |
| HUD (8 rows × 32 columns) | Scrolling SCAN TO PLAY / NEXT PLAYER, countdown, GO!, score and time, result text |
| Block area (16 × 32) | Two-pixel-high blocks, including a foundation |
| Data chain (GPIO18) | HUD first → bottom block panel → upper block panel; 768 LEDs. Orientation flags in `display_layout.h` |
| Foundation | x=5, width=6 |
| Row movement | 60 ms first row, then 50 ms; integer elapsed-time bounce |
| Time limit | 60 seconds, excluding countdown |
| Countdown | Three 500 ms steps (1.5 seconds), matching the supplied Wokwi link |
| Points | One per successful placement; maximum 15; no perfect bonus |
| End | Zero overlap, timeout or 15 retained placements |
| Rules SHA-256 | `f73ce2ee4d1f607b6ea97038a534c7521a9305ee9ada3e2d418029cf866a58a4` |

Movement is derived from elapsed device time. The supplied sketch advanced one tick per loop, which can slow under load. The connected version catches up mathematically and records the exact same position the backend recomputes. At the deadline, timeout takes precedence over a placement at or after 60,000 ms. Button release debounce is 20 ms, with at least 65 ms between accepted edges; the backend requires at least 30 ms between placements.

Scoring, analytics, player leaderboard and current dashboard rounds use one ruleset cohort at a time. Older Classic scores must never compete against 15-point Matrix scores. A player's completed ticket keeps its own ruleset/maximum level even if the event changes. No historical score is converted. Older rows remain in the database; the current dashboard shows the active ruleset's completed rounds.

These values follow the selected sketch; speed, brightness and electrical behavior still need physical play-testing. Replay proves consistency with the authenticated trace, not independent anti-cheat proof of physical button presses.

## Firmware files and wiring

- `stack_moko_baby.ino`: local game, output and outbound transport.
- `game_engine.h`: deterministic movement/placement logic.
- `transport_job.hpp`: isolated network request/reply data.
- `config.example.h`: configuration template; copy to ignored `config.h`.
- `diagram.json`, `libraries.txt`: Wokwi browser project files.
- `wokwi.toml`: optional VS Code configuration for a locally compiled build.

The [public Wokwi source bundle](device-artifacts/stack-moko-baby-wokwi.zip) is generated with `scripts/package-wokwi.py`; its explicit allowlist excludes credentials and binaries. It is ready for configuration after the Render origin/token exists. It does not modify the linked Wokwi project or include the ignored private `config.h`.

The display layout changed on 23 November 2026 to an 8×32 HUD plus two 16×16 block panels; only the pixel mapping and HUD text changed, not the Matrix v1 rules or their hash. Wokwi's matrix part is row-serpentine only, so the Wokwi build and public bundle set `STACK_HUD_COLUMN_MAJOR=0`; the physical default is column-major. The inspected wiring guide uses GPIO18 matrix data via a 74AHCT125 and 330 Ω resistor; GPIO27 button to ground with pull-up; GPIO25 MOSFET gate for the separate 12 V strip; GPIO17 TX through 1 kΩ to optional DFPlayer RX. The Wokwi diagram simplifies power/level shifting and substitutes a small indicator LED for the strip. It is **simulation wiring**, not a real power-distribution plan.

Current default (23 November 2026): `STACK_USE_PIEZO=1`, `STACK_USE_DFPLAYER=0`. The cabinet has no DFPlayer: GPIO26 drives a scrap speaker through 220 Ω with firmware-generated, non-blocking beeps (countdown, a click per kept block, win and loss tunes). The physical build also has no 74AHCT125 (GPIO18 → 330 Ω → HUD DIN) and the ESP32 is powered by laptop USB. The laptop also powers the displays from a second USB port; `limitPower()` dims any frame above `STACK_LED_BUDGET_MA`. The optional DFPlayer path remains in code. Earlier defaults followed the linked newer sketch: `STACK_USE_PIEZO=0`, `STACK_USE_DFPLAYER=1`, initial volume 8/30 after a two-second initialization wait. TX-only DFPlayer commands select `/mp3/0001.mp3` for countdown, `0002.mp3` for loss and `0003.mp3` for win. For a separate simulated piezo, enable `STACK_USE_PIEZO`; GPIO26 does not drive a JBL speaker. Amplifier/speaker/volume verification remains physical work. Use the attached wiring guide for real power supplies, common grounds and speaker compatibility, after checking actual component ratings. Physical matrix orientation is adjusted with the flags in `display_layout.h` (checked by self-test stage 2).

## Wokwi connection choices

The [Wokwi Wi-Fi guide](https://docs.wokwi.com/guides/esp32-wifi) explains that the public gateway supports outbound Internet requests but cannot access your PC's LAN/localhost. Its traffic is monitored. Use a separate synthetic event and development token for public simulations; keep real student records and event credentials out of public projects.

1. **Private Wokwi gateway:** points directly to the local API, using `http://host.wokwi.internal:8000`. Requires the supported private gateway/VS Code arrangement. HTTP is an explicit local-only development exception; it is not an Internet deployment.
2. **Public HTTPS backend:** deploy to Render or publish the locally hosted application through a configured HTTPS tunnel. Set `STACK_API_BASE` to that origin. All ESP32 requests are outbound, so no home-router port forwarding is needed.

Never use `localhost` as a public QR/backend address or publish XAMPP port 3306/Ollama port 11434. A Wokwi simulation and the backend's development simulator are different sources: Wokwi runs the firmware and uses the device API; dashboard simulator controls must be off during a firmware test. Wokwi results are still simulation evidence, not physical hardware acceptance.

### Prepare and run locally

Start MySQL in XAMPP. Apply migrations once:

```powershell
cd D:\iot-dashboard
.\backend\.venv\Scripts\python.exe backend\setup_local.py
npm run dev
```

With the private gateway, prepare the ignored firmware configuration:

```powershell
.\backend\.venv\Scripts\python.exe scripts\configure-firmware.py --url http://host.wokwi.internal:8000 --local-http
```

For HTTPS, supply the server's trusted root certificate in a PEM file, then use `--url https://YOUR-HOST --ca C:\path\root-ca.pem`. For a cloud event also pass `--cloud` and set `STACK_FIRMWARE_DEVICE_TOKEN` privately to **that cloud cabinet's** token. The local token is not automatically the cloud token. For real Wi-Fi use `--ssid` and the private environment variable `STACK_FIRMWARE_WIFI_PASSWORD`. Configuration is never printed by the helper.

The firmware requires certificate verification and a valid SNTP clock. It does not call `setInsecure()` and does not follow redirects carrying a token. A missing trust anchor or unreachable clock leaves the cabinet offline. Export a trusted root certificate from the actual HTTPS chain, not a private key; refresh it if the hosting chain changes.

The user supplied [this Wokwi project](https://wokwi.com/projects/481390138161170433). Computer-use inspection first booted its existing standalone sketch, pressed its button and observed countdown, GO and a zero-score timeout loss. Serial output explicitly reported Wi-Fi disabled and no result upload because `SCORE_POST_URL` is empty. The connected replacement was subsequently loaded as a private local binary with the user's approval, without editing/saving public source. The core-4 build encountered a TLS watchdog reboot; a core-2 compatibility build boots, but repeated public-gateway failures prevent an authenticated heartbeat/game acceptance result. See [the current check](free-online.md). No connected success is claimed.

Local compilation (Arduino CLI, ESP32 core and libraries installed):

```powershell
arduino-cli compile --fqbn esp32:esp32:esp32 --output-dir firmware/stack_moko_baby/build firmware/stack_moko_baby
```

**Toolchain (25 November 2026):** ESP32 Arduino core **3.3.12** (all event laptops; it replaces 2.0.17), its bundled esptool 5.3.1, Arduino CLI 1.6.0, Adafruit NeoPixel 1.15.5 and ArduinoJson 7.4.3. The button bridge, the LED game firmware and its self-test compile on 3.3.12 with no warnings in our code. The flashing and Wokwi scripts pick esptool's command names by version (hyphenated for esptool 5, underscores for older cores), so a laptop still on 2.0.17 also works. Earlier history follows.

Dependencies used for compilation: Arduino CLI 1.6.0, ArduinoJson 7.4.3 and Adafruit NeoPixel 1.15.5. ESP32 core 4.0.0 compiled, but its HTTPS signature verification triggered the watchdog in the actual Wokwi run. Core 2.0.17 is being checked for simulator compatibility; compilation and network success are separate evidence. Build outputs and private configuration are excluded from Git/Graphify. The free-online helper explicitly merges and verifies the current bootloader, partitions and application because core 2.0.17 does not produce a merged image automatically.

## Keeping XAMPP and local Ollama online

For the complete current system, an HTTPS tunnel to this PC preserves XAMPP and **local Ollama**. The computer, MySQL, Ollama, API and tunnel must stay running. Use `npm run online:firmware` for the automated free setup in [free-online.md](free-online.md). The earlier manual alternative builds/serves the same-origin app with:

```powershell
powershell -ExecutionPolicy Bypass -File scripts\start-online-preview.ps1 -PublicUrl https://YOUR-PUBLIC-HOST
```

This command serves port 8000 only on loopback, enables secure cookies, sets the exact allowed public origin and disables dashboard simulator controls. Stop any existing API on port 8000 first. Configure the tunnel to forward to `http://127.0.0.1:8000`. It does not expose the database or Ollama directly. Environment overrides are restored when the script exits.

For temporary tests, [Cloudflare Quick Tunnels](https://developers.cloudflare.com/tunnel/get-started/quick-tunnels/) supply a temporary HTTPS hostname. The npm launcher starts the tunnel, discovers its address and starts the API with that exact public origin. Anyone with the address can reach the application login/player entry; application authentication still applies. Quick Tunnels have no uptime guarantee and change hostname on restart. Use a stable named tunnel/domain for an event. This free setup has been started and its public HTTPS access checks passed; a production event remains unverified.

## Render option

Render is a prepared, inactive alternative. After reviewing its recurring cost, the user selected free PC/XAMPP operation instead. Two Starter services plus a 1 GB disk had an estimated base cost of **US$14.25/month** on a Hobby workspace, before tax/usage extras, using the published [compute/disk pricing](https://render.com/pricing). A future switch requires review of the actual workspace invoice preview and spending approval; no billable resources have been created.

**Yes, Render can host the dashboard, API, queue and device connection.** `render.yaml` prepares an always-on web service and a private MariaDB 10.11 container with a persistent disk. `Dockerfile` builds React and serves it through FastAPI on one origin; WebSockets use the existing `/api/live/...` paths and one API worker. `backend/setup_server.py` applies migrations and seeds a fresh cloud event without local XAMPP paths or printing credentials. Keep the chosen region the same for both services.

Before applying the Blueprint, review the paid service/disk choices and fill its five private values: three independently generated base64url-encoded 32-byte keys (`STACK_IDENTITY_KEY`, `STACK_LOOKUP_KEY`, `STACK_CSRF_KEY`), a long device token, and an initial administrator password of at least 16 characters. Run `backend\.venv\Scripts\python.exe scripts\prepare-render-secrets.py` to prepare a fresh ignored `.tools/render/initial-secrets.env` file without printing its values. Existing generated secrets are preserved. The application takes its default public origin from Render's `RENDER_EXTERNAL_URL`; set `STACK_PUBLIC_URL` only when using a different custom HTTPS origin. The initial password seeds only an empty database; later deploys preserve the stored password. Save encryption/HMAC keys and database backups privately. A fresh cloud deployment starts empty; it does not automatically copy local records.

Render's private database image creates a database-scoped application user. It needs schema permissions for the pre-deploy migration; it is not the database root user. Database data lives at `/var/lib/mysql`. Back up with MariaDB-aware tools and test restore separately. Keep secrets in Render environment settings, never Git, frontend builds, graph inputs or a shared Wokwi sketch.

Render's [free services](https://render.com/docs/free) sleep after inactivity and do not provide persistent disks. This Blueprint therefore selects paid always-on services for an event; it has not been applied or billed. [Render FastAPI hosting](https://render.com/docs/deploy-fastapi), [private MySQL deployment](https://render.com/docs/deploy-mysql), [Blueprint service references](https://render.com/docs/blueprint-spec) and [WebSockets](https://render.com/docs/websocket) support this arrangement. MariaDB container compatibility and the Docker build still require an actual cloud smoke test.

**Local Ollama does not move to Render automatically.** Render's `127.0.0.1:11434` is its own container, not this PC. The supplied cloud Blueprint explicitly disables AI; queue, gameplay, results and dashboard remain available. To retain the current local AI, use the PC/tunnel arrangement above. A separately secured AI bridge or an appropriately sized machine running the model needs its own design; do not expose Ollama publicly or silently relax the existing local-only policy.

## Journal and operational limits

The firmware commits a single NVS snapshot before acknowledgements/start/terminal submission, checks write success, retries the exact pending event after uncertain delivery, and uses a separate network task so HTTP cannot slow the game. The network task shares idle priority, keeps verified connections reusable and alternates heartbeat/command polling to avoid starvation in a slow simulator. Its serial diagnostics report transport/TLS error codes and registration/readiness without tokens or player identity. It retains storage/boot lineage, an immutable start marker and terminal trace. A persistent delivery high-water mark blocks all older reservation commands after a fence or completed round; command IDs remain UUIDs, and `deliverySequence` is a monotonic backend delivery counter. The raw merged Wokwi image must not overwrite physical NVS; use application-only hardware updates.

On restart it first retries an uncertain old-boot packet, then registers a new boot. It never resumes an interrupted game. A saved terminal can become pending review; a partial round needs the existing operator stop/void workflow. A rejected start/expired acceptance is preserved and allows a subsequent stop receipt. Other contradictory receipts remain held. Corrupt/full NVS fails closed; do not erase storage to bypass recovery.

For an actually empty journal (including a simulator reset that erases flash), authenticated `GET /api/device/enrollment` supplies only the current boot UUID. Fresh firmware persists that predecessor before first registration, then receives a new storage epoch. This read-only bootstrap requires the cabinet token, exposes no player data and does not close an assignment. A changed storage epoch cannot attest an old round never started; the operator must review a current-boot stop receipt and explicitly void an interrupted/unknown round without points. An existing corrupt or contradictory journal never auto-replaces its lineage. Replacing/restoring the database also requires preserving command ordering or explicit reprovisioning; do not silently reset its delivery counter under an existing device journal.

Unrun gates: connected firmware in the user's Wokwi project/network, true ESP32 NVS brownout behavior, physical button latency/pixel orientation, power and audio, deployed Docker/MariaDB restore, real phone/QR HTTPS and event load. See [remaining work](remaining-work.md). Passing backend/emulator tests is not proof of physical operation.

## Verification record — 22 November 2026

- Local XAMPP migration 006 applied successfully without resetting credentials/results. API and frontend started normally with `npm run dev`.
- 34 targeted MariaDB/API tests passed: player flow, device recovery and new Matrix rules. A separate 42-test quality/scope/follow-up regression passed. Device-command/static-serving checks initially exposed the command-envelope assertion needing the new delivery counter; it was corrected, and the six affected Matrix/static/privacy cases passed. The other fifteen command cases had passed in that run. No test database was the real event database.
- Frontend: 48 unit tests and production build passed. Four real Edge browser flows passed for guarded login/QR access, independent player win/loss notifications/leaderboards, themes/mobile accessibility, and boot-bound operator recovery. These browser flows used the Classic synthetic fixture; Matrix API/analytics behavior is covered separately by the new integration tests.
  A fifth Matrix-specific browser journey subsequently passed: scanned QR registration showing 15 levels/15 points, a protocol-v2 device assignment/start, a correctly timed 15-placement trace, duplicate terminal retry, exactly one notification, guarded player leaderboard and 15-level analytics. It uses synthetic protocol requests; it does not simulate actual firmware timing or physical button hardware. Screenshot review exposed remaining Classic-only captions and the registration's old maximum; these were corrected and the journey passed again.
- Arduino CLI compiled the ESP32 firmware. Both the placeholder build and a build-only configured transport are checked; compilation is not a running network or NVS power-loss test. The browser separately ran the user's unchanged standalone Wokwi simulation: physical button initiated countdown, timeout produced a loss, and the serial log explicitly reported Wi-Fi disabled and no score upload.
- Blueprint YAML parses locally and private firmware/build files match Git ignore rules. Docker/Render provisioning remains unrun and no billable service has been created. The separately selected free tunnel is live: public health, login, secure cookies, origin enforcement and authenticated WebSocket checks passed. Actual Wokwi protocol exchange remains a separate gate.
- Eleven final Matrix/bootstrap, static-serving and production-config tests passed, including erased simulator flash, authenticated lineage discovery, prohibition on never-started claims after storage loss, explicit no-score void, Render public-origin discovery and secure-cookie enforcement. A configured ESP32 build with a synthetic token compiled to 1,135,892 bytes (86% of the default app partition), with 52,596 bytes of static RAM; heap/TLS peak use still requires runtime verification.
- Ruff critical syntax/name checks and documentation structural/link checks passed. The optional MySQL-dialect parser was unavailable; actual migrations/API tests used MariaDB. NLP holdouts were not used to train or claim improved accuracy.
- Free online continuation: public HTTPS health/login/cookies/origin/WebSockets passed. The core-4 configured binary repeatedly hit the TLS watchdog in Wokwi; after network scheduling/reuse fixes, core 2.0.17 compiled the current compatibility image (940,653 application bytes; 47,856 static RAM bytes). The helper explicitly merged and verified current component bytes. Computer-use retries booted the image but repeatedly encountered Wokwi's public Internet gateway connection error; one intermediate Wi-Fi connection did not complete registration. No fresh cabinet heartbeat or actual connected game was observed. The simulation was stopped and the acceptance gate remains open.
