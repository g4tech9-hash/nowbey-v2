You are working in the NowBey repo (Next.js 16 app + a `marketing/` asset pipeline). Add the **core brand presence set** — profile photo and cover photos — to `marketing/`.

Read `docs/DESIGN_SYSTEM.md`, `src/styles/pulse/tokens.css`, `src/lib/brand.ts` and `marketing/scripts/postkit.mjs` before writing anything. Use the existing helpers (`svgDoc`, `render`, `mark`, `wordmark`, `text`, `rr`, `circle`, `bg`, `ticks`, `sub`, `cta`, `mapView`, `T`) — do not invent a second renderer.

## What to produce

One script, `marketing/scripts/build-brand.mjs`, run with `node scripts/build-brand.mjs`, writing five PNGs to `marketing/out/brand/`:

| File | Size | Purpose |
|---|---|---|
| `pfp-1080.png` | 1080×1080 | profile photo, safe inside a circle crop |
| `pfp-dark-1080.png` | 1080×1080 | alternate emblem for light feeds / print |
| `cover-1920x1080.png` | 1920×1080 | Facebook / LinkedIn page header |
| `cover-1500x500.png` | 1500×500 | X / LinkedIn banner |
| `preview.png` | proof sheet | the above at real display size |

**Do not build the `N`-monogram avatar or the photographic "gateway" banner.** That is a separate identity set. This task is the emblem set only: a filled pin over a wave on a teal disc, plus a promise-led cover with a map on the right.

## 1 · Profile photo

Full-bleed frame on `T.bgBase` `#0c151d`, with a centred disc of radius `size * 0.435` (the margin is deliberate — a tight circular crop must still ring the mark).

The glyph is the app mark rebuilt as **solid geometry** on the same 40-unit grid as `mark()`, scaled by `(r * 1.46) / 40` and translated to the disc centre. The app's version is stroked at 2px, and at 32px that outline dissolves — so fill everything:

- **Pin** — filled, and shorter than the app's version so the tip clears the wave instead of merging into it at small sizes:
  `M20 7.2c-4.3 0-7.8 3.4-7.8 7.6 0 5.5 7.8 12.6 7.8 12.6s7.8-7.1 7.8-12.6c0-4.2-3.5-7.6-7.8-7.6Z`
- **Knockout core** — `circle(20, 14.8, 3)` in the disc colour, so the mark still reads as a located point.
- **Wave** — `M7 33.4c3.7-3.5 6.4 2.3 10.2 0 3.8-2.3 5.7 2.7 9.8 0`, stroke 2.5, round caps, `opacity 0.88`.

Disc gradient, radial at `cx 0.34 cy 0.24 r 0.9`: `#62e4d2` → `#3fd6c0` at 0.62 → `#2bb9a6`. Over it a sheen radial (`#ffffff` 0.22 → 0) at `cx 0.3 cy 0.22 r 0.6`, and a hairline ring just inside the edge at ~1% of size, `rgba(4,33,29,0.10)`, width `size * 0.006`.

`pfp-dark-1080.png` is the same construction on `T.bgRaised` with a `#22323f → #141f2a` disc, the glyph in `T.accent`, a `T.warning` core and a `rgba(63,214,192,0.16)` ring.

No text in either avatar.

## 2 · Cover, 1920×1080

Two columns. Left: brand lockup, promise, one action. Right: the live map as hero proof. Background from `bg(W, H, { hue: "a" })`, plus two local lights — a warm sunrise low right (`#ffb37a` 0.30 → 0, ellipse at `0.83W, 1.02H`, r `0.34W × 0.42H`) and teal sea above it (`#35d6e6` 0.16 → 0, ellipse at `0.62W, 0.06H`), then `ticks(W, H, 38, 28)` for the technical grid.

With `pad = 120`:

