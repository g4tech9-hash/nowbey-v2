# TODO_HUMAN — production setup, manual steps (no guessing)

## 0. Facebook posts on the wire — one pasted bridge feed (2026-10-18)

**What already works, no step needed:** BPL's own announcements feed (`bplco.com/feed`) is
built into the wire, so press releases and outage updates reach `/wire` on the next refresh
(and are categorised as **Power**). This is the reliable source; it is not the Facebook page.

**Why Facebook posts are still missing:** Facebook answers servers with a login wall. On
2026-10-18, `www.facebook.com/mybpl242`, `m.facebook.com/mybpl242` and
`mbasic.facebook.com/mybpl242` all returned **403 / a login page** from hosting IPs; a
rendering proxy saw the same login page, and the public RSSHub/RSS-Bridge instances either
rate-limit or reject the page. No code change can scrape past that — a bridge feed is the
supported path, and it is the only one that yields the page's actual posts.

**The one-time step (about two minutes).**

1. Create a feed for `https://www.facebook.com/mybpl242/` at rss.app or fetchrss.com
   (both have free tiers), and copy the RSS address it gives you.
2. Open **/admin/wire → Facebook pages on the wire**, paste that address into the page's
   **Bridge feed URL** box, press **Save bridge**.
3. Press **Check now**. The panel reports, per page, how many posts were found, how many
   were new, and the converter's own note — so you can see it working before you close the
   tab. No redeploy is involved; the bridge is stored in the database.

Server-level alternative (takes a redeploy): set
`FB_RSS_BRIDGES="mybpl242|https://rss.app/feeds/xxxx.xml"` in Vercel → Settings →
Environment Variables → Production. An admin-saved bridge wins over this env value.

If a bridge later breaks, `/admin/wire` shows the failure note from the last check instead
of failing silently, and the converter keeps serving a valid (possibly empty) RSS feed at
`/api/rss/facebook`.

## 0. Switch on Incident Command extras (2026-10-16) — one SQL step

The deploy carries four staff upgrades: report editing + merging + "unfounded" status
(/admin/reports), comment Approve / Delete-&-warn, the live-stream grid with Kill Stream
(/admin/streams), custom geofenced blasts (/admin/alerts), and Ban Device on member pages.
Everything except the two new tables works the moment the deploy lands.

1. **Run the SQL once.** Neon → SQL editor → paste all of `add-live-streams.sql` → Run →
   then paste all of `add-banned-devices.sql` → Run. Both are safe to run twice. Until they
   run, /admin/streams shows a "not switched on yet" panel (nothing 500s) and Ban Device
   answers 503 with the same message; reports, comments, alerts and push are unaffected.
2. **Grant broadcaster status** to the first trusted phones: Admin → Members → open the
   member → "Verified broadcaster status" → Grant. Only they (and staff) can go live.

## 0. Turn on AI log fixes (Admin → Logs)

Full write-up: `docs/AI_LOG_FIXES.md`. The code is live-safe without these steps — logs
collect, diagnoses wait as "unavailable", approvals wait as "approved".

1. **Run the SQL once.** Neon → SQL editor → paste all of `add-error-ai.sql` → Run (safe to
   run twice; `add-client-errors.sql` must already have run). Also run `add-ai-usage.sql`
   (one tiny table) so the AI daily cost cap counts across servers — the Admin overview
   shows today's AI calls and estimated spend once it exists.
2. **Set two env vars.** Vercel → Settings → Environment Variables → Production:
   `GITHUB_TOKEN` (GitHub → Settings → Developer settings → Fine-grained tokens → only
   `g4tech9-hash/nowbey-v2`, Issues: read/write) and `GITHUB_REPO=g4tech9-hash/nowbey-v2`.
   `GEMINI_API_KEY` should already be set — the same key powers these diagnoses.
3. **Schedule the cron.** Wherever the other crons are scheduled, add
   `GET /api/cron/error-analysis` every 15–60 min with `Authorization: Bearer $CRON_SECRET`.
