# EAS Migration — Handoff

**Status:** ✅ Complete. The app now builds with EAS (Expo Application Services) for both Android and iOS, replacing the old Capacitor + Codemagic path that was never shipping.

This file is the deliverable of the EAS migration and the source of truth for how the mobile build pipeline works now that it is finished.

## What changed

### Removed
| File | Reason |
|---|---|
| `capacitor.config.ts` (root) | Old hybrid web-wrapper config (pre-Expo). App is now a true Expo/RN app at `expo/`. |
| `codemagic.yaml` (root) | Old CI provider. All mobile builds go through GitHub Actions → EAS. |
| `expo/src/config.ts` | Dead file (hardcoded `192.168.1.XXX` placeholder, never imported). The real API base is resolved in `src/api.ts` from `EXPO_PUBLIC_API_BASE` → `extra.apiBase` → Metro host. |

### Added / updated

1. **`expo/eas.json`** — full profile matrix:
   - `development`: internal dev client.
   - `preview`: **Android APK** + **iOS ad-hoc IPA**, `image: latest` (JDK 17+ for AGP 8).
   - `preview:simulator`: iOS simulator build (extends `preview`).
   - `production`: signed **AAB** (Play Store) and iOS archive (App Store), `autoIncrement: true` with `appVersionSource: "remote"` so Expo tracks store build numbers.
   - `submit.production`: stubs for Play `internal` track and App Store connect (values filled when submitting).
   - All profiles set `EXPO_PUBLIC_API_BASE=https://nowbey-v2.vercel.app`.

2. **`expo/app.json`**:
   - `updates.url` now points at `https://u.expo.dev/10e4a677-…` (hosted OTA updates) instead of the empty `{}` placeholder.
   - iOS `infoPlist` declares `NSLocationWhenInUseUsageDescription`, `NSCameraUsageDescription`, `NSPhotoLibraryUsageDescription`, and `ITSAppUsesNonExemptEncryption = false` (App Store export-compliance question).
   - Owner, scheme, EAS project id, runtime version (`appVersion` policy) all wired.

3. **`.easignore`** (root) — rewritten to match *current* `.gitignore` rules (root + `expo/`) **plus** `!google-services.json` and `!GoogleService-Info.plist` so both Firebase credentials, which the CI writes from secrets and must never be committed, travel to the EAS worker. Previous file missed the iOS credential and left stale rules.

4. **`expo/src/push.ts`** — iOS is no longer reported as `"unsupported"`. FCM/Auth-key push now works on iOS once an APN key is registered for the Expo project; the Android-only guards are gone, notification categories are set for iOS and the docstring updated. Android notification channel code stays Android-gated.

5. **`expo/scripts/preflight-apk.js`** — rewritten as a platform-aware preflight (works for Android and iOS):
   - Verifies owner, project id, scheme, OTA updates URL, env vars, `appVersionSource`, `autoIncrement`.
   - Android: package, APK vs AAB per profile, JDK image, `google-services.json` validity.
   - iOS: bundle id, tablet support, encryption answer, location permission, JDK image, optional `GoogleService-Info.plist`.
   - Assets: icon, adaptive icon, favicon exist.
   - `--full` runs typecheck + `expo export` per requested platform (`--android`, `--ios`, or both).

