# Verification Log – NowBey V2 Audit

## Environment and repository snapshot
- Audit directory: `C:\Users\Admin\Downloads\nowbeyV2\audit\2026-10-13_18-42`
- Repository root: `C:\Users\Admin\Downloads\nowbeyV2`
- HEAD: `11d0d250f454f63062c1f5f830710622f08f7ee3`
- Initial git status (pre-audit): untracked `task.txt` only.
- Node.js: v24.21.0; npm 11.19.0 (web project declares `node >=20.19.4`).
- Expo SDK/package observed: Expo 57.0.28, React Native 0.86.3, TypeScript 6.0.3.
- No audit tool installed globally. No application source changed.
- Web typecheck ignored? No; typecheck run and failed.

## Commands attempted and outcomes

1. `Get-ChildItem ...` (confirm access) – Success.
2. `git rev-parse HEAD` / `git status --short` – Success (HEAD shown; untracked task.txt).
3. `npm run lint` – Exit 0. Output: eslint completed; deprecated `.eslintignore` warning only.
4. `npm run typecheck` – Exit 1. Errors:
   - `capacitor.config.ts(1,33): error TS2307: Cannot find module '@capacitor/cli'`
   - `next.config.ts(13,7): error TS2451: Cannot redeclare block-scoped variable 'nextConfig'`
   - `next.config.ts(35,7): error TS2451: Cannot redeclare block-scoped variable 'nextConfig'`
5. `npm run build` – Exit 1. Failure: `Failed to load next.config.ts`; `SyntaxError: Identifier 'nextConfig' has already been declared`.
6. `npm audit` – Exit 1. Found high/moderate dev-only advisories (braces, micromatch, fast-glob, postcss, esbuild chain).
7. `npm audit --omit=dev` – Exit 0. found 0 vulnerabilities.
8. Expo `npm run typecheck` – Exit 0. Passed.
9. `git ls-files .env .env.vercel` – no tracked files; `git check-ignore` confirms both are ignored.

## Tests run, failed, blocked, skipped
- Existing app tests: None found under `src` or `expo` (excluding node_modules).
- Unit/integration/e2e: Not available; skipped/no tests.
- Runtime smoke test: Blocked intentionally. Would require connecting to configured production PostgreSQL database, emails, Stripe, etc. Policy prohibits live database/payment/email/SMS.
- Visual/accessibility runtime checks: Blocked/no browser automation used.

## Runtime flows actually exercised
- None end-to-end. Static code/path review only.

## External research sources and access dates
- Web search attempted for Stripe Bahamas merchant eligibility on 2026-10-13 and was cancelled/unavailable.
- No external facts were relied on for material claims; availability/eligibility statements are labeled unverified.
- Next.js local docs under `node_modules/next/dist/docs/` were available but not deeply consulted; audit was source-focused.

## Reviewed, sampled, and excluded areas
Reviewed:
- Root manifests, scripts, .env examples, docs/notes, next/eslint/tsconfig, proxy, auth, viewer, staff, actor, billing, webhook, checkout, cron, http, rate limits, sanitize, schema, representative product page.

Sampled:
- Incidents/read feed, login/session, enterprise, geocode, alerts tiers, admin users.
- Expo package and typecheck.

Excluded/time-boxed:
- Full line-by-line review of all 171 web source files.
- Native Expo source screens/routes security/deep UI.
- All historical SQL migrations and generated deploy artifacts.
- Binary files, lockfiles, generated dist, image assets, vendor.

## Reasons for limitations
- Strict low-credit budget and explicit single-pass risk-based audit.
- No release of changes allowed.
- No safe local database/payment/email environment.

## Temporary artifacts created
- `C:\Users\Admin\AppData\Local\Temp\opencode\lint.txt`
- `C:\Users\Admin\AppData\Local\Temp\opencode\tsc.txt`
- `C:\Users\Admin\AppData\Local\Temp\opencode\build.txt`
- `C:\Users\Admin\AppData\Local\Temp\opencode\auditnpm.txt`
- `C:\Users\Admin\AppData\Local\Temp\opencode\auditnpm2.txt`
- `C:\Users\Admin\AppData\Local\Temp\opencode\expotsc.txt`

## Observed file changes resulting from tools
- The audit created a new directory and reports under `audit\2026-10-13_18-42`.
- No source/build/configuration files modified by audit tools.
- `git status` changed in expected way: untracked audit reports and existing task.txt.

## Usage information
- Not available/not claimed. No tool exposed billing/credit usage.
