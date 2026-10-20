// Pins the OTA update path: the configuration that decides whether an update can reach a phone,
// and the shape of the code that applies one.
//
// Everything here is hermetic — it reads source and runs the preflight script against staged
// copies, so it needs no Expo account, no device and no network. The point is to make the silent
// failures impossible to reintroduce: an OTA update that does not arrive produces no error anywhere,
// so the only defence is a test that fails when the plumbing drifts.
//
// The two invariants that matter most, and why they are easy to break:
//   * The channel reaches a build ONLY as `updates.requestHeaders['expo-channel-name']`. EAS Build
//     injects it from `eas.json`'s `channel`; `expo prebuild` (the local Gradle fallback) never
//     reads eas.json and takes it from app.json. Two files, one fact, no error when they disagree.
//   * `checkAutomatically` must stay ON_ERROR_RECOVERY, because the app draws its own splash and a
//     native on-load reload lands mid-animation.
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const expo = path.join(repo, 'expo');
const read = (p) => fs.readFileSync(p, 'utf8');
const readJson = (p) => JSON.parse(read(p));

const { expo: app } = readJson(path.join(expo, 'app.json'));
const eas = readJson(path.join(expo, 'eas.json'));
const updatesSrc = read(path.join(expo, 'src', 'updates.ts'));
const layoutSrc = read(path.join(expo, 'app', '_layout.tsx'));
const youSrc = read(path.join(expo, 'app', '(tabs)', 'you.tsx'));

/** Strip comments, so a rule mentioned in prose cannot satisfy an assertion about code. */
const code = (source) => source.split('\n').filter((line) => !/^\s*(\/\/|\*|\/\*)/.test(line)).join('\n');

// --- configuration -------------------------------------------------------------------------

test('expo-updates is a real dependency, not just an import', () => {
  // A missing package makes the dynamic import in src/updates.ts reject, which is swallowed by
  // design — OTA would be off forever with nothing to show for it.
  const pkg = readJson(path.join(expo, 'package.json'));
  assert.ok(pkg.dependencies['expo-updates'], 'expo/package.json must depend on expo-updates');
});

test('the runtime version is the app version, so eas update must be published for it', () => {
  assert.equal(app.runtimeVersion?.policy, 'appVersion');
  assert.equal(typeof app.version, 'string');
  assert.match(app.version, /^\d+\.\d+\.\d+$/, 'app.version must be a plain x.y.z, since it is the runtime version');
});

test('OTA does not reload under the splash: checkAutomatically is ON_ERROR_RECOVERY', () => {
  // The unset default is ON_LOAD, which the native layer resolves to ALWAYS and reloads on launch.
  assert.equal(app.updates?.checkAutomatically, 'ON_ERROR_RECOVERY');
});

test('every build profile that ships to a phone carries an OTA channel', () => {
  for (const [name, profile] of Object.entries(eas.build)) {
    assert.equal(typeof profile.channel, 'string', `eas.json build.${name}.channel is missing: that build can never receive an update`);
    assert.ok(profile.channel.trim().length > 0, `eas.json build.${name}.channel is empty`);
  }
});

test('app.json names the same channel as the preview profile (the local Gradle build reads only app.json)', () => {
  const header = app.updates?.requestHeaders?.['expo-channel-name'];
  assert.equal(typeof header, 'string', 'updates.requestHeaders["expo-channel-name"] is missing, so expo prebuild produces a channel-less APK');
  assert.equal(header, eas.build.preview.channel);
});

