# Stack Moko Baby — firmware

**Display migration (25 November 2026):** the game now runs on the web game screen by default ([docs/game-screen.md](../docs/game-screen.md)), and the ESP32 runs [`button_bridge/`](button_bridge): GPIO27 button (COM → GND, NO → GPIO27), same 65 ms / 20 ms debounce as the game sketch, serial 115200, `READY` every 5 s and `PRESS <millis>` per press (the falling-edge time). No Wi-Fi, token or `config.h`. Flash it with `npm run device:bridge -- --port COM5`; like the other builds it never erases NVS.

The rest of this file describes the LED cabinet firmware, which **stays supported**: flash it with `npm run online:device`, then choose Settings → Game screen → Use the LED cabinet instead.

Arduino sketch for the ESP32 inside the cabinet: [`stack_moko_baby/`](stack_moko_baby). The ESP32 runs the game itself (button timing, row movement, scoring trace, display and sounds). It only talks to the dashboard to learn "this player is next" and to upload the finished round, which the server replays before saving the score. Firmware version reported to the dashboard: `matrix-v1-journal-0.1`.

## Files

| File | Contents |
|---|---|
| `stack_moko_baby.ino` | Wi-Fi, HTTPS client, device protocol, NVS journal, HUD text, self-test mode |
| `game_engine.h` | Matrix v1 rules: 16 columns, starting width 6, 15 levels, 60 s limit, placement trace |
| `display_layout.h` | Pixel mapping for the 8×32 HUD and the two 16×16 panels; LED current budget |
| `sounds.h` | Countdown, click, win and loss beeps for the speaker |
| `transport_job.hpp` | Background HTTPS request job, so the game loop never blocks |
| `config.example.h` | Template for the private `config.h` (Wi-Fi, server address, device token, root CA) |
| `diagram.json`, `wokwi.toml`, `libraries.txt` | Wokwi simulation wiring and library list |

**`config.h` is private and git-ignored.** It holds the hotspot password and the device token. The launcher generates it; never commit it or put it in a public Wokwi project.

## Pins

| GPIO | Use |
|---|---|
| 18 | LED data: 330 Ω → 8×32 HUD DIN → bottom 16×16 panel → upper 16×16 panel |
| 27 | Button (60 mm arcade button: COM → GND, NO → GPIO27; internal pull-up, debounced in software) |
| 26 | Speaker through 220 Ω (simple beeps; no sound module) |
| 25 | Decoration-strip output (outside the game wiring guide) |

The laptop powers everything over USB, so `STACK_LED_BUDGET_MA` in `display_layout.h` (default 400 mA) dims any frame that would draw more. If the HUD looks mirrored or scrambled, change the `STACK_HUD_*` flags there; self-test stage 2 shows the orientation.

## Building and flashing

**Toolchain (25 November 2026):** ESP32 Arduino core **3.3.12** (all event laptops; it replaces 2.0.17), its bundled esptool 5.3.1, Arduino CLI 1.6.0, Adafruit NeoPixel 1.15.5 and ArduinoJson 7.4.3. The button bridge, the LED game firmware and its self-test compile on 3.3.12 with no warnings in our code. The flashing and Wokwi scripts pick esptool's command names by version (hyphenated for esptool 5, underscores for older cores), so a laptop still on 2.0.17 also works. `npm run setup -- --role bridge` installs this core.

The scripts use `arduino-cli` with the ESP32 core, Adafruit NeoPixel and ArduinoJson. From the project root:

| Command | What it does |
|---|---|
| `npm run device:selftest` | Flash the wiring self-test (no Wi-Fi or server): stage 1 panels, 2 orientation, 3 button, 4 strip, 5 sound |
| `npm run online:device` | Build with the hotspot settings and the current tunnel address, then flash over USB (`STACK_FIRMWARE_WIFI_SSID` and `STACK_FIRMWARE_WIFI_PASSWORD` must be set in that PowerShell window) |
| `npm run device:url` | Send the current tunnel address over USB serial; no reflash |
| `npm run online:firmware` | Build a private image for Wokwi instead of flashing |

Uploads write only the program area and **never erase the NVS journal**. Do not erase the board to "unstick" it; recover rounds from the dashboard's Machine page.

## Behaviour worth knowing

- **New tunnel address without reflashing.** On `STACK-URL https://….trycloudflare.com` over serial, the cabinet stores the address in its own NVS namespace (`stack-cfg`, separate from the game journal) and reconnects. It refuses while a round is running and accepts only `trycloudflare.com` HTTPS addresses.
- **Power loss.** Every accepted command, start and result is journalled in NVS with the boot it happened in. A round interrupted by a restart is never resumed or scored automatically; it waits for an operator decision on the Machine page.
- **TLS.** Certificates are always checked against the bundled root CAs. Never disable verification.

## Status

The sketch compiles and the full protocol passes against software emulators and browser tests. **It has not yet run on the physical cabinet.** Follow the printable [Wiring and Operation Guide](../docs/Stack-Moko-Baby-Wiring-and-Operation-Guide.pdf) and [hardware bring-up](../docs/hardware-bringup.md); protocol details are in [esp32-online.md](../docs/esp32-online.md) and [device-recovery.md](../docs/device-recovery.md).
