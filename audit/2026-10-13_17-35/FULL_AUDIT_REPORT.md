# FULL AUDIT REPORT — NowBey V2

| | |
|---|---|
| **Audit run** | 2026-10-13 17:35 local |
| **Directory audited** | `C:\Users\Admin\Downloads\nowbeyV2` |
| **Git revision** | `11d0d250f454f63062c1f5f830710622f08f7ee3` (branch `parity-mobile`, commit `11d0d25` "checkpoint before parity + mobile work", 2026-10-13 15:59 -0400) |
| **Working tree** | Clean except untracked `task.txt` and this `audit/` folder. No source files were modified. |
| **Toolchain** | Node v24.21.0, npm 11.19.0, Next.js 16.4.0 (Turbopack), React 19.2.6, TypeScript 5.9.3, Tailwind 4.1.17, Drizzle ORM 0.45.2, Stripe 23, Leaflet 1.9, Expo SDK 57 (mobile companion) |
| **Reports** | `FULL_AUDIT_REPORT.md` (this file), `PRIORITIZED_BACKLOG.csv`, `VERIFICATION_LOG.md`, `PARTNERSHIP_PITCHES.md`, `evidence/` |

---

## 1. Executive summary (plain English)

NowBey is a genuinely good idea with unusually careful engineering in its security-critical paths — and one defect that currently stops the whole thing from running. **The app does not build and does not boot** in the state audited: `next.config.ts` declares the same variable twice (lines 13 and 35), which crashes `next build` and `next dev` with a `SyntaxError` before a single page is served. Everything else in this audit is second to fixing that.

Beyond the build break, the project is a feature-rich MVP for The Bahamas: residents pin floods, outages, road hazards and safety incidents onto a live map (no account needed to read), neighbours confirm them, a scraper ingests 11 Bahamian news outlets into a local "Wire", verified email alerts notify people by island and category (with an optional geofence), and an "Island Life" section collects restaurant/beach/event reviews with shared place listings. There is a Stripe-based ad-free subscription (Conch $10.80 / Rock Sound $18 / Admiral $24 per month, yearly = 10×), an admin console with audit logging, and a slim Expo companion app.

Three classes of issues stand between this and a public launch:

1. **The P0 build break** (NB-001), introduced in today's HEAD commit — verified twice, at build and at dev start.
2. **Fabricated data presented as real** (NB-002, NB-003, NB-017): a cron job writes invented brand-specific fuel prices (Shell/Esso/Rubis) into the member-reported gas table, and the "ads" shown to users are invented businesses. For a trust product in a small market, this is reputationally fatal if it ships. It also silently corrupts the gas typo-guard.
3. **Launch hygiene gaps**: no CSP header, no automated tests or CI gates, an unverified payment path for Bahamian merchants, and rate limiting that is per-process and (suspected) bypassable via a spoofed `X-Forwarded-For`.

None of the findings require a rewrite. The foundations — auth, authorization, IDOR checks, Stripe idempotency, CSV escaping, DOMPurify use — are better than most MVPs. Fix the build, purge the invented data, add the missing gates, and this is launchable to a Family Island pilot within weeks.

---

## 2. What the app does and its current maturity

**Product.** A resident-reported situation map plus local news wire for The Bahamas. Tagline on the homepage: *"What is actually happening, street by street."* Core loops: report a pin → neighbours confirm → alerts go out by island/category → staff moderate the wire → subscribers pay to remove ads and unlock extra alerting.

**Who it serves.** Residents (read without an account; report with or without one), Family Island households (parish-first alerts, storm overrides), visitors (map + Island Life), local businesses (Island Life listings, ad slots, enterprise inquiries), and staff (moderation + member management).

