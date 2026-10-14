# NowBey V2 — Full Audit Report

**Date:** 2026-10-13  
**Repository:** `C:\Users\Admin\Downloads\nowbeyV2`  
**Commit:** `11d0d25`  
**Node:** v24.21.0 | **npm:** 11.19.0 | **Next.js:** 16.4.0

---

## 1. Executive Summary

NowBey V2 is a dual-platform community safety and local-information app for The Bahamas. The web side is a Next.js 16 + PostgreSQL (Neon) + Drizzle ORM application with Stripe billing, email alerts (Resend/SMTP), RSS news ingestion, an interactive Leaflet map, and a full admin panel. The mobile side is an Expo/React Native app that consumes the same API via bearer tokens.

**The app cannot currently build for production.** A duplicate `nextConfig` declaration in `next.config.ts` causes `next build` to fail with a `SyntaxError`. This is a P0 release blocker.

**The app has strong security foundations** — HMAC-signed sessions, scrypt password hashing, timing-safe comparison, idempotent Stripe webhooks, and consistent input sanitization. However, it has zero automated tests, no Content-Security-Policy, and rate limiting that breaks under horizontal scaling.

**The app is not ready for public launch.** It is ready for a limited beta after fixing the build failure and addressing P1 findings.

---

## 2. What the App Actually Does

### Implemented and Functional
- **Incident reporting** — Residents pin floods, outages, road damage, and safety hazards on a Leaflet map with aerial imagery. Reports can be confirmed, cleared, and escalated by other residents.
- **News wire** — RSS feeds from 12 Bahamian outlets are ingested, categorized, and geocoded. Stories can be approved by editors and emailed to alert subscribers.
- **Island Life** — Member reviews of restaurants, events, beaches, and nightlife with photos, ratings, and price levels.
- **Gas price tracking** — Member-reported pump prices with outlier detection.
- **Email alerts** — Confirmed subscribers receive incident and news alerts based on island and category preferences.
- **User accounts** — Sign up, sign in, password reset, email verification, handle selection, session management.
- **Stripe billing** — Subscription checkout, webhook handling, billing portal, complimentary plans.
- **Admin panel** — User management (suspend, role change, plan grant), content moderation (hide, restore, delete), news approval, settings (theme, mode, splash), enterprise enquiry management, place import from OpenStreetMap.
- **Geocoding** — Nominatim (OpenStreetMap) with a local gazetteer fallback for Bahamas-specific places.
- **Photo processing** — Upload sniffing, re-encoding via Sharp, thumbnail generation, metadata stripping.

### Incomplete, Mocked, or Placeholder
- **Gas price cron** (`src/app/api/cron/gas-update/route.ts`) — Hardcoded mock prices, not a real scraper.
- **Push notifications** — Listed as "coming soon" in tier descriptions.
- **Text-message alerts** — Listed as "coming soon."
- **Storm tracks and marine forecast cards** — Listed as "soon."
- **Enterprise team seats, data feeds, branded placement** — All marked "soon."
- **Priority review for flagged pins** — Marked "soon."

### External Dependencies
- **Neon PostgreSQL** — Primary database
- **Stripe** — Payments
- **Resend / SMTP** — Email delivery
- **OpenStreetMap Nominatim** — Geocoding
- **OpenStreetMap Overpass API** — Place import
- **Leaflet / React-Leaflet** — Maps
- **Sharp** — Image processing
- **Vercel** — Hosting (implied by `.env.vercel` and `VERCEL_PROJECT_PRODUCTION_URL` usage)

---

## 3. Launch-Readiness Assessment

| Criterion | Status | Evidence |
|-----------|--------|----------|
| Production build | **FAILING** | `next build` fails: `SyntaxError: Identifier 'nextConfig' has already been declared` |
| TypeScript compilation | **FAILING** | 3 errors: duplicate `nextConfig`, missing `@capacitor/cli` module |
| Linting | **PASSING** | ESLint runs with only a deprecation warning about `.eslintignore` |
| Dependency vulnerabilities | **PASSING** | `npm audit --omit=dev` reports 0 vulnerabilities |
| Automated tests | **NONE** | No test files, no test script, no test framework |
| Security headers | **PARTIAL** | Has HSTS, X-Content-Type-Options, Referrer-Policy, Permissions-Policy. Missing CSP and X-Frame-Options |
| Rate limiting | **PARTIAL** | In-memory only; breaks under horizontal scaling |
| Database migrations | **NONE** | No Drizzle migration files; only raw SQL scripts |
| Error handling | **GOOD** | Consistent try/catch, graceful degradation, `after()` for non-critical side effects |
| Logging | **MINIMAL** | `console.error`/`console.warn` only; no structured logging or request tracing |
| Secrets management | **AT RISK** | `.env` file contains live database credentials; not confirmed absent from git history |

