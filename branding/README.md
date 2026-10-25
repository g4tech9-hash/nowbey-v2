# NowBey — icon & wordmark

The 3D app icon, the "now bey" wordmark, and every crop of them you need.

Everything here is generated. Edit a script, run `./build.sh`, and `out/`
repaints — no manual export step, no file that can silently drift.

```
./build.sh            # rebuild every asset
```

`build.sh` needs Node (`@resvg/resvg-js`, linked from the marketing kit's
`node_modules`) and Python 3 with Pillow.

---

## What to use

### Profile pictures, 3D

| File | Use |
|---|---|
| `out/png/nowbey-pfp-3d-night-1600.png` | **primary** — deep oceanic matte, cream "Now" + aquamarine "Bey", tagline beneath |
| `out/png/nowbey-pfp-3d-night-tight-1600.png` | same, wordmark set tight as one word |
| `out/png/nowbey-pfp-3d-light-1600.png` | daylight variant, navy + deep aqua on ivory |
| `out/png/nowbey-icon-3d-night-1600.png` | **text-free** — use this anywhere under ~96px |

Each has a `-circle.png` (transparent corners, ready for avatar upload) and
512 / 256 / 128 / 64 exports.

### Lockups

| File | Use |
|---|---|
| `out/png/nowbey-lockup-3d-night-2074x800.png` | app-store header, X banner, email signature |
| `out/png/nowbey-lockup-3d-light-2074x800.png` | the same on ivory, for print and light UI |
| `out/png/nowbey-lockup-3d-*-2011x800.png` | tight wordmark, no tagline |
| `out/png/nowbey-lockup-stacked-{light,night}.png` | mark above wordmark, square-ish placements |

### Flat vector

Rebuilt as solid geometry on the app's own 40-unit grid, so it stays legible
at 32px where the 3D render becomes mush.

| File | Use |
|---|---|
| `out/png/nowbey-pfp-flat-night-1080.png` | favicon, tab bar, task switcher |
| `out/png/nowbey-pfp-flat-light-1080.png` | the same on light paper |
| `out/svg/nowbey-mark-{light,night}.svg` | the mark alone, infinitely scalable |
| `out/svg/nowbey-lockup-h-*.svg` | horizontal lockups as vectors |

### Reference

- `out/nowbey-brand-sheet.png` — the whole set on one page
- `out/nowbey-vector-sheet.png` — the flat system, with a size ladder

---

## The wordmark

"Now" and "Bey" are set in **Bricolage Grotesque 800** — the product's own
display face (`fonts/Brico800.ttf`), so the social marks and the app agree.

- Tracking `-0.03em`, always. It is what makes the pair sit as one word.
- **Now** in cream `#F3F1EA` (night) or navy `#0A2A43` (light).
- **Bey** in aquamarine `#6FEAD B`-family — `#7FECDE` on night, `#0B6F64` on
  light, where the bright aqua would vibrate against paper.
- Spaced or tight are both sanctioned. Spaced reads as two words and is the
  primary; tight is for places where the name must behave as one token.

## The mark

A glossy map pin whose glass head contains a network constellation, ringed by
three soundwave arcs.

- Aquamarine `#3FD6C0` — the signal, the accent, "Bey".
- Deep oceanic navy `#0A2A43` (light) / `#091F33` (night) — the body.
- Sunshine gold `#F4B942` — node dots and pin tip only. Never a field colour.

## Rules

- Keep the type block inside the safe circle. On a 1600px canvas the baseline
  sits at 0.862 and the tagline below it — anything lower clips on a circular
  crop.
- Below 96px, drop the wordmark. The pin alone is the mark.
- Don't place the night master on a light background; the bloom is baked for
  dark. Use the light master or the flat vector.
- Don't recolour the gold. It is the only warm note in the system, and it is
  what stops the palette reading as generic tech-blue.

---

## Source renders

`src/` holds the two engine-style renders the 3D assets are cut from. They are
treated as cutouts: the object is cropped on a measured square, given a long
cosine feather, and composited onto a background built from a heavily blurred
copy of the same crop — which is why there is no halo ring at the seam.

Object bounds are measured, not guessed, and live in `BBOX` at the top of
`scripts/build_pfp_3d.py`. If you swap in a new render, re-measure them.
