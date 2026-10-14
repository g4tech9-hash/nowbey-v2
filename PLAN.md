# PLAN — Android push via Expo Push Service (10 lines)
1. Branch `feat/push-notifications`; install `expo-notifications expo-device` (constants present).
2. Client `expo/src/push.ts`: permission → channel → ExpoPushToken(projectId) → POST `/api/push/register`; foreground/banner, tap→`data.path`; never crash without permission/FCM file.
3. Hook registrar after login in `app/_layout.tsx`; plugin + channel in `app.json`; gitignore `google-services.json`.
4. Backend `device_tokens(user_id, token)` unique pair: `schema.ts` + `create-tables.sql`.
5. `POST /api/push/register` (auth): validate `ExponentPushToken[...]`, upsert.
6. `src/lib/push.ts`: chunk ≤100, Expo Push API send, receipt check, prune `DeviceNotRegistered`.
7. Call `sendPush` after email loops in `dispatchIncidentAlerts`/`dispatchNewsAlert`; failures never block email.
8. `.env.example` += optional `EXPO_ACCESS_TOKEN`; pure-function tests in `tests/`.
9. Gates: scoped lint, both typechecks, doctor, android export, node tests, diff review.
10. Commit push files only; push branch; verify backend deploy; `eas build preview/apk`; SUMMARY.md.
