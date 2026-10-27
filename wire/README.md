# NowBey civic wire

The ingestion and classification layer behind `/wire` and the Feed tab.

It fixes the problem visible on the live wire on 2026-10-26: a road-closure story
was the only actionable item on the page, a junior sailing result and a brunch
were filed under **Notice**, a retrial under **Safety**, and `/feed` counted
zero Notice and zero Community items. The wire was reading general Bahamian
news; it was not reading *service information*.

```
sources.json       8 Bahamian outlets + 10 civic Google News queries
lib/rss.mjs        tolerant RSS 2.0 / Atom / RDF reader
lib/text.mjs       entities, tag stripping, de-duplication helpers
lib/islands.mjs    island + parish detection from towns and landmarks
lib/classify.mjs   category + civic-value scoring
lib/dedupe.mjs     URL / title / same-event collapse
lib/ingest.mjs     fetch → classify → dedupe → rank, one pass
lib/feed.mjs       wire item → Feed card
lib/merge.mjs      ratio-capped merge into the community feed
adapters/          Next.js App Router handlers, drop-in
fixtures/          offline corpus mirroring the live wire
preview/           local UI (npm run preview)
```

No dependencies. Node 20+. Everything fails soft: an outlet that is down costs
that outlet's items and nothing else.

## Run it

```bash
cd wire
npm run ingest              # live sources, summary table in the terminal
npm run ingest:fixtures     # offline, against fixtures/ — same code path
npm test                    # 25 tests, no network
npm run preview             # http://0.0.0.0:4180 — wire + feed cards side by side
```

`node ingest.mjs --civic --limit 12 --out data/wire.json` writes the payload the
app consumes (`items`, `feedCards`, `report`).

## How a story is scored

Two independent outputs per item:

| Output | Question it answers |
| --- | --- |
| `category` | Which of the twelve app categories does this belong to? |
| `civic` / `civicScore` | Is this service information a neighbour can act on? |

`civicScore` is built from three things, in order of weight:

1. **actionable language** — "closed", "interruption", "outage", "suspended",
   "resumes", "warning", "in effect", "will be closed", "no water"
   (up to 0.45)
2. **a named agency** — RBPF, BPL, WSC, Ministry of Works, NEMA, Met Office,
   Port Department, BIS (up to 0.35)
3. **being in a civic category at all** — road, water, power, sanitation,
   storm, marine, flooding, notice (0.20)

Court, politics, sport and lifestyle stories can be labelled accurately — a
retrial is `safety`, a regatta is `community` — but they never clear the civic
bar, so they stay on the wire and off the feed.

Civic stories currently produced from the fixture corpus: road closure (royal
visit), East Street closure, Carmichael Road resurfacing, eastern New Providence
water interruption, Exuma boil-water notice, BPL load shedding, Family Island
ferry suspension, small craft warning, Grand Bahama garbage collection.

## Where it plugs in

The app source is not in this repository, so these are the exact seams:

```js
// src/app/api/wire/route.ts
import { createWireHandlers } from '@/wire/adapters/next-route.mjs';
export const { GET } = createWireHandlers(SOURCES);
```

```js
// src/app/feed/page.tsx  (server component)
import { ingest } from '@/wire/lib/ingest.mjs';
import { bridgeToFeed } from '@/wire/lib/feed.mjs';
import { mergeFeedItems } from '@/wire/lib/merge.mjs';

const { items } = await ingest({ config: SOURCES });
const { cards } = bridgeToFeed(items);
const feed = mergeFeedItems(neighbourReports, cards);   // ratio-capped
```

Wire cards carry `kind: 'wire'`, `source.name`, `cta.href` and
`actions: { confirm: false, ... }` — so the existing feed card can render a
source chip and "Read at Tribune242" instead of a confirm/saw-it bar. Merge caps
wire items at 40% of any six-card window and one per category, so neighbours
still lead.

### Caching and scheduling

`adapters/next-route.mjs` memoises a run for ten minutes in module scope; swap
`createStore()` for KV/Postgres to share it across instances. Run the ingest on
a schedule rather than per request:

```json
{
  "crons": [{ "path": "/api/wire/refresh", "schedule": "*/15 * * * *" }]
}
```

Set `CRON_SECRET`; the refresh route refuses requests without
`authorization: Bearer $CRON_SECRET`. Be a good citizen: fifteen minutes is
plenty for a closure announcement and keeps the outlets' bandwidth small.

## Tuning

- **Missing civic stories** — add the phrase to `ACTIONABLE` or the outlet's
  query to `civicQueries` in `sources.json`. Queries are scoped
  (`"road closure" ... Bahamas`), which is why they beat a general Bahamas feed.
- **Wrong island** — add the town or landmark to `ALIASES` in `lib/islands.mjs`.
  The first place named in the copy wins.
- **Feed too newsy** — raise `CIVIC_MIN` in `lib/feed.mjs` (default 0.5) or lower
  `maxWireShare` in `mergeFeedItems`.
- **Outlet feed URLs** — the eight outlet feeds are marked `"verify": true`; they
  were unreachable from the build sandbox, and the Google News queries carry the
  wire on their own if any of them 404.

Every run returns a `report` with per-source status, so a feed that has quietly
died shows up as `failed` instead of silently thinning the wire.