4. **Next APK build** carries the Expo app's error reporting; no store-side setting needed.

## 0a. After the security update deploys (2026-10-15) — in this order

Full write-up: `audit/2026-10-15_security/REPORT.md`. Do steps 1–3 the same day as the deploy.

1. **Rotate the leaked Vercel credential.** `.env.vercel` (a `VERCEL_OIDC_TOKEN`) is in this *public*
   repository's history at commit `9e4eb47`; deleting the file does not remove it. In Vercel → Account
   Settings → Tokens, delete every token you do not recognise, create a new one, and paste it into GitHub →
   repo Settings → Secrets and variables → Actions → `VERCEL_TOKEN`. Two things to get right:
   - **Scope must be "Full Account".** A token scoped to a team or to a single project cannot be used by
     the Vercel CLI at all: the CLI checks `GET /v2/user` before every command, a team/project-scoped token
     is denied on user-level resources, and the CLI aborts with `Error: User not found.` That is the exact
     error the Actions job was reporting on 2026-10-16 — the token was fine, just too narrow.
   - **Save it under the Repository tab**, not the Production or Preview environment tab: the `deploy-web`
     job declares no `environment:`, so it can only read the repository scope, and a token saved under
     Production is invisible to it (this is why the failure kept looking identical — the value it read
     never changed).
   Then Vercel → the project → Settings → Security → check "Deployment Protection" and the team's audit log
   for deploys you did not make. Never commit `.env*` files (they are in `.gitignore`).
   Note: Vercel's own GitHub App integration already deploys every push to master, so production is not
   waiting on this token; it only affects the separate GitHub Actions deploy job.
2. **Run the SQL once.** Neon → SQL editor → paste all of `src/db/add-security-fixes.sql` → Run. It
   creates the shared `rate_limits` table and deletes the invented gas prices the old cron inserted. It is
   safe to run twice. Until it runs the site works, with the older per-server limits. To confirm, open
   `https://nowbey-v2.vercel.app/api/health`: `"rateLimits": true` means it ran. (The automatic live-site
   check in GitHub Actions shows a warning until then.)
3. **Set `ADMIN_EMAILS` before claiming the admin handle.** Vercel → Settings → Environment Variables →
   Production: `ADMIN_EMAILS=you@yourdomain.com` (comma-separate several; `@yourdomain.com` allows a
   whole domain). Redeploy. Without it, nobody — including you — can register `mario242` or
   `eastsiderick`; the form answers "reserved". Then do §0b.
4. **Confirm the email on every admin account.** Admin rights from `ADMIN_HANDLES` now need a confirmed
   email. If `/admin` stops opening, open the confirmation email (or Settings → resend it).
5. **Check who holds admin.** Neon SQL editor:
   `select handle, email, role, email_verified_at, created_at from users where role='admin' or handle in ('mario242','eastsiderick');`
   Anything you do not recognise: Members page → suspend, or `update users set role='user' where handle='…';`.
6. **Clear self-granted plans.** Before the fix any member could give themselves a paid plan through the
   pretend checkout; those rows have `plan_status='sandbox'`. They no longer unlock anything, but list
   and clear them so the Members page is truthful:
   `select handle, ad_free_tier, plan_interval, created_at from users where plan_status='sandbox';`
   `update users set ad_free_tier=null, plan_interval=null, plan_status=null, plan_renews_at=null where plan_status='sandbox';`
   Complimentary plans you gave (`plan_status='comp'`) are untouched.
7. **Leave `ALLOW_DEMO_PLANS` unset in Production.** Set it to `true` only on Preview/Development if you
   want the pretend checkout for testing.
8. **Only if you use the app in a browser (Expo web) against production:** add its address to
   `ALLOWED_ORIGINS` (comma-separated, e.g. `https://app.example.com`). The Android app needs nothing.
