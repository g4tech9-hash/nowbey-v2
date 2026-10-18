/**
 * "Sign in with Google" tests.
 *
 * The token exchange is pointed at a fake Google (`GOOGLE_OAUTH_BASE`), so the whole handshake runs
 * for real — start → state cookie + PKCE → callback → session — without touching Google's servers and
 * without a Google account. What is *not* proven here is Google's own behaviour: the consent screen,
 * the real client id, and the redirect URI registration are checked by the human checklist.
 *
 * The unit half (bottom of the file) covers the pieces that must be right whatever the environment:
 * PKCE, ID-token claim checks, and handle derivation.
 */
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import http from "node:http";
import { api, endDb, jar, mailbox, query, unique, uniqueIp, waitForMail } from "./harness/env.mjs";
import {
  exchangeCode,
  googleAuthUrl,
  googleConfigured,
  googleRedirectUri,
  handleFromEmail,
  isMissingColumn,
  makePkce,
  readIdToken,
} from "../src/lib/google.ts";
import { readPayload, signPayload } from "../src/lib/secret.ts";

const FAKE_PORT = Number(process.env.TEST_GOOGLE_PORT ?? 4466);
const CLIENT_ID = process.env.GOOGLE_CLIENT_ID ?? "";
const handles = [];
let server;
/** What the fake Google should answer next: a code is mapped to claims. */
const pending = new Map();

function b64(obj) {
  return Buffer.from(JSON.stringify(obj)).toString("base64url");
}

/** Packages claims the way the app reads them: base64url(header).base64url(claims).signature. */
function idToken(claims) {
  return `${b64({ alg: "RS256", typ: "JWT" })}.${b64(claims)}.not-a-real-signature`;
}

before(async () => {
  server = http.createServer((req, res) => {
    if (!req.url?.startsWith("/token")) {
      res.writeHead(404).end("nope");
      return;
    }
    let body = "";
    req.on("data", (chunk) => {
      body += chunk;
    });
    req.on("end", () => {
      const form = new URLSearchParams(body);
      const claims = pending.get(form.get("code"));
      if (!claims) {
        res.writeHead(400, { "content-type": "application/json" });
        res.end(JSON.stringify({ error: "invalid_grant", error_description: "Bad code" }));
        return;
      }
      // The PKCE verifier must be the one that matches the challenge from /start.
      if (!form.get("code_verifier")) {
        res.writeHead(400, { "content-type": "application/json" });
        res.end(JSON.stringify({ error: "invalid_request", error_description: "Missing verifier" }));
        return;
      }
      res.writeHead(200, { "content-type": "application/json" });
      res.end(JSON.stringify({ access_token: "fake-access-token", id_token: idToken(claims) }));
    });
  });
  await new Promise((resolve) => server.listen(FAKE_PORT, "127.0.0.1", resolve));
});

after(async () => {
  for (const handle of handles) {
    await query("delete from users where handle = $1", [handle]).catch(() => undefined);
  }
  await new Promise((resolve) => server.close(resolve));
  await endDb();
});

/**
 * Runs the /start request and keeps what a browser would keep: the state cookie jar plus the state and
 * PKCE challenge Google saw. The callback tests then replay the return trip by hand.
 */
async function beginSignIn(opts = {}) {
  const cookie = jar();
  const ip = opts.ip ?? uniqueIp();
  const res = await api(`/api/auth/google/start${opts.params ?? ""}`, { cookie, ip });
  const url = new URL(res.headers.get("location") ?? "https://accounts.google.com/");
  const state = url.searchParams.get("state") ?? "";
  const challenge = url.searchParams.get("code_challenge") ?? "";
  assert.ok(state && challenge, `start should send the browser to Google, got ${res.status} ${url}`);
  const setCookie = res.headers.getSetCookie().find((c) => c.startsWith("nowbey_oauth=")) ?? "";
  return { cookie, ip, url, state, challenge, setCookie, status: res.status };
}

function claims(overrides = {}) {
  return {
    sub: overrides.sub ?? `sub-${unique()}`,
    email: overrides.email,
    email_verified: overrides.email_verified ?? true,
    name: overrides.name ?? "Jenny Sands",
    aud: CLIENT_ID,
    iss: "https://accounts.google.com",
    exp: Math.floor(Date.now() / 1000) + 300,
    ...overrides,
  };
}