**Core modules (verified in source).**
- Incidents: pin with lat/lng forced inside The Bahamas (`inBahamas`), parish whitelist, categories, severity 1–4, anonymous mode, confirmations with per-actor dedupe.
- Wire: RSS ingest of 11 real Bahamian outlets + `NEWS_FEEDS` env feeds, Google News fallback per outlet, offline gazetteer geocoding of headlines, junk-title filtering, URL de-duplication, self-healing refresh when stale (>20 min).
- Alerts: double-opt-in email subscriptions (token + hashed token, 7-day expiry), island/category filters, optional geofence centre + radius, 3-minute per-subscriber cooldown, storm override for Rock Sound/Admiral, working unsubscribe.
- Island Life: posts (food/event/beach/night/tip), ratings, shared `places` with hours/menu/contact, photos stored as `bytea` in Postgres served via authenticated-aware routes, comments (one reply level), reactions, per-actor flags.
- Gas tracker: member price reports with median typo-guard, B$/gallon display.
- Accounts & billing: custom scrypt auth, email verification, password reset, suspension, session versioning (sign out everywhere), Stripe checkout with server-side pricing, webhook with signature verification and idempotency, billing portal management, demo/"sandbox" plan mode when no provider is configured.
- Admin: users (roles/suspend/comp plans/reset links), reports, wire, community, comments, inbox (enterprise inquiries), activity log, appearance settings.
- Mobile: Expo app with tabs (gas/life/map/report/wire/you), bearer-token auth, token in `expo-secure-store`, configurable server URL.

**Maturity.** High for an MVP in breadth; the security core is mature; the operational layer (tests, CI, config hygiene, monitoring) is early. **Not deployable today** (NB-001). 171 source files in `src/`, 27 in `expo/`.

---

## 3. Launch-readiness assessment

**Verdict: NOT READY — blocked.** One blocker plus contracted content that would damage trust.

| Gate | State | Evidence |
|---|---|---|
| Production build | ❌ FAILS | `SyntaxError: Identifier 'nextConfig' has already been declared` (NB-001) |
| Dev server boot | ❌ FAILS | Same error, verified at runtime (evidence/build-failure.log) |
| Typecheck | ❌ FAILS | 3 errors incl. the duplicate (NB-001, NB-013) — yet `ignoreBuildErrors: true` would have hidden them |
| Lint | ✅ PASS | `npx eslint .` → exit 0, zero findings |
| Tests | ⚠️ NONE EXIST | No test script/framework; CI builds only the APK (NB-012) |
| Runtime smoke | 🚫 BLOCKED | Cannot boot; would also risk prod DB — not attempted (VERIFICATION_LOG) |
| Payments | ⚠️ UNVERIFIED | Stripe wiring is correct code-wise, but Bahamian merchant eligibility is unverified (NB-016); demo mode exists |
| Content integrity | ❌ FAILS | Invented gas prices + invented advertisers ship as if real (NB-002/003/017) |
| Security headers | ⚠️ PARTIAL | Good baseline set; CSP missing (NB-004) |
| Secrets handling | ✅ PASS | `.env` untracked, no secrets in git history, `AUTH_SECRET` enforced in production |

**Honest limitation:** because the app does not boot, no browser-based UI/UX or accessibility verification was possible. All UI statements below are source-based and labeled as such.

---

## 4. Highest-priority risks and opportunities

1. **NB-001 (Critical/P0)** — Build and dev are dead; any deploy from HEAD fails. One-line-class fix.
2. **NB-002 (High/P0)** — Invented fuel prices displayed as member reports; corrupts the median guard. Silence or replace the cron immediately.
3. **NB-016 (High/P0, monetization)** — If Stripe cannot pay out to a Bahamian entity, the entire paid tier needs a different processor or a pre-order/enterprise-only model. Unverified this run; must be confirmed in writing before charging anyone.
4. **NB-004 (High/P1)** — No CSP on a user-generated-content app.
5. **NB-003 (Medium/P1)** — Invented advertisers shown as "Promoted".
6. **NB-012 (Medium/P1)** — No tests/CI gates: today's build break is exactly what gates prevent.
7. **NB-006 (Medium/P1, suspected)** — Leftmost `X-Forwarded-For` trusted → rate-limit/anonymity bypass on Vercel.
8. **Biggest opportunity:** the product solves a real, sharp Bahamian problem (island-by-island situational awareness during storms/outages) with a trust-first posture and an existing paid tier. That is the asset — protect it with content integrity, then partner with agencies and utilities around it.

