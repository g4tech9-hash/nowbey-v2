# The offline send queue (Expo)

Built 2026-10-18. The app was online-only: a report written without signal failed, and while the form kept the
words in React state, backgrounding the app or losing the phone lost them. On a product built for patchy island
signal that is the wrong way round — the phone is the surface most likely to be used during an outage, and it
was the least resilient.

## What exists now

| Piece | File | What it does |
| --- | --- | --- |
| Queue arithmetic | `expo/src/outbox-core.ts` | Pure: enqueue, due-item selection, backoff, terminal failures, expiry, banner copy. No React, no network — 14 tests |
| Chunked storage | `expo/src/chunk.ts`, `expo/src/local-store.ts` | SecureStore caps a value at ~2 KB, so JSON is split (without breaking surrogate pairs) and reassembled |
| Runtime | `expo/src/outbox.ts` | Loads and persists the queue, attempts sends, flushes on launch and on foreground, holds the draft |
| Banner | `expo/src/OutboxBanner.tsx` | "One report is waiting for a signal" — says what happened to the words, with a Send now action |
| Report screen | `expo/app/(tabs)/report.tsx` | Autosaves a draft (600 ms debounce), restores it for 24 h, and queues instead of erroring when the send cannot reach the server |

## Rules the implementation must keep

1. **Nothing is thrown away by a failure.** A dropped request queues; a refused one (400) marks the item
   `failed` with the server's own sentence and stops spending the radio. Expiry is 24 hours, not minutes.
2. **Anonymity is frozen at enqueue.** `queueReport` copies `anonymous` into the item. Signing in while a report
   waits cannot retroactively name its author.
3. **A retry is not a second report.** Each item carries a `clientKey` from compose time, sent with the POST.
4. **A duplicate answer is a success for a queued item.** Either it is this same report arriving after a
   response the phone never saw, or a neighbour reported it first — in both cases the map already has it.
5. **Bounded retry.** 2 s, 8 s, 30 s, 2 min, 5 min; after that `failed`, visible, and one tap from trying again.
6. **The queue is visible.** A silent retry queue is indistinguishable from a lost report.

## Server-side idempotency (shipped)

`clientKey` is stored and checked. `POST /api/incidents` looks up the key **before** the 180 m / 90 min
neighbour-duplicate rule, so a retry is recognised as itself rather than refused as somebody else's duplicate,
and the insert is protected by a partial unique index for the race where two attempts overlap.

- Column + index: `src/db/add-client-key.sql` (run **before** deploying the schema that reads it).
- Validation: `src/lib/idempotency.ts` — the app's key shape only, and an invalid or absent key is ignored
  rather than rejected, because every client that predates the queue still has to report.
- Privacy: the key is stripped by `publicIncident()`. It is a stable per-device identifier; publishing it would
  let anyone group every report sent from one phone, which is exactly the correlation the blurred pin prevents.
- Degrades safely: if the migration has not been run, the lookup notices the missing column and the route
  behaves exactly as it did before (just without idempotency) — it does not 500.

## Deliberately not done

- **A last-known map.** Caching tiles and pins needs a tile licence decision (`docs/TILES.md`, audit H3) and a
  storage budget; a stale map without an age label would be worse than no map.
- **Background sync.** iOS will not reliably run a JS queue in the background without a task registration and a
  store-review justification. Flushing on foreground covers the real case (the phone comes out of a pocket).
