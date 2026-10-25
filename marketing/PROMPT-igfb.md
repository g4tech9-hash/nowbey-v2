You are working inside the NowBey kit folder (the one containing `scripts/`, `out/`, `captions/`, `KIT-VERSION.txt`). Build the **Instagram + Facebook campaign set** — a 4:5 carousel, two square feed pieces, and two landscape link previews — then write the copy that goes with each one and wire it into the publisher.

**Scope lock: Instagram and Facebook only.** No TikTok assets, no Reels, no video, no scripts of any kind.

## Step 0 — Check the ground first

```bash
node scripts/publish.mjs --help
ls out/igfb 2>/dev/null
```

- If `out/igfb/` already holds seven PNGs (`carousel-01…`, `carousel-02…`, `carousel-03…`, `feed-01…`, `feed-02…`, `fb-01…`, `fb-02…`), the set exists. **Do not rebuild it** — jump to Step 4 and publish. Say so in one line first.
- If it is missing, build it. Do not hand-write a second renderer: use the existing `scripts/lib.mjs`, `ui.mjs`, `scenes.mjs`, `layouts.mjs`, `photos.mjs`, `postkit.mjs`. Every value comes from `scripts/tokens.mjs`, which mirrors the app's `tokens.css`. If `node_modules` is absent, `npm install` first.

## Step 1 — The three carousel frames (1080×1350)

One script, `scripts/build-igfb.mjs`, writing into `out/igfb/`.

**The series device treatment — use this on all three.** The phone enters from the bottom edge and is *cut* by it, with a gradient fade over the bottom ~210px. This is not decoration: it means copy owns the upper two-thirds and can never collide with a device. Do not centre a floating phone among text — that is the mistake this treatment exists to prevent.

- **1 / 3 — the promise.** Eyebrow `COMMUNITY SAFETY MAP`, headline `Know before` / `you go.` in two explicit lines (display 800, ~112px, tracking −0.04; second line in `T.accent` `#3fd6c0`), sub "Neighbour reports on one clear map." + "Swipe — three screens, one loop." Phone at ~600 wide, `sceneMap` inside, top edge at y≈736. `1 / 3` marker top-right; `nowbey-v2.vercel.app` bottom-left above the fade.
- **2 / 3 — the loop.** Headline `From asking` / `to knowing.` (~96px). Three numbered steps with a connected rail: `01 Someone sees it`, `02 Someone else confirms`, `03 You read the time`, each with one short line. Phone enters bottom-right at ~560 wide carrying `sceneReport` with `{ step: 1, typed: 1 }`.
- **3 / 3 — trust.** Warm variant: `#f8cf6b` bloom instead of teal. Headline `Not a` / `group chat.` Three gold-spine facts: `Who filed it` / `and when they filed it`, `Who confirmed it` / `one report is not a record`, `Storms always get through` / `whatever plan you are on`. Phone enters bottom-right carrying `sceneSuccess`. Bottom-left: `Free to look · no account needed`.

**The trap that will bite you:** wrap body text to the width *actually available after the indent*, not to the column width. Compute `textX = pad + 76` and `textW = rightEdge - textX` first. Wrapping to the column and then indenting pushes the last words under the phone; this happened twice while the set was first built.

## Step 2 — The two feed pieces (1080×1080)

- **`feed-01-detail`** — the confirmation card blown up to ~780×250 as the subject, on `T.bgRaised` with the flooding spine `#6fd0ff`. Headline `One pin.` / `Two people.` above it (~104px); below it "A rumour until a second person checks." plus one supporting line. Add a hairline magnifier ring for the close-up gesture — draw it, do not fake it with a blur. Fields: badge `Flooding`, title `Water across the lane`, place `Bay Street · Nassau`, freshness `Confirmed in the last few hours`, `4 CONFIRMATIONS`.
- **`feed-02-dashboard`** — the map screen filling the frame: device ~760 wide, cropped on three edges, only the top chrome visible. Headline `Everything` / `at once.` above (~88px), `Live for New Providence · other islands soon` at the base over a fade. The phone must not cover the headline — anchor it below the type block.

## Step 3 — The two Facebook previews (1200×630)

This is the **1.91:1 link-preview ratio**, so all type lives inside the centre 80% — Messenger, WhatsApp and X all crop it tighter than Facebook does. Left-to-right scrim `#04161d` at 0.93 → 0.05, so text sits on darkness and the photograph stays readable on the right.