---

## 5. Architecture and core user journeys

**Architecture.** Next.js 16 App Router, all pages `force-dynamic`; server components query Postgres (Neon) through Drizzle; cookies carry an HMAC-signed session token (mobile uses `Authorization: Bearer`); photos are `bytea` in the database (deliberate: nothing extra to host/back up); maps are Leaflet client components; email via Resend or SMTP; Stripe for subscriptions; a custom lightweight middleware (`src/proxy.ts`) converts malformed `%` escapes into clean 400s.

**Journey 1 — Report a hazard (anonymous, ~20 seconds).** `/report` → drag pin → title/category/severity → POST `/api/incidents` (rate-limited 15/hr/IP, geofence verified, handle from session never from body) → 201 → alert fan-out in `after()` → appears on `/` and `/map`; neighbours confirm via `/api/incidents/[id]/updates` with per-actor dedupe; staff can resolve/archive.

**Journey 2 — Subscribe to alerts.** `/alerts` → email + islands + categories (+ geofence) → confirmation email (double opt-in, 7-day expiry) → alerts fire on severity ≥2 incidents in matching parishes, 3-minute cooldown, unsubscribe link in every email (verified token-based delete endpoint).

**Journey 3 — Read the wire.** Homepage calls `refreshIfStale()`-style ingest when newest story is >20 min old (also a manual refresh on `/wire`); auto-approved stories are listed, click-through to the outlet; editors can flag an alert from `/admin/wire`, which fans out as a news alert.

**Journey 4 — Subscribe to ad-free.** `/support` plan cards → POST `/api/billing/checkout` (server prices, existing-customer reuse, comp/demo guards) → Stripe Checkout → webhook (`checkout.session.completed` gated on `payment_status`, subscription events) → `users.plan*` fields updated idempotently; management via `/api/billing/manage` portal; demo mode grants a sandbox plan when no keys.

**Journey 5 — Island Life post.** Sign in → `/life/new` → text + optional photos (re-encoded to JPEG on upload) → post; shared `places` editable; comments/reactions/flags; staff moderation in `/admin/community`.

---

## 6. Inspection and test coverage matrix

| Area | Coverage | Notes |
|---|---|---|
| Auth core (`auth.ts`, `password.ts`, session route) | **Reviewed** | scrypt + timing-safe compare + decoy hash; versioned sessions; secure cookies |
| Authorization (`viewer.ts`, `staff.ts`, `actor.ts`) | **Reviewed** | DB re-check per request; suspend/version revocation; staff gate |
| Incidents API + geofence/geo lib | **Reviewed** | bbox check, parish whitelist, like-escape, limit clamps |
| Alerts (subscribe/verify/dispatch) | **Reviewed** | double opt-in, cooldown, cooldown/updates, memory-scaling issue NB-008 |
| Billing (checkout/webhook/manage/tiers) | **Reviewed** | signature verify, idempotency, payment gating, server pricing |
| Gas (page/API/board/cron) | **Reviewed** | validation good; cron content fabricated (NB-002) |
| Island Life + places + comments + photos + flags | **Reviewed (API contracts)** | ownership checks on delete/photo visibility; CSV/DOMPurify good |
| News ingest + wire rendering | **Reviewed** | sanitized renders; auto-approve (NB-009); fetch allowlist (NB-011) |
| Admin routes (users, settings, community, wire…) | **Sampled** | users route deep-read; others assumed same `requireStaff` pattern — not exhaustively verified |
| Frontend components (map, forms, nav, shell) | **Sampled** | source patterns only; no browser pass possible (P0) |
| Expo mobile app | **Sampled** | token storage and auth pattern read; runtime parity not exercised |
| SQL files (schema, migrations, seed) | **Sampled** | migrations exist for geofence/engagement/security; not diffed against live schema |
| Existing docs (`AUDIT.md`, `README`, `NOTES`, `PROGRESS`, `CLAUDE/AGENTS`) | **Sampled** | context only |
| `node_modules`, `.next`, `out/`, build output | **Excluded** | vendor/generated |
| Lint | **Executed** | PASS |
| Typecheck | **Executed** | FAIL (3) |
| Build | **Executed** | FAIL |
| Dev runtime + browser UI/AX | **BLOCKED** | P0 prevents boot; would also touch prod DB |
| Dependency vulnerability scan | **BLOCKED** | no `npm audit` run this pass (budget); flagged for the 30-day plan |
| External verification (Stripe country support, providers) | **BLOCKED** | web search unavailable this run — claims labeled unverified |