test('while unlinked, updates.url is ABSENT rather than null, so OTA is honestly disabled', () => {
  // A literal `"url": null` is the trap: @expo/config resolves it to `{}`, config-plugins then
  // computes getUpdatesEnabled as TRUE, and `expo prebuild` writes ENABLED="true" with
  // EXPO_UPDATE_URL="[object Object]" into the manifest. An absent key resolves to null and
  // disables updates cleanly. Verified by running prebuild, not inferred.
  const projectId = app.extra?.eas?.projectId;
  if (projectId) {
    assert.match(String(projectId), /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
    assert.equal(app.updates?.url, `https://u.expo.dev/${projectId}`);
    return;
  }
  assert.equal(Object.prototype.hasOwnProperty.call(app.updates ?? {}, 'url'), false,
    'updates.url must be deleted, not set to null, while the project is unlinked');
});

test('src/updates.ts does not trust isEnabled alone, because a garbage URL still reports enabled', () => {
  const body = code(updatesSrc);
  assert.match(body, /hasUsableUpdateUrl/);
  assert.match(body, /isEnabled && hasUsableUpdateUrl\(\)/,
    'the module must require a real http(s) URL as well as isEnabled before claiming OTA is live');
});

// --- the code that applies an update -------------------------------------------------------

test('src/updates.ts never calls a React hook from a plain function', () => {
  // Updates.useUpdateInfo() is a hook; calling it outside a render throws "invalid hook call",
  // which the module's own catch would swallow into a permanently false "OTA is off".
  assert.doesNotMatch(code(updatesSrc), /useUpdateInfo\s*\(/);
});

test('src/updates.ts treats a build with no native update support as off, not as up to date', () => {
  // Expo Go, a dev build and web all resolve isEnabled false. Answering "up to date" there would
  // tell a tester their update worked when OTA was never running.
  assert.match(code(updatesSrc), /isEnabled/);
  assert.match(code(updatesSrc), /outcome:\s*"unavailable"/);
});

test('src/updates.ts only reloads after a fetch that produced something new', () => {
  const body = code(updatesSrc);
  const fetchIdx = body.indexOf('fetchUpdateAsync');
  const reloadIdx = body.indexOf('reloadAsync()');
  assert.ok(fetchIdx > -1, 'fetchUpdateAsync must be called');
  assert.ok(reloadIdx > -1, 'reloadAsync must be called');
  assert.ok(fetchIdx < reloadIdx, 'a reload before the fetch would restart into the same bundle');
  // The launch path must not reload on a no-op fetch: isNew false means nothing was downloaded.
  assert.match(body, /isNew/);
});

test('src/updates.ts reports a failed check instead of swallowing it silently', () => {
  assert.match(code(updatesSrc), /reportAppError\(/);
  assert.match(code(updatesSrc), /addBreadcrumb\(\s*"ota"/);
});

test('the root layout defers the launch update until the splash has finished', () => {
  const body = code(layoutSrc);
  assert.match(body, /installUpdateOnLaunch\(\)/);
  // Either the splash callback or the no-splash branch — never both, and never on first mount while
  // the splash is still up.
  assert.match(body, /if \(ready && !SPLASH_ENABLED\) void installUpdateOnLaunch\(\)/);
  const splashDone = body.match(/const splashDone = useCallback\(\(\) => \{([\s\S]*?)\}, \[\]\)/);
  assert.ok(splashDone, 'splashDone must stay a useCallback with no deps, so it fires once');
  assert.match(splashDone[1], /installUpdateOnLaunch\(\)/);
});

test('the You tab shows which update is running, so an applied update is observable', () => {
  assert.match(youSrc, /from "\.\.\/\.\.\/src\/updates"/);
  assert.match(youSrc, /updateFacts/);
  assert.match(youSrc, /checkAndApplyUpdate/);
  // The update id is the only proof an OTA update landed: the app version cannot change.
  assert.match(youSrc, /updateId/);
});

// --- the preflight enforces all of it ------------------------------------------------------

// The script resolves its root as `..` from its own directory, so a staged copy with the same
// layout exercises it without touching the real project.
function stage({ app: appOverride = app, eas: easOverride = eas } = {}) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'nowbey-ota-'));
  fs.mkdirSync(path.join(dir, 'scripts'));
  fs.mkdirSync(path.join(dir, 'assets'));
  fs.copyFileSync(path.join(expo, 'scripts', 'preflight-apk.js'), path.join(dir, 'scripts', 'preflight-apk.js'));
  for (const asset of fs.readdirSync(path.join(expo, 'assets'))) {
    fs.copyFileSync(path.join(expo, 'assets', asset), path.join(dir, 'assets', asset));
  }
  fs.writeFileSync(path.join(dir, 'app.json'), JSON.stringify({ expo: appOverride }, null, 2));
  fs.writeFileSync(path.join(dir, 'eas.json'), JSON.stringify(easOverride, null, 2));
  return dir;
}

function preflight(options) {
  const dir = stage(options);
  try {
    const run = spawnSync(process.execPath, [path.join(dir, 'scripts', 'preflight-apk.js')], { cwd: dir, encoding: 'utf8' });
    return { status: run.status, output: `${run.stdout || ''}${run.stderr || ''}` };
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

const clone = (v) => JSON.parse(JSON.stringify(v));
const PROJECT_ID = '01234567-89ab-cdef-0123-456789abcdef';

test('preflight passes on the committed configuration', () => {
  const { status, output } = preflight();
  assert.equal(status, 0, output);
  assert.match(output, /PREFLIGHT PASSED/);
  assert.match(output, /PASS preview build has an OTA channel/);
});

test('preflight passes once the project is linked', () => {
  const next = clone(app);
  next.extra.eas.projectId = PROJECT_ID;
  next.updates.url = `https://u.expo.dev/${PROJECT_ID}`;
  const { status, output } = preflight({ app: next });
  assert.equal(status, 0, output);
  assert.doesNotMatch(output, /not linked/);
});

test('preflight warns, and still passes, while the project is deliberately unlinked', () => {
  const { status, output } = preflight({ app: clone(app) });
  assert.equal(status, 0, output);
  assert.match(output, /WARN EAS project is not linked/);
  assert.match(output, /OTA updates are disabled/);
});

test('preflight fails a build profile with no OTA channel', () => {
  const next = clone(eas);
  delete next.build.preview.channel;
  const { status, output } = preflight({ eas: next });
  assert.equal(status, 1, output);
  assert.match(output, /FAIL preview build has an OTA channel/);
});

test('preflight fails when app.json and eas.json disagree about the channel', () => {
  const next = clone(app);
  next.updates.requestHeaders['expo-channel-name'] = 'production';
  const { status, output } = preflight({ app: next });
  assert.equal(status, 1, output);
  assert.match(output, /FAIL app\.json expo-channel-name matches the preview channel/);
});

test('preflight fails when the channel header is dropped from app.json', () => {
  const next = clone(app);
  delete next.updates.requestHeaders;
  const { status, output } = preflight({ app: next });
  assert.equal(status, 1, output);
  assert.match(output, /FAIL app\.json expo-channel-name matches the preview channel/);
});

test('preflight fails a native on-load reload, which would land under the splash', () => {
  const next = clone(app);
  next.updates.checkAutomatically = 'ON_LOAD';
  const { status, output } = preflight({ app: next });
  assert.equal(status, 1, output);
  assert.match(output, /FAIL updates\.checkAutomatically is ON_ERROR_RECOVERY/);
});

test('preflight fails a literal null updates.url, which builds an enabled APK pointing at "[object Object]"', () => {
  const next = clone(app);
  next.updates.url = null;
  const { status, output } = preflight({ app: next });
  assert.equal(status, 1, output);
  assert.match(output, /FAIL updates\.url is absent or a string/);
});

test('preflight still fails a half-move of the project link', () => {
  const next = clone(app);
  next.extra.eas.projectId = PROJECT_ID;
  next.updates.url = `https://u.expo.dev/aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee`;
  const { status, output } = preflight({ app: next });
  assert.equal(status, 1, output);
  assert.match(output, /FAIL updates\.url points at extra\.eas\.projectId/);
});