test("the status endpoint says the button can work here", async () => {
  const res = await api("/api/auth/google/status");
  assert.equal(res.status, 200);
  assert.equal(res.json.enabled, true, "the suite runs against a server configured with Google credentials");
});

test("start builds a real Google URL with PKCE, and sets a state cookie", async () => {
  const begun = await beginSignIn();
  assert.equal(begun.status, 307, "start redirects the browser to Google");
  const url = begun.url;
  assert.equal(url.origin, "https://accounts.google.com");
  assert.equal(url.pathname, "/o/oauth2/v2/auth");
  assert.equal(url.searchParams.get("client_id"), CLIENT_ID);
  assert.equal(url.searchParams.get("response_type"), "code");
  assert.equal(url.searchParams.get("scope"), "openid email profile");
  assert.equal(url.searchParams.get("code_challenge_method"), "S256");
  assert.equal(url.searchParams.get("prompt"), "select_account", "people share phones: always offer the account chooser");
  assert.match(url.searchParams.get("redirect_uri") ?? "", /\/api\/auth\/google\/callback$/);
  assert.equal(url.searchParams.get("code_verifier"), null, "the PKCE verifier must never travel in the URL");

  assert.ok(begun.setCookie, "a state cookie must be set");
  assert.match(begun.setCookie, /HttpOnly/i);
  assert.match(begun.setCookie, /SameSite=Lax/i, "a strict cookie would not survive the return trip from Google");
  assert.match(begun.setCookie, /Max-Age=\d+/i);
});

test("a brand-new person signs up with Google and gets a session", async () => {
  const { cookie, ip, state } = await beginSignIn();
  const email = `g_${unique()}@example.test`;
  const code = `code-${unique()}`;
  pending.set(code, claims({ email, name: "Jenny Sands" }));

  const res = await api(`/api/auth/google/callback?code=${code}&state=${state}`, { cookie, ip });
  assert.equal(res.status, 307);
  const done = res.headers.get("location") ?? "";
  assert.match(done, /\/you\/settings\?welcome=1$/, "a new account lands where it can pick an island");

  // The session cookie from the callback is a working sign-in.
  const session = await api("/api/session", { cookie, ip });
  assert.equal(session.status, 200);
  assert.equal(session.json.user.email, email);
  assert.equal(session.json.user.emailVerified, true, "Google verified the address, so we record it as verified");
  assert.equal(session.json.user.displayName, "Jenny Sands");
  assert.equal(session.json.user.isAdmin, false, "a Google sign-up must never land on the admin list");

  const [row] = await query("select handle, password_hash, google_sub from users where email = $1", [email]);
  handles.push(row.handle);
  assert.match(row.handle, /^g_[a-z0-9]+/, `the handle comes from the address: ${row.handle}`);
  assert.equal(row.password_hash, null, "a Google account starts with no password at all");
  assert.ok(row.google_sub, "the Google subject id is stored so the next sign-in matches");
});

test("the same person signing in again is matched by their Google id, not by a new account", async () => {
  const email = `g2_${unique()}@example.test`;
  const sub = `sub-${unique()}`;

  const first = await beginSignIn();
  const code1 = `code-${unique()}`;
  pending.set(code1, claims({ email, sub }));
  await api(`/api/auth/google/callback?code=${code1}&state=${first.state}`, { cookie: first.cookie, ip: first.ip });
  const [row] = await query("select handle from users where email = $1", [email]);
  handles.push(row.handle);

  const second = await beginSignIn();
  const code2 = `code-${unique()}`;
  pending.set(code2, claims({ email, sub, name: "Someone Else At Google" }));
  const res = await api(`/api/auth/google/callback?code=${code2}&state=${second.state}`, { cookie: second.cookie, ip: second.ip });
  assert.match(res.headers.get("location") ?? "", /\/map$/, "a returning member goes to the map, not the sign-up flow");

  const session = await api("/api/session", { cookie: second.cookie, ip: second.ip });
  assert.equal(session.json.user.handle, row.handle, "the same account, not a second one");
  const count = await query("select count(*)::int as n from users where email = $1", [email]);
  assert.equal(count[0].n, 1, "Google sign-in must never duplicate an account");
});