- **`fb-01-link`** — `src/photo-nassau-coast.png` cover-fitted (focal 0.62 / 0.5). Headline `Is Bay Street` / `passable today?`, sub "Neighbour reports on one clear map. Free to look.", foot `nowbey-v2.vercel.app`.
- **`fb-02-link`** — `src/photo-map-square.png` (focal 0.66 / 0.3). Headline `A map of what` / `Nassau can see.` in gold. **The man in this photo is holding a phone, so the phone must show the product.** Render `sceneMap` at the quad's own aspect via `screenAspect("photo-map-square.png")` and composite with `photoLayer` — the compositor already handles perspective, the rounded mask and the finger-occlusion pass. A black slab under the words "a map of what Nassau can see" makes the whole asset a lie; this was caught on review in the original build and is not optional.

`photoLayer` requires a measured quad; for a photo with no phone in it (the coast), do a plain cover-fit in `@napi-rs/canvas` instead.

## Step 4 — Copy, one file per asset in `captions/igfb/`

**Instagram** (`01-carousel.txt`, `02-feed-detail.txt`, `03-feed-dashboard.txt`):

- One hook line that names a feeling, then a tight breakdown, then `Free to look. No account needed. Link in bio.`
- **Exactly 16 hashtags**, placed after a blank line, mixing broad (`#Bahamas #Caribbean`) with local (`#Nassau #NewProvince #242`) and functional (`#CommunitySafety #RoadConditions`).
- British spelling. No em-dash spam, no "Download the app", no store badges — the product is a web app at `nowbey-v2.vercel.app` and there is no store listing.
- Make each caption's angle different: the carousel sells the *question*, the detail sells the *trust model*, the dashboard sells the *clarity*.

**Facebook** (`04-fb-baystreet.txt`, `05-fb-community.txt`):

- Conversational, community-first, **zero hashtags**.
- Both must end with a question a local can answer in one sentence: "which road do you already know is going to be a problem?" and "what's the one hazard your area gets every single year?"
- Keep them under ~750 characters so the preview does not truncate behind "See more".
- Offer something (`free to look, works in the browser`) before asking.

## Step 5 — Wire it into the publisher

Write `captions/igfb.json` as a plan in the same shape as `captions/plan.json`, `day: "igfb"`:

- IG carousel — `assets`: the three frames in order, `caption: captions/igfb/01-carousel.txt`
- IG post ×2 — the two feed pieces
- FB fbpost ×2 — the two previews

```bash
node scripts/publish.mjs plan --day igfb --plan captions/igfb.json --dry-run
```

**CHECK:** it lists 5 items and posts nothing. Then `--yes` when you want them live. The ledger and the live-caption guard both apply, so re-running cannot double-post.

## Step 6 — Make them findable

1. Add a section to `marketing/index.html` (cards for all seven) and to `scripts/kit-index.mjs` — `section("Instagram + Facebook set", "igfb", …)` — then run `node scripts/kit-index.mjs`.
2. Add `"build:igfb": "node scripts/build-igfb.mjs"` to `package.json`.
3. Zip the set for phone posting: `downloads/nowbey-06-igfb.zip` with the seven PNGs at the root, the captions in `captions/`, and `plan.json`.
4. `node scripts/serve.mjs`, then curl `/out/igfb/fb-02-link-1200x630.png` and `/downloads/nowbey-06-igfb.zip` — both must be 200.

## Verification before you report

1. All seven files exist at the stated dimensions (`sips -g pixelWidth -g pixelHeight` on macOS, `magick identify` on Windows/Linux, or `node -e` with `@napi-rs/canvas`).
2. No text touches a device edge in any frame — read each one at full size, do not trust the code.
3. `fb-02` shows the map inside the held phone.
4. All type in the 1200×630 files sits inside the centre 80%.
5. Every Instagram caption has exactly 16 hashtags; every Facebook caption has 0 and ends on a question.
6. `plan --day igfb --plan captions/igfb.json --dry-run` lists 5 items.

## Reporting

Give me, in chat: a table of the seven files, the five captions mapped to their asset, the publish command, and anything you chose to change from this brief and why. If a step could not be completed — missing photo plate, no `node_modules`, unreachable API — say so plainly rather than shipping a placeholder.