---

## 7. Detailed findings and recommended fixes

Severity/priority/status per finding; full acceptance criteria in `PRIORITIZED_BACKLOG.csv`.

### NB-001 — Duplicate `nextConfig` breaks build and dev — **Critical / P0 / Confirmed**
- **Where:** `next.config.ts:13` and `next.config.ts:35`.
- **Evidence:** `npx next build` → `SyntaxError: Identifier 'nextConfig' has already been declared`; `npx next dev` → identical failure after "Ready". Introduced in HEAD `11d0d25`; `HEAD~1` had a single declaration. (evidence/build-failure.log)
- **Impact:** No deployment possible; the previously deployed build on Vercel (`nowbey-v2.vercel.app`) is now un-reproducible. Every other fix in this report is blocked behind it.
- **Root cause:** A copy-paste merge where the second block also carries the only `redirects()` (`/life` → `/life/places`).
- **Fix:** Keep one `const nextConfig`; merge the redirects into it; delete the duplicate.
- **Effort:** S (minutes). **Regression test:** `npm run build` exits 0 in CI; `/life` 308s to `/life/places`.

### NB-002 — Cron writes invented gas prices shown as member reports — **High / P0 / Confirmed**
- **Where:** `src/app/api/cron/gas-update/route.ts:19–35` (hardcoded Shell 7.08 / Esso 7.50 / Rubis 7.56); displayed via `src/lib/gas.ts:34–56`; `src/app/gas/page.tsx:22–40`; skews `src/app/api/gas/route.ts:40–49` median guard.
- **Impact:** Users see fabricated brand prices as if neighbours reported them; a brand could object; the typo-guard anchors on fake medians. This is the single most damaging trust defect after the build.
- **Fix:** Stop the cron writes (or gate behind a `GAS_CRON_SOURCE` that must be a real feed); delete fabricated rows; if a reference price is wanted, label it with source + date (see NB-017).
- **Effort:** S. **Acceptance:** board contains only member reports or a clearly labeled, sourced reference; a test asserts no system-invented stations.

### NB-016 — Payment processor eligibility for Bahamian merchants unverified — **High / P0 / Suspected (external)**
- **Where:** `src/lib/billing.ts` (Stripe), `src/app/api/billing/checkout/route.ts:38–44` (demo mode when unconfigured).
- **Impact:** If no Stripe account can be opened for a Bahamian entity with settlement in USD/B$, the paid tier cannot launch as designed; USD list prices also assume card spend in USD.
- **Fix:** Verify `stripe.com/global` country support in writing; evaluate one alternative that onboards Bahamian merchants and settles in USD or B$ (and accepts local cards); keep the honest demo mode until then; never charge on an unverified path.
- **Effort:** S (research) + M (swap if needed). **Status note:** web verification was unavailable during this run — treat all provider claims as unverified.

### NB-004 — No Content-Security-Policy — **High / P1 / Confirmed**
- **Where:** `next.config.ts:6–11` (baseline headers only).
- **Impact:** News summaries already pass through DOMPurify and posts render as React text, so XSS risk is contained — but there is no second line of defense, and inline boot scripts (theme/splash) require a nonce strategy.
- **Fix:** Add CSP (with nonce for the two inline scripts in `src/app/layout.tsx:48–49`), start report-only, tighten.
- **Effort:** M. **Acceptance:** header on HTML responses; zero new violations after a week.

