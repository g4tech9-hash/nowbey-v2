# NowBey — icon & wordmark

The app icon, the "Now Bey" wordmark, and every crop of them you need.

Everything here is generated. Edit a script, run `./build.sh`, and `out/`
repaints — no hand-exported file that can silently drift.

```
./build.sh            # rebuild every asset
```

Needs Node, and Python 3 with Pillow (`pip install -r requirements.txt`).
`build.sh` links `node_modules` from the marketing kit on first run.

> **`out/ui/` is the one to use.** It is drawn by the app's own code, so it
> cannot drift from the interface. Everything else in `out/` is an alternate.

---

## What to use

### Profile pictures, drawn from the UI  ← primary

`scripts/build_pfp_ui.mjs` **imports the product's own drawing code** rather
than approximating it:

| import | what it gives the avatar |
|---|---|
| `bg()` from `postkit.mjs` | the real backdrop — teal bloom, technical grid, vignette, grain |
| `emblemDisc()` | the kit's profile emblem — teal disc, filled pin, knockout core, wave |
| `mark()` from `ui.mjs` | the app header mark — rounded tile, stroked pin, amber core |
| `T`, `text`, `measure` | the product's tokens and its three typefaces |

| File | Use |
|---|---|
| `out/ui/nowbey-pfp-ui-night-1080.png` | **primary** — emblem, "Now Bey", coverage line |
| `out/ui/nowbey-pfp-ui-day-1080.png` | daylight pair, deep-aqua disc on ivory |
| `out/ui/nowbey-pfp-ui-tile-night-1080.png` | the app header mark itself, tile and all |
| `out/ui/nowbey-pfp-ui-tile-day-1080.png` | the same on ivory |

The layout adapts to the slot instead of being scaled down:

| size | what is drawn |
|---|---|
| ≥ 400px | mark + wordmark + coverage line |
| 160–399px | mark + wordmark, both larger, no coverage line |
| < 160px | mark only, filling the safe circle |

Every variant ships at 1080 / 512 / 256 / 128 / 64, plus a `-circle.png` with
transparent corners. The ladder is genuinely re-laid-out per rung — not one
master shrunk five ways.

### Profile pictures, 3D  (alternate)

| File | Use |
|---|---|
| `out/png/nowbey-pfp-3d-night-1600.png` | deep oceanic matte, cream "Now" + aquamarine "Bey" |
| `out/png/nowbey-pfp-3d-light-1600.png` | daylight variant on ivory |
| `out/png/nowbey-icon-3d-night-1600.png` | text-free mark |
| `out/png/nowbey-pfp-3d-night-tight-1600.png` | wordmark set tight as one word |

Each has a `-circle.png` and 512 / 256 / 128 / 64 exports.

### Lockups

| File | Use |
|---|---|
| `out/png/nowbey-lockup-3d-night-2074x800.png` | app-store header, X banner, email signature |
| `out/png/nowbey-lockup-3d-light-2074x800.png` | the same on ivory, for print and light UI |
| `out/png/nowbey-lockup-3d-*-2011x800.png` | tight wordmark, no tagline |
| `out/png/nowbey-lockup-stacked-{light,night}.png` | mark above wordmark, square-ish placements |

### Flat vector

Rebuilt as solid geometry on the app's own 40-unit grid, so it stays legible
where a render turns to mush.

| File | Use |
|---|---|
| `out/png/nowbey-pfp-flat-night-1080.png` | favicon, tab bar, task switcher |
| `out/png/nowbey-pfp-flat-light-1080.png` | the same on light paper |
| `out/svg/nowbey-mark-{light,night}.svg` | the mark alone, infinitely scalable |
| `out/svg/nowbey-lockup-h-*.svg` | horizontal lockups as vectors |

### Reference

- `out/nowbey-ui-avatar-sheet.png` — the UI-drawn set, with real-size rungs
- `out/nowbey-brand-sheet.png` — the 3D and flat set on one page
- `out/nowbey-vector-sheet.png` — the flat system, with a size ladder

---

## The wordmark

"Now" and "Bey" are set in **Bricolage Grotesque 800** — the product's own
display face — so the social marks and the app agree.

- Tracking `-0.03em` in the 3D set, `-0.02em` in the UI set (the app's own).
- **Now** in cream `#F3F1EA` (night) or navy `#16232B` (light).
- **Bey** in aquamarine `#3FD6C0` (night) or `#0B6F64` (light, where the
  bright aqua would vibrate against paper).
- Spaced and tight are both sanctioned. Spaced reads as two words and is the
  primary; tight is for places where the name must behave as one token.

## The mark

Two systems, deliberately:

- **The UI emblem** — teal disc, filled pin, knockout core, wave. This is what
  ships in the app, and it is what the primary avatar uses.
- **The 3D render** — a glossy pin with a network constellation inside the
  glass head, ringed by soundwave arcs. Presence, not interface.

Palette across both: aquamarine `#3FD6C0`, oceanic navy `#0A2A43` /
`#0C151D`, sunshine gold `#F4B942` (node dots and pin tip only — never a
field colour).

## Rules

- Keep the type block inside the safe circle. On the 1080 the coverage line
  sits at `y = 0.792` — anything lower clips on a circular crop.
- Use the `-128` and `-64` exports rather than downscaling the 1080; they are
  laid out for those sizes.
- Don't place the 3D night master on a light background; its bloom is baked
  for dark. Use the 3D light master, or the UI set.
- Don't recolour the gold. It is the only warm note in the system.

---

## Source renders

`src/` holds the two engine-style renders the 3D assets are cut from. They are
treated as cutouts: the object is cropped on a measured square, given a long
cosine feather, and composited onto a background built from a heavily blurred
copy of the same crop — which is why there is no halo ring at the seam.

Object bounds are measured, not guessed, and live in `BBOX` at the top of
`scripts/build_pfp_3d.py`. If you swap in a new render, re-measure them.
