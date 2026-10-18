/**
 * R4: the privacy control protected the coordinate and published the address.
 *
 * Every published report goes through `publicIncident`. It used to strip `userId` and nothing else, so a
 * report whose pin had been blurred 30–60m still carried "12 Village Rd" — which is not a blur at all.
 * These tests hold the redaction to the forms a reverse-geocoder actually returns.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { publicAddress, publicIncident } from "../src/lib/public.ts";

test("a house number is removed and the road survives", () => {
  assert.equal(publicAddress("12 Village Rd, Nassau"), "Village Rd");
  assert.equal(publicAddress("12A Village Rd, Nassau"), "Village Rd");
  assert.equal(publicAddress("#4 Coral Gardens, Freeport"), "Coral Gardens");
  assert.equal(publicAddress("No. 7 Bay Street, Nassau"), "Bay Street");
  assert.equal(publicAddress("12-A Bay Street"), "Bay Street");
});

test("a junction keeps both roads, because there is no doorway in it", () => {
  assert.equal(publicAddress("Madeira St & Mackey St, Nassau"), "Madeira St & Mackey St");
});

test("an ordinal street name is not mistaken for a house number", () => {
  assert.equal(publicAddress("1st Avenue, Nassau"), "1st Avenue");
  assert.equal(publicAddress("21st Street"), "21st Street");
});

test("a unit designator cannot smuggle the building back in", () => {
  assert.equal(publicAddress("Coral Gardens Apt 3, Freeport"), "Coral Gardens");
  assert.equal(publicAddress("Sea Breeze Unit 12B"), "Sea Breeze");
});

test("a bare number is not a place", () => {
  assert.equal(publicAddress("12"), null);
  assert.equal(publicAddress(""), null);
  assert.equal(publicAddress(null), null);
  assert.equal(publicAddress(undefined), null);
});

test("no published report carries a house number, whatever the stored form", () => {
  const row = {
    id: "abc",
    title: "Water at the dip",
    address: "12 Village Rd, Nassau",
    street: "Village Rd",
    userId: "user-1",
    authorHandle: "someone",
  };
  const published = publicIncident(row);

  assert.equal(published.userId, undefined, "the author id must not leave the server");
  assert.equal(published.address, "Village Rd");
  assert.ok(!/\d/.test(String(published.address)), "no digits can survive in a published address");
});

test("a missing address falls back to the road-level street, never to null-by-accident", () => {
  const published = publicIncident({ id: "x", address: null, street: "Shirley Street" });
  assert.equal(published.address, "Shirley Street");
});

test("the redaction never lengthens the field it publishes", () => {
  const long = `${"A".repeat(300)} Road, Nassau`;
  assert.ok(String(publicAddress(long)).length <= 80);
});