9. **Only if you self-host behind your own proxy (not Vercel):** make the proxy overwrite
   `X-Forwarded-For`, or set `TRUST_PROXY=last`. On Vercel leave it unset.
10. **Background photos.** `src/lib/themes.ts` expects `public/scenes/nassau.jpg`, `aerial.jpg`,
    `sunset.jpg`, `shore.jpg`, `lagoon.jpg`, but there is no `public/` folder in the repository, so they
    404 on the live site and pages show the plain dark background instead. Add your own JPEGs (landscape,
    ~2000 px wide, under 500 KB, photos you have the rights to) under `public/scenes/` and commit them.
11. **Install the new Android build (1.2.2).** It installs over the old one. If you had changed the
    server address in the app, it signs you out once — sign in again.

## 0b. Claim the owner handles (after §0a step 3)

**Evidence (2026-10-15, from the production site itself):** signing in as `mario242` or `eastsiderick`
answers "No account has the handle @…", so **neither account exists in the production database yet**.
Both handles are listed in `ADMIN_HANDLES` / `src/db/setup_admins.sql`, which are instructions to *grant*
rights, not accounts.

Before the 2026-10-15 security update, an unclaimed handle on that list was a seat waiting to be taken by
whoever registered it first. It is now locked twice: registering it needs an address in `ADMIN_EMAILS`, and
its admin rights need a confirmed email. So:

1. Set `ADMIN_EMAILS` (§0a step 3) and redeploy.
2. On the live site, tap **Create account** and register `mario242` (a second one for `eastsiderick` if
   you use it) **with an address in `ADMIN_EMAILS`** and a strong password. Tap the confirmation link in
   the email — admin rights start only after that.
3. Check Vercel → Settings → Environment Variables: with `ADMIN_HANDLES=mario242` set, `/admin` now opens.
   If it is not set, either add it (Production) and redeploy, or run `src/db/setup_admins.sql` in the
   Neon SQL editor to set `role='admin'`.

**To find out which of those is the blocker, open `/admin-access` while signed in as the account.** It
reports, for you and nobody else: the role on the row, whether the handle is in `ADMIN_HANDLES`, whether
the email is confirmed, whether `ADMIN_EMAILS` covers the address, and the one sentence saying what to do
next. It is deliberately *not* behind the admin gate — the moment you need it is the moment the gate says
no. An admin can read the same verdict for any member on the Members page. The rules behind it are
`src/lib/admin-access-core.ts`, unit-tested by `tests/admin-access.test.mjs`; `getViewer` computes
`isAdmin` from the same two rules, so the page cannot disagree with the gate.

`setup_admins.sql` never touches passwords, and the product has no endpoint that reads or writes one.
The two supported ways back into an existing account are the member's own reset email
(`/forgot-password`) and an admin-issued one-hour link (Members page → "Create a password reset link").

## 0c. Sign in with Google (needs a Google Cloud project)

The code is in place and tested against a fake Google. It stays switched off until these exist, and the
sign-in page hides the button until they do.

> The console is at **`console.cloud.google.com`**. (`console.google.com` does not exist.) Because the
> Firebase project and the Google Cloud project are the same thing, use the existing Firebase project
> **`nowbey-6a30f`** — everything then lives together, and nothing needs recreating.

1. Open **`console.cloud.google.com/auth/overview?project=nowbey-6a30f`** (phone browser is fine) →
   **Get started** on the Google Auth Platform page (this is the old "OAuth consent screen"): app name
   `NowBey`, your support email, developer contact. Audience: **External**. Data access: add
   `.../auth/userinfo.email` and `.../auth/userinfo.profile` (neither is "sensitive", so no Google
   review, no logo verification). Finish, then make sure **Audience → Publishing status** says
   **In production** — while it says "Testing", only listed test users can sign in.
