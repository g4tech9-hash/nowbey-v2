# NowBey — Social Launch Kit

**Brand:** NowBey · *Stay Safe, Bahamas*
**Promise:** Know what is happening, island by island.
**Launch beachhead:** New Providence (Nassau). Every asset, caption and prompt in this kit is written for that
one island, because the product is honest about coverage and so should the marketing be.

---

## What this folder is

| Path | What it holds |
| --- | --- |
| `out/posts/` | 8 feed posts, **1080 × 1080** — Instagram feed/carousel, Facebook |
| `out/stories/` | 9 vertical frames, **1080 × 1920** — IG/FB Stories + 3 Reels covers |
| `out/video/` | 3 reels, **8s, 1080 × 1920, 30fps, H.264** + a poster frame each |
| `out/CONTACT_SHEET.png` | Everything on one page, for a quick look before you post |
| `CAMPAIGN.md` | This file — strategy, calendar, every caption, every hashtag |
| `captions/` | One `.txt` per post, plus `plan.json` — the calendar as data the CLI reads |
| `START_HERE.md` | Files → accounts → hosting → token → posted, in order |
| `AGENT_PROMPT.md` | Paste-into-your-CLI prompt that runs the whole publish |
| `.env.example` | The five variables the publisher needs |
| `VIDEO_PROMPTS.md` | Ready-to-paste prompts for Runway / Luma / Sora, in the Hook → Action → CTA format |
| `scripts/` | The generator: tokens → SVG scenes → PNG/MP4 |
| `src/` | The photographic base plates (phone screens are composited into them) |

Nothing here is a stock mockup. Every screen in every asset is drawn from the product's own design
tokens (`scripts/tokens.mjs` mirrors `src/styles/pulse/tokens.css`), the product's own typefaces
(Bricolage Grotesque, Inter, JetBrains Mono — the exact files the site ships), and the product's own
component vocabulary (category spines, mono eyebrows, pill CTAs, the "Sample" honesty labels).

---

## Phase 1 — what was extracted (and what it forced in the design)

This is the internal read that drove everything below. It is short on purpose.

**The problem the product solves.** In The Bahamas, hazard information arrives as rumour: a WhatsApp
forward, a Facebook comment, "somebody said Bay Street flood". The cost of acting on a rumour (or
ignoring a real one) is a flooded car, a school run into a closed road, a night without power and no
warning. NowBey turns that noise into a map with provenance: who reported it, who confirmed it, how
old it is, and whether it is still true.

**The visual DNA.** Deep "Ocean Night" canvas (`#0c151d`) with layered planes rather than one flat
black; teal `#3fd6c0` as the single action colour; coral `#ff7f6b` for danger, amber `#f8cf6b` for
caution; a warm cream ink (`#f3f1ea`) instead of pure white; a category hue per hazard (flooding =
ocean blue, power = amber, road = coral). Three typefaces doing three jobs: Bricolage Grotesque
(tight, confident display), Inter (quiet body), JetBrains Mono (data, timestamps, eyebrows, place
names — the "instrument panel" voice). Radii are generous (20px cards, pill buttons), elevation is
soft, and the map itself is the hero image of the product.

**The tone.** Warm, brief, unhurried, and honest to a fault. The product refuses to say "push
notifications" when push is not delivered, labels stale reports instead of deleting them, and keeps
storm warnings free. The marketing therefore: no countdown urgency, no "revolutionary", no fake user
numbers, no screenshots of features that are not shipped.

**What that means for the creative.** The assets are built around *proof of the interface*: real
screens in real hands, in real Bahamian streets, with the honesty labels still visible. Photography
is Bahamian and specific (clapboard, palms, wet asphalt, dusk light) — never generic stock. Type is
large enough to read at arm's length on a phone, because that is where it will be read.

---

## Phase 2 — the 8 feed posts

| # | File | Hook | Feature it proves |
| --- | --- | --- | --- |
| 01 | `out/posts/01-map.png` | "See what's happening on your island." | The community map, live pins, confirmation chip |
| 02 | `out/posts/02-report.png` | "Twenty seconds from seeing it to warning neighbours." | The four-step report flow, typed live |
| 03 | `out/posts/03-alerts.png` | "Your island. Your alerts. No noise." | Email alerts + free storm warnings |
| 04 | `out/posts/04-wire.png` | "Bahamian headlines with the map underneath." | The news wire, reviewed sources |
| 05 | `out/posts/05-confirmed.png` | "Somebody saw it too. That's the whole idea." | Confirmation / trust loop |
| 06 | `out/posts/06-feed.png` | "What neighbours are reporting, right now." | The feed + freshness labels |
| 07 | `out/posts/07-web.png` | "The whole map, in a browser tab." | No-download web app on a laptop |
| 08 | `out/posts/08-trust.png` | "A rumour travels fast. So should the correction." | Provenance + "needs a recheck" honesty |

