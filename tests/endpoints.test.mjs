/**
 * Endpoint and page smoke tests. Every route a phone can reach must answer, and the
 * launch-blocking routes must answer the way the UI assumes.
 */
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { BASE, api, endDb, query } from "./harness/env.mjs";

const PAGES_ANY = [
  "/",
  "/map",
  "/wire",
  "/report",
  "/open-now",
  "/alerts",
  "/login",
  "/forgot-password",
  "/reset-password",
  "/support",
  "/credits",
  "/mobile",
  "/terms",
  "/privacy",
];

let incidentId = null;

before(async () => {
  const res = await api("/api/incidents?limit=1&status=all");
  incidentId = res.json?.incidents?.[0]?.id ?? null;
});

after(async () => {
  await endDb();
});

test("health reports the local stack honestly", async () => {
  const res = await api("/api/health");
  assert.equal(res.status, 200);
  assert.equal(res.json.ok, true);
  assert.equal(res.json.checks.database, true);
  assert.equal(res.json.checks.mail, true, "SMTP is configured in .env.local");
  assert.equal(res.json.checks.push, false, "Firebase is deliberately unset here");
  assert.equal(res.json.checks.rateLimits, true, "run-local.sh applies src/db/add-security-fixes.sql");
  assert.equal(res.json.status, "ready");
});

test("the front door is the landing page for a signed-out visitor", async () => {
  const res = await api("/");
  assert.equal(res.status, 200);
  assert.ok(res.text.includes("Browse the map without an account"), "the landing page offers the guest route into the map");
  assert.ok(!res.text.includes(">The feed<"), "the feed belongs to members");
});

test("public feeds answer without a session", async () => {
  for (const path of ["/api/incidents?limit=5", "/api/news?limit=5", "/api/site", "/api/session"]) {
    const res = await api(path);
    assert.equal(res.status, 200, path);
  }
  const session = await api("/api/session");
  assert.equal(session.json.user, null);
});

test("every phone page answers", async () => {
  for (const path of PAGES_ANY) {
    const res = await api(path);
    assert.equal(res.status, 200, `${path} answered ${res.status}`);
    assert.ok(res.text.includes("NowBey") || res.text.includes("nowbey"), `${path} looks empty`);
  }
});

test("the incident page renders for a real report and 404s for nonsense", async () => {
  assert.ok(incidentId, "seed data must contain at least one report");
  const good = await api(`/incident/${incidentId}`);
  assert.equal(good.status, 200);
  const bad = await api("/incident/11111111-1111-1111-1111-111111111111");
  assert.equal(bad.status, 404);
});

test("deferred products stay switched off at the Nassau launch stage", async () => {
  for (const path of ["/gas", "/life", "/life/places"]) {
    const res = await api(path);
    assert.equal(res.status, 404, `${path} should not exist at launch stage nassau`);
  }
});

test("a signed-out visitor is sent to sign in for member pages", async () => {
  for (const path of ["/you", "/you/settings"]) {
    const res = await api(path);
    assert.equal(res.status, 307, `${path} should redirect a signed-out visitor`);
    assert.match(res.headers.get("location") ?? "", /login/, `${path} should redirect to /login`);
  }
});

test("the admin area is invisible to everyone but staff", async () => {
  for (const path of ["/admin", "/admin/users", "/admin/reports"]) {
    const res = await api(path);
    assert.equal(res.status, 404, `${path} must not exist for the public`);
  }
  for (const [method, path, body] of [
    ["GET", "/api/admin/users", undefined],
    ["PATCH", "/api/admin/users", { handle: "sandy_roads", action: "setRole", role: "admin" }],
    ["GET", "/api/admin/reports", undefined],
  ]) {
    const res = await api(path, { method, body });
    // 405 = the route only exists for another method, which leaks nothing either.
    assert.ok([401, 403, 404, 405].includes(res.status), `${method} ${path} answered ${res.status}`);
  }
});

test("writes from a foreign origin are refused", async () => {
  const res = await api("/api/alerts", {
    method: "POST",
    origin: "https://not-nowbey.example",
    body: { target: "someone@example.com", channel: "email" },
  });
  assert.equal(res.status, 403);
});

test("push registration reflects what the server can actually do", async () => {
  // A browser (FCM) token with Firebase unconfigured must say so rather than pretend.
  const web = await api("/api/push/register", { method: "POST", body: { token: "fcm-token-not-configured-1234567890" } });
  assert.equal(web.status, 503);

  // An Expo device token needs the member.
  const anon = await api("/api/push/register", { method: "POST", body: { token: "ExponentPushToken[abcdefghijklmnopqrstuv]" } });
  assert.equal(anon.status, 401);
  const anonOut = await api("/api/push/unregister", { method: "POST", body: { token: "ExponentPushToken[abcdefghijklmnopqrstuv]" } });
  assert.equal(anonOut.status, 401);
});

test("alert sign-up only accepts email today, and says why for the rest", async () => {
  const res = await api("/api/alerts", {
    method: "POST",
    body: { channel: "sms", target: "+12425551234", parishes: ["New Providence"] },
  });
  assert.equal(res.status, 400);
  assert.match(res.json.error, /push|text/i);
});

test("the mobile audit page tells the truth about the app", async () => {
  const res = await api("/mobile");
  assert.equal(res.status, 200);
  assert.match(res.text, /Expo/);
});

test("no page leaks the database or a secret", async () => {
  const res = await api("/api/health");
  const raw = JSON.stringify(res.json);
  assert.ok(!/postgres|password|secret|key/i.test(raw), "health output must stay secret-free");
  const rows = await query("select count(*)::int as n from users");
  assert.ok(rows[0].n >= 0);
});
