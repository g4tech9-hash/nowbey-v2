# UI models — the deep dive

**Status:** options paper, before the Phase 2 manifesto.
**Decided so far:** B — *Calm by default, Storm when the data earns it.* That fixes the **register system**.
**Still open:** the **skeleton** — the structural model those registers get applied to. That is this document.

The four previews are in `preview/`: `model-verdict.png`, `model-brief.png`, `model-ribbon.png`, `model-board.png`.
Read them as wireframes with branding, not as finished art. Their job is to show *shape*, and where each shape
gets weak.

---

## First, separate the two decisions

Most redesign arguments go in circles because two independent choices get argued as one.

| | What it decides | Status |
| --- | --- | --- |
| **Register** | How loud the chrome is, what colour means, how much air | **Decided: B** — calm at rest, storm on trigger |
| **Skeleton** | What the first screen *is*: map, list, timeline, or grid | **This document** |

You can put Calm and Storm on any of the four skeletons. They are orthogonal, and that is why the previews look
calm — calm is a *treatment*, not a layout.

---

## The four models

### 1 · Verdict — the map, with a sentence floating on it
`preview/model-verdict.png`

The map stays the hero; a frosted capsule names the place and states the situation in plain words
("Bay Street — Passable, one flood"), with a sheet of other roads under it.

**Optimises for:** the person who already knows which road they care about. Instant recognition of *where*,
because the map carries it.
**What the render exposes:** the frosted capsule sits on top of the busiest part of the map. Blur-on-blur is
expensive on a low-end Android, and the text has to survive whatever tiles are under it. It also puts a
parsing task between the reader and the answer: to know what it says about *their* road, they first have to
find their road.
**The honesty problem:** "Passable" is a judgement from community reports. The product cannot see the road. It
knows there are 2 recent flood reports and 12 confirmations. It must say *that*, not a verdict it cannot
support — otherwise the first time someone drives into water behind a green capsule, trust is gone permanently.
**Data it needs:** already present (reports, street, confirmations). **Storm behaviour:** good — pins and the
capsule both intensify. **Build cost:** low; this is closest to what exists today.

### 2 · Brief — no map, editorial column
`preview/model-brief.png`

A dated column: "Three things before you leave", then three labelled items — ROAD, WATER, WIRE — each one
sentence, each linking to the map.

**Optimises for:** reading. This is the only model that is comfortable with *nothing happening*: three lines of
well-written copy is a complete, dignified screen. It is also the only one that makes NowBey look like an
institution rather than a dashboard.
**What the render exposes:** the column is beautiful and completely blind. Nothing on the screen says how far
away any of it is from where the reader is standing. Every claim requires a tap to be useful. And with no
imagery, the emptiness of a quiet day becomes the design — which is only fine if the writing is excellent every
single day.
**Data it needs:** reports + wire + a human editor (or a very good summariser). **Storm behaviour:** poor
without heavy modification — a list of three is not how you communicate "do not drive". **Build cost:** low
technically, highest editorial cost.

### 3 · Ribbon — the commute as a linear itinerary
`preview/model-ribbon.png`

A vertical timeline of stops along one corridor: your road, the flood at the dip, the blocked street with a
detour, then town. "Leave by 7:15."

**Optimises for:** the actual question, "can I get where I'm going, and when should I leave?" It is the only
model that answers both halves. It is also the most *ownable*: nobody in the region does this, and it is
genuinely useful rather than decorative.
**What the render exposes:** the format duplicates itself — "Flooded at the dip" appears as a label and again
as body text, which is what happens to timelines when they run out of real content. A ribbon with one hazard
looks broken; a ribbon for a route nobody travels has no data at all.
**The honesty problem, again:** there is **no routing engine in the repository** (verified: no directions or
itinerary code anywhere in `src/`). A ribbon cannot be invented from a route the server can't compute. It can
only be *told* a corridor — "Fox Hill to town" — which means either a fixed set of curated corridors per island
(cheap, limited, honest) or real routing (a dependency and a licence).
**Data it needs:** corridors (curate ~8 for New Providence), plus reports along them. **Storm behaviour:**
strong. **Build cost:** high; new concept, new data, new screen.

### 4 · Board — the instrument panel
`preview/model-board.png`

Six flat tiles: POWER, WATER, ROADS, SEA, SCHOOLS, THE WIRE. One number each, one tile coloured.