**Verdict: NOT READY FOR PUBLIC LAUNCH.** The build failure alone prevents deployment. Even after fixing that, the lack of tests, CSP, and scalable rate limiting make it unsuitable for production traffic.

---

## 4. Highest-Priority Risks and Opportunities

### Risks (see Section 7 for full details)
1. **P0: Build failure** — `next.config.ts` has duplicate `nextConfig` declaration
2. **P0: No Content-Security-Policy** — Primary XSS defense missing
3. **P1: In-memory rate limiting** — Bypassed under horizontal scaling
4. **P1: Zero test coverage** — Security-critical code is untested
5. **P1: TypeScript errors ship to production** — `ignoreBuildErrors: true` suppresses them
6. **P1: `.env` with live credentials** — Must verify not in git history
7. **P2: `after()` callbacks can be lost** — Password reset emails may never send if server crashes
8. **P2: Gas cron uses mock data** — Will pollute database with fake prices if deployed

### Opportunities
1. **Fix build + add CSP** — Unlocks production deployment
2. **Add tests for auth and Stripe** — Prevents costly regressions
3. **Move rate limiting to shared store** — Enables horizontal scaling
4. **Government partnership** — Community safety data is directly relevant to disaster preparedness
5. **Corporate sponsorship** — Local businesses benefit from Island Life reviews and alerts

---

## 5. Architecture and Core User Journeys

### Architecture
```
┌─────────────────────────────────────────────────────┐
│                    Vercel (Next.js)                  │
│  ┌─────────────┐  ┌──────────────┐  ┌────────────┐  │
│  │  Web App    │  │  API Routes  │  │  Cron Jobs │  │
│  │  (React)    │  │  (40+ routes)│  │  (2 jobs)  │  │
│  └─────────────┘  └──────────────┘  └────────────┘  │
│         │                │                │          │
│         └────────────────┼────────────────┘          │
│                          │                           │
│  ┌───────────────────────┴───────────────────────┐  │
│  │              Drizzle ORM + pg Pool            │  │
│  └───────────────────────┬───────────────────────┘  │
└──────────────────────────┼──────────────────────────┘
                           │
              ┌────────────┴────────────┐
              │     Neon PostgreSQL      │
              └─────────────────────────┘
                           │
        ┌──────────────────┼──────────────────┐
        │                  │                  │
   ┌────┴────┐      ┌─────┴─────┐     ┌─────┴─────┐
   │ Stripe  │      │  Resend   │     │Nominatim  │
   │         │      │  /SMTP    │     │  (OSM)    │
   └─────────┘      └───────────┘     └───────────┘
```

### Core User Journeys
1. **Report an incident** — Visitor opens app → sees map → clicks "Drop a pin" → places pin → fills form → submits → sees confirmation → neighbours confirm
2. **Sign up and subscribe** — Visitor clicks "Sign in" → creates account → verifies email → chooses plan → pays via Stripe → plan activates
3. **Set up alerts** — Member goes to Alerts → enters email → picks islands/categories → confirms via email → receives alerts
4. **Admin moderation** — Admin signs in → goes to Admin → reviews reported content → hides/deletes → action logged
5. **News ingestion** → Cron triggers → RSS feeds fetched → stories categorized → geocoded → stored → editors approve → alerts sent

---

## 6. Inspection and Test Coverage Matrix

