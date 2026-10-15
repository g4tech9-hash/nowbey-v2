# Security review and fixes — 2026-10-15

Scope: the website and API (`src/`), the Android app (`expo/`), and the deploy pipeline. Every finding below
was reproduced against the original code with an automated test before it was fixed, and the same test
passes on the fixed code. The tests ship with the repository, so anybody can rerun them.

| Run (local stack, `bash tests/run-local.sh`) | Original code | Fixed — dev server | Fixed — production build |
| --- | --- | --- | --- |
| `tests/security.test.mjs` (14 attack tests) | **1 pass / 13 fail** | 14 / 14 | 14 / 14 |
| `npm test` (hermetic, also runs in CI) | — | 22 / 22 | — |
| `npm run test:local` (live API, mail, admin, Google, profile) | 62 / 62 baseline | 62 / 62 | 62 / 62 |
| `npm run test:ui` | 7 / 7 baseline | 7 / 7 | 7 / 7 |
| `npm run fuzz` (17,832 junk requests, 62 routes, signed out and in) | — | 0 findings | 0 findings |
| `tsc --noEmit`, `eslint .`, Expo `tsc --noEmit`, `expo export --platform android` | — | clean | — |

The raw output of every run is in `evidence/`. `before-security.txt` is the run against the original code;
the `after-*` files are the dev server; the `prod-*` files are `next build && next start`.

---

## Findings

### Critical — anyone could give themselves a paid plan in production (fixed)

`/api/billing/checkout` fell back to "demo plans" whenever Stripe was not configured. Stripe is not
available to Bahamian businesses, so that was production: any signed-in member could POST
`{"tier":"admiral"}` and receive the top tier for free. The demo flag also unlocked an `admiral` tier for an
account whose `plan_status` was forced to `sandbox`.

*Evidence before:* checkout answered 200 and the plan was granted; a forced `sandbox` row unlocked admiral.
*Fix:* demo plans need an explicit `ALLOW_DEMO_PLANS=true` (development/preview only) and never apply once
real payments exist. Checkout answers 503 "Plans open soon" until a payment provider is live. The plans
page and plan cards say **Opening soon** instead of offering a button that cannot work (screenshots in
`evidence/screenshots/`). Complimentary plans from the Members page still work.

### High — the admin handle went to whoever registered it first (fixed)

A handle in `ADMIN_HANDLES` (`mario242`, `eastsiderick`) became an administrator the moment it was
registered, and neither account exists in production yet (see TODO_HUMAN §0b). A stranger could register
it and own `/admin`.

*Evidence before:* a stranger registered `eastsiderick` (200) and was an admin.
*Fix — two locks:* (1) such a handle can only be registered with an address listed in `ADMIN_EMAILS`
(full address or `@domain`); without it the handle is "reserved". (2) Admin rights from `ADMIN_HANDLES`
apply only once the account's email is confirmed, so typing the owner's address without access to the
inbox gains nothing. **The owner must set `ADMIN_EMAILS` and confirm the email, or `/admin` stays closed.**

### High — a Vercel credential is in public Git history (needs the owner)

`.env.vercel` with a `VERCEL_OIDC_TOKEN` was committed at `9e4eb47` in this **public** repository. Deleting
the file does not remove it from history. These tokens are short-lived, but treat it as exposed:
revoke/rotate per TODO_HUMAN §0a. No code change can fix this.

### Medium — every API answered `Access-Control-Allow-Origin: *` (fixed)

*Before:* ACAO `*` on every `/api` response. *Fix:* `next.config.ts` no longer sets CORS. `src/proxy.ts`
echoes an origin only when it is the site itself, `APP_URL`, an entry in `ALLOWED_ORIGINS`, or (development
only) Expo web on `localhost:8081/19006`. Credentials are never allowed cross-origin. A production build
refuses the development origins (tested).

### Medium — cross-site writes reached the routes (fixed)

Most write routes never checked `Origin`. The session cookie is `SameSite=Strict`, which already keeps
it off cross-site requests, but routes that need no cookie were open to any website: a hostile page could
sign a visitor into an account of its choosing (login CSRF), drive sign-ups, or trigger reset emails.
*Before:* a POST with `Origin: https://evil.example` reached the route.
*Fix:* `src/proxy.ts` refuses every POST/PUT/PATCH/DELETE to `/api` whose `Origin` is foreign or the
literal `null`, with 403 "Bad origin." before any route runs. Requests with no `Origin` (the Android
app, server-to-server, curl) and same-site requests are unaffected; the Stripe webhook is exempt because it
is signed. Verified for 6 representative routes.

