# NowBey V2 – Full Audit Report

**Audit directory:** `C:\Users\Admin\Downloads\nowbeyV2\audit\2026-10-13_18-42`
**Repository:** `C:\Users\Admin\Downloads\nowbeyV2`
**Revision (HEAD):** `11d0d250f454f63062c1f5f830710622f08f7ee3` ("checkpoint before parity + mobile work")
**Working tree:** one untracked file at run start: `task.txt` (unrelated audit instruction). No app source changes were made during this audit.
**Run type:** static/source risk-based audit plus local build/typecheck/lint/npm audit. No production database access or live service calls.
**Supported/linked files:** `PRIORITIZED_BACKLOG.csv`, `VERIFICATION_LOG.md`, `PARTNERSHIP_PITCHES.md`.

## 1. Plain-English executive summary

NowBey V2 is a community safety and local-information platform, not a generic template. Its job is to let Bahamian residents see and report street-level incidents (floods, outages, road damage, safety hazards), read Bahamian news, find places and venues, track gas prices, and get parish-based alerts. It supports anonymous reading/reporting and optional accounts, with a paid "ad-free" tier and an Enterprise enquiry form.

The repository is in a **not launch-ready** state from an engineering standpoint because **the web production build currently fails**. The failure is a simple syntax error in `next.config.ts`: `nextConfig` is declared twice. Until that is merged, there is no deployable web artifact. Type checking also fails because the web TypeScript project includes an unused Capacitor configuration that imports a module not present in the web dependencies. These are small fixes, but they are release blockers.

Outside that immediate blocker, the codebase has meaningful security engineering in some areas: password hashing with scrypt, constant-time session signature checks, hashed account tokens, idempotent Stripe webhook handling, origin checks on mutations, cron secret guards, and sanitized RSS HTML. The main remaining risks are configuration hygiene (production database credentials present in a local `.env`, expired/short-lived Vercel OIDC token file), preview-friendly security headers (no frame-busting/CSP by design), clients trusting forwarded IP headers, optional/demo plan entitlements if Stripe is not configured, and the complete absence of automated tests.

The product fit for The Bahamas is plausible and coherent: island-specific filters, geocoding bounded to The Bahamas, parish-level alerts, and public-access reporting. Monetization should remain transparent and optional: ad-supported free access, optional individual ad-free/convenience tiers, and institutional/community partnerships. It should not sell personal data or make safety information paywalled.

## 2. What the app does and its current maturity

- **Core value proposition:** real-time, neighbour-verified, street-level incident intelligence plus local news, places and gas information for Bahamian communities.
- **Front end:** Next.js 16 App Router, React 19, Tailwind 4, Leaflet.
- **Mobile:** separate Expo/React Native app (`expo/`) that calls the same API with bearer tokens.
- **Data:** PostgreSQL (Neon in local `.env`), Drizzle ORM schema, 171 web source files.
- **Auth:** custom HMAC-signed stateless session tokens, password hashing, email verification/reset, session versioning, rate limiting.
- **Payments:** Stripe Checkout/Webhooks for optional consumer tiers and Enterprise enquiries.
- **Maturity indicators present:** comments/reactions, moderation/admin tooling, audit logs, place import, cron routes, security hardening migration.
- **Maturity gaps:** no automated tests; build/typecheck failure; several promised premium capabilities explicitly marked "Soon"; gas cron uses static/mock prices; mobile builds depend on EAS and restructure notes.
- **Overall maturity:** mid-stage feature-rich application with strong domain logic but weak release discipline.

## 3. Launch-readiness assessment with evidence and limitations

**Result: Not launch-ready** (web build blocked).

Evidence:
- `npm run build` failed with `SyntaxError: Identifier 'nextConfig' has already been declared` (`next.config.ts:13` and `:35`) (see `VERIFICATION_LOG.md`).
- `npm run typecheck` failed (`capacitor.config.ts:1` cannot find `@capacitor/cli`).
- Lint passed.
- No automated tests in app source.
- Security-sensitive environment files exist locally but are currently gitignored.

