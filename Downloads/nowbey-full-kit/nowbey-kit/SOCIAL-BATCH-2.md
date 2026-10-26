# NowBey — Social Batch 2 (Instagram + Facebook)

Four posts, one per content pillar. Written to the kit's existing brand and honesty rules
(`CAMPAIGN.md`, `README.md` → "Honestness rules baked into the generator", `scripts/tokens.mjs` → `BRAND`).

Built 2026-10-25 · branch `arena/a4af7f62-nowbey-v2`

---

## ⚠️ Read this before posting — the MARCO Alert claim

The brief asked for a post highlighting "integrations for critical emergency notifications like
MARCO Alerts". **There is no MARCO integration in this product, and claiming one would be a
safety and legal problem, not just a marketing one.**

What MARCO Alert actually is:

- The Bahamas' **missing-child / child-abduction alert system** — the local equivalent of the
  US AMBER Alert. "Mandatory Action Rescuing Children Operation", named for **Marco Archer**,
  an 11-year-old who was abducted near his home and murdered in September 2011.
- Established in law under the **Child Protection (Marco Alert) Regulations, Chapter 132**.
- Activated **only by the Commissioner of Police** (RBPF), and delivered to the public through
  **carriers via cell broadcast** (BTC / Aliv), radio, TV and electronic billboards — plus
  the government's own channels.
- In November 2024 the protocol was tightened so alerts go out **immediately** on a child being
  reported missing, following the death of 12-year-old Adriel Moxey.

Why we do not write "NowBey integrates MARCO Alerts":

1. **It is not true.** `grep -ri "marco"` across the repo returns zero hits. There is no missing-person
   category, no RBPF feed, no cell-broadcast capability. The four report categories in the product are
   **Flooding, Power, Road, Water** (`scripts/scenes.mjs`).
2. **The channel is different.** MARCO reaches a phone by carrier cell broadcast. NowBey's alert
   channel is **email only** — the kit's own honesty rule: *"there is no SMS or push claim anywhere
   in the kit."*
3. **The harm is concrete.** A parent who believes a hazard map will notify them of a child abduction
   has a false sense of security about the single worst-case scenario. That is the opposite of the
   product's purpose.
4. **It borrows a murdered child's name** to sell a feature that does not exist.

**What Post 02 does instead:** it keeps the pillar's actual goal — *peace of mind for families* — and
gets there honestly. NowBey is positioned as the **layer official alerts do not cover** (which lane is
passable *right now*), it points families to official channels for official alerts, and it leads with
the promise the code genuinely keeps: **storm warnings are always sent and always free**
(`src/lib/alerts.ts`, `stormOverride`).

If a real MARCO / RBPF / NEMA integration is ever built, this post should be rewritten that day —
deliberately, with the partner's approval. `POSTING.md` sets the precedent: *"If another island goes
live, say so deliberately — do not soften it."* Same rule applies here.

---

## The rules this batch follows

| Rule | Source |
| --- | --- |
| British spelling — *neighbour*, *harbour* | `src/lib/copy.ts`, kit README |
| Coverage claim is **Live for New Providence** — never "The Bahamas" as a coverage claim | `POSTING.md` |
| Alert channel is **email**. No SMS, no iOS push, no app-store badge | kit README, `fb-d-honest.txt` |
| Screens are labelled **EXAMPLE**; the map carries **SAMPLE MAP VIEW** | kit README |
| Emergency fallback in copy: **call 911 / 919** | `ig-08-trust.txt`, `fb-d-honest.txt` |
| CTA is `nowbey.com`, not an app store | `POSTING.md` §"Store badges" |
| Tagline `Stay Safe, Bahamas`; promise `Know what is happening, island by island.` — never paraphrased | `scripts/tokens.mjs` → `BRAND` |
| Posting windows 06:45–08:15 and 17:30–19:30 AST; during a weather event, post within the hour | `CAMPAIGN.md` |

Palette for any new artwork (from `scripts/tokens.mjs`): ground `#0c151d`, accent `#3fd6c0`,
text `#f3f1ea` / `#b9c8c9` / `#9aafb3`, warning `#f8cf6b`, danger `#ff7f6b`. Category hues:
flooding `#6fd0ff`, power `#f8cf6b`, road `#ff9d8a`, water `#35d6e6`, storm `#ffe39a`.
Type: display **Bricolage Grotesque** 800, body **Inter**, labels **JetBrains Mono** 700.

