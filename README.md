# nowbey-v2

NowBey — community safety map, Marco's Alert tracker and Bahamian news wire. *Stay Safe, Bahamas.*

## What is in this repository

| Path | What it is |
| --- | --- |
| `src/` | **The app.** Next.js App Router: `/`, `/feed`, `/alerts`, `/wire`, `/api/alerts`, `/api/alerts/refresh`, `/api/wire`, `/api/wire/refresh`. |
| `wire/` | **Civic wire & Marco's Alert engines** — sources, Cell Broadcast bulletins, ingest, classification, de-duplication, ranking. Dependency-free. See [`wire/README.md`](wire/README.md). |
| `Downloads/nowbey-full-kit/nowbey-kit/` | The social launch kit (posts, stories, reels, captions, publishing CLI). Start at `00-START-HERE.md`. |
| `eas.json`, `EAS_FIX_REPORT.md`, `eas-fix.log` | Expo/EAS build configuration and the record of the OTA fix. |

## Run it

```bash
npm install
npm run dev            # http://0.0.0.0:3000 — /, /feed, /alerts and /wire
npm run typecheck
npm run wire:test      # 34 tests for the wire & alerts engines, no network
```

Copy `.env.example` to `.env.local`. Locally, RSS outlets default to the **fixture corpus** in
`wire/fixtures` so the app works offline, while official Cell Broadcast bulletins in
`wire/bulletins.json` and relayed alerts are always active. Set `WIRE_MODE=live` and
`ALERTS_MODE=live` locally to fetch live Bahamian RSS feeds (on Vercel deployments, both
automatically default to `live`).

## How Marco's Alerts & missing-person notices are caught

Bahamas **Marco's Alerts** broadcast over BTC / ALIV mobile Cell Broadcast + Royal Bahamas Police Force Facebook posts (`facebook.com/share/p/...`) and often precede newspaper RSS articles by hours or days. NowBey combines three layers so none are missed:

1. **Verified Cell Broadcast bulletins (`wire/bulletins.json`)** — active RBPF / Marco's Alert dispatches tracked in the repo and parsed for structured fields (name, gender, age, settlement/island, last-seen time & location, complexion/build, dialable `919` / CID `502-9991` `502-9992` links, and official flyer link).
2. **Real-time Cell Broadcast relay (`POST /api/alerts` + `/alerts` form)** — neighbours, operators, or automated mobile shortcuts can paste raw Cell Broadcast text (even with OCR line-wrapped URLs). Validated alerts persist to Neon Postgres (`DATABASE_URL`) or `wire/data/submitted-alerts.json` locally and broadcast within 60 seconds via `AlertsMonitor`.
3. **Live Bahamian newsrooms & RSS (`wire/alerts.json` + `wire/sources.json`)** — Tribune242, The Nassau Guardian, Our News, ZNS Bahamas, Bahamas Press, scoped Google News queries, and optional `RBPF_FB_RSS_URL` / `ALERTS_EXTRA_FEEDS` are polled, filtered through `isAlertCandidate()` to drop non-Bahamian or non-missing-person noise, and deduplicated by missing person + island.

High-urgency Marco's Alerts pin directly at the top of `/`, `/alerts`, and `/feed`.

## What is real and what is a stand-in

- **Real:** the wire engine, the Marco's Alert engine, `/alerts`, `/api/alerts`, `/api/alerts/refresh`, `/wire`, `/api/wire`, `/api/wire/refresh`, and the merge logic that pins alerts and places civic stories in `/feed`.
- **Stand-in:** the neighbour reports in the feed come from `src/lib/sample-reports.ts` (each card says so), and `/map` and `/report` are not part of this shell.

## Deploy notes

- On Vercel (`VERCEL=1`), `WIRE_MODE` and `ALERTS_MODE` default to `live` automatically unless explicitly overridden.
- `GET /api/alerts` sets `cache-control: no-store, max-age=0` and revalidates server-side every `ALERTS_REVALIDATE_SECONDS` (default 120s), while `AlertsMonitor` polls every 60s on `/`, `/alerts`, and `/feed`.
- `/api/wire/refresh` and `/api/alerts/refresh` require `CRON_SECRET` (`authorization: Bearer $CRON_SECRET`). Note that Vercel Hobby plans only permit daily crons (`0 12 * * *` in `wire/vercel.cron.json.example`); request-driven revalidation handles minute-by-minute freshness without requiring sub-daily crons.
