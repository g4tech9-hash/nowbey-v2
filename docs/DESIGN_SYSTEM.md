# NowBey Design System — extracted from the landing page

**Source of truth:** `src/app/page.tsx` + `src/app/landing.module.css` (the new landing page).
Everything below is measured from that code, not invented. The application UI is rebuilt on these
tokens and component DNA so the product feels like one continuous experience from the first
marketing scroll into the map, feed and settings.

---

## 1. Typography

| Role | Family | Weight | Tracking | Notes |
| --- | --- | --- | --- | --- |
| Display / headings | **Sora** (`--font-sora`) | 750–800 | **-0.055em … -0.075em** | Wordmark 19px/800/-0.055em; hero `clamp(3.45rem, 6.8vw, 6.2rem)`/750/-0.075em/lh 0.99; section h2 `clamp(2.6rem, 5.2vw, 4.45rem)`; feature h3 `clamp(2.25rem, 3.9vw, 3.35rem)`/730/-0.065em |
| Body | **Manrope** (`--font-manrope`) | 400–800 | ~0 | Hero lede `clamp(15px, 1.35vw, 17px)` lh 1.75; section copy 15px lh 1.75; bullets 12.5px/650 lh 1.55 |
| Eyebrow / label | Manrope | **800** | **0.17em** (0.13–0.14em for secondary) | **11px**, uppercase, tide-colored, lh 1.5 |
| Nav links | Manrope | **700** | 0 | 13px; hover → tide, 180ms |
| Buttons | Manrope | **800–850** | 0 | 12–13px labels |
| Micro-labels / meta | Manrope | 700–850 | 0.04–0.12em | ≥ 12px in app surfaces (phone readability floor) |

Emphasis inside headlines: `<em>` with `color: var(--tide)`, `font-style: normal`.

## 2. Color palette (exact landing values)

### Surfaces
| Token | Value | Use |
| --- | --- | --- |
| `--bg` | **#07131c** | Page background (blue-shifted deep navy) |
| `--bg-soft` | **#0a1b26** | Soft sections, proof strip (75% over bg) |
| `--panel` | **#0d202c** | Cards, panels |
| `--panel-raised` | **#122b37** | Raised cards (gradient origin) |
| card gradient | `linear-gradient(135deg, rgba(17,42,53,.97), rgba(8,26,36,.97))` | Every content card |
| nav material | `rgba(5,16,24,.84)` + `blur(18px) saturate(130%)` | Sticky header |
| float material | `rgba(10,30,40,.88)` + `blur(16px)` | Floating chips / overlays |

### Lines & text
| Token | Value | Use |
| --- | --- | --- |
| `--line` | **rgba(170, 222, 218, 0.14)** | All borders (cards 0.14–0.2, nav 0.12) |
| `--text` | **#f7f1e7** | Primary text (warm cream, never pure white) |
| `--muted` | **#9cb5b8** | Secondary text |
| `--quiet` | **#718d95** | Tertiary / meta text |
| bullet text | #c8d7d4 | Strong body copy |

### Brand accents
| Token | Value | Use |
| --- | --- | --- |
| `--tide` | **#43e0cc** | Primary accent: CTAs, eyebrows, links, active states |
| `--tide-hover` | **#6be9d9 / #72f2df** | Primary hover |
| `--tide-text-hover` | **#9bfff0** | Link hover |
| `--coral` | **#ff8877** | Secondary accent (pins, warm CTA) |
| `--gold` | **#f5c75d** | Caution / “soon” / focus ring / launch notes |

Button ink on tide fills: **#04202a – #062a30** (deep teal-black, never pure black).

## 3. Spacing & sizing

- Container: `width: min(calc(100% - 64px), 1240px)` (nav 1320px), `margin-inline: auto`.
- Section rhythm: hero padding `66px 0 82px`; feature rows `74px 0`; section gaps 52px to intro.
- Card padding: float cards 11–14px, content cards 13–14px (app: 14–16px), hero copy blocks 21–27px.
- Grid gaps: hero `clamp(36px, 5.7vw, 84px)`; feature `clamp(38px, 7.2vw, 96px)`; card grids 9–12px.
- App chrome: header min-height **76px**; nav gap 32px; mobile tab bar height 54px, targets ≥ 48px.

## 4. Component DNA

### Buttons (all pills)
- **Primary:** min-height 52px, padding 0 21px, radius **999px**, bg `--tide`, ink `#04202a`,
  weight 850, shadow `0 12px 36px rgba(30,217,195,.2)`. Hover: `translateY(-2px)`, bg `#72f2df`,
  deeper glow. Transition **180ms ease** (transform/background/shadow).
