# THE SOUNDING — Phase 2 redesign manifesto

**NowBey · 18 October 2026**
Prepared by the three-seat council (Strategist · Artisan · Engineer), against commit `f8ebda6`.

---

## 0 · Decision log

Everything below rests on these, and each one was a fork with two defensible answers.

| Decision | Chosen | Rejected, and why |
| --- | --- | --- |
| Product axis | **Route intelligence** — a claim about a place and a time; the map is the evidence | Map-as-product: it makes the answer something the reader has to *find* |
| Register | **Calm at rest, Storm on trigger** (B) | Storm always: an alarm wears out in a week and takes the product with it |
| Skeleton | **Verdict** — map + one sentence + a short list | Brief (no map, blind to place), Ribbon (needs a router that does not exist), Board (needs utility feeds that do not exist) |
| Art direction | **Three registers, one material** — no Split | Split was the strongest single image, but it made light mode structural and cut sentences on reflow |
| Light mode | **Daylight as a fourth register**, not a theme toggle | Dark-only fails the user who reads at noon on a beach; a flipped dark theme is an unfinished promise |
| Blast radius | **New shell + component language across resident pages, web first**, then Expo | Admin stays on the old system until the language has been proven |
| Offline | **Full** — draft, send queue, last-known map | Read-only + draft is honest but abandons a report exactly when it matters most |

**What this is not:** a re-theme. Two pages the product already has — `/map` and `/report` — keep their data and
lose their grammar. The home route stops being a list of things and becomes a statement about a place.

---

## 1 · The core metaphor — *the sounding*

> **A sounding is a depth measured by hand and written down with its date. It is useful exactly as long as you
> know when it was taken.**

That is the whole product, and it is a Bahamian metaphor rather than a borrowed one. Charts of these islands
were made by dropping a line and calling the number — and every number carried a date, because the sea moves.

So NowBey does not publish *truth*. It publishes **soundings**: a measured claim, the number of neighbours who
took the same measurement, and the minute it was taken. Three consequences follow, and they are not negotiable:

1. **The timestamp is part of the sentence, not a footnote.** A claim without an age is a rumour with a font.
2. **The product never claims authority it does not have.** "Neighbours say Bay Street is impassable" — never
   "Do not drive". NowBey cannot close a road, and pretending to is both a lie and a liability.
3. **A quiet island is a result, not an empty state.** "Nothing to report" is a *finding*, and it deserves a
   designed screen — because it is what the reader will see on most days.

This is why the interface has contours in it, why the accent colour means *this changed* rather than *this is a
brand*, and why the serif appears once per screen and nowhere else. The type is the line being let down. The
number underneath is the sounding.

---

## 2 · The register system

Four states of one product. Chosen by data on the server, never by a setting, never by an A/B bucket.

```
rest      no active reports in the reader's parish within 24h
engaged   ≥1 active report in the parish
storm     any of:
            · active broadcast with severity "emergency"
            · ≥3 reports of the same category within 1 km in 30 minutes
            · a severity-4 (Dangerous) report still active within 5 km
            · a staff-set severe-weather notice in /admin/statuses
daylight  orthogonal — a palette layer over whichever of the three applies
```

### The resolver

One pure function, server-side, so a screenshot and a page render agree and the client cannot drift.

```ts
// src/lib/register.ts — pure, unit-tested, no I/O
export type Register = "rest" | "engaged" | "storm";

export type RegisterInput = {
  parish: string | null;
  now: number;
  reports: Array<{ category: string; severity: number; lat: number; lng: number; parish: string | null; createdAt: number }>;
  broadcast?: { severity: "info" | "watch" | "emergency" } | null;
  weatherNotice?: { active: boolean } | null;
  /** The last register, so a clearing event cannot make the screen flicker back down. */
  previous?: { register: Register; since: number } | null;
};

export function resolveRegister(input: RegisterInput): Register {
  const dayAgo = input.now - 24 * 3600_000;
  const inParish = input.reports.filter(
    (r) => r.createdAt >= dayAgo && (!input.parish || r.parish === input.parish),
  );

  const emergency = input.broadcast?.severity === "emergency";
  const severeWeather = input.weatherNotice?.active === true;

  const cluster = inParish.some((a) =>
    inParish.filter(
      (b) =>
        b.category === a.category &&
        Math.abs(b.createdAt - a.createdAt) <= 30 * 60_000 &&
        distanceMeters(a, b) <= 1000,
    ).length >= 3,
  );

  const dangerous = inParish.some((r) => r.severity >= 4);

  const stormNow = emergency || severeWeather || cluster || dangerous;

  // Hysteresis: leaving storm waits 30 minutes after the last trigger clears.
  if (!stormNow && input.previous?.register === "storm" && input.now - input.previous.since < 30 * 60_000) {
    return "storm";
  }
  if (stormNow) return "storm";
  return inParish.length > 0 ? "engaged" : "rest";
}
```

