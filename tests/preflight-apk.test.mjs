// Guards expo/scripts/preflight-apk.js against re-pinning the Expo account or project UUID, and
// pins the two link states it must tell apart:
//
//   * a wholly unlinked app (no project UUID, no updates URL) — the state left behind when the
//     old IDs were stripped for a move — is buildable by the local Gradle fallback, but only with
//     `--allow-unlinked`, and the APK then ships with OTA updates disabled;
//   * a partial or malformed link (a half-move, a hand-typed "UUID" of the wrong length) is
//     refused in every mode, because it would point the app at a project that does not exist.
//
// The tests build their own fixtures instead of asserting on the committed app.json's link: the
// repository is deliberately unlinked between a strip and the relink that follows it.
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const expo = path.join(repo, 'expo');
const { expo: baseApp } = JSON.parse(fs.readFileSync(path.join(expo, 'app.json'), 'utf8'));

const MOVED_ACCOUNT = 'nowbey242s-team';
const MOVED_PROJECT_ID = '01234567-89ab-cdef-0123-456789abcdef';
const OTHER_PROJECT_ID = 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee';

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

// The script resolves the project root as `..` from its own directory, so staging a copy with
// the same layout is enough to exercise it without touching the real expo/ project.
function stage(app) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'nowbey-preflight-'));
  fs.mkdirSync(path.join(dir, 'scripts'));
  fs.mkdirSync(path.join(dir, 'assets'));
  fs.copyFileSync(path.join(expo, 'scripts', 'preflight-apk.js'), path.join(dir, 'scripts', 'preflight-apk.js'));
  fs.copyFileSync(path.join(expo, 'eas.json'), path.join(dir, 'eas.json'));
  for (const asset of fs.readdirSync(path.join(expo, 'assets'))) {
    fs.copyFileSync(path.join(expo, 'assets', asset), path.join(dir, 'assets', asset));
  }
  fs.writeFileSync(path.join(dir, 'app.json'), JSON.stringify({ expo: app }, null, 2));
  return dir;
}

