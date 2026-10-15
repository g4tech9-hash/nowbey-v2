/**
 * Live security tests: each one is an attack that worked against master before 2026-10-15
 * (see audit/2026-10-15_security/REPORT.md), run against the real local server and database.
 *
 * Needs the local stack (bash tests/run-local.sh) with ADMIN_HANDLES=mario242,eastsiderick and
 * ADMIN_EMAILS=@example.test. Uses its own handles and addresses, so it can run beside the other suites.
 */
import { test, after } from "node:test";
import assert from "node:assert/strict";
import { randomBytes, scryptSync } from "node:crypto";
import { BASE, api, endDb, jar, query, strongPassword, unique, uniqueIp } from "./harness/env.mjs";

after(async () => {
  await endDb();
});

async function newMember(prefix = "sec") {
  const cookie = jar();
  const handle = `${prefix}_${unique()}`;
  const email = `${handle}@example.test`;
  const password = strongPassword();
  const res = await api("/api/session", {
    method: "POST",
    ip: uniqueIp(),
    cookie,
    body: { intent: "signup", handle, email, password, parish: "New Providence" },
  });
  assert.equal(res.status, 200, JSON.stringify(res.json));
  return { cookie, handle, email, password };
}

/* ---------------------------------------------------------------------------------------------- */
/* 1. Paid plans could be self-granted while no payment provider is connected (production today)  */
/* ---------------------------------------------------------------------------------------------- */

test("a member cannot give themselves a paid plan when payments are not set up", async () => {
  const m = await newMember();
  const grab = await api("/api/billing/checkout", { method: "POST", cookie: m.cookie, body: { tier: "admiral", interval: "year" } });
  assert.equal(grab.status, 503, `checkout must refuse, got ${grab.status} ${grab.text}`);
  assert.match(grab.json.error, /Plans open soon/);

  const [row] = await query("select ad_free_tier, plan_status from users where handle = $1", [m.handle]);
  assert.equal(row.ad_free_tier, null);
  assert.equal(row.plan_status, null);

  const me = await api("/api/session", { cookie: m.cookie });
  assert.equal(me.json.user.plan.tier, null);
  assert.equal(me.json.user.verified, false);
  const exp = await api("/api/export", { cookie: m.cookie });
  assert.equal(exp.status, 403, "the Admiral export must stay locked");
});

test("a demo plan written before the fix no longer unlocks anything", async () => {
  const m = await newMember();
  await query("update users set ad_free_tier = 'admiral', plan_status = 'sandbox' where handle = $1", [m.handle]);
  const me = await api("/api/session", { cookie: m.cookie });
  assert.equal(me.json.user.plan.tier, null);
  assert.equal((await api("/api/export", { cookie: m.cookie })).status, 403);
});

test("the plans page says plans open soon instead of offering a button that fails", async () => {
  const page = await api("/support");
  assert.equal(page.status, 200);
  assert.match(page.text, /Plans open soon/);
  assert.match(page.text, /Opening soon/);
  assert.doesNotMatch(page.text, /You can try a plan with your account/);
});

/* ---------------------------------------------------------------------------------------------- */
/* 2. CORS: every API response said Access-Control-Allow-Origin: *                                */
/* ---------------------------------------------------------------------------------------------- */

test("API responses never carry a wildcard CORS header, and strangers get none at all", async () => {
  for (const path of ["/api/health", "/api/session", "/api/incidents?limit=1"]) {
    const res = await fetch(`${BASE}${path}`, { headers: { origin: "https://evil.example" } });
    assert.equal(res.headers.get("access-control-allow-origin"), null, path);
    assert.equal(res.headers.get("access-control-allow-credentials"), null, path);
  }
  const pre = await fetch(`${BASE}/api/session`, {
    method: "OPTIONS",
    headers: { origin: "https://evil.example", "access-control-request-method": "POST" },
  });
  assert.equal(pre.status, 204);
  assert.equal(pre.headers.get("access-control-allow-origin"), null);
});

test("Expo web's development origin is echoed by a development server and refused by a production one", async () => {
  // X-Frame-Options is only sent by a production build (next.config.ts), so it tells the two apart.
  const production = (await fetch(`${BASE}/api/health`)).headers.has("x-frame-options");
  const res = await fetch(`${BASE}/api/health`, { headers: { origin: "http://localhost:8081" } });
  const pre = await fetch(`${BASE}/api/session`, {
    method: "OPTIONS",
    headers: { origin: "http://localhost:8081", "access-control-request-method": "POST" },
  });
  assert.equal(pre.status, 204);
  assert.equal(res.headers.get("access-control-allow-credentials"), null);
  assert.match(res.headers.get("vary") ?? "", /Origin/i);
  if (production) {
    assert.equal(res.headers.get("access-control-allow-origin"), null, "a production server must not trust a developer's localhost");
    assert.equal(pre.headers.get("access-control-allow-origin"), null);
  } else {
    assert.equal(res.headers.get("access-control-allow-origin"), "http://localhost:8081");
    assert.equal(pre.headers.get("access-control-allow-origin"), "http://localhost:8081");
  }
});

