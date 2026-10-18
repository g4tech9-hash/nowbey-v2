/**
 * U4: six thumb targets at 320px, and the loudest action not under the thumb.
 *
 * The phone bar rendered Feed · Map · Wire · Alerts · Report · More — six targets at ~53px with an 11.5px
 * label, and Report (the one action that should be unmissable) sat second from the right. The comment in the
 * file claimed it was "in the middle of the thumb zone", which is how the drift survived review.
 *
 * This test reads the source because the ordering lives in a module-level constant, not in rendered markup.
 * It is intentionally brittle about the *shape* of the bar and nothing else.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const source = readFileSync(new URL("../src/components/nav-links.tsx", import.meta.url), "utf8");

test("the phone bar carries five targets, not six", () => {
  // Left group: Map, Feed. Right group: Wire. Then Report and More are rendered explicitly.
  assert.match(source, /const MOBILE_LEFT = PRIMARY\.filter\(\(l\) => l\.href === "\/map" \|\| l\.href === "\/feed"\)/);
  assert.match(source, /const MOBILE_RIGHT = PRIMARY\.filter\(\(l\) => l\.href === "\/wire"\)/);

  const left = source.match(/const MOBILE_LEFT = PRIMARY\.filter\(\(l\) => (.*?)\);/)?.[1] ?? "";
  const right = source.match(/const MOBILE_RIGHT = PRIMARY\.filter\(\(l\) => (.*?)\);/)?.[1] ?? "";
  assert.equal((left.match(/"\/[a-z-]+"/g) ?? []).length, 2, "left group is exactly two destinations");
  assert.equal((right.match(/"\/[a-z-]+"/g) ?? []).length, 1, "right group is exactly one destination");

  // 2 left + Report + 1 right + More = 5. The old code mapped all four PRIMARY items, giving 6.
  assert.match(source, /\{MOBILE_LEFT\.map/, "left group renders from MOBILE_LEFT");
  assert.match(source, /\{MOBILE_RIGHT\.map/, "right group renders from MOBILE_RIGHT");
  // The phone bar itself must not iterate PRIMARY: that is exactly how it grew to six targets.
  const barStart = source.indexOf('aria-label="Primary"');
  const barEnd = source.indexOf("</nav>", barStart);
  const bar = source.slice(barStart, barEnd);
  assert.ok(barStart > -1 && barEnd > barStart, "the phone bar is present");
  assert.doesNotMatch(bar, /\{PRIMARY\.map/, "the phone bar must not render all four PRIMARY items");
});

test("Report sits between the left and right groups, so it is the centre of the bar", () => {
  const leftAt = source.indexOf("{MOBILE_LEFT.map");
  const reportAt = source.indexOf('href="/report"', leftAt);
  const rightAt = source.indexOf("{MOBILE_RIGHT.map");

  assert.ok(leftAt > -1 && reportAt > -1 && rightAt > -1, "all three blocks are present");
  assert.ok(leftAt < reportAt, "the left group comes before Report");
  assert.ok(reportAt < rightAt, "Report comes before the right group, which puts it in the middle");
});

test("Alerts moved into the overflow list rather than being deleted", () => {
  const secondary = source.match(/const SECONDARY = \[([\s\S]*?)\] as const;/)?.[1] ?? "";
  assert.match(secondary, /href: "\/alerts"/, "Alerts is still reachable from More");
  assert.match(secondary, /label: "Alerts"/);
});

test("the fabricated fuel prices cannot come back through a stale export", async () => {
  const { existsSync } = await import("node:fs");
  assert.equal(
    existsSync(new URL("../src/components/live-ticker.tsx", import.meta.url)),
    false,
    "live-ticker.tsx shipped hard-coded gas prices under a live badge; it must stay deleted",
  );
  assert.doesNotMatch(source, /LiveTicker/);
});