---

## Phase 3 — the three reels

| File | Beat | What actually moves on screen |
| --- | --- | --- |
| `out/video/01-map-countdown.mp4` | The map | Map pushes in, five pins spring in one by one, a "neighbour confirmed" chip lands, end card |
| `out/video/02-report-flow.mp4` | The report | Stepper advances, category chip takes the tap, text types into the field, success tick springs in, end card |
| `out/video/03-alerts-setup.mp4` | The alerts | Toggles flip on in sequence, the free-storm card gets its glow beat, CTA appears, end card |

All three: 8 seconds, 1080 × 1920, 30fps, H.264 High, `yuv420p`, faststart, no audio track (add the
sound in-app so the algorithm gets a clean licence). Burned-in captions are already in the design, so
they work muted — which is how most of them will be watched.

`VIDEO_PROMPTS.md` holds the same three concepts as generation-model prompts, for when you want a
photoreal or stylised version instead.

---

## Phase 4 — the copy

### House rules (apply to every caption)
- British spelling: *neighbour, harbour, colour, realise*.
- Say what is live: **map and email alerts are live for New Providence**. Everything else is "soon".
- Never imply the product replaces emergency services. It says so itself: *call 911 / 919*.
- Storm warnings are free. That is a promise the code keeps — repeat it.
- No invented metrics, no fake testimonials, no "#1".

---

### A. TikTok + Instagram Reels + Facebook Reels

**Reel 1 — the map ("See it before you drive it")**

> Hook (0–2s): "If you live in Nassau you already know this feeling." *(cut to phone: pins dropping)*
> Caption:

```
POV: you check the map before you leave the house 🗺️

Bay Street floods. Prince Charles loses power. Nobody tells you until you're already stuck in it.
NowBey puts neighbour reports on one map — who confirmed it, and how long ago.

Live for New Providence. Free to look. No account needed.

#Nassau #Bahamas #NewProvidence #NassauBahamas #242
```

- **Audio:** mid-tempo dancehall or afro-fusion instrumental, 95–105 BPM, drop the beat on the pin
  drops. Check the in-app trending list on the day — trending audio changes weekly and a track from
  last month reads as stale. If nothing fits, a soft-spoken voiceover over a low ambient bed
  outperforms a mismatched trending song.
- **On-screen text to add in-app:** `WAIT — check the map first` (0–2s) → `pins dropping` (2–5s) →
  `nowbey.com` (6–8s).
- **Hashtags:** 5, mixed reach — `#Nassau #Bahamas #NewProvidence #NassauBahamas #IslandLife242`

**Reel 2 — the report ("Twenty seconds")**

```
Twenty seconds. That's it. ⏱️

You see water across the lane. You open NowBey, pick what it is, drop the pin, add one line, send.
Your name or anonymous — your call. If the signal drops, your draft is still there when you come back.

Four steps. Twenty seconds. Then your street knows.

#Nassau #Bahamas #Flooding #NewProvidence #242
```

- **Audio:** something with a ticking or countdown texture; the visual already counts, so the sound
  should not fight it. Speed-ramp the typing beat.
- **On-screen text:** `four steps` → `one line` → `send`.

**Reel 3 — the alerts ("Storm warnings are free")**

```
The one alert that should never cost money 🌧️

Pick your island. Pick what you care about — flooding, road hazards, power.
Storm warnings are sent to everyone, on every plan, for free. That's not a growth tactic, that's just
the right way round.

Email alerts are live for New Providence today.

#Bahamas #Nassau #HurricaneSeason #NewProvidence #242
```

- **Audio:** calm, slightly cinematic piano or lo-fi; this is the trust reel, not the hype reel.
- **On-screen text:** `your island` → `your alerts` → `free, always`.

---

### B. Instagram — feed and carousel

**Post 01 — the map**

```
Before you drive, look. 🗺️

NowBey is a community safety map for The Bahamas. Neighbours drop a pin when a road floods, a line
comes down, or water goes off. Everyone else can confirm it — so you know what's real, and how
recently somebody checked.

Live for New Providence. Free to look, no account needed.
→ nowbey.com

#Nassau #Bahamas #NewProvidence #CommunitySafety #242
```