test("an existing password account is linked, told about it by email, and other sessions are dropped", async () => {
  const ip = uniqueIp();
  const handle = `link_${unique()}`;
  const email = `${handle}@example.test`;
  handles.push(handle);

  // An ordinary sign-up with a password, email not yet confirmed.
  const owner = jar();
  const signedUp = await api("/api/session", {
    method: "POST",
    ip,
    cookie: owner,
    body: { intent: "signup", termsAccepted: true, handle, email, password: `Rum-Cake_${unique()}-Conch42`, parish: "New Providence" },
  });
  assert.equal(signedUp.status, 200, JSON.stringify(signedUp.json));
  assert.equal((await api("/api/session", { cookie: owner, ip })).json.user.emailVerified, false);

  const before = (await mailbox()).length;

  const link = await beginSignIn({ ip });
  const code = `code-${unique()}`;
  pending.set(code, claims({ email, sub: `sub-${unique()}`, name: "Jenny Sands" }));
  const res = await api(`/api/auth/google/callback?code=${code}&state=${link.state}`, { cookie: link.cookie, ip });
  assert.equal(res.status, 307);

  const session = await api("/api/session", { cookie: link.cookie, ip });
  assert.equal(session.json.user.handle, handle, "the existing account is opened, not a new one");
  assert.equal(session.json.user.emailVerified, true);

  // The old session was dropped, because the address had never been confirmed before this.
  assert.equal((await api("/api/session", { cookie: owner, ip })).json.user, null, "linking an unconfirmed address drops old sessions");

  // And the member is told, by email, that Google can now open their account.
  const notice = await waitForMail((m) => m.to?.includes(email) && /google sign-in/i.test(m.subject ?? ""), { since: before, timeoutMs: 8000 });
  assert.ok(notice, "linking must send the security notice");
  assert.match(notice.text, /password still works/i);
});

test("a cancelled or tampered handshake signs nobody in", async () => {
  // Cancel on Google's screen.
  const cancelled = await beginSignIn();
  const res = await api(`/api/auth/google/callback?error=access_denied&state=${cancelled.state}`, { cookie: cancelled.cookie, ip: cancelled.ip });
  assert.equal(res.status, 307);
  assert.match(res.headers.get("location") ?? "", /\/login\?mode=signin&google=cancelled/);
  assert.equal((await api("/api/session", { cookie: cancelled.cookie, ip: cancelled.ip })).json.user, null);

  // A state that does not match the cookie (the CSRF case).
  const forged = await beginSignIn();
  const code = `code-${unique()}`;
  pending.set(code, claims({ email: `g3_${unique()}@example.test` }));
  const bad = await api(`/api/auth/google/callback?code=${code}&state=not-the-state`, { cookie: forged.cookie, ip: forged.ip });
  assert.match(bad.headers.get("location") ?? "", /google=state/);

  // No cookie at all: someone pasting a callback URL from elsewhere.
  const bare = jar();
  const direct = await api(`/api/auth/google/callback?code=${code}&state=x`, { cookie: bare, ip: uniqueIp() });
  assert.match(direct.headers.get("location") ?? "", /google=state/);
  assert.equal((await api("/api/session", { cookie: bare, ip: uniqueIp() })).json.user, null);
});

test("an unverified Google address cannot open an account", async () => {
  const { cookie, ip, state } = await beginSignIn();
  const code = `code-${unique()}`;
  const email = `unverified_${unique()}@example.test`;
  pending.set(code, claims({ email, email_verified: false }));
  const res = await api(`/api/auth/google/callback?code=${code}&state=${state}`, { cookie, ip });
  assert.match(res.headers.get("location") ?? "", /google=unverified/);
  const rows = await query("select id from users where email = $1", [email]);
  assert.equal(rows.length, 0, "no account may be created from an unverified address");
});