| Area | Reviewed | Method | Notes |
|------|----------|--------|-------|
| `next.config.ts` | ✅ | Read + build | Duplicate `nextConfig` — build fails |
| `package.json` | ✅ | Read | No test script, no test framework |
| `tsconfig.json` | ✅ | Read + tsc | 3 TypeScript errors |
| `.env` | ✅ | Read (redacted) | Live DB credentials present |
| `.gitignore` | ✅ | Read | `.env` listed; verify not in git history |
| `src/lib/auth.ts` | ✅ | Read | Strong: scrypt, HMAC, timing-safe |
| `src/lib/viewer.ts` | ✅ | Read | Clean RBAC |
| `src/lib/staff.ts` | ✅ | Read | Consistent `requireStaff()` gate |
| `src/lib/ratelimit.ts` | ✅ | Read | In-memory only |
| `src/lib/validate.ts` | ✅ | Read | Good sanitization |
| `src/lib/password.ts` | ✅ | Read | Common password list |
| `src/lib/http.ts` | ✅ | Read | CSRF origin check |
| `src/lib/billing.ts` | ✅ | Read | Stripe integration |
| `src/lib/mail.ts` | ✅ | Read | Resend + SMTP |
| `src/lib/alerts.ts` | ✅ | Read | Email dispatch |
| `src/lib/engage.ts` | ✅ | Read | Comments, reactions |
| `src/lib/ingest.ts` | ✅ | Read | RSS parsing |
| `src/lib/images.ts` | ✅ | Read | Sharp, magic-byte sniffing |
| `src/lib/osm.ts` | ✅ | Read | Overpass API |
| `src/lib/cron.ts` | ✅ | Read | Constant-time comparison |
| `src/db/schema.ts` | ✅ | Read | Comprehensive, well-constrained |
| `src/db/index.ts` | ✅ | Read | Connection pooling |
| `src/proxy.ts` | ✅ | Read | URL validation middleware |
| `src/app/layout.tsx` | ✅ | Read | Root layout, splash, theme |
| `src/app/page.tsx` | ✅ | Read | Home page |
| `src/components/app-shell.tsx` | ✅ | Read | Shell, nav, footer |
| `src/components/nav-links.tsx` | ✅ | Read | Navigation |
| `src/components/splash-screen.tsx` | ✅ | Read | Splash screen |
| All API routes (40+) | ✅ | Read | All route handlers reviewed |
| `src/app/globals.css` | ✅ | Read | Tailwind + custom properties |
| Expo mobile app | ❌ | Not inspected | `expo/` directory not present in repo |
| Database contents | ❌ | Not inspected | No DB access |
| Stripe live mode | ❌ | Not inspected | No Stripe access |
| Email delivery | ❌ | Not inspected | No email service access |
| ESLint | ✅ | Ran | Passes with deprecation warning |
| TypeScript | ✅ | Ran | 3 errors |
| Production build | ✅ | Ran | Fails (duplicate `nextConfig`) |
| npm audit | ✅ | Ran | 0 vulnerabilities |
| Unit tests | ❌ | None exist | No test files found |
| E2E tests | ❌ | None exist | No test files found |

---

## 7. Detailed Findings and Recommended Fixes

### F-001: Build Failure — Duplicate `nextConfig` Declaration
- **Category:** Build
- **Severity:** Critical
- **Priority:** P0
- **Status:** Confirmed
- **File:** `next.config.ts:13,35`
- **Evidence:** `next build` fails with `SyntaxError: Identifier 'nextConfig' has already been declared`. The file declares `const nextConfig: NextConfig` twice — once at line 13 and again at line 35. The second declaration adds a `redirects()` function that the first lacks.
- **Impact:** The app cannot be deployed. This is an absolute release blocker.
- **Root cause:** Likely a bad merge or copy-paste error.
- **Fix:** Merge the two declarations into one, preserving the `redirects()` function from the second block.
- **Effort:** 5 minutes
- **Acceptance criteria:** `next build` completes successfully.

### F-002: No Content-Security-Policy Header
- **Category:** Security
- **Severity:** Critical
- **Priority:** P0
- **Status:** Confirmed
- **File:** `next.config.ts:6-11`
- **Evidence:** `securityHeaders` array includes `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`, `Strict-Transport-Security` — but no `Content-Security-Policy`.
- **Impact:** Any XSS vulnerability can execute arbitrary JavaScript in the app's origin context. The app uses `dangerouslySetInnerHTML` in `layout.tsx:48-49` for boot scripts.
- **Fix:** Add a CSP header. Start with `Content-Security-Policy-Report-Only` to avoid breaking the app, then enforce.
- **Effort:** 30 minutes
- **Acceptance criteria:** CSP header present on all responses; no report-only violations after 1 week.

### F-003: In-Memory Rate Limiting Breaks Under Scaling
- **Category:** Security
- **Severity:** High
- **Priority:** P1
- **Status:** Confirmed
- **File:** `src/lib/ratelimit.ts:7`
- **Evidence:** `const buckets = new Map<...>()` — per-process storage. On Vercel serverless or any multi-instance deployment, each instance has its own counters.
- **Impact:** An attacker can bypass rate limits by hitting different instances. Affects login brute-force, signup abuse, comment spam, alert spam.
- **Fix:** Use a shared store (Redis, Upstash, or Postgres). A Postgres-backed counter with a `ttl` column is simplest.
- **Effort:** 4 hours
- **Acceptance criteria:** Rate limits enforced consistently across multiple server instances.

### F-004: Zero Automated Test Coverage
- **Category:** Quality
- **Severity:** High
- **Priority:** P1
- **Status:** Confirmed
- **File:** `package.json` (no `test` script)
- **Evidence:** No test files, no test framework in `devDependencies`.
- **Impact:** Security-critical code (auth, Stripe webhooks, input validation) has no regression protection.
- **Fix:** Add Vitest. Write tests for: `verifyPassword`/`hashPassword`, `readToken`/`makeToken`, `checkPassword`, `hasBadOrigin`, `consumeToken`, `handleStripeEvent`, `normalizeUrl`/`categorize`.
- **Effort:** 2-3 days
- **Acceptance criteria:** `npm test` passes; core auth and payment flows have >80% coverage.