**Post 02 — reporting**

```
Twenty seconds, four steps, one line of text.

That's the whole reporting flow. Pick the category, drop the pin where you're standing, say what you
can see. Post your name or stay anonymous. Lose signal halfway? Your draft waits for you.

The faster a report goes up, the more useful it is to the person behind you.
→ nowbey.com/report

#Nassau #Bahamas #NewProvidence #Flooding #242
```

**Post 03 — alerts**

```
Your island. Your alerts. No noise.

Choose New Providence, then choose what you actually want to hear about: flooding, road hazards,
power. One profile per email address. No texts, no spam — email is the channel that works today, and
we'd rather say that than pretend otherwise.

Storm warnings are always sent, and always free.
→ nowbey.com/alerts

#Bahamas #Nassau #HurricaneSeason #NewProvidence #242
```

**Post 04 — the wire**

```
Bahamian headlines, with the map underneath.

The news wire collects stories from Bahamian outlets — reviewed before they publish, sourced, and
linked to where it happened. Community-submitted links go through review too, because a safety
product cannot afford a viral rumour.

Read the wire at nowbey.com — no app store detour.

#Bahamas #Nassau #BahamasNews #NewProvidence #242
```

**Post 05 — confirmation**

```
Somebody saw it too.

That's the whole idea. One person reports, neighbours confirm, and a WhatsApp rumour becomes a signal
you can act on. Every pin carries its own history: who confirmed it, and when.

When nobody has checked in a few days, the card says so — "needs a recheck". We'd rather show you an
old report honestly than quietly delete it.

#Nassau #Bahamas #CommunitySafety #NewProvidence #242
```

**Post 06 — the feed**

```
What neighbours are reporting, right now.

The feed is the island in order of recency: flooding on Bay Street, lines down on Prince Charles,
debris on Blake Road. Each card tells you the category, the place, and how fresh the confirmation is
— live, recent, needs a recheck, or stale.

Scan it in the school run queue. That's the design brief.
→ nowbey.com/feed

#Nassau #Bahamas #NewProvidence #Flooding #242
```

**Post 07 — no download**

```
The whole map, in a browser tab.

No app store. No update to wait for. Open nowbey.com on the laptop at work, the tablet on the boat,
the phone in your hand — same map, same reports, same confirmations.

(Android app is in the works. The website already does the job while you wait.)

#Bahamas #Nassau #NewProvidence #WebApp #242
```

**Post 08 — trust**

```
A rumour travels fast. So should the correction.

Every report shows its receipts: who posted it, whether neighbours confirmed it, and how long ago.
Nothing gets called "verified" because someone paid for a plan. Nothing disappears just because it
got old — it gets labelled.

Built in The Bahamas, for The Bahamas. Verify before you act; for emergencies, call 911 / 919.

#Nassau #Bahamas #CommunitySafety #NewProvidence #242
```

**Carousel (swipe) — "How NowBey works", 5 frames**
Use `06-feed`, `01-map`, `02-report`, `05-confirmed`, `03-alerts` in that order.

```
Slide 1: Someone sees it.
Slide 2: They drop a pin. Four steps, twenty seconds.
Slide 3: Neighbours confirm — or say it's cleared.
Slide 4: Everyone sees how fresh it is.
Slide 5: Your island's alerts, in your inbox. Free to set up.

Caption:
A hazard map only works if the second person trusts the first. So we built the trust into the
interface: confirmations, timestamps, and labels for reports nobody has checked in a while.

Swipe for the whole loop → nowbey.com

#Nassau #Bahamas #NewProvidence #CommunitySafety #242
```

---

### C. Facebook — community-first, built for shares and clicks

Facebook in The Bahamas is a neighbourhood-square product: groups, aunties, church pages, HOA
threads. Copy should read like a neighbour posting, not a brand.

**Post A — the local-group version (share bait, no hard sell)**

```
Quick one for the Nassau folks 👇

Every time it rains hard, the same thing happens in the group: someone asks if Bay Street is passable,
and forty people guess.

NowBey is a map of exactly that — neighbour reports for flooding, road hazards, power cuts and water.
You can see who reported it and how recently somebody confirmed it, so you know whether to trust it.

It's free to look at, you don't need an account, and it works in the browser: nowbey.com

If you're in a group for your area, drop it in there. A map is only as good as the people on it. 🌧️🗺️
```

