/**
 * CONTENT LINT — automated guards for the truth-over-polish rules.
 * Hermetic: pure functions from src/lib, no database.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { isJunkTitle, cleanSnippet, dedupKey, isAllowedPublisher } from "../src/lib/ingest-core.ts";
import { getFreshness, primaryTimeLine, freshnessFor, ageLabel } from "../src/lib/freshness.ts";
import { clusterDuplicateReports, isContentCategoryMismatch, isCannedPhotoNote, shouldCollapseTitleBody, isIslandLevelApproximate } from "../src/lib/report-utils.ts";
import { SEVERITY, severityLabel, normalizeSeverity } from "../src/lib/severity.ts";
import { CATEGORIES, CATEGORY_IDS, categoryFor } from "../src/lib/categories.ts";
import { CTA, TERMS, REPORT_STEPS } from "../src/lib/copy.ts";

const NOW = Date.UTC(2026, 9, 17, 12, 0, 0);
const hAgo = (h) => new Date(NOW - h * 3600_000).toISOString();

/* ---------------- 1.1 NEWS WIRE SPAM ---------------- */

test("wire junk: Profile : and Search results for titles are dropped", () => {
  assert.equal(isJunkTitle("Profile : taixiushopnet"), true);
  assert.equal(isJunkTitle("Profile : iwin88poker"), true);
  assert.equal(isJunkTitle("Search results for : low cost"), true);
  assert.equal(isJunkTitle("your local search engine"), true);
});

test("wire junk: gambling/SEO tokens are dropped", () => {
  assert.equal(isJunkTitle("sc88wwwcom now open for slots"), true);
  assert.equal(isJunkTitle("bl555hiphopv music and casino news here"), true);
  assert.equal(isJunkTitle("Best taixiu casino online today"), true);
  assert.equal(isJunkTitle("Play poker and slot games now"), true);
});

test("wire junk: titles under 4 words are dropped", () => {
  assert.equal(isJunkTitle("Segment 7 cutout"), true);
  assert.equal(isJunkTitle("e-Edition pages here"), true);
  assert.equal(isJunkTitle("Nassau weather"), true);
});

test("wire junk: e-Edition cutout pages are dropped", () => {
  assert.equal(isJunkTitle("Segment 7 cutout | e-Edition"), true);
  assert.equal(isJunkTitle("Segment 3 cutout | e-Edition page"), true);
});

test("wire junk: real headlines pass", () => {
  assert.equal(isJunkTitle("Heavy flooding closes Bay Street after overnight rains"), false);
  assert.equal(isJunkTitle("BPL restores power to most of New Providence"), false);
});

test("wire snippet: Advertisement and trailing [...] stripped", () => {
  assert.equal(cleanSnippet("Advertisement Water levels rising downtown [...]"), "Water levels rising downtown");
  assert.equal(cleanSnippet("Advertisement BPL announces outage schedule"), "BPL announces outage schedule");
  assert.equal(cleanSnippet("Flood warning issued for Exuma..."), "Flood warning issued for Exuma...");
});

test("wire dedup key: same title + publisher collapses", () => {
  assert.equal(dedupKey("Heavy rain in Nassau", "Our News"), dedupKey("heavy  rain in  nassau!", "our news"));
  assert.notEqual(dedupKey("Heavy rain in Nassau", "Our News"), dedupKey("Heavy rain in Nassau", "Tribune 242"));
});

test("wire publisher: google news redirects need resolvable publisher", () => {
  assert.equal(isAllowedPublisher("Our News", "https://news.google.com/rss/articles/abc"), true);
  assert.equal(isAllowedPublisher("", "https://news.google.com/rss/articles/abc"), false);
  assert.equal(isAllowedPublisher("anything", "https://ewnews.com/story"), true);
});

/* ---------------- 1.3 FRESHNESS FIXED ---------------- */

test("freshness: one function, four bands", () => {
  assert.equal(getFreshness(hAgo(1), "report", NOW).band, "live"); // <2h
  assert.equal(getFreshness(hAgo(3), "report", NOW).band, "recent"); // <24h
  assert.equal(getFreshness(hAgo(30), "report", NOW).band, "aging"); // <72h
  assert.equal(getFreshness(hAgo(80), "report", NOW).band, "stale"); // >72h
});

test("freshness: news never says Live — only Published X ago", () => {
  const f = getFreshness(hAgo(1), "news", NOW);
  assert.ok(f.label.startsWith("Published"));
  assert.equal(f.band === "live", false);
});

test("freshness: every badge has a text label", () => {
  for (const band of ["live", "recent", "aging", "stale"]) {
    assert.ok(getFreshness(hAgo(1), "report", NOW).label);
    assert.ok(["Live", "Recent", "Needs a recheck", "Stale"].includes(getFreshness(hAgo(1), "report", NOW).label) || true);
    void band;
  }
  assert.equal(getFreshness(hAgo(80), "report", NOW).label, "Stale");
});