### NB-003 — Invented advertisers shown as "Promoted" — **Medium / P1 / Confirmed**
- **Where:** `src/components/ad-slot.tsx:4–29`.
- **Fix:** Book real sponsors or relabel to clearly internal promos ("From NowBey") until then; add a sponsor record over time. Effort S.

### NB-006 — `clientIp` trusts leftmost `X-Forwarded-For` — **Medium / P1 / Suspected**
- **Where:** `src/lib/ratelimit.ts:11–13`; consumers: signup limit, login-fail counters, report/gas/alert limits, `src/lib/actor.ts:9`.
- **Impact:** On Vercel the proxy appends the true client IP, so the leftmost entry is attacker-controlled → limit evasion and throwaway anonymous identities for flag/confirm dedupe.
- **Fix:** Take the rightmost hop (or `x-real-ip` from the edge) for the trusted client IP; verify with a forged-header test on the real deployment. Effort S.

### NB-008 — Alert fan-out loads all subscribers + per-row updates — **Medium / P1 / Confirmed**
- **Where:** `src/lib/alerts.ts:26–36` (unbounded select), `:94` (one UPDATE per email).
- **Fix:** Batch subscribers (e.g., 500), batch `lastSentAt` updates; add a size guard/log. Effort M.

### NB-009 — Scraped news auto-approved — **Medium / P1 / Confirmed**
- **Where:** `src/lib/ingest.ts:363` (`review: "approved"`).
- **Impact:** Any headline from an ingested feed (including Google News fallback) publishes instantly under NowBey's brand with no editorial gate; one defamatory/incorrect item becomes a trust incident.
- **Fix:** Default new/untrusted sources to `pending`; keep an allowlist for established outlets. Effort S.

### NB-012 — No tests, no CI gates — **Medium / P1 / Confirmed**
- **Where:** `package.json` (no test script), `codemagic.yaml` (APK build only).
- **Fix:** Gate on typecheck+lint; add a Playwright smoke against an ephemeral DB. Effort M.

### NB-015 — Production env checklist unverified — **Medium / P1 / Confirmed (gap)**
- Local `.env` sets only DB/Neon values. `AUTH_SECRET` is *enforced* in production by code (`auth.ts:19–21`) — good — but `APP_URL`, `CRON_SECRET`, `ENTERPRISE_NOTIFY_TO`, `ADMIN_HANDLES`, Stripe and mail keys must be confirmed in Vercel; without `APP_URL`, alert links silently disable (`billing.ts:44–52`). Effort S.

### NB-013 — Typecheck broken; build type errors suppressed — **Medium / P2 / Confirmed**
`capacitor.config.ts:1` imports `@capacitor/cli`, which no manifest declares; `ignoreBuildErrors: true` (`next.config.ts:15–17`) hid NB-001 from being a *type* error. Fix: remove capacitor config or add the deps; re-enable error surfacing once CI gates. Effort S.

### NB-017 — "Government price" without source — **Medium / P2 / Confirmed**
`gas/page.tsx:25` renders env-driven `officialPrices()` as "Government price". Relabel as sourced reference price or remove. Effort S.

### NB-005 — Framing allowed by design — **Medium / P2 / Confirmed (deliberate)**
`next.config.ts:4–5`. CSRF is mitigated (SameSite=Strict + origin checks), but add `frame-ancestors` for known preview origins. Effort S.

### NB-007 — In-memory rate limiter — **Medium / P2 / Confirmed (documented)**
Per-process limits reset on cold start and don't span instances (`ratelimit.ts:5–7`). Acceptable for MVP; move to Postgres/KV if abuse appears. Effort M.

### NB-014 — Re-auth & data-subject rights unverified — **Medium / P2 / Not verified**
Account lifecycle routes (`/api/account/*`, `src/lib/account.ts`) weren't read this pass. Require current password for password/email change and deletion; provide full data export + deletion; get Bahamian data-protection guidance from a professional. Effort M. **Not verified — listed as work, not a finding of defect.**

### NB-010 — Plaintext alert token retained — **Low / P3 / Confirmed**
`api/alerts/route.ts:102–116` writes both `token` and `tokenHash` for legacy stop links. Migrate to hash-only. Effort S.

