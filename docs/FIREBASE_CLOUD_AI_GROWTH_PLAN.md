# NowBey Firebase, Cloud AI & Revenue Plan

_Last reviewed: 2026-10-15_

## Executive recommendation

Keep Neon/Postgres as NowBey's system of record. Do **not** migrate working relational data to Firestore. Use Firebase for the capabilities it is strongest at—FCM delivery, Remote Config, Analytics/Crashlytics, App Check, and optionally phone authentication—while keeping reports, accounts, moderation, subscriptions, and audit data in Postgres.

The immediate business goal is a trustworthy Nassau hazard-and-news product, not maximum feature count. Reliability, alert relevance, and verified operational partnerships should precede consumer monetization.

## Priority roadmap

### P0 — launch reliability and trust (now–30 days)

1. **FCM delivery and observability**
   - Complete Android credentials and rebuild the APK.
   - Track registration, send, success, dead-token, open, and opt-out events.
   - Add a protected admin test-send tool targeted to a single device—not a broadcast button.
   - Add alert deduplication, per-device cooldowns, quiet hours, and an emergency override controlled by staff.
2. **Firebase Crashlytics** for the Expo Android app. Capture release/build identifiers and breadcrumbs, but never report precise locations, passwords, private message text, or FCM tokens.
3. **Firebase App Check** for mobile API abuse reduction. Verify App Check tokens server-side on expensive or abusable writes, initially in monitor mode and later enforced.
4. **Remote Config** for kill switches and gradual rollout. Mirror the server's Island Life/Gas gates; the server remains authoritative.
5. **Operational health**: expand health reporting into separate DB, mail configuration, push configuration, feed freshness, and cron freshness indicators. Never make health probes send real messages.

### P1 — user value and retention (30–90 days)

1. **Personalized alert relevance**: parish/category preferences, distance bands, quiet hours, and alert summaries. Use deterministic rules first; AI may summarize but must not decide whether a life-safety warning is true.
2. **Trusted-source ingestion**: NEMA, RBPF traffic notices, BPL outages, Water & Sewer, airport/port, and NHC. Show source, retrieval time, and freshness clearly.
3. **Incident clustering**: combine near-duplicate reports by time, location, and category. Start with geospatial/rule scoring; use embeddings only for borderline text similarity.
4. **Low-bandwidth mode**: compact payloads, map/list fallback, cached latest alerts, and delayed photo loading.
5. **Accessibility and language**: plain-language summaries and optional text-to-speech. Human-reviewed emergency templates are safer than free-form generative output.

### P2 — AI-assisted operations (60–180 days)

1. **Moderation copilot** (Gemini/Vertex AI): score spam, abuse, PII exposure, graphic content, and likely misinformation. Queue decisions for humans; do not auto-publish official-looking warnings.
2. **Structured extraction**: convert official notices into category, island/parish, start/end time, road/location, and source URL. Validate with schemas and retain the original notice.
3. **Daily/parish briefs**: retrieval-grounded summaries with links and timestamps. If grounding is insufficient, publish no AI summary.
4. **Photo assistance**: detect likely flooding/road obstruction and redact faces/license plates before broad display. Explicitly label machine-generated assessments.
5. **Operator forecasting**: trend anomalies (report volume, outage clusters, flood recurrence) for the admin desk, never as an unsupported public prediction.

## Revenue model

### Best first revenue: B2B/B2G, not intrusive emergency ads

1. **NowBey Operations**: B$199–999/month by organization for a live incident dashboard, parish filters, exports, response notes, and service-level alerting. Targets: property managers, resorts, marinas, delivery fleets, insurers, utilities, and local government.
2. **Sponsored verified service updates**: fixed monthly placements from vetted towing, hardware, generator, water, pharmacy, or shelter partners. Ads must be visually distinct and never appear to be safety endorsements.
3. **Data/API licenses**: aggregated, delayed, privacy-preserving trend feeds. Never sell precise user location, contact information, device tokens, or individual behavior profiles.
4. **Consumer Plus**: B$3.99–6.99/month for multiple saved zones, family alert groups, longer history, advanced quiet hours, and ad-free use. Core emergency alerts stay free.
5. **Event/venue tools** after the Nassau hazard MVP is stable: claimed profiles, verified operating status, menu/event updates, and promoted listings.

## Unit economics and guardrails

- Put quotas around every paid cloud API. Cache geocodes, batch AI work, and use cheaper models for classification before escalating uncertain cases.
- Record provider, model, prompt version, latency, token usage, and estimated cost for each AI operation.
- Set hard daily budgets and kill switches in Remote Config/server settings.
- Do not place ads inside emergency notices or make timely safety information paywalled.
- Obtain Bahamian legal/privacy review before selling data or onboarding government/insurance customers.

## Architecture principles

- **Postgres/Neon**: source of truth and transactional data.
- **Firebase**: delivery, mobile quality, abuse attestation, analytics, controlled rollout.
- **Object storage/CDN**: photos and generated thumbnails; avoid keeping large image binaries in Postgres long term.
- **Cloud AI**: asynchronous assistant with provenance and human review, never the authority for emergency facts.
- **Privacy**: collect the minimum, define retention, support deletion/export, aggregate analytics, and separate operational identity from public handles.

## Success metrics

- Push: delivery success, median incident-to-notification time, open rate, opt-out rate, dead-token rate.
- Trust: confirmed/cleared ratio, duplicate rate, correction rate, moderation response time, official-source freshness.
- Retention: weekly active residents, alert preference completion, 4-week retained users.
- Revenue: qualified organization pilots, conversion, monthly recurring revenue, gross margin, and churn.
- Safety: zero AI-authored emergency claims without source links; zero paid placements confused with official notices.