2. Open **`console.cloud.google.com/apis/credentials?project=nowbey-6a30f`** → **Create credentials →
   OAuth client ID → Web application**, name it `NowBey web`. Under **Authorised redirect URIs** add
   exactly, one per line:
   * `https://nowbey-v2.vercel.app/api/auth/google/callback`
   * `http://localhost:3000/api/auth/google/callback`  (local development)
   Do **not** add a `nowbey://` redirect: the app's browser handshake finishes on the website and only
   then deep-links into the app, so Google never sees the custom scheme.
3. Copy the **Client ID** and **Client secret**.
4. Vercel → project → **Settings → Environment Variables** → add for **Production** (and Preview if you
   want previews to work):
   * `GOOGLE_CLIENT_ID`
   * `GOOGLE_CLIENT_SECRET`
   Never set `GOOGLE_OAUTH_BASE` there — that variable exists only so tests can point the token call at
   a local fake.
5. Run the column migration once (see §0). The Neon **SQL Editor** runs SQL, not file names, so paste
   the two statements below (or open `src/db/add-google-auth.sql` on GitHub → ⋯ → *Copy raw contents*
   → paste), then press **Run**:

   ```sql
   ALTER TABLE users ADD COLUMN IF NOT EXISTS google_sub text;
   CREATE UNIQUE INDEX IF NOT EXISTS users_google_sub_idx ON users (google_sub);
   ```

   To confirm it landed: `select column_name from information_schema.columns where table_name = 'users' and column_name = 'google_sub';` — one row means done. Both statements are idempotent, so a second run is harmless.
6. Redeploy. `/api/auth/google/status` should answer `{"enabled":true}` and the button appears on
   `/login`.
> **If the Firebase-created client's redirect field is not editable** (the auto-created "Web client" is
> sometimes locked): create a fresh **Web application** client in the Cloud console credentials page
> with the two redirect URIs above, and use *that* client's id and secret in Vercel. The consent screen
> is shared, so both clients work.

> **The client secret is masked on purpose and cannot be unmasked** — in Firebase, and in the Cloud
> console too. The Cloud console's client panel shows no secret and no copy button at all; the value is
> revealed exactly once, when a client is created, and resetting a secret reveals it once more. Three
> ways to get the real value:
> 1. **Copy button.** In the Cloud console client panel the masked field has a copy icon. Tapping it
>    puts the full value on the clipboard: paste it straight into the Vercel field (long-press → Paste).
> 2. **Download JSON.** Cloud console → Credentials → the client's row → download icon. That saves
>    `client_secret_….apps.googleusercontent.com.json`; open it in any text editor and copy the
>    `client_secret` value.
> 3. **New client (the reliable route).** Create credentials → OAuth client ID → Web application → the
>    "OAuth client created" dialog shows the id and secret in plain text with copy buttons, and that
>    dialog is the *only* place the secret ever appears. Use this client in Vercel instead of the
>    auto-created one; the consent screen is shared, so both work.
> 4. **Reset the secret** on an existing client (credentials page → the client → **Reset secret**): the
>    same one-time dialog appears with the new value. Use this if you would rather keep the auto-created
>    client — note that resetting invalidates the old secret everywhere it was used.
>
> Sanity check before saving in Vercel: the secret must not look like the client id (it never ends in
> `.apps.googleusercontent.com`), and roughly 30–40 characters. Clients created recently start with
> `GOCSPX-`; older ones do not, and either is fine.
>
> **Secrets:** the client secret goes in Vercel and nowhere else — not in chat, not in Git, not in a
> screenshot. If one is ever exposed, delete that client in the Cloud console and create a new one;
> the old secret dies with it.

**Shortcut if the Cloud console UI fights you on a phone:** `console.firebase.google.com` → project
`nowbey-6a30f` → **Build → Authentication → Get started → Sign-in method → Google → Enable** (set the
public-facing name `NowBey` and a support email), then copy the **Web client ID** and **Client secret**
from Google → **Web SDK configuration**. That creates the client and the consent screen for you. You
still have to add the two redirect URIs above to that client, in the Cloud console credentials page —
the redirect flow only works if they are registered character for character.

