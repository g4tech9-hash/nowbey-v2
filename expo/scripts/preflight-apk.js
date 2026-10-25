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
// The local Gradle fallback needs no Expo account: it compiles the same JS bundle on the runner.
// A project that has not been re-linked yet must still be buildable there, so this flag accepts a
// *wholly* unlinked config (no project UUID and no updates URL) and warns instead of failing.
// It never accepts a partial or malformed link — a half-move still fails, and a 37-character
// "UUID" is refused, not rounded up to a valid one.
const allowUnlinked = process.argv.includes('--allow-unlinked');

const app = read('app.json').expo;
const eas = read('eas.json');
const profile = eas.build.preview;

// The Expo account is an expo.dev decision, not a source decision: moving the project to another
// account rewrites `owner`, `extra.eas.projectId` and `updates.url` together. Pinning the account
// name or the project UUID here turned that move into a preflight failure before EAS was ever
// asked, so check the shape of the link instead of who it points at.
const owner = typeof app.owner === 'string' ? app.owner.trim() : '';
const projectId = typeof app.extra?.eas?.projectId === 'string' ? app.extra.eas.projectId.trim().toLowerCase() : '';
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const updatesUrl = typeof app.updates?.url === 'string' ? app.updates.url.trim().replace(/\/+$/, '') : '';

check(owner.length > 0, 'owner is set (Expo account links the project)');
check(app.scheme === 'nowbey', 'URL scheme is nowbey (deep links)');
check(app.runtimeVersion?.policy === 'appVersion', 'runtimeVersion pinned by appVersion for OTA updates');
if (allowUnlinked && !projectId && !updatesUrl) {
  // `expo prebuild` reads a missing `updates` block as "EAS Update disabled" and writes
  // EXPO_UPDATES_ENABLED=false. A null url is not the same thing: it resolves to `{}` and bakes
  // EXPO_UPDATE_URL="[object Object]" into the APK. That is why app.json omits the block instead
  // of nulling it, and why this branch is the only unlinked state the fallback accepts.
  warn('EAS project is not linked (extra.eas.projectId is absent): local Gradle build only, OTA updates disabled');
  warn('updates.url is absent: expo-updates stays disabled in this APK');
} else {
  check(projectId.length > 0 && uuid.test(projectId), 'EAS project is linked (extra.eas.projectId is a project UUID)');
  // A half-move — account and project UUID changed but updates.url kept the old project — is what
  // this catches; the three fields move together.
  check(projectId.length > 0 && updatesUrl === `https://u.expo.dev/${projectId}`, 'updates.url points at extra.eas.projectId (move both together)');
}
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

const mode = `${full ? 'full' : 'static only'}${allowUnlinked && !projectId && !updatesUrl ? ', local build without EAS link' : ''}`;
console.log(failures.length ? `\nPREFLIGHT FAILED (${failures.length})` : `\nPREFLIGHT PASSED (${mode})${warnings.length ? ` with ${warnings.length} warning(s)` : ''}`);
process.exitCode = failures.length ? 1 : 0;