**Limitations:** no runtime smoke test was performed because it would connect to the configured production PostgreSQL database and potentially charge/send notifications; policy prohibits this. Visual/accessibility findings are source-based or based on code only and are labeled unverified.

## 4. Highest-priority risks and opportunities

Risks:
1. **P0 build blocker** (F-001).
2. **Credential/contact exposure risk** in local environment files and historical notes (F-008).
3. **No test safety net** (F-010).
4. **Demo plan entitlement** if deployed without Stripe (F-009).
5. **Weak browser hardening headers** (F-006).

Opportunities:
1. Finish promised critical safety alerts (push/SMS).
2. Reliable offline/low-bandwidth reporting.
3. Parish-specific incident verification and corrections.
4. Institutional partnerships for resilience/outage communications.
5. Community business sponsorship that funds free access.

## 5. Architecture and core user journeys

**Architecture:**
- Next.js App Router with server components and route handlers under `src/app/api/*`.
- Drizzle ORM and PostgreSQL in `src/db/*`.
- Auth/session, rate limiting, validation in `src/lib/*`.
- Mobile calls the same API using bearer tokens; web uses secure cookies.
- Shared domain libs: incidents, news, places, gas, alerts, billing, mail.

**Core journeys:**
1. Read map/feed as anonymous visitor.
2. File/report a pin with geolocation and confirm/clear existing incidents.
3. Create account, manage settings, alerts, subscription.
4. Submit/read Island Life experiences and photos.
5. Admin moderation, settings, places import, enterprise enquiries.
6. Billing: checkout, webhook processing, plan updates.

**What works (code present and internally coherent):** authentication and role gating, DB transactional account deletion, sanitized RSS, webhook idempotency, incident moderation flow.
**Incomplete/mocked/planned:** push/SMS alerts, storm tracks, enterprise team seats/data feeds, sponsor placements, gas price scraping (static values in cron).

## 6. Inspection and test coverage matrix

| Area | Status | Notes |
|---|---|---|
| Manifests/config | Reviewed | package.json root+expo, tsconfig, next/eslint config |
| Web build | Run | Failed (duplicate config) |
| Typecheck web | Run | Failed (Capacitor module) |
| Typecheck Expo | Run | Passed |
| Lint web | Run | Passed (deprecated `.eslintignore` warning) |
| npm audit | Run | 0 prod vulns; dev-tool vulns found |
| Source auth/billing/API | Reviewed | Key routes sampled |
| DB schema | Reviewed | large schema |
| UI/UX visual run | Not run | Source-based only (labeled suspected) |
| Runtime app | Not run | Would touch prod DB/payments/mail (blocked by policy) |
| Expo source | Partial | package manifest/check; not deep audit |
| Accessibility automation | Not run | No tooling |
| Tests | None found | No app tests |

## 7. Detailed findings and recommended fixes

Finding format: ID, category, severity, priority, status, evidence, impact, fix, effort, acceptance.

### F-001 Build release blocker (duplicate config)
- **Category:** Build/Release
- **Severity:** Critical
- **Priority:** P0
- **Status:** Confirmed
- **Evidence:** `next.config.ts:13` declares `nextConfig`, then `next.config.ts:35` declares it again. Build output: `SyntaxError: Identifier 'nextConfig' has already been declared`.
- **Impact:** No production web build can be created; deployment blocked.
- **Recommended fix:** Merge the two objects into one exported config; retain `redirects()` from the second, keep all security headers and CORS handling.
- **Effort:** 0.5 day.
- **Acceptance:** `npm run build` exits 0; artifact exists.

### F-002 Web typecheck blocked by legacy Capacitor config
- **Category:** Tooling
- **Severity:** Medium
- **Priority:** P2
- **Status:** Confirmed
- **Evidence:** `capacitor.config.ts:1` imports `@capacitor/cli`; web `package.json` does not list Capacitor.
- **Impact:** `npm run typecheck` fails; lower confidence in type safety.
- **Recommended fix:** Exclude the file in `tsconfig.json` or move/remove legacy Capacitor files after confirming unused.
- **Effort:** 0.5 day.
- **Acceptance:** `npm run typecheck` exits 0.

