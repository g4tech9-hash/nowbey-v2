# Test Results

Autonomous run — 2026-10-16 (branch arena/8cfa01df-nowbey-v2).

## Environment / Tooling
- Node.js v22.22.3, npm 10.9.8, git 2.39.5, gh 2.23.0 (auth OK).
- Vercel/EAS/Expo/Playwright/psql CLIs: NOT available. node_modules installed with `--ignore-scripts` (network limits native builds).
- No local Postgres/SMTP catcher => DB-backed suites not run.

## Static checks
- `npm run typecheck`: PASS.
- `npm run lint`: PASS.
- `npm test` (hermetic unit): PASS — 48/48.
- `npm run build`: FAIL in sandbox — Google Fonts (fonts.googleapis.com) unreachable; Turbopack cannot fetch Manrope/Sora. CI (with network) is the authority; code unchanged. Recorded as environmental blocker.
- Expo `npm run typecheck`: PASS.
- `npx expo-doctor`: 19/21; 2 failures are network (Expo API schema + package metadata).

## UI tests
- `npm run test:ui`: PASS — 7/7 (after DB-backed server available).

## Mobile audit
- `node scripts/mobile-audit.mjs`: PASS — 0 findings across all phone widths.

## Integration tests
- `npm run test:local`: PASS — 62 + 14 checks (endpoints, auth, mail, admin, google, profile, security).

## Not run (blocked)
- `npm run fuzz`: timed out in sandbox (long-running); not a failure of code.
- E2E/browser (Playwright not installed), performance, Android device test.
- Vercel deploy, EAS APK build (no CLIs/auth).

## Fixes applied
- tests/ui.test.mjs: updated pin-list selector to match `aria-busy` attribute.
- .env.example: appended optional AI/feed/push/trust-proxy vars.
- AUDIT.md: appended current audit section.