### Medium — rate limits were per server instance (fixed)

Limits lived in each serverless instance's memory, so an attacker spreading requests across instances
multiplied every limit. *Fix:* sign-in, sign-up, password reset, email change, password change and
account deletion use a shared counter in Postgres (`rate_limits` table, keys stored hashed). If the table
is missing — the window between the deploy and running the SQL — the site keeps working with the old
per-instance limits (tested by renaming the table under load). The memory store is capped at 5,000 keys.

### Medium — passwords hashed weakly and synchronously (fixed)

`scrypt` with low cost on the request thread. *Fix:* versioned format `scrypt$15$8$3$salt$hash`
(N=2¹⁵, r=8, p=3, ~0.23 s, asynchronous so other requests are not blocked). Old `salt:hash` hashes still
verify and are upgraded transparently at the next successful sign-in, including legacy passwords that
were stored with a trailing space. Hostile or malformed stored hashes are rejected, not thrown.

### Medium — the gas cron inserted invented prices (fixed)

`/api/cron/gas-update` wrote made-up station prices (Shell 708, Esso 750, Rubis 756) as if they were real.
*Fix:* the route stays (so Vercel cron does not error) but writes nothing and reports the official prices
from `GAS_OFFICIAL`. `src/db/add-security-fixes.sql` deletes the invented rows (it only matches rows with
no user, New Providence, regular, and exactly those three station/price pairs).

### Bug found while testing — failed queries slowly exhausted the database pool (fixed)

`src/db/index.ts` exported `pool` and `db` as lazy wrappers that called methods with the *wrapper* as
`this`. When a query failed, `pg` recorded the dropped connection on the wrapper instead of the pool, so
each failure left a phantom connection behind; once the pool's 10 slots were phantoms, every request
waited out the 10 s connection timeout and failed with
"timeout exceeded when trying to connect". Methods are now bound to the real object. Found by the
missing-table test (500 after 20 s before the fix; correct 401 → 429 after).

### Android app (fixed, ships in 1.2.2 / versionCode 3)

- Changing the server address in the app sent the signed-in token to the new server. It now signs out and
  forgets the push token whenever the server's origin changes, and says so.
- Plain `http://` servers were accepted; now only `https://`, or `http://` on a local/private address for
  development.
- The map loaded Leaflet from a CDN without Subresource Integrity; `integrity` + `crossorigin` added
  (sha256 hashes computed from the published leaflet@1.9.4 package).
- `android.allowBackup` is now `false`, so the session token is not copied into device backups.

### Headers (production build, verified with curl)

`X-Frame-Options: DENY`, `Content-Security-Policy: frame-ancestors 'none'; base-uri 'self'; object-src
'none'; form-action 'self'`, `Strict-Transport-Security`, `X-Content-Type-Options: nosniff`,
`Referrer-Policy`, `Permissions-Policy`. The CSP is deliberately limited to directives that cannot break
the map, ads or fonts; there is no iframe use in the site, and every form/payment flow is same-origin
(checked).

### Reviewed, no change needed

News ingest fetches only configured feeds (no user-supplied URLs → no SSRF); `news/submit` stores text,
not fetches; the handle-availability check is read-only; per-instance throttles on low-value endpoints
are acceptable.

### Not security, found during the UI check

`/scenes/*.jpg` (the background photos named in `src/lib/themes.ts`) are not in the repository, and the
deploy uploads the repository, so they 404 in production. The site falls back to its plain dark
background, so nothing breaks, but the photos never show. Owner action in TODO_HUMAN §0a.

---

## Deploying

1. Merge → the website deploys (no app build).
2. Run `src/db/add-security-fixes.sql` once in the Neon SQL editor. It is idempotent. Until then the site
   works with the old per-instance limits.
3. Do TODO_HUMAN §0a.

## Rerunning the checks

```bash
bash tests/run-local.sh            # local Postgres, mail catcher, seed, SQL, dev server
npm test && npm run test:local && npm run test:ui
npm run fuzz                       # local only; refuses production addresses
node scripts/smoke-prod.mjs        # read-only check of the live site (also runs after every deploy)
```

Every web deploy now ends with the `smoke-web` job in `.github/workflows/deploy.yml`, which waits for
the new commit to be live and checks headers, CORS, the origin wall, the app sign-in path, the plans page
and `rateLimits` in `/api/health` (warning, not failure, until the SQL has been run).
