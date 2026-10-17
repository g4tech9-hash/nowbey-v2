/**
 * Resident pins are published a short, random distance from the spot the reporter chose.
 * Hermetic: pure functions, no database, no network.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { approximatePin, pinPrivacyMeters, DEFAULT_PIN_PRIVACY_METERS } from "../src/lib/location-privacy.ts";

// Great-circle distance in metres, for checking the offset independently of the code under test.
function metresBetween(a, b) {
  const R = 6_371_000;
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

// Seeded generator so the sampling test is repeatable.
function seeded(seed) {
  let x = seed >>> 0;
  return () => {
    x ^= x << 13;
    x >>>= 0;
    x ^= x >>> 17;
    x ^= x << 5;
    x >>>= 0;
    return x / 4294967296;
  };
}

const NASSAU = { lat: 25.0443, lng: -77.3504 };

test("default privacy radius is 60 m when unset or unusable", () => {
  assert.equal(DEFAULT_PIN_PRIVACY_METERS, 60);
  assert.equal(pinPrivacyMeters(undefined), 60);
  assert.equal(pinPrivacyMeters(""), 60);
  assert.equal(pinPrivacyMeters("   "), 60);
  assert.equal(pinPrivacyMeters("lots"), 60);
  assert.equal(pinPrivacyMeters("-5"), 60);
  assert.equal(pinPrivacyMeters("Infinity"), 60);
});

test("PIN_PRIVACY_METERS can be set, switched off, and is capped", () => {
  assert.equal(pinPrivacyMeters("0"), 0, "0 turns the rule off");
  assert.equal(pinPrivacyMeters("120"), 120);
  assert.equal(pinPrivacyMeters(" 45.5 "), 45.5);
  assert.equal(pinPrivacyMeters("100000"), 500, "a typo must not move pins across the island");
});

test("meters = 0 publishes the exact spot and reports no offset", () => {
  const p = approximatePin(NASSAU.lat, NASSAU.lng, 0, () => 0.42);
  assert.equal(p.lat, NASSAU.lat);
  assert.equal(p.lng, NASSAU.lng);
  assert.equal(p.offsetMeters, 0);
});

test("the offset lies between half and the full radius", () => {
  const rnd = seeded(7);
  for (let i = 0; i < 2000; i++) {
    const p = approximatePin(NASSAU.lat, NASSAU.lng, 60, rnd);
    const d = metresBetween(NASSAU, p);
    assert.ok(d >= 30 - 0.5, `moved ${d.toFixed(2)} m, expected at least 30 m`);
    assert.ok(d <= 60 + 0.5, `moved ${d.toFixed(2)} m, expected at most 60 m`);
    assert.ok(Math.abs(d - p.offsetMeters) <= 1, "reported offset should match the real move");
  }
});

test("the published pin is never the exact spot", () => {
  const p = approximatePin(NASSAU.lat, NASSAU.lng, 60, () => 0.25);
  assert.ok(p.lat !== NASSAU.lat || p.lng !== NASSAU.lng);
  assert.ok(p.offsetMeters > 0);
});

test("coordinates are rounded to about 0.1 m", () => {
  const p = approximatePin(NASSAU.lat, NASSAU.lng, 60, seeded(99));
  assert.equal(p.lat, Math.round(p.lat * 1e6) / 1e6);
  assert.equal(p.lng, Math.round(p.lng * 1e6) / 1e6);
});

test("longitude offset widens correctly at higher latitudes", () => {
  // A fixed random value of 0.25 gives a due-east move. At 60°N a degree of longitude is half as long
  // as at the equator, so the same metre offset must produce about twice the longitude change.
  const equator = approximatePin(0, 0, 60, () => 0.25);
  const north = approximatePin(60, 0, 60, () => 0.25);
  assert.ok(equator.lng > 0 && north.lng > 0, "east move");
  const ratio = north.lng / equator.lng;
  assert.ok(Math.abs(ratio - 2) < 0.02, `expected a ratio near 2, got ${ratio.toFixed(4)}`);
});

// storedPinFor is what the incident route writes. These tests pin the rules the public feed relies on.
import { storedPinFor } from "../src/lib/location-privacy.ts";

test("storedPinFor moves a resident pin and raises accuracy to the offset", () => {
  const out = storedPinFor({ lat: NASSAU.lat, lng: NASSAU.lng, accuracyMeters: 4 }, 60, () => 0.25);
  assert.equal(out.pinApproximated, true);
  assert.ok(out.lat !== NASSAU.lat || out.lng !== NASSAU.lng, "the stored pin is not the reported spot");
  assert.ok(out.accuracyMeters >= 37 && out.accuracyMeters <= 38, "accuracy becomes the larger value (the 37.5 m offset)");
});

test("storedPinFor keeps device accuracy when it is larger than the offset", () => {
  const out = storedPinFor({ lat: NASSAU.lat, lng: NASSAU.lng, accuracyMeters: 500 }, 60, () => 0.25);
  assert.equal(out.accuracyMeters, 500);
});

test("storedPinFor with the rule off stores the exact spot and says so", () => {
  const out = storedPinFor({ lat: NASSAU.lat, lng: NASSAU.lng, accuracyMeters: null }, 0);
  assert.deepEqual(out, { lat: NASSAU.lat, lng: NASSAU.lng, accuracyMeters: null, pinApproximated: false });
});
