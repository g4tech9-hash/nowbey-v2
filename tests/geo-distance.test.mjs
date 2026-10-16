/**
 * Hermetic tests for the geofence maths (src/lib/geo-distance.ts).
 * No database, no server, no network -- these run in CI on every push.
 *
 * The point of the module is one question: "is this device inside the circle the
 * admin drew?" A wrong answer either pages strangers or silently drops the
 * people who needed the alert, and neither failure is visible from the UI. So
 * the values here are pinned to known distances rather than to whatever the
 * implementation happens to produce.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { distanceKm, milesToKm, withinMiles } from "../src/lib/geo-distance.ts";

/** Nassau, and a few points at known distances from it. */
const NASSAU = { lat: 25.0479, lng: -77.3554 };

test("the same point is zero kilometres away", () => {
  assert.equal(distanceKm(NASSAU.lat, NASSAU.lng, NASSAU.lat, NASSAU.lng), 0);
});

test("one degree of latitude is about 111 km anywhere on Earth", () => {
  // A degree of a great circle is 1/360 of 2*pi*R, which is 111.2 km on a
  // 6371 km sphere. This is the one distance that can be derived rather than
  // looked up, so it is the anchor for everything else.
  const north = distanceKm(NASSAU.lat, NASSAU.lng, NASSAU.lat + 1, NASSAU.lng);
  assert.ok(Math.abs(north - 111.2) < 0.5, `north: ${north.toFixed(2)}`);
  // Same at the equator and near the pole: meridians are great circles.
  assert.ok(Math.abs(distanceKm(0, 0, 1, 0) - 111.2) < 0.5);
  assert.ok(Math.abs(distanceKm(70, 0, 71, 0) - 111.2) < 0.5);
});

test("one degree of longitude is 111 km at the equator and shrinks poleward", () => {
  // This is the whole reason a radius needs real maths rather than a bounding
  // box: at Nassau's latitude a degree east is 111.2 * cos(25) = 100.7 km.
  const east = distanceKm(NASSAU.lat, NASSAU.lng, NASSAU.lat, NASSAU.lng + 1);
  assert.ok(Math.abs(east - 111.2 * Math.cos((NASSAU.lat * Math.PI) / 180)) < 0.5, `east: ${east.toFixed(2)}`);
  assert.ok(Math.abs(distanceKm(0, 0, 0, 1) - 111.2) < 0.5, "equator is the full degree");
});

test("longitude shrinks with latitude, latitude does not", () => {
  // The whole reason a radius needs real maths rather than a bounding box: a
  // degree of longitude at 60N is half what it is at the equator.
  const atEquator = distanceKm(0, 0, 0, 1);
  const at60 = distanceKm(60, 0, 60, 1);
  assert.ok(at60 < atEquator * 0.55, `60N should be about half: ${at60.toFixed(1)} vs ${atEquator.toFixed(1)}`);
  assert.ok(at60 > atEquator * 0.45, `60N should not be less than about half: ${at60.toFixed(1)}`);
  // A degree of latitude is the same everywhere.
  assert.ok(Math.abs(distanceKm(0, 0, 1, 0) - distanceKm(60, 0, 61, 0)) < 0.001);
});

test("distance is symmetric", () => {
  const a = { lat: 25.0479, lng: -77.3554 };
  const b = { lat: 24.7, lng: -77.8 };
  assert.equal(distanceKm(a.lat, a.lng, b.lat, b.lng), distanceKm(b.lat, b.lng, a.lat, a.lng));
});

test("longitude wrap does not produce NaN", () => {
  // The antipode: a naive asin(sqrt(a)) overshoots 1 here and returns NaN.
  const d = distanceKm(0, 0, 0, 180);
  assert.ok(Number.isFinite(d), "distance must stay finite across the globe");
  assert.ok(Math.abs(d - Math.PI * 6371) < 1, "half the circumference");
});

test("miles convert to kilometres", () => {
  assert.equal(milesToKm(1), 1.609344);
  assert.equal(milesToKm(0), 0);
});

test("withinMiles counts the boundary as inside", () => {
  // Exactly on the edge must be inside: a radius is inclusive, and a device on
  // the line is the one most likely to be wrongly dropped.
  const d = distanceKm(0, 0, 0, 1); // about 111 km east
  const miles = d / 1.609344;
  assert.equal(withinMiles(0, 0, 0, 1, miles), true);
  assert.equal(withinMiles(0, 0, 0, 1, miles - 0.001), false);
});

test("a 1-mile radius excludes the far side of the island", () => {
  // ~3 km away: well outside a 1-mile circle, comfortably inside a 5-mile one.
  const far = { lat: NASSAU.lat + 0.02, lng: NASSAU.lng };
  assert.equal(withinMiles(NASSAU.lat, NASSAU.lng, far.lat, far.lng, 1), false);
  assert.equal(withinMiles(NASSAU.lat, NASSAU.lng, far.lat, far.lng, 5), true);
});

test("a zero radius matches only the exact point", () => {
  assert.equal(withinMiles(NASSAU.lat, NASSAU.lng, NASSAU.lat, NASSAU.lng, 0), true);
  assert.equal(withinMiles(NASSAU.lat, NASSAU.lng, NASSAU.lat + 0.001, NASSAU.lng, 0), false);
});