---

## The photographic set — the chosen direction (2026-10-25)

The dark UI-mockup direction was reviewed and rejected. The batch now flies with a **warm,
human, photographic set**: real streets, real rain, real neighbours, no interface in frame —
the caption carries the copy and the image carries the feeling. Four images, one per pillar,
each chosen by eye from two generated candidates, normalised to exactly 1080×1080:

| Pillar | File | The frame |
| --- | --- | --- |
| 1 · drop a pin | `out/alt/post01-pin-drop.png` | A hand over a flooded lane at golden hour; the phone shows one teal pin on a dark map, nothing legible |
| 2 · safety & alerts | `out/alt/post02-family-alerts.png` | A parent and child at rain-streaked glass; the phone glows teal on the table, screen not legible |
| 3 · the news wire | `out/alt/post03-news-wire.png` | Three neighbours over three phones on a harbour dock at sunrise; news travelling person to person |
| 4 · the question | `out/alt/post04-community-question.png` | Neighbours laughing across a picket gate, one pointing at the building clouds |

Rules these frames keep, same as the vector set:

- **No legible text, badges or logos in frame** — nothing the product cannot stand behind, and
  nothing for a rumour to quote. The boat name and screen glows are ambient, not copy.
- **The honesty lives in the caption.** Coverage (`Live for New Providence`), email-only alerts,
  the free-storm-warning promise and the 911 / 919 fallback all sit in the caption text, which is
  why the captions must fly verbatim with these images.
- The vector assets (`out/posts/09–11`) stay in the kit as the **A/B variant** for pillars 1, 2 and
  4 — same captions, different frame. Run both in week one and keep whichever earns saves.
- These four are **generated photography, not pipeline output**: `npm run build:batch2` does not
  reproduce them. They live in `out/alt/` — inside the deployed folder on purpose, because Meta
  fetches media from `<KIT_BASE>/alt/…` and a Netlify drop of `out/` is the kit's only hosting step.
  Do not move them back outside `out/` or the publisher will 404.

---

# Post 01 · Feature Highlight — drop a pin

**Platform:** Instagram feed (1080×1080) · **Best window:** 06:45–08:15, school run and commute

### Caption

```
You do not need to be an admin to warn your street. 📍

Four steps. Twenty seconds. One line of text.

Water across the lane on your way to work? Open NowBey. Pick what it is — flooding, a road hazard,
a downed line, an accident. Drop the pin exactly where you are standing. Say what you can see.
Send. Your name on it, or anonymous — your call. Lose signal halfway through? Your draft waits
for you.

That is the whole flow. No form to fill in, no group chat to scroll back through, no admin to
approve you.

And it does not end at your pin. Neighbours confirm it, or mark it cleared — so the person behind
you can see whether water is still across the road, and how recently somebody actually checked.

Live for New Providence. Free to look, no account needed.
→ nowbey.com/report

Stay Safe, Bahamas.

#Nassau #Bahamas #NewProvidence #Flooding #RoadSafety #CommunitySafety #242
```

### Visual concept

- **BUILT — `out/posts/09-report-strip.png`** (`npm run build:batch2`, entry in
  `scripts/build-batch2.mjs`): a four-beat strip — the same `sceneReport` scene rendered at
  `step: 0…3`, one phone per step, joined by a single `#3fd6c0` progress line with numbered beads
  and mono step labels (`01 WHAT IS IT` → `04 POST IT`) sitting above each screen like column
  headers. The typed line only appears from step 3, so the strip reads left to right as a sequence.
  Headline *"Four steps. Twenty seconds. Your lane is warned."*, CTA pill `Report a hazard` beside
  the mono URL, foot `Live for New Providence · your draft survives a dropped signal`, top-right
  honesty chip `Screens are examples`.
- **Fallback / A-B test:** `out/posts/02-report.png` — the single-screen version composited into a
  phone held in a hand on a Nassau street, under *"Twenty seconds from seeing it to warning
  neighbours."*
- Keep the **EXAMPLE** label on the screen and **SAMPLE MAP VIEW** on any map frame.
- **Reels cut:** `out/video/02-report-flow.mp4` already animates this exact flow. Upload with
  `out/video/02-report-flow-poster.png` as the cover, add a trending sound in-app, and **do not**
  enable auto-captions (type is burned in).