**Optimises for:** the two-second glance. This is the only model you can read while waiting for a kettle. It is
also the natural home for the calm register, because a grid of quiet tiles *is* calm.
**What the render exposes — and this is the serious one:** POWER: On. WATER: On. NowBey has **no live utility
feed** (verified: `service_statuses` is written by staff in `/admin/statuses`; there is no BPL or WSC
integration). So that tile is either stale, or it is a fabricated certainty. A safety product that says "Water:
On" because a staff member updated it yesterday is worse than one that says nothing.
**Data it needs:** only the two tiles that are real today — ROADS and THE WIRE. The other four would need
either a feed or a *labelled* human source ("Updated by NowBey staff, 6h ago").
**Storm behaviour:** poor as a grid; becomes a wall of numbers when four tiles go amber at once. **Build
cost:** low for the honest version, open-ended for the full one.

---

## Feasibility, grounded in this codebase

| Model | Needs something that does not exist yet? | Cost | Fails when |
| --- | --- | --- | --- |
| Verdict | No | Low | Data is thin, or it over-claims a verdict |
| Brief | An editor, daily | Low tech / high editorial | Nothing is written, or nothing is happening |
| Ribbon | **Yes** — corridors + no router exists | High | Route has no reports, or weather moves the hazard |
| Board | **Yes** — live utility status | Low (2 of 6 tiles) | A tile states a stale fact as current |

Two of the four models depend on data the product doesn't have. That is the single most useful finding here,
and it rules out choosing purely on looks.

---

## The fifth option: pair the models by state

B already says calm at rest, storm on trigger. That logic applies to skeletons too: **the rest-state and the
load-state do not have to be the same layout.**

The strongest pairing, and my recommendation:

> **Board at rest → Verdict under load.**
> When the island is quiet, home is six quiet tiles, one of which says "2 blocked". The moment something
> crosses a threshold — a flood warning, a dangerous cluster, an active broadcast — the *same route* renders as
> the map with a capsule that says what happened and where. Same URL, same data, different skeleton, chosen by
> content.

Why this pair and not the others:

- It keeps your existing strength (the map) for the moment that matters, instead of leading with it every day.
- It makes the calm register structural rather than cosmetic: a quiet day genuinely has less on the screen.
- It only needs the data you already have, provided the Board keeps to ROADS and WIRE, and the other tiles
  carry an explicit source and age or are removed.
- It gives you a clean answer to "what does NowBey look like when nothing is wrong?" — which the current map
  cannot answer, and which is the majority of days.

The runner-up is **Brief at rest → Ribbon under load**: more distinctive, more ownable, and a much bigger
build. It is the right *second* phase, once eight corridors are curated and there is a daily writing habit.

---

## The typography question the renders raise

Every preview uses a **serif for the claim** ("Nassau is quiet", "Three things before you leave", "Leave by
7:15") and a sans for the data. That was deliberate, and it is a bigger brand decision than any colour.

- Today: **Sora** (display) + **Manrope** (text) — both loaded as local woff2. Modern, geometric, a little
  generic. It is the voice of a startup dashboard.
- The serif voice reads as *newspaper of record*: it is what makes a claim feel considered rather than
  generated, and it is the cheapest possible signal of institutional seriousness.
- My recommendation, if you take this route: keep **Sora/Manrope for all data, labels, numerals and controls**
  (they are excellent at that and already shipped), and add **one serif at display weight only** for the single
  sentence that states the situation. One family, one job, no third sans.

A caveat worth stating plainly: a serif at 40px on a 320px phone eats vertical space, and NowBey's users are
often reading one-handed in bad light. That is why the serif is for *one line per screen*, never for body copy.

---

## What I need from you

Pick the skeleton. Everything in Phase 2 depends on it.

**A — Board at rest → Verdict under load** *(my recommendation)*
Quiet grid most days, map and capsule when something is happening. Cheapest path to a genuinely calm product
that still uses your map.

**B — Brief at rest → Ribbon under load**
Editorial column most days, timeline when the commute is affected. Most distinctive, biggest build, needs
curated corridors and a writing habit.

**C — Verdict always**
Map and capsule, every day. No new concepts, ships soonest, calm register only.

**D — Brief always**
Editorial column, every day. Best for the wire-and-digest identity; weakest for someone standing in water.

**E — Prototype two before deciding**
I build A and B as real routes on real data behind a flag, you compare them on a phone, then we commit. Costs a
day, removes the guesswork.
