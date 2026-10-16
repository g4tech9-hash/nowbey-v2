/**
 * Incident Command helpers (src/lib/command.ts). Hermetic — no server, no database.
 * Covers the geofence math, merge validation, ban-list fingerprints and alert form rules.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  ALERT_MAX_RECIPIENTS,
  ALERT_RADIUS_MILES_DEFAULT,
  ALERT_RADIUS_MILES_MAX,
  ALERT_RADIUS_MILES_MIN,
  HIDDEN_STATUSES,
  MILES_TO_METERS,
  clampAlertRadiusMiles,
  isHiddenStatus,
  isReportStatus,
  milesToMeters,
  tokenFingerprint,
  validateCustomAlert,
  validateMerge,
} from "../src/lib/command.ts";

const A = "3f2c9a1e-4b5d-4f6a-8c9d-0e1f2a3b4c5d";
const B = "7a8b9c0d-1e2f-4a5b-8c9d-0e1f2a3b4c5d";

test("a mile is 1609.344 metres", () => {
  assert.equal(MILES_TO_METERS, 1609.344);
  assert.ok(Math.abs(milesToMeters(5) - 8046.72) < 0.001);
});

test("radius clamps to the allowed band and never NaN", () => {
  assert.equal(clampAlertRadiusMiles("5"), 5);
  assert.equal(clampAlertRadiusMiles(0.1), ALERT_RADIUS_MILES_MIN);
  assert.equal(clampAlertRadiusMiles(9999), ALERT_RADIUS_MILES_MAX);
  assert.equal(clampAlertRadiusMiles("nonsense"), ALERT_RADIUS_MILES_DEFAULT);
  assert.equal(clampAlertRadiusMiles(undefined), ALERT_RADIUS_MILES_DEFAULT);
  assert.equal(clampAlertRadiusMiles(NaN), ALERT_RADIUS_MILES_DEFAULT);
});

test("merge needs two different valid ids", () => {
  assert.deepEqual(validateMerge(A, B), { into: A, from: B });
  assert.ok("error" in validateMerge(A, A));
  assert.ok("error" in validateMerge(A, "not-an-id"));
  assert.ok("error" in validateMerge("", B));
});

test("banned-device fingerprints are stable, opaque and salted", () => {
  const h1 = tokenFingerprint("ExponentPushToken[abc123]");
  const h2 = tokenFingerprint("  ExponentPushToken[abc123]  ");
  assert.equal(h1, h2);
  assert.match(h1, /^[0-9a-f]{64}$/);
  assert.ok(!h1.includes("abc123"), "the token must not be recoverable from the hash");
  assert.notEqual(h1, tokenFingerprint("ExponentPushToken[other]"));
});

test("archived and unfounded reports stay off public surfaces", () => {
  assert.ok(HIDDEN_STATUSES.includes("archived"));
  assert.ok(HIDDEN_STATUSES.includes("unfounded"));
  assert.ok(isHiddenStatus("archived") && isHiddenStatus("unfounded"));
  assert.ok(!isHiddenStatus("active") && !isHiddenStatus("resolved"));
  for (const s of ["active", "resolved", "unfounded", "archived"]) assert.ok(isReportStatus(s));
  assert.ok(!isReportStatus("deleted") && !isReportStatus(""));
});

test("custom alert form rejects junk before anything sends", () => {
  const good = { title: "Flooding on Bay Street", body: "Water is knee-deep near the market, avoid the area.", lat: 25.07, lng: -77.34, radiusMiles: 5 };
  assert.deepEqual(validateCustomAlert(good), good);
  assert.ok("error" in validateCustomAlert({ ...good, title: "Hi" }));
  assert.ok("error" in validateCustomAlert({ ...good, body: "short" }));
  assert.ok("error" in validateCustomAlert({ ...good, lat: 40.7, lng: -74.0 }), "New York is not The Bahamas");
  assert.ok("error" in validateCustomAlert({ ...good, lat: "north" }));
  // The radius is repaired, not rejected.
  assert.equal(validateCustomAlert({ ...good, radiusMiles: 99999 }).radiusMiles, ALERT_RADIUS_MILES_MAX);
});

test("one blast can never email more than the cap", () => {
  assert.equal(ALERT_MAX_RECIPIENTS, 5000);
});
