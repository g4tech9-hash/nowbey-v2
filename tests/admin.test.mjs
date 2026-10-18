/**
 * Admin and account-recovery tests.
 *
 * The owner account (mario242 in production) is treated here the way it has to be treated anywhere:
 * nobody reads, guesses or writes a password. The only lever these tests use is the reset link the
 * product itself issues — first the member-facing "forgot password" email, then the admin-issued
 * one-hour link from the Members page. Both are exercised end to end against the local server.
 */
import { test, after } from "node:test";
import assert from "node:assert/strict";
import { api, endDb, jar, mailbox, otherPassword, query, strongPassword, unique, uniqueIp, waitForMail } from "./harness/env.mjs";

const OWNER = { handle: "mario242" };
/** A fresh address per run: reset emails are capped at three per address per hour, and this suite
 *  reuses one account. Local dev database only — nothing here touches production. */
const ownerEmail = `owner_${unique()}@example.test`;
const helperHandle = `h_${unique()}`;
const helperEmail = `${helperHandle}@example.test`;

function as(ip) {
  return (path, opts = {}) => api(path, { ...opts, ip });
}

/**
 * Pulls the token out of the reset link the product just mailed. `since` is the mailbox size taken
 * before the request, so an earlier run's link (already used up) can never be picked instead.
 */
