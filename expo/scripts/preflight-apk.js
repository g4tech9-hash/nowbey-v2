#!/usr/bin/env node
// Static checks by default. --full also validates Firebase, runs type-check and Metro export
// for Android (NowBey ships Android APKs only — no iOS yet, no Play Store AAB).
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const root = path.resolve(__dirname, '..');
const read = (name) => JSON.parse(fs.readFileSync(path.join(root, name), 'utf8'));
const failures = [];
const warnings = [];
function check(ok, label) { console.log(`${ok ? 'PASS' : 'FAIL'} ${label}`); if (!ok) failures.push(label); }
function warn(msg) { console.log(`WARN ${msg}`); warnings.push(msg); }

const full = process.argv.includes('--full');

const app = read('app.json').expo;
const eas = read('eas.json');
const profile = eas.build.preview;

check(app.owner === 'oasistech242', 'owner is set (Expo account links the project)');
check(Boolean(app.extra?.eas?.projectId), 'EAS project is linked');
check(app.scheme === 'nowbey', 'URL scheme is nowbey (deep links)');
check(app.runtimeVersion?.policy === 'appVersion', 'runtimeVersion pinned by appVersion for OTA updates');
check(typeof app.updates?.url === 'string' && app.updates.url.includes('/10e4a677-274e-43b1-99e6-33a2b32ccd23'), 'updates.url points at the EAS project (hosted OTA)');
check(profile.env.EXPO_PUBLIC_API_BASE === 'https://nowbey-v2.vercel.app', 'preview build targets production HTTPS API');
check(eas.cli?.appVersionSource === 'remote', 'appVersionSource=remote so EAS manages build numbers');
check(profile.distribution === 'internal', 'preview distribution is internal (not store)');
check(profile.android?.buildType === 'apk', 'preview builds an APK (not an AAB)');
check(profile.android?.image === 'latest', 'Android preview uses latest image (JDK 17)');

check(app.android?.package === 'app.nowbey.mobile', 'Android package is app.nowbey.mobile');
for (const asset of [app.icon, app.android?.adaptiveIcon?.foregroundImage, app.web?.favicon]) {
  if (asset) check(fs.existsSync(path.resolve(root, asset)), `asset exists: ${asset}`);
}
if (!Array.isArray(app.android?.permissions) || !app.android.permissions.includes('android.permission.POST_NOTIFICATIONS')) {
  check(false, 'Android POST_NOTIFICATIONS permission declared');
}

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

// iOS scaffolding is present in app.json and push.ts for when iOS support lands, but the build
// pipeline does not yet target iOS. Warn, don't fail.
if (!app.ios?.bundleIdentifier) warn('iOS config absent (expected — iOS builds not yet enabled).');

if (full && !failures.length) {
  const tsc = spawnSync('npm', ['run', 'typecheck'], { cwd: root, stdio: 'inherit', env: { ...process.env, CI: '1', EXPO_NO_TELEMETRY: '1' } });
  check(tsc.status === 0, 'npm run typecheck');
  if (tsc.status === 0) {
    const outDir = path.join(root, 'dist-android');
    const r = spawnSync('npx', ['expo', 'export', '--platform', 'android', '--output-dir', outDir], { cwd: root, stdio: 'inherit', env: { ...process.env, CI: '1', EXPO_NO_TELEMETRY: '1' } });
    check(r.status === 0, 'npx expo export --platform android');
    if (r.status === 0) fs.rmSync(outDir, { recursive: true, force: true });
  }
}

console.log(failures.length ? `\nPREFLIGHT FAILED (${failures.length})` : `\nPREFLIGHT PASSED (${full ? 'full' : 'static only'})${warnings.length ? ` with ${warnings.length} warning(s)` : ''}`);
process.exitCode = failures.length ? 1 : 0;
