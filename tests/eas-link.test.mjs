/**
 * `.github/workflows/eas-link.yml` — the one button that can create the EAS project under a new
 * Expo account and deliver the three-field config change as a pull request.
 *
 * There is no runner and no expo.dev here, so these are text-level assertions on the contract that
 * matters: which real eas-cli commands run (checked against eas-cli 25.2.0's own `--help`, not
 * against memory), in which order, what is allowed to change anything, and what must never happen
 * — a build on the wrong account, or a push to master.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const workflow = read('.github/workflows/eas-link.yml');
// Comments in this file name `eas build`, `eas init` and `eas whoami` while explaining what the
// workflow does *not* do, so ordering and command assertions are made against the executable
// lines only. A needle found only in prose would prove nothing about what runs.
const code = workflow.split('\n').filter((line) => !line.trim().startsWith('#')).join('\n');
const at = (needle, from = 0) => {
  const i = code.indexOf(needle, from);
  assert.ok(i >= 0, `the workflow should contain ${JSON.stringify(needle)}`);
  return i;
};
const commands = code
  .split('\n')
  .map((line) => line.trim())
  .filter((line) => /^eas\s/.test(line));

test('it is a manual button, also reachable from a script, with write access for the PR', () => {
  assert.match(workflow, /^name: Link EAS project$/m);
  assert.match(workflow, /workflow_dispatch:/);
  assert.match(workflow, /repository_dispatch:\s*\n\s*types: \[eas-link\]/,
    'scripts/eas-dispatch.sh link sends this event');
  assert.match(workflow, /permissions:\s*\n\s*contents: write\s*\n\s*pull-requests: write/,
    'git push + gh pr create, nothing wider');
  assert.match(workflow, /concurrency:\s*\n\s*group: eas-link/, 'two relinks cannot race for the same PR');
  assert.match(workflow, /timeout-minutes: 20/);
});

test('the owner input defaults to the account chosen for the migration, and commands use $OWNER', () => {
  assert.match(workflow, /owner:\s*\n\s*description: Expo account or team that should own the project\s*\n\s*required: true\s*\n\s*default: nowbey-v3s-team/);
  // The account is a run parameter, not something baked into the command lines: the same workflow
  // must be able to link a different account tomorrow without an edit.
  const easLines = commands.join('\n');
  assert.doesNotMatch(easLines, /--account\s+["']?nowbey-v3s-team/, 'eas init takes the account from the input');
  assert.match(easLines, /--account "\$OWNER"/);
});

test('it never queues, cancels or bills anything', () => {
  assert.ok(commands.length >= 3, `it should run the eas CLI (found: ${commands.join(', ') || 'nothing'})`);
  for (const line of commands) {
    assert.doesNotMatch(line, /^eas\s+(build|submit|update|secret|billing|login|logout|cancel)\b/,
      `${line} would change something on expo.dev or spend quota; this workflow only creates a project and reads`);
  }
  assert.ok(commands.some((c) => c.startsWith('eas whoami')), 'it asks who the token is');
  assert.ok(commands.some((c) => c.startsWith('eas init')), 'it creates or links the project');
  assert.ok(commands.some((c) => c.startsWith('eas project:info')), 'and proves the token can read it');
});

test('eas init uses the flags eas-cli 25.2.0 actually has, and --force is why a move is possible', () => {
  // `eas init --help` (25.2.0): --account, --id (exclusive), --force, --json, --non-interactive.
  // --json implies non-interactive; an explicit --account is what lets non-interactive mode create
  // the project without a confirmation prompt. Without --force, a config already linked to another
  // account is refused with "Project is already linked…", i.e. the move would be impossible.
  assert.match(workflow, /eas init --id "\$PROJECT_ID" --force --json/);
  assert.match(workflow, /eas init --account "\$OWNER" --force --json/);
  assert.match(workflow, /`--force` is load-bearing/,
    'the file says why --force is required, so nobody removes it to "be safe"');
});

test('the move happens in the only order that can work', () => {
  const npmCi = at('npm ci');
  const whoami = at('eas whoami');
  const reach = at('for name in $reachable');
  const init = at('eas init --account');
  const relink = at('node scripts/eas-relink.js --owner');
  const check = at('node scripts/eas-relink.js --check --owner', relink);
  // (the first occurrence is the dry-run branch above, which never writes)
  const config = at('npx expo config --type public --json');
  const preflight = at('node scripts/preflight-apk.js');
  const projectInfo = at('eas project:info');

  assert.ok(npmCi < init, 'expo-router and friends must resolve before `eas init` loads the config');
  assert.ok(whoami < reach && reach < init, 'reachability is checked before anything is created');
  assert.ok(init < relink, 'the UUID has to exist before updates.url can point at it');
  assert.ok(relink < check, 'the check confirms what the write just did');
  assert.ok(check < config, 'then Expo itself reads the config back');
  assert.ok(config < preflight, 'and the APK preflight validates it');
  assert.ok(preflight < projectInfo, 'project:info is the last word — it is the call a build makes');
});

test('the check compares the token against the requested account, not the committed one', () => {
  // During a move app.json still names the old account, so comparing against it would demand the
  // token reach the account we are leaving. The requested owner is the only useful expectation.
  assert.match(workflow, /OWNER: \${{ steps\.resolve\.outputs\.owner }}/, 'the requested account is passed in');
  assert.match(workflow, /\[ "\$name" = "\$OWNER" \]/, 'reachability is compared word by word');
  assert.doesNotMatch(workflow, /grep -qx/, 'never a whole-line grep: the list is one space-separated line');
  assert.match(workflow, /u2022/, 'the account bullet is parsed in node, which reads UTF-8');
  assert.match(workflow, /cannot reach @\$\{OWNER\}/, 'and a refusal names the account it cannot reach');
});

test('a dry run touches nothing and still reports', () => {
  assert.match(workflow, /steps\.resolve\.outputs\.dry_run != 'true'/, 'init is skipped in a dry run');
  assert.match(workflow, /node scripts\/eas-relink\.js --check --owner "\$OWNER"/,
    'the dry run reports the current link instead of writing');
  assert.match(workflow, /Dry run: app\.json is untouched/);
});

test('the change is delivered as a PR, never as a push to master', () => {
  const pr = at('gh pr create --base master --head "$branch"');
  const branch = at('branch="eas/link-${OWNER}"');
  const push = at('git push --force origin "$branch"');
  assert.ok(branch < push && push < pr);
  assert.doesNotMatch(code, /git push[^\n]*\b(master|HEAD:master|origin master)\b/, 'master is never pushed to');
  assert.match(workflow, /git -C \.\. diff -- expo\/app\.json > \.\.\/eas-link\.patch/,
    'the patch is generated before the commit, so the artifact survives a failed PR');
  assert.match(workflow, /continue-on-error: true\s*\n\s*env:\s*\n\s*GH_TOKEN:/,
    'a failed PR does not lose the change');
});

test('the artifacts and the verdict run whatever happened', () => {
  assert.match(workflow, /name: Upload the relink artifacts\s*\n\s*if: always\(\)/);
  assert.match(workflow, /eas-link\.patch/, 'the diff itself is kept');
  assert.match(workflow, /expo\/eas-init\.json/, 'and what eas init answered');
  assert.match(workflow, /name: Verdict\s*\n\s*if: always\(\)/);
  assert.match(workflow, /if \[ "\$CHECK_OUTCOME" != "success" \]/, 'a token that cannot reach is named as the cause');
  assert.match(workflow, /if \[ "\$INIT_OUTCOME" != "success" \]/);
});

test('the helper scripts exist and are wired the way the docs say', () => {
  const pkg = JSON.parse(read('expo/package.json'));
  assert.equal(pkg.scripts['eas:relink'], 'node scripts/eas-relink.js');
  assert.equal(pkg.scripts['eas:check'], 'node scripts/eas-relink.js --check');
  const dispatch = read('scripts/eas-dispatch.sh');
  assert.match(dispatch, /link\|relink\)/, 'one command from a terminal');
  assert.match(dispatch, /event_type="eas-link"/);
  assert.match(dispatch, /client_payload\[owner\]/);
  assert.match(dispatch, /client_payload\[project_id\]/);
});
