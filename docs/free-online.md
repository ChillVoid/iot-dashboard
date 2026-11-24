# Free online operation with XAMPP

**Game display, 25 November 2026:** after `npm run online`, open the printed address on the screen laptop and pair the [web game screen](game-screen.md) (pair again after every new tunnel address). The Wokwi and physical-cabinet sections below apply to the optional LED cabinet.

Current choice, 22 November 2026: the user declined paid Render activation and selected **PC + XAMPP + HTTPS tunnel** for the Wokwi stage. Render files remain an optional prepared alternative. No paid service was created.

## Daily startup

Start MySQL in XAMPP. From the project root:

```powershell
cd D:\iot-dashboard
npm run online:firmware
```

The command builds React, starts a free Cloudflare Quick Tunnel, starts the API against the existing local database with secure cookies and the exact public origin, and prepares a private firmware image for the new hostname. It prints the **administrator login** and **player scanner** links. The QR displayed by the online dashboard uses that same host. Keep the terminal and MySQL running; Ctrl+C stops the launcher's own services. The database is preserved. Restarting the launcher gives a new address, so players already in line lose their ticket on their phones; their place is kept, and the operator restores it with **Re-entry QR** on the Queue page. Existing separately started Ollama is reused; if absent, the launcher starts the installed local server on loopback. No model is downloaded or exposed publicly.

For the **physical cabinet** on a phone hotspot, set `STACK_FIRMWARE_WIFI_SSID` and `STACK_FIRMWARE_WIFI_PASSWORD` in the terminal and run `npm run online:device` with the ESP32 on USB. It writes the hotspot config and uploads the game firmware without touching NVS; see [physical bring-up](hardware-bringup.md). `npm run online` starts the web app/tunnel without compiling firmware. It also takes [encrypted database backups](backups.md) at start, every 15 minutes and on Ctrl+C. Both scripts also work from `frontend`. Ordinary `npm run dev` remains the local development command. Stop an existing port-8000 backend in its own terminal before switching modes; online mode refuses to take over another process or reuse a backend with the wrong public origin.

The official cloudflared 2026.11.1 helper is installed under ignored `.tools/free-online`. On another PC, install it once with:

```powershell
.\backend\.venv\Scripts\python.exe scripts\install-cloudflared.py
```

The installer downloads only the official Cloudflare GitHub release and checks its published SHA-256 asset digest. It does not create an account, install a Windows service or change firewall/router/DNS settings. Non-Windows installations can use the official package and set `STACK_CLOUDFLARED` to its executable.

## Wokwi firmware

`online:firmware` reads the live HTTPS server's **verified** certificate chain, saves the public root certificate locally and writes ignored `firmware/stack_moko_baby/config.h` using the existing private cabinet token. It builds `firmware/stack_moko_baby/build/stack_moko_baby.ino.merged.bin`, including bootloader, partition table, boot selection data and application. The helper explicitly merges the components and compares their bytes against the current build, so a stale combined image cannot silently be reused. The public source ZIP contains no configured token or private binary.

**Toolchain (25 November 2026):** ESP32 Arduino core **3.3.12** (all event laptops; it replaces 2.0.17), its bundled esptool 5.3.1, Arduino CLI 1.6.0, Adafruit NeoPixel 1.15.5 and ArduinoJson 7.4.3. The button bridge, the LED game firmware and its self-test compile on 3.3.12 with no warnings in our code. The flashing and Wokwi scripts pick esptool's command names by version (hyphenated for esptool 5, underscores for older cores), so a laptop still on 2.0.17 also works. The 3.x build has not been run in Wokwi or on a cabinet: recheck the TLS handshake there (below) before relying on the LED cabinet.

Earlier compiled compatibility build: Arduino CLI 1.6.0, ESP32 core 2.0.17, ArduinoJson 7.4.3 and Adafruit NeoPixel 1.15.5. This is a simulator compatibility investigation, not a production-version recommendation. Core 4.0.0 compiled but repeatedly hit a watchdog during TLS signature verification in Wokwi. The network task now shares CPU with the idle watchdog task, retains verified HTTPS connections and alternates heartbeat/command polling. The new build boots, but the HTTPS runtime fix is not verified while Wokwi's gateway is unavailable. Retest the full exchange before calling the cabinet ready.

For a fresh hostname, DNS can take time to resolve. Certificate preparation retries and may use Cloudflare's HTTPS resolver for that request only, retaining certificate verification and hostname validation. It does not disable TLS checks. If firmware preparation fails, the dashboard remains online and prints a retry instruction.

In the Wokwi editor press F1, choose **Upload Firmware and Start Simulation…**, and select the merged image. This runs a local build without replacing the public sketch source. A normal restart button can return to the project's original sketch; use the upload command again to run the private build. The image still contains a device credential: use an unsaved/private simulation, approve sharing that credential with the simulator service, and never save/publish the configured image or `config.h`. The user approved this temporary upload in the current session. The unconfigured source bundle is safe to share. A public source project must never contain the real token.