- Lockup at `(120, 132)`: `mark(0, -46, 58, { tile: "rgba(12,21,29,0.55)" })` + `wordmark(78, 0, 34)`.
- Eyebrow at y 214: accent dot + `"COMMUNITY SAFETY MAP · THE BAHAMAS"`, mono 700, 16px, `tracking 0.16`, `T.textSecondary`.
- Headline at y 262, **two explicit lines** — the break is a design decision, not something to auto-wrap: `"Know before"` in `T.textPrimary` and `"you go."` in `T.accent`, display 800, **88px**, `line-height 1.02`, `tracking -0.035`. Draw them at `(0,0)` and `(0, lh)` inside `<g transform="translate(pad, headY + headSize*0.79)">` — these draw functions are already in their own coordinate space and will double-offset if you pass real x,y.
- Sub at `headY + headHeight + 20`, wrapped at `0.34W`, 24px: "Neighbour reports, roadside hazards and local news on one clear map. Free to look — no account needed." In `T.textTertiary`.
- CTA 34px below the sub: the `cta()` pill reading `nowbey.com`.
- Coverage line **under the CTA**, never in the corner: accent dot + `"Live for New Providence. Other islands soon."`, 19px, `T.textSecondary`.
- Map panel right: `mapX = 0.526W`, `mapY = 0.14H`, `mapW = 0.412W`, `mapH = 0.74H`, on a `rgba(10,20,28,0.78)` rounded panel with `rgba(148,206,202,0.20)` stroke. `mapView(..., { zoom: 1.06, pinScale: 1.65, labelSize: 12 })`.
- `"LIVE MAP"` pill inside the panel's top-left, with a `T.danger` dot. This is the only place that phrase may appear.
- One confirmation card overlapping the panel's lower-left edge: `"A neighbour confirmed"` + `"Bay Street flooding · 4 confirmations · just now"`.

**The bottom-left corner must stay empty** — Facebook and LinkedIn drop the page avatar there. Nothing may sit below the coverage line inside the left third.

## 3 · Cover, 1500×500

Recompose rather than scale: `pad = 64`, map at `0.53W / 0.075H / 0.41W / 0.85H`, headline 50px, sub 19px wrapped at `0.32W` ("Neighbour reports on one clear map."), CTA pill 48px tall. At 3:1 there is no room for the coverage line, the confirmation card or a second text column — drop them.

## 4 · Preview sheet

One canvas, `#07141b` ground, all type in static Inter/JBMono. Row 1: the 16:9 cover drawn at 760px wide with a circle-clipped avatar rendered over its bottom-left corner at roughly the real Facebook proportion — this is the only honest test that the corner is clear. Row 1 also carries the 3:1 cover at 470px. Row 2: the avatar circle-clipped at 112, 72, 48 and 32px. Row 3: rounded-square crops at 132, 96, 64px, for app-store / X. Grid-align every row; label each size.

## Constraints

- **Rendering:** resvg via `render()` for vector, `@napi-rs/canvas` for the preview sheet. There is no headless browser and no working SVG delegate for ImageMagick.
- **Fonts:** resvg ignores `font-weight` on variable fonts, so register and reference static families — `Inter400`/`Inter700`, `JBMono700`, and the display face at its weight suffix. In canvas, register with `GlobalFonts.registerFromPath` **before** setting `ctx.font`, and include the weight in the family name or Arabic/CJK fallback glyphs appear.
- British spelling throughout. Palette from tokens: accent `#3fd6c0`, on-accent `#04211d`, surfaces `#0c151d` / `#152230` / `#1c2b39`, text `#f3f1ea` / `#b9c8c9` / `#9aafb3`, danger `#ff7f6b`, warning `#f8cf6b`.
- No photographic people, no screenshots, no stock imagery in this set — it must be pure vector so it stays crisp at 32px.

## Then

1. Add `"build:brand": "node scripts/build-brand.mjs"` to `marketing/package.json`.
2. Add a "Brand presence · profile photo + cover" section to `marketing/index.html` with a card per asset plus a `Brand` download button, and add a Brand section to `scripts/kit-index.mjs`; run `node scripts/kit-index.mjs`.
3. Rebuild `marketing/downloads/nowbey-05-brand.zip` (python `zipfile`, no `zip` binary available) and refresh the size label in `index.html`.
4. Verify: `node scripts/serve.mjs` then `curl -o /dev/null -w "%{http_code}"` on `/`, `/out/brand/pfp-1080.png`, `/out/brand/cover-1920x1080.png`, `/out/brand/preview.png` and `/downloads/nowbey-05-brand.zip` — all must be 200.

**Acceptance:** the emblem is still legible as a pin-over-wave at 32px; the 16:9 cover's bottom-left corner is empty below the coverage line; both avatars survive a hard circle crop without clipping the glyph; the pair shares one palette and one rendering of the mark.
