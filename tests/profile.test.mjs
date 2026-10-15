/**
 * Member profile tests: the settings a member controls, what a private profile hides, hiding a report
 * from a listing without touching the report, and the two things only staff can do — write a note and
 * grant the verified badge.
 *
 * These run against the real Next.js routes and a real Postgres, like the other local suites. Nothing
 * here touches production. Reports are filed through the product's own route, so the fixtures are the
 * same shape a member would create.
 */
import { test, after } from "node:test";
import assert from "node:assert/strict";
import { api, endDb, jar, query, strongPassword, unique, uniqueIp } from "./harness/env.mjs";

const memberHandle = `p_${unique()}`;
const otherHandle = `q_${unique()}`;
const memberEmail = `${memberHandle}@example.test`;

function as(ip) {
  return (path, opts = {}) => api(path, { ...opts, ip });
}

/** Somewhere in New Providence, jittered so two runs never collide in the duplicate window. */
function near(lat, lng) {
  const token = parseInt(unique(), 36) % 9973;
  return {
    lat: Number((lat + (token / 9973 - 0.5) * 0.012).toFixed(6)),
    lng: Number((lng + (((token * 7919) % 9973) / 9973 - 0.5) * 0.014).toFixed(6)),
  };
}

const memberCookie = jar();
let memberId = "";
let adminCookie = jar();

after(async () => {
  await endDb();
});

test("the new profile tables exist and start empty for a fresh member", async () => {
  const call = as(uniqueIp());
  const signup = await call("/api/session", {
    method: "POST",
    body: { intent: "signup", handle: memberHandle, email: memberEmail, password: strongPassword(), parish: "New Providence" },
    cookie: memberCookie,
  });
  assert.equal(signup.status, 200, JSON.stringify(signup.json));

  const [u] = await query("select id from users where handle = $1", [memberHandle]);
  assert.ok(u?.id, "the account should exist");
  memberId = u.id;

  const rows = await query("select count(*)::int as n from member_profiles where user_id = $1", [memberId]);
  assert.equal(rows[0].n, 0, "no settings row until the member saves something — a missing row means the defaults");

  // A brand-new member is open by default: their profile page answers rather than 404ing.
  const page = await call(`/u/${memberHandle}`);
  assert.equal(page.status, 200);
  assert.match(page.text, new RegExp(`@${memberHandle}`), "the page names the member");
  assert.doesNotMatch(page.text, /keeps their profile private/, "the default is open, not private");
});

test("a member's own profile page opens and shows what will be public", async () => {
  const call = as(uniqueIp());
  const page = await call("/you/profile", { cookie: memberCookie });
  assert.equal(page.status, 200, "the signed-in member should see their own profile page");
  assert.match(page.text, /Your profile/);
  assert.match(page.text, /Who can see your profile/);
  assert.match(page.text, /No badges yet/);

  // Signed out, the same page sends the visitor to sign in rather than rendering anything.
  const anon = await call("/you/profile");
  assert.equal(anon.status, 307, "signed-out visitors are redirected");
  assert.match(anon.headers.get("location") ?? "", /\/login\?mode=signin&next=\/you\/profile/);
});

