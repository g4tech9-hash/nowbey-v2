# NOTES — deploy prep + EAS fix (autonomous session, user asleep)

## Finished
- STEP 1: `AUTH_SECRET` rotated, `CRON_SECRET` added — both `Secret` type, Production, `nowbey-v2`. Fingerprints only: `2092...37a8`, `a0e9...404f`. All sessions invalidated (sign-in required).
- STEP 2: all SQL run against prod Neon (`neondb_owner@ep-quiet-field-…neon.tech/neondb`, users=9/incidents=51):
  - create-tables 53/53, geofence 2/2, gas 2/2, place-import 3/3, security-hardening 6/6.
  - migrate-engagement: no-op — `post_likes`/`post_comments` already removed; file's own transaction rolled back, nothing written.
  - Verify: `token_hash`=1, `token_expires_at`=1, `gas_reports.user_id` nullable=YES.
  - Runner had a splitter bug (unanchored `$$` regex swallowed the file); fixed, in temp (not repo).
- EAS Android JDK fix: `expo/eas.json` all profiles `"image": "latest"` (AGP 8.x needs JDK 17; builder had JDK 11).
- `.env.vercel` untracked (`git rm --cached`; file left on disk). `.gitignore` already covers it.

## Skipped
- STEP 3 rotation: `.env` was NEVER in git (`git log --all -- .env` empty; ignored+untracked). No sharing evidence available. Rotation needs interactive Neon auth (CLI blocked: no `NEON_API_KEY`, org picker only) and would break prod until Vercel env + redeploy + health check — unsafe while user sleeps.
  Manual rotation (when awake): Neon dashboard → project → Roles → reset password for `neondb_owner` → copy new URL → `vercel env rm DATABASE_URL production -y` + `vercel env add` (same for `_UNPOOLED`) → update local `.env` → redeploy → confirm old password rejected.

## Assumptions
1. Local `.env` DATABASE_URL == production Neon (only prod-like credential; real data present).
2. `expo/eas.json` governs the Android build (only RN project in repo).
3. Root `eas.json` VANISHED mid-session (listed + read OK at start, gone later, never in git). Needs user eyes — possible external delete/sync issue. Fix applied to `expo/eas.json` only.
4. `.env.vercel`'s committed OIDC token treated as expired/short-lived; full history purge (`filter-repo`) left for user to decide.

## Manual actions for user
1. Merge `fix/security-hardening` → redeploy web (env changes need a redeploy to take effect).
2. Re-run EAS Android build; confirm JDK 17+ in build logs.
3. Verify prod health (`/api/health`, sign-in, incident post) after deploy.
4. Decide on `.env.vercel` history scrub; check `git log -p -- .env.vercel`.
5. Tell users a re-sign-in is required (AUTH_SECRET rotated).

## Addendum — parallel worker detected, EAS fix LOST
Another process is restructuring this repo right now (branch `master` + `deploy-production`;
commit `42682ea Clean up Expo/RN and convert to pure Next.js`; uncommitted moves: root `App.js`,
`mobile/`, edited `package.json`s). It switched the checkout off `fix/security-hardening`,
deleted the root `eas.json`, and overwrote `expo/eas.json` — my `"image": "latest"` pins are GONE.
My branch/commit (`4bc28bc`) is intact. Do NOT trust `expo/eas.json` state: re-apply the image
pin after the restructure settles, then re-run the EAS build. Production DB migration (STEP 2)
already applied and verified — unaffected.