`distanceMeters` is the existing haversine in `src/lib/geo.ts` — no new dependency.

### Daylight, properly

Daylight is **not** a `prefers-color-scheme` switch. It is the fourth register, and it is orthogonal: a reader
in bright sun gets Daylight + Rest, and a reader at 2am during a flood gets Night + Storm. Resolution order:

1. an explicit choice stored as `nb_register_light` (accessibility affordance, not a theme)
2. `prefers-color-scheme: light` → Daylight
3. default Night

That means the audit's "half-finished light theme" stops existing as a separate code path. There is one
palette layer, applied by one attribute.

### The escape hatch

A person can pin **"keep it calm"** for the session. This is an accessibility affordance for people whom a
full-screen takeover disorients, and it does one thing only: it suppresses the Lens takeover and the pulse. The
amber hairline and the claim stay. **It can never hide a claim.** That distinction is the whole ethics of the
feature, and it goes in the code as a comment so nobody "improves" it later.

---

## 3 · Colour matrix

Every pair below was computed, not chosen by eye. AAA is 7:1; AA is 4.5:1. **Nothing in this table is below
6.4:1 except the decorative contour lines, which carry no information.**

### The six slots, as asked

| Slot | Dark (Night) | Light (Daylight) | Role |
| --- | --- | --- | --- |
| **Primary** | `#f6ead8` ivory | `#10222b` ink | The claim. The loudest thing on the screen is a sentence, not a colour |
| **Secondary** | `#a9c3c4` mist-300 | `#3f545c` ink-500 | Meta: age, counts, rows, labels |
| **Accent** | `#43e0cc` tide | `#07564f` accent-ink | Locators, links, live markers. **Means "this changed", never decoration** |
| **Background** | `#07131c` sea-950 | `#f4eee1` paper-100 | The material |
| **Surface** | `#0a1b26` sea-900 | `#fbf7ee` paper-050 | A raised row block, a sheet |
| **Error** | `#ff8f7a` alarm | `#9b2335` alarm-ink | A failed action, never a hazard — hazards are not errors |

### The full palette, with measurements

**Night**
| Token | Hex | On `#07131c` | On `#0a1b26` |
| --- | --- | --- | --- |
| `--nb-ivory-100` | `#f6ead8` | **15.8** | 14.8 |
| `--nb-ivory-200` | `#d9e6e4` | 14.7 | 13.7 |
| `--nb-mist-300` | `#a9c3c4` | 10.1 | 9.4 |
| `--nb-mist-400` | `#8fabb1` | 7.7 | 7.2 |
| `--nb-tide` | `#43e0cc` | 11.4 | 10.7 |
| `--nb-signal` | `#f5c75d` | 11.8 | 11.0 |
| `--nb-alarm` | `#ff8f7a` | 8.5 | 7.9 |

**Storm** adds `#050f16` as its ground, `#f5c75d` as its only accent, and `#ff8f7a` for the danger ring.
Amber appears in exactly three places: the top hairline, the locator, the primary action. Not a fourth.

**Daylight**
| Token | Hex | On `#f4eee1` | On `#fbf7ee` |
| --- | --- | --- | --- |
| `--nb-ink-900` | `#10222b` | **14.1** | 15.3 |
| `--nb-ink-700` | `#1b303a` | 11.9 | 12.8 |
| `--nb-ink-500` | `#3f545c` | 6.9 | 7.5 |
| `--nb-accent-ink` | `#07564f` | 7.4 | 8.0 |
| `--nb-amber-ink` | `#8f3b12` | 6.5 | 7.0 |
| `--nb-alarm-ink` | `#9b2335` | 6.8 | 7.3 |

