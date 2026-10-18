/**
 * The news filter: the wire only carries stories.
 *
 * The junk these tests pin down was really on the wire: "Profile : taixiushopnet",
 * "Search results for : low cost", "Segment 7 cutout | e-Edition" and a row of
 * gambling pages, all published as if they were Bahamian news.
 *
 * Hermetic: pure functions, no database and no network.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  cleanSnippet,
  isGamblingTitle,
  isGoogleNewsUrl,
  isJunkHeadline,
  normaliseTitle,
  publisherAllowed,
  publisherForHost,
  screenNewsItem,
  storyKey,
} from "../src/lib/news-filter.ts";

const story = (over = {}) => ({
  title: "BPL schedules maintenance outage for eastern New Providence",
  url: "https://www.bahamasinvestor.com/bpl-maintenance-outage/",
  sourceName: "Bahamas Investor",
  summary: "Planned two-hour outage on Tuesday.",
  publishedAt: new Date("2026-10-17T09:00:00Z"),
  ...over,
});

test("a directory profile page is not a headline", () => {
  assert.equal(isJunkHeadline("Profile : taixiushopnet"), true);
  assert.equal(isJunkHeadline("Search results for : low cost"), true);
  assert.equal(isJunkHeadline("  profile : iwin88poker"), true);
});

test("a headline of fewer than four words is not a headline", () => {
  assert.equal(isJunkHeadline("Storm warning"), true);
  assert.equal(isJunkHeadline("Flooding on Shirley Street"), false);
});

test("gambling and casino pages never reach the wire", () => {
  for (const t of [
    "Profile : taixiushopnet",
    "Profile : iwin88poker",
    "Profile : sc88wwwcom",
    "Profile : bl555hiphopv",
    "Casino online slots free spins tonight",
    "NoHu slot machine games to play now",
  ]) {
    assert.equal(isGamblingTitle(t), true, t);
  }
  assert.equal(isGamblingTitle("BPL schedules maintenance outage for eastern New Providence"), false);
});

test("an e-Edition cutout page is not a story", () => {
  assert.equal(isJunkHeadline("Segment 7 cutout | e-Edition"), true);
});

test("the publisher has to be one we know", () => {
  assert.equal(publisherAllowed("Bahamas Investor"), true);
  assert.equal(publisherAllowed("Eyewitness News"), true);
  assert.equal(publisherAllowed("taixiushopnet"), false);
  assert.equal(publisherAllowed(""), false);
  assert.equal(publisherAllowed(null), false);
});

test("a Google News redirect is recognised as a redirect", () => {
  assert.equal(isGoogleNewsUrl("https://news.google.com/rss/articles/CBMiAAAA"), true);
  assert.equal(isGoogleNewsUrl("https://www.bahamasinvestor.com/story/"), false);
});

test("a publisher domain resolves back to a name we know", () => {
  assert.equal(publisherForHost("www.bahamasinvestor.com"), "Bahamas Investor");
  assert.equal(publisherForHost("ewnews.com"), "Eyewitness News");
  assert.equal(publisherForHost("taixiushopnet.com"), null);
});

test("a real story from a known outlet passes", () => {
  const verdict = screenNewsItem(story(), new Set());
  assert.equal(verdict.ok, true);
  assert.equal(verdict.ok && verdict.publisher, "Bahamas Investor");
});

test("a Google News redirect with no publisher is held", () => {
  const verdict = screenNewsItem(
    story({ url: "https://news.google.com/rss/articles/CBMiAAAA", sourceName: "" }),
    new Set(),
  );
  assert.equal(verdict.ok, false);
  assert.equal(!verdict.ok && verdict.reason, "no-publisher");
});

test("a story from an unknown site is held, not published", () => {
  const verdict = screenNewsItem(story({ sourceName: "taixiushopnet" }), new Set());
  assert.equal(verdict.ok, false);
  assert.equal(!verdict.ok && verdict.reason, "publisher-unknown");
});

test("the same story from the same outlet is held within 48 hours", () => {
  const seen = new Set([storyKey(story().title, "Bahamas Investor")]);
  const verdict = screenNewsItem(story(), seen);
  assert.equal(verdict.ok, false);
  assert.equal(!verdict.ok && verdict.reason, "duplicate");
});

test("the same headline from a different outlet is a different story", () => {
  const seen = new Set([storyKey(story().title, "Bahamas Investor")]);
  const verdict = screenNewsItem(story({ sourceName: "Eyewitness News" }), seen);
  assert.equal(verdict.ok, true);
});

test("headlines are compared on their words, not their punctuation", () => {
  assert.equal(
    normaliseTitle("Flooding on Shirley Street!"),
    normaliseTitle("flooding on shirley street"),
  );
});

test("a snippet loses the word Advertisement and a trailing ellipsis", () => {
  assert.equal(cleanSnippet("A planned outage on Tuesday. Advertisement"), "A planned outage on Tuesday.");
  assert.equal(cleanSnippet("A planned outage on Tuesday [...]"), "A planned outage on Tuesday");
  assert.equal(cleanSnippet("A planned outage on Tuesday..."), "A planned outage on Tuesday");
  assert.equal(cleanSnippet(null), "");
});
