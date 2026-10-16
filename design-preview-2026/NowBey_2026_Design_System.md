# NowBey 2026 — "Tideglass" Unified Design System
**v2026.10 · PREVIEW SPEC — nothing in `src/` or `expo/` has been modified.**
Drop-in candidates for this spec live in `design-preview-2026/` and only migrate after the phrase **"APPROVED: Execute full system migration."**

---

## 0 · Design philosophy (from 2026 research)

**"Calm signal for a living island."** NowBey is safety-critical infrastructure for The Bahamas, so the 2026
aesthetic is *calm, technical and honest* rather than decorative. Five research-grounded commitments:

1. **Dark-first tokens, light as a first-class twin.** ~82% of users enable dark mode where available, and
   OLED blacks plus calibrated contrast reduce strain during the long evening sessions a safety app lives in.
   Dark is the default token set; light re-points the same custom properties (zero component branching).
2. **Liquid Glass is a control-layer material — never a data surface.** Following Apple's HIG guidance,
   translucency appears on the top bar, floating chips, sheets, and the command palette. Numbers, pin cards,
   and tables stay on solid surfaces so severity is always legible (glass over busy map imagery fails
   contrast in sunlight).
3. **Bento modularity.** Hierarchy through tile size, not noise. The same 4→2→1 column grid drives the web
   rail and the mobile sheet.
4. **The command palette augments, never replaces.** ⌘K is a primary navigation mechanism in 2026
   productivity software, but hiding all navigation behind it strands new users. Visible nav (top bar, bottom
   tabs) stays; the palette accelerates.
5. **Motion with a job, thumb-first on mobile.** Animations communicate state (live, critical, confirmed)
   and collapse under `prefers-reduced-motion`. Primary actions live in the bottom 20% of the phone.

---

## 1 · Global design tokens

### 1.1 Surfaces — "abyss" (blue-shifted deep grays)

| Token | Hex (dark) | Hex (light) | Role |
|---|---|---|---|
| `abyss-975` | `#03080F` | `#EEF3F6` | App void, behind everything |
| `abyss-950` | `#050D16` | `#F4F7F9` | Screen base |
| `abyss-900` | `#081522` | `#FFFFFF` | Surface 1 — cards, rails, sheets |
| `abyss-850` | `#0B1D2E` | `#F7FAFB` | Nested tiles |
| `abyss-800` | `#0E2637` | `#EAF1F4` | Raised, glass fill |
| `abyss-700` | `#143349` | `#DDE8ED` | Hover, popovers |
| `abyss-600` | `#1B4560` | `#C3D3DA` | Strong hairlines, device bezel |

### 1.2 Accents & semantic

| Token | Hex | Role |
|---|---|---|
| `tide-500` | `#00C9B7` | Primary action, active state |
| `tide-400` | `#2EE6D0` | Glow / hover |
| `tide-300` | `#74F3E3` (light: `#00756A`) | Text on dark / links |
| `conch-500` | `#FF7A6B` | Secondary accent — alerts, community |
| `sun-500` | `#FFC531` | Caution — storm, power, official watches |
| `ok-500` | `#3ECF9A` | Confirmed, resolved, live |
| `danger-500` | `#F43F5E` | Critical severity, destructive |
| `info-500` | `#7DD3FC` | Neutral information |

### 1.3 Severity ramp (the safety language — product-critical)

`sev-1 #3ECF9A` minor · `sev-2 #FFD766` moderate · `sev-3 #FFA94D` elevated · `sev-4 #FF7A6B` high ·
`sev-5 #F43F5E` critical.
Severity is always triple-encoded: **color + glow + 5-segment meter** — never color alone (colorblind-safe).

### 1.4 Category colors — preserved taxonomy
The 13 live categories (`flood, storm, power, water, crime, road, marine, fire, health, trash, event,
notice, accident`) keep their existing hex values so map pins, admin tools and historical data stay
consistent. Exposed as `--color-cat-*` tokens.

### 1.5 Text
`ink-100 #EAF6F4` primary · `ink-200 #B9D4D2` secondary · `ink-300 #8FB9B6` muted · `ink-400 #6E97A0` subtle.
Light mode: `#0A1A24 / #33494F / #46606C / #647F8A`. Every text-on-surface pairing meets WCAG AA.

