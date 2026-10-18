# UI 4 — "The Sounding" · PARKED

**Status:** parked 2026-10-18, not rejected, not shipped.
**Reason:** the client is not sold on the interface. Keep every artefact and the reasoning; remove it from the
live code path so it cannot leak into the shipping product or slow it down.

---

## What UI 4 is

A complete alternative interface system for NowBey, built from a single metaphor: **the sounding** — a depth
measured by hand and written down with its date. Every screen states what is known, how many neighbours
confirmed it, and how old that knowledge is.

Four numbered predecessors came before it:

| | Model | File |
| --- | --- | --- |
| UI 1 | Verdict / Brief / Ribbon / Board skeletons | `../UI_MODELS.md` |
| UI 2 | Atlas / Split / Lens / Contour art directions | `../VERDICT_DIRECTIONS.md` |
| UI 3 | Three-register system (rest · engaged · storm), Split frame | `../REGISTERS.md` |
| **UI 4** | **One material, no split, Daylight as a fourth register** | this folder + `../REDESIGN_MANIFESTO.md` + `../LANDING.md` |

UI 4 is the version that got as far as real code: a vendored serif, measured tokens, and a landing-page
proposal.

---

## The artefacts

| File | What it holds |
| --- | --- |
| `../REDESIGN_MANIFESTO.md` | The full Phase 2 plan: metaphor, colour matrix with every ratio, type roles, layout architecture, motion spec, honesty rules, offline queue state machine, kill list, build sequence |
| `../LANDING.md` | The front door: live sounding instead of a marketing hero, the archive that solves the quiet-island problem, the storm takeover, the public-API shape it needs |
| `../REGISTERS.md` | Trigger rules + hysteresis, per-register contrast tables, motion table, the five honesty rules |
| `tokens.css` | The register tokens and `.nb-claim` / `.nb-locator`, exactly as they were wired |
| `newsreader-latin.woff2` + `LICENSE` | The claim typeface (Newsreader, SIL OFL 1.1, 58 KB variable) |
| `../preview/nosplit-*.png` | Rest · engaged · storm, no split |
| `../preview/landing-*.png` | Desktop · mobile · sections · storm landing |
| `../preview/register1..4-*.png`, `register-{calm,storm}.png`, `verdict-*.png`, `model-*.png` | The exploration that led here |

### The measured values worth keeping

If UI 4 is revived, these do not need to be recomputed:

- **Dark:** ivory `#f6ead8` 15.8:1 · mist `#a9c3c4` 10.1:1 · mist-400 `#8fabb1` 7.7:1 · tide `#43e0cc` 11.4:1 ·
  signal `#f5c75d` 11.8:1 · alarm `#ff8f7a` 8.5:1 (all on `#07131c`)
- **Light:** ink `#10222b` 14.1:1 · ink-500 `#3f545c` 6.9:1 · accent-ink `#07564f` 7.4:1 · amber-ink `#8f3b12`
  6.5:1 (all on `#f4eee1`)
- **Trap:** `#43e0cc` is **1.7:1 on paper** — fill only, never text, in light mode.

---

## What was removed from the product

Done in commit that follows this file. Nothing else in the app referenced any of it.

1. `src/app/globals.css` — the 85-line register token block is gone (copied here verbatim as `tokens.css`).
2. `src/app/layout.tsx` — the `newsreader` `localFont` is unwired and its variable removed from `<html>`.
   The font was preloading 58 KB on every route for a face nothing rendered.
3. `src/app/fonts/newsreader-*` — moved here.

The `REDESIGN_MANIFESTO.md` claim that the serif was "already wired" is therefore historical; read it as a
plan, not a description of `main`.

## How to revive it

```bash
cp audit/2026-10-18_panel/UI4/newsreader-latin.woff2   src/app/fonts/
cp audit/2026-10-18_panel/UI4/newsreader-LICENSE.txt   src/app/fonts/
cat audit/2026-10-18_panel/UI4/tokens.css >> src/app/globals.css
```

Then restore the `localFont` block in `src/app/layout.tsx` (it is in git history at `f6225db`) and add
`${newsreader.variable}` back to the `<html>` className. Every token, class name and ratio in the manifesto
still applies.

---

## What is worth saving even if UI 4 never ships

These are improvements to *the product*, not to this particular skin, and they should be lifted out on their
own regardless of which interface wins:

- **The register rules** (rest / engaged / storm, with hysteresis) are a product behaviour, not a visual style.
  Any interface needs to answer "how alarmed should this screen be, and who decides?"
- **The copy rules**: attribute, never instruct ("Neighbours say Bay Street is impassable", never "Do not
  drive"); every claim carries its age; quiet is a finding; never fabricate a tile.
- **The offline queue state machine** (`REDESIGN_MANIFESTO.md` §8) — idempotency keys, frozen anonymity,
  bounded backoff, duplicate-is-not-an-error. This is the "full offline" promise, specified.
- **The landing's quiet-island solution** — show the last three real soundings from the past week instead of
  inventing a hero screenshot.
- **The storm takeover of `/`** — during an emergency the front door becomes the alert, with no sign-up wall.

## The open question that stopped it

Not "is it pretty". It is: **should the interface lead with a sentence, or with the map?** UI 4 leads with a
sentence and treats the map as evidence. If the answer is the other way round, UI 4 is the wrong system at the
root and patching it will not help — start from UI 1's Board skeleton and rebuild the art direction around
cartography rather than typography.
