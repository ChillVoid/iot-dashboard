# React.js and Tailwind UI

Confirmed by the user on 20 November 2026. React remains JavaScript/JSX with Vite. Tailwind CSS is the styling framework for new and updated UI. Exact `tailwindcss` and `@tailwindcss/vite` versions are 4.3.5, pinned in frontend/package.json and its lockfile.

## Build and cascade

`frontend/vite.config.js` loads the official Tailwind Vite plugin. `src/main.jsx` imports one CSS entry point, `src/styles/tailwind.css`. No runtime CDN, PostCSS configuration or v3 JavaScript configuration file is needed.

The CSS entry declares `theme, base, components, utilities` layers. It imports Tailwind's theme and utilities with `prefix(tw)`. Explicit source paths cover `frontend/src` and index.html; use complete literal utility names so production builds can discover them. Do not construct class names such as `tw:bg-${color}` at runtime; map variants to complete strings.

Existing foundation, reset, reference layouts and specialized chart/scanner/chat styles are imported in their original order inside the components layer. Tailwind utilities therefore override these styles when a React component is migrated, without using `!important`. Tailwind Preflight is intentionally omitted because the application already has its own reset. Avoid adding a second reset or an unlayered duplicate stylesheet import.

## Shared tokens and components

- Use semantic colors: `tw:text-ink`, `tw:text-muted`, `tw:text-note`, `tw:bg-surface`, `tw:bg-surface-soft`, `tw:bg-canvas`, `tw:border-line`, `tw:text-danger`.
- `@theme inline` resolves the existing live CSS variables. `note` has a darker player-side value for contrast against the gray canvas; admin note text follows the active muted token.
- Use `tw:font-sans` for Open Sans Variable. Font Awesome webfonts retain their own font family. Do not introduce SVG icon packages.
- Reuse `components/ui.jsx` for cards, buttons, dialogs, headings and helper notes. Radix retains keyboard/focus behavior. Prefer Tailwind utilities for layout, spacing, wrapping and responsive behavior rather than creating a competing set of page-specific layout classes.
- Dark styling follows `html[data-admin-theme='dark']`, not the operating-system setting alone. The custom `dark` variant uses that selector; semantic color utilities normally need no separate dark class. Radix portals use the same root tokens.
- Preserve the supplied reference composition, neutral admin light/dark colors and player palette. Application metrics still come from the backend; styling must not introduce fabricated telemetry or data.

Example:

```jsx
<Card className="tw:mt-6 tw:p-7">
  <CardHeader title="Cabinet status" subtitle="Latest authenticated observation" />
  <div className="tw:flex tw:flex-wrap tw:gap-2.5">
    <Button tone="light">Review device</Button>
  </div>
</Card>
```

## Current migration scope

Updated 24 November 2026. The frontend CSS went from 8,035 to about 5,630 lines.

- **Player website: fully on Tailwind.** Header, Home (scan page), About, Contact, the ticket's robot prompt, the sticky robot chat and the player assistant use utilities only; `site.css`, `chat-widget.css`, `scan-page.css` and `player-assistant.css` were deleted. Shared class strings live in `components/siteStyles.js` (literal strings, so Tailwind finds them). The three-colour player theme (Cloud `#f4f5f5`, Ink `#111313`, Lime `#dfff00`, available as `cloud`, `night`/`ink`, `lime`) re-maps the shared tokens on player pages in `tailwind.css` (utilities layer, so it overrides the legacy component styles it adjusts).
- **Admin:** Settings and Staff accounts moved to utilities (`settings.css` deleted). Shared primitives (cards, buttons, badges, dialogs, toasts, header, notes) carry utilities and motion. 255 selectors that no component used any more (the old scanner layout, the old player header, unused prototype pieces) were removed from `app.css`, `refinements.css`, `access-and-themes.css`, `scanner.css` and `admin-assistant.css`.
- **Still in CSS, on purpose:** the established admin page layouts in `app.css`, the admin assistant chat, theme scoping in `access-and-themes.css`, and third-party overrides (charts, the QR camera video). Move a page to utilities when it is next changed, using the visual check below.

## Motion system