**Post B — the HOA / community-leader version**

```
For anyone running a residents' group or HOA page in New Providence:

You already do the work — someone always knows which road is flooded first. NowBey gives that
knowledge somewhere to live. Residents drop a pin, neighbours confirm it, and everyone can see how
fresh the information is, instead of scrolling back through a week of comments.

Two things that might matter to your members:
– Storm warnings are sent to everyone, free. No plan required.
– Old reports are labelled, not deleted, so the history stays visible.

Email alerts for your island: nowbey.com/alerts
```

**Post C — the "how it works" explainer (link click)**

```
How NowBey works, in four lines:

1. You see a hazard — flooding, a downed line, debris on the road.
2. You drop a pin. Four steps, about twenty seconds. Your name or anonymous.
3. Neighbours confirm it, or mark it cleared.
4. Everyone sees how fresh it is before they act on it.

That's it. No ads inside your safety information, no paid "verified" badges, and storm warnings are
free to everyone.

Live for New Providence today, other islands next: nowbey.com
```

**Post D — the honest one (works unusually well on Facebook)**

```
A small thing we decided early: we would rather look unfinished than lie to you.

So — the map and email alerts are live for New Providence right now. Text-message alerts aren't built
yet. iPhone app notifications aren't built yet. The Android app is coming. Email works today, on every
plan, and it costs nothing to set up.

When the rest is ready, we'll say so here. Until then: nowbey.com

(Call 911 / 919 in an emergency — we're a community map, not an emergency service.)
```

---

## Two-week launch calendar

| Day | Instagram | TikTok / Reels | Facebook | Stories |
| --- | --- | --- | --- | --- |
| 1 | Post 01 (map) | Reel 1 | Post A (local group) | S1 → S2 |
| 2 | Story series only | Reel 2 | — | S3 → S4 |
| 3 | Post 05 (confirmation) | Reel 3 | Post C (how it works) | S5 → S6 |
| 4 | Carousel | Reel 1 (re-cut, new hook) | — | R1 cover + poll "Has your road flooded this month?" |
| 5 | Post 03 (alerts) | Reel 3 | Post B (HOA) | S2 + link sticker |
| 6 | — | Reel 2 (re-cut) | Post D (honest one) | Countdown sticker to rain-season reminder |
| 7 | Post 08 (trust) | — | — | Recap: "this week on the map" |
| 8 | Post 06 (feed) | Reel 1 | Post A (re-post to groups) | S4 → S1 |
| 9 | Post 04 (wire) | — | Post C | S6 |
| 10 | Post 07 (web) | Reel 2 | — | R2 cover |
| 11 | Post 02 (report) | Reel 3 | Post B | S3 + "report your first pin" |
| 12 | Carousel (re-share) | Reel 1 | — | S5 |
| 13 | — | Reel 2 | Post D (re-post) | Behind-the-scenes: how a pin gets confirmed |
| 14 | Post 01 (best performer, re-share) | Best reel, boosted | Post A | Weekly recap + link |

**Posting windows (Atlantic/New Providence, AST):** 06:45–08:15 (school run + commute) and
17:30–19:30 (after work). During an active weather event, post within the hour — that is when the map
is most useful and the algorithm is friendliest.

---

## Things to swap in before you post

1. **Domain.** Every caption says `nowbey.com`. If the live domain differs, change it in
   `scripts/postkit.mjs` (search for `nowbey.com`) and re-run the build.
2. **Store badges.** There is no app-store asset in this kit on purpose — the Android APK has not
   been delivered to a device yet (see `TODO_HUMAN.md`). Add store badges only when the listing is
   public; the website is the honest call to action today.
3. **Photography licence.** The base plates in `marketing/src/` were generated for this project.
   If you replace them with real photography, re-measure the phone's screen corners
   (`scripts/geometry.mjs`, four corner points) — that is the only thing that makes the composite sit
   correctly in a real hand.
4. **Trending audio.** Never hard-code a track name from a deck. Pick it in the app on the day; the
   files here are silent by design so any track can be attached without an audio clash.

---

## Rebuilding

```bash
cd marketing
npm install                 # resvg, skia canvas, fontkit
npm run build               # posts + stories  → out/
npm run build:video         # the three reels → out/video/  (needs ffmpeg; see README)
npm run sheet               # out/CONTACT_SHEET.png
```

Everything is deterministic: the same tokens produce the same pixels, so a brand change is a
one-line edit plus a rebuild, not a redesign.