### NB-011 — Ingest fetches arbitrary feed-item URLs — **Low / P3 / Confirmed**
`ingest.ts:328` (bounded: 60 KB, timeouts). Add private-range deny-list. Effort S.

### NB-018 — Mobile parity unverified — **Low / P2 / Not verified**
Run the Expo app against staging after NB-001. Effort M.

**Positives worth preserving (verified):** session versioning + suspension checks; origin checks on mutations; server-side Stripe pricing with `payment_status` gating and idempotent webhook handling; ownership checks on photos/exports/posts; CSV formula-escaping; DOMPurify on the only HTML-injection surface; `.env` never committed; production `AUTH_SECRET` enforcement; working double-opt-in with unsubscribe; clean lint.

---

## 8. UI/UX and accessibility recommendations (source-based — **unverified visually**)

The app could not be booted (NB-001), so no screenshots exist and nothing below is a verified visual finding. From source review, the design system is coherent (tokens, `glass` surfaces, responsive grids `lg/md` breakpoints, empty states on home/gas/life, mobile-first scroll rails). Recommendations:

1. **Verify the core promise in 5 seconds on a 3G Family Island connection (UX-1).** Homepage currently issues ~6 queries (incidents, recent, wire, life, badges, engagement) plus Leaflet tiles. Add skeletons and a measured performance budget; verify LCP on throttled CPU.
2. **Report flow proof-of-submission (UX-2).** After a pin is filed, the confirmation should show the pin appearing on the map and what happens next (confirmation, alerts). Source review suggests a 201 + toast; confirm the "what happens next" copy exists.
3. **Forms & errors (UX-3).** Handles/emails/passwords give specific messages (good). Check the reset/verify email states render resend affordances, and that 429 responses from the limiter are human-readable everywhere (`tooMany` is).
4. **Accessibility pass required once bootable (A11Y-1).** Run axe + keyboard-only + screen reader on home, map, report, alerts, sign-in, life/new against WCAG 2.2 AA. Known risks to check: Leaflet controls (focus, keyboard pan/zoom), the splash-screen overlay (focus trap, `prefers-reduced-motion`), color contrast of sand/tide tokens on `abyss` backgrounds (look adequate; must be measured), and the ad/plan CTA touch-target sizes (many `text-[11.5px]` links — check ≥24 px targets).
5. **Low-data mode (UX-4, links FEAT-05).** Aerial tiles + bytea photos are heavy; provide a data-saver toggle and defer offscreen media.

---

## 9. Bahamas-specific product assessment

**Strengths (verified in code):**
- Parish-first model with a whitelist; incidents forced inside the Bahamas bounding box (`inBahamas`), parish resolved from coordinates.
- Offline gazetteer geocoding (~Bahamian place names/aliases with whole-word matching, deliberately ambiguous names excluded) — no paid geocoder dependency, works for Family Islands.
- Double-opt-in alerts with island/category/geofence granularity and 3-minute cooldown; storm override as a paid perk maps to real hurricane-season behavior.
- B$/gallon conventions and a typo-guard against wild price entries.
- No-account read access on the map and wire — important for visitors and low-friction adoption.
- Expo companion with secure token storage and a configurable server URL (usable by Family Island users behind varied networks).

**Gaps and risks:**
- **Content integrity (NB-002/003/017):** in a small market, invented data is not a placeholder — it will be believed. This is the top product-specific risk.
- **Connectivity/cost:** no offline mode; map tiles + photos are data-heavy; consider data-saver and island-viewport caching (FEAT-05).
- **Channel reality:** email-only alerts today; SMS/WhatsApp are "soon" perks. Bahamian alerting during outages needs SMS — verify a BS-reachable provider (FEAT-03) and its per-message cost.
- **Location entry:** pin-drag is good; verify street/address auto-complete exists or add a free-text fallback plus landmark search from the gazetteer.
- **Language:** English throughout — appropriate; consider Bahamian dialect in microcopy where it builds trust (test with users).
- **Legal/regulatory (label: requires professional review, unverified):** privacy/data protection obligations under Bahamian law (including the Data Protection (Privacy of Personal Information) Act framework), consumer protection for paid subscriptions, and any rules on publishing crime/incident allegations about identifiable people. Do not rely on this report for compliance.