function preflight(app, args = []) {
  const dir = stage(app);
  try {
    const run = spawnSync(process.execPath, [path.join(dir, 'scripts', 'preflight-apk.js'), ...args], {
      cwd: dir,
      encoding: 'utf8',
    });
    return { status: run.status, output: `${run.stdout || ''}${run.stderr || ''}` };
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

function linkedApp({ owner = MOVED_ACCOUNT, projectId = MOVED_PROJECT_ID } = {}) {
  const app = clone(baseApp);
  app.owner = owner;
  app.extra = { ...(app.extra || {}) };
  app.extra.eas = { ...(app.extra.eas || {}), projectId };
  app.updates = { ...(app.updates || {}), url: `https://u.expo.dev/${projectId}` };
  return app;
}

test('a linked config passes preflight', () => {
  const { status, output } = preflight(linkedApp());
  assert.equal(status, 0, output);
  assert.match(output, /PREFLIGHT PASSED/);
});

test('moving the app to another Expo account passes preflight', () => {
  const { status, output } = preflight(linkedApp({ owner: MOVED_ACCOUNT, projectId: MOVED_PROJECT_ID }));
  assert.equal(status, 0, output);
  assert.match(output, /PREFLIGHT PASSED/);
});

test('the committed app.json is wholly unlinked: the EAS path refuses it, the fallback accepts it', () => {
  // Documents the deliberate post-strip state. If this ever fails, app.json grew a partial link
  // (or a real one) without the tests being told.
  assert.equal(baseApp.extra?.eas?.projectId, undefined, 'no project UUID is committed');
  assert.equal(baseApp.updates?.url, undefined, 'no updates URL is committed — null would bake [object Object] into the APK');

  const strict = preflight(clone(baseApp));
  assert.equal(strict.status, 1, strict.output);
  assert.match(strict.output, /FAIL EAS project is linked/);

  const fallback = preflight(clone(baseApp), ['--allow-unlinked']);
  assert.equal(fallback.status, 0, fallback.output);
  assert.match(fallback.output, /PREFLIGHT PASSED \(static only, local build without EAS link\)/);
  assert.match(fallback.output, /WARN EAS project is not linked .*OTA updates disabled/);
  assert.match(fallback.output, /WARN updates\.url is absent/);
});

test('a half-move (updates.url left on the old project) fails preflight, even for the fallback', () => {
  const app = linkedApp({ owner: MOVED_ACCOUNT, projectId: MOVED_PROJECT_ID });
  app.updates.url = `https://u.expo.dev/${OTHER_PROJECT_ID}`;
  for (const args of [[], ['--allow-unlinked']]) {
    const { status, output } = preflight(app, args);
    assert.equal(status, 1, output);
    assert.match(output, /FAIL updates\.url points at extra\.eas\.projectId/);
  }
});

test('a project UUID without an updates URL is a partial link and fails preflight', () => {
  const app = linkedApp();
  delete app.updates;
  const { status, output } = preflight(app, ['--allow-unlinked']);
  assert.equal(status, 1, output);
  assert.match(output, /FAIL updates\.url points at extra\.eas\.projectId/);
});

test('a missing owner fails preflight, with or without the fallback flag', () => {
  const app = clone(baseApp);
  delete app.owner;
  for (const args of [[], ['--allow-unlinked']]) {
    const { status, output } = preflight(app, args);
    assert.equal(status, 1, output);
    assert.match(output, /FAIL owner is set/);
  }
});

test('a project link that is not a UUID fails preflight, even for the fallback', () => {
  const app = linkedApp();
  app.extra.eas.projectId = 'oasistech242/nowbey';
  app.updates.url = 'https://u.expo.dev/oasistech242/nowbey';
  for (const args of [[], ['--allow-unlinked']]) {
    const { status, output } = preflight(app, args);
    assert.equal(status, 1, output);
    assert.match(output, /FAIL EAS project is linked/);
  }
});

test('the 37-character ID from the relink PRs is refused, not rounded up to a UUID', () => {
  // PR #57/#58 carried `7d87c5ec-058f-4434-8915-559bac1ac1697`: 13 characters in the last group.
  // PR #59 proposed loosening the regex to {12,14} so it would pass. It must not.
  const typo = '7d87c5ec-058f-4434-8915-559bac1ac1697';
  const app = linkedApp({ projectId: MOVED_PROJECT_ID });
  app.extra.eas.projectId = typo;
  app.updates.url = `https://u.expo.dev/${typo}`;
  for (const args of [[], ['--allow-unlinked']]) {
    const { status, output } = preflight(app, args);
    assert.equal(status, 1, output);
    assert.match(output, /FAIL EAS project is linked/);
  }
});

test('the fallback workflows pass --allow-unlinked; the EAS path stays strict', () => {
  // Without this wiring the flag would exist and never be used, and a forced `mobile-fallback`
  // run would fail at preflight on the very unlinked config it exists to build.
  const deploy = fs.readFileSync(path.join(repo, '.github', 'workflows', 'deploy.yml'), 'utf8');
  const build = fs.readFileSync(path.join(repo, '.github', 'workflows', 'build.yml'), 'utf8');

  assert.match(deploy, /TARGET: \$\{\{ inputs\.target \|\| github\.event\.client_payload\.target \}\}/,
    'the dispatch target reaches the preflight step');
  assert.match(deploy, /if \[ "\$TARGET" = "mobile-fallback" \]; then\s*\n\s*node scripts\/preflight-apk\.js --full --allow-unlinked\s*\n\s*else\s*\n\s*npm run preflight:apk:full/,
    'only the forced local fallback relaxes the link check');
  assert.doesNotMatch(deploy, /npm run preflight:apk:full -- --allow-unlinked/,
    'the EAS build path must keep the strict preflight');
  assert.match(build, /node scripts\/preflight-apk\.js --allow-unlinked/,
    'the by-hand Gradle button is a fallback too');
});
