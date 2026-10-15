# TODO_HUMAN — push notifications, manual steps (no guessing)

## 1. Firebase (required for actual push DELIVERY; everything else works without it)

Token registration, channels, and tap handling work now. Remote delivery needs
one Firebase step (free, ~10 min):

1. Go to https://console.firebase.google.com/project/nowbey-ed663 (you are
   signed in as g4tech9@gmail.com, which currently CANNOT add apps — 403).
   Either get Owner/Editor on that project, or have its owner do this step:
   Project Overview → gear → Project settings → General → Your apps → Add app
   → Android, package name `app.nowbey.mobile` → download `google-services.json`.
3. Copy it to `expo/google-services.json` (git-ignored; never commit it).
4. In `expo/app.json`, under `expo.android`, add:
   `"googleServicesFile": "./google-services.json"`.
5. Upload the FCM server key so Expo can send. EITHER:
   `eas credentials -p android` → pick this build profile → upload the
   `google-services.json` when asked; OR paste a Cloud Messaging **v1** private
   key at expo.dev → project nowbey → Credentials → Android → FCM V1.
5. Rebuild: `eas build --platform android --profile preview --non-interactive`.

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
