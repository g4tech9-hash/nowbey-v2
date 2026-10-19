# EAS Migration — Handoff

**Status:** ✅ Complete. NowBey builds Android APKs via EAS (Expo Application Services), replacing the old Capacitor + Codemagic path that was never shipping. iOS and Play Store submission are explicitly *not* enabled yet — this is direct APK distribution only.

## What changed

### Removed
| File | Reason |
|---|---|
| `capacitor.config.ts` (root) | Old hybrid web-wrapper config (pre-Expo). The app is now a true Expo/RN app at `expo/`. |
| `codemagic.yaml` (root) | Old CI provider. All mobile builds go through GitHub Actions → EAS. |
| `expo/src/config.ts` | Dead file (hardcoded `192.168.1.XXX` placeholder, never imported). The real API base is resolved in `src/api.ts` from `EXPO_PUBLIC_API_BASE` → `extra.apiBase` → Metro host. |

### Added / updated

1. **`expo/eas.json`** — two profiles, APK-only:
   - `development`: internal dev client.
   - `preview`: internal **APK** (`buildType: apk`, `distribution: internal`, `image: latest` for JDK 17+ on AGP 8).
   - `appVersionSource: "remote"` so Expo tracks Android `versionCode`; `cli.version >= 10.0.0`.
   - Both profiles set `EXPO_PUBLIC_API_BASE=https://nowbey-v2.vercel.app`.
   - No `production` (AAB) profile and no `submit` block yet — NowBey does not ship to Play Store.

2. **`expo/app.json`**:
   - `updates.url` points at `https://u.expo.dev/10e4a677-274e-43b1-99e6-33a2b32ccd23` (hosted OTA updates) instead of the empty `{}` placeholder. It moves with `owner` and `extra.eas.projectId`, never alone — `docs/EAS_ACCOUNT_RELINK.md`.
   - iOS metadata (bundle id, permissions, `ITSAppUsesNonExemptEncryption`) is *present* so the codebase is ready when iOS ships, but no iOS profile is built yet.
   - Owner, scheme, EAS project id, runtime version (`appVersion` policy) all wired.

3. **`.easignore`** (root) — matches *current* `.gitignore` rules (root + `expo/`) and un-ignores `google-services.json` so the CI-provided Firebase credential, which must never be committed, travels to the EAS worker.

4. **`expo/src/push.ts`** — iOS is no longer hard-coded as `"unsupported"`. Android notification channel setup stays Android-gated. Once an APN key is registered on the Expo project, iOS push will work with no code change.

5. **`expo/scripts/preflight-apk.js`** — Android-focused preflight with forward-compatible iOS warnings (not failures):
   - Verifies owner, project id, scheme, OTA updates URL, env vars, `appVersionSource`.
   - Confirms preview is `internal` distribution + `apk` build type (no AAB), latest image.
   - Android: package `app.nowbey.mobile`, `POST_NOTIFICATIONS` permission, `google-services.json` validity, assets exist.
   - Notes when iOS scaffolding exists but no iOS build is configured (informational).
   - `--full` runs typecheck + `expo export --platform android`.

6. **`.github/workflows/deploy.yml` `build-apk` job** — single Android-only job (renamed from `build-mobile` for clarity):
   - `workflow_dispatch` options: `web`, `mobile`, `all`, `smoke`. (`mobile` means "Android APK" until iOS ships.)
   - `repository_dispatch` accepts the same targets via `client_payload.target`.
   - Installs `google-services.json` from the `FIREBASE_GOOGLE_SERVICES_JSON` secret, validates package match, verifies `.easignore` won't exclude it.
   - Runs `npm run preflight:apk:full` (typecheck + Metro export) *before* calling EAS.
   - `eas whoami` runs before the build so a rejected token is diagnosed immediately.
   - Captures `--json` build output and surfaces the result via `::notice` / `::error` annotations (FINISHED only is green; CANCELED/ERRORED are red with the build page and error message).
   - Uploads `eas-build.log`, `eas-build.json`, `eas-whoami.log` as an `eas-build-log` artifact on every run (pass or fail).
   - Failure-reporter step fetches the build record from EAS (including via `build:view` for failures that happen after the CLI detaches) and posts the reason as a check annotation.

7. **`expo/package.json` scripts** — added `preflight` / `preflight:full` aliases alongside the existing `preflight:apk` / `preflight:apk:full` that CI calls.

8. **Helper scripts**:
   - `scripts/eas-dispatch.sh {mobile|fallback|web|all|smoke|cancel}` — dispatches a build (or cancels every in-flight one) using `repository_dispatch`, which only needs push permission (no `actions:write`).
   - `scripts/eas-status.sh` — prints the latest Deploy run and its annotations.

## Verification run this session
- `npm ci` (root), `npm run typecheck` (root) clean.
- `npm run lint` (root) clean.
- `npm test` (root): **107/107** pass.
- `npm ci` (expo), `npm run typecheck` (expo) clean.
- `node scripts/preflight-apk.js` (static) — all cross-platform + Android checks PASS; iOS scaffolding noted (expected).
- `node scripts/preflight-apk.js --full` (with a temporary Firebase stub) — typecheck + `npx expo export --platform android` PASS (3.4 MB hbc bundle).
- `npx expo config --type public` confirms owner, OTA URL, Android package and iOS plist resolve correctly.
- Workflow YAML validates; `build-apk` job runs the Firebase install → preflight → whoami → build → upload → report sequence in order.

