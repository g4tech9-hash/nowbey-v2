/**
 * Mail tests. Every message the app sends goes through one local SMTP catcher
 * (tests/harness/smtp-capture.py over implicit TLS on 4465), so these tests read the real
 * envelope, subject and body the servers hand to SMTP — nothing is mocked.
 *
 * Covers: the sign-up verification email, alert confirmation and verification, the alert that
 * follows a new report, the storm override (free plan, unfiltered), the three-minute cooldown,
 * the stop link, and the alert form's refusal of channels the MVP does not have.
 */
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { api, endDb, jar, mailbox, query, strongPassword, unique, uniqueIp, waitForMail } from "./harness/env.mjs";

const handle = `m_${unique()}`;
const email = `${handle}@example.test`;
let cookie = jar();

/** All calls in one test share one client address, so the app's per-address limits stay intact. */
function as(ip) {
  return (path, opts = {}) => api(path, { ...opts, ip });
}

/**
 * A pin near the given spot, shifted by a few hundred metres so a later run of this suite never
 * lands inside the app's 90-minute/330-metre duplicate window for an earlier run's report.
 */
function near(lat, lng) {
  const token = parseInt(unique(), 36) % 9973;
  return {
    lat: Number((lat + (token / 9973 - 0.5) * 0.012).toFixed(6)),
    lng: Number((lng + (((token * 7919) % 9973) / 9973 - 0.5) * 0.014).toFixed(6)),
  };
}

/** Only mail that arrives after this point in the test file counts. */
async function since() {
  return (await mailbox()).length;
}

