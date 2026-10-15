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

## 0. Additive database migration

Run `src/db/add-community-utility.sql` once in the production Neon SQL Editor before using the **Open now** admin page. It only adds the `service_statuses` table and indexes; it does not modify existing member or incident data.

## 1. Firebase (required for actual push delivery)

Token registration, channels, tap handling, Android package configuration, and the GitHub `FIREBASE_GOOGLE_SERVICES_JSON` secret are ready. The file was validated against Firebase project `nowbey-6a30f` (project number `437051839288`) and Android package `app.nowbey.mobile` on 2026-10-15.

Before the intentionally postponed APK build:

1. Firebase → Project settings → Service accounts → generate an Admin SDK private-key JSON.
2. Upload that private-key file **directly** at expo.dev → NowBey → Credentials → Android → FCM V1. Never put it in chat or Git.
3. Confirm GitHub Actions has an `EXPO_TOKEN` secret.
4. Actions → Deploy (Vercel + EAS) → Run workflow → target `mobile`.

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