## Secrets the workflow expects (repository scope)
| Secret | Required | Notes |
|---|---|---|
| `EXPO_TOKEN` | EAS path only | expo.dev → Account Settings → Access tokens. Must be able to build for the project named by `expo/app.json` (`owner` + `extra.eas.projectId`) — currently `oasistech242/nowbey`, moving to `nowbey-v3s-team` (see `docs/EAS_ACCOUNT_RELINK.md`). Not used by the local Gradle fallback. |
| `FIREBASE_GOOGLE_SERVICES_JSON` | yes | Full `google-services.json` from Firebase project `nowbey-6a30f`, package `app.nowbey.mobile`. Without it the preflight fails. |
| `VERCEL_TOKEN` | web only | Full-account scope per `docs/AUTH_DEPLOY_STATUS.md`. |
| `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID` | web only | From `.vercel/project.json` or project Settings → General. |

## Dispatching a build
From the Actions tab: **Deploy (Vercel + EAS) → Run workflow → target**:
- `mobile` → EAS preview Android APK, with the local Gradle build as the automatic fallback.
- `mobile-fallback` → skip EAS entirely and build the APK on the runner with Gradle.
- `web` → Vercel web deploy (usually redundant — the Vercel GitHub App deploys master on push).
- `all` → web deploy + APK.
- `smoke` → read-only production health check.

From a terminal (push permission is enough — no `actions:write` needed):
```bash
scripts/eas-dispatch.sh mobile     # build an APK (EAS, else the local fallback)
scripts/eas-dispatch.sh fallback   # skip EAS: build the APK locally with Gradle
scripts/eas-dispatch.sh cancel     # stop any in-flight build
scripts/eas-status.sh              # print the latest run's status + annotations
```

A finished EAS run posts a `::notice` with the artifact URL (starts `https://expo.dev/artifacts/eas/...apk`). That URL is the distribution link — share it directly; no Play Console needed.

## Fallback APK build (2026-10-19)

The mobile job no longer depends on EAS being reachable. `build-apk` runs the EAS step with
`continue-on-error: true`; when EAS refuses the build, errors on the worker, is cancelled, or is
skipped by the `mobile-fallback` target, the same job runs `scripts/build-apk-local.sh`:

1. `expo prebuild --platform android --no-install` generates `expo/android/` on the runner.
2. `./gradlew assembleRelease` builds `app-release.apk` with the generated debug keystore.
3. The APK is uploaded as the `nowbey-apk-fallback` artifact.

A final verdict step makes the run **green when either path produced an APK** and red only when
both failed; the run summary carries a table of the two outcomes and the EAS annotations explain
anything EAS refused. `mobile-fallback` skips the `eas whoami` check too, so a broken or missing
`EXPO_TOKEN` cannot block a local build.

The same script is the whole of `.github/workflows/build.yml` (**NowBey Local APK Build
(fallback)**, manual `workflow_dispatch`), so the automatic and manual paths cannot drift.

Why it is not just belt-and-braces: on 2026-10-19 the dispatch passed every check and was refused
by EAS with *"This account has used its Android builds from the Free plan this month"* (resets
2026-11-01). The token had been fixed the same day. A quota, a plan flag or an Expo outage stops
EAS without anything in this repository being wrong, and that is exactly when a build is needed.

What the fallback APK is *not*: it is signed with the debug key, so Android installs it for
testing, but it cannot replace a Play Store upload key. NowBey ships direct APKs only, so that is
the intended artifact — it is simply a different signing identity from an EAS preview build.

## Changing Expo accounts

`owner`, `extra.eas.projectId` and `updates.url` are one fact in three places; expo.dev mints the
UUID in the middle. `docs/EAS_ACCOUNT_RELINK.md` is the procedure, `expo/scripts/eas-relink.js`
performs the three-field write (and refuses a half-move), and the **Link EAS project** workflow
(`.github/workflows/eas-link.yml`) runs `eas init` and delivers the change as a pull request.

## When iOS or Play Store is added later
1. **iOS:** add a `preview` iOS block in `eas.json` (simulator + device) and a matching matrix leg in `build-apk` (rename back to `build-mobile`); add the `FIREBASE_GOOGLE_SERVICE_INFO_PLIST` secret + an iOS Firebase install step; register an APNs key on expo.dev; upload the `GoogleService-Info.plist` to the CI step. The `app.json` iOS block, `push.ts` iOS path and `.easignore` un-ignore rule are already in place.
2. **Play Store:** add a `production` profile (`buildType: "app-bundle"`, `autoIncrement: true`), a `submit` block with `track: "internal"`, and decide whether to auto-submit or only produce the AAB.

## Files touched this session
- `expo/eas.json` — replaced (APK-only profiles).
- `expo/app.json` — hosted `updates.url`; iOS metadata scaffolding.
- `expo/src/push.ts` — Android-only guard lifted; docstring updated.
- `expo/scripts/preflight-apk.js` — rewritten for Android APK preflight with forward-compatible iOS notes.
- `expo/package.json` — added `preflight` / `preflight:full` aliases.
- `.easignore` — rewritten for current .gitignore rules, un-ignores `google-services.json`.
- `.github/workflows/deploy.yml` — `build-apk` job (single-platform Android); `mobile` / `cancel` dispatch targets.
- `capacitor.config.ts`, `codemagic.yaml`, `expo/src/config.ts` — deleted (obsolete).
- `tsconfig.json` — dropped `capacitor.config.ts` from `exclude` (file gone).
- `tests/map-layout.test.mjs` — updated APK-workflow assertion (107/107).
- `scripts/eas-dispatch.sh`, `scripts/eas-status.sh` — added.
- `docs/EAS_MIGRATION_HANDOFF.md` — this file.
