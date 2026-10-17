/**
 * Authentication tests: sign-up, sign-in, password rules, reset links and session invalidation.
 * These are the launch-blocking flows an owner account (like mario242) depends on, so they are
 * exercised end to end: HTTP in, a row in Postgres out, and a real reset email in between.
 */
import { test, after } from "node:test";
import assert from "node:assert/strict";
import { api, endDb, jar, mailbox, otherPassword, query, strongPassword, unique, waitForMail } from "./harness/env.mjs";

const handle = `t_${unique()}`;
const email = `${handle}@example.test`;
let password = strongPassword();
const cookie = jar();

/** Pulls the one reset link out of a captured email. */
function resetLink(mail) {
  const link = (mail.html.match(/https?:\/\/[^\s"<]+\/reset-password\?token=[A-Za-z0-9_-]+/) ?? [])[0];
  assert.ok(link, `the email should carry a reset link:\n${mail.text.slice(0, 200)}`);
  return link;
}

async function askForReset() {
  // Only look at mail that arrives from now on, or an older link would be picked up again.
  const since = (await mailbox()).length;
  const asked = await api("/api/account/forgot", { method: "POST", body: { email } });
  assert.equal(asked.status, 200, "forgot always answers 200, registered or not");
  const mail = await waitForMail((m) => m.to?.includes(email) && /reset/i.test(m.subject ?? ""), { since });
  assert.ok(mail, "a reset email should reach the local SMTP catcher");
  return resetLink(mail);
}

after(async () => {
  await endDb();
});

test("a weak password is refused, with the reason", async () => {
  for (const [pw, expect] of [
    ["short", /8 characters/],
    ["password", /too easy/],
    ["aaaaaaaaaa", /more than one repeated/],
  ]) {
    const res = await api("/api/session", {
      method: "POST",
      body: { intent: "signup", handle: `${handle}x`, email: `${handle}x@example.test`, password: pw },
    });
    assert.equal(res.status, 400, `${pw} should be refused`);
    assert.match(res.json.error, expect);
  }
});

test("a password built from the handle or the email is refused", async () => {
  for (const [h, e, pw] of [
    ["mario242", "owner@example.test", "mario242password"],
    ["somebody", "nowbey_local@example.test", "Nowbey_local77"],
  ]) {
    const res = await api("/api/session", { method: "POST", body: { intent: "signup", handle: h, email: e, password: pw } });
    assert.equal(res.status, 400, `${pw} should be refused`);
    assert.match(res.json.error, /handle|email/i);
  }
});

test("sign-up creates the account and a session", async () => {
  const res = await api("/api/session", {
    method: "POST",
    body: { intent: "signup", handle, email, password, parish: "New Providence" },
    cookie,
  });
  assert.equal(res.status, 200, JSON.stringify(res.json));
  assert.equal(res.json.created, true);
  assert.equal(res.json.user.handle, handle);
  const setCookie = res.headers.getSetCookie().find((c) => c.startsWith("nowbey_session=")) ?? "";
  assert.match(setCookie, /SameSite=Lax/i, "the session cookie must survive top-level OAuth and email redirects");
  const session = await api("/api/session", { cookie });
  assert.equal(session.json.user.handle, handle);
  assert.equal(session.json.user.emailVerified, false);

  // A signed-in member hitting /login is sent straight through instead of seeing the sign-in form again.
  const plainLogin = await api("/login", { cookie });
  assert.equal(plainLogin.status, 307);
  assert.match(plainLogin.headers.get("location") ?? "", /\/you$/);

  const nextSettings = await api("/login?mode=signin&next=%2Fyou%2Fsettings", { cookie });
  assert.equal(nextSettings.status, 307);
  assert.match(nextSettings.headers.get("location") ?? "", /\/you\/settings$/);

  const hostileNext = await api("/login?mode=signin&next=%2F%2Fevil.com", { cookie });
  assert.equal(hostileNext.status, 307);
  assert.match(hostileNext.headers.get("location") ?? "", /\/you$/);
});

test("the front door is the feed for a member and the landing page for a guest", async () => {
  const guest = await api("/");
  assert.equal(guest.status, 200);
  assert.ok(guest.text.includes("Browse the map without an account"), "a signed-out visitor gets the landing page");
  assert.ok(!guest.text.includes(">The feed<"), "a signed-out visitor does not get the member feed");

  const member = await api("/", { cookie });
  assert.equal(member.status, 200);
  assert.ok(member.text.includes(">The feed<"), "a signed-in member skips the landing page");
  assert.ok(!member.text.includes("Browse the map without an account"), "the member never sees the landing page");
});

test("a second account cannot take the same handle or email", async () => {
  const sameHandle = await api("/api/session", {
    method: "POST",
    body: { intent: "signup", handle, email: `other-${email}`, password: strongPassword() },
  });
  assert.equal(sameHandle.status, 409);
  const sameEmail = await api("/api/session", {
    method: "POST",
    body: { intent: "signup", handle: `${handle}b`, email, password: strongPassword() },
  });
  assert.equal(sameEmail.status, 409);
});

test("the wrong password is refused and creates no session", async () => {
  const fresh = jar();
  const res = await api("/api/session", { method: "POST", body: { handle, password: `wrong-${password}` }, cookie: fresh });
  assert.equal(res.status, 401);
  const session = await api("/api/session", { cookie: fresh });
  assert.equal(session.json.user, null);
});

test("a signed-out visitor cannot export a member's reports", async () => {
  const res = await api("/api/export");
  assert.equal(res.status, 401);
});

test("the reset link arrives by email and changes the password", async () => {
  const link = await askForReset();
  const token = new URL(link).searchParams.get("token");

  // A weak password must not use the link up.
  const weak = await api("/api/account/reset", { method: "POST", body: { token, password: "password" } });
  assert.equal(weak.status, 400);

  const next = otherPassword();
  const good = await api("/api/account/reset", { method: "POST", body: { token, password: next } });
  assert.equal(good.status, 200, JSON.stringify(good.json));

  const old = await api("/api/session", { method: "POST", body: { handle, password } });
  assert.equal(old.status, 401, "the old password must stop working");

  const fresh = jar();
  const signedIn = await api("/api/session", { method: "POST", body: { handle, password: next }, cookie: fresh });
  assert.equal(signedIn.status, 200);
  password = next;

  // A reset signs every other device out: the cookie from before the reset is dead.
  const stale = await api("/api/session", { cookie });
  assert.equal(stale.json.user, null, "the pre-reset session must be invalidated");

  const [row] = await query("select email_verified_at from users where handle = $1", [handle]);
  assert.ok(row.email_verified_at, "receiving the reset link proves the address works");
});

test("a reset link cannot be replayed", async () => {
  const link = await askForReset();
  const token = new URL(link).searchParams.get("token");
  const first = await api("/api/account/reset", { method: "POST", body: { token, password: otherPassword() } });
  assert.equal(first.status, 200);
  const second = await api("/api/account/reset", { method: "POST", body: { token, password: otherPassword() } });
  assert.equal(second.status, 400, "a reset token is single-use");
  password = "";
});

test("sign-out ends the session", async () => {
  // Start from a known password: ask for one more reset link and set it.
  const link = await askForReset();
  const token = new URL(link).searchParams.get("token");
  const next = otherPassword();
  assert.equal((await api("/api/account/reset", { method: "POST", body: { token, password: next } })).status, 200);

  const mine = jar();
  assert.equal((await api("/api/session", { method: "POST", body: { handle, password: next }, cookie: mine })).status, 200);
  assert.equal((await api("/api/session", { cookie: mine })).json.user.handle, handle);

  const out = await api("/api/session", { method: "DELETE", cookie: mine });
  assert.equal(out.status, 200);
  assert.equal((await api("/api/session", { cookie: mine })).json.user, null);
});