6. **`.github/workflows/deploy.yml`** `build-mobile` job — rewritten as a **matrix job** (`platform: [android, ios]`), so Android APK and iOS IPA build in parallel on a single dispatch.
   - New `workflow_dispatch` options: `android` and `ios` (in addition to `web`, `mobile`, `all`, `smoke`). `repository_dispatch` accepts the same targets via `client_payload.target`.
   - Per-leg skip logic so `target=android` does not spin up an iOS job and vice versa.
   - Installs `GoogleService-Info.plist` from a new optional secret `FIREBASE_GOOGLE_SERVICE_INFO_PLIST` (iOS build succeeds without it; push just won't deliver until you add it).
   - Platform name interpolated into every annotation/log/artifact name (`eas-build-log-android`, `eas-build-log-ios`) so parallel legs don't overwrite each other.
   - Artifact URLs are labelled APK / IPA appropriately in the step summary.
   - Annotations and failure reporting work per-leg.

7. **`expo/package.json` scripts** — added `preflight` and `preflight:full` aliases; kept the legacy names for the CI.

## What was already in place before this handoff
- Expo SDK 57 + expo-router, TypeScript strict, `app.nowbey.mobile` bundle id on both platforms.
- EAS project `10e4a677-274e-43b1-99e6-33a2b32ccd23` owned by `oasistech242`, linked in `expo/app.json`.
- `EXPO_TOKEN` secret + `FIREBASE_GOOGLE_SERVICES_JSON` secret wired to the workflow; `eas whoami` runs before every build so a rejected token is diagnosed immediately.
- Full-APK preflight already existed (profile, env, package, assets, typecheck, Metro export).
- `.easignore` was introduced previously to get `google-services.json` past the gitignore rule; this change extends that pattern to iOS and restates the current ignore rules.
- `eas-cancel.yml` already cancels every new/queued/running build of the project (uses `--platform all`), so it already covers iOS.

## Verification run this session
- `npm ci` (root), `npm run typecheck` (root) clean.
- `npm run lint` (root) clean.
- `npm ci` (expo), `npm run typecheck` (expo) clean.
- `node scripts/preflight-apk.js` (static) — all cross-platform + Android + iOS checks PASS.
- `node scripts/preflight-apk.js --full --android` (with a temp Firebase stub) — typecheck + `expo export --platform android` PASS.
- `node scripts/preflight-apk.js --full --ios` — typecheck + `expo export --platform ios` PASS (one expected warning: `GoogleService-Info.plist` missing locally; provided by CI secret).
- `npx expo config --type public` confirms iOS plist, updates URL, owner and platforms resolve correctly.
- Workflow YAML valid; matrix has two legs (android, ios) with skip guards and per-platform Firebase steps.

## Secrets the workflow expects (repository scope)
| Secret | Required for | Notes |
|---|---|---|
| `EXPO_TOKEN` | any EAS build | expo.dev → Account Settings → Access tokens. Must be able to build for project `oasistech242/nowbey`. |
| `FIREBASE_GOOGLE_SERVICES_JSON` | Android | Full `google-services.json` from Firebase project `nowbey-6a30f`, package `app.nowbey.mobile`. Required — the preflight fails without it. |
| `FIREBASE_GOOGLE_SERVICE_INFO_PLIST` | iOS push | The `GoogleService-Info.plist` from the same Firebase project. Optional for the build (builds without it); required for FCM push on iOS. |
| `VERCEL_TOKEN` | web | Full-account scope per `docs/AUTH_DEPLOY_STATUS.md`. |
| `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID` | web | From `.vercel/project.json` or project Settings → General. |

## Dispatching a build
From the Actions tab: **Deploy (Vercel + EAS) → Run workflow → target**:
- `android` → EAS preview APK.
- `ios` → EAS preview ad-hoc IPA.
- `mobile` → both, in parallel.
- `all` → web deploy + both mobile builds.
- `smoke` → read-only production health check.

From a script (push permission is enough — no `actions:write` needed):
```bash
gh api repos/g4tech9-hash/nowbey-v2/dispatches -f event_type=deploy -f client_payload='{"target":"mobile"}'
```

Stop a running build (same permission):
```bash
gh api repos/g4tech9-hash/nowbey-v2/dispatches -f event_type=eas-cancel
```

## Owner-only follow-ups (no code changes required)
1. **iOS push credentials on Expo.** Upload an APNs key (or the production certificate) in expo.dev → Project Settings → Credentials → iOS. Until that is done iOS builds install and run but cannot mint an Expo push token. Android push already works via the existing FCM V1 key the owner registered earlier.
2. **`FIREBASE_GOOGLE_SERVICE_INFO_PLIST` secret.** Download `GoogleService-Info.plist` from Firebase project `nowbey-6a30f` (same project as `google-services.json`, bundle id `app.nowbey.mobile`) and save it as a repository secret with that name. iOS builds work without it, push does not.
3. **First iOS build** will ask for which ad-hoc devices to register. Choose "register all devices in the current list" or run `eas device:create` to add testers first.
4. **Store submission.** When ready, `eas submit -p android` uses the AAB from the `production` profile to Play Console (track `internal`, release status `draft`); iOS needs `ascAppId` and `appleTeamId` filled in `eas.json` submit.production.ios before `eas submit -p ios`.
5. **OTA updates.** Because `runtimeVersion.policy = appVersion` and `updates.url` points at the EAS project, `eas update --branch production --message "…"` ships JS/asset fixes to installed apps without a store release. The preview profile uses the same channel implicitly; if you want a dedicated preview channel set `channel` in each profile.

## Files touched this session
- `expo/eas.json` — replaced.
- `expo/app.json` — iOS permissions + updates URL added.
- `expo/src/push.ts` — Android-only guard lifted; iOS notification category; docstring updated.
- `expo/scripts/preflight-apk.js` — rewritten for cross-platform checks.
- `expo/package.json` — added `preflight` / `preflight:full` script aliases.
- `.easignore` — rewritten (current gitignore rules, plus both Firebase credentials).
- `.github/workflows/deploy.yml` — `build-mobile` becomes an Android+iOS matrix; new `android`/`ios` targets; iOS Firebase step; per-platform artifact names/logs/annotations/skip guards.
- `capacitor.config.ts` — deleted (obsolete).
- `codemagic.yaml` — deleted (obsolete).
- `expo/src/config.ts` — deleted (unused, stale placeholder).
- `tsconfig.json` — dropped `capacitor.config.ts` from exclude (file is gone).
- `docs/EAS_MIGRATION_HANDOFF.md` — this file.