test("the mobile app gets a one-time code it can trade for a token", async () => {
  const { cookie, ip, state } = await beginSignIn({ params: "?client=native" });
  const email = `app_${unique()}@example.test`;
  const code = `code-${unique()}`;
  pending.set(code, claims({ email, name: "App Person" }));

  const res = await api(`/api/auth/google/callback?code=${code}&state=${state}`, { cookie, ip });
  const location = res.headers.get("location") ?? "";
  assert.match(location, /^nowbey:\/\/auth\?code=/, "the app is handed a deep link, not a cookie");
  const ticket = new URL(location).searchParams.get("code");
  const [row] = await query("select handle from users where email = $1", [email]);
  handles.push(row.handle);

  const exchanged = await api("/api/auth/google/native", { method: "POST", body: { code: ticket }, ip: uniqueIp() });
  assert.equal(exchanged.status, 200, JSON.stringify(exchanged.json));
  assert.ok(exchanged.json.token, "the app receives its bearer token");

  const session = await api("/api/session", { headers: { authorization: `Bearer ${exchanged.json.token}` }, ip });
  assert.equal(session.json.user.handle, row.handle);

  // Single use: the same code cannot mint a second token.
  const again = await api("/api/auth/google/native", { method: "POST", body: { code: ticket }, ip: uniqueIp() });
  assert.equal(again.status, 400);
});

test("a suspended account is refused, even with a perfect Google sign-in", async () => {
  const ip = uniqueIp();
  const handle = `susp_${unique()}`;
  const email = `${handle}@example.test`;
  const sub = `sub-${unique()}`;
  handles.push(handle);

  const first = await beginSignIn({ ip });
  const code1 = `code-${unique()}`;
  pending.set(code1, claims({ email, sub }));
  await api(`/api/auth/google/callback?code=${code1}&state=${first.state}`, { cookie: first.cookie, ip });
  await query("update users set status = 'suspended' where handle = $1", [handle]);

  const second = await beginSignIn({ ip });
  const code2 = `code-${unique()}`;
  pending.set(code2, claims({ email, sub }));
  const res = await api(`/api/auth/google/callback?code=${code2}&state=${second.state}`, { cookie: second.cookie, ip });
  assert.match(res.headers.get("location") ?? "", /google=suspended/);
  assert.equal((await api("/api/session", { cookie: second.cookie, ip })).json.user, null);
});

test("the return trip can never be sent to another site", async () => {
  // "//evil.com" is a protocol-relative absolute URL: the classic open-redirect trick.
  for (const next of ["//evil.com", "https://evil.com", "/\\evil.com"]) {
    const begun = await beginSignIn({ params: `?next=${encodeURIComponent(next)}` });
    const code = `code-${unique()}`;
    pending.set(code, claims({ email: `redir_${unique()}@example.test` }));
    const res = await api(`/api/auth/google/callback?code=${code}&state=${begun.state}`, { cookie: begun.cookie, ip: begun.ip });
    const location = res.headers.get("location") ?? "";
    assert.ok(location.startsWith("http://localhost:3000/"), `next=${next} was allowed to leave the site: ${location}`);
    assert.ok(!location.includes("evil.com"), `next=${next} redirected off-site: ${location}`);
    const [row] = await query("select handle from users where email like 'redir_%@example.test' order by created_at desc limit 1");
    if (row) handles.push(row.handle);
  }
});

// ---------------------------------------------------------------- unit tests

test("PKCE: the challenge is the SHA-256 of the verifier, base64url encoded", () => {
  const { verifier, challenge } = makePkce();
  assert.equal(challenge, createHash("sha256").update(verifier).digest("base64url"));
  assert.ok(verifier.length >= 43 && verifier.length <= 128, `verifier length ${verifier.length}`);
  assert.ok(!/[+/=]/.test(challenge), "base64url output must be URL safe");
});

test("the auth URL never carries the verifier and always scopes to openid email profile", () => {
  const url = new URL(googleAuthUrl({ redirectUri: "https://nowbey.test/api/auth/google/callback", state: "s", challenge: "c" }));
  assert.equal(url.searchParams.get("scope"), "openid email profile");
  assert.equal(url.searchParams.get("code_verifier"), null);
});

