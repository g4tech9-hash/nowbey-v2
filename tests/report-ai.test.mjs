import { test } from "node:test";
import assert from "node:assert/strict";
import { findSimilarReports, textSimilarity, validateSuggestion } from "../src/lib/report-ai-core.ts";

const KEYS = ["flood", "storm", "power", "water", "crime", "road", "marine", "fire", "health", "trash", "event", "notice", "accident"];

test("validateSuggestion accepts a real suggestion and clamps severity to 1-4", () => {
  const s = validateSuggestion({ category: "FLOOD", severity: 9, headline: "Water across Bay Street", missingInfo: ["How deep is it?", 42, "Which lane?"], confidence: "HIGH" }, KEYS);
  assert.equal(s.category, "flood");
  assert.equal(s.severity, 4);
  assert.deepEqual(s.missingInfo, ["How deep is it?", "Which lane?"]);
  assert.equal(s.confidence, "high");
});

test("validateSuggestion rejects an unknown category but keeps the rest", () => {
  const s = validateSuggestion({ category: "weather", severity: 2, headline: "Clouds over Nassau", missingInfo: [], confidence: "medium" }, KEYS);
  assert.equal(s.category, null);
  assert.equal(s.severity, 2);
});

test("validateSuggestion returns null when the model said nothing usable", () => {
  assert.equal(validateSuggestion(null, KEYS), null);
  assert.equal(validateSuggestion({}, KEYS), null);
  assert.equal(validateSuggestion({ category: "nope", headline: "", missingInfo: [] }, KEYS), null);
});

test("textSimilarity rewards shared place words and ignores filler", () => {
  assert.ok(textSimilarity("Knee-deep water across Bay Street", "Flooding on Bay Street by the bus stand") > 0.3);
  assert.ok(textSimilarity("Knee-deep water across Bay Street", "Power out in Sea Breeze all morning") < 0.15);
  assert.equal(textSimilarity("", "anything"), 0);
});

test("findSimilarReports returns the closest wording matches, best first, capped at 3", () => {
  const draft = { title: "Water across Bay Street at the bus stand", details: "Small cars turning back" };
  const candidates = [
    { id: "a", title: "Flooding on Bay Street, bus stand side", details: "cars turning back", category: "flood", distanceM: 300 },
    { id: "b", title: "Power outage in Sea Breeze", details: "no electricity since morning", category: "power", distanceM: 100 },
    { id: "c", title: "Bay Street water rising fast", details: "", category: "road", distanceM: 900 },
    { id: "d", title: "Bus stand flooding on Bay Street", details: "water across the road", category: "notice", distanceM: 500 },
    { id: "e", title: "Water at Bay Street bus stand again", details: "", category: "flood", distanceM: 50 },
  ];
  const found = findSimilarReports(draft, candidates, 0.2);
  assert.ok(found.length >= 2 && found.length <= 3);
  assert.equal(found.some((f) => f.id === "b"), false);
  for (let i = 1; i < found.length; i++) assert.ok(found[i - 1].similarity >= found[i].similarity);
});
