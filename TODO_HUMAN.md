# TODO_HUMAN — production setup, manual steps (no guessing)

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