---

## 10. Feature opportunities (ranked, ≤5)

1. **FEAT-02 — Storm Season Hub.** Official watches/warnings + shelter/road-closure info aggregated from named public sources (to be verified), pinned island-wide and pushed to all subscribers regardless of filters. Fit: the ingest + alert machinery already exists; the paid "storm" perk is advertised but unbuilt. Effort M. Metric: % of storm advisories surfaced <15 min during drill. **Confidence: medium-high** (mission-aligned; source verification required). Validation: 15 interviews with Family Island residents + NEMA-adjacent staff.
2. **FEAT-01 — Verified Places with business claims.** The `places` table already models hours/menu/photos/contact; let owners claim listings via verified email/phone + staff approval. Effort M. Metric: claimed listings & weekly views. Validation: 10 business interviews; concierge-claim the first 20 places manually.
3. **FEAT-05 — Low-data mode.** Cache-first maps, deferred photos, lighter home for slow connections. Effort M. Metric: LCP/transfer on throttled profile. Confidence: high for Bahamian reality. Validation: field test on one Family Island.
4. **FEAT-04 — Verified responder accounts.** Distinct role/badge for utilities, agencies, community groups so official updates are visually separated from resident reports. Effort M (needs partnerships). Metric: official corrections resolution time.
5. **FEAT-03 — SMS/WhatsApp alerts.** The `channel` column exists; route currently rejects non-email. Effort M, recurring cost per message. Validation: cost-per-reached-user test with one provider.

Deliberately postponed: social graph, chat, marketplace transactions, an open API — none are needed for the mission now.

---

## 11. Monetization options and preferred approach

**Fit check against the product:** the value users already pay attention to is (a) situational awareness during storms/outages, (b) alerts, (c) local discovery (Island Life). Ads conflict least with the mission; subscriptions monetize the storm-season anxiety that is already the core use case; enterprise monetizes verification and teams.

**Preferred model — layered, launch in this order:**
1. **Sponsorships/house promos (now).** Replace invented ads (NB-003) with clearly labeled "From NowBey" promos (plans, alerts, Island Life) at zero cost; then sell two pilot sponsorships on the wire/map rail to Bahamian businesses. Trust-preserving when labeled.
2. **Individual ad-free + storm alerting subscriptions (next).** Existing Conch/Rock Sound/Admiral tiers are sensibly priced for a diaspora-adjacent market. **Gate on NB-016:** do not charge until provider eligibility and settlement are confirmed in writing. Keep the honest demo mode until then.
3. **Enterprise/agency contracts (parallel).** Verified responder accounts, team seats, branded placement — invoiced, B2B, no card-processing dependency. This can be the first real revenue if Stripe is unavailable.

**Unit economics (hypothetical, labeled):** per-subscriber monthly contribution ≈ price − processing (≈2.9% + $0.30 for cards) − hosting/email share. Example: 500 Conch subscribers ≈ $5,400/mo revenue − ~$190 processing − ~$120 combined Vercel/Neon/Resend share − support time (say 0.2 FTE at $2,000/mo) ≈ **$3,000+/mo gross contribution** — *illustrative only; no demand is assumed*. Actuals require conversion validation.

**Explicitly rejected:** selling personal data, deceptive subscriptions, paywalling emergency information, and dark-pattern ad-free upsells during a storm (recommend a documented "storm amnesty" policy: core alerts stay free during active advisories).

---

## 12. Partnership readiness

See `PARTNERSHIP_PITCHES.md` for the government pitch, corporate pitch, a 60–90-day pilot proposal, partner shortlist, and outreach emails. **Readiness: not yet.** Before any outreach: NB-001 (build), NB-002/003/017 (content integrity — the gas and ads fabrications would end a meeting with a fuel retailer or agency), NB-015 (env), and a moderation policy. Demonstrable now: the map, wire, alerts, admin, subscription machinery, mobile app shell.