### F-003 Build ignores TypeScript errors
- **Category:** Release quality
- **Severity:** Medium
- **Priority:** P2
- **Status:** Confirmed
- **Evidence:** `next.config.ts:15-17` sets `typescript.ignoreBuildErrors: true`.
- **Impact:** Type errors can ship unnoticed.
- **Recommended fix:** Remove the bypass after F-002; gate build on type errors.
- **Effort:** 0.5 day.
- **Acceptance:** Build fails on introduced type errors in CI.

### F-004 Development tooling vulnerabilities
- **Category:** Dependencies
- **Severity:** Medium
- **Priority:** P3
- **Status:** Confirmed (scanner)
- **Evidence:** `npm audit` reports high braces/postcss and moderate esbuild advisories in ESLint/Drizzle tooling.
- **Impact:** Mostly dev-time; PostCSS advisory could matter if untrusted CSS is transformed.
- **Recommended fix:** Run `npm audit fix` only after reviewing breaking changes; exception-document if upgrading blocks release work.
- **Effort:** 1-2 days (testing).
- **Acceptance:** Production `npm audit --omit=dev` remains clean; documented plan for dev-only exceptions.

### F-005 Wildcard CORS on all API routes
- **Category:** Security
- **Severity:** Medium
- **Priority:** P2
- **Status:** Confirmed
- **Evidence:** `next.config.ts` security headers list includes `Access-Control-Allow-Origin: *` for `/api/:path*`.
- **Impact:** Any origin can read API responses; reviewer should confirm which routes return sensitive data. Credentials are not included due wildcard semantics, but bearer-token clients increase abuse opportunity.
- **Recommended fix:** Scope allowed origins by environment; only expose public read endpoints with wildcard if needed; validate `x-nowbey-client` and origin pairing.
- **Effort:** 1 day.
- **Acceptance:** Browser from untrusted origin cannot perform privileged API operations; tests added.

### F-006 Missing frame-busting and CSP headers
- **Category:** Security
- **Severity:** Medium
- **Priority:** P2
- **Status:** Confirmed
- **Evidence:** `next.config.ts:3-11` omits `X-Frame-Options` and there is no CSP. Comments state this is to support preview/editor framing.
- **Impact:** Clickjacking surface and limited XSS containment in production.
- **Recommended fix:** Add production-only `X-Frame-Options: DENY`/CSP while retaining framing in preview/dev; deploy env guard.
- **Effort:** 1 day.
- **Acceptance:** Production responses include headers; preview remains usable.

### F-007 Client IP trusted from spoofable forwarded headers
- **Category:** Security/abuse
- **Severity:** Low
- **Priority:** P3
- **Status:** Confirmed
- **Evidence:** `src/lib/ratelimit.ts:10-14` reads `x-forwarded-for` first entry directly.
- **Impact:** Rate limits may be bypassed/spoofed outside a trusted proxy.
- **Recommended fix:** On Vercel, use the platform-provided trusted IP header or validate proxy settings; keep fallback.
- **Effort:** 0.5-1 day.
- **Acceptance:** Documented trusted header and tests.

### F-008 Sensitive environment and token hygiene
- **Category:** Security/Operations
- **Severity:** High
- **Priority:** P1
- **Status:** Confirmed (files present; values redacted)
- **Evidence:** Local `.env` contains a production Neon connection string; `.env.vercel` contains a Vercel OIDC token; `.gitignore` confirms both are ignored and `git ls-files` found no tracked copy. `NOTES.md` also records credential rotation deferral.
- **Impact:** Database access and deploy tooling compromise if files are shared; operational risk.
- **Recommended fix:** Rotate DB password and Vercel tokens if any possible exposure; remove expired token artifact; complete .env.vercel history decision recorded in NOTES; add pre-commit secret scan.
- **Effort:** Operations 0.5-1 day plus downtime/redeploy.
- **Acceptance:** Old credentials rejected; secret scan clean.