/* ---------------------------------------------------------------------------------------------- */
/* 3. Cross-site writes reached routes that never checked the Origin themselves                   */
/* ---------------------------------------------------------------------------------------------- */

test("a write from a foreign website is refused before it reaches any route", async () => {
  const m = await newMember();
  const attempts = [
    ["POST", "/api/comments", { targetType: "incident", targetId: "00000000-0000-0000-0000-000000000000", body: "hi" }],
    ["POST", "/api/account/password", { current: m.password, next: strongPassword() }],
    ["DELETE", "/api/account/sessions", {}],
    ["POST", "/api/billing/checkout", { tier: "conch" }],
    ["PATCH", "/api/account", { displayName: "Hacked" }],
    ["POST", "/api/news", { limit: 1 }],
  ];
  for (const [method, path, body] of attempts) {
    for (const origin of ["https://evil.example", "null"]) {
      const res = await api(path, { method, body, cookie: m.cookie, origin });
      assert.equal(res.status, 403, `${method} ${path} from ${origin} answered ${res.status}`);
      assert.equal(res.json?.error, "Bad origin.");
    }
  }
  const [row] = await query("select display_name from users where handle = $1", [m.handle]);
  assert.notEqual(row.display_name, "Hacked");
});

test("same-site writes, native-app writes (no Origin) and the Stripe webhook still get through", async () => {
  const m = await newMember();
  const same = await api("/api/account", { method: "PATCH", cookie: m.cookie, body: { displayName: "Island Reader", parish: "New Providence" } });
  assert.equal(same.status, 200, same.text);

  const native = await fetch(`${BASE}/api/session`, {
    method: "POST",
    headers: { "content-type": "application/json", "x-nowbey-client": "native", "x-forwarded-for": uniqueIp() },
    body: JSON.stringify({ intent: "signin", handle: m.handle, password: m.password }),
  });
  assert.equal(native.status, 200);
  assert.ok((await native.json()).token, "the app still receives its bearer token");

  const hook = await fetch(`${BASE}/api/billing/webhook`, { method: "POST", headers: { origin: "https://evil.example" }, body: "{}" });
  const text = await hook.text();
  assert.doesNotMatch(text, /Bad origin/, "the webhook authenticates by signature, not by Origin");
});

/* ---------------------------------------------------------------------------------------------- */
/* 4. Any handle on ADMIN_HANDLES was an admin seat for whoever registered it first               */
/* ---------------------------------------------------------------------------------------------- */

test("a stranger cannot register a handle listed in ADMIN_HANDLES", async () => {
  await query("delete from users where handle = 'eastsiderick'");
  const res = await api("/api/session", {
    method: "POST",
    ip: uniqueIp(),
    body: { intent: "signup", handle: "eastsiderick", email: `intruder_${unique()}@evil.test`, password: strongPassword() },
  });
  assert.equal(res.status, 400);
  assert.match(res.json.error, /reserved/);
  const rows = await query("select 1 from users where handle = 'eastsiderick'");
  assert.equal(rows.length, 0);
});

test("an ADMIN_HANDLES account gets no admin rights until its email is confirmed", async () => {
  await query("delete from users where handle = 'eastsiderick'");
  const cookie = jar();
  const res = await api("/api/session", {
    method: "POST",
    ip: uniqueIp(),
    cookie,
    body: { intent: "signup", handle: "eastsiderick", email: `rick_${unique()}@example.test`, password: strongPassword() },
  });
  assert.equal(res.status, 200, res.text);
  let me = await api("/api/session", { cookie });
  assert.equal(me.json.user.isAdmin, false, "an unconfirmed address must not unlock ADMIN_HANDLES");
  assert.equal((await api("/admin", { cookie })).status, 404);
  assert.equal((await api("/api/admin/settings", { method: "PATCH", cookie, body: {} })).status, 403);

  await query("update users set email_verified_at = now() where handle = 'eastsiderick'");
  me = await api("/api/session", { cookie });
  assert.equal(me.json.user.isAdmin, true, "once the address is confirmed, ADMIN_HANDLES applies");
  assert.equal((await api("/admin", { cookie })).status, 200);
  await query("delete from users where handle = 'eastsiderick'");
});

/* ---------------------------------------------------------------------------------------------- */
/* 5. Passwords: stronger hashing without locking anybody out                                     */
/* ---------------------------------------------------------------------------------------------- */

