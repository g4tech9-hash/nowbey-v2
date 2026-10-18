# NowBey Pulse — the design system

**Status: shipped across the product.** Pulse is the presentation layer for every web route:
landing, feed, map, wire, report, saved, alerts, gas, open-now, life, profile/settings, login and
the whole admin desk. It replaces the 2026-10-17 "island" extraction
([`DESIGN_SYSTEM_REBUILD.md`](./DESIGN_SYSTEM_REBUILD.md), kept for provenance) and re-supplies the
measured values behind [`DESIGN_SYSTEM.md`](./DESIGN_SYSTEM.md).

The rule that decides everything else: **Pulse is a token system, not a stylesheet.** A component
never states a colour, a duration or a distance; it names a role. That is what makes the two themes
real instead of a filter over one theme, and what keeps a 50-route redesign reviewable.

---

## 1. The three layers

| Layer | File | Says | Never says |
| --- | --- | --- | --- |
| 1 — primitives | `src/styles/pulse/tokens.css` (§1) | Nine hue ramps, an integer spacing ladder, shapes, easings, durations, elevations, fluid type | Any meaning. `--pulse-hue-teal-400` is not "the accent". |
| 2 — semantics | same file, `:root` + `:root[data-theme="dark"]` / `[light]` | `--bg-*`, `--text-*`, `--border-*`, `--accent*`, `--danger/success/warning`, `--cat-*`, `--sev-*`, `--focus-*` | A px value that could be a role. |
| 3 — components | same file, §4 + `src/styles/pulse/components.css` | `--card-*`, `--chip-*`, `--btn-*`, `--input-*`, `--nav-*`, `--skeleton-*` | A literal colour. Layer 3 only re-points Layer 2. |

Load order in `src/app/globals.css` is a contract, and the file comments say so:
`@import "tailwindcss"` → tokens → base → components → compat → **the `@theme` bridge** → app-domain
CSS (Leaflet skin, map pins, splash, legacy looks).

Two traps that cost an afternoon each, recorded so nobody pays again:

* `@theme` **must** live in `src/app/globals.css`. In an `@import`ed file it is copied verbatim and
  never processed: the build still exits 0 and every `bg-*/text-*` utility silently disappears.
* A CSS block comment must not contain the `*/` sequence in prose. `/* the --bg-*/--text-* pair */`
  closes the comment early and produces three unrelated-looking optimizer warnings.

### The `@theme` bridge

```
--color-bg-base: var(--bg-base);   /* → bg-bg-base, text-bg-base, border-bg-base … */
--color-accent:  var(--accent);     /* → bg-accent, text-accent, accent-accent …    */
--color-cat-*:   var(--cat-*);
--color-sev-*:   var(--sev-*);
```

Utilities generated from these resolve through the semantic layer at paint time, so a Tailwind class
on any page is theme-correct without that page knowing about Pulse. This is how the long tail of
pages was swept: their markup keeps its utility classes and inherits the new system.

---

## 2. Two themes, not one theme and its inversion

`data-theme="dark"` is a true-black canvas (`#000000`, OLED-native) with teal and coral **glow**:
edges are lit, elevation is a halo (`--pulse-glow-teal`, `--pulse-glow-coral`).
`data-theme="light"` is warm sand (`#f7f3ec`) with white paper cards and **ink**: elevation is a soft
warm shadow and glow is off. The categories are re-hued per theme rather than lightened — a signal
that reads on black has to be re-authored for paper, so light mode ships its own `--cat-*` set
(`#0a5f8c` for flooding where dark uses `teal-300`) and its own `--sev-*` set.

Both themes are authored against measured contrast, and the claim is checked by a script rather than
by prose — see §9.

