# Authentication and deployment: verified status

Checked 2026-10-16 using GitHub API metadata and check annotations. No secret values were retrieved or changed. No production deploy or migration was initiated.

## 1. Vercel deployment authentication — confirmed blocker

[Run 38949270790](https://github.com/g4tech9-hash/nowbey-v2/actions/runs/38949270790) at commit `5dccdb2251a2c0d32e92407ce1c3c4d3b798f61d`:

- Gate passed (type-check, lint, unit tests, production build).
- `deploy-web` failed. Its check annotation explicitly says Vercel rejected `VERCEL_TOKEN`.
- This establishes token rejection, not whether it expired, was revoked, or has the wrong scope. It does not establish that the team/project IDs are wrong.
- `smoke-web` passed despite that failure, with no application warnings in the check annotations. This is evidence of a working production site at that run, not proof of a successful CLI deploy. Raw logs were inaccessible from this sandbox, so the precise served commit was not independently read.

Required privileged operation: an authorized Vercel account owner creates a replacement scoped token; an authorized GitHub repository administrator installs it as Actions secret `VERCEL_TOKEN`. Verify `VERCEL_ORG_ID` and `VERCEL_PROJECT_ID` against the intended project, then rerun the gated web deployment. Never paste a token into chat or commit it. Follow TODO_HUMAN.md section 0a for the historical credential-exposure response.

## 2. App login and Google sign-in — implementation exists; live setup unverified

Password sessions require `AUTH_SECRET` (at least 32 characters), a reachable database and the auth schema. Email confirmation/reset requires working mail configuration. Do not rotate an existing signing secret merely as a diagnostic: rotation signs users out.

Google sign-in separately requires:

- A Google Cloud Web application OAuth client, with the exact production callback `https://nowbey-v2.vercel.app/api/auth/google/callback` registered.
- `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` in Vercel Production.
- `src/db/add-google-auth.sql` applied to the production database.
- A redeploy and real browser sign-in test.

`/api/auth/google/status` reports presence of both variables only. An enabled response does not validate the secret, consent configuration, callback allowlist or database migration. The smoke script now checks this endpoint and warns if disabled. Full provider instructions: TODO_HUMAN.md section 0c. For owner/admin account recovery use section 0b and `/admin-access`; do not bypass email verification or assign ownership based on a handle alone.

## 3. Production environment — inventory, not verified storage

Vercel Production needs `DATABASE_URL` and `AUTH_SECRET`. Set the canonical `APP_URL=https://nowbey-v2.vercel.app` for email/redirect links. For account email, configure either Resend (`RESEND_API_KEY`, `MAIL_FROM`) or SMTP (`SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `MAIL_FROM`). Set `ADMIN_EMAILS` before permitting registration of `ADMIN_HANDLES`; these do not create accounts. `CRON_SECRET` is required for protected scheduled jobs. Google credentials are separate from Firebase push and Google Maps keys.

Use `.env.example` for feature-specific variable names. Never put server credentials in `NEXT_PUBLIC_*` variables. Keep `GOOGLE_OAUTH_BASE` unset in production. Redeploy after environment changes; verify `/api/health`, `/api/auth/google/status`, login, confirmation/reset email and a real Google round trip. The health endpoint is not an exhaustive environment or auth audit.

## Access boundary in this session

- GitHub run metadata and check annotations are readable through authenticated `gh`.
- Listing Actions secrets and variables returns HTTP 403 (`Resource not accessible by integration`). Secret management is not available under the current permission grant; reconnect/reauthorize GitHub in Arena if broader access is intended.
- Arena's Vercel connector lookup reports unsupported. Sandbox outbound networking also excludes Vercel, Google and Neon, preventing direct provider operations or live-site probes here.
- No credentials should be sent in chat. An authorized provider administrator must perform privileged setup, or the platform must supply an appropriate secure integration. More repository edits cannot manufacture that authorization.