test("new accounts store the versioned scrypt hash", async () => {
  const m = await newMember();
  const [row] = await query("select password_hash from users where handle = $1", [m.handle]);
  assert.match(row.password_hash, /^scrypt\$15\$8\$3\$[0-9a-f]{32}\$[0-9a-f]{128}$/);
});

test("a member with an old-format hash signs in normally and is upgraded silently", async () => {
  const handle = `legacy_${unique()}`;
  const password = strongPassword();
  const salt = randomBytes(12).toString("hex");
  const old = `${salt}:${scryptSync(password, salt, 40).toString("hex")}`;
  await query("insert into users (handle, display_name, email, password_hash) values ($1, $1, $2, $3)", [handle, `${handle}@example.test`, old]);

  const wrong = await api("/api/session", { method: "POST", ip: uniqueIp(), body: { intent: "signin", handle, password: "not-it" } });
  assert.equal(wrong.status, 401);
  let [row] = await query("select password_hash from users where handle = $1", [handle]);
  assert.equal(row.password_hash, old, "a failed sign-in must not touch the hash");

  // A phone keyboard's trailing space is still forgiven, and the hash is upgraded from the value that matched.
  const ok = await api("/api/session", { method: "POST", ip: uniqueIp(), body: { intent: "signin", handle, password: `${password} ` } });
  assert.equal(ok.status, 200, ok.text);
  [row] = await query("select password_hash from users where handle = $1", [handle]);
  assert.match(row.password_hash, /^scrypt\$15\$/);
  const again = await api("/api/session", { method: "POST", ip: uniqueIp(), body: { intent: "signin", handle, password } });
  assert.equal(again.status, 200, "the upgraded hash must accept the same password");
});

/* ---------------------------------------------------------------------------------------------- */
/* 6. Shared rate limits (and the fallback while the migration has not run)                       */
/* ---------------------------------------------------------------------------------------------- */

test("wrong passwords are counted in the shared table and the seventh attempt is refused", async () => {
  const m = await newMember();
  const ip = uniqueIp();
  const before = Number((await query("select count(*)::int as n from rate_limits"))[0].n);
  for (let i = 0; i < 6; i += 1) {
    const r = await api("/api/session", { method: "POST", ip, body: { intent: "signin", handle: m.handle, password: `wrong-${i}` } });
    assert.equal(r.status, 401);
  }
  const blocked = await api("/api/session", { method: "POST", ip, body: { intent: "signin", handle: m.handle, password: m.password } });
  assert.equal(blocked.status, 429, "even the right password waits once the limit is used up");
  assert.ok(Number(blocked.headers.get("retry-after")) > 0);
  const afterCount = Number((await query("select count(*)::int as n from rate_limits"))[0].n);
  assert.ok(afterCount > before, "the failures must be stored in rate_limits, shared by every instance");
  const keys = await query("select key, hits from rate_limits where hits >= 6");
  assert.ok(keys.every((k) => k.key.length <= 64), "long keys are hashed");
});

test("the gas job no longer writes invented prices", async () => {
  const before = Number((await query("select count(*)::int as n from gas_reports"))[0].n);
  const secret = process.env.CRON_SECRET;
  const res = await api("/api/cron/gas-update", { headers: { authorization: `Bearer ${secret}` } });
  assert.equal(res.status, 200, res.text);
  assert.equal(res.json.updated, 0);
  const afterCount = Number((await query("select count(*)::int as n from gas_reports"))[0].n);
  assert.equal(afterCount, before);
  assert.equal((await api("/api/cron/gas-update", { headers: { authorization: "Bearer undefined" } })).status, 404);
});

test("without the rate_limits table the site keeps working with the old per-instance limits", async () => {
  await query("alter table rate_limits rename to rate_limits_parked");
  try {
    const m = await newMember();
    const ip = uniqueIp();
    for (let i = 0; i < 6; i += 1) {
      const r = await api("/api/session", { method: "POST", ip, body: { intent: "signin", handle: m.handle, password: `wrong-${i}` } });
      assert.equal(r.status, 401, `attempt ${i} answered ${r.status}: ${r.text}`);
    }
    const blocked = await api("/api/session", { method: "POST", ip, body: { intent: "signin", handle: m.handle, password: m.password } });
    assert.equal(blocked.status, 429, "the in-memory limit must still apply");
    const fresh = await newMember();
    const ok = await api("/api/session", { method: "POST", ip: uniqueIp(), body: { intent: "signin", handle: fresh.handle, password: fresh.password } });
    assert.equal(ok.status, 200, "sign-in itself must keep working");
  } finally {
    await query("alter table rate_limits_parked rename to rate_limits");
  }
});