### Facebook variant

```
The fastest way to warn your street is not the group chat. 📍

Every hard rain, the same thread: somebody asks if a road is passable, and forty people guess.
NowBey is four steps instead — pick what it is, drop the pin where you are standing, one line
about what you can see, send. Your name or anonymous.

Then neighbours confirm it or mark it cleared, so the next driver is not reading last week's
comments to work out whether the water has gone down.

Free to look at, no account needed, works in the browser: nowbey.com/report

Live for New Providence today. If you are in a group for your area, drop it in there — a map is
only as good as the people on it. 🌧️
```

---

# Post 02 · Safety & Alerts — peace of mind for families

**Platform:** Instagram feed + carousel · **Best window:** 17:30–19:30 · **Post within the hour during any weather event**

### Caption

```
Two things your family needs to know, and only one of them is an app. 🌧️

Official alerts come from officials. A MARCO Alert — The Bahamas' missing-child alert, issued by
the Royal Bahamas Police Force — reaches your phone through your carrier, the way it always has.
So do the hurricane warnings from NEMA and the Met Office. We are not going to pretend a community
map replaces any of that. In an emergency, call 911 / 919.

Here is the part those alerts do not cover: whether **your** lane is passable at 7:40 this morning.
Whether the line is down on **your** street. Whether the water has gone off at **your** end of the
road. That knowledge lives with neighbours — so we gave it somewhere to live.

Set up free email alerts. Pick your island, then pick what you actually want to hear about:
flooding, road hazards, power. One profile per email address. No spam.

And the promise we would rather keep than monetise: **storm warnings are always sent to everyone,
on every plan, for free.** That is not a growth tactic. That is just the right way round.

Being straight with you — email is the channel that works today. Text-message alerts and iPhone
notifications are not built yet, and we will say so here when they are.

Email alerts are live for New Providence.
→ nowbey.com/alerts

#Bahamas #Nassau #HurricaneSeason #NewProvidence #FamilySafety #StormReady #242
```

### Visual concept

- **BUILT — `out/posts/10-who-tells-you.png`** (`npm run build:batch2`): the two-column
  "who tells you what" infographic. Left, on an info-blue tint: **OFFICIAL — STRAIGHT FROM
  OFFICIALS** — MARCO Alert (a missing child; issued by the Royal Bahamas Police Force), hurricane
  warnings (NEMA and the Met Office), how it reaches you (through your carrier) — closed by a
  danger-tinted card, *"In an emergency, call 911 / 919."* Right, on an accent-teal tint:
  **NOWBEY — THE LAYER NEXT DOOR** — is your lane passable / is the line down / has the water gone
  off — closed by a warning-tinted card, *"Free email alerts. Storm warnings always sent, always
  free."* Headline *"Official alerts reach your phone. Neighbours reach your street."* with the
  accent on the two objects, CTA `Set up email alerts`, foot `Live for New Providence · email is
  the alert channel available today`, top-right chip `No seals, no logos — described, not endorsed`.
  **No police or government badge, seal or logo appears in the artwork** — we describe public
  systems, we do not imply endorsement or partnership.
- **Fallback / A-B test:** `out/posts/03-alerts.png` — the real alerts screen as a device on the
  ambient room; its on-screen amber card already reads *"Storm warnings — Always sent. Free for
  everyone."*, so image and caption cannot contradict each other.
- **Carousel option:** `out/stories/S2-alerts-story.png` as the vertical companion, plus the
  infographic as frame 2.
- **Reels cut:** `out/video/03-alerts-setup.mp4` (cover `03-alerts-setup-poster.png`) — the trust
  reel, calm piano, on-screen text `your island → your alerts → free, always`.

### Facebook variant

