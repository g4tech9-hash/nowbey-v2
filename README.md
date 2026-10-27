# nowbey-v2

NowBey — community safety map and Bahamian news wire. *Stay Safe, Bahamas.*

## What is in this repository

| Path | What it is |
| --- | --- |
| `wire/` | **Civic wire engine** — source list, RSS/Google News ingest, category + island classification, de-duplication, ranking, and the adapter that puts civic stories into the Feed tab. Start with [`wire/README.md`](wire/README.md). |
| `Downloads/nowbey-full-kit/nowbey-kit/` | The social launch kit (posts, stories, reels, captions, publishing CLI). Entry point: `00-START-HERE.md`. |
| `eas.json`, `EAS_FIX_REPORT.md`, `eas-fix.log` | Expo/EAS build configuration and the record of the OTA fix. |

The Next.js app that renders `/map`, `/feed`, `/report`, `/wire` and `/alerts`
is not in this repository — only the marketing kit and the wire engine are. The
wire engine is dependency-free and framework-agnostic so it can be lifted into
the app unchanged; `wire/adapters/next-route.mjs` holds the App Router handlers.

## Quick start — the civic wire

```bash
cd wire
npm run ingest:fixtures    # offline run against the fixture corpus
npm test                   # 25 tests, no network
npm run preview            # wire + feed cards at http://0.0.0.0:4180
npm run ingest             # live Bahamian sources
```

See [`wire/README.md`](wire/README.md) for how stories are scored, where the
engine plugs into the app, and how to tune it.