### F-009 Demo plans could become free premium access
- **Category:** Product/Payments risk
- **Severity:** Medium
- **Priority:** P2
- **Status:** Confirmed
- **Evidence:** `src/app/api/billing/checkout/route.ts:37-44` grants `planStatus: "sandbox"` when Stripe is not configured; `src/lib/tiers.ts:130-138` entitlements sandbox if `demoPlansAllowed()` true.
- **Impact:** If production is deployed with demo mode enabled, users can self-activate ad-free plans at no cost.
- **Recommended fix:** Block demo activation in production (`NODE_ENV=production`) unless explicitly allowed; admin readiness checklist already warns of missing Stripe keys.
- **Effort:** 0.5-1 day.
- **Acceptance:** Production build returns 503 for demo checkout unless an explicit development flag is set.

### F-010 No automated tests for critical web flows
- **Category:** Quality
- **Severity:** Medium
- **Priority:** P1
- **Status:** Confirmed
- **Evidence:** No `*.test.*`/`*.spec.*` application files found in `src`.
- **Impact:** Regressions in auth, checkout, webhook replay, authorization and incident flows go unnoticed.
- **Recommended fix:** Start with 10-15 focused tests around auth, rate limits, handle uniqueness, checkout metadata, webhook idempotency, admin authorization.
- **Effort:** 2-3 days.
- **Acceptance:** CI runs unit/integration tests and fails on regressions.

### F-011 Legacy project files conflict with "pure Next.js" restructuring
- **Category:** Architecture/debt
- **Severity:** Low
- **Priority:** P3
- **Status:** Suspected
- **Evidence:** Root contains `App.js`, `capacitor.config.ts`, `temp_*`, while README says "Pure Next.js".
- **Impact:** Confusing build surface and stale artifacts.
- **Recommended fix:** Remove/move legacy root artifacts only after ownership confirmation; document two supported apps (web + Expo).
- **Effort:** 0.5-1 day.
- **Acceptance:** Clean `git status`, documented app boundaries.

### F-012 Underimplemented premium capabilities
- **Category:** Product
- **Severity:** Medium
- **Priority:** P2
- **Status:** Confirmed (planned)
- **Evidence:** Tiers advertise push/SMS, storm tracks, team features as `soon`; `src/app/api/alerts/route.ts` rejects push/SMS. Alerts page makes clear email works today.
- **Impact:** Tier value proposition incomplete; churn/refund risk if people pay before delivery.
- **Recommended fix:** Either implement email-only tiers first or keep premium perks clearly marked "coming soon" and avoid charging for them until done.
- **Effort:** Feature-sized (1-4 weeks depending on scope).
- **Acceptance:** Tier purchase copy matches implemented features.

### F-013 Hardcoded gas cron prices
- **Category:** Data accuracy
- **Severity:** Medium
- **Priority:** P2
- **Status:** Confirmed
- **Evidence:** `src/app/api/cron/gas-update/route.ts:18-23` inserts fixed station values instead of scraping/official feed.
- **Impact:** Misleading price data; trust risk, especially if presented as current.
- **Recommended fix:** Either label as sample data or implement official government/manual update endpoint; `GAS_OFFICIAL` override path exists in `src/lib/gas.ts` (needs review).
- **Effort:** 2-5 days depending on data source.
- **Acceptance:** Gas page shows source and update time; no fabricated live data.

### F-014 No CI for web build/lint/typecheck
- **Category:** Operations
- **Severity:** Medium
- **Priority:** P1
- **Status:** Confirmed
- **Evidence:** `.github/workflows/build.yml` only builds Android APK.
- **Impact:** Web breakages can reach production unnoticed (and did).
- **Recommended fix:** Add Ubuntu workflow with `npm ci`, lint, typecheck, build, npm audit.
- **Effort:** 0.5-1 day.
- **Acceptance:** CI required on PRs; passes on clean checkout.