> **The one rule that catches everybody:** true teal `#43e0cc` measures **1.7:1 on paper**. It is a *fill* in
> Daylight — a dot, a hairline, a map stroke. Accent **text** drops to `#07564f`. This is the single most
> likely regression in the whole redesign, so it becomes a lint test, not a note.

### Contour geometry

The chart lines are decorative and must stay that way: `#7fc4bd` at 45% on Night (**4.6:1** with the
background, adequate for a hairline), `#3f545c` at 22% on paper. Depth numerals are drawn only when the data is
real; otherwise the contours run bare. No invented soundings.

---

## 4 · Typography

One family per job. Three faces total, all self-hosted as woff2 — the two you already ship plus one.

| Role | Face | Weights | Sizes | Where it may appear |
| --- | --- | --- | --- | --- |
| **The claim** | **Newsreader** (variable, OFL) | 400 / 420 rest / 500 storm | `clamp(2rem, 8.4vw, 3.5rem)`, line-height 1.04, tracking −0.018em | **Once per screen.** Never a row, never a button, never body copy |
| **Data** | **Sora** (variable, already shipped) | 600 / 700 / 800 | 11–13px, tracked caps for locators | Locators, counts, timestamps, buttons, row labels |
| **Body** | **Manrope** (variable, already shipped) | 400 / 600 | 15–16px, line-height 1.55 | Descriptions, legal, settings |

**Why a serif, and why this one.** The claim is the only place where NowBey speaks in its own voice; everything
else is data. A newspaper serif at display weight is the cheapest honest signal that a sentence was
*considered* rather than generated — and it is the difference between a dashboard and a paper of record.
Newsreader was chosen over Fraunces because Fraunces has a "wonk" axis that reads as fashion, and over
Playfair because Playfair at 320px collapses. Newsreader has a large x-height, real italics, and it is
designed for screens.

**Already done:** `src/app/fonts/newsreader-latin.woff2` (58 KB) is vendored and wired as `--font-newsreader` in
`src/app/layout.tsx`. `.nb-claim`, `.nb-claim-sm` and `.nb-locator` exist in `globals.css` today.

**The discipline that keeps it from becoming a gimmick:** exactly **one** `.nb-claim` per page. A second one is
a lint error, enforced by a test that counts them in rendered HTML.

---

## 5 · Layout architecture

### What it throws away

No top navigation bar. No hero section. No card grid of "features". No sidebar of widgets. The page **is** the
canvas, and the claim is a caption set into it. Navigation becomes a **footline** — a single hairline at the
bottom with four marks — because the thumb lives there and the eye should not.

### Phone

```
┌──────────────────────────────┐
│ NOWBEY            · 07:41    │  56px  hairline-header, locator + clock only
├──────────────────────────────┤
│                              │
│      T H E   C A N V A S     │  1fr   contour (rest) or map (engaged)
│                              │        the claim is set into its quiet area
│   NEW PROVIDENCE             │
│   Nothing to report.         │
│   on your island.            │
│   ───                        │
│   checked 07:41 · 3 watching │
│                              │
├──────────────────────────────┤
│ The wire · 2 new           ● │  auto  row list, hairline rules, 48px rows
│ Report a hazard            + │
├──────────────────────────────┤
│  ⌂      ◈      ↑      ◔      │  64px  footline nav, icon-only, 44px targets
└──────────────────────────────┘
```

Built as one CSS grid, not nested floats:

```css
.nb-verdict {
  min-height: 100svh;
  display: grid;
  grid-template-rows: 56px minmax(0, 1fr) auto calc(64px + env(safe-area-inset-bottom));
}
```

The canvas is the only flexible row; the claim is placed inside it with `align-self: end` and a generous
bottom inset, so it sits in the chart's quiet water without absolute positioning and without a card.

### Desktop

```
┌────┬──────────────────────────────────────┬───────────────┐
│    │                                      │ BAY STREET    │
│ ◈  │                                      │ Water at the  │
│    │            T H E   C A N V A S       │ dip.          │
│ ◔  │                                      │ 12 confirmed  │
│    │                                      │               │
│    │                                      │ Shirley — blo │
│    │                                      │ East Bay — cl │
│ ─  │                                      │               │
│ +  │                                      │ [Report]      │
└────┴──────────────────────────────────────┴───────────────┘
  72px              1fr                          340px
```

