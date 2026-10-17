#!/usr/bin/env node
// Safe static checks by default. --full also validates Firebase, runs type-check and Metro export
// for the platform(s) requested via --android/--ios (defaults to both when neither is passed).
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const root = path.resolve(__dirname, '..');
const read = (name) => JSON.parse(fs.readFileSync(path.join(root, name), 'utf8'));
const failures = [];
const warnings = [];
function check(ok, label) { console.log(`${ok ? 'PASS' : 'FAIL'} ${label}`); if (!ok) failures.push(label); }
function warn(msg) { console.log(`WARN ${msg}`); warnings.push(msg); }

const args = process.argv.slice(2);
const full = args.includes('--full');
const wantAndroid = !args.includes('--ios') || args.includes('--android');
const wantIos = !args.includes('--android') || args.includes('--ios');

const app = read('app.json').expo;
const eas = read('eas.json');
const profile = eas.build.preview;
const prodProfile = eas.build.production;

// --- common / cross-platform checks --------------------------------------------
check(app.owner === 'oasistech242', 'owner is set (Expo account links the project)');
check(Boolean(app.extra?.eas?.projectId), 'EAS project is linked');
check(app.scheme === 'nowbey', 'URL scheme is nowbey (deep links)');
check(app.runtimeVersion?.policy === 'appVersion', 'runtimeVersion pinned by appVersion for OTA updates');
check(typeof app.updates?.url === 'string' && app.updates.url.includes('/10e4a677-274e-43b1-99e6-33a2b32ccd23'), 'updates.url points at the EAS project (hosted OTA)');
check(profile.env.EXPO_PUBLIC_API_BASE === 'https://nowbey-v2.vercel.app', 'preview build targets production HTTPS API');
check(prodProfile.env.EXPO_PUBLIC_API_BASE === 'https://nowbey-v2.vercel.app', 'production build targets production HTTPS API');
check(eas.cli?.appVersionSource === 'remote', 'appVersionSource=remote so EAS manages build numbers');
check(prodProfile.autoIncrement === true, 'production auto-increments store build numbers');

for (const asset of [app.icon, app.android?.adaptiveIcon?.foregroundImage, app.web?.favicon]) {
  if (asset) check(fs.existsSync(path.resolve(root, asset)), `asset exists: ${asset}`);
}

// --- Android --------------------------------------------------------------------
if (wantAndroid) {
  check(app.android?.package === 'app.nowbey.mobile', 'Android package is app.nowbey.mobile');
  check(profile.distribution === 'internal' && profile.android?.buildType === 'apk', 'preview is an internal APK, not store AAB');
  check(prodProfile.android?.buildType === 'app-bundle', 'production builds an AAB for Play Store');
  check(profile.android?.image === 'latest', 'Android preview uses latest image (JDK 17)');
  check(prodProfile.android?.image === 'latest', 'Android production uses latest image (JDK 17)');
  const androidFile = path.resolve(root, app.android?.googleServicesFile || './google-services.json');
  if (fs.existsSync(androidFile)) {
    const firebase = JSON.parse(fs.readFileSync(androidFile, 'utf8'));
    check(firebase.project_info?.project_id === 'nowbey-6a30f', 'Firebase project matches push sender');
    check(firebase.client?.some((c) => c.client_info?.android_client_info?.package_name === app.android.package), 'Firebase contains this Android package');
  } else if (full) {
    check(false, 'google-services.json present (CI installs it securely before full preflight)');
  } else {
    warn('Firebase file is absent locally; full preflight must run in CI with the secret installed.');
  }
  if (!Array.isArray(app.android?.permissions) || !app.android.permissions.includes('android.permission.POST_NOTIFICATIONS')) {
    check(false, 'Android POST_NOTIFICATIONS permission declared');
  }
}

// --- iOS ------------------------------------------------------------------------
if (wantIos) {
  check(app.ios?.bundleIdentifier === 'app.nowbey.mobile', 'iOS bundleIdentifier is app.nowbey.mobile');
  check(app.ios?.supportsTablet === true, 'iOS supports tablets');
  check(app.ios?.infoPlist?.ITSAppUsesNonExemptEncryption === false, 'iOS declares ITSAppUsesNonExemptEncryption=false (App Store export question)');
  check(typeof app.ios?.infoPlist?.NSLocationWhenInUseUsageDescription === 'string' && app.ios.infoPlist.NSLocationWhenInUseUsageDescription.length > 0, 'iOS has NSLocationWhenInUseUsageDescription');
  const iosFile = path.resolve(root, 'GoogleService-Info.plist');
  if (fs.existsSync(iosFile)) {
    console.log('PASS GoogleService-Info.plist present (iOS push)');
  } else if (full) {
    warn('GoogleService-Info.plist missing; iOS builds will not receive FCM push until the FIREBASE_GOOGLE_SERVICE_INFO_PLIST secret is added (Android push works without it).');
  }
  check(profile.ios?.image === 'latest', 'iOS preview uses latest image');
  check(prodProfile.ios?.image === 'latest', 'iOS production uses latest image');
}

// --- full: typecheck + Metro export for each requested platform ---------------
if (full && !failures.length) {
  const tsc = spawnSync('npm', ['run', 'typecheck'], { cwd: root, stdio: 'inherit', env: { ...process.env, CI: '1', EXPO_NO_TELEMETRY: '1' } });
  check(tsc.status === 0, 'npm run typecheck');
  if (tsc.status === 0) {
    const platforms = [];
    if (wantAndroid) platforms.push('android');
    if (wantIos) platforms.push('ios');
    for (const platform of platforms) {
      const r = spawnSync('npx', ['expo', 'export', '--platform', platform, '--output-dir', `dist-${platform}`], { cwd: root, stdio: 'inherit', env: { ...process.env, CI: '1', EXPO_NO_TELEMETRY: '1' } });
      check(r.status === 0, `npx expo export --platform ${platform}`);
      if (r.status === 0) fs.rmSync(path.join(root, `dist-${platform}`), { recursive: true, force: true });
      if (r.status !== 0) break;
    }
  }
}

console.log(failures.length ? `\nPREFLIGHT FAILED (${failures.length})` : `\nPREFLIGHT PASSED (${full ? 'full' : 'static only'})${warnings.length ? ` with ${warnings.length} warning(s)` : ''}`);
process.exitCode = failures.length ? 1 : 0;
