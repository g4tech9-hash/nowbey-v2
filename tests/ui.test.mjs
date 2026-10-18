/**
 * Phone UI tests for the launch-blocking mobile work. These run against the local server and check
 * the markup a phone actually receives: the reduced map, the pin list that follows it, the Nassau
 * alert form, the honest push wording, and the deploy gate.
 *
 * They are deliberately markup-level. There is no browser in this environment, so nothing here may
 * claim to prove pixels: scripts/mobile-audit.mjs covers the rest of the static checks, and real
 * device testing stays on the human checklist in TODO_HUMAN.md.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { api } from "./harness/env.mjs";

const PHONE_UA =
  "Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36";
const phone = (path, opts = {}) => api(path, { ...opts, headers: { "user-agent": PHONE_UA, ...(opts.headers ?? {}) } });
const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

test("the phone map is short and the pin list sits under it", async () => {
  const res = await phone("/map");
  assert.equal(res.status, 200);
  const html = res.text;
  const css = read("src/app/globals.css");

  // One control switches between a short map and the list, which is the phone layout.
  for (const label of ["What to show on this screen", ">Map<", ">Both<", ">List<"]) {
    assert.ok(html.includes(label), `the phone map switch should offer ${label}`);
  }
  assert.ok(html.includes("nb-map-split"), "the map must carry the reduced-height class on phones");
  assert.ok(html.includes("+ Report a hazard") || html.includes("Report a hazard"), "there should be a one-tap way to report a hazard");

  // The rule itself keeps the phone map between ~124px and ~260px, never the whole screen.
  assert.match(css, /\.nb-map-split\s*\{\s*height:\s*150px/, "the base phone map height must be small");
  assert.match(css, /@supports \(height: 1dvh\)[\s\S]{0,300}clamp\(132px,\s*23dvh,\s*260px\)/, "the dynamic phone map height must stay capped");
  assert.match(css, /@media \(max-width: 359\.98px\)[\s\S]{0,200}clamp\(124px,\s*21dvh,\s*200px\)/, "a 320px phone needs its own smaller cap");
  const splitRules = css.match(/\.nb-map-split\s*\{[^}]*\}/g) ?? [];
  assert.ok(!splitRules.some((r) => /(?:^|[^\d])100v[hs]|\b1[0-9]vh\b/.test(r)), "the phone map must never take the whole viewport");

  // The pin list itself is filled in the browser from /api/incidents, so its order is checked in the
  // source: the map block comes first, the list second. The capped height above is what makes that
  // list start above the fold.
  const source = read("src/app/map/page.tsx");
  const mapAt = source.indexOf("<MapPanel");
  const listAt = source.indexOf('<ul className="space-y-1.5">');
  assert.ok(mapAt > -1, "the phone layout must render the map");
  assert.ok(listAt > mapAt, "the pin list must be built after the map, so it sits under it");
  assert.match(source, /the pin list under it \(the phone default, so the list is above the fold\)/, "the phone default must stay the split layout");
});

test("the alerts page is the Nassau MVP form", async () => {
  const res = await phone("/alerts");
  assert.equal(res.status, 200);
  const html = res.text;
  for (const phrase of [
    "Nassau first",
    "Email address",
    "New Providence",
    "Other islands",
  ]) {
    assert.ok(html.includes(phrase), `the alert form should say: ${phrase}`);
  }
  // "All reports" is an explicit default now, not the absence of a choice, and
  // the thirteen kinds are grouped into families a person can scan.
  assert.ok(html.includes("All reports"), "the category picker must offer an explicit All reports default");
  for (const group of ["Hazards", "Utilities", "Community"]) {
    assert.ok(html.includes(`>${group}<`) || html.includes(group), `the category picker must group the kinds: ${group}`);
  }
  assert.ok(
    !html.includes("Leave everything unselected to hear about every report"),
    "the old 'leave everything unselected' wording must be gone",
  );
  assert.ok(html.includes("Text messages are not available yet"), "text alerts must be labelled as unavailable");
  assert.ok(html.includes("Storm reports for your islands always reach you"), "storm cover must be stated, and it is free for everyone");
  assert.ok(!/Storm.*(Conch|Rock Sound|Admiral)/s.test(html), "storm warnings must not be sold as a paid perk");
});

test("push is described as it actually is, on every surface", async () => {
  const html = (await phone("/alerts")).text;
  // Local runs have no Firebase keys, so the page must say so plainly instead of showing a dead switch.
  assert.ok(html.includes("Not switched on for this site yet"), "with push unconfigured the page must say so");
  assert.ok(html.includes("Email is the one channel that always works today"), "email must be named as the working channel");
  assert.ok(html.includes("Android app has a push switch of its own"), "the app's switch must be distinguished from the website's");
  assert.ok(!html.includes("Push alerts are coming soon"), "the old blanket \"coming soon\" wording must be gone");

  // A perk that is not shipped may not be sold without its tag, and push delivery is still unproven.
  const tiers = read("src/lib/tiers.ts");
  for (const line of tiers.split("\n")) {
    if (/text:\s*"[^"]*(?:[Pp]ush|Text-message)[^"]*"/.test(line)) {
      assert.match(line, /soon:\s*true/, `unshipped push perk must stay tagged Soon: ${line.trim()}`);
    }
  }

  // The app is honest about Android-only, and the website explains the iPhone route.
  const appPush = read("expo/src/push.ts");
  assert.match(appPush, /Platform\.OS === "android"/, "the app must state which platform it supports");
  const appYou = read("expo/app/(tabs)/you.tsx");
  assert.ok(appYou.includes("Android only for now"), "the You tab must say push is Android only");
  assert.ok(appYou.includes("iPhone"), "the You tab must tell iPhone users what still works");
  const webToggle = read("src/components/push-toggle.tsx");
  assert.ok(webToggle.includes("Add to Home Screen"), "the website must explain the iPhone install step");
});

test("no launch document claims push is delivered", () => {
  const files = ["README.md", "TODO_HUMAN.md", "docs/CEO_EXECUTION_STATUS.md"];
  for (const file of files) {
    const text = read(file);
    for (const line of text.split("\n")) {
      if (!/\bpush\b/i.test(line)) continue;
      assert.ok(
        !/push (?:notifications?|alerts?) (?:are|is) (?:live|enabled|working|delivered|ready)/i.test(line),
        `${file} must not claim push is delivering: ${line.trim()}`,
      );
    }
  }
  // The manual steps must stay written down, because they are the only thing standing in the way.
  assert.match(read("TODO_HUMAN.md"), /FCM V1/, "the Firebase credential steps must remain documented");
});

test("every phone page sets a real viewport and never locks zoom", async () => {
  for (const path of ["/", "/map", "/alerts", "/wire", "/report", "/open-now", "/login"]) {
    const html = (await phone(path)).text;
    const viewport = html.match(/<meta name="viewport" content="([^"]+)"/)?.[1] ?? "";
    assert.match(viewport, /width=device-width/, `${path} needs width=device-width`);
    assert.ok(!/user-scalable=no|maximum-scale=1/.test(viewport), `${path} must not block pinch-zoom`);
  }
});

test("the static mobile audit still passes at every phone width", () => {
  const out = execFileSync("node", ["scripts/mobile-audit.mjs"], { encoding: "utf8", cwd: new URL("..", import.meta.url).pathname });
  assert.match(out, /Findings: 0/, `the mobile audit must stay clean:\n${out.slice(-1500)}`);
});

test("deployment is gated on the checks, so a red build cannot ship", () => {
  const yml = read(".github/workflows/deploy.yml");
  assert.match(yml, /^\s{2}gate:/m, "deploy.yml needs a gate job");
  assert.match(yml, /needs:\s*gate/, "the deploy jobs must depend on the gate job");
  for (const step of ["npm run typecheck", "npm run lint", "npm test"]) {
    assert.ok(yml.includes(step), `the gate must run ${step}`);
  }
});