### F-005: TypeScript Errors Ship to Production
- **Category:** Build
- **Severity:** High
- **Priority:** P1
- **Status:** Confirmed
- **File:** `next.config.ts:16`
- **Evidence:** `ignoreBuildErrors: true` suppresses TypeScript errors. `tsc --noEmit` reports 3 errors (duplicate `nextConfig`, missing `@capacitor/cli`).
- **Impact:** Type mismatches and missing properties can cause runtime crashes in production.
- **Fix:** Remove `ignoreBuildErrors: true`. Fix all TypeScript errors.
- **Effort:** 2-4 hours (depends on error count)
- **Acceptance criteria:** `npx tsc --noEmit` exits 0; `next build` succeeds.

### F-006: `.env` Contains Live Database Credentials
- **Category:** Security
- **Severity:** High
- **Priority:** P1
- **Status:** Confirmed
- **File:** `.env:1-5`
- **Evidence:** Contains `DATABASE_URL` with production Neon credentials, `DATABASE_URL_UNPOOLED`, `NEON_BRANCH=production`, and Neon auth URLs. (Credentials redacted in this report.)
- **Impact:** If `.env` is committed to git, anyone with repo access has production database credentials.
- **Fix:** Verify `.env` is not in git history (`git log --all --full-history -- .env`). If it is, rotate all credentials immediately. Add `.env` to `.gitignore` (already present).
- **Effort:** 15 minutes to verify; 1 hour to rotate if needed
- **Acceptance criteria:** `git log --all --full-history -- .env` returns nothing.

### F-007: `after()` Callbacks Can Be Lost on Server Crash
- **Category:** Reliability
- **Severity:** Medium
- **Priority:** P2
- **Status:** Confirmed
- **Files:** `src/app/api/session/route.ts:116-122`, `src/app/api/account/forgot/route.ts:29-40`, `src/app/api/incidents/route.ts:128-134`, `src/app/api/enterprise/route.ts:46-70`, `src/app/api/news/route.ts:13`
- **Evidence:** `after()` runs after the response is sent. If the server crashes before the callback executes, the email/notification is silently lost.
- **Impact:** Password reset emails may never send. Enterprise enquiries may be lost. Alert subscribers may not receive notifications.
- **Fix:** For critical emails (password reset, enterprise), send inline before responding. For non-critical (verification, alerts), `after()` is acceptable.
- **Effort:** 2 hours
- **Acceptance criteria:** Password reset and enterprise enquiry emails are sent inline; verification and alert emails use `after()`.

### F-008: Gas Price Cron Uses Hardcoded Mock Data
- **Category:** Functional
- **Severity:** Medium
- **Priority:** P2
- **Status:** Confirmed
- **File:** `src/app/api/cron/gas-update/route.ts:19-23`
- **Evidence:** Hardcoded array of 3 fake prices. Comment says "We'll use a mock data fetcher for now."
- **Impact:** If this cron runs in production, it pollutes the database with incorrect prices, undermining trust in the gas price feature.
- **Fix:** Return 503 or a clear "not implemented" response until the real scraper is built. Add a production guard.
- **Effort:** 30 minutes
- **Acceptance criteria:** Cron returns 503 in production until real scraper is implemented.

### F-009: Duplicate `actorKey` Function
- **Category:** Code Quality
- **Severity:** Low
- **Priority:** P3
- **Status:** Confirmed
- **Files:** `src/lib/actor.ts:7-11` and `src/app/api/incidents/[id]/updates/route.ts:25-29`
- **Evidence:** Identical function defined in two places.
- **Impact:** Maintenance hazard — changes must be made in both places.
- **Fix:** Remove duplicate from the route file; import from `src/lib/actor.ts`.
- **Effort:** 10 minutes
- **Acceptance criteria:** `actorKey` defined only in `src/lib/actor.ts`.

### F-010: Duplicate `UUID_RE` Regex
- **Category:** Code Quality
- **Severity:** Low
- **Priority:** P3
- **Status:** Confirmed
- **Files:** `src/lib/validate.ts:1` and `src/app/api/incidents/[id]/route.ts:10`
- **Evidence:** Identical regex defined in two places.
- **Fix:** Remove duplicate from the route file; import from `src/lib/validate.ts`.
- **Effort:** 5 minutes
- **Acceptance criteria:** `UUID_RE` defined only in `src/lib/validate.ts`.

### F-011: `escapeHtml()` Doesn't Escape Single Quotes
- **Category:** Security
- **Severity:** Low
- **Priority:** P3
- **Status:** Confirmed
- **File:** `src/lib/mail.ts:16`
- **Evidence:** Escapes `&`, `<`, `>`, `"` but not `'`.
- **Impact:** Latent bug — not currently exploitable (templates use double quotes), but fragile.
- **Fix:** Add `.replace(/'/g, "&#39;")`.
- **Effort:** 2 minutes
- **Acceptance criteria:** `escapeHtml("'")` returns `"&#39;"`.