Tokens in `tailwind.css` `@theme` (design canvas "Stack Moko Baby Motion System"): one ease-out curve (`ease-snappy`, `cubic-bezier(0.2, 0.8, 0.2, 1)`), 120 ms for hover and press, about 220 ms for panels, dialogs and toasts, 320–360 ms for entrances, nothing over 500 ms except the slow scanner line. Animations: `fade-up` (staggered page entrances, `ui.delays`), `fade-in` (admin page changes, dialog backdrop, chat messages), `pop-in` (robot launcher), `panel-in` (chat panel from the bottom-right corner, greeting bubble), `toast-in`, `modal-in`, `scan-line` (viewfinder), `ready-ring` (cabinet ready dot), `blink` (robot eyes), `typing` (thinking dots). Always apply them with `motion-safe:` (and `motion-reduce:` where something must hide), so the device's reduce-motion setting turns them off. A browser test checks both cases.

Sources used: [Colorado DCS motion tokens](https://dcs.colorado.gov/ids/digital-guidelines/design-tokens/motion-interaction), [U-M Library motion](https://design-system.lib.umich.edu/visual-elements/motion), [Toyota CDS animations](https://dx-playbook.toyota-europe.com/cds/foundations/animations/), [Smashing: accessible UI animations](https://smashingmagazine.com/2023/11/creating-accessible-ui-animations), [Tailwind theme variables](https://tailwindcss.com/docs/theme).

## Admin and game screen, design v2 (25 November)

- **Admin** keeps the monochrome look. Navigation moved to a left rail (icons with labels; a compact top bar with "Open navigation" on phones). Overview became **Control**: a status strip with the black **Call next player** button, the line, Now playing and Today above the existing charts and rankings.
- **Stack Intelligence** is a round icon at the bottom right that opens the conversation as a sheet; it no longer covers the page.
- **Press feedback:** `Button` adds a ripple from the press point (`animate-ripple`, 520 ms) on top of the 0.97 press scale; both are off with reduced motion. Toasts sit above the assistant icon.
- **Game screen** tokens: `animate-breathe` (PRESS button). Canvas effects live in `src/screen/vfx.js` (see [game-screen.md](game-screen.md)).

## Visual regression check

`frontend/e2e/visual.spec.js` captures 39 full-page screenshots (player pages at desktop and phone size; admin pages in light, dark and phone) from a throwaway database, with animations frozen. It runs only when `VISUAL_LABEL` is set:

```powershell
cd backend
$env:VISUAL_LABEL = "before"; .\.venv\Scripts\python.exe run_browser_tests.py e2e/visual.spec.js
# make the change, then capture "after" the same way, and compare (needs Pillow):
python ..\scripts\compare-visual.py before after
```

Two captures of unchanged code differ by at most 0.45% on pages with live data (player codes, times); everything else matches exactly. On 24 November the conversion above was compared with captures taken before it: all 39 pages matched within that noise.

When updating a page, move its relevant layout to utilities, verify variants and responsive states, and remove obsolete CSS only after checking all consumers. Keep state-dependent combinations as explicit class strings. Do not replace validated queue/auth/QR/NLP behavior as part of styling work.

## Verification and sources

Run `npm run build` and `npm test` from frontend. `backend/run_browser_tests.py` runs the real Edge/browser flows against disposable XAMPP data, including light/dark axe checks, player registration, QR decoding, recovery and 360 px containment. The recovery browser check verifies computed utility padding/margin to catch a disabled Tailwind plugin or incorrect layer order. Record only checks actually executed.

The integration follows Tailwind's official [Vite installation](https://tailwindcss.com/docs/installation/using-vite), [individual imports and prefix/reset guidance](https://tailwindcss.com/docs/preflight), [inline theme aliases](https://tailwindcss.com/docs/theme#referencing-other-variables), and [selector-controlled dark mode](https://tailwindcss.com/docs/dark-mode). Local CSS layering, token names, preserved reset and migration scope are project decisions.

Executed on 20 November 2026: production build passed; all 48 frontend tests and all 9 real Edge browser flows passed against disposable XAMPP data. Browser coverage included admin light/dark themes, Open Sans, axe accessibility checks, player registration/queue/results, QR camera/upload decoding and 360 px recovery containment. The initial shared muted note color failed player-canvas contrast; the dedicated note token corrected it and the full browser rerun passed. The recovery page's computed Tailwind padding/margin checks passed in both themes. npm installation reported zero known vulnerabilities across 212 audited dependencies. This styling change did not require a database migration or backend behavior change.
