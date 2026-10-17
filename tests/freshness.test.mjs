/**
 * Report freshness: how long a report stays "current" without anyone touching it. Labels only; nothing is hidden.
 * Hermetic: pure functions.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { ageLabel, freshnessFor } from "../src/lib/freshness.ts";

const HOUR = 3600_000;
const NOW = Date.UTC(2026, 9, 17, 12, 0, 0);
const hoursAgo = (h) => new Date(NOW - h * HOUR).toISOString();

test("power reports go stale faster than notices", () => {
  assert.equal(freshnessFor("power", hoursAgo(2), NOW).level, "current");
  assert.equal(freshnessFor("power", hoursAgo(5), NOW).level, "aging");
  assert.equal(freshnessFor("power", hoursAgo(10), NOW).level, "stale");
  assert.equal(freshnessFor("notice", hoursAgo(10), NOW).level, "current");
});

test("aging ends at three times the category limit", () => {
  // power limit is 3 h, so aging runs to 9 h
  assert.equal(freshnessFor("power", hoursAgo(9), NOW).level, "aging");
  assert.equal(freshnessFor("power", hoursAgo(9.5), NOW).level, "stale");
});

test("unknown categories use the default limit", () => {
  assert.equal(freshnessFor("not-a-category", hoursAgo(11), NOW).level, "current");
  assert.equal(freshnessFor("not-a-category", hoursAgo(13), NOW).level, "aging");
});

test("a future timestamp (clock skew) counts as just now, not negative", () => {
  const f = freshnessFor("flood", new Date(NOW + HOUR).toISOString(), NOW);
  assert.equal(f.level, "current");
  assert.equal(f.hoursAgo, 0);
});

test("age labels read naturally", () => {
  assert.equal(ageLabel(0.5), "30 min ago");
  assert.equal(ageLabel(0.01), "1 min ago");
  assert.equal(ageLabel(3.2), "3 h ago");
  assert.equal(ageLabel(72), "3 days ago");
});