- **Secondary:** min-height 50px, padding 0 19px, radius 999px, border `rgba(207,235,231,.2)`,
  bg `rgba(255,255,255,.035)`, weight 750. Hover: border `rgba(207,235,231,.45)`, bg `rgba(255,255,255,.075)`.
- **Nav CTA / small:** min-height 42px, radius 999px, 12–12.5px/800. Sign-up style = tide fill +
  `0 8px 22px rgba(67,224,204,.16)`. Sign-in style = line border `rgba(185,226,220,.2)`.
- **Text link:** tide, 12px/850, gap 10px that widens to 14px on hover (`gap 180ms`), color → `#9bfff0`.
- **Focus:** `outline: 2px solid var(--gold); outline-offset: 3px` (landing buttons).

### Cards
- Border `1px solid rgba(189,223,217,.14)`, radius **16–20px**, background card gradient,
  shadow `0 10px 22px rgba(0,0,0,.14)`. Floating overlay cards: radius 15px,
  `rgba(10,30,40,.88)` + blur(16px), shadow `0 14px 38px rgba(0,0,0,.3)`.
- Hover (interactive cards): border toward tide, `translateY(-1px..-2px)`, 180ms ease.

### Inputs
- Same panel material family; 1px line border; radius 10–12px; 16px field text on phones
  (iOS zoom guard); focus border → tide with soft glow.

### Chips / badges
- Radius 999px (or 5px for micro “SOON” tags); 1px line or tinted fill;
  category chips use the category color at 8–26% alpha with matching text.

### Eyebrows & section intros
- Eyebrow row: 11px/800/0.17em uppercase `--tide`, optional 7px pulsing dot with
  `0 0 0 4px rgba(67,224,204,.12), 0 0 18px rgba(67,224,204,.7)` glow.
- Section intro: centered, max-width 760px, h2 + muted 15px/1.75 supporting copy.

### Radii scale
`8 / 10 / 14 / 16 / 20 / 28 / 36 / 999px` — cards 16–20, feature frames 36, controls pill.

### Shadows
- L1 `0 1px 2px rgba(2,8,16,.4)` · L2 `0 8px 24px -8px rgba(2,8,16,.55)` ·
  L3 `0 18px 48px -12px rgba(2,8,16,.65)` · L4 `0 32px 80px -16px rgba(2,8,16,.75)`
- Glow tide `0 0 0 1px rgba(0,201,183,.35), 0 8px 32px -8px rgba(0,201,183,.45)` ·
  Glow danger `0 0 0 1px rgba(244,63,94,.4), 0 8px 32px -8px rgba(244,63,94,.4)`

### Motion
- Default transition: **180ms ease** (color, background, border, transform, box-shadow).
- Entrances: `heroRise 760ms`, `visualReveal 950ms` on
  `cubic-bezier(0.2, 0.75, 0.2, 1)`; micro-entrances `0.32s cubic-bezier(0.34,1.56,0.64,1)`.
- Ambient: phone float 7s, card bob 6s, dot pulse 2.4s — all disabled under
  `prefers-reduced-motion: reduce`.
- Interaction affordance: `translateY(-1px/-2px)` lift on hover, `scale(0.97)` press on mobile bars.

## 5. Layout grammar (app surfaces)

1. **Sticky glass header** (76px) — brand left, primary links center, actions right as pills.
2. **Asymmetric content grids** — `minmax(0, 1.05fr) …` two-column heroes, feed + 320px side rail.
3. **Pill-heavy controls** — status filters, island jumpers and categories are chip rails.
4. **One loud action per view** — the tide primary button (“Drop a pin”, “Report a spot”).
5. **Warm, honest copy tone** — short sentences, no jargon, warnings in gold, danger in coral.
6. **Mobile-first** — single column under `lg`, fixed bottom tab bar with 48px targets,
   safe-area padding, 16px field text, everything tappable ≥ 40px.

## 6. Token mapping into the app theme (`src/app/globals.css`)

| Landing var | Theme var |
| --- | --- |
| `--bg` | `--color-abyss-950` |
| `--bg-soft` | `--color-abyss-900` |
| `--panel` | `--color-abyss-850` |
| `--panel-raised` | `--color-abyss-800` |
| `--text` | `--color-sand-100` / `--color-ink-100` |
| `--muted` | `--color-ink-300` |
| `--quiet` | `--color-ink-400` |
| `--tide` | `--color-tide-500` |
| `--coral` | `--color-conch-500` |
| `--gold` | `--color-sun-500` |
| `--line` | `--hairline` / `.hairline` |

Base UI components (`src/components/ui/`) implement this spec: `Button`, `Panel`, `Field`,
`Chip`, `StatTile`, `Modal`, `PageIntro`, `EmptyState`. Pages compose those primitives with
new grids — no legacy layout containers are reused.