### 1.6 Radii · elevation · lines
- Radii: `xs 8 · sm 10 · md 14 · lg 20 · xl 28 · 2xl 36 · pill 999`.
- Elevation `l1–l4` calibrated for deep backgrounds (large, soft, downward-biased shadows).
- `glow-tide` / `glow-danger`: 1px accent ring + colored bloom — used only on primary/critical emphasis.
- Hairlines: 1px `color-mix(ink-400, 18–22%)`; glass adds an `inset 0 1px 0 rgba(255,255,255,.06)` highlight.

---

## 2 · Typography

| Role | Family | Weights | Notes |
|---|---|---|---|
| Display | **Sora** | 700/800 | Headlines, big numbers; tracking −0.02→−0.03em |
| Body | **Manrope** | 400–800 | UI text; already loaded via `next/font` |
| Numerics | **IBM Plex Mono** | 400–700 | Timestamps, coordinates, counts, pin codes; `font-variant-numeric: tabular-nums` |

Fluid scale (`clamp()`, no breakpoint jumps):
`2xs 10–11 · xs 11–12 · sm 13–14 · base 15–16 · lg 17–19 · xl 20–24 · 2xl 24–32 · 3xl 30–44`.

---

## 3 · Cross-platform components

Same names, same states, same motion — only the material recipe differs.

| Component | Web | Expo (RN) | States |
|---|---|---|---|
| Button primary | `.btn-primary` (tide fill + glow) | `PressPill accent` | rest / hover +8% / active scale .96 / disabled .45 / focus ring |
| Button ghost | `.btn-ghost` | `PressPill` | + border hairline |
| Chip / filter | `.chip`, `.chip.on` | pill + `abyss-850` | on = tide fill; category dot preserved |
| Card (data) | `.nb-surface` | `s.card` | solid only — never glass |
| Glass (control) | `.nb-glass` / `.nb-glass-strong` | `rgba(abyss-800,.62)` + blur layer | top bar, chips, sheets, palette |
| Severity meter | `.nb-sev[data-on]` | 5× View | triple-encoded |
| Pin badge | rounded-square, white border, category glow | same | cluster = ring + count |
| Bottom nav | — | 5 tabs, center raised CTA | active = tide glyph + tint pill |
| Command palette | `⌘K` overlay | (mobile: search bar → palette sheet) | ↑↓ / ↵ / esc |
| Toast | bottom-center glass pill | bottom pill above nav | auto-dismiss 2.6s |

### Motion tokens
`120ms` state changes · `200ms` moves · `320ms` sheets · spring `(0.34,1.56,0.64,1)` on press.
Catalog: live-dot pulse (feed alive), severity ring pulse (sev ≥ 4 only), aurora drift (background),
sheet rise, button sheen, ticker marquee (pause on hover). **All collapse under `prefers-reduced-motion`.**

---

## 4 · Accessibility baseline
- WCAG AA minimum on all text; AAA targeted for severity and official-watch copy.
- 44px web / 44–56dp RN minimum touch targets; bottom nav items ≥ 52dp.
- Visible `:focus-visible` rings on every custom control; keyboard-complete palette.
- `prefers-reduced-motion` honored globally; `prefers-reduced-transparency` falls back to solid glass.
- No dark patterns: confirmations, "soon" labels, empty states and alert gating stay honest (storm
  warnings are always sent — the redesign never hides that).

---

## 5 · Web ↔ mobile token sync
`nowbey-2026-tokens.css` (CSS custom properties) ↔ `expo/src/theme.ts` (RN style objects) share names,
hex values, severity ramp, radii and motion language. The category taxonomy and severity semantics are
shared through `src/lib/geo.ts` on web and `expo/src/geo.ts` on mobile (unchanged).

---

## 6 · Migration path (only after approval)
1. Merge `nowbey-2026-tokens.css` into `src/app/globals.css` (replace the `@theme` block; keep the
   Leaflet skin, re-point its colors to the new tokens).
2. Port `Map_2026_Web_Preview.tsx` into `src/app/map/page.tsx`, re-wiring the existing
   `MapPanel` / `/api/incidents` / `/api/news` data flow at the `PROD:` markers.
3. Mirror the tokens into `expo/src/theme.ts` and port `Map_2026_Mobile_Preview.tsx` into
   `expo/app/(tabs)/map.tsx`, restoring Reanimated gestures + expo-haptics at the `PROD:` markers.
4. Roll the shell (top bar, bottom nav, wire ticker) across remaining routes; keep the existing
   mobile-audit (`npm run audit:mobile`) and UI tests green.