### F-015 Admin mutations rely on origin check only
- **Category:** Security
- **Severity:** Low
- **Priority:** P3
- **Status:** Confirmed (design)
- **Evidence:** `src/lib/http.ts` uses `Origin` header comparison; admin routes (e.g. `src/app/api/admin/users/route.ts`) use `requireStaff`; no CSRF token.
- **Impact:** Reasonable modern-browser posture but weak against older clients and some edge cases. Not a confirmed exploit.
- **Recommended fix:** Add CSRF tokens or strict SameSite plus fetch metadata checks; keep bearer token separation for mobile.
- **Effort:** 1-2 days.
- **Acceptance:** Security review notes and tests.

### F-016 Source-based accessibility (unverified, no runtime)
- **Category:** Accessibility
- **Severity:** Low
- **Priority:** P3
- **Status:** Not verified
- **Evidence:** Very small map area (`h-[260px]` mobile), dense chip lists, color-heavy filters, no runtime screen-reader/keyboard tests performed.
- **Impact:** Unknown; potential mobile usability issues.
- **Recommended fix:** Run axe/Lighthouse/keyboard and screen-reader tests on `/`, `/map`, `/report`, `/life`, login, and admin.
- **Effort:** 1-2 days.
- **Acceptance:** documented WCAG 2.2 AA gaps and remediations.

## 8. UI/UX and accessibility recommendations

Screen-specific proposals (all visual conclusions labeled unverified unless captured; no screenshots were captured):

1. **Home `/`**: value proposition is strong, but first-time visitors see incidents, news, Island Life, ads, and alerts at once. Propose tabbing/grouping core task first: "What's happening near me" then secondary content below. Benefit focus and lower cognitive load. Effort 1-2 days. Verify with timed first-use tasks.
2. **Report flow `/report`**: keep under 30 seconds. Already emphasizing speed. Propose offline draft + retry and photo compression guidance. Benefit field usage under poor connectivity. Effort 2-3 days.
3. **Map `/map`**: mobile height 260px is likely too small; increase to viewport-based 60-70vh and keep filters in bottom sheet. Benefit legibility. Effort 1 day.
4. **Alerts `/alerts`**: make "coming soon" explicit before payment; separate implemented email alerts from planned push/SMS. Benefit trust and non-deceptive monetization. Effort 0.5 day.
5. **Accessibility**: ensure 44px touch targets, focus visible, skip link, heading order, and screen-reader names. Add automated axe checks later. Not certified.

## 9. Bahamas-specific product assessment

- **Benefit:** Strong local fit: parish-based filtering, Bahamas-bounded geocoding, public, anonymous reporting, alerts targeted by island, and local place directory.
- **Island coverage:** UI slices first 12 parishes; ensure all inhabited islands are represented, with offshore/back-end handling.
- **Connectivity/affordability:** Heavy maps/photos may be costly on limited data; propose data-light mode and caching.
- **Data accuracy:** OSM import and gas data need source timestamps and correction workflows; user edits affect shared place records (possible abuse).
- **Local business participation:** Place data includes contact info; good for small businesses if owners can claim/update listings.
- **Trust/fraud:** Anonymous reporting plus confirmation mechanism; potential abuse of photo-less claims. Add moderation/signals.
- **Payment localization:** Existing Stripe model is USD and likely requires verified merchant eligibility; accepting Bahamian customers does not prove Bahamian settlement. Mark unverified and keep free public access regardless.
- **Legal/privacy:** Forms collect email, location/IP, activity; privacy/terms exist (see `src/lib/legal.ts`). Sensitive operational/legal questions requiring qualified review: data retention and deletion, minors, moderation, public safety liability, consumer subscription laws, and government procurement/contracting.
- **Do not declare legal compliance.** This report is not legal advice.

## 10. Up to five ranked feature opportunities

