/**
 * Deleting an account you cannot type a password for.
 *
 * C1 in the panel audit: every account opened with Google had `password_hash = NULL`, the delete dialog
 * demanded a password, the check always failed, and six tries tripped the rate limiter. The account could
 * never be deleted from inside the product — an App Store 5.1.1(v) failure.
 *
 * This suite makes a passwordless account the way Google does (a row with a google_sub and no password
 * hash), then proves the whole emailed-link path: the link is required, it is single-use, and the deletion
 * really removes the row.
 */
import { test, after } from "node:test";
import assert from "node:assert/strict";
import { api, endDb, jar, mailbox, query, strongPassword, unique, waitForMail } from "./harness/env.mjs";

after(async () => {
  await endDb();
});

/** Signs up a normal account, then strips its password to make it a Google-shaped one. */
async function passwordlessAccount() {
  const handle = `g_${unique()}`;
  const email = `${handle}@example.test`;
  const cookie = jar();
  const created = await api("/api/session", {
    method: "POST",
    body: { intent: "signup", termsAccepted: true, handle, email, password: strongPassword(), parish: "New Providence" },
    cookie,
  });
  assert.equal(created.status, 200, JSON.stringify(created.json));
  await query("update users set password_hash = null, google_sub = $2, email_verified_at = now() where handle = $1", [handle, `sub-${unique()}`]);
  return { handle, email, cookie };
}

/** Pulls the one deletion token out of a captured email. */
function tokenFrom(mail) {
  const link = (mail.html.match(/https?:\/\/[^\s"<]+\/you\/settings\?delete=[A-Za-z0-9_-]+/) ?? [])[0];
  assert.ok(link, `the email should carry a deletion link:\n${mail.text.slice(0, 300)}`);
  return new URL(link).searchParams.get("delete");
}

test("an account with no password is told so, instead of being called a wrong password", async () => {
  const { handle, cookie } = await passwordlessAccount();
  const me = await api("/api/session", { cookie });
  assert.equal(me.json.user.hasPassword, false, "the client needs to know which door to offer");

  const attempt = await api("/api/session", { method: "POST", body: { handle, password: "anything-goes-here" } });
  assert.equal(attempt.status, 401);
  assert.match(attempt.json.error, /Google/i, "the message names the sign-in that actually works");
  assert.doesNotMatch(attempt.json.error, /password is not right/i);
});

test("deleting with no password needs a one-time emailed link, and the link works once", async () => {
  const { handle, email, cookie } = await passwordlessAccount();

  // Without the token, the API refuses in words that point at the right control.
  const noProof = await api("/api/account", { method: "DELETE", cookie, body: { password: "" } });
  assert.equal(noProof.status, 400);
  assert.match(noProof.json.error, /confirmation link/i);

  // Ask for the link and catch the mail.
  const since = (await mailbox()).length;
  const asked = await api("/api/account/deletion-link", { method: "POST", cookie });
  assert.equal(asked.status, 200, JSON.stringify(asked.json));
  const mail = await waitForMail((m) => m.to?.includes(email) && /delet/i.test(m.subject ?? ""), { since });
  assert.ok(mail, "a deletion email should reach the local SMTP catcher");
  const token = tokenFrom(mail);

  // The link itself must not delete anything — a scanner or a preview must be harmless. Only the DELETE
  // call, from a signed-in session, spends the token.
  const [stillThere] = await query("select count(*)::int as n from users where handle = $1", [handle]);
  assert.equal(stillThere.n, 1, "opening the link leaves the account alone");

  const done = await api("/api/account", { method: "DELETE", cookie, body: { token } });
  assert.equal(done.status, 200, JSON.stringify(done.json));

  const [gone] = await query("select count(*)::int as n from users where handle = $1", [handle]);
  assert.equal(gone.n, 0, "the account row is gone, so the address can be used again");

  // Replaying the same token from another session is refused.
  const another = jar();
  const replay = await api("/api/account", { method: "DELETE", cookie: another, body: { token } });
  assert.equal(replay.status, 401, "a spent token is not a skeleton key; without a session it is just a 401");
});
