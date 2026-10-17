/**
 * The landing page's own tests.
 *
 * Hermetic like the rest of the unit suite: no server, no database, no browser. The
 * domain model, the state reducer and the content registry are imported directly; the two
 * files that need a compiler (the seed module and the React tree) are bundled with
 * esbuild first, which is the same tool the documentation sync uses.
 *
 * What is actually being protected:
 *   - the model and the reducer behave as the components assume;
 *   - every registered feature points at a module that exists;
 *   - the page renders without throwing, and says the things it promises to say;
 *   - docs/FEATURES.md is in step with the registry, so the docs cannot drift.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { build } from "esbuild";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

import {
  CATEGORY_LABELS,
  countByLevel,
  formatCount,
  levelFromSeverity,
  loudest,
  summariseFeed,
  timeAgoLabel,
} from "../src/lib/landing-model.ts";
import {
  countByCategory,
  filterFeatures,
  initialLandingState,
  landingReducer,
  matchesQuery,
} from "../src/lib/landing-state.ts";
import { FEATURE_CATEGORIES, FEATURES, featureCensus } from "../src/content/featureRegistry.ts";
import { SITE } from "../src/content/site.ts";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

/** Bundles a module that plain Node cannot import on its own, and returns it. */
async function loadBundled(relativePath) {
  const result = await build({
    entryPoints: [path.join(ROOT, relativePath)],
    bundle: true,
    write: false,
    format: "esm",
    platform: "node",
    jsx: "automatic",
    external: ["react", "react-dom", "react-dom/server", "react/jsx-runtime", "react/jsx-dev-runtime"],
    logLevel: "silent",
  });
  // The bundle is written inside the repository so that "react" still resolves from the
  // repository's own node_modules when Node imports it.
  const cache = path.join(ROOT, "node_modules", ".cache", "nowbey-landing");
  mkdirSync(cache, { recursive: true });
  const file = path.join(cache, `${path.basename(relativePath)}.${process.pid}.mjs`);
  writeFileSync(file, result.outputFiles[0].text);
  return import(pathToFileURL(file).href);
}

test("a severity score becomes the level the page shows", () => {
  assert.equal(levelFromSeverity(0), "calm");
  assert.equal(levelFromSeverity(1), "watch");
  assert.equal(levelFromSeverity(2), "watch");
  assert.equal(levelFromSeverity(3), "urgent");
  assert.equal(levelFromSeverity(4), "critical");
  assert.equal(levelFromSeverity(Number.NaN), "calm");
});

test("counts and times read like a person wrote them", () => {
  assert.equal(formatCount(1204), "1,204");
  assert.equal(formatCount(0), "0");
  assert.equal(formatCount(-1500), "-1,500");
  assert.equal(timeAgoLabel(0), "just now");
  assert.equal(timeAgoLabel(12), "12m ago");
  assert.equal(timeAgoLabel(180), "3h ago");
  assert.equal(timeAgoLabel(60 * 24 * 2), "2d ago");
});

test("the feed summary names the loudest thing in it", () => {
  const items = [
    { id: "1", kind: "hazard", title: "a", area: "b", category: "flood", level: "watch", minutesAgo: 1, confirmations: 1, source: "s" },
    { id: "2", kind: "hazard", title: "b", area: "b", category: "storm", level: "critical", minutesAgo: 2, confirmations: 1, source: "s" },
  ];
  assert.equal(loudest(items).id, "2");
  assert.equal(countByLevel(items).critical, 1);
  assert.match(summariseFeed(items), /1 critical/);
  assert.equal(summariseFeed([]), "Nothing filed yet");
  assert.ok(CATEGORY_LABELS.flood);
});

test("the reducer owns every piece of landing state", () => {
  let state = landingReducer(initialLandingState, { type: "toggle-faq", id: "account" });
  assert.equal(state.openFaqId, "account");
  state = landingReducer(state, { type: "toggle-faq", id: "account" });
  assert.equal(state.openFaqId, null, "asking the same question twice closes the answer");

  state = landingReducer(state, { type: "set-category", category: "alerts" });
  assert.equal(state.filter.category, "alerts");
  state = landingReducer(state, { type: "set-query", query: " push " });
  assert.equal(state.filter.query, " push ");
  state = landingReducer(state, { type: "set-menu", open: true });
  assert.equal(state.menuOpen, true);
  state = landingReducer(state, { type: "reset" });
  assert.deepEqual(state, initialLandingState);
});

