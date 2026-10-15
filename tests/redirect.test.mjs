/**
 * The "where do we send the browser back to" guard.
 *
 * A `next` parameter is written by whoever sent the link, so it is hostile until proven otherwise.
 * These tests are hermetic on purpose: the guard decides where a browser ends up, and that must not
 * depend on a database or a running server.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { safeNext } from "../src/lib/redirect.ts";

test("a path inside the site is used as it is", () => {
  assert.equal(safeNext("/map"), "/map");
  assert.equal(safeNext("/you/settings?welcome=1"), "/you/settings?welcome=1");
  assert.equal(safeNext("/"), "/");
});

test("the return trip can never be sent to another site", () => {
  // "//evil.com" is a protocol-relative absolute URL: the classic open-redirect trick.
  // The others are the same trick wearing a different hat, and each one leaves the site in a
  // browser even though it does not look like it does.
  for (const next of [
    "//evil.com",
    "https://evil.com",
    "http://evil.com",
    "/\\evil.com",
    "/.//evil.com",
    "/\t/evil.com",
    "/\n/evil.com",
    "/\r/evil.com",
    "\\\\evil.com",
    "javascript:alert(1)",
    "data:text/html,<script>alert(1)</script>",
  ]) {
    const dest = safeNext(next);
    assert.equal(dest, "/map", `${JSON.stringify(next)} was allowed through as ${dest}`);
    // Belt and braces: the value must not survive as anything a browser reads as another site.
    const resolved = new URL(dest, "https://nowbey.example/");
    assert.equal(resolved.origin, "https://nowbey.example", next);
    assert.ok(!resolved.pathname.startsWith("//"), `${JSON.stringify(next)} resolved off-site`);
  }
});

test("an empty, missing or over-long value falls back", () => {
  assert.equal(safeNext(null), "/map");
  assert.equal(safeNext(""), "/map");
  assert.equal(safeNext("   "), "/map");
  assert.equal(safeNext("/" + "x".repeat(200)), "/map");
});

test("the fallback is the caller's to choose", () => {
  assert.equal(safeNext("//evil.com", "/you"), "/you");
  assert.equal(safeNext(null, "/you?welcome=1"), "/you?welcome=1");
  assert.equal(safeNext("/map", "/you"), "/map");
});