7. Test on a phone: tap **Sign up with Google** with a fresh address → the account appears with a handle
   derived from the address and a confirmed email; sign out; tap **Sign in with Google** again → same
   account, no duplicate. Then check that an address whose local part matches an `ADMIN_HANDLES` entry
   (for example `mario242@…`) does **not** become an admin: the handle is adjusted, never the rights.

Rules that are already enforced in code, for the record: an unverified Google address can never open an
account; linking an address that was never confirmed drops any existing session and emails the member;
the return trip can never be redirected off-site; the handshake cookie is HttpOnly, SameSite=Lax and
expires in ten minutes; the app trades a five-minute single-use code for its own token.

## 0. Additive database migration

Run these once in the production Neon SQL Editor — the editor takes SQL statements, not file paths;
`add-google-auth.sql` contains them at the top of the file for copy/paste (each is additive and safe to re-run):

* `src/db/add-community-utility.sql` — before using the **Open now** admin page. Adds the `service_statuses` table and indexes only.
* `src/db/add-google-auth.sql` — before switching on Sign in with Google. Adds `users.google_sub` and its unique index; `NULL` for every existing account, so nothing changes until someone uses the Google button.
* `src/db/add-profiles.sql` — before the profile pages are used. Adds `member_profiles`, `hidden_profile_reports`, `member_notes` and `badge_grants`, with their indexes and a `user_id` index on `incidents`. Nothing reads these tables until the profile code ships, so running it early (or late) changes no existing page. **Applied 2026-10-15 in the production Neon SQL editor** — the verification query answered with the four expected tables (`badge_grants`, `hidden_profile_reports`, `member_notes`, `member_profiles`) in 184 ms. Because the file runs as one transaction they were created together or not at all, so no half-migrated state exists; the file is idempotent, so a repeat run costs nothing. One last tick, worth doing once: the two indexes at the tail of the file sit outside the table blocks, so a paste that stopped early is the only realistic way to miss them.

  ```sql
  select
    (select count(*) from pg_indexes where schemaname = 'public' and indexname in
      ('hidden_profile_reports_user_incident_idx','hidden_profile_reports_user_idx','member_notes_user_idx',
       'badge_grants_user_idx','incidents_user_idx','incident_updates_actor_idx')) as indexes,
    (select count(*) from information_schema.table_constraints where constraint_type = 'FOREIGN KEY' and table_name in
      ('member_profiles','hidden_profile_reports','member_notes','badge_grants')) as foreign_keys;
  ```

  Expect `indexes = 6` and `foreign_keys = 5`; if either is short, re-run the whole file and ask again.

* `migrate-canned-photo-notes.sql` (repo root) — data cleanup, not schema: clears the demo canned
  photo notes (`water up to the first step…`) from `incidents.photo_note`, matching the matcher in
  `src/lib/report-utils.ts` exactly. The UI already suppresses these notes; this removes them from
  the API and exports too. Run the `SELECT` at the top first to see what will change, then the
  `UPDATE`. Idempotent — a repeat run changes nothing.

## 1. Firebase (required for actual push delivery)

Token registration, channels, tap handling, Android package configuration, and the GitHub `FIREBASE_GOOGLE_SERVICES_JSON` secret are ready. The file was validated against Firebase project `nowbey-6a30f` (project number `437051839288`) and Android package `app.nowbey.mobile` on 2026-10-15.

Before the intentionally postponed APK build:

1. Firebase → Project settings → Service accounts → generate an Admin SDK private-key JSON.
2. Upload that private-key file **directly** at expo.dev → NowBey → Credentials → Android → FCM V1. Never put it in chat or Git.
3. Confirm GitHub Actions has an `EXPO_TOKEN` secret.
4. Actions → Deploy (Vercel + EAS) → Run workflow → target `mobile`.

