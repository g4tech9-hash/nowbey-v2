/**
 * The feed's own hygiene: duplicates folded, adverts held, templates labelled.
 *
 * The real case: "BIG SALE at O-Tech PC Solutions" was filed under Flooding and
 * given a "saw it too" by a neighbour. A false hazard on a map people drive
 * from is worse than a missing pin.
 *
 * Hermetic: pure functions, no database.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  clusterReports,
  collapseBody,
  findCannedNotes,
  holdReason,
  normaliseReportTitle,
  sanityCheck,
} from "../src/lib/report-check.ts";

const report = (over = {}) => ({
  id: "a",
  title: "Flooding on Shirley Street",
  details: "Water up to the kerb.",
  category: "flood",
  lat: 25.0648,
  lng: -77.3432,
  createdAt: "2026-10-17T09:00:00Z",
  updatedAt: "2026-10-17T09:00:00Z",
  confirmations: 0,
  sightings: 0,
  ...over,
});

test("two reports of the same thing, at the same place, are one report", () => {
  const clusters = clusterReports([
    report({ id: "a" }),
    report({ id: "b", createdAt: "2026-10-17T10:00:00Z", confirmations: 1 }),
  ]);
  assert.equal(clusters.length, 1);
  assert.equal(clusters[0].count, 2);
  assert.equal(clusters[0].primary.id, "a");
});

test("the same title at a different street is a different report", () => {
  const clusters = clusterReports([
    report({ id: "a" }),
    report({ id: "b", lat: 25.1, lng: -77.5 }),
  ]);
  assert.equal(clusters.length, 2);
});

test("the same title two days later is a different report", () => {
  const clusters = clusterReports([
    report({ id: "a" }),
    report({ id: "b", createdAt: "2026-10-19T09:00:00Z" }),
  ]);
  assert.equal(clusters.length, 2);
});

test("a title that differs only in filler words is the same report", () => {
  assert.equal(
    normaliseReportTitle("Flooding on Shirley Street"),
    normaliseReportTitle("flooding on shirley street"),
  );
});

test("a street abbreviation is the same street", () => {
  assert.equal(
    normaliseReportTitle("Flooding on Shirley St"),
    normaliseReportTitle("Flooding on Shirley Street"),
  );
  assert.equal(
    normaliseReportTitle("Tree down on Wulff Rd"),
    normaliseReportTitle("Tree down on Wulff Road"),
  );
});

test("a body that only repeats the headline collapses to one line", () => {
  assert.equal(collapseBody("Sanitation issue", "Sanitation issue"), null);
  assert.equal(collapseBody("Sanitation issue", "Sanitation issue."), null);
  assert.equal(collapseBody("Sanitation issue", "Bins have not been collected since Friday."), "Bins have not been collected since Friday.");
  assert.equal(collapseBody("Sanitation issue", null), null);
});

test("an advert filed as a flood is held", () => {
  const row = report({
    title: "BIG SALE at O-Tech PC Solutions",
    details: "Everything must go. 50% off this weekend only.",
    sightings: 1,
  });
  const reason = holdReason(row);
  assert.ok(reason, "a sale notice filed as a flood must be held");
  assert.match(reason, /advertisement/i);
});

test("a hazard with no hazard words is only held once somebody backs it", () => {
  const quiet = report({ title: "Something is happening", details: "Not sure what." });
  assert.equal(holdReason(quiet), null);
  const backed = report({ title: "Something is happening", details: "Not sure what.", confirmations: 2 });
  assert.ok(holdReason(backed));
});

test("a real flood report is never held", () => {
  assert.equal(holdReason(report()), null);
  assert.equal(sanityCheck("Water up to the kerb on the flooded road", "flood"), null);
});

test("the same note on unrelated reports is a template, and is labelled as one", () => {
  const canned = findCannedNotes([
    report({ id: "a", category: "power", photoNote: "water up to the first step of the shelter" }),
    report({ id: "b", category: "safety", photoNote: "Water up to the first step of the shelter" }),
  ]);
  assert.equal(canned.size, 1);
  assert.ok(canned.has("water up to the first step of the shelter"));
});

test("a note that appears on one report only is not a template", () => {
  const canned = findCannedNotes([
    report({ id: "a", category: "power", photoNote: "Lines are down on the east side" }),
  ]);
  assert.equal(canned.size, 0);
});