The merged image is for a fresh simulator. Its padded gaps include the NVS region, so do not flash it over a real cabinet's existing journal. For real hardware updates, use the ordinary application upload without an erase-all operation and preserve the device's NVS/recovery state. Physical update and brownout acceptance still require verification.

The user confirmed online queue/dashboard plus cabinet-button gameplay. Wait for a fresh cabinet heartbeat, call the next registered player as administrator, then press the physical/simulated button. Unassigned button presses do not start a ranked game. Follow [ESP32 integration](esp32-online.md) for rules, journals and interrupted-round recovery. Wokwi results are simulation evidence even though they use the cabinet device protocol.

## Address and availability

Cloudflare supplies a different `https://....trycloudflare.com` hostname for each new Quick Tunnel. The launcher records the current one in ignored `.tools/free-online/current-url.txt`. Each new run therefore needs a fresh registration QR. The physical cabinet takes the new address over USB without reflashing (`npm run online` does this automatically, or `npm run device:url`; see [physical bring-up](hardware-bringup.md)). A Wokwi simulation still needs its private image rebuilt and reloaded. Old bookmarks, QR images and old firmware URLs stop working after the tunnel closes. The dashboard's normal access protections still apply at the public hostname; local HTTP is not the online login address.

Your PC, network, MySQL, backend and tunnel must stay running. Cloudflare's Quick Tunnel page (checked 24 November 2026) says each Quick Tunnel "supports up to 200 in-flight requests" (more get HTTP 429), has "no uptime guarantee", and is meant for testing and development. Every open ticket page holds one live connection, so plan on fewer than about 150 phones with the ticket open at the same moment. The PC's ordinary Internet/electricity costs still apply. Do not expose database port 3306 or Ollama port 11434 directly.

**Stable hostname (recommendation, 24 November 2026; the choice is the organiser's).** Keep the free Quick Tunnel for this event, because a restart is now survivable: the cabinet takes the new address over USB, the registration QR is shown from the dashboard, and players who lose their ticket get a re-entry QR. A fixed address (a named Cloudflare Tunnel) needs a domain you own (about USD 10 a year) and a Cloudflare account; it removes the 200-request cap and the address change. Switching also needs a firmware change, because the cabinet currently accepts only `trycloudflare.com` addresses.

**MySQL and the event laptop.** `npm run online` now starts XAMPP MySQL itself if it is not running (`C:\xampp`, or `STACK_XAMPP_DIR`) and checks it every 15 seconds, restarting it if it stops. MySQL keeps running after Ctrl+C, like a normal XAMPP start. Run `npm run event:check` on the event laptop the day before: it reports MySQL, the charger, sleep, hibernate, lid and USB power-saving, a pending Windows restart, free disk space and the launcher's files. `npm run event:check -- --fix-power` sets "plugged in" to never sleep or hibernate, the lid to do nothing and USB power-saving off (battery settings unchanged). Install Windows updates and restart the day before, then pause updates.

**Admin login behind the tunnel.** Every tunnel request reaches the API from this PC, so the login limit (8 wrong passwords per address and username in 15 minutes) now counts Cloudflare's `CF-Connecting-IP` visitor address, trusted only from a loopback peer. One stranger's guesses no longer lock out every staff member.

## Verification and remaining checks

The free launcher was actually started against XAMPP. Direct local and public HTTPS `/api/health` requests both returned **200**. Public administrator login, secure cookies, guest denial, cross-origin write rejection and authenticated revision-only WebSockets passed. No active player round was present during the connection checks; no sample score was added to the event.

The latest private compatibility image compiled successfully: **940,653 bytes** of application storage and **47,856 bytes** of static RAM. Its combined application/partition bytes were verified. Computer-use testing loaded the image without saving public source and observed its boot. Subsequent attempts repeatedly reported **“WiFi Error: Connection to IoT Gateway wss://netwi.wokwi.com/ failed”**. One intermediate attempt obtained Wi-Fi but did not complete the authenticated exchange. No fresh cabinet heartbeat was observed. The simulation was stopped after recording [the gateway check](ui-review/wokwi-gateway-check.jpg).

This blocks the connected acceptance test; it is not evidence that HTTPS or game completion works on the ESP32. Retry the private image when the simulator's public gateway connects, verify boot registration plus a fresh heartbeat, then test the assigned-button round and notification. If the serial monitor reports waiting for network time, allow SNTP to complete; if it prints an HTTP/TLS error code, investigate that code without disabling certificate checks. Physical ESP32 electrical behavior, NVS brownout, audio and event-network/load tests remain unrun.

Sources: [Cloudflare Quick Tunnels](https://developers.cloudflare.com/tunnel/get-started/quick-tunnels/), [official helper downloads](https://developers.cloudflare.com/tunnel/downloads/), [Wokwi custom firmware loading](https://docs.wokwi.com/guides/esp32). The tunnel helper itself logs only to ignored `.tools/free-online/tunnel.log`; it is not a database backup or credential store.