```
For the parents, the aunties and anybody who checks on everybody else 🌧️

We want to be careful here, because this matters.

Official alerts stay official. A MARCO Alert — the missing-child alert issued by the Royal Bahamas
Police Force — reaches your phone through your carrier. Hurricane warnings come from NEMA and the
Met Office. No app should tell you otherwise, and we are not going to. In an emergency, call
911 / 919.

What those alerts cannot tell you is whether your own lane is passable at 7:40 in the morning.
That is neighbour knowledge, and it is the part we built NowBey for.

Two things worth knowing if you run a household:
– Email alerts are free. Pick your island, pick what you want to hear about — flooding, road
  hazards, power. One profile per email address.
– Storm warnings are sent to everyone, on every plan, for free. No plan required, ever.

Email is the channel that works today. Text-message alerts and iPhone notifications are not built
yet, and we would rather say that than pretend otherwise.

Set yours up: nowbey.com/alerts — live for New Providence.
```

---

# Post 03 · The News Wire — hyper-local, fast-breaking

**Platform:** Instagram feed · **Best window:** 17:30–19:30

### Caption

```
The headline says "heavy rain". You want to know about **your** road. 📰

That is the whole gap the news wire closes.

NowBey collects stories from Bahamian outlets in one place — and puts each one on the map, so a
story is not just "across the island", it is *where it happened*. Heavy rain floods low-lying
streets. BPL schedules repairs. Ferry services resume after a swell. Each card names its source and
carries a link out to the outlet that reported it.

Every story is reviewed by a human before it publishes. Sources are named on every card.
Community-submitted links go through the same review, because a safety product cannot afford a
viral rumour — and because your trust is the only thing this wire has going for it.

Read it next to the hazard map and you get the two halves of the same picture: what the outlets are
reporting, and what your neighbours are actually seeing on the ground right now.

No app store detour. Open it in a browser. Live for New Providence today, other islands next.
→ nowbey.com

Stay Safe, Bahamas.

#Bahamas #Nassau #BahamasNews #NewProvidence #LocalNews #NassauBahamas #242
```

### Visual concept

- **Ship today, zero build:** `out/posts/04-wire.png` — the real wire screen (`sceneWire`) in a
  phone on a Nassau street, under *"Bahamian headlines with the map underneath."* Footnote on the
  asset: *"Sources named on every story."* The three sample stories in the scene already carry the
  `REVIEWED` badge in accent teal and the `Bahamian outlet · Reviewed` meta line, which is the
  trust signal this caption is making.
- **Preferred new build:** a **three-card "receipts" poster** — the wire's three sample stories blown
  up large on the `#0c151d` ground, each card showing its category tile, the `REVIEWED` badge in
  `#3fd6c0`, the outlet line, and a **small `mapView()` inset** with a single pin marking where the
  story happened. That inset is the entire argument of the post: a headline with a location on it.
  Headline **Local news, with the map underneath.**, eyebrow `The news wire`, CTA `Read the news
  wire`, foot `Sources named on every story`.
- Use the wire's own category hues for the tiles: flooding `#6fd0ff`, power `#f8cf6b`,
  marine `#6eeadb`.
- Keep the story titles clearly sample copy, consistent with the **EXAMPLE** rule — this is a
  capability post, not a claim about live editorial output.
- **Story companion:** `out/stories/S5-wire-story.png` (*"Bahamian headlines, with context."*).

### Facebook variant

```
Somebody sends the link. Nobody says where it happened. 📰

That is the gap the NowBey news wire closes. We collect stories from Bahamian outlets in one
place, and put each one on the map — so a story is not just "across the island", it is where it
happened, with the source named and a link back to the outlet that reported it.

Every story is reviewed by a human before it publishes. Community-submitted links go through the
same review, because a safety product cannot afford a viral rumour.

Read it alongside the hazard map and you get both halves: what the outlets are reporting, and what
your neighbours are seeing on the ground.

Works in the browser, no app store detour: nowbey.com

Live for New Providence today, other islands next.
```

---

# Post 04 · Engagement / Call to Action — the community question

**Platform:** Instagram feed + Stories · **Best window:** 17:30–19:30, when people are home and scrolling
**Goal:** comments and shares, not clicks. Do not put a link sticker on the Story frame — the question is the point.

### Caption