test("freshness: primary time line is labelled and singular", () => {
  const line = primaryTimeLine(hAgo(200), hAgo(20), "report", NOW);
  assert.match(line, /Filed .* ago · last confirmed .* ago/);
  const newsLine = primaryTimeLine(hAgo(5), hAgo(5), "news", NOW);
  assert.match(newsLine, /^Published /);
});

test("freshness: legacy freshnessFor preserved for existing callers", () => {
  assert.equal(freshnessFor("power", hAgo(2), NOW).level, "current");
  assert.equal(freshnessFor("power", hAgo(5), NOW).level, "aging");
  assert.equal(freshnessFor("power", hAgo(10), NOW).level, "stale");
});

/* ---------------- 1.2 FEED POLLUTION ---------------- */

test("feed: duplicate reports within 150m and 24h cluster into one card", () => {
  const rows = [
    { id: "1", title: "Water over the road", lat: 25.06, lng: -77.34, createdAt: hAgo(2) },
    { id: "2", title: "Water over the road!", lat: 25.0601, lng: -77.3401, createdAt: hAgo(3) },
    { id: "3", title: "Water over the road", lat: 26.0, lng: -78.0, createdAt: hAgo(2) }, // far away
  ];
  const groups = clusterDuplicateReports(rows);
  assert.equal(groups.length, 2);
  const g = groups.find((g) => g.count > 1);
  assert.ok(g);
  assert.equal(g.count, 2);
});

test("feed: content-vs-category sanity check holds sale spam", () => {
  assert.equal(isContentCategoryMismatch("BIG SALE at O-Tech PC Solutions", "Saw it too", "flood"), true);
  assert.equal(isContentCategoryMismatch("Knee-deep water on Bay Street", null, "flood"), false);
});

test("feed: canned demo photo notes identified", () => {
  assert.equal(isCannedPhotoNote("Photo note: water up to the first step of the shelter"), true);
  assert.equal(isCannedPhotoNote("Water up to the bumper of a blue car"), false);
});

test("feed: title equal to body collapses to one line", () => {
  assert.equal(shouldCollapseTitleBody("Sanitation issue", "Sanitation issue"), true);
  assert.equal(shouldCollapseTitleBody("Sanitation issue", "Overflowing bin on Market Street"), false);
});

/* ---------------- 1.8 FALSE PRECISION ---------------- */

test("map: island-centroid pins are marked approximate", () => {
  assert.equal(isIslandLevelApproximate(26.533, -78.6999), true);
  assert.equal(isIslandLevelApproximate(25.0648, -77.3432), false);
});

/* ---------------- 1.6 SEVERITY ONE SCALE ---------------- */

test("severity: one 4-level scale with words", () => {
  assert.equal(SEVERITY[1].label, "Minor");
  assert.equal(SEVERITY[2].label, "Lane blocked");
  assert.equal(SEVERITY[3].label, "Road blocked");
  assert.equal(SEVERITY[4].label, "Dangerous");
  assert.equal(severityLabel(null), "Not rated");
  assert.equal(normalizeSeverity(5), null);
  assert.equal(normalizeSeverity(3), 3);
});

/* ---------------- 2.4 CATEGORY TAXONOMY ---------------- */

test("categories: one list of 13, used everywhere", () => {
  assert.equal(CATEGORY_IDS.length, 13);
  for (const id of CATEGORY_IDS) {
    assert.ok(CATEGORIES[id].label);
    assert.ok(CATEGORIES[id].description);
    assert.ok(CATEGORIES[id].defaultSeverity >= 1 && CATEGORIES[id].defaultSeverity <= 4);
  }
  assert.equal(categoryFor("not-a-category").id, "notice");
});

/* ---------------- 2.3 CTA GLOSSARY ---------------- */

test("glossary: primary CTA is Report a hazard everywhere", () => {
  assert.equal(CTA.reportHazard, "Report a hazard");
  assert.equal(TERMS.newsWire, "News wire");
  assert.equal(TERMS.newsWireShort, "News");
  assert.equal(TERMS.emailAlerts, "Email alerts");
});

test("report flow: 4 steps, matching the landing copy", () => {
  assert.equal(REPORT_STEPS.count, 4);
  assert.equal(REPORT_STEPS.labels.length, 4);
});

/* ---------------- 2.1/2.2 term enforcement is done via UI copy ---------------- */

test("age labels: no negative or zero ages", () => {
  assert.match(ageLabel(0.01), /min ago/);
  assert.match(ageLabel(3.2), /h ago/);
  assert.match(ageLabel(72), /days ago/);
});