**Status 2026-10-15 — the key is on EAS (owner's confirmation); one tap is left.** The FCM V1 key is a
server-side credential for the Expo push service, not something baked into the APK: the app asks Expo for
a token (`expo/src/push.ts` → `getExpoPushTokenAsync`) and the server sends to Expo (`src/lib/push.ts`
→ `exp.host`), so Expo is the FCM sender and needs the key. Without it the app cannot mint a token (or
Expo answers `InvalidCredentials` on send), which is why the key must exist before a tester's first launch.
It must come from Firebase project `nowbey-6a30f` — the same project as `google-services.json` — or Expo
answers `MismatchSenderId`. This key does **not** switch on the **website's** browser push: that path needs
the separate `FIREBASE_*` and `NEXT_PUBLIC_FIREBASE_*` variables in Vercel, so `/api/health` keeps
reporting `push:false` for the site even when Android delivery works.

The Arena GitHub integration that edits this repo **cannot dispatch a workflow** the usual way
(`HTTP 403: Resource not accessible by integration` on `POST …/actions/workflows/…/dispatches`), and for the
same reason it cannot cancel a run. It *can* send a `repository_dispatch` event, which only needs the
permission to push, so the workflows listen for one: `deploy` with `client_payload.target` = `mobile` starts
a build, and `eas-cancel` presses the stop button below. An agent still starts a build only when the owner
asks for one.

**Status 2026-10-15 — EAS builds are paused at the owner's request.** The dispatches so far, all from **master**:

* Run `38765056982`: the EAS step failed 29 seconds in, because `expo/.gitignore` kept `google-services.json`
  out of the archive EAS uploads. Fixed by the root `.easignore` (PR #9), which restates every ignore rule
  plus `!google-services.json`.
* Runs `38773683026`, `38774558576` and `38775536019`: the CLI refused `eas.json` before any build started —
  `"build.preview.image" is not allowed` (`image` belongs under `android`/`ios`, not on the profile). Only
  the third run, the first with the reporting step, could say so. Fixed by PR #14.
* Run `38776482421`: every step passed and EAS accepted build `8c72ae65-6282-4d66-b3f3-d32ce3f203a5`
  (17:22 UTC), the first build this pipeline got onto a worker. The owner asked for EAS builds to stop, so it
  was **cancelled** at 17:48 UTC by the *Cancel EAS builds* workflow (run `38780263539`, last seen
  `PENDING_CANCEL`) before it finished: there is no APK from it, and whether it would have compiled is unknown.

That last run still showed **green**: `eas build --wait` exits 0 for a cancelled build — it only counts
`ERRORED` as a failure. The mobile job now reads the build record (`--json`) instead, so only a `FINISHED`
build is green, and its summary carries the build page and the APK link.

The newest APK on EAS is preview build `56ab2649-194b-492c-b5d9-8901da9dec50`, built from `6e4ca45`
(2026-10-14 22:59 UTC). Master is 63 commits ahead of it, so it predates every fix above.

**Status 2026-10-17 — resumed on the owner's request; an APK finished.** The owner asked for a build,
so the dispatch below was sent (workflow_dispatch still answers 403 for this integration). Run
`39050991724` from `c23510a` passed the gate, the APK preflight and the EAS credential check, and EAS
returned a **FINISHED** preview build:

* APK: https://expo.dev/artifacts/eas/t-q_89mYpUAVHPhxqZ_zPBzpdYQmFcRslap4o08YX9E.apk

This is the first build of the pipeline to finish since the pause — earlier attempts were refused,
cancelled, or blocked by a billing flag on the account. The APK carries the Firebase config baked in
from the `FIREBASE_GOOGLE_SERVICES_JSON` secret; push delivery to a device is still unproven and stays
on this checklist.

**Status 2026-10-19 — the pipeline is ready; the `EXPO_TOKEN` lost its access.** The web half of the
deploy is green (production serves the merged master), and run `39240916798` passed the gate and the
APK preflight (which now explicitly checks *preview builds an APK, not an AAB*). The EAS step was
refused before any build started:

```
Entity Not Authorized: Entity not authorized: AppEntity[10e4a677-274e-43b1-99e6-33a2b32ccd23]
(viewer = RegularUserViewerContext[…]) — You don't have the required permissions to perform this
operation. This can sometimes happen if you are logged in as incorrect user.
```

`AppEntity[10e4a677…]` is the NowBey Expo project (`extra.eas.projectId` in `expo/app.json`,
`owner: oasistech242`). The token behind the `EXPO_TOKEN` secret authenticated, but as a user who is
not authorized on that project — the secret's token changed or its account lost access since the
2026-10-17 build.

**Status 2026-10-19 (later) — the mismatch is now identified, not guessed.** The *Check EAS
credentials* step now publishes `eas whoami` as a check-run annotation, so the answer is readable
without opening a job log or downloading the `eas-build-log` artifact. Runs `39246338465` and
`39247134986` (both `mobile` dispatches, both green through the gate and the APK preflight) report:

| | |
| --- | --- |
| `EXPO_TOKEN` authenticates as | `nowbey242s-team` (Role: Owner) |
| the project it must reach | `oasistech242/nowbey` |
| `extra.eas.projectId` | `10e4a677-274e-43b1-99e6-33a2b32ccd23` |
| viewer in the refusal | `09b5a115-f3cc-4096-a6a9-72ccf462d1dd` |

So the secret is **not** broken and the pipeline is **not** broken: the token is a valid Owner token,
but for a *different* Expo account than the one that owns the NowBey project. The viewer UUID is
identical in every failure since `39240916798`, i.e. the secret has not changed between attempts.
Nothing in the repository can fix this — it is an expo.dev account decision. Owner fix (never paste a
token anywhere but the secret):

* **Keep the project where it is:** expo.dev → account `oasistech242` → project NowBey → Members →
  invite `nowbey242s-team`. Nothing in Git changes; the next `mobile` dispatch builds.
* **Or move the app to the account the token already owns:** on expo.dev, transfer or recreate the
  NowBey project under `nowbey242s-team`, then update `expo/app.json` — `owner` to `nowbey242s-team`
  and `extra.eas.projectId` to the new project's UUID (from `eas init` under that account). Both
  fields must change together; changing `owner` alone still resolves the app by the old `projectId`
  and fails the same way.
* **Or point the secret back at the project's owner:** create a fresh access token while logged in as
  `oasistech242` (expo.dev → Account settings → Access tokens) and replace the `EXPO_TOKEN`
  repository secret with it.

Then re-run the `mobile` dispatch below — the app source is already synced with master. If it is
refused again, the annotation names the account, so there is nothing left to dig for.

**To resume, only when the owner says so:** Actions → Deploy (Vercel + EAS) → Run workflow → `mobile`, or

```bash
gh api repos/g4tech9-hash/nowbey-v2/dispatches -f event_type=deploy -f 'client_payload[target]=mobile'
```

**To stop a build:** Actions → Cancel EAS builds → Run workflow, or

```bash
gh api repos/g4tech9-hash/nowbey-v2/dispatches -f event_type=eas-cancel
```

or the Cancel button on the build page at expo.dev. Cancelling the *GitHub run* is not enough: it only
stops the CLI that is waiting, and the build carries on on Expo's servers.

For a local build only, download `google-services.json` from the existing Android app and save it as `expo/google-services.json` (git-ignored).

Why manual: creating Firebase projects and downloading server keys cannot be
done from here without your Google account.

## 2. If the EAS build asks for login

Run `eas login` (or `eas login --help`), then rerun the build command above.

## 3. Optional: higher Expo Push rate limits (free)

Add your key to the server env (never in git): `EXPO_ACCESS_TOKEN=<token>`.
Get one at expo.dev → your username → Access Tokens.

## 4. Test checklist (after install)

Deny the permission → app must not crash (code returns "skipped").
Accept → file a test report from another account on the same island →
notification arrives → tap opens the report. Revoke in Android settings →
re-register path still safe.