test("the filter finds a feature by any word on its card", () => {
  const [first] = FEATURES;
  assert.ok(matchesQuery(first, ""));
  assert.ok(matchesQuery(first, first.name.toLowerCase()));
  assert.ok(matchesQuery(first, first.source));
  assert.ok(!matchesQuery(first, "a word that is on no card at all"));

  const filtered = filterFeatures(FEATURES, { category: "alerts", query: "" });
  assert.ok(filtered.length > 0);
  assert.ok(filtered.every((feature) => feature.category === "alerts"));

  const counts = countByCategory(FEATURES);
  assert.equal(counts.all, FEATURES.length);
  for (const category of FEATURE_CATEGORIES) {
    assert.equal(counts[category.key], FEATURES.filter((f) => f.category === category.key).length);
  }
});

test("every registered feature points at a module that exists", () => {
  assert.ok(FEATURES.length >= 20, "the registry should describe the whole product");
  const ids = new Set();
  for (const feature of FEATURES) {
    assert.ok(feature.id && !ids.has(feature.id), `duplicate or missing id: ${feature.id}`);
    ids.add(feature.id);
    assert.ok(feature.name && feature.summary, `${feature.id} needs a name and a summary`);
    assert.ok(feature.capabilities.length > 0, `${feature.id} needs at least one capability`);
    assert.ok(feature.source.startsWith("src/lib/"), `${feature.id} must point into src/lib`);
    assert.ok(existsSync(path.join(ROOT, feature.source)), `${feature.id} points at a missing file: ${feature.source}`);
    assert.ok(
      FEATURE_CATEGORIES.some((category) => category.key === feature.category),
      `${feature.id} uses an unknown category: ${feature.category}`,
    );
  }
  const census = featureCensus();
  assert.equal(census.total, FEATURES.length);
  assert.equal(census.live + census.beta + census.planned + census.internal, census.total);
});

test("the copy is present, and it does not promise a push that is switched off", () => {
  assert.ok(SITE.hero.title.length > 10);
  assert.ok(SITE.hero.notes.length > 0);
  assert.ok(SITE.faqs.length >= 4);
  assert.ok(SITE.stats.length > 0);
  assert.ok(SITE.footer.columns.length > 0);
  for (const faq of SITE.faqs) assert.ok(faq.question && faq.answer);
  // The product ships push switched off; the page has to say so rather than imply it works.
  const faqText = SITE.faqs.map((faq) => faq.answer).join(" ").toLowerCase();
  assert.match(faqText, /switched off/);
});

test("the seed data is the same every time it is asked for", async () => {
  const seed = await loadBundled("src/lib/landing-seed.ts");
  const first = seed.seedFeed();
  const second = seed.seedFeed();
  assert.deepEqual(first, second, "the panel must not reshuffle between renders");
  assert.ok(first.length > 0);
  assert.equal(new Set(first.map((item) => item.id)).size, first.length);
  assert.deepEqual(seed.seedMetrics(), seed.seedMetrics());
  assert.ok(seed.seedMetrics().reportsToday > 0);
});

test("the page renders, and says what it promises", async () => {
  const app = await loadBundled("src/App.tsx");
  const html = renderToStaticMarkup(createElement(app.default));

  assert.match(html, /Know what is happening, island by island/);
  assert.match(html, /min-h-screen/);
  assert.match(html, /bg-ink-950/);
  // The registry is rendered from the registry, so a feature's name has to be on the page.
  assert.ok(html.includes(FEATURES[0].name));
  assert.ok(html.includes(FEATURES[FEATURES.length - 1].name));
  // A source path is shown on every card, and it is a real path.
  assert.ok(html.includes(FEATURES[0].source));
  // The questions are rendered, not hidden.
  assert.ok(html.includes(SITE.faqs[0].question));
  // The icons are drawn, not dropped.
  assert.match(html, /<svg/);
});

test("the documentation is in step with the registry", () => {
  // --check fails when docs/FEATURES.md does not match the registry.
  execFileSync("node", [path.join(ROOT, "scripts", "sync-docs.mjs"), "--check"], { cwd: ROOT, stdio: "pipe" });
  const docs = readFileSync(path.join(ROOT, "docs", "FEATURES.md"), "utf8");
  assert.match(docs, /# Feature registry/);
  for (const feature of FEATURES) {
    assert.ok(docs.includes(feature.name), `the docs should mention ${feature.name}`);
    assert.ok(docs.includes(feature.source), `the docs should point at ${feature.source}`);
  }
});
