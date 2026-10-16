# Expo APK Preflight Audit

This skill performs a comprehensive preflight audit for creating an internal-distribution Android APK via EAS.

## Goals
Deliver a working, standalone APK for testers. No Play Store, no AAB, no Capacitor.

## Audit Gates
### 1. Project Discovery & Protection
- [ ] Verify the actual Expo app directory (ensure it is not a Next.js root).
- [ ] Inspect git status and protect uncommitted work.
- [ ] Confirm the correct package manager is being used.

### 2. Full-Stack Audit
- [ ] Run mobile lint and typecheck.
- [ ] Run `npx expo install --check` to verify SDK compatibility.
- [ ] Run `npx expo-doctor` to verify project health.
- [ ] Verify production API URLs, HTTPS, and essential tester journeys.
- [ ] Ensure no secrets are bundled or committed.

### 3. Configuration Check
- [ ] Verify `eas.json`: Android `preview` profile must have `distribution: internal` and `buildType: apk`.
- [ ] Verify `app.json`: Correct `android.package` and `versionCode`.
- [ ] Verify EAS login and project access.

### 4. Pre-build Inspection
- [ ] Run `npx expo export --platform android` to check JS bundling.
- [ ] Inspect EAS upload archive using `eas build:inspect`.

### 5. Runtime & Distribution
- [ ] Verify installation link accessibility for testers.
- [ ] (If device available) Install APK and verify login/main flows.
- [ ] Check if existing APKs can be updated in place (signing consistency).

## Execution
Run the automated script `npm run preflight:apk` from the Expo app directory.
