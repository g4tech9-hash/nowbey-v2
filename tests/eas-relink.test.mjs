// expo/scripts/eas-relink.js — the one step that moves `owner`, `extra.eas.projectId` and
// `updates.url` together when the app changes Expo accounts.
//
// `eas init` writes the account and the project UUID but never the OTA updates URL, so a move that
// stops there leaves the app resolving the new project while updates still point at the old one.
// These tests pin the whole contract: a write is all-or-nothing, a half-move is refused, and the
// APK preflight agrees with the result (the two must not drift — CI runs the preflight, not this
// script).
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const expo = path.join(repo, 'expo');
const appFileSource = path.join(expo, 'app.json');
const realApp = JSON.parse(fs.readFileSync(appFileSource, 'utf8'));

const NEW_OWNER = 'nowbey-v3s-team';
const NEW_PROJECT_ID = '01234567-89ab-cdef-0123-456789abcdef';

function stage(app = realApp, { dynamicConfig = null } = {}) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'nowbey-relink-'));
  fs.mkdirSync(path.join(dir, 'scripts'));
  fs.copyFileSync(path.join(expo, 'scripts', 'eas-relink.js'), path.join(dir, 'scripts', 'eas-relink.js'));
  fs.copyFileSync(path.join(expo, 'eas.json'), path.join(dir, 'eas.json'));
  fs.mkdirSync(path.join(dir, 'assets'));
  for (const asset of fs.readdirSync(path.join(expo, 'assets'))) {
    fs.copyFileSync(path.join(expo, 'assets', asset), path.join(dir, 'assets', asset));
  }
  fs.writeFileSync(path.join(dir, 'app.json'), JSON.stringify(app, null, 2) + '\n');
  if (dynamicConfig !== null) fs.writeFileSync(path.join(dir, 'app.config.js'), dynamicConfig);
  else fs.copyFileSync(path.join(expo, 'app.config.js'), path.join(dir, 'app.config.js'));
  return dir;
}

function run(dir, args) {
  const result = spawnSync(process.execPath, [path.join(dir, 'scripts', 'eas-relink.js'), ...args], {
    cwd: dir,
    encoding: 'utf8',
  });
  return { status: result.status, output: `${result.stdout || ''}${result.stderr || ''}` };
}

function readApp(dir) {
  return JSON.parse(fs.readFileSync(path.join(dir, 'app.json'), 'utf8'));
}