**Plumbing.** `src/lib/pulse/prefs.ts` owns `nb_theme` (`dark|light`), `nb_look`, `nb_motion`,
`nb_textsize`, `nb_contrast`, `nb_livemode`, `nb_livedata`; `pulseBootScript()` runs inline in
`<head>` (nonce'd, before paint) to apply all of it and to keep reading the legacy `nb_mode` key so
old bookmarks and the admin appearance setting still work. Every setter updates
`document.documentElement.dataset` **and** `meta[name="theme-color"]` (both media variants), and emits
`PULSE_THEME_EVENT` so components can react without polling. Layer 1 also carries a hard fallback
block: if the token sheet is somehow missing (partial deploy, an ancient CDN entry, no `color-mix`),
the page is still legible dark-on-black rather than unstyled.

**Compatibility.** The island/classic look moved to `data-look`; `html[data-theme="island"]` CSS and
the `theme` field on the admin appearance API are unchanged, aliased through
`src/styles/pulse/compat.css` (`--nb-*` aliases, `.nb-input`, `.nb-card-gold*`, `.marquee-track`,
`.grain`). `src/app/landing.module.css` reads Pulse tokens through its own custom-property surface, so
the landing copy and SEO markup stayed byte-identical while the stylesheet was rewritten.

---

## 3. Typography

Self-hosted from `@fontsource`, subset to latin, in `src/app/fonts/` (Google Fonts is not reachable
from CI, and a third-party font request has no business being on the critical path of an emergency
feed): **Bricolage Grotesque** for display, **Inter** for text, **JetBrains Mono** for anything numeric
— counts, timestamps, coordinates, pin codes — always with `font-variant-numeric: tabular-nums`.
Fluid sizes are Layer 1 (`--pulse-text-*` via `clamp()`); components may not use `text-[Npx]` below
11.5px, and dense chrome goes through `.pulse-tight` rather than an ad-hoc size.

---

## 4. Motion

The spec's spring (`stiffness 140, damping 22`) is expressed as a curve, not a library:

```
--pulse-ease-spring: cubic-bezier(0.34, 1.56, 0.64, 1);
--pulse-duration-tap: 120ms;      /* press release, toggles            */
--pulse-duration-state: 200ms;    /* hover, colour, small reveals       */
--pulse-duration-enter: 340ms;    /* cards, drawers, the pill indicator */
--pulse-duration-sweep: 560ms;    /* travelling highlights              */
--pulse-shimmer-period: 1.4s;     /* skeleton loop                      */
```

Press scale 0.92, hover lift 1.03/translateY(-3px) — hover is gated behind
`@media (hover: hover) and (prefers-reduced-motion: no-preference)` so a touch device never inherits a
hover state it cannot leave. The ConfirmButton burst is six spans on one keyframe, never a canvas or
a library. Under `[data-motion="reduced"]` (or the OS preference) durations collapse to a fade, the
burst goes silent, and the shimmer stops moving — nothing removes information, only travel.
`SPRING`, `DUR`, `EASE` and `entranceStyle()` live in `src/lib/pulse/motion.ts`, which is also where
`usePillIndicator`, `useListNav`, `useSwipe`, `useHotkeys`, `useAnnouncer`, `useQueryState` and
`buildQuery` come from — the animation and the interaction model are one module because they are one
decision. Cost: **0 KB of JS, 0 KB of extra CSS.**

---

## 5. Components

`src/ui/pulse/` (17 modules, one barrel, `@/ui/pulse`) — every page consumes from this list; nothing
in it knows about the database, and every one of them is token-driven.

| Component | Contract worth knowing |
| --- | --- |
| `CatBadge` / `CatSwatch` / `MetaChip` | Hue arrives as a **token reference** from `pulseCategoryMeta(key).token`, never a hex. |
| `FreshnessPill` / `LiveDot` | Levels `live \| recent \| aging \| stale`; the dot pulses only on `live`. |
| `SeverityTag` / `SeverityMeter` | Five stops, `--sev-*`, and the meter is a `role="img"` with a text alternative. |
| `TrustMeter` / `TrustCard` / `AccuracyCard` | Tier from the shared `computeSourceTrust` so a card, a drawer and the admin desk never disagree. |
| `ConfirmButton` | Optimistic; rolls back when the toggle resolves falsy; bursts on confirm only; announces politely. |
| `AvatarStack` | Deterministic initials + hue from `seedHash`, so an absent photo still reads as a person. |
| `CardLayered` (+`Header`/`ActionBar`) | The only card in the app: `--card-bg`, edge glow, optional category spine. No inner padding — the child owns it. |
| `Skeleton` family | `line｜title｜pill｜block｜avatar`; 1.4s shimmer; respects reduced motion. |
| `AriaAnnouncer` | One `aria-live="polite"` region per route, fed by `useAnnouncer()`. |
| `ErrorBoundary` | Reports to `/api/errors` through the existing pipeline, renders a Pulse `ErrorState`. |
| `Pressable` / `Lift` | The 0.92 / 1.03 pair as primitives, so a bespoke control still feels like the system. |
| `Ticker` | `role="region"` + label, measured duration, pauses on hover/focus and when the tab hides. |
| `CommandPalette` | ⌘K / Ctrl-K everywhere, `#` to search, `?` for the shortcut sheet; routes through existing pages, invents no API. |
| `FilterPillRow` / `PillRow` | The morphing pill: one measured indicator element, not fourteen backgrounds. |
| `Drawer` | Focus trap, `Esc`, restore-focus-to-trigger, `?open=` deep link, sticky action bar. |
| `EmptyState` / `ErrorState` / `EndOfStream` | The three states a stream can end in. `EndOfStream` is honest — "no more" is not a page of spinners. |

---

## 6. Responsive contract

| Width | Layout |
| --- | --- |
| `< 640px` | One column. Bottom nav (5 icons) with a raised centre Report FAB, bottom sheets for filters and for the detail view. 44×44 minimum targets, enforced by CSS so a page cannot opt out. |
| `640–1024px` | Two columns: stream + inspector **below** it. Pills live in the top bar. |
| `≥ 1024px` | Three columns: sticky left nav rail (224px), stream (max 680px), right inspector rail (340px), all under a 1440px page max. |

Safe-area insets are applied only where an element touches a viewport edge (`.pulse-topbar`
`padding-top`, `.pulse-bottom-nav` / `.pulse-fab` `padding-bottom`, sheet headers) — never as a global
body padding, which is how "the page has a mystery margin" bugs start. Scroll owners use
`.pulse-scroll` (custom, thin, momentum) or `.pulse-no-scrollbar`; `overscroll-behavior: contain`
stops a rail from dragging the page behind it. z-order is a single ladder: map 0 · map chrome 500 ·
street view 600 · header 650 · new-signal pill 620 · island 640 · bottom nav 700 · FAB 720 ·
scrim 900 · drawer 950 · palette 1000.

---

## 7. State, URLs and accessibility

* **URL is the source of truth for view state**: `view`, `category`, `island` (legacy `parish` still
  accepted, then deleted), `q`, `hours`, `sort`, `status`, `open`. Filters `replaceState`, navigation
  `pushState`, both through `buildQuery` so a shared link reopens the same screen.
* **Keyboard**: `↑/↓` move the stream, `Enter` opens, `←/→` page the drawer, `Esc` closes and cleans
  the deep link, `⌘K` palette, `#` search, `?` help. The list carries an `sr-only` description so the
  hints are discoverable, not folklore.
* **Touch**: swipe right = confirm ("still there"), swipe left = "I saw it too" — the two actions that
  need no dialog. The hint opacity tracks drag distance; releasing short of threshold springs back.
* **Live mode** polls at 25s. New signals merge at the top only when the reader is at the top
  (`scrollY < 90`); otherwise they wait behind a sticky "N new signals" pill, and the announcer says
  it. Nothing moves under a reader's thumb.
* **Screen readers** get an announcement for confirm, saw-it-too, live-mode on/off, new signals,
  publish and duplicate-report detection. Focus is trapped in the drawer and returned to its trigger.
* **Motion, contrast, text size and low-data** are user settings in `→ Settings → Appearance`
  (`data-motion`, `data-contrast`, `data-textsize`, `data-low-data`), persisted before paint.

---

## 8. Performance

No animation library, no icon font, no third-party font request, no client-side data layer added. The
entire compiled stylesheet for the whole app is **172,714 B raw / 29,304 B gzipped**, including
Tailwind's utilities for ~50 routes — inside the 40 KB gzip budget with the design system in it, and
the redesign itself is a token sheet plus hand-written component CSS rather than another runtime.
Three woff2 subsets (Bricolage 41 KB, Inter 48 KB, JetBrains Mono 40 KB) are preloaded and immutable.
CLS is protected by reserved rails (`.pulse-stream-col`, sticky rails with `max-height: calc(100dvh …)`)
and by merging-at-top only at the top of the stream.

---

## 9. Verification

```bash
npm run typecheck            # tsc --noEmit — clean
npm run build                # rm -rf .next first for CSS warnings; zero warnings
npm test                     # 129 tests, 129 pass (includes the Pulse layout + contrast contracts)
npm run audit:mobile         # 320/360/390/412px: targets, overflow, safe-area, nav collisions
npm run audit:contrast       # both themes, computed from tokens.css
```

Headline contrast, measured — not asserted — by `scripts/contrast-audit.mjs`:

| Pair | dark | light | floor |
| --- | --- | --- | --- |
| body text on page | 18.58:1 | 14.50:1 | 4.5 |
| body text on card | 16.82:1 | 16.04:1 | 4.5 |
| secondary text on card | 11.02:1 | 8.56:1 | 4.5 |
| tertiary text on page | 8.25:1 | 5.21:1 | 4.5 |
| label on accent button | 9.34:1 | 6.05:1 | 4.5 |
| danger / success / warning on card | 7.69 / 13.15 / 12.79 | 6.27 / 6.48 / 5.87 | 4.5 |
| chip label on chip | 13.89:1 | 13.06:1 | 4.5 |
| accent graphic on card | 10.49:1 | 6.05:1 | 3.0 |
| category hue as dot or label (13 signals) | 5.8–12.1 | 3.4–8.7 | 3.0 |
| severity stops (all 5) | 5.8–13.2 | 5.0–9.1 | 3.0 |

Full 148-line table (136 pairs) (both themes, every pair, with each token named):
[`audit/2026-10-18_pulse/CONTRAST.md`](../audit/2026-10-18_pulse/CONTRAST.md). Mobile audit output for
this build: [`audit/2026-10-18_pulse/MOBILE_AUDIT.md`](../audit/2026-10-18_pulse/MOBILE_AUDIT.md) — 16
routes × 4 viewports, **0 findings**.

The audit found and fixed three things a table in a doc would have hidden: `--focus-ring` at 38% alpha
(2.3:1), `--input-border` inheriting a decorative hairline (1.4:1), and a focus glow pinned to a
dark-only hue that failed on paper. All three are now token-driven and pass in both themes.

---

## 10. Deliberate exceptions

* **`bg-white/[.03…08]` overlay tints** on map and media chrome: white at 3–8% over an image is a
  scrim, not a palette entry; both themes want the same one.
* **Illustration strokes** in `src/ui/kit.tsx` (the satellite artwork) and the ambient grid: literal,
  because they are artwork — the file that draws a picture may contain a colour.
* **`z-index` numbers and `env(safe-area-inset-*)`**: geometry of the viewport, not design decisions.
* **The `expo/` React Native app** keeps its own `theme.ts`. It is a separate surface with a separate
  build; the tokens were not silently retuned to match, and the APK preflight test still guards it.
* **Landing copy, meta tags, form actions, API routes, request/response shapes**: untouched, by design.
  `git diff` on `src/app/api/**` should stay empty.