```
Nassau, we want to know: what is your routine before the rain mash up? 🌧️👇

Because everybody has one. The gully gets checked. The car moves to higher ground. Somebody's
grandmother calls to make sure everybody's good — that is a whole early-warning system with one
phone line.

Tell us yours in the comments. What do you check first? What do you do that your neighbours should
copy?

We are reading every one, and we will turn the best answers into a "what Nassau does before the
rain" post — with credit, or anonymous if you prefer it that way.

Then put your routine where the whole street can see it. Drop a pin when the water starts rising,
confirm a neighbour's report when you drive past it, and set up free email alerts for New
Providence — flooding, road hazards, power. Storm warnings always go out, and they are always free.

→ nowbey.com/alerts

Stay Safe, Bahamas.

#Nassau #Bahamas #NewProvidence #CommunitySafety #HurricaneSeason #242 #StaySafeBahamas
```

### Visual concept

- **BUILT — `out/posts/11-question.png`** (`npm run build:batch2`): a question poster with no UI in
  it at all — it should read as something a neighbour posted. Full-bleed ambient ground with ticks;
  headline in Bricolage Grotesque 800 across three lines, *What do you do / before the rain /
  **mash up?*** with the punchline in `#3fd6c0`; eyebrow `Community question`; then four answer
  chips in their real category hues — `Check the gully` (water `#35d6e6`), `Move the car` (road
  `#ff9d8a`), `Charge the phones` (power `#f8cf6b`), `Call Granny` (community `#ff8fb8`) — plus an
  outlined `Something else ↓` chip in accent. CTA pill `Comment below` with the line *"We read every
  one, and we will credit the best."*, foot `Live for New Providence · nowbey.com`.
- **Fallback:** any of the square posts works behind the question in Stories, but keep the feed
  asset UI-free — the contrast with the other nine posts is the point.
- **Stories pair:** frame 1 = the question poster; frame 2 = an **Instagram poll sticker**
  (`out/stories/S1-map-story.png` as the background) — *"Has your road flooded this month?"* →
  `Yes, already` / `Not yet`. Polls cost the follower one tap, which is why they outperform open
  questions in Stories.
- **Follow-up (48 hours later):** screenshot the three best comments into a Story with a
  "you said / we heard" frame, then post the promised roundup. This is what makes people answer the
  *next* question — the payoff has to be visible.
- **Reply discipline:** answer every comment in the first two hours, in the same voice — short,
  plain, neighbourly. Pin the most useful one. That first-two-hours reply rate is what pushes the
  post into other feeds.

### Facebook variant

```
Genuine question for the Nassau folks, and we want the honest answers 👇

What is your routine before the rain mash up?

The gully gets checked. The car moves somewhere higher. The phone gets charged. Somebody's
grandmother calls round to make sure everybody's good — and honestly, that is a whole early-warning
system on one phone line.

Tell us yours. What do you check first? What do you do that your neighbours should be copying?

We are reading every comment, and we will put the best ones into a "what Nassau does before the
rain" post — with your name on it, or anonymous if you would rather.

And if you want your street to know what you know: drop a pin on nowbey.com when the water starts
rising, confirm a neighbour's report when you drive past, and set up free email alerts for New
Providence. Storm warnings always go out, and they are always free.

(Call 911 / 919 in an emergency — we are a community map, not an emergency service.)
```

---

## Suggested flight order

| Day | Platform | Post | Asset | Window (AST) |
| --- | --- | --- | --- | --- |
| 1 | IG feed + FB | 01 · drop a pin | `out/alt/post01-pin-drop.png` | 06:45–08:15 |
| 2 | IG Stories | 04 · poll frame | `out/stories/S1-map-story.png` | 17:30–19:30 |
| 3 | IG feed + FB | 04 · the question | `out/alt/post04-community-question.png` | 17:30–19:30 |
| 4 | IG feed + FB | 02 · safety & alerts | `out/alt/post02-family-alerts.png` | 17:30–19:30 |
| 5 | IG Stories | 04 · best comments | screenshots | 17:30–19:30 |
| 6 | IG feed + FB | 03 · the news wire | `out/alt/post03-news-wire.png` | 17:30–19:30 |
| 7 | IG feed + FB | 04 · the roundup | new "you said / we heard" | 17:30–19:30 |

A/B note: on days 1, 3 and 4 the vector build (`out/posts/09-report-strip.png`,
`out/posts/11-question.png`, `out/posts/10-who-tells-you.png`) is the alternate frame — same
caption, publish to one platform each and compare saves and shares after 48 hours.

The question post (04) runs *before* the alerts post (02) on purpose: the answers become the
social proof that makes "set up alerts" land, and the roundup gives the batch a second wave of
reach for no extra production.

