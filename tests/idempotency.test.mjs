/**
 * Idempotency, closed end to end.
 *
 * The app queued reports with a clientKey but the server ignored it, so the only thing standing between a lost
 * response and a second pin was the 180 m / 90 min proximity rule — which expires. These tests hold three
 * things: the key is validated, the lookup happens before the duplicate rule, and the key itself never leaves
 * the server in a published report (it would group every report from one phone).
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { CLIENT_KEY_MAX, isUndefinedColumn, isUniqueViolation, normaliseClientKey } from "../src/lib/idempotency.ts";
import { publicIncident } from "../src/lib/public.ts";

const route = readFileSync(new URL("../src/app/api/incidents/route.ts", import.meta.url), "utf8");
const schema = readFileSync(new URL("../src/db/schema.ts", import.meta.url), "utf8");

test("the keys the app generates are accepted", () => {
  assert.equal(normaliseClientKey("m-lq3k9z-1f2e3d"), "m-lq3k9z-1f2e3d");
  assert.equal(normaliseClientKey("  M-LQ3K9Z-1F2E3D "), "m-lq3k9z-1f2e3d", "normalised, not trusted verbatim");
});

test("anything that is not our shape is ignored rather than rejected", () => {
  // Absence of a key must never be an error: every client that predates the queue still has to report.
  assert.equal(normaliseClientKey(undefined), null);
  assert.equal(normaliseClientKey(null), null);
  assert.equal(normaliseClientKey(42), null);
  assert.equal(normaliseClientKey("short"), null, "younger than the queue's own format");
  assert.equal(normaliseClientKey("has spaces in it"), null);
  assert.equal(normaliseClientKey("m-lq3k9z-1f2e3d; drop table"), null);
  assert.equal(normaliseClientKey("x".repeat(CLIENT_KEY_MAX + 1)), null, "no unbounded keys in the index");
});

test("the lookup precedes the proximity rule, so a retry is recognised as itself", () => {
  const lookupAt = route.indexOf("normaliseClientKey(body.clientKey)");
  const proximityAt = route.indexOf("recentCandidates");
  assert.ok(lookupAt > -1, "the route reads a client key");
  assert.ok(proximityAt > -1, "the route still has the neighbour-duplicate rule");
  assert.ok(lookupAt < proximityAt, "a retry must be found before it can be refused as a neighbour's duplicate");
});

test("a race is resolved by the unique index, not by luck", () => {
  assert.match(route, /isUniqueViolation\(e\)/, "the insert handles a concurrent twin");
  assert.match(schema, /uniqueIndex\("incidents_client_key_idx"\)/);
  assert.match(schema, /clientKey: text\("client_key"\)/);
});

test("the migration exists and cannot be half-applied", () => {
  const sql = readFileSync(new URL("../src/db/add-client-key.sql", import.meta.url), "utf8");
  assert.match(sql, /BEGIN;/);
  assert.match(sql, /COMMIT;/);
  assert.match(sql, /ADD COLUMN IF NOT EXISTS client_key/);
  assert.match(sql, /CREATE UNIQUE INDEX IF NOT EXISTS incidents_client_key_idx/);
  assert.match(sql, /WHERE client_key IS NOT NULL/, "historical rows must not collide with each other");
});

test("a database without the migration still accepts reports", () => {
  assert.equal(isUndefinedColumn({ code: "42703" }), true);
  assert.equal(isUndefinedColumn({ code: "23505" }), false);
  assert.match(route, /isUndefinedColumn\(e\)/, "the lookup degrades instead of 500ing");
});

test("unique violations are detected through a nested cause", () => {
  assert.equal(isUniqueViolation({ code: "23505" }), true);
  assert.equal(isUniqueViolation({ cause: { code: "23505" } }), true);
  assert.equal(isUniqueViolation({ code: "42703" }), false);
  assert.equal(isUniqueViolation(null), false);
});

test("the key never appears in a published report", () => {
  const published = publicIncident({
    id: "abc",
    title: "Water at the dip",
    clientKey: "m-lq3k9z-1f2e3d",
    address: "12 Village Rd, Nassau",
    street: "Village Rd",
  });
  assert.equal(published.clientKey, undefined, "the device key would group every report from one phone");
  assert.ok(!JSON.stringify(published).includes("m-lq3k9z"), "and it cannot leak through serialisation either");
});