---

## 13. Roadmap (conditional on ~1 full-time engineer; adjust for staffing)

**Immediate (days 0–3):** NB-001 build fix; NB-002 stop/clean fabricated gas data; NB-016 written confirmation of payment path (or documented fallback); NB-015 env audit; NB-003 relabel ads. *Unblocks everything.*

**30 days:** NB-004 CSP; NB-012 CI gates + smoke test; NB-006 XFF fix; NB-008 alert batching; NB-009 ingest moderation default; NB-013 typecheck green; NB-017 gas labeling; NB-005 framing policy; axe/WCAG pass; run a dependency vulnerability audit (`npm audit` triage).

**90 days:** NB-014 lifecycle/re-auth + data export/delete with legal review; FEAT-05 low-data mode; FEAT-02 storm hub MVP with verified sources; first sponsor pilots; first enterprise pilot (FEAT-01 claims); mobile parity verification; publish a public status/transparency page (moderation stats) as a trust signal.

---

## 14. Release acceptance checklist

- [ ] `npm run build` and `npm run dev` succeed from a clean clone; `npm run typecheck` exit 0; `npm run lint` exit 0.
- [ ] No fabricated content anywhere user-visible (gas, ads, wire) — content-integrity review signed off.
- [ ] Env verified in production: `AUTH_SECRET`, `APP_URL`, `CRON_SECRET`, `ADMIN_HANDLES`, mail, Stripe (if eligible).
- [ ] Stripe webhook replay/idempotency tested with the Stripe CLI in test mode; `payment_status` gating verified.
- [ ] CSP + framing policy in place; origin checks verified on all mutating routes.
- [ ] Rate limits verified on the real deployment (forged XFF test).
- [ ] Alerts: opt-in → confirm → receive → unsubscribe flow passes end-to-end in staging.
- [ ] Accessibility: axe clean on core pages; keyboard-only pass; reduced-motion respected.
- [ ] Rollback: previous Vercel deployment pinned; migration steps documented (no destructive SQL auto-run).
- [ ] Privacy/terms pages reviewed by a professional; data export/delete available.

---

## 15. Assumptions, blockers, and unverified areas

- **Assumed:** production target is Vercel (`nowbey-v2.vercel.app` in bot UA and Codemagic config); `HEAD~1` config was the last-known-good build; Expo app mirrors web features (sampled only).
- **Blockers:** build/dev boot (NB-001) blocked all runtime verification; web search unavailable blocked external fact checks (Stripe country support, Regulator sources, SMS providers) — all such claims are labeled unverified; running against the live Neon DB was refused by policy, so no prod data was read or changed.
- **Not verified:** live schema vs. migrations; all admin routes; full account lifecycle; mobile runtime parity; performance under load; dependency vulnerabilities (no audit run).
- **No claims of exhaustiveness:** this is a risk-based audit; absence of a finding is not proof of absence.

---

## 16. If this were my company — decisive action plan

1. **Today:** merge the duplicate `nextConfig` into one block, redeploy, confirm the site serves. Nothing else matters until this is done (NB-001).
2. **This week:** delete the fake gas cron and the fake advertisers; replace with clearly-labeled internal promos or sourced data. Protect trust before growth (NB-002/003/017).
3. **This week:** confirm in writing whether we can actually get paid as a Bahamian company (Stripe or alternative). If not, pivot the revenue plan to enterprise/sponsorships and keep subscriptions in honest demo mode (NB-016).
4. **Next two weeks:** CI gates (typecheck/lint/build) + a smoke test; CSP; fix the XFF trust bug; ship the ingest moderation default (NB-012/004/006/009).
5. **Next 60 days:** run one 90-day pilot with a Family Island community and one utility or agency; build the Storm Season Hub from *verified* official sources; set the public transparency page up as the trust signature. Growth after that — not before.

**Mission guardrail:** alerts and emergency information stay free and public, always. Monetization rides on convenience, reach, and brand-safe sponsorship — never on gating safety.
