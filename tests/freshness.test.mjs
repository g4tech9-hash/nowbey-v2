/**
 * Report freshness: one rule, four bands, one time line.
 *
 * The bug this file exists to stop coming back: a card said "Live — Confirmed
 * in the last few hours" next to "20h ago", and a news article carried a
 * "Nobody has checked it recently" tooltip, which is meaningless for a story.
 *
 * Hermetic: pure functions, no database.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  ageLabel,
  bandFor,
  getFreshness,
  hoursSince,
  isStaleForPins,
  publishedTimeLine,
  reportTimeLine,
} from "../src/lib/freshness.ts";

const HOUR = 3600_000;
const NOW = Date.UTC(2026, 9, 17, 12, 0, 0);
const hoursAgo = (h) => new Date(NOW - h * HOUR).toISOString();

test("the bands are 2 hours, 24 hours and 72 hours", () => {
  assert.equal(bandFor(0), "live");
  assert.equal(bandFor(1.9), "live");
  assert.equal(bandFor(2), "recent");
  assert.equal(bandFor(23), "recent");
  assert.equal(bandFor(24), "aging");
  assert.equal(bandFor(71), "aging");
  assert.equal(bandFor(72), "stale");
  assert.equal(bandFor(200), "stale");
});

test("getFreshness reads the same bands", () => {
  assert.equal(getFreshness(hoursAgo(1), "report", NOW).band, "live");
  assert.equal(getFreshness(hoursAgo(5), "report", NOW).band, "recent");
  assert.equal(getFreshness(hoursAgo(40), "report", NOW).band, "aging");
  assert.equal(getFreshness(hoursAgo(100), "report", NOW).band, "stale");
});

test("a report confirmed 20 hours ago is Recent, not Live", () => {
  const f = getFreshness(hoursAgo(20), "report", NOW);
  assert.equal(f.band, "recent");
  assert.notEqual(f.label, "Live");
});

test("a story is published, never confirmed", () => {
  const f = getFreshness(hoursAgo(1), "news", NOW);
  assert.equal(f.label, "Published");
  assert.match(f.blurb, /^Published /);
});

test("a future timestamp (clock skew) counts as just now, not negative", () => {
  const f = getFreshness(new Date(NOW + HOUR).toISOString(), "report", NOW);
  assert.equal(f.band, "live");
  assert.equal(f.hoursAgo, 0);
  assert.equal(hoursSince(new Date(NOW + HOUR).toISOString(), NOW), 0);
});

test("a report with no confirmation time reads as needing a recheck, never as fresh", () => {
  const f = getFreshness(null, "report", NOW);
  assert.equal(f.band, "aging");
  assert.notEqual(f.band, "live");
});

test("only a stale report is left off the default map pins", () => {
  assert.equal(isStaleForPins(hoursAgo(2), NOW), false);
  assert.equal(isStaleForPins(hoursAgo(71), NOW), false);
  assert.equal(isStaleForPins(hoursAgo(73), NOW), true);
});

test("a card shows ONE time line, and the second half only when it differs", () => {
  const line = reportTimeLine({ createdAt: hoursAgo(24 * 6), lastConfirmedAt: hoursAgo(20) }, NOW);
  assert.equal(line, "Filed 6 days ago · last confirmed 20 h ago");
  const same = reportTimeLine({ createdAt: hoursAgo(20), lastConfirmedAt: hoursAgo(20) }, NOW);
  assert.equal(same, "Filed 20 h ago");
  const none = reportTimeLine({ createdAt: hoursAgo(3) }, NOW);
  assert.equal(none, "Filed 3 h ago");
});

test("a story shows one time line: published", () => {
  assert.equal(publishedTimeLine(hoursAgo(5), NOW), "Published 5 h ago");
});

test("age labels read naturally", () => {
  assert.equal(ageLabel(0.5), "30 min ago");
  assert.equal(ageLabel(0.01), "1 min ago");
  assert.equal(ageLabel(3.2), "3 h ago");
  assert.equal(ageLabel(72), "3 days ago");
});