- **Left rail (72px):** icon-only, persistent, no labels. The only vertical furniture.
- **Canvas:** full-bleed map. The claim sits bottom-left *on* the canvas, over a scrim, in a 7-column measure.
- **Right column (340px):** the sounding list. It is not a sidebar of widgets; it is the same rows as the
  phone, given a permanent home.

```css
@media (min-width: 1024px) {
  .nb-verdict { grid-template-columns: 72px minmax(0, 1fr) 340px; grid-template-rows: minmax(0, 1fr); }
}
```

### Register → layout

| | Rest | Engaged | Storm |
| --- | --- | --- | --- |
| Canvas | SVG sea chart, deterministic per island | Leaflet, no controls, only the corridor traced | same map, masked to a light pool |
| Claim position | centred, in calm water | bottom-left over a scrim | centred under the pool |
| Accent | none (contours only) | tide on the locator | amber hairline + amber action |
| Rows | 2 (wire, report) | 3–5 soundings | hidden; one action and "I am safe" |

---

## 6 · Component behaviours & motion

Motion exists to explain a change of state, not to decorate. Three curves, five durations, and a hard stop.

```css
--ease-out:      cubic-bezier(0.16, 1, 0.30, 1);   /* entrances, expo-out */
--ease-standard: cubic-bezier(0.20, 0.80, 0.20, 1); /* spatial moves */
--ease-in-out:   cubic-bezier(0.65, 0, 0.35, 1);   /* reversals */
```

| Element | Trigger | Behaviour |
| --- | --- | --- |
| **Sea chart lines** | first paint, rest register | draw once with `stroke-dashoffset`, 1200ms `--ease-out`, staggered 40ms per band. Never loops |
| **The claim** | register change | fades 0→1 and rises 8px, 320ms `--ease-out`. **A claim never types itself out** — that is a loading metaphor on a sentence that is already true |
| **Corridor trace** | engaged, map ready | stroke draws 900ms `--ease-standard`, then the pin scales 0.92→1 with a 240ms spring |
| **Pin appear** | live update | spring, stiffness 420, damping 32, mass 1 → settles ~240ms. No bounce past 1.06 |
| **Row** | list update | height animates via `grid-template-rows` 0fr→1fr, 200ms; text crossfades at the midpoint |
| **Lens** | entering storm | radius 0 → 46vmax, 320ms `--ease-out`; amber hairline scales in from 0 width, 240ms |
| **Danger ring** | storm | 1.8s pulse, **four cycles then stops**. It must not become wallpaper |
| **Button press** | tap | scale 0.98, 90ms in, 180ms out `--ease-out`; the label never moves |
| **Footline** | route change | active mark gets a 2px tide underline that grows from the centre, 200ms |
| **Sheet** | open | 320ms translate + scrim 0.72 opacity; uses `useDialog` (already shipped: trap, restore, Escape, scroll lock) |

**Reduced motion.** `prefers-reduced-motion: reduce` replaces every transform with an opacity change at 120ms,
kills the ring pulse entirely, and renders the chart lines fully drawn. This is a first-class state, tested in
the gate — not a CSS afterthought.

**What is never animated:** the timestamp, the confirmation count, the claim's text content. Numbers that move
feel computed rather than observed.

---

## 7 · The honesty layer

Copy rules, written as code review criteria because they will otherwise erode.

| Rule | Correct | Forbidden |
| --- | --- | --- |
| Attribute, don't instruct | "Neighbours say Bay Street is impassable." | "Do not drive Bay Street." |
| Every claim carries its age | "Water at the dip · 12 confirmed · 6 min ago" | "Water at the dip" alone |
| Quiet is a finding | "Nothing to report on your island. Checked 07:41. 3 neighbours watching." | A blank map, or a spinner |
| Never invent a source | Remove the POWER tile, or label it "Staff update, 6h ago" | "Power: On" with no feed |
| Counts are counted | "12 neighbours confirmed" | "12 people agree", "Trending", "Popular" |
| No urgency theatre | The register is triggered by data, never by a timer | Countdowns, scarcity, "act now" |
| Failure says what survived | "That did not send. Your words are still here, and it will retry." | "Error", "Failed to fetch" |

The last one already exists as `src/lib/error-copy.ts`. It becomes the only path from an exception to a
sentence.

---

## 8 · Tech execution

### Tokens

`globals.css` is 1,700 lines because it is three files wearing a trench coat. It splits:

