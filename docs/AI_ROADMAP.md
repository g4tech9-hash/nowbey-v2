# AI roadmap — return point and opportunity backlog

_Saved 2026-10-15 so any future session can resume here. Status first, ideas second._

## ▶ RESUME HERE — where things stand

**Done (committed `2b30ce5` on `arena/2134b8f6-nowbey-v2`, pushed, no PR opened yet):**
the log pipeline the owner asked for —

- **Collect:** web crashes/boundaries/server errors (existing) + breadcrumbs (pages, taps,
  failed API calls), platform, app version, anonymous session id; Expo app now reports
  too (`expo/src/errorReporting.ts`). Server-scrubbed: paths only, tokens redacted.
- **Analyze:** Gemini auto-diagnoses each crash group — cron `/api/cron/error-analysis`
  + throttled post-report hook (`src/lib/error-ai.ts`, pure rules in `error-core.ts`).
- **Ask first:** Admin → Logs (`/admin/logs`) — Approve / Dismiss / Re-analyze.
  Approval creates ONE GitHub issue (diagnosis + evidence + checklist) for a human or
  Arena session to implement. In-app AI never edits code or deploys.
- **Verified:** typecheck ✓, lint ✓, `npm test` 29/29 (8 new), Expo typecheck ✓.
  Production build untestable in that sandbox (Google Fonts blocked; master fails
  identically) — CI gate runs the real build.

**Owner's next steps (TODO_HUMAN §0):** run `add-error-ai.sql`, set `GITHUB_TOKEN`
(Issues read/write, this repo) + `GITHUB_REPO`, schedule the error-analysis cron,
then watch Admin → Logs. **Open decision: open a PR from that branch?**

**Already-shipped Gemini uses — do not rebuild these:** news briefs + category/pin
repair (`news-ai.ts`), first-pass moderation, text + photo vision (`moderation.ts`),
Community Digest drafting (`digest/generate.ts`), log diagnosis (`error-ai.ts`).
All share `src/lib/ai.ts`, all no-op without `GEMINI_API_KEY`, all human-gated.

**Guardrails (from DECISIONS.md + docs/FIREBASE_CLOUD_AI_GROWTH_PLAN.md, still binding):**
safety alerts are never paywalled and AI never decides whether a safety warning is
true; AI output is queue/draft-only with a human gate; every AI answer must be
grounded in a source (link + timestamp) or not published; Bahamian dialect is never
a moderation problem; batch AI work, cap quotas, keep a kill switch.

## Opportunity backlog (grounded in code that already exists)

Effort: S ≤ 1 day · M ≤ 1 week · L > 1 week. Ordered within each group.

### Functionality — makes the core product smarter

| # | Idea | Builds on | Effort | Why it matters |
|---|------|-----------|--------|----------------|
| F1 | **Report intake copilot:** as a user files a report, Gemini pre-fills category/severity from their words + photo, suggests the pin from named places, and warns "this looks already reported" before submit | `moderation.ts` vision, `ingest.ts` placeFromText, 180 m duplicate rule | M | The launch goal is "report in <30 s" with good pins; bad categories/pins are the main data-quality risk |
| F2 | **Official-notice structurer:** BPL/NEMA/RBPF-style notices → structured category, parish, start/end, affected roads, source URL — queued for staff approval before becoming pins | `official.ts` NHC pipeline | M | Trust is the product; turns unstructured notices into map pins without AI ever publishing alone |
| F3 | **Photo intelligence:** suggest what a photo shows (flooding depth cue, road blocked/passable), auto alt-text, and blur faces/plates before broad display | `moderation.ts` vision safe-check | M | Photos are the strongest evidence on a pin; privacy-safe photos protect residents and NowBey |
| F4 | **Smarter duplicate clustering:** borderline text/photo similarity for reports the 180 m/90 min rule can't decide — suggestion to staff, never auto-merge | duplicate rule in `collect.ts`/report flow | M | Fewer duplicate pins and duplicate alerts as volume grows |
| F5 | **Voice + photo-only reporting:** speak or snap, Gemini drafts the report, user confirms wording before anything posts | F1 + vision; Bahamian speech accuracy must be tested with beta users first | L | Hands-busy/storm conditions are exactly when typing fails |