test("settings are saved, and the public page reflects them", async () => {
  const call = as(uniqueIp());
  const bio = `Watches the harbour road. ${unique()}`;
  const saved = await call("/api/account/profile", {
    method: "PATCH",
    cookie: memberCookie,
    body: { visibility: "open", bio, showAlertSummary: true },
  });
  assert.equal(saved.status, 200, JSON.stringify(saved.json));

  const [row] = await query("select visibility, bio, show_alert_summary from member_profiles where user_id = $1", [memberId]);
  assert.deepEqual(row, { visibility: "open", bio, show_alert_summary: true });

  const page = await call(`/u/${memberHandle}`);
  assert.match(page.text, new RegExp(bio.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")), "the bio should be public");

  // Nothing in the response may carry the member's email or their alert categories — the switch only
  // ever promises a count of islands.
  assert.doesNotMatch(page.text, new RegExp(memberEmail), "the profile must never print the email address");

  // A second save is an update, not a second row.
  await call("/api/account/profile", { method: "PATCH", cookie: memberCookie, body: { visibility: "open", bio: "", showAlertSummary: false } });
  const rows = await query("select count(*)::int as n, min(bio) as bio from member_profiles where user_id = $1", [memberId]);
  assert.equal(rows[0].n, 1, "one row per member");
  assert.equal(rows[0].bio, null, "an emptied bio is stored as NULL, not an empty string");
});

test("input the route should refuse: junk visibility, a runaway bio, a foreign origin", async () => {
  const call = as(uniqueIp());
  const junk = await call("/api/account/profile", { method: "PATCH", cookie: memberCookie, body: { visibility: "everyone", bio: "hi" } });
  assert.equal(junk.status, 400, "visibility must be open or private");

  const long = "x".repeat(400);
  await call("/api/account/profile", { method: "PATCH", cookie: memberCookie, body: { visibility: "open", bio: long, showAlertSummary: false } });
  const [row] = await query("select length(bio) as len from member_profiles where user_id = $1", [memberId]);
  assert.equal(row.len, 200, "the bio is cut to 200 characters");

  const foreign = await call("/api/account/profile", {
    method: "PATCH",
    cookie: memberCookie,
    origin: "https://evil.example",
    body: { visibility: "open", bio: "nope", showAlertSummary: false },
  });
  assert.equal(foreign.status, 403, "a cross-site origin cannot change a profile");

  const signedOut = await call("/api/account/profile", { method: "PATCH", body: { visibility: "open", bio: "nope" } });
  assert.equal(signedOut.status, 401);
});

test("filing two reports, then hiding one from the profile only", async () => {
  const call = as(uniqueIp());
  const filed = [];
  const titles = [];
  // Well apart from each other, and spread over a wide corner of New Providence so a report filed by
  // an earlier run is never within the 180 m that the product treats as the same event.
  const seed = parseInt(unique(), 36);
  const rand = (n) => ((seed * (n + 1) * 2654435761) % 100000) / 100000;
  const spots = [
    { lat: 25.035 + rand(1) * 0.02, lng: -77.48 + rand(2) * 0.13, street: "South Sound" },
    { lat: 25.075 + rand(3) * 0.02, lng: -77.48 + rand(4) * 0.13, street: "North Shore" },
  ];
  for (const n of [1, 2]) {
    const spot = spots[n - 1];
    const title = `Profile test report ${n} ${unique()}`;
    titles.push(title);
    const res = await call("/api/incidents", {
      method: "POST",
      cookie: memberCookie,
      body: {
        title,
        category: "road",
        severity: 3,
        ...near(spot.lat, spot.lng),
        parish: "New Providence",
        street: spot.street,
        details: "Filed by the profile test suite.",
      },
    });
    assert.equal(res.status, 201, JSON.stringify(res.json));
    assert.ok(res.json.incident?.id, "the report should come back with an id");
    filed.push(res.json.incident.id);
  }

  const before = await call(`/u/${memberHandle}`);
  assert.match(before.text, new RegExp(titles[0]), "both reports are listed to begin with");
  assert.match(before.text, new RegExp(titles[1]));

  const hide = await call("/api/account/profile/hidden", { method: "POST", cookie: memberCookie, body: { incidentId: filed[0] } });
  assert.equal(hide.status, 200, JSON.stringify(hide.json));

  const afterHide = await call(`/u/${memberHandle}`);
  assert.doesNotMatch(afterHide.text, new RegExp(titles[0]), "the hidden report leaves the listing");
  assert.match(afterHide.text, new RegExp(titles[1]), "the other one stays");

  // Hiding is a listing change and nothing else: the report is still on the map feed, and the record
  // (the count at the top of the profile) still includes it.
  const feed = await call("/api/incidents?limit=50");
  assert.ok(feed.json.incidents.some((i) => i.id === filed[0]), "a hidden report stays on the map");
  const [mine] = await query("select count(*)::int as n from incidents where user_id = $1 and status <> 'archived' and anonymous = false", [memberId]);
  assert.ok(mine.n >= 2, "the record still counts every report the member filed");

  // Doing it twice is not an error, and putting it back restores the listing.
  assert.equal((await call("/api/account/profile/hidden", { method: "POST", cookie: memberCookie, body: { incidentId: filed[0] } })).status, 200);
  assert.equal((await call("/api/account/profile/hidden", { method: "DELETE", cookie: memberCookie, body: { incidentId: filed[0] } })).status, 200);
  const restored = await call(`/u/${memberHandle}`);
  assert.match(restored.text, new RegExp(titles[0]), "unhiding puts it back");
  const [left] = await query("select count(*)::int as n from hidden_profile_reports where user_id = $1 and incident_id = $2", [memberId, filed[0]]);
  assert.equal(left.n, 0, "unhiding removes the row");
});

test("a member cannot hide someone else's report, and anonymous reports are never listed", async () => {
  const call = as(uniqueIp());
  const stranger = jar();
  const signedUp = await call("/api/session", {
    method: "POST",
    body: { intent: "signup", handle: otherHandle, email: `${otherHandle}@example.test`, password: strongPassword(), parish: "New Providence" },
    cookie: stranger,
  });
  assert.equal(signedUp.status, 200, JSON.stringify(signedUp.json));

  const [{ id: mine, title: mineTitle }] = await query("select id, title from incidents where user_id = $1 order by created_at desc limit 1", [memberId]);

  const attempt = await call("/api/account/profile/hidden", { method: "POST", cookie: stranger, body: { incidentId: mine } });
  assert.equal(attempt.status, 403, "only the author can hide a report");
  const [notHidden] = await query("select count(*)::int as n from hidden_profile_reports where incident_id = $1", [mine]);
  assert.equal(notHidden.n, 0, "and nothing was written anyway");

  const junk = await call("/api/account/profile/hidden", { method: "POST", cookie: memberCookie, body: { incidentId: "not-a-uuid" } });
  assert.equal(junk.status, 400, "an id that is not an id is refused before it reaches the database");

  // An anonymous report is never listed by name — for its own author either, which is what keeps the
  // anonymous flag honest.
  const anonTitle = `Anonymous test report ${unique()}`;
  const anon = await call("/api/incidents", {
    method: "POST",
    cookie: memberCookie,
    body: {
      title: anonTitle,
      category: "road",
      severity: 3,
      anonymous: true,
      ...near(25.0762, -77.3286),
      parish: "New Providence",
      street: "Quiet Lane",
      details: "Filed anonymously by the profile test suite.",
    },
  });
  assert.equal(anon.status, 201, JSON.stringify(anon.json));

  // Filed anonymously, the report is not tied to the account at all — so it is absent from the
  // author's own management list as well as the public profile. That is the promise, not a bug.
  const own = await call("/you/profile", { cookie: memberCookie });
  assert.doesNotMatch(own.text, new RegExp(anonTitle), "an anonymous report is not listed for its author either");
  assert.doesNotMatch((await call(`/u/${memberHandle}`)).text, new RegExp(anonTitle), "and never on the public profile");

  // The other case: a report that does keep its author and is later marked anonymous (a staff
  // decision, so flipped here in the database). The author may see it, flagged, with nothing to hide —
  // and no member can ever list it by name.
  await query("update incidents set anonymous = true where id = $1", [mine]);
  const ownFlagged = await call("/you/profile", { cookie: memberCookie });
  assert.match(ownFlagged.text, new RegExp(mineTitle), "a flagged report stays visible to its author");
  assert.match(ownFlagged.text, /Anonymous reports are never listed on a profile/, "clearly marked as unlistable");
  const publicAfter = await call(`/u/${memberHandle}`);
  assert.doesNotMatch(publicAfter.text, new RegExp(mineTitle), "and the public profile still refuses to name it");
  assert.ok((await call("/api/incidents?limit=50")).json.incidents.some((i) => i.id === mine), "an anonymous report is still on the map");
});

test("going private hides everything but the handle, and the owner can still see it", async () => {
  const call = as(uniqueIp());
  const bio = `Private bio ${unique()}`;
  await call("/api/account/profile", { method: "PATCH", cookie: memberCookie, body: { visibility: "private", bio, showAlertSummary: false } });

  const visitor = await call(`/u/${memberHandle}`);
  assert.equal(visitor.status, 200, "the page answers — a private profile is not a 404");
  assert.match(visitor.text, /keeps their profile private/);
  assert.doesNotMatch(visitor.text, new RegExp(bio), "a private profile shows no bio");
  assert.doesNotMatch(visitor.text, /Reports/, "and no report listing");

  const owner = await call(`/u/${memberHandle}`, { cookie: memberCookie });
  assert.match(owner.text, new RegExp(bio), "the owner still sees their own profile");
  assert.match(owner.text, /You are seeing it because you are/);

  // Back to open so the badge test below reads a normal profile.
  await call("/api/account/profile", { method: "PATCH", cookie: memberCookie, body: { visibility: "open", bio: "", showAlertSummary: false } });
});

test("a member cannot use the staff door, and staff can grant then revoke the verified badge", async () => {
  const call = as(uniqueIp());

  const asMember = await call("/api/admin/users", { method: "PATCH", cookie: memberCookie, body: { handle: memberHandle, action: "grantBadge", badge: "verified", reason: "checking myself" } });
  assert.equal(asMember.status, 403, "a plain member cannot grant badges");
  assert.equal((await call("/api/admin/users", { method: "PATCH", cookie: memberCookie, body: { handle: memberHandle, action: "note", body: "hello" } })).status, 403);

  // Promote this run's member through the database rather than by guessing anybody's password — the
  // product's own gate reads `users.role`, so this exercises the real route.
  await query("update users set role = 'admin' where id = $1", [memberId]);
  adminCookie = memberCookie;

  const unsigned = await call("/api/admin/users", { method: "PATCH", cookie: adminCookie, body: { handle: memberHandle, action: "grantBadge" } });
  assert.equal(unsigned.status, 400, "a badge without a reason is refused — a verification needs a reason");

  const granted = await call("/api/admin/users", {
    method: "PATCH",
    cookie: adminCookie,
    body: { handle: memberHandle, action: "grantBadge", badge: "verified", reason: "Met them at the East End clean-up; reports check out." },
  });
  assert.equal(granted.status, 200, JSON.stringify(granted.json));

  const [grant] = await query("select id, badge, reason, granted_by from badge_grants where user_id = $1", [memberId]);
  assert.equal(grant.badge, "verified");
  assert.equal(grant.granted_by, memberHandle, "the grant records who handed it out");

  // It shows on the profile, and on the member's own page.
  const publicPage = await call(`/u/${memberHandle}`);
  assert.match(publicPage.text, /Verified reporter/, "the badge appears on the profile");
  const ownPage = await call("/you/profile", { cookie: memberCookie });
  assert.match(ownPage.text, /granted .* by @/, "the owner sees who granted it and when");
  assert.match(ownPage.text, /East End clean-up/, "and the reason that was recorded");

  // Granting again replaces the live grant instead of stacking a second one.
  await call("/api/admin/users", { method: "PATCH", cookie: adminCookie, body: { handle: memberHandle, action: "grantBadge", badge: "verified", reason: "Second check, same person." } });
  const [counts] = await query("select count(*)::int as total, count(*) filter (where revoked_at is null)::int as live from badge_grants where user_id = $1", [memberId]);
  assert.equal(counts.total, 2, "the first grant is kept in the record");
  assert.equal(counts.live, 1, "only one badge is live at a time");

  const [live] = await query("select id from badge_grants where user_id = $1 and revoked_at is null", [memberId]);
  const revoked = await call("/api/admin/users", { method: "PATCH", cookie: adminCookie, body: { handle: memberHandle, action: "revokeBadge", id: live.id } });
  assert.equal(revoked.status, 200, JSON.stringify(revoked.json));
  const afterRevoke = await call(`/u/${memberHandle}`);
  assert.doesNotMatch(afterRevoke.text, /Verified reporter/, "a revoked badge disappears straight away");
  const [kept] = await query("select count(*)::int as n from badge_grants where user_id = $1", [memberId]);
  assert.equal(kept.n, 2, "revoking keeps the rows — the record of what was granted survives");
});

test("staff notes are append-only, admin-only and never shown to the member", async () => {
  const call = as(uniqueIp());
  const note = `Called about the duplicate reports. ${unique()}`;
  const saved = await call("/api/admin/users", { method: "PATCH", cookie: adminCookie, body: { handle: memberHandle, action: "note", body: note } });
  assert.equal(saved.status, 200, JSON.stringify(saved.json));

  const [row] = await query("select body, author_handle from member_notes where user_id = $1", [memberId]);
  assert.equal(row.body, note);
  assert.equal(row.author_handle, memberHandle);

  // It is on the staff page for this member…
  const staffPage = await call(`/admin/users/${memberHandle}`, { cookie: adminCookie });
  assert.equal(staffPage.status, 200);
  assert.match(staffPage.text, new RegExp(note.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")), "staff see the note");

  // …and nowhere on any page the member can open.
  const own = await call("/you/profile", { cookie: memberCookie });
  assert.doesNotMatch(own.text, new RegExp(note.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")), "the member never sees a staff note");
  const publicPage = await call(`/u/${memberHandle}`);
  assert.doesNotMatch(publicPage.text, /Called about the duplicate reports/);

  // An empty note is refused, and the activity log carries both the note and the badge work.
  assert.equal((await call("/api/admin/users", { method: "PATCH", cookie: adminCookie, body: { handle: memberHandle, action: "note", body: " " } })).status, 400);
  const [actions] = await query(
    "select count(*) filter (where action = 'member.note')::int as notes, count(*) filter (where action = 'badge.grant')::int as grants, count(*) filter (where action = 'badge.revoke')::int as revokes from admin_audit where target_id = $1",
    [memberId],
  );
  assert.ok(actions.notes >= 1 && actions.grants >= 2 && actions.revokes >= 1, `the activity log should carry every action: ${JSON.stringify(actions)}`);
});
