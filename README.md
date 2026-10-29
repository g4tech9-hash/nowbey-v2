# nowbey-v2

NowBey — community safety map and Bahamian news wire. *Stay Safe, Bahamas.*

## What is in this repository

| Path | What it is |
| --- | --- |
| `src/` | **The app.** Next.js App Router: `/` (landing), `/feed`, `/wire`, `/api/wire`, `/api/wire/refresh`. |
| `src/ui/` | **Landing kit** — `kit.tsx`, `phone-demo.tsx`, `mock-screens.tsx`. The primitives the landing page is built from. |
| `src/styles/pulse/` | Design system: `tokens.css`, `components.css` (`nb-*` / `pulse-*`), `compat.css` (aliases). |
| `wire/` | **Civic wire engine** — sources, ingest, classification, de-duplication, ranking. Dependency-free. See [`wire/README.md`](wire/README.md). |
| `Downloads/nowbey-full-kit/nowbey-kit/` | The social launch kit (posts, stories, reels, captions, publishing CLI). Start at `00-START-HERE.md`. |
| `eas.json`, `EAS_FIX_REPORT.md`, `eas-fix.log` | Expo/EAS build configuration and the record of the OTA fix. |

## Run it

```bash
npm install
npm run dev            # http://0.0.0.0:3000 — /feed and /wire
npm run typecheck
npm run wire:test      # 25 tests for the wire engine, no network
```

Copy `.env.example` to `.env.local`. Defaults run on the **fixture corpus** in
`wire/fixtures` — the wire captured on 2026-10-26, rebased to the current clock —
so the app works with no network. Set `WIRE_MODE=live` to fetch the real
Bahamian sources.

## What is real and what is a stand-in

- **Real:** the wire engine, `/wire`, `/api/wire`, `/api/wire/refresh`, and the
  merge logic that places civic stories in the feed. Classification, island
  detection, de-duplication and ranking all run for real.
- **Stand-in:** the neighbour reports in the feed come from
  `src/lib/sample-reports.ts` (each card says so), and the `/map`, `/report` and
  `/alerts` routes are not part of this shell. Swap `sampleReports()` for the
  reports query when the social layer lands.

## The landing page

`/` is the marketing landing page as it stood on **21 October 2026**
(`16dedfb`, `src/app/page.tsx` + `landing.module.css` + `src/ui/*`), restored
after the 26 October rebuild replaced it with a stand-in shell placeholder.

It was restored *adapted*, not verbatim, because this shell has no map, report
flow or email alerts. Where the original linked to a route that does not exist
here:

| Original | Here |
| --- | --- |
| `/map` | `/feed` — the community feed is the live destination |
| `/report`, `/alerts` | the section shows a **Coming soon** pill instead of a dead link |
| `/support`, `/privacy`, `/terms` | dropped from the footer until those pages return |
| session chip (`/api/session`) | a plain **Open the feed** button |

The hero's proof strip reads live numbers off the wire engine (stories, civic
stories, islands), so it never shows placeholder em-dashes again.

> Don't swap `/` back to a placeholder. If the shell needs a different page,
> change the sections above rather than replacing `page.tsx` wholesale.

## How a closure reaches the feed

1. `wire/sources.json` watches the outlets plus civic-scoped Google News queries
   (`"road closure" … Bahamas`, water interruptions, BPL outages, notices).
2. `wire/lib/classify.mjs` labels the story **Road** and scores its **civic
   value** from actionable language and the agency named.
3. `wire/lib/feed.mjs` turns it into a feed card — `kind: 'wire'`, source chip,
   "Read at Tribune242", no confirm/saw-it bar.
4. `wire/lib/merge.mjs` slots it into the feed: at most two in five cards, one
   per category, so neighbour reports still lead.

```
/feed   8 neighbour reports + 6 newsroom stories, interleaved
/wire   16 stories, 9 of them civic
```

## Deploy notes

- `/api/wire/refresh` refuses to run unless `CRON_SECRET` is set, and then only
  with `authorization: Bearer $CRON_SECRET`. Add a cron (see
  `wire/vercel.cron.json.example`) — every 15 minutes is plenty.
- The payload is cached in module scope for `WIRE_REVALIDATE_SECONDS` (default
  600). On more than one instance, back `createStore()` in
  `wire/adapters/next-route.mjs` with KV or Postgres.
- Outlet feed URLs in `wire/sources.json` are marked `"verify": true`: they were
  unreachable from the build sandbox. The civic Google News queries carry the
  wire on their own if an outlet feed 404s, and `/wire` names any source that is
  down.
