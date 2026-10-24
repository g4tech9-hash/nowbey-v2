# marketing/ — the NowBey social asset generator

A small build system that turns the product's own design tokens into social assets. It exists so the
launch kit can be regenerated (or re-skinned) without opening Figma, and so no asset can drift from
the interface it is advertising.

```
src/          photographic base plates (phone screens are composited into them)
scripts/      the generator
out/          the deliverables — posts, stories, reels, contact sheet
fonts/static/ the product's three typefaces, instanced per weight
```

## Build

```bash
cd marketing
npm install
npm run build          # out/posts + out/stories   (~30s)
npm run build:video    # out/video/*.mp4           (~2 min, needs ffmpeg — see below)
npm run sheet          # out/CONTACT_SHEET.png
npm run gallery        # browse everything at http://localhost:4173
npm run publish -- --help   # post to IG/FB via Graph API (needs META_TOKEN)
```

`npm run gallery` serves this folder with Range support, so the reels scrub properly in the browser.
`index.html` is the gallery page itself; `POSTING.md` is the publish checklist.

### ffmpeg

The video step needs an ffmpeg binary. It looks, in order, at: `$FFMPEG`, `node_modules/ffmpeg-static`,
the `imageio-ffmpeg` Python package, then `ffmpeg` on `PATH`. If none exists the build fails loudly
instead of writing an empty file. On this repo's sandbox (no system ffmpeg):

```bash
python3 -m venv /tmp/venv && /tmp/venv/bin/pip install imageio-ffmpeg
FFMPEG=/tmp/venv/lib/python3.11/site-packages/imageio_ffmpeg/binaries/ffmpeg-linux-x86_64-* npm run build:video
```

## Why `out/` is not in git

The repo already ignores `out/`, and the whole kit is reproducible from tokens
in about a minute, so the rendered PNGs and MP4s are build output, not source:
`npm run build && npm run build:video && npm run sheet` regenerates every asset
byte-for-byte. Share the folder (or the gallery URL) rather than committing it.

## How it works

1. **`tokens.mjs`** mirrors `src/styles/pulse/tokens.css` — the Layer 2 dark theme, the category hues,
   the radii, the type families. This is the only place colour lives.
2. **`ui.mjs`** re-implements the Pulse component vocabulary as SVG: the app header, status bar, tab
   bar, chips, category badges, cards with a category spine, toggles, pins, and the map itself.
3. **`scenes.mjs`** composes those into the six product screens (map, feed, report, alerts, wire,
   success) plus the desktop web app — laid out in the app's own 390pt/mobile order.
4. **`composite.mjs`** perspective-maps a rendered screen into the phone glass in a photograph:
   four measured corners, anti-aliased rounded mask, glass sheen, emissive lift, and a 3× render
   scale so the UI stays sharp inside a small screen.
5. **`layouts.mjs` / `postkit.mjs`** place the type: measured blocks, real line-break decisions, no
   baseline hand-tuning. Three templates — split, poster, device-on-the-room.
6. **`build-posts.mjs` / `build-stories.mjs`** are the asset list: one entry per post, with its copy.
7. **`video.mjs`** re-draws a scene per frame (zoom, pins landing, toggles flipping, text typing) and
   pipes raw frames to ffmpeg.

## Editing the kit

| Change | Where |
| --- | --- |
| A colour or radius | `scripts/tokens.mjs` |
| Headline, sub, CTA of a post | the `POSTS` table in `scripts/build-posts.mjs` |
| A story or Reels cover | the `STORIES` table in `scripts/build-stories.mjs` |
| Reel beats and timing | `scripts/video.mjs` (`videoMap`, `videoReport`, `videoAlerts`) |
| The URL in every CTA | `scripts/postkit.mjs` (`nowbey.com`) |
| Phone screen position in a photo | `scripts/geometry.mjs` — four corner points, TL/TR/BR/BL |

If you replace a base photograph, re-measure its screen corners. The corner list is the only thing
that makes a composite sit correctly in a real hand; everything else is automatic.

## Honesty rules baked into the generator

- Screens are labelled **EXAMPLE** and the map carries **SAMPLE MAP VIEW**, exactly as the product's
  own sample phone does.
- The alert channel on screen is **email** — there is no SMS or push claim anywhere in the kit.
- Coverage language is `Live for New Providence`; nothing implies island-wide or nationwide coverage.
- Copy is British-spelled, like `src/lib/copy.ts`.
