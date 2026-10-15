import { test } from "node:test";
import assert from "node:assert/strict";
import { chunkArray, dedupeById, isDeadReceipt, isExpoPushToken, isJunkHeadline, isLikelyDuplicateIncident } from "../src/lib/collect.ts";

test("dedupeById keeps first occurrence in order", () => {
  const rows = [{ id: "a", n: 1 }, { id: "b", n: 2 }, { id: "a", n: 3 }];
  assert.deepEqual(dedupeById(rows), [{ id: "a", n: 1 }, { id: "b", n: 2 }]);
});

test("isJunkHeadline rejects spam profiles and filenames", () => {
  for (const t of ["Profile : mu88vncfd", "More 4.jpeg", "Jayden 2.png", "Stories this photo appears in", "Go88casinoworld bonus", "short", "", "   "]) {
    assert.equal(isJunkHeadline(t), true, t);
  }
});

test("isJunkHeadline keeps real headlines", () => {
  for (const t of [
    "Eleuthera Residents Face Back-To-Back Power Outages",
    "BPL Working: FNM Headquarters Corner Closed",
    "54th Annual McLean's Town Conch Cracking Festival attracts scores",
  ]) {
    assert.equal(isJunkHeadline(t), false, t);
  }
});

test("isLikelyDuplicateIncident uses tight category, time and distance rules", () => {
  const now = Date.parse("2026-10-15T12:00:00Z");
  const incoming = { category: "flood", lat: 25.078, lng: -77.338 };
  assert.equal(isLikelyDuplicateIncident(incoming, { ...incoming, createdAt: new Date(now - 30 * 60_000) }, now), true);
  assert.equal(isLikelyDuplicateIncident(incoming, { category: "road", lat: incoming.lat, lng: incoming.lng, createdAt: new Date(now - 30 * 60_000) }, now), false);
  assert.equal(isLikelyDuplicateIncident(incoming, { ...incoming, createdAt: new Date(now - 91 * 60_000) }, now), false);
  assert.equal(isLikelyDuplicateIncident(incoming, { category: "flood", lat: 25.081, lng: -77.338, createdAt: new Date(now - 5 * 60_000) }, now), false);
});

test("chunkArray splits into max-size parts", () => {
  assert.deepEqual(chunkArray([1, 2, 3, 4, 5], 2), [[1, 2], [3, 4], [5]]);
  assert.deepEqual(chunkArray([], 100), []);
  assert.deepEqual(chunkArray([1, 2], 100), [[1, 2]]);
});

test("isExpoPushToken accepts only ExponentPushToken[...] shapes", () => {
  assert.equal(isExpoPushToken("ExponentPushToken[abc123_-.]"), true);
  for (const t of ["abc", "", null, undefined, "ExponentPushToken[]", "ExponentPushToken[has space]", "FCM:xyz"]) {
    assert.equal(isExpoPushToken(t), false, String(t));
  }
});

test("isDeadReceipt flags only DeviceNotRegistered", () => {
  assert.equal(isDeadReceipt({ status: "error", message: "DeviceNotRegistered" }), true);
  assert.equal(isDeadReceipt({ status: "error", message: "MessageTooBig" }), false);
  assert.equal(isDeadReceipt({ status: "ok" }), false);
});