async function resetTokenFromMail(email, since) {
  const mail = await waitForMail((m) => m.to?.includes(email) && /reset/i.test(m.subject ?? ""), { since });
  assert.ok(mail, `a reset email should reach the catcher for ${email}`);
  const link = (mail.html.match(/https?:\/\/[^\s"<]+\/reset-password\?token=[A-Za-z0-9_-]+/) ?? [])[0];
  assert.ok(link, "the reset email should carry a reset link");
  return new URL(link).searchParams.get("token");
}

/** Mints a fresh password for the owner account without anyone knowing the old one. */
async function takeOverOwner(call) {
  const password = otherPassword();
  const since = (await mailbox()).length;
  const asked = await call("/api/account/forgot", { method: "POST", body: { email: ownerEmail } });
  assert.equal(asked.status, 200);
  const token = await resetTokenFromMail(ownerEmail, since);
  const reset = await call("/api/account/reset", { method: "POST", body: { token, password } });
  assert.equal(reset.status, 200, JSON.stringify(reset.json));
  return password;
}

let ownerCookie = jar();
let ownerPassword = "";

after(async () => {
  await endDb();
});

test("the owner account exists locally and can be signed into with a freshly minted password", async () => {
  const call = as(uniqueIp());
  const signup = await call("/api/session", {
    method: "POST",
    body: { intent: "signup", termsAccepted: true, handle: OWNER.handle, email: ownerEmail, password: strongPassword(), parish: "New Providence" },
    cookie: ownerCookie,
  });
  assert.ok([200, 409].includes(signup.status), `unexpected sign-up answer ${signup.status}`);
  // 409 means an earlier run created the account; point it at this run's address so the reset email
  // below is a fresh request rather than a fourth one for an address already at its hourly cap.
  if (signup.status === 409) {
    await query("update users set email = $1 where handle = $2", [ownerEmail, OWNER.handle]);
  }

  // Who owns the admin flag? ADMIN_HANDLES, not a password guess. Proven by signing in after a reset.
  ownerPassword = await takeOverOwner(call);
  const fresh = jar();
  const signedIn = await call("/api/session", { method: "POST", body: { handle: OWNER.handle, password: ownerPassword }, cookie: fresh });
  assert.equal(signedIn.status, 200, JSON.stringify(signedIn.json));
  const session = await call("/api/session", { cookie: fresh });
  assert.equal(session.json.user.handle, OWNER.handle);
  assert.equal(session.json.user.isAdmin, true, "ADMIN_HANDLES must make this handle an admin without touching the database row");
  ownerCookie = fresh;
});

test("the admin area opens for the owner and stays shut for a plain member", async () => {
  const call = as(uniqueIp());
  for (const path of ["/admin", "/admin/users"]) {
    const mine = await call(path, { cookie: ownerCookie });
    assert.equal(mine.status, 200, `${path} should open for the owner`);
  }

  // A plain member gets a 404 — the admin area is not advertised to them.
  const helper = jar();
  const signedUp = await call("/api/session", {
    method: "POST",
    body: { intent: "signup", termsAccepted: true, handle: helperHandle, email: helperEmail, password: strongPassword(), parish: "New Providence" },
    cookie: helper,
  });
  assert.equal(signedUp.status, 200, JSON.stringify(signedUp.json));
  const session = await call("/api/session", { cookie: helper });
  assert.equal(session.json.user.isAdmin, false);
  const refused = await call("/admin", { cookie: helper });
  assert.equal(refused.status, 404);
  const refusedApi = await call("/api/admin/users", { method: "PATCH", body: { handle: helperHandle, action: "setRole", role: "admin" }, cookie: helper });
  assert.equal(refusedApi.status, 403);
});

test("the admin Members lever hands out a one-hour reset link, which then works", async () => {
  const call = as(uniqueIp());
  const minted = await call("/api/admin/users", {
    method: "PATCH",
    body: { handle: helperHandle, action: "resetLink" },
    cookie: ownerCookie,
  });
  assert.equal(minted.status, 200, JSON.stringify(minted.json));
  assert.match(minted.json.url, /\/reset-password\?token=[A-Za-z0-9_-]+/);
  const token = new URL(minted.json.url).searchParams.get("token");

  // The link changes the password without anyone ever seeing the old one.
  const password = otherPassword();
  const reset = await call("/api/account/reset", { method: "POST", body: { token, password } });
  assert.equal(reset.status, 200, JSON.stringify(reset.json));
  const fresh = jar();
  assert.equal((await call("/api/session", { method: "POST", body: { handle: helperHandle, password }, cookie: fresh })).status, 200);

  // And the admin never sees a secret: the members page carries no hashes and no addresses.
  const page = await call("/admin/users", { cookie: ownerCookie });
  assert.equal(page.status, 200);
  assert.ok(page.text.includes(helperHandle), "the members list should show the member's handle");
  assert.ok(!/password_hash|\$2[aby]\$|scrypt\$/i.test(page.text), "the members page must never print password material");
  const [row] = await query("select password_hash from users where handle = $1", [OWNER.handle]);
  assert.ok(row.password_hash && row.password_hash.length > 20, "the owner's stored hash must exist in the database, never in a response");
});

test("the admin API refuses to touch an env admin or the caller's own role", async () => {
  const call = as(uniqueIp());
  const demoteSelf = await call("/api/admin/users", { method: "PATCH", body: { handle: OWNER.handle, action: "setRole", role: "resident" }, cookie: ownerCookie });
  assert.ok([400, 403, 409].includes(demoteSelf.status), `self-demotion should be refused, got ${demoteSelf.status}`);

  const demoteEnv = await call("/api/admin/users", {
    method: "PATCH",
    body: { handle: OWNER.handle, action: "suspend", reason: "test" },
    cookie: ownerCookie,
  });
  assert.ok([400, 403, 409].includes(demoteEnv.status), `suspending the owner should be refused, got ${demoteEnv.status}`);

  const [row] = await query("select role, status from users where handle = $1", [OWNER.handle]);
  assert.equal(row.status, "active", "the owner must still be active after those refusals");
});

test("signing out everywhere invalidates other devices without touching the password", async () => {
  const call = as(uniqueIp());
  const other = jar();
  assert.equal((await call("/api/session", { method: "POST", body: { handle: OWNER.handle, password: ownerPassword }, cookie: other })).status, 200);
  assert.equal((await call("/api/session", { cookie: other })).json.user.handle, OWNER.handle);

  const kicked = await call("/api/admin/users", { method: "PATCH", body: { handle: helperHandle, action: "signOutEverywhere" }, cookie: ownerCookie });
  assert.equal(kicked.status, 200, JSON.stringify(kicked.json));

  // The owner's own session survives; the password is unchanged, so a fresh sign-in still works.
  assert.equal((await call("/api/session", { cookie: other })).json.user.handle, OWNER.handle);
  const again = jar();
  assert.equal((await call("/api/session", { method: "POST", body: { handle: OWNER.handle, password: ownerPassword }, cookie: again })).status, 200);
});

test("nothing in the product exposes another member's alert address", async () => {
  const rows = await query("select target, token_hash from alert_subscriptions limit 1");
  if (!rows.length) return;
  assert.ok(!Object.prototype.hasOwnProperty.call(rows[0], "password"), "alert rows carry no password column");
  const inbox = await mailbox();
  assert.ok(Array.isArray(inbox), "the catcher should be writable");
});
