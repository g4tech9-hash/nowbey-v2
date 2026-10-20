/**
 * The Expo account workflow: `.github/workflows/expo-account.yml`.
 *
 * It exists because two refusals stopped a mobile dispatch in October 2026 and neither one is a
 * repository defect that `deploy.yml` can fix from the inside — a valid `EXPO_TOKEN` for the wrong
 * Expo account, and a correct token on an account whose free-plan Android builds were spent. Both
 * are answered on expo.dev, and this workflow is the button that asks.
 *
 * These tests are text-level, like the workflow assertions in map-layout.test.mjs: there is no
 * runner and no expo.dev here, so what is pinned is the contract — which real eas-cli commands run,
 * in which order, what is allowed to fail, and what the run must never do. Every one of them was
 * written against the command surface of eas-cli 25.2.0 (`account:view`/`whoami`,
 * `account:usage ACCOUNT_NAME --json`, `project:info`), not against a guess at it.
 *
 * Three of them pin bugs that were found by running the workflow's own scripts against a stubbed
 * `eas` CLI. Each one produced a plausible-looking wrong answer, which is the expensive kind:
 *   1. a single-account token prints no "Accounts:" list, so the actor's own name has to count as
 *      reachable or a good token is reported as an account mismatch;
 *   2. the list is space separated on one line, so `grep -qx` (whole-line match) can never match one
 *      account name and reported a mismatch for every token that could reach more than one account;
 *   3. the "•" bullet is three bytes and the runner's locale is C, so a grep bracket expression
 *      matches those bytes individually and silently returns an empty list — hence node parses it.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const workflow = read(".github/workflows/expo-account.yml");
const at = (needle, from = 0) => {
  const i = workflow.indexOf(needle, from);
  assert.ok(i >= 0, `the workflow should contain ${JSON.stringify(needle)}`);
  return i;
};

test("the Expo account workflow is a manual, read-only button", () => {
  assert.match(workflow, /^name: Expo account$/m, "it is named for the Actions tab button");
  assert.match(workflow, /workflow_dispatch:/, "the Actions tab button");
  assert.match(workflow, /repository_dispatch:\s*\n\s*types: \[expo-account\]/,
    "and the same button from a script, which only needs push permission");
  assert.match(workflow, /permissions:\s*\n\s*contents: read/, "it never needs to write anything");
  assert.match(workflow, /timeout-minutes: 15/, "it is a handful of API calls, not a build");
});

test("it never queues or cancels a build and never spends quota", () => {
  // Comments in this file name `eas build` several times while explaining what it does *not* do,
  // so the assertion is about commands, not prose: nothing may invoke a build, a cancel or a login.
  const commands = workflow
    .split("\n")
    .filter((l) => !l.trim().startsWith("#"))
    .map((l) => l.trim())
    .filter((l) => /^eas\s/.test(l))
    .map((l) => l.split(/\s+/).slice(0, 2).join(" "));
  assert.ok(commands.length >= 3, `it should run the eas CLI (found: ${commands.join(", ") || "nothing"})`);
  for (const c of commands) {
    assert.ok(!/^eas (build|login|logout|submit|update|secret|billing)/.test(c),
      `${c} would change something on expo.dev or spend quota; this workflow only reads`);
  }
  assert.ok(commands.some((c) => c === "eas whoami"), "it asks who the token is");
  assert.ok(commands.some((c) => c === "eas project:info"), "it asks whether the token can read this project");
  assert.ok(commands.some((c) => c === "eas account:usage"), "it asks what build quota is left");
});

test("it asks whoami first, then authorization, then quota, and reports one verdict", () => {
  const whoami = at("eas whoami");
  const project = at("eas project:info", whoami);
  const usage = at("eas account:usage", project);
  const verdict = at("Report the verdict", usage);
  assert.ok(whoami < project && project < usage && usage < verdict, "in that order");

  // The two API steps are allowed to fail: the verdict step is what turns refusals into one answer,
  // and failing early would hide a second problem behind the first.
  const continueOnError = [...workflow.matchAll(/continue-on-error: true/g)].length;
  assert.equal(continueOnError, 2, "project:info and account:usage continue on error");
  assert.match(workflow, /if: always\(\)\s*\n\s*env:[\s\S]{0,400}Report the verdict|Report the verdict/,
    "the verdict runs whatever the steps above did");
  assert.match(workflow, /name: expo-account-log/, "the raw CLI output is uploaded as an artifact");

  // `eas project:info` loads the Expo config, which resolves the plugins array in app.json
  // (expo-router, etc.). That resolution needs node_modules, so the workflow must install them
  // before running project:info. Without this, project:info fails with "Failed to resolve plugin
  // for module 'expo-router'" and the authorization check never runs.
  const npmCi = at("npm ci");
  const projectCommand = at("eas project:info 2>&1");
  assert.ok(npmCi < projectCommand, "npm ci runs before eas project:info (the plugins need node_modules)");
});

test("the account it compares against comes from expo/app.json, not from this file", () => {
  // A hard-coded account name here would go stale the day the project moves accounts — which is one
  // of the three fixes TODO_HUMAN.md offers for the mismatch this workflow exists to name.
  assert.match(workflow, /owner="\$\(node -e '[^']*require\("\.\/app\.json"\)/,
    "the owner is read out of the app config at run time");
  assert.doesNotMatch(workflow.split("\n").filter((l) => !l.trim().startsWith("#")).join("\n"),
    /owner="?oasistech242/, "no account name is baked into the workflow's commands");

  const app = JSON.parse(read("expo/app.json"));
  const expo = app.expo ?? app;
  // The Expo account is an expo.dev decision, not a source decision: moving the project to the
  // account the token already owns (TODO_HUMAN.md — the second fix for the mismatch) rewrites
  // `owner`, `extra.eas.projectId` and `updates.url` together. Pinning the name here would turn
  // that move into a test failure before expo.dev is ever asked, the same mistake 2717bef
  // unpinned for the APK preflight.
  assert.ok(typeof expo.owner === "string" && expo.owner.trim().length > 0, "the project has an owner (Expo account) — the workflow reads it at run time");
  assert.match(expo.owner, /^[a-z0-9-_]+$/i, "owner looks like an Expo account name");

  // The link is either wholly present or wholly absent. It is deliberately absent between the
  // strip of the old IDs and the relink that follows (the local Gradle fallback builds that
  // state with OTA updates disabled). A partial link, or an ID of the wrong length, is never a
  // valid in-between state — it names a project EAS cannot resolve.
  const projectId = expo.extra?.eas?.projectId;
  if (projectId === undefined || projectId === null) {
    assert.equal(expo.updates?.url ?? null, null, "a wholly unlinked config has no updates.url either");
  } else {
    assert.match(projectId, /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i, "projectId is a UUID");
    assert.equal(expo.updates?.url, `https://u.expo.dev/${projectId}`, "updates.url points at that project");
  }
});

test("the account-mismatch check cannot fire on a good token", () => {
  // Bug 1: eas-cli prints "Accounts:" only when the actor can reach accounts besides its own, so a
  // healthy single-account token has no list — its actor name is the account it can reach.
  assert.match(workflow, /const reachable=\[actorName,\s*\.\.\.names\]/,
    "the actor's own name is folded into the reachable set");

  // Bug 2: $reachable is one space-separated line, so a whole-line match can never equal one name.
  assert.match(workflow, /for name in \$reachable; do/, "reachability is compared word by word");
  assert.doesNotMatch(workflow, /grep -qx -- "\$owner"/, "never with a whole-line grep");

  // Bug 3: the bullet is three bytes and the runner's locale is C.
  assert.match(workflow, /u2022/, "the bullet is matched in node, which reads the output as UTF-8");
  assert.match(workflow, /runner's C locale/, "and the file says why, so nobody 'simplifies' it back to grep");
});

test("an exhausted plan is reported, not treated as a broken pipeline", () => {
  const quota = at("eas account:usage");
  assert.match(workflow, /jq -e --slurp 'length > 0 and \(\.\[0\] \| type == "object"\) and \(\.\[0\]\.account\.name != null\)' usage\.json/,
    "a zero exit with unparseable output is still no answer, so the JSON is validated");
  // `jq -e <filter>` exits 0 on empty input — nothing was produced for -e to judge — so a guard
  // written without --slurp waves through the zero-byte response it exists to catch.
  assert.match(workflow, /--slurp is load-bearing/, "and the file says why the slurp cannot be dropped");
  assert.match(workflow, /if \.builds\.android then \.builds\.android\.plan\.percentUsed else \.builds\.plan\.percentUsed end/,
    "the Android counter decides, because NowBey ships Android APKs only");
  assert.ok(workflow.indexOf("has no Android builds left", quota) > quota,
    "a spent plan is a warning that names the reset date and the local Gradle fallback");

  const verdict = at("Report the verdict");
  assert.match(workflow.slice(verdict), /QUOTA_OUTCOME" != "success"[\s\S]{0,600}::notice/,
    "and it cannot turn the run red: quota is a plan fact, not a defect");
  assert.match(workflow.slice(verdict), /::error[\s\S]{0,700}\n\s*exit 1/,
    "while an unestablished account or an unreadable project does fail the run");
});

test("the dispatch script can fire it without Actions tab access", () => {
  const dispatch = read("scripts/eas-dispatch.sh");
  assert.match(dispatch, /account\|whoami\|quota\)/, "`eas-dispatch.sh account` is a target");
  assert.match(dispatch, /event_type="expo-account"/, "and it posts the event this workflow listens for");
  assert.match(dispatch, /workflows\/expo-account\.yml/, "pointing at the run that will answer");
});

test('the readable-project annotation names the project (eas-cli pads the label, there is no colon)', () => {
  // Observed in run 39304899284: the step succeeded and the annotation still said "unknown".
  // eas-cli 25.2.0 prints project:info through formatFields, which pads `fullName` to the width of
  // `ID` and separates with two spaces — `fullName  @owner/slug` — so a `s/^fullName:/` sed can
  // never match. The parse is executed here against that exact shape rather than asserted as text.
  const snippet = workflow.match(/full_name="\$\(node -e '([^']+)'/);
  assert.ok(snippet, 'the workflow parses project-info.txt with node');

  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'nowbey-project-info-'));
  const run = (body) => {
    fs.writeFileSync(path.join(dir, 'project-info.txt'), body);
    return spawnSync(process.execPath, ['-e', snippet[1]], { cwd: dir, encoding: 'utf8' }).stdout.trim();
  };
  try {
    assert.equal(run('fullName  @oasistech242/nowbey\nID        10e4a677-274e-43b1-99e6-33a2b32ccd23\n'),
      '@oasistech242/nowbey', 'the padded two-space format is read, not reported as unknown');
    assert.equal(run('fullName  @nowbey-v3s-team/nowbey\nID        aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee\n'),
      '@nowbey-v3s-team/nowbey', 'and it follows the project when it moves accounts');
    assert.equal(run(''), '', 'nothing to report stays empty rather than throwing');
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }

  assert.doesNotMatch(workflow, /sed -n 's\/\^fullName:/,
    'and the colon-anchored sed that produced "unknown" is gone');
});