**If a weather event breaks, suspend this calendar and post the map within the hour.** That is when
the product is most useful and the algorithm is friendliest — `CAMPAIGN.md` says exactly this.

## Publishing — the CLI route, step by step

Batch 2 is wired into the kit's own publisher (`scripts/publish.mjs`). The calendar entries live
in **`captions/plan.json`, days 15–20** — one plan file, one ledger, one command shape for the
whole launch. Captions are in `captions/batch-2/`; the photographic frames are in `out/alt/`;
the vector A/B frames are in `out/posts/09–11`.

The three vector assets are generated, not hand-made — `npm run build:batch2`
(`scripts/build-batch2.mjs`) redraws them from the same tokens as the rest of the kit, so a brand
change repaints them with everything else. Browse the whole set at `npm run gallery`.

### 1 · Credentials (once)

```bash
cd <kit>
cp env-prefilled.txt .env        # then paste your Meta token after META_TOKEN=
node scripts/preflight.mjs       # every line must say PASS
node scripts/token-extend.mjs    # prints type, expiry, missing scopes
```

The token needs `pages_show_list`, `pages_read_engagement`, `pages_manage_posts`,
`instagram_basic`, `instagram_content_publish`. Click-by-click: `CREDENTIALS.md`.

### 2 · Put the media behind a public URL (once per change to `out/`)

Meta fetches the image itself — it never accepts an upload. `out/` now contains `alt/`, so one
drop covers everything, batch 2 included:

1. https://app.netlify.com/drop → drag the **`out`** folder → **Make public**.
2. Check `https://<your-site>/alt/post01-pin-drop.png` loads in a private window.
3. `KIT_BASE=https://<your-site>` in `.env` (no trailing slash, no `/posts`).

`publicUrl()` strips the `out/` prefix, so `out/alt/x.png` → `<KIT_BASE>/alt/x.png`. Anything
outside `out/` is invisible to the publisher — that is why the photos live there.

### 3 · Rehearse, then fly

```bash
npm run publish -- plan --day 15 --dry-run     # prints every call, posts nothing
npm run publish -- plan --day 15 --yes         # IG + FB for the day
npm run publish -- plan --day 16 --yes         # story frame (poll sticker added in-app)
npm run publish -- plan --day 17 --yes         # the question post
npm run publish -- plan --day 18 --yes         # safety & alerts
npm run publish -- plan --day 20 --yes         # the wire + story (link sticker in-app)
```

Behaviours worth knowing before the first run:

- **The ledger.** `.publish-state.json` records every sent post; re-running a day steps over what
  already went out. `--force` repeats deliberately.
- **Fingerprint dedupe.** Before sending, `plan` checks whether that exact caption is already live
  on the platform — hand-posts and older copies of the script cannot cause a double post.
- **One bad post does not kill the day.** Failures are reported in a summary at the end; the rest
  still fly.
- **Rate limits heal themselves.** `graph()` recognises Meta's call-budget errors (codes 4, 17,
  32, 613) and backs off 60s → 2min → 5min per limited call, logging the `x-app-usage` header it
  sees. If it gives up after three retries, wait ~an hour and re-run the same command — the ledger
  and the fingerprint check guarantee nothing already live can repeat. Full write-up:
  `POSTING.md` → "When Meta rate-limits you".
- **The `after` field is your checklist.** Each plan entry carries its in-app step (poll sticker,
  link sticker at ≈78% height, reply discipline, A/B alternate frame). The CLI prints the label;
  the human does the sticker.
- **Windows.** 06:45–08:15 and 17:30–19:30 AST per entry labels; **during an active weather event,
  suspend the calendar and post the map within the hour.**

### 4 · The A/B, and the manual fallback

Days 15, 17 and 18 carry an `after` note naming the vector alternate (`out/posts/09`, `11`, `10`).
Publish the photograph to one platform and the vector to the other, compare saves and shares after
48 hours, keep the winner for the re-share week.

No terminal? Everything above can be pasted by hand from **Meta Business Suite → Planner**
(`POSTING.md` §1) — captions verbatim from `captions/batch-2/`, images from `out/alt/`.

Instagram truncates the caption after roughly the first two lines, so every hook here is written
to work in that space — check the preview on a phone before scheduling.
