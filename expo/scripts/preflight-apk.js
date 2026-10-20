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

// The project link is one fact written in three fields (`owner`, `extra.eas.projectId`,
// `updates.url`), and only expo.dev can mint the UUID — so there are two legitimate shapes and one
// bug, and they must not be collapsed into one check:
//   * neither projectId nor updates.url: deliberately unlinked while waiting for expo.dev
//     (`docs/EAS_ACCOUNT_RELINK.md`). A warning, not a failure — nothing in this repository can fix
//     it, and inventing a UUID turns "Entity Not Authorized" into the vaguer "Project not found".
//     OTA is disabled outright in this state (`updates.url === null` makes expo-updates report
//     isEnabled false), so the warning says that plainly.
//   * both set and agreeing: linked.
//   * anything else — one of them set, or two different projects — is the half-move this preflight
//     exists to catch, and it fails.
const linked = uuid.test(projectId) && updatesUrl === `https://u.expo.dev/${projectId}`;
const unlinked = !projectId && !updatesUrl;

// `updates.url` must be ABSENT while unlinked, never present-and-null. @expo/config resolves a
// literal `null` here to `{}`, and config-plugins then computes
// `getUpdatesEnabled = (updates.url ?? null) !== null` as TRUE — so the manifest ships
// ENABLED="true" with EXPO_UPDATE_URL="[object Object]" (verified by running expo prebuild). That
// build tries to fetch updates from a garbage URL and reports isEnabled on device, so the You tab
// would call OTA live when it cannot work. An absent key resolves to null and disables updates
// cleanly, which is the honest state while waiting for expo.dev.
const urlKeyPresent = Object.prototype.hasOwnProperty.call(app.updates || {}, 'url');
check(!urlKeyPresent || typeof app.updates.url === 'string', 'updates.url is absent or a string (a literal null builds an enabled APK pointing at "[object Object]")');

if (unlinked) {
  warn('EAS project is not linked (extra.eas.projectId and updates.url are both unset): OTA updates are disabled in every build until the Link EAS project workflow mints a real project UUID.');
} else {
  check(uuid.test(projectId), 'EAS project is linked (extra.eas.projectId is a project UUID)');
  // A half-move — account and project UUID changed but updates.url kept the old project — is what
  // this catches; the three fields move together.
  check(linked, 'updates.url points at extra.eas.projectId (move both together)');
}

// OTA channel. `channel` on an eas.json build profile is how EAS Build picks the branch a build
// listens to, and it reaches the binary only as `updates.requestHeaders['expo-channel-name']`:
// @expo/config-plugins has no channel logic of its own, it just stringifies requestHeaders into the
// manifest (verified against the published plugin). Two failure modes follow, and both are silent:
// a profile with no channel yields a build that can never receive an update, and the local Gradle
// fallback (`scripts/build-apk-local.sh`) runs `expo prebuild` and never reads eas.json at all, so
// it needs the same header in app.json or it produces a channel-less APK. Keeping the two in
// agreement is the same discipline as the three link fields above.
const channel = typeof profile.channel === 'string' ? profile.channel.trim() : '';
const requestHeaders = app.updates?.requestHeaders;
const headerChannel = typeof requestHeaders?.['expo-channel-name'] === 'string' ? requestHeaders['expo-channel-name'].trim() : '';
check(channel.length > 0, 'preview build has an OTA channel (eas.json build.preview.channel)');
check(headerChannel.length > 0 && headerChannel === channel, 'app.json expo-channel-name matches the preview channel (the local Gradle build reads only app.json)');

// ON_LOAD is the default, and it makes the *native* layer reload on launch. Under this app's own
// splash (src/Splash.tsx) that reload lands mid-animation, so a successful update presents as a
// broken splash. The reload is done in JS after the splash instead (src/updates.ts).
check(app.updates?.checkAutomatically === 'ON_ERROR_RECOVERY', 'updates.checkAutomatically is ON_ERROR_RECOVERY (JS owns the reload, not the native launch)');
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