```
src/styles/tokens.css       palette, spacing, type scale, motion, safe areas
src/styles/base.css         reset, focus, typography defaults
src/styles/registers.css    the four register blocks (shipped today, foundations only)
src/styles/components.css   nb-claim, nb-row, nb-locator, nb-footline, nb-signal
```

Tailwind v4 consumes them through `@theme`; no new styling framework, no CSS-in-JS.

### Component inventory

| Component | File | Notes |
| --- | --- | --- |
| `<RegisterProvider>` | `src/components/register/provider.tsx` | Server component; sets `data-register` + `data-light` on `<html>` via the layout, not a client context |
| `<Canvas>` | `.../canvas.tsx` | Chooses `SeaChart` / `MapField` / `Lens`; lazy-loads Leaflet **only** when engaged or storm |
| `<SeaChart>` | `.../sea-chart.tsx` | Deterministic SVG generated from a coastline polyline per island; no network, no tiles, no licence |
| `<Claim>` | `.../claim.tsx` | The one serif sentence. Enforces one-per-page |
| `<SoundingRow>` | `.../sounding-row.tsx` | Street, state word, dot, age. **Never colour-only** — the word is always present |
| `<FootNav>` | `.../foot-nav.tsx` | 4 marks, 44px, `aria-current` |
| `<SignalBar>` | `.../signal-bar.tsx` | Storm hairline + label; the only thing that survives "keep it calm" |
| `<ReportSheet>` | `.../report-sheet.tsx` | Reuses `useDialog`; the report flow becomes one sheet, not a 3-step page |

### Performance budget (enforced, not aspirational)

| Metric | Budget | How |
| --- | --- | --- |
| Rest register network | **0 tile requests, 0 map JS** | SeaChart is SVG in the server-rendered HTML |
| Home JS (rest) | ≤ 90 KB gzip | Leaflet excluded from the route chunk; `dynamic()` on the canvas |
| LCP | < 1.8s on 4G | Claim is text in the first HTML payload; serif preloaded |
| CLS | 0 | `min-height` reserved per register on the canvas |
| INP | < 200ms | Register change is a navigation, not client work |
| Font bytes added | 58 KB (one file) | Newsreader wght-only, subset latin |

### The offline queue — a real state machine

You asked for the full promise, so here it is as a machine rather than a slogan. Client-side, IndexedDB, shared
by web (as a PWA worker) and Expo.

```ts
type QueueItem = {
  /** uuid v4, generated at compose time, sent as Idempotency-Key so a retry cannot make two pins. */
  id: string;
  draft: ReportDraft;
  /** The author is snapshotted at queue time. A report queued anonymously stays anonymous after sign-in. */
  author: { anonymous: true } | { anonymous: false; handle: string };
  state: "queued" | "sending" | "sent" | "duplicate" | "needs-edit";
  attempts: number;
  nextAt: number;
  lastError?: string;
  photo?: { blobKey: string; bytes: number }; // IndexedDB blob, ≤ 4 MB
};
```

```
        enqueue
           │
           ▼
      ┌─────────┐   online + slot free   ┌─────────┐
      │ queued  │ ─────────────────────► │ sending │
      └─────────┘                        └────┬────┘
           ▲                                  │
           │  retry (2s, 8s, 30s)             │
           │                                  ├─ 200 created ──────────► sent
           │                                  ├─ 200 duplicate:true ───► duplicate
           │                                  ├─ 4xx that needs editing ► needs-edit
           └────────────── 5xx / offline ◄───┤
                                              └─ attempts > 3 ─────────► needs-edit
```

Rules that matter:

- **Idempotency over dedupe.** The server accepts `Idempotency-Key: <id>` on `POST /api/incidents` and returns
  the existing incident for a repeated key. Retrying a queued report must never produce two pins, and must
  never be refused as a duplicate of *itself* by the existing `duplicate` rule.
- **Anonymous stays anonymous.** The author is frozen at enqueue. A queued report cannot acquire a handle
  because the person signed in while waiting — that would leak an identity they deliberately withheld.
- **Backoff is bounded.** 2s / 8s / 30s, then `needs-edit` with the real reason, never an infinite spinner.
- **Photos are the one thing that can fail for size.** Over 4 MB: keep the report, drop the photo, and say so
  in the row ("Sent without the photo — it was too big for the queue").
- **Duplicate is not an error.** It keeps the draft, shows the existing report, and offers *confirm* — which is
  more useful than a second pin anyway.