function confirmLink(mail) {
  const link = (mail.html.match(/https?:\/\/[^\s"<]+\/api\/alerts\/verify\?token=[A-Za-z0-9_-]+/) ?? [])[0];
  assert.ok(link, `the confirmation email should carry a verify link:\n${mail.text.slice(0, 300)}`);
  return link;
}

/**
 * Fixture reset. Each run creates its own member and its own alert addresses, so repeated runs inside
 * the app's 90-minute duplicate window would otherwise be answered with a previous run's pin instead
 * of filing a new report. Only rows this suite creates are touched: pins authored by "m_" members and
 * alert profiles at example.test. The seeded island data (sandy_roads and friends) is left alone.
 */
async function clearFixtures() {
  await query("delete from incidents where author_handle ~ '^m_'").catch(() => undefined);
  await query("delete from alert_subscriptions where target like '%@example.test'").catch(() => undefined);
}

before(clearFixtures);
after(async () => {
  await clearFixtures();
  await endDb();
});

// One member, so a report they file is never alerted back to them.
test("a new member is sent a verification email", async () => {
  const call = as(uniqueIp());
  const mark = await since();
  const res = await call("/api/session", {
    method: "POST",
    body: { intent: "signup", handle, email, password: strongPassword(), parish: "New Providence" },
    cookie,
  });
  assert.equal(res.status, 200, JSON.stringify(res.json));
  const mail = await waitForMail((m) => m.to?.includes(email) && /confirm|verif/i.test(m.subject ?? ""), { since: mark });
  assert.ok(mail, "sign-up should email a verification link");
  assert.match(mail.html, /\/api\/account\/verify\?token=/, "the email should carry the verify link");
  assert.match(mail.from ?? "", /nowbey\.test/i, "the message should come from MAIL_FROM");
});

test("the alert form takes a Nassau address and mails a confirmation", async () => {
  const call = as(uniqueIp());
  const mark = await since();
  const alertEmail = `a_${unique()}@example.test`;
  const res = await call("/api/alerts", {
    method: "POST",
    body: { channel: "email", target: alertEmail, parishes: ["New Providence"], categories: [] },
  });
  assert.equal(res.status, 201, JSON.stringify(res.json));
  assert.equal(res.json.mail, "sent", "the confirmation must actually leave over SMTP");

  const mail = await waitForMail((m) => m.to?.includes(alertEmail) && /confirm your nowbey alerts/i.test(m.subject ?? ""), { since: mark });
  assert.ok(mail, "a confirmation email should arrive");
  assert.match(mail.text, /New Providence/, "the email should name the island");
  const link = confirmLink(mail);
  const token = new URL(link).searchParams.get("token");

  // Confirmation flips the profile on.
  const verified = await call(`/api/alerts/verify?token=${token}`);
  assert.equal(verified.status, 307, "verify redirects back to the alerts page");
  assert.match(verified.headers.get("location") ?? "", /confirmed=1/);
  const rows = await query("select verified, parishes, categories from alert_subscriptions where target = $1", [alertEmail.toLowerCase()]);
  assert.equal(rows.length, 1);
  assert.equal(rows[0].verified, true);

  // The same address cannot open a second profile on the free plan.
  const again = await call("/api/alerts", {
    method: "POST",
    body: { channel: "email", target: alertEmail, parishes: ["New Providence"] },
  });
  assert.equal(again.status, 402);
});

test("a new report emails the confirmed subscriber an alert", async () => {
  const call = as(uniqueIp());
  const alertEmail = `b_${unique()}@example.test`;
  assert.equal((await call("/api/alerts", { method: "POST", body: { channel: "email", target: alertEmail, parishes: ["New Providence"] } })).status, 201);
  const confirm = await waitForMail((m) => m.to?.includes(alertEmail) && /confirm/i.test(m.subject ?? ""));
  const token = new URL(confirmLink(confirm)).searchParams.get("token");
  await call(`/api/alerts/verify?token=${token}`);

  const mark = await since();
  const report = await call("/api/incidents", {
    method: "POST",
    cookie,
    body: {
      title: `Pothole on East Bay Street ${unique()}`,
      category: "road",
      severity: 3,
      ...near(25.0762, -77.3286),
      parish: "New Providence",
      street: "East Bay Street",
      details: "Deep pothole beside the bus stop, easy to hit after dark.",
    },
  });
  assert.equal(report.status, 201, JSON.stringify(report.json));
  assert.ok(!report.json.duplicate, "this run's pin must count as a new report, not a duplicate");

  const alert = await waitForMail((m) => m.to?.includes(alertEmail) && /blocking|road/i.test(m.subject ?? ""), { since: mark, timeoutMs: 15000 });
  assert.ok(alert, "the subscriber should get an alert about the new report");
  assert.match(alert.html, /\/incident\//, "the alert should link to the report");
  assert.match(alert.text, /East Bay Street/, "the alert should name the street");
  assert.match(alert.html, /Stop these alerts/, "every alert carries the stop link");

  // It also lands on the map feed.
  const feed = await call("/api/incidents?limit=5");
  assert.ok(feed.json.incidents.some((i) => i.id === report.json.incident.id), "the new report should appear in the feed");
});

test("a storm reaches a free subscriber who filtered that category out", async () => {
  const call = as(uniqueIp());
  const alertEmail = `c_${unique()}@example.test`;
  assert.equal(
    (await call("/api/alerts", { method: "POST", body: { channel: "email", target: alertEmail, parishes: ["New Providence"], categories: ["road"] } })).status,
    201,
  );
  const confirm = await waitForMail((m) => m.to?.includes(alertEmail) && /confirm/i.test(m.subject ?? ""));
  await call(`/api/alerts/verify?token=${new URL(confirmLink(confirm)).searchParams.get("token")}`);

  const mark = await since();
  const report = await call("/api/incidents", {
    method: "POST",
    cookie,
    body: {
      title: `Squall line crossing New Providence ${unique()}`,
      category: "storm",
      severity: 3,
      ...near(25.06, -77.345),
      parish: "New Providence",
      details: "Gusts and heavy rain moving west, secure loose items.",
    },
  });
  assert.equal(report.status, 201, JSON.stringify(report.json));
  assert.ok(!report.json.duplicate, "this run's pin must count as a new report, not a duplicate");
  const alert = await waitForMail((m) => m.to?.includes(alertEmail) && /storm|weather/i.test(m.subject ?? ""), { since: mark, timeoutMs: 15000 });
  assert.ok(alert, "a storm must reach the subscriber whatever categories they picked");
});

test("reports rated annoying stay quiet, but a second report inside three minutes is throttled", async () => {
  const call = as(uniqueIp());
  const alertEmail = `d_${unique()}@example.test`;
  assert.equal((await call("/api/alerts", { method: "POST", body: { channel: "email", target: alertEmail, parishes: ["New Providence"] } })).status, 201);
  const confirm = await waitForMail((m) => m.to?.includes(alertEmail) && /confirm/i.test(m.subject ?? ""));
  await call(`/api/alerts/verify?token=${new URL(confirmLink(confirm)).searchParams.get("token")}`);

  // Severity 1 ("annoying") is not worth waking anyone for.
  const markAnnoying = await since();
  const quiet = await call("/api/incidents", {
    method: "POST",
    cookie,
    body: { title: `Flickering street light at the corner ${unique()}`, category: "power", severity: 1, ...near(25.068, -77.35), parish: "New Providence" },
  });
  assert.equal(quiet.status, 201, JSON.stringify(quiet.json));
  assert.ok(!quiet.json.duplicate, "this run's pin must count as a new report, not a duplicate");
  await new Promise((r) => setTimeout(r, 2500));
  const none = await waitForMail((m) => m.to?.includes(alertEmail), { since: markAnnoying, timeoutMs: 1500 });
  assert.equal(none, null, "an annoying report must not be emailed");

  // A real one goes out, and a second one right after it is held back by the cooldown.
  const mark = await since();
  const first = await call("/api/incidents", {
    method: "POST",
    cookie,
    body: { title: `Flooding on Soldier Road ${unique()}`, category: "flood", severity: 3, ...near(25.0555, -77.3155), parish: "New Providence" },
  });
  assert.equal(first.status, 201, JSON.stringify(first.json));
  const alert = await waitForMail((m) => m.to?.includes(alertEmail), { since: mark, timeoutMs: 15000 });
  assert.ok(alert, "the first severe report should be emailed");

  const after1 = await since();
  const second = await call("/api/incidents", {
    method: "POST",
    cookie,
    body: { title: `Two-car crash blocking Fox Hill Road ${unique()}`, category: "accident", severity: 3, ...near(25.0301, -77.3432), parish: "New Providence" },
  });
  assert.equal(second.status, 201, JSON.stringify(second.json));
  await new Promise((r) => setTimeout(r, 2500));
  const held = await waitForMail((m) => m.to?.includes(alertEmail), { since: after1, timeoutMs: 1500 });
  assert.equal(held, null, "the three-minute cooldown should hold the second alert back");
});

test("the stop link in an alert removes the profile", async () => {
  const call = as(uniqueIp());
  const alertEmail = `e_${unique()}@example.test`;
  assert.equal((await call("/api/alerts", { method: "POST", body: { channel: "email", target: alertEmail, parishes: ["New Providence"] } })).status, 201);
  const confirm = await waitForMail((m) => m.to?.includes(alertEmail) && /confirm/i.test(m.subject ?? ""));
  const token = new URL(confirmLink(confirm)).searchParams.get("token");
  await call(`/api/alerts/verify?token=${token}`);

  const stop = await call("/api/alerts", { method: "DELETE", body: { token } });
  assert.equal(stop.status, 200);
  assert.equal(stop.json.ok, true);
  const rows = await query("select id from alert_subscriptions where target = $1", [alertEmail.toLowerCase()]);
  assert.equal(rows.length, 0, "the profile should be gone");
});

test("text alerts are refused with a pointer to what does work", async () => {
  const call = as(uniqueIp());
  const res = await call("/api/alerts", { method: "POST", body: { channel: "sms", target: "+12425551234", parishes: ["New Providence"] } });
  assert.equal(res.status, 400);
  assert.match(res.json.error, /Email is the channel/i);
  assert.match(res.json.error, /Android app/i);
});

test("the alert form will not invent an island", async () => {
  const call = as(uniqueIp());
  const res = await call("/api/alerts", { method: "POST", body: { channel: "email", target: `f_${unique()}@example.test`, parishes: ["Atlantis"] } });
  assert.equal(res.status, 201, "an island it does not know falls back to the launch island");
  const rows = await query("select parishes from alert_subscriptions where target like 'f\\_%@example.test' order by created_at desc limit 1");
  assert.equal(rows[0].parishes, "New Providence");
});
