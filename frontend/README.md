# Stack Moko Baby — frontend

React 19 single-page app for both audiences: the **player portal** (scan, register, ticket, result, leaderboard) and the **staff dashboard** (queue, cabinet, analytics, settings). Built with Vite 8 and Tailwind CSS 4, written in JavaScript/JSX.

## Running

Most of the time, start everything from the project root:

```powershell
cd D:\iot-dashboard
npm run dev
```

That starts the FastAPI backend first, waits for it and the database, then starts Vite on <http://localhost:5173>. Vite proxies `/api` (including WebSockets) to port 8000. Use one hostname consistently: `localhost` and `127.0.0.1` keep separate cookies.

| Script (in `frontend\`) | Purpose |
|---|---|
| `npm ci` | Install exact dependencies from the lockfile |
| `npm run dev` | Same combined launcher as the project root |
| `npm run dev:frontend` | Vite only (needs an API already on port 8000) |
| `npm run build` | Production build to `dist/` (served by the API in `npm run online`) |
| `npm run preview` | Preview the build on port 4173 |
| `npm test` | Vitest unit and component tests |
| `npm run test:browser` | Playwright directly (normally run through `backend\run_browser_tests.py`) |
| `npm run format` | Prettier |

Environment: `VITE_PUBLIC_BASE_URL` (optional) is the public address used in QR codes; by default the page's own origin is used. Never put credentials or keys in `VITE_*` variables; they are compiled into the public bundle.

## Routes

| Path | Who | Page |
|---|---|---|
| `/`, `/scan` | Anyone | Home: QR scanner (tap the camera view or upload a photo), live tiles, how it works, today's best, rules |
| `/about`, `/contact` | Anyone | About the game, privacy and FAQ; how to get help at the booth |
| `/join/:token` | Anyone | Entry from the printed or on-screen QR; still requires a scan check |
| `/register` | Player with an entry grant | Nickname, student ID, privacy notice |
| `/ticket` | Registered player | Place in line, turn alert, result, "Ask the robot" |
| `/leaderboard/acs-day` | Player after a finished round | Leaderboard |
| `/reenter#code` | Player with a re-entry QR | Restores their ticket once, then opens it |
| `/screen` | Paired game screen (device token in browser storage) | Full-screen stacking game played with the arcade button via Web Serial; see [game-screen.md](../docs/game-screen.md) |
| `/admin/login` | Staff | Sign in |
| `/admin/overview` | Staff | Live summary, Registration QR |
| `/admin/analytics` | Staff | Charts by period and result source |
| `/admin/queue` | Staff | Call next, skip, admissions, Player didn't come, Player lost their ticket? |
| `/admin/sessions` | Staff | Round history |
| `/admin/machines` | Staff | Cabinet status, command delivery, device recovery |
| `/admin/settings` | Staff | Theme, Stack Intelligence, memory; Game screen pairing or LED cabinet, Staff accounts and training (administrators) |
| `/admin/question-review` | Administrators | Practice-question review |

Pages check access on the server, not only in the browser: hidden buttons are also refused by the API. Operators see no simulator, staff accounts, training or question review, and only the no-show release among the recovery actions.

## Structure

```text
src/
  App.jsx              routes and access guards (AdminOnly, PlayerOnly, AdministratorsOnly)
  pages/               one component per route
  components/          Shell (navigation, Registration QR), ui.jsx (Card, Button, Modal, …),
                       NoShowRelease, PlayerReentry, StaffAccounts, DeviceRecovery,
                       SiteHeader, ChatWidget (sticky robot), RobotIcon, SiteSections,
                       PlayerAssistant (player Stack Intelligence),
                       AdminAssistant, charts, icons (Font Awesome)
  screen/              web game screen: engine.js (Matrix v1 port), deviceClient.js (protocol-v2
                       journal), button.js (Web Serial), sound.js, vfx.js (ripple rings, chips,
                       sparkles, shockwave)
  state/               AppContext (session, snapshot, actions), api.js (fetch + CSRF),
                       useLiveUpdates (WebSocket hints with polling fallback),
                       AssistantContext, qr-entry, game
  styles/              tailwind.css entry, foundation tokens, admin themes, page styles
e2e/                   Playwright journeys (flows, scanner, matrix, screen-game, question review)
```

## Design system

- Tailwind CSS 4 with the `tw:` prefix and shared semantic tokens; see [Tailwind UI conventions](../docs/tailwind-ui.md).
- The player website is fully on Tailwind utilities (`components/siteStyles.js` holds its shared class strings). Motion tokens (`animate-fade-up`, `animate-panel-in`, …) live in `styles/tailwind.css` and are always used with `motion-safe:`.
- Visual check for styling changes: `e2e/visual.spec.js` (run with `VISUAL_LABEL`) and `scripts/compare-visual.py`; see the Tailwind guide.
- Shared primitives in `components/ui.jsx`, with Radix dialogs, menus and tooltips for accessibility.
- Neutral light and dark staff themes. The player website uses three colours only (Cloud `#f4f5f5`, Ink `#111313`, Lime `#dfff00`), set in `styles/site.css` for player pages.
- Open Sans Variable and Font Awesome Free are bundled locally (no SVG icon library, no external font requests). The robot mascot is the one inline SVG on player pages.
- Charts use Recharts; QR codes render to canvas with `qrcode.react`; scanning uses `html5-qrcode`.

## Privacy rules in the browser

- The student ID is sent only in the registration request and cleared from the form afterwards. It never goes into URLs, storage, analytics or logs.
- Sessions use HttpOnly cookies; the CSRF token lives only in memory.
- Re-entry codes arrive in the URL fragment, are removed from the address bar immediately and are sent once.
- Browser storage holds only the theme preference.

## Tests

```powershell
npm test         # 59 tests in 15 files (24 November 2026)
npm run build
npx prettier --check src scripts e2e *.js *.json index.html
```

Real-browser journeys, including accessibility checks with axe, run from the backend with a throwaway database:

```powershell
cd ..\backend
.\.venv\Scripts\python.exe run_browser_tests.py
```

The Matrix journey runs only with `STACK_TEST_RULESET=matrix-v1`. Screenshots go to `docs/ui-review/`, which is ignored by Git.

## Related documents

[Player flow and access](../docs/player-flow-and-access.md) · [QR scanner](../docs/qr-scanner.md) · [Live updates](../docs/live-updates.md) · [Dashboard design](../docs/dashboard-design.md) · [Stack Intelligence](../docs/admin-assistant.md)
