# NowBey Design System — extracted from reference set (2026-10-17)

> **Superseded on 2026-10-18 by [NowBey Pulse](./PULSE.md).** This file stays as the provenance of the
> island palette — the record of where each hue was sampled from — and no longer as the contract.
> Where the two disagree, Pulse wins; the values below now arrive through `src/styles/pulse/compat.css`
> as aliases, so nothing that referenced them broke.

Source of truth: `1002177501.jpg` (hero), `1002177500.jpg` (Email alerts), `1002177499.jpg` (News wire),
`1002177491.jpg` (Report a hazard). Every value below was pixel-sampled from those files.

## 1. Color palette

### Surfaces (deep dark navy/teal family)
| Token | Hex | Where it was sampled |
|---|---|---|
| `--nb-bg` (global background) | `#05121a` | page field between grid texture lines (041119…07141c) |
| `--nb-bg-deep` (header/footer wells) | `#030c13` | top chrome, tab bar well |
| `--nb-surface-1` (card layer 1) | `#0c222d` | wire story card, report form card |
| `--nb-surface-2` (card layer 2 / rows) | `#112732` | alerts settings card interior |
| `--nb-stroke` (card border) | `#1d2f39` | 1px card outline on dark |
| `--nb-stroke-soft` (dividers) | `#172d38` | row dividers in settings card |

Background carries a faint dot/grid texture (~22px cell, 3–5% opacity) plus very soft mint/coral radial glows.

### Primary mint/cyan (buttons, links, accents)
| Token | Hex | Where |
|---|---|---|
| `--nb-mint` (primary) | `#43e0cb` | "Sign up", "Explore the map", "Continue →", hero accent words |
| `--nb-mint-deep` (toggle track) | `#3ab2a6` | ON toggle track |
| `--nb-mint-ink` (text on mint) | `#06242c` | label on mint buttons |

### Warm / alert accents
| Token | Hex | Where |
|---|---|---|
| `--nb-gold` | `#f6c75d` | amber dots, "COMING SOON"/"SAMPLE VIEW" pills, storm icon |
| `--nb-gold-soft` (parchment) | `#ded3b3` | text inside amber status pill |
| `--nb-gold-ink` | `#d6caa4` | "Storm warnings" title |
| `--nb-coral` | `#ff9d73` | coral map pin, example-report icon |
| `--nb-sky` | `#7dd3f0` | "FLOODING" category badge text |
| `--nb-sky-bg` / `--nb-sky-stroke` | `#123749` / `#193f52` | category badge fill / border |

### Text
| Token | Hex | Where |
|---|---|---|
| `--nb-cream` (headings) | `#f8f1e7` | hero heading, "Sign in", card titles |
| `--nb-text` (body strong) | `#dfe9e8` | row labels ("Flooding", "New Providence") |
| `--nb-muted` (supporting) | `#b5c9ca` | paragraph copy, nav links |
| `--nb-faint` (micro labels) | `#799297` | "YOUR ISLAND", "NATIVE APP DOWNLOADS" |

### Map (sample map inside mockups)
sea `#092330` · land `#2c4c49` · roads `#97aa94` · place labels `#879e8c` ·
pins coral `#ff9d73`, cyan `#6ed6fb`, amber `#f6c75d`, pin stroke `#fff8d4`.

## 2. Typography

- **Display / headings:** Sora 700–800, `-0.02em`, line-height ≤1.05 on hero, color `--nb-cream`.
- **Body:** Manrope 400–600, `--nb-muted`, line-height ~1.6.
- **Micro labels:** Manrope 700, uppercase, `0.14em` tracking, `--nb-faint`, 11–12px.
- **Hero scale:** `clamp(2.5rem, 11vw, 4.25rem)`. Screen titles 22–24px. Card titles 17–19px.

## 3. Component DNA

| Component | Spec |
|---|---|
| Pill button (primary) | height 48–52px, padding-x 26–30px, radius 999px, fill `--nb-mint`, text `--nb-mint-ink`, 700 |
| Pill button (outline) | same metrics, transparent fill, 1px `#243640` stroke, `--nb-cream` text |
| Header buttons | 40px high, padding-x 20px, same pill geometry ("Sign in" outline, "Sign up" mint) |
| Card | bg `--nb-surface-1`, 1px `--nb-stroke`, radius 20px, padding 20–24px |
| Nested/row layer | bg `--nb-surface-2`, dividers `--nb-stroke-soft` |
| Toggle ON | 52×30 pill, track `--nb-mint-deep`, **dark knob (#0b2b33) on the right** (inverting the usual pattern) |
| Toggle OFF | track `#374b54`, **light knob (#a2b4b4) on the left** |
| Status pill (gold) | radius 999px, 1px gold-tinted stroke, gold text, bold 10–11px uppercase, e.g. "SAMPLE VIEW", "COMING SOON" |
| Category badge | radius 10px, bg `#123749`, stroke `#193f52`, text `#7dd3f0`, bold 11px uppercase |
| Check row | mint ✓ in mint-outlined circle + `--nb-text` label |
| Stepper | 24px numbered circles; active = mint ring + mint label; inactive = faint |
| Inputs | bg `--nb-surface-2`, 1px stroke, radius 14px, 16px font (no iOS zoom), cream text |
| App container/phone | outer radius 40–44px, bezel `#0b1f2a`, screen bg `--nb-bg` |
| Section numbers ("03") | mint-outlined rounded square, mint numeral, paired with letterspaced uppercase title |
| Bottom tab bar | 5 tabs (Feed · Map · Report · Wire · Alerts), icon 22px over 11px label, active `--nb-mint`, inactive `--nb-faint` |

## 4. Layout philosophy

- Global page container is a single centered column (max ~1180px) on the deep navy field; no legacy 12-col grids.
- Ample whitespace: hero top padding ~48px mobile / ~96px desktop, section gaps 72–112px, card gaps 12–16px.
- All data containers (feeds, settings, forms, stories) use the layered card architecture with 20px radius +
  hairline stroke; headers inside cards are micro-label + title stacks.
- Interactive chrome (nav, buttons, toggles, pills) follows the pill geometry above, globally.

Implementation: `src/app/globals.css` (tokens + primitives), `src/ui/kit.tsx` (React primitives).