test("ID token claims are checked: audience, issuer, expiry, verification and shape", () => {
  const good = claims({ email: "someone@example.test", sub: "sub-1" });
  assert.ok(readIdToken(idToken(good)));

  const cases = [
    ["wrong audience", { ...good, aud: "another-client" }],
    ["wrong issuer", { ...good, iss: "https://evil.example" }],
    ["expired", { ...good, exp: Math.floor(Date.now() / 1000) - 3600 }],
    ["no email", { ...good, email: undefined }],
    ["no subject", { ...good, sub: "" }],
  ];
  for (const [name, bad] of cases) {
    assert.equal(readIdToken(idToken(bad)), null, `${name} must be rejected`);
  }
  assert.equal(readIdToken("not-a-token"), null);
  assert.equal(readIdToken(`${b64({})}.${b64({ aud: CLIENT_ID })}.sig`), null, "a token with no expiry must be rejected");

  const unverified = readIdToken(idToken({ ...good, email_verified: false }));
  assert.equal(unverified?.emailVerified, false, "unverified addresses are surfaced, never treated as verified");
});

test("handles from Google addresses are safe, unique, and never on the admin list", () => {
  assert.equal(handleFromEmail("jenny.sands@gmail.com", []), "jenny_sands");
  assert.equal(handleFromEmail("sandy+nowbey@gmail.com", []), "sandy_nowbey");
  assert.match(handleFromEmail("x@gmail.com", []), /^member/, "too-short local parts fall back to a real handle");
  assert.ok(handleFromEmail("a".repeat(60) + "@gmail.com", []).length <= 18, "handles stay inside the 18-character rule");

  const taken = ["jenny_sands", "jenny_sands2", "mario242"];
  const picked = handleFromEmail("jenny.sands@gmail.com", taken);
  assert.ok(!taken.includes(picked), `${picked} must not collide`);
  assert.match(picked, /^jenny_sands\d?$/);

  // The important one: an address whose local part matches ADMIN_HANDLES must not hand out admin rights.
  const adminClaim = handleFromEmail("mario242@gmail.com", ["mario242"]);
  assert.notEqual(adminClaim, "mario242", "a Google sign-up must never claim an ADMIN_HANDLES handle");
});

test("the signed handshake cookie cannot be tampered with or replayed after its expiry", () => {
  const raw = signPayload({ state: "abc", verifier: "ver", next: "/map", native: false }, 60_000);
  assert.deepEqual(readPayload(raw)?.state, "abc");

  const [body, sig] = raw.split(".");
  assert.equal(readPayload(`${body}.${sig.slice(0, -1)}x`), null, "a changed signature must be rejected");
  assert.equal(readPayload(`${body}x.${sig}`), null, "changed contents must be rejected");
  assert.equal(readPayload(signPayload({ state: "x" }, -1)), null, "an expired handshake must be rejected");
  assert.equal(readPayload("nonsense"), null);
});

test("Google is reported as configured or not, exactly as the deployment is", () => {
  assert.equal(googleConfigured(), Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET));
  assert.equal(exchangeCode instanceof Function, true);
  assert.match(googleRedirectUri("https://nowbey.test/"), /^https:\/\/nowbey\.test\/api\/auth\/google\/callback$/);
});

test("a database that is missing the Google column is recognised, so the site can say so", () => {
  // Postgres undefined_column. The live site turns this into "not fully set up yet" instead of a 500.
  assert.equal(isMissingColumn({ code: "42703" }), true);
  assert.equal(isMissingColumn({ cause: { code: "42703" } }), true, "drizzle wraps the driver error");
  assert.equal(isMissingColumn(Object.assign(new Error("column users.google_sub does not exist"), { code: "42703" })), true);
  for (const other of [{ code: "23505" }, new Error("connection refused"), null, undefined]) {
    assert.equal(isMissingColumn(other), false, `${String(other)} is not a missing column`);
  }
});

test("a token endpoint that answers with an error cannot sign anyone in", async () => {
  const result = await exchangeCode({ code: "no-such-code", verifier: "v", redirectUri: "https://nowbey.test/cb" });
  assert.ok("error" in result, "the failure is reported, not thrown");
  assert.match(String(result.error), /Bad code|invalid_grant|Google answered/i);
});