See Feature IDs FEAT-001-005 and `PRIORITIZED_BACKLOG.csv`.

## 11. Monetization options and preferred approach

Options:
1. **Status quo / ad-supported:** funds free access; risk user fatigue if ads too heavy.
2. **Optional individual subscriptions:** existing tiers at USD 10.80/18/24 per month or 108/180/240 per year. High margin if payment processing works, but requires Bahamian merchant eligibility validation.
3. **Institutional sponsorship/community grants:** businesses and utilities sponsor alerts/maps.
4. **Enterprise data/API support contracts:** sell feeds and dedicated onboarding.
5. Not recommended: selling personal/location data or deceptive recurring subscriptions.

**Preferred model:** Free public core funded by light, clearly labeled ads + optional individual "supporter" tiers for convenience and advanced alerts + institutional sponsorships and enterprise contracts. This protects mission while creating revenue.

Hypothetical/pricing labels:
- Individual tier prices are existing product values; conversion unknown and must be validated.
- Unit economics formula: Net revenue = subscription MRR − payment processing − hosting/infra − support − ad revenue foregone; gross margin per subscriber = price − variable cost.
- Assumptions to validate: Bahamian card ownership, willingness to pay, Stripe eligibility, ad demand, churn, support cost.
No demand or profit is asserted.

## 12. Partnership readiness

Partnership readiness is **partial**. The product can demonstrate value now only if build is fixed and environment is ready. See `PARTNERSHIP_PITCHES.md` for pitches, pilot, and outreach drafts.

Before approaching partners:
- Fix F-001, F-002, F-008, F-010, F-014.
- Prepare anonymized demo data and admin walkthrough.
- Define support/SLA and data governance.

## 13. Sequenced immediate, 30-day, and 90-day roadmap

Assumption: one full-stack engineer plus founder review; no paid external agencies.

**Immediate (0-7 days):**
1. Fix build config.
2. Fix typecheck.
3. Add web CI.
4. Secret hygiene review/rotation.
5. Freeze marketing of unimplemented premium features.

**30 days:**
1. Add focused tests.
2. Replace mock gas data or label it.
3. Add production headers and scoped CORS.
4. Data-light/offline reporting prototype.
5. Launch readiness checklist completion.

**90 days:**
1. Implement email storm alerts and parish templates.
2. Pilot with one government/utility partner.
3. Business directory verification/claim flow.
4. Moderation and response-time dashboard.
5. Measure retention and support costs.

## 14. Release acceptance checklist

- Build, lint, typecheck pass.
- CI includes web + Expo typecheck.
- Secret scan clean and credentials rotated if needed.
- Billing test mode and webhook replay tested.
- Auth/authorization manual matrix documented.
- Data backups/restore tested (not assumed).
- Privacy/terms/support email set.
- Premium feature copy matches implementation.
- Demo dataset and rollback plan ready.
- Accessibility/basic mobile QA completed.

## 15. Assumptions, blockers, and unverified areas

- No production DB connection or runtime smoke test due policy; all DB behavior inferred from schema/code.
- Visual/accessibility conclusions unverified.
- Stripe Bahamian merchant eligibility unverified.
- Government/corporate procurement eligibility unverified.
- External research unavailable (web search cancelled); external claims labeled unverified.
- Mobile app only superficially inspected due separate deps and current focus on web.

## 16. Decisive "if this were my company" action plan

1. Stop treating the build as optional; merge `next.config.ts` today and block future merges without green CI.
2. Fix security hygiene and rotate anything that could have leaked, before talking to partners.
3. Make the free map/report path rock-solid for mobile and low bandwidth because that is the mission's core.
4. Charge only for clearly delivered convenience; under-promise premium features.
5. Pitch a small 90-day government/utility pilot around verified incident and outage communication, with explicit success metrics and no lock-in for residents.
6. Do not scale marketing until the data source quality and moderation model are proven.
7. Establish a test safety net before major feature work.
8. Keep public access to safety information free.