### Usability — makes it easier to understand and use

| # | Idea | Builds on | Effort | Why it matters |
|---|------|-----------|--------|----------------|
| U1 | **"What changed" incident summaries:** a 2-line, source-linked summary atop incidents with many updates ("Reported 2 pm, confirmed ×6, BPL truck seen 4 pm — still out") | incident updates/confirmations | S–M | Long update threads are where residents give up reading |
| U2 | **Ask NowBey (grounded search):** "Any power outages near Carmichael today?" → answers ONLY from NowBey's own incidents/news, with links; "nothing reported" is a valid answer | map/news data, `news-ai.ts` patterns | M | Natural language beats filters for non-technical users; grounding rule keeps it honest |
| U3 | **Plain-English button:** every story/incident can be re-shown in simple language (and Haitian Creole translation of official notices, human-templated) | existing Simple View + native read-aloud | S | Simple View changes typography today, not comprehension |
| U4 | **My Morning Brief:** one daily digest per alert profile — near home/work/school: active pins, what cleared, official notices | alert profiles, Digest compiler | M | Daily habit = retention; the Digest machinery already exists for partners |
| U5 | **Conversational onboarding:** "Where do you live and work?" → builds the user's alert profiles for them | alert profiles | S | Alert-profile completion is the retention lever (see growth plan metrics) |

### Revenue — only where AI adds something people already pay for

| # | Idea | Builds on | Effort | Revenue logic |
|---|------|-----------|--------|---------------|
| R1 | **Digest upgrades for the $25/mo partners:** AI-drafted parish Digest with "what changed this week", sponsor-safe local section, and a one-line delivery summary per partner | shipped Digest (DECISIONS #2) | S | Protects and justifies the first revenue line; makes manual delivery cheaper per partner |
| R2 | **Enterprise weekly ops brief:** outage/flood/crime-cluster trends, recurrence map notes, "busiest areas" — emailed PDF-style brief for utilities, resorts, HOAs, fleets | Enterprise inbox/exports, admin dashboards | M | The upsell on the B$199–999/mo Operations idea; AI writes the brief, data stays aggregated — never sell individual user data |
| R3 | **Fulfil the "Soon" Rock perks:** plain-English storm-track + marine forecast cards generated from NHC structured data (templated, source-linked) | `official.ts`, tiers.ts Rock "Soon" perks | M | Converts two promised-but-unbuilt perks into a real reason to upgrade — without paywalling the warnings themselves |
| R4 | **Island Life business tools (post-launch, flag-gated):** claimed listings get AI-drafted descriptions, hours-from-photo, and review summaries | Island Life (deferred, `FEATURE_ISLAND_LIFE`) | L | Claimed/promoted listings are the classic local-directory revenue; only after the safety MVP is stable |
| R5 | **Gas price OCR (deferred feature):** snap a station sign/receipt → extracted prices + anomaly flags for staff | Gas Tracker (deferred) | M | Crowdsourced prices stay fresh with less typing; monetizes later via station partnerships, not users |

### Enabler (do before scaling any of the above)

- **E1 · AI usage ledger + budget kill switch (S):** log model, prompt version, latency
  and estimated cost per AI call; daily cap that flips AI features to their plain
  fallbacks. Recommended in the growth plan; without it, a traffic spike is a bill.

## Suggested sequence

1. **E1** (cheap insurance) → 2. **F1** (core-loop quality) → 3. **U1 + R1** (retention
   and first-revenue, both reuse shipped machinery) → 4. **F2** (trust/B2G) →
   5. **U2** (differentiator) → 6. **R2/R3** (upsell) → F3–F5, U3–U5, R4–R5 as launch settles.

**Explicitly not recommended:** AI-generated emergency claims without sources, AI
deciding alert truth, auto-hiding content, paywalling warnings, selling precise user
location/behaviour data, or a general chatbot ungrounded in NowBey data.