- **The map is a cache, not a queue.** Last-known soundings are read from IndexedDB and rendered with their
  real ages plus an explicit "as of 07:12" band. Stale data is labelled, never hidden.

### The gate (what a merge must pass)

Everything from the audit stays green, and three things are added:

1. `tests/register.test.mjs` — resolver truth table, hysteresis, and "a clearing event cannot flicker".
2. `tests/claim.test.mjs` — exactly one `.nb-claim` per rendered page; no `text-[#` in new components.
3. `tests/daylight.test.mjs` — no token in the Daylight block has a contrast below 6.5:1 against its own
   background (computed in Node, same maths as the audit).
4. The existing `mobile-audit.mjs` gains **W11: register contrast** — it renders each register and checks the
   claim/meta pairs it actually finds in the CSS.

---

## 9 · Build sequence

| Phase | Ships | Proves | Risk |
| --- | --- | --- | --- |
| **P0** — *The cast* | tokens split, register resolver + tests, SeaChart, Claim, FootNav, home in rest + engaged | The metaphor reads on a phone | Medium: the chart art |
| **P1** — *The alarm* | Storm register, Lens, SignalBar, resolver hysteresis, copy rules | Urgency without theatre | Low |
| **P2** — *Daylight* | fourth register, contrast lint, sunlight readability test | Light stops being debt | Low |
| **P3** — *The promise* | queue, idempotency endpoint, offline map cache, `/report` rebuilt as a sheet | The thing you asked for | **Highest** — this is the real engineering |
| **P4** — *The rest* | `/map` atlas, `/wire` editorial column, settings/legal on the new shell, Expo parity | The system holds beyond one screen | Medium |
| **P5** — *The debris* | delete old shell, old nav, splash, `V2_UI_Backup/` | Nobody maintains two products | Low, but do it last |

P0 is deliberately narrow: if the claim-over-chart does not feel right on a handset, everything after it is
decoration, and we stop.

---

## 10 · The kill list

Named, because "we'll clean up later" never happens.

- **The splash screen.** Deleted. It is a 1.6s tax on a page that has nothing to announce.
- **The top nav bar and the More sheet.** Replaced by the footline.
- **`.nb-fill-view` and its arithmetic.** Replaced by the `100svh` grid; the measurement hook stays only for
  the map page.
- **The 1,700-line `globals.css`.** Split four ways, old layers deleted at P5.
- **The light-mode override list** (the block that re-coloured hardcoded night hexes). Already obsolete — the
  hexes are tokens now.
- **`V2_UI_Backup/`.** A stale duplicate of the product; it exists only to confuse `grep`.
- **The 13-category legend as permanent furniture.** It becomes a filter sheet.
- **Any tile that cannot name a source and an age.**

---

## 11 · What I would refuse to build

Not a values statement — a list of things that will be requested, and the answer.

- **"Power: On" without a feed.** A dashboard tile that reassures without data is the most dangerous thing
  this product could ship.
- **"Do not drive."** The product reports; the police close roads. Attribute, never instruct.
- **Infinite scroll on a safety feed.** A feed that never ends implies there is always more happening. Soundings
  have a horizon, and the horizon is a date.
- **Gamified confirmations.** Badges for confirming hazards convert a civic act into a score and invite
  inflation precisely where honesty matters most.
- **An urgency timer.** No countdowns, no "3 people are looking at this". Manufactured scarcity on a hazard map
  is a dark pattern with a body count.
- **A consent wall over the map.** Reading is free; the account buys a handle, not access.

---

## 12 · The first three days

Concrete, so this does not stay a document.

1. **Day 1** — `src/lib/register.ts` + `tests/register.test.mjs`; the resolver is the spine, and it is pure, so
   it can be finished and tested before a single pixel moves.
2. **Day 2** — `<SeaChart>`: one island, one coastline, deterministic SVG, drawn from a polyline checked into
   the repo. Ship it behind the home route at 320px and look at it on a real phone.
3. **Day 3** — `<Claim>`, `<FootNav>`, and the rest-register home. Run `mobile-audit`, the contrast gate and the
   one-claim test. **Stop and look.** If the sentence over the chart does not feel like the product, we change
   the metaphor before we build the second register — not after.

---

*The sounding is the whole argument: measure it, write down when, and let the reader see both. Everything in
this manifesto is downstream of that one sentence.*
