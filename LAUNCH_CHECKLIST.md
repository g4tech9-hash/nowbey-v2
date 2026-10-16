# Launch Checklist

Autonomous run — 2026-10-16.

| Feature / Journey | Components | Required Test | Result | Evidence / Reason |
| --- | --- | --- | --- | --- |
| Typecheck (web) | tsc | npm run typecheck | PASS | exit 0 |
| Lint (web) | eslint | npm run lint | PASS | exit 0 |
| Unit tests (web) | node --test | npm test | PASS | 48/48 |
| Production build (web) | next build | npm run build | BLOCKED | Google Fonts unreachable in sandbox; CI authority |
| Expo typecheck | tsc | npm run typecheck | PASS | exit 0 |
| Expo doctor | expo-doctor | npx expo-doctor | PARTIAL | 19/21; 2 network failures |
| UI phone tests | tests/ui.test.mjs | npm run test:ui | PASS | 7/7 |
| Mobile audit | scripts/mobile-audit.mjs | npm run audit:mobile | PASS | 0 findings |
| Local API/auth/mail/admin | tests/* | npm run test:local | PASS | 62 + 14 checks |
| Fuzz | tests/fuzz.mjs | npm run fuzz | NOT RUN | needs server + DB |
| Vercel deploy | deploy.yml | vercel --prod | BLOCKED | no Vercel CLI/auth in sandbox |
| EAS APK build | expo/eas.json | eas build | BLOCKED | no EAS CLI/auth in sandbox |

## Launch Gates
- Website: NOT READY (build unverified in sandbox; DB-backed tests not run).
- Android: NOT READY (no device/emulator test; no APK built this session).

## Blockers
- No local Postgres/SMTP catcher for integration tests.
- Sandbox network blocks Google Fonts (build) and Expo API (doctor).
- No Vercel/EAS credentials/CLIs for deployment.
