# design-preview-2026 — PREVIEW ARTIFACTS ONLY

> **UI 3** — shortlisted direction, saved 2026-10-16. This is the version to return to when you're
> ready. Migration has **not** started: the live architecture is untouched until you say
> **"APPROVED: Execute full system migration."**

**Nothing in `src/` or `expo/` has been modified, refactored or deleted.** Every file in this folder is
additive and disposable.

## What is here

| File | What it is |
|---|---|
| `NowBey_2026_Showcase.html` | **Open this first.** Self-contained interactive showcase of the whole system — tokens, components, bento dashboard, ⌘K palette demo, mobile mock. No build, works offline. |
| `NowBey_2026_Design_System.md` | The full spec: philosophy, tokens, type, components, motion, a11y, migration path. |
| `Theme_LightMode_Fix.css` | **Light-mode remediation** (v2026.10-b): rebuilt palette with per-token WCAG AAA contrast math — crisp cool off-whites, deep teal text tier, cool-tinted shadows. Load after the tokens file. |
| `Profile_2026_Strategy.md` | Light-mode audit + the "Island Record" social-profile strategy (every paradigm mapped to real product data). |
| `Profile_Social_Web_Preview.tsx` | The social-first member profile in fixed Light Mode: bento impact rail, trust panel, coverage fingerprint, activity timeline, achievement shelf, neighbour graph. |
| `Profile_Social_Mobile_Preview.tsx` | Synced Expo profile tab in Light Mode: collapsing cover, swipeable tabs, spring badge bottom sheet, thumb-zone actions. |
| `nowbey-2026-tokens.css` | Tailwind 4 `@theme` token set + materials (glass / aurora / severity) + light theme + motion tokens. Drop-in candidate for `src/app/globals.css`. |
| `Map_2026_Web_Preview.tsx` | High-fidelity preview of the redesigned **Safety Map workspace** (the web app's critical screen): glass command bar, bento island-pulse rail, glowing severity pins, ⌘K command palette, report sheet, live wire ticker. Mock data, no API calls. |
| `Map_2026_Mobile_Preview.tsx` | High-fidelity preview of the synced **Expo Map tab**: thumb-zone bottom nav, raised center action, bottom sheet with bento tiles, spring press feedback, pulsing severity rings. Core-RN only, so it reviews anywhere. |

## How to view

1. **Showcase (instant):** open `NowBey_2026_Showcase.html` in any browser (a static server works too —
   the live preview link serves it). Toggle 🌗 for light/dark; type in the palette to filter.
2. **Web preview:** drop `Map_2026_Web_Preview.tsx` + `nowbey-2026-tokens.css` into a scratch Next.js page
   (after `npm install`) — it renders against the token file with mock data.
3. **Mobile preview:** drop `Map_2026_Mobile_Preview.tsx` into the Expo app as a temporary route to view
   on a simulator or device.

## Naming

Files carry the `2026_` / `_2026_` marker and live outside the app trees so they can never be confused
with production code. Delete this folder to return to the status quo exactly.
