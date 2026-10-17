/**
 * The page content-security policy: a fresh nonce per request, no inline scripts without it.
 * Hermetic: pure functions.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { buildCsp, isWorkerScriptPath, newNonce } from "../src/lib/csp.ts";

test("nonces are random, long enough, and base64", () => {
  const a = newNonce();
  const b = newNonce();
  assert.notEqual(a, b);
  assert.ok(a.length >= 22, "at least 128 bits of entropy once encoded");
  assert.match(a, /^[A-Za-z0-9+/]+=*$/);
});

test("script-src carries the nonce and never allows unsafe-inline", () => {
  const csp = buildCsp("abc123==");
  const script = csp.split(";").map((d) => d.trim()).find((d) => d.startsWith("script-src"));
  assert.ok(script, "script-src is present");
  assert.ok(script.includes("'nonce-abc123=='"));
  assert.ok(script.includes("'strict-dynamic'"));
  assert.ok(!script.includes("'unsafe-inline'"));
  assert.ok(!script.includes("'unsafe-eval'"));
});

test("objects, base URIs, forms and framing are locked down", () => {
  const csp = buildCsp("x");
  assert.ok(csp.includes("object-src 'none'"));
  assert.ok(csp.includes("base-uri 'self'"));
  assert.ok(csp.includes("form-action 'self'"));
  assert.ok(csp.includes("frame-ancestors 'none'"));
});

test("the two service-worker scripts skip the page policy, and nothing else does", () => {
  assert.equal(isWorkerScriptPath("/sw.js"), true);
  assert.equal(isWorkerScriptPath("/firebase-messaging-sw.js"), true);
  for (const p of ["/", "/map", "/sw.js/extra", "/api/sw.js", "/firebase-messaging-sw.js.map", "/manifest.webmanifest"]) {
    assert.equal(isWorkerScriptPath(p), false, p);
  }
});
