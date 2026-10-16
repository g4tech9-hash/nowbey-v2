# Authentication and deployment: verified status

Checked 2026-10-16 using GitHub API metadata and check annotations. No secret values were retrieved or changed. No production deploy or migration was initiated.

## 1. Vercel deployment — production is served by the Vercel App integration; the Actions deploy path is the broken part

Re-checked 2026-10-16 against the GitHub API, the deployment records and the live health endpoint. No secret values were retrieved or changed.

**Production is current.** The Vercel GitHub App created the Production deployment for `47e7bc5ce57e` at 2026-10-16T21:52:24Z, one minute after that commit was pushed to master (`vercel[bot]`, environment `Production`, in the repository's deployment records). `https://nowbey-v2.vercel.app/api/health` independently reported `"version":"47e7bc5ce57e"`. So every push to master is already deployed by Vercel itself, without `VERCEL_TOKEN`.

**The Actions `deploy-web` job is the only thing failing, and the token it uses never changed.** The check annotation on four separate runs — 18:41Z, 19:36Z, 21:51Z and a fresh 22:20Z run — reports the same fingerprint:

    Vercel rejected VERCEL_TOKEN (sha256:bf4b8c6d)

A SHA-256 fingerprint of the secret value is byte-identical across all four runs, including one started after the owner re-created the token in Vercel. The repository-scoped secret therefore still holds the same value it held hours earlier: whatever was changed was not the value this job reads. The repository also has `Preview` and `Production` **environment** secret scopes, and `deploy-web` declares no `environment:`, so it can only ever read the **Repository** scope — a token saved under Production is invisible to it, and the fingerprint cannot move. The leaked `.env.vercel` credential from commit `9e4eb47` was also checked and is not the value in the secret (different fingerprint).

**The token is not malformed, and it is not rejected — it is scoped too narrowly to be usable.** Once the step stopped quoting the CLI's version banner and quoted the error itself, the real answer appeared:

    Error: User not found.

The value in the secret is a real 60-character Vercel access token (`vcp_…`). Vercel authenticates it and then answers **404** on `GET /v2/user`, which the CLI calls as a preflight on every command to resolve the account identity. A token scoped to a team, or to a single project, is denied on user-level resources, so the preflight 404s and the command aborts before it deploys anything. Selecting "the account/team that owns `nowbey-v2`" is exactly what produces such a token. The scope has to be **Full Account**. Vercel's own support bot states this on the community forum, and a member who switched from a team/project-scoped token to a full-account token confirmed it fixed the identical failure.

Required privileged operation, in this order:

1. Vercel → Account Settings → Tokens → create a token, and set **Scope: Full Account** (not a team, not a single project). A team- or project-scoped token cannot be used by the CLI at all.
2. GitHub → repo `g4tech9-hash/nowbey-v2` → Settings → Secrets and variables → Actions → **Repository** tab (not the Production or Preview environment tab) → `VERCEL_TOKEN` → paste the value with no quotes and no trailing newline. The step now strips whitespace and quotes anyway, but a clean paste is better.
3. Re-run the workflow. The fingerprint in the check annotation must change; if it still reads `sha256:bf4b8c6d`, the value never reached the repository scope.

`deploy-web` no longer turns a rejected token into a red pipeline when the release is already live: it deploys with the token when the token works, and otherwise checks what the live site serves. If production already serves the commit, the run goes green with a warning naming the broken part; if production is behind, the run still fails. It also strips whitespace and quotes from the pasted token, links the project from `VERCEL_ORG_ID` / `VERCEL_PROJECT_ID`, and reports every secret as a length plus a SHA-256 fingerprint — never a value — because the raw step logs are served from a blob host that is often unreachable. Never paste a token into chat or commit it. Follow TODO_HUMAN.md section 0a for the historical credential-exposure response.

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
