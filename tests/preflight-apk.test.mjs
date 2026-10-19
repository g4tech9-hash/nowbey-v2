// Guards expo/scripts/preflight-apk.js against re-pinning the Expo account or project UUID.
// Moving the NowBey app to another Expo account rewrites `owner`, `extra.eas.projectId` and
// `updates.url` in expo/app.json. The preflight must accept that move; it must still catch a
// half-move, where the account and project UUID change but updates.url keeps the old project.
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

function preflight(app) {
  const dir = stage(app);
  try {
    const run = spawnSync(process.execPath, [path.join(dir, 'scripts', 'preflight-apk.js')], {
      cwd: dir,
      encoding: 'utf8',
    });
    return { status: run.status, output: `${run.stdout || ''}${run.stderr || ''}` };
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

function movedApp() {
  const app = clone(baseApp);
  app.owner = MOVED_ACCOUNT;
  app.extra.eas.projectId = MOVED_PROJECT_ID;
  app.updates.url = `https://u.expo.dev/${MOVED_PROJECT_ID}`;
  return app;
}

test('the current Expo account and project pass preflight', () => {
  const { status, output } = preflight(clone(baseApp));
  assert.equal(status, 0, output);
  assert.match(output, /PREFLIGHT PASSED/);
});

test('moving the app to another Expo account passes preflight', () => {
  const { status, output } = preflight(movedApp());
  assert.equal(status, 0, output);
  assert.match(output, /PREFLIGHT PASSED/);
});

test('a half-move (updates.url left on the old project) fails preflight', () => {
  const app = movedApp();
  app.updates.url = `https://u.expo.dev/${baseApp.extra.eas.projectId}`;
  const { status, output } = preflight(app);
  assert.equal(status, 1, output);
  assert.match(output, /FAIL updates\.url points at extra\.eas\.projectId/);
});

test('a missing owner fails preflight', () => {
  const app = clone(baseApp);
  delete app.owner;
  const { status, output } = preflight(app);
  assert.equal(status, 1, output);
  assert.match(output, /FAIL owner is set/);
});

test('a project link that is not a UUID fails preflight', () => {
  const app = clone(baseApp);
  app.extra.eas.projectId = 'oasistech242/nowbey';
  app.updates.url = 'https://u.expo.dev/oasistech242/nowbey';
  const { status, output } = preflight(app);
  assert.equal(status, 1, output);
  assert.match(output, /FAIL EAS project is linked/);
});