### F-012: No Database Migration Files
- **Category:** Data
- **Severity:** Medium
- **Priority:** P2
- **Status:** Confirmed
- **File:** `src/db/schema.ts`, `drizzle.config.ts`
- **Evidence:** No Drizzle migration files; only raw SQL scripts in `src/db/`.
- **Impact:** Cannot reliably roll back schema changes.
- **Fix:** Run `npx drizzle-kit generate` to create initial migrations.
- **Effort:** 1 hour
- **Acceptance criteria:** Migration files committed; `drizzle-kit migrate` runs in deployment.

### F-013: No Structured Logging or Request Tracing
- **Category:** Operations
- **Severity:** Medium
- **Priority:** P2
- **Status:** Confirmed
- **Files:** Throughout — `console.error()` used directly
- **Evidence:** No request IDs, no structured JSON logging, no log levels.
- **Impact:** Cannot effectively debug production issues or trace user journeys.
- **Fix:** Add a lightweight structured logger with request IDs propagated via `AsyncLocalStorage`.
- **Effort:** 1 day
- **Acceptance criteria:** All logs include `requestId`, `userId`, `path`, `duration`; logs are valid JSON.

### F-014: Leftover Build Artifacts and Temp Files
- **Category:** Hygiene
- **Severity:** Low
- **Priority:** P3
- **Status:** Confirmed
- **Files:** `temp_prebuild/`, `temp_prebuild_dir/`, `New Text Document.txt`, `New Text Document (2).txt`, `tsc-full.log`, `CODE_REVIEW_EXPORT.md`
- **Evidence:** These directories and files exist in the repo root.
- **Impact:** Clutter; risk of accidental commit.
- **Fix:** Add to `.gitignore` and delete.
- **Effort:** 10 minutes
- **Acceptance criteria:** Files removed; `.gitignore` updated.

### F-015: `getViewer()` Does a DB Query on Every Request
- **Category:** Performance
- **Severity:** Low
- **Priority:** P3
- **Status:** Confirmed
- **File:** `src/lib/viewer.ts:61`
- **Evidence:** Every authenticated request queries the `users` table.
- **Impact:** Under high load, this is a bottleneck. The query is indexed by PK, so it's fast, but still adds latency.
- **Fix:** Acceptable for now. If scaling, cache viewer in Redis with 5-second TTL.
- **Effort:** N/A (defer)
- **Acceptance criteria:** N/A

### F-016: `clientIp()` Trusts `X-Forwarded-For` Without Validation
- **Category:** Security
- **Severity:** Low
- **Priority:** P3
- **Status:** Confirmed
- **File:** `src/lib/ratelimit.ts:11-13`
- **Evidence:** Reads `X-Forwarded-For` header directly. If not behind a proxy that overwrites this header, attackers can spoof IPs.
- **Impact:** Rate limit bypass if deployed without a trusted proxy.
- **Fix:** Add a comment documenting the assumption. Verify proxy configuration on Vercel.
- **Effort:** 10 minutes
- **Acceptance criteria:** Comment added; Vercel proxy confirmed to overwrite `X-Forwarded-For`.

### F-017: `news/route.ts` Triggers Ingest on Every GET
- **Category:** Performance
- **Severity:** Low
- **Priority:** P3
- **Status:** Confirmed
- **File:** `src/app/api/news/route.ts:13`
- **Evidence:** `after(() => refreshIfStale())` runs on every news page view.
- **Impact:** Could trigger RSS fetches on every page view if news is stale.
- **Fix:** Consider a cron job instead, or add a shorter-circuit check.
- **Effort:** 30 minutes
- **Acceptance criteria:** News ingest triggered at most once per 5 minutes.

### F-018: `smtp.ts` Uses Hardcoded `nowbey.app` Domain
- **Category:** Configuration
- **Severity:** Low
- **Priority:** P3
- **Status:** Confirmed
- **File:** `src/lib/smtp.ts:65,80`
- **Evidence:** `EHLO nowbey.app` and `Message-ID: <...@nowbey.app>` are hardcoded.
- **Impact:** Cannot deploy on a different domain without code changes.
- **Fix:** Make domain configurable via `SMTP_DOMAIN` env var.
- **Effort:** 15 minutes
- **Acceptance criteria:** Domain read from env var with `nowbey.app` as default.

---

## 8. UI/UX and Accessibility Recommendations

### Positive Observations
- **Splash screen** (`src/components/splash-screen.tsx`) — Well-designed with skip-on-tap, sessionStorage to show once per visit, and CSS-only fade-out fallback.
- **Navigation** (`src/components/nav-links.tsx`) — Clean top nav on desktop, bottom bar on mobile, active states, online/offline indicator.
- **Home page** (`src/app/page.tsx`) — Clear value proposition, category filters, island jump links, live stats, empty states with CTAs.
- **Color system** — Consistent custom properties (`tide-500`, `sand-100`, `abyss-950`) with dark/light mode support.
- **Touch targets** — Mobile nav items are `min-h-[48px]`, meeting WCAG 2.2 AA.

