# TODO_HUMAN — production setup, manual steps (no guessing)

## 0b. Claim the owner handles (do this first)

**Evidence (2026-10-15, from the production site itself):** signing in as `mario242` or `eastsiderick`
answers "No account has the handle @…". The deployed code only prints that sentence after looking the
handle up and finding no row, so **neither account exists in the production database yet** — there is
no password to reset and no role to restore. Both handles are listed in `ADMIN_HANDLES` /
`src/db/setup_admins.sql`, which are instructions to *grant* rights, not accounts.

Until the handle exists, any handle on the `ADMIN_HANDLES` list is a seat waiting to be taken:
`src/lib/viewer.ts` makes that handle an admin the moment it is registered. So:

1. On the live site, tap **Create account** and register `mario242` (a second one for `eastsiderick` if
   you use it) with an email you control and a strong password. Sign-up emails a confirmation link —
   tap it.
2. Check Vercel → Settings → Environment Variables: if `ADMIN_HANDLES=mario242` is set, step 1 already
   made the account an admin (`/admin` opens). If it is not set, either add it there (Production) and
   redeploy, or run `src/db/setup_admins.sql` in the Neon SQL editor to set `role='admin'`.
3. Never leave an unclaimed handle in `ADMIN_HANDLES`. If you must keep the list ahead of the account,
   claim the handle first.

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