function withCopy(app, fn, options) {
  const dir = stage(app, options);
  try {
    return fn(dir);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

// `eas init --account X --force` (eas-cli 25.2.0) writes exactly these two fields, then
// `ensureOwnerSlugConsistencyAsync` rewrites `owner`. It leaves `updates.url` untouched.
function afterEasInit(app) {
  const next = JSON.parse(JSON.stringify(app));
  next.expo.owner = NEW_OWNER;
  next.expo.extra.eas.projectId = NEW_PROJECT_ID;
  return next;
}

test('the committed link is intact (a check, not a move)', () => {
  const { status, output } = withCopy(realApp, (dir) => run(dir, ['--check']));
  assert.equal(status, 0, output);
  assert.match(output, /PASS owner /);
  assert.match(output, /PASS updates\.url /);
  assert.match(output, /EAS link is intact/);
});

test('--check --owner is the "has the move landed yet?" question', () => {
  const { status, output } = withCopy(realApp, (dir) => run(dir, ['--check', '--owner', NEW_OWNER]));
  assert.equal(status, 1, output);
  assert.match(output, new RegExp(`owner is "${realApp.expo.owner}", expected "${NEW_OWNER}"`));
  assert.match(output, /EAS LINK INVALID \(1\)/, 'the link itself is fine — only the account expectation fails');
});

test('a move rewrites owner, projectId and updates.url together', () => {
  withCopy(realApp, (dir) => {
    const before = fs.readFileSync(path.join(dir, 'app.json'), 'utf8');
    const { status, output } = run(dir, ['--owner', NEW_OWNER, '--project-id', NEW_PROJECT_ID]);
    assert.equal(status, 0, output);
    assert.match(output, new RegExp(`owner: ${realApp.expo.owner} → ${NEW_OWNER}`));
    assert.match(output, /updatesUrl: https:\/\/u\.expo\.dev\/[0-9a-f-]+ → https:\/\/u\.expo\.dev\/01234567/);

    const after = fs.readFileSync(path.join(dir, 'app.json'), 'utf8');
    assert.ok(after.endsWith('}\n'), 'the file keeps its trailing newline');
    assert.match(after, /\n {2}"expo": \{/, 'and its two-space indentation');
    assert.notEqual(before, after, 'the write happened');

    const app = readApp(dir).expo;
    assert.equal(app.owner, NEW_OWNER);
    assert.equal(app.extra.eas.projectId, NEW_PROJECT_ID);
    assert.equal(app.updates.url, `https://u.expo.dev/${NEW_PROJECT_ID}`);

    // Everything unrelated survives the rewrite: this is a config file, not a link record.
    assert.equal(app.name, realApp.expo.name);
    assert.equal(app.android.package, realApp.expo.android.package);
    assert.equal(app.plugins.length, realApp.expo.plugins.length);
    assert.deepEqual(Object.keys(app), Object.keys(realApp.expo), 'key order is preserved');
  });
});

test('a moved config passes the real preflight', () => {
  const dir = stage(realApp);
  try {
    fs.copyFileSync(path.join(expo, 'scripts', 'preflight-apk.js'), path.join(dir, 'scripts', 'preflight-apk.js'));
    const move = run(dir, ['--owner', NEW_OWNER, '--project-id', NEW_PROJECT_ID]);
    assert.equal(move.status, 0, move.output);
    const preflight = spawnSync(process.execPath, [path.join(dir, 'scripts', 'preflight-apk.js')], { cwd: dir, encoding: 'utf8' });
    const output = `${preflight.stdout || ''}${preflight.stderr || ''}`;
    assert.equal(preflight.status, 0, output);
    assert.match(output, /PREFLIGHT PASSED/);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('eas init alone is a half-move, and the check says so', () => {
  // The gap this script closes: init writes owner + projectId, updates.url still names the old
  // project. The preflight catches it (and so does this), which is why the relink runs after init.
  const dir = stage(afterEasInit(realApp));
  try {
    const check = run(dir, ['--check']);
    assert.equal(check.status, 1, check.output);
    assert.match(check.output, /the half-move \(OTA updates left on the old project\)/);

    const relinked = run(dir, ['--owner', NEW_OWNER]);
    assert.equal(relinked.status, 0, relinked.output);
    const app = readApp(dir).expo;
    assert.equal(app.extra.eas.projectId, NEW_PROJECT_ID, 'the UUID init wrote is kept');
    assert.equal(app.updates.url, `https://u.expo.dev/${NEW_PROJECT_ID}`, 'and updates now follow it');
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('an invalid UUID is refused and nothing is written', () => {
  withCopy(realApp, (dir) => {
    const before = fs.readFileSync(path.join(dir, 'app.json'), 'utf8');
    const { status, output } = run(dir, ['--owner', NEW_OWNER, '--project-id', 'nowbey-v3s-team/nowbey']);
    assert.equal(status, 1, output);
    assert.match(output, /is not a project UUID/);
    assert.match(output, /Nothing was written/);
    assert.equal(fs.readFileSync(path.join(dir, 'app.json'), 'utf8'), before, 'app.json is byte-identical');
  });
});

test('a missing owner is refused, and so is a display name', () => {
  withCopy(realApp, (dir) => {
    const before = fs.readFileSync(path.join(dir, 'app.json'), 'utf8');
    const missing = run(dir, ['--project-id', NEW_PROJECT_ID]);
    assert.equal(missing.status, 1, missing.output);
    assert.match(missing.output, /--owner is required/);

    const spaced = run(dir, ['--owner', 'NowBey Team', '--project-id', NEW_PROJECT_ID]);
    assert.equal(spaced.status, 1, spaced.output);
    assert.match(spaced.output, /is not an Expo account name/);
    assert.equal(fs.readFileSync(path.join(dir, 'app.json'), 'utf8'), before);
  });
});

test('the same move twice is a no-op the second time', () => {
  withCopy(realApp, (dir) => {
    assert.equal(run(dir, ['--owner', NEW_OWNER, '--project-id', NEW_PROJECT_ID]).status, 0);
    const afterFirst = fs.readFileSync(path.join(dir, 'app.json'), 'utf8');
    const second = run(dir, ['--owner', NEW_OWNER, '--project-id', NEW_PROJECT_ID]);
    assert.equal(second.status, 0, second.output);
    assert.match(second.output, /nothing to write/);
    assert.equal(fs.readFileSync(path.join(dir, 'app.json'), 'utf8'), afterFirst);
  });
});

test('a dynamic app.config.js that could override the link is refused', () => {
  withCopy(realApp, (dir) => {
    const before = fs.readFileSync(path.join(dir, 'app.json'), 'utf8');
    const { status, output } = run(dir, ['--owner', NEW_OWNER, '--project-id', NEW_PROJECT_ID]);
    assert.equal(status, 1, output);
    assert.match(output, /app\.config\.js mentions owner/);
    assert.equal(fs.readFileSync(path.join(dir, 'app.json'), 'utf8'), before);

    const forced = run(dir, ['--owner', NEW_OWNER, '--project-id', NEW_PROJECT_ID, '--allow-dynamic-config']);
    assert.equal(forced.status, 0, forced.output);
  }, { dynamicConfig: 'module.exports = ({ config }) => ({ ...config, owner: "someone-else" });\n' });
});

test('the committed app.config.js is a pass-through, so app.json is the only link record', () => {
  const source = fs.readFileSync(path.join(expo, 'app.config.js'), 'utf8');
  const code = source.split('\n').filter((line) => !/^\s*(\/\/|\*|\/\*)/.test(line)).join('\n');
  for (const key of ['owner', 'extra', 'updates', 'projectId']) {
    assert.doesNotMatch(code, new RegExp(`\\b${key}\\b`),
      `app.config.js must not set ${key}: eas-relink.js and the preflight both read app.json`);
  }
});