### Recommendations

#### R-001: Add Skip-to-Content Link
- **Problem:** No skip navigation link for keyboard users.
- **Fix:** Add a visually-hidden skip link as the first element in `AppShell`.
- **Effort:** 15 minutes
- **WCAG:** 2.4.1 Bypass Blocks

#### R-002: Add ARIA Labels to Icon-Only Buttons
- **Problem:** The `ModeToggle` and `SessionChip` components may lack accessible names.
- **Fix:** Add `aria-label` to all icon-only buttons.
- **Effort:** 30 minutes
- **WCAG:** 4.1.2 Name, Role, Value

#### R-003: Ensure Focus Visible on All Interactive Elements
- **Problem:** Custom focus styles may not meet 3:1 contrast ratio.
- **Fix:** Add `:focus-visible` styles with high-contrast outlines.
- **Effort:** 1 hour
- **WCAG:** 2.4.7 Focus Visible

#### R-004: Add Loading States to Forms
- **Problem:** Form submissions may not show loading indicators.
- **Fix:** Add `disabled` state and spinner to submit buttons during async operations.
- **Effort:** 2 hours
- **Benefit:** Prevents double-submission; improves perceived performance

#### R-005: Add Error Recovery to Photo Uploads
- **Problem:** If photo processing fails, the user may not know which photo caused the error.
- **Fix:** Show per-photo error messages with retry option.
- **Effort:** 2 hours
- **Benefit:** Reduces frustration; prevents data loss

#### R-006: Verify Color Contrast Ratios
- **Problem:** Custom color palette may not meet WCAG AA for all text/background combinations.
- **Fix:** Run automated contrast check (e.g., `axe-core` or `pa11y`). Fix any failures.
- **Effort:** 2 hours
- **WCAG:** 1.4.3 Contrast (Minimum)

---

## 9. Bahamas-Specific Product Assessment

### Product-Market Fit
The app addresses real needs in The Bahamas:
- **Hurricane season** — Real-time incident reporting for floods, road damage, and power outages is directly useful during June-November.
- **Island geography** — The Bahamas spans 16 islands across 100,000 square miles. Island-specific alerts and information are essential.
- **Limited official communication** — During disasters, official channels are often overwhelmed. Community-sourced information fills a gap.
- **Local business discovery** — Island Life reviews help residents and visitors find restaurants, events, and beaches.

### Accessibility Considerations
- **Affordable devices** — The app should work on low-end Android devices common in the Bahamas. The Next.js web app may be heavy for these devices.
- **Limited connectivity** — Rural islands may have slow or intermittent internet. The app has an online/offline indicator but no offline mode.
- **Data usage** — Map tiles and photos consume significant data. Consider a low-bandwidth mode.

### Regulatory and Legal Considerations
- **Data protection** — The Bahamas does not have comprehensive data protection legislation equivalent to GDPR. However, collecting email addresses and location data still requires a clear privacy policy and consent.
- **Defamation** — User-generated incident reports could contain defensible statements. The moderation system (hide, remove, flag) helps but does not eliminate legal risk.
- **Payments** — Stripe's availability for Bahamas-based merchants should be verified separately. The app uses Stripe, which may not support Bahamian merchant onboarding.
- **Tax** — Subscription revenue may be subject to Bahamian VAT (10% as of 2025). Consult a local accountant.

### Verification Needed
- [ ] Confirm Stripe supports Bahamas-based merchants
- [ ] Confirm Resend supports sending from a `.bs` domain
- [ ] Verify VAT obligations for digital subscriptions
- [ ] Review defamation risk with local counsel
- [ ] Confirm no licensing requirements for RSS aggregation

---

## 10. Ranked Feature Opportunities

### O-001: Offline-First Mobile Experience
- **User problem:** Rural islands have limited connectivity; the app is unusable offline.
- **Intended users:** Residents of Family Islands, boaters, emergency responders.
- **Benefit to The Bahamas:** Ensures critical safety information is available during disasters when connectivity is degraded.
- **Fit:** Natural extension of the existing mobile app.
- **Smallest useful implementation:** Cache recent incidents and news in AsyncStorage; show cached data when offline.
- **Effort:** 2-3 weeks
- **Success metric:** % of sessions that work offline; user retention in low-connectivity areas.
- **Confidence:** High — validated by the existing online/offline indicator.

### O-002: Emergency Services Integration
- **User problem:** During hurricanes, residents don't know which emergency services are available or where.
- **Intended users:** All Bahamian residents, especially during hurricane season.
- **Benefit to The Bahamas:** Directly supports disaster preparedness and response.
- **Fit:** Natural extension of the incident reporting system.
- **Smallest useful implementation:** Add a "Services" layer to the map showing shelters, hospitals, and gas stations with real-time status.
- **Effort:** 1-2 weeks (data collection is the bottleneck)
- **Success metric:** Number of service locations with current status; usage during hurricane season.
- **Confidence:** Medium — requires government or NGO partnership for data.

### O-003: Community Verification Badges
- **User problem:** Residents don't know which reports are trustworthy.
- **Intended users:** All app users.
- **Benefit to The Bahamas:** Improves information quality and trust.
- **Fit:** Extends the existing confirmation system.
- **Smallest useful implementation:** Show "Verified by N neighbours" badge on reports with 3+ confirmations.
- **Effort:** 3 days
- **Success metric:** Report confirmation rate; user trust survey.
- **Confidence:** High — the confirmation system already exists.

### O-004: Local Business Claims
- **User problem:** Restaurant and event owners can't manage their own listings.
- **Intended users:** Local businesses.
- **Benefit to The Bahamas:** Drives business engagement and revenue.
- **Fit:** Extends Island Life places.
- **Smallest useful implementation:** Allow businesses to claim a place, edit hours/menu, and respond to reviews.
- **Effort:** 2-3 weeks
- **Success metric:** Number of claimed businesses; business engagement rate.
- **Confidence:** Medium — requires business outreach.

### O-005: Hurricane Tracking Overlay
- **User problem:** During hurricane season, residents need to see storm tracks alongside incident reports.
- **Intended users:** All Bahamian residents, June-November.
- **Benefit to The Bahamas:** Directly supports disaster preparedness.
- **Fit:** Natural extension of the map.
- **Smallest useful implementation:** Add a hurricane layer showing NHC forecast tracks.
- **Effort:** 1 week
- **Success metric:** Map views during hurricane season; user retention.
- **Confidence:** High — NHC data is freely available.

---

## 11. Monetization Options and Preferred Approach

### Recommended Model: Freemium + Business Subscriptions

**Who pays:** Local businesses, community organizations, and power users who want ad-free access and advanced alert features.

**What they receive:**
- **Free tier:** Read the map, report incidents, confirm others' reports, one email alert profile, Island Life reviews.
- **Conch ($10.80/month):** Ad-free, multiple alert profiles, multi-island alerts.
- **Rock Sound ($18/month):** Storm alerts that override filters, text-message alerts (soon).
- **Admiral ($24/month):** Verified reporter badge, CSV export, priority review.

**Why this model:**
- Aligns with the mission — core safety features remain free.
- Revenue from those who can afford it subsidizes access for those who cannot.
- Business subscriptions (enterprise tier) provide additional revenue without compromising public access.

**Unit economics (hypothetical):**
- Assume 1,000 free users, 100 Conch, 20 Rock Sound, 5 Admiral.
- Monthly revenue: 100 × $10.80 + 20 × $18 + 5 × $24 = $1,080 + $360 + $120 = $1,560/month.
- Stripe fees (2.9% + $0.30): ~$45/month.
- Net: ~$1,515/month.
- This does not cover a full-time developer salary but could cover hosting and contribute to development costs.

**Assumptions requiring validation:**
- Will Bahamian users pay for a safety app? (Test with a small group.)
- Is $10.80/month the right price point? (Test with A/B pricing.)
- Will businesses pay for enterprise features? (Test with 5-10 businesses.)

### Alternative Models (Not Recommended)
- **Advertising:** Already implemented but undermines trust and user experience.
- **Data licensing:** Selling user data would undermine trust and the mission.
- **Government contracts:** Possible but should not be the primary revenue source.

---

## 12. Partnership Readiness

### What Can Be Demonstrated Now
- Working incident reporting and map
- News wire with RSS ingestion
- User accounts and authentication
- Admin panel for moderation
- Stripe integration (in test mode)

### What Requires Development Before Partner Outreach
- Production build must succeed (fix `next.config.ts`)
- CSP header must be added
- Rate limiting must be scalable
- Tests must pass
- Gas price cron must not insert mock data

### Government Pitch (Summary)
NowBey provides a real-time, community-sourced safety information platform that complements official emergency management channels. During hurricane season, it enables residents to report and verify flooding, road damage, and power outages street by street — information that official channels often lack due to limited resources. A pilot with NEMA (National Emergency Management Agency) could provide value while generating usage data.

### Corporate Pitch (Summary)
Local businesses in the tourism, insurance, and utilities sectors have a direct interest in real-time safety information. A partnership could provide branded alert feeds, verified business listings, and priority support — generating revenue while improving community safety.

See `PARTNERSHIP_PITCHES.md` for full details.

---

## 13. Sequenced Roadmap

### Immediate (Before Any Public Release)
1. Fix `next.config.ts` duplicate declaration (F-001) — 5 min
2. Add Content-Security-Policy header (F-002) — 30 min
3. Remove `ignoreBuildErrors: true` and fix TS errors (F-005) — 2-4 hours
4. Verify `.env` not in git history (F-006) — 15 min
5. Fix gas cron to not insert mock data (F-008) — 30 min
6. Remove duplicate code (F-009, F-010) — 15 min
7. Clean up leftover artifacts (F-014) — 10 min

**Total: ~4-6 hours**

### 30-Day (Before Limited Beta)
1. Add tests for auth and Stripe (F-004) — 2-3 days
2. Move rate limiting to shared store (F-003) — 4 hours
3. Add database migrations (F-012) — 1 hour
4. Fix `after()` reliability for critical emails (F-007) — 2 hours
5. Add structured logging (F-013) — 1 day
6. Add accessibility improvements (R-001 through R-006) — 2-3 days
7. Verify Stripe/Resend support for Bahamas — 1 day

**Total: ~2-3 weeks**

### 90-Day (Before Public Launch)
1. Launch limited beta with 50-100 users
2. Collect feedback and iterate
3. Implement offline mode (O-001) — 2-3 weeks
4. Add hurricane tracking overlay (O-005) — 1 week
5. Approach NEMA for pilot partnership
6. Approach 5-10 local businesses for enterprise pilot
7. Implement community verification badges (O-003) — 3 days

**Total: ~6-8 weeks**

---

## 14. Release Acceptance Checklist

- [ ] `next build` succeeds
- [ ] `npx tsc --noEmit` exits 0
- [ ] `npx eslint .` passes
- [ ] `npm audit` reports 0 critical/high vulnerabilities
- [ ] `npm test` passes (once tests exist)
- [ ] CSP header present on all responses
- [ ] `.env` confirmed not in git history
- [ ] Rate limiting uses shared store
- [ ] Database migrations exist and run successfully
- [ ] Gas cron does not insert mock data in production
- [ ] Password reset emails send inline (not via `after()`)
- [ ] Structured logging with request IDs
- [ ] Accessibility: skip link, ARIA labels, focus visible, contrast AA
- [ ] Privacy policy reviewed by local counsel
- [ ] Stripe test mode verified end-to-end
- [ ] Email delivery verified (Resend or SMTP)

---

## 15. Assumptions, Blockers, and Unverified Areas

### Assumptions
- The app is intended for deployment on Vercel (based on `.env.vercel` and `VERCEL_PROJECT_PRODUCTION_URL` usage).
- The Expo mobile app exists in a separate directory not included in this repository.
- The `.env` file contains production credentials (not test credentials).
- The app targets Bahamian residents and visitors.

### Blockers
- **Cannot verify Stripe live mode** — No Stripe credentials available.
- **Cannot verify email delivery** — No Resend/SMTP credentials available.
- **Cannot verify database contents** — No DB access.
- **Cannot verify Expo mobile app** — Not present in repository.
- **Cannot verify legal compliance** — Requires local counsel.

### Unverified Areas
- Whether the app works end-to-end (build failure prevents this)
- Whether the mobile app correctly stores tokens in SecureStore
- Whether Stripe supports Bahamas-based merchants
- Whether Resend supports `.bs` domains
- Whether the app complies with Bahamian law

---

## 16. "If This Were My Company" Action Plan

### The Vision
NowBey becomes the trusted source for real-time, community-sourced safety information across The Bahamas — used by residents, businesses, and government agencies during everyday emergencies and hurricane season.

### The Strongest Initial User Segment
**Nassau-based residents aged 25-45** — They have smartphones, are active on social media, and are likely to report and confirm incidents. They can drive early adoption and word-of-mouth growth.

### The Smallest Reliable Experience Worth Launching
1. Working production build
2. Incident reporting with map
3. Email alerts for one island
4. Admin moderation panel
5. Basic tests for auth and payments

### What I Would NOT Build Yet
- Push notifications (complex, low ROI at current scale)
- Text-message alerts (requires SMS provider integration)
- Enterprise features (no validated demand yet)
- Offline mode (important but can wait until user base justifies it)

### The First Five Actions
1. **Fix the build** — Merge duplicate `nextConfig` in `next.config.ts`
2. **Add CSP** — One line in `next.config.ts`
3. **Verify secrets** — Check `.env` is not in git history
4. **Add tests** — Start with auth flow
5. **Deploy to staging** — Verify the app works end-to-end

### The Main Adoption Risk
**Chicken-and-egg problem** — The app is useful only when many people use it, but people won't use it until it's useful. Mitigation: Focus on Nassau first, partner with community groups, and seed content during hurricane season when demand is highest.

### The Main Retention Risk
**Information decay** — Reports become stale, news gets old, and users lose interest. Mitigation: Automated expiration of old reports, regular news ingestion, and email alerts to bring users back.

---

*End of report.*
