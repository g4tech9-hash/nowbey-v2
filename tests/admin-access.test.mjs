/**
 * Hermetic tests for the admin-access diagnosis (`src/lib/handles.ts` → `adminAccess`).
 * No database and no server — these run in CI on every push (npm test).
 *
 * The point of the function is to answer one question honestly: "why can this account not open
 * /admin?". These tests pin each answer to the exact condition that produces it, so a future
 * change to the rules cannot silently start telling an owner the wrong thing.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { adminAccess, isEnvAdmin } from "../src/lib/admin-access-core.ts";

const verified = new Date("2026-01-01T00:00:00Z");

/** The five states an account can be in, and what each must report. */
const CASES = [
  {
    name: "role=admin is an admin whatever the environment says",
    env: { ADMIN_HANDLES: "", ADMIN_EMAILS: "" },
    u: { handle: "someone", role: "admin", emailVerifiedAt: null, email: "a@b.test" },
    isAdmin: true,
    mentions: "role stored on the account",
  },
  {
    name: "ADMIN_HANDLES + confirmed email is an admin",
    env: { ADMIN_HANDLES: "mario242", ADMIN_EMAILS: "" },
    u: { handle: "mario242", role: "resident", emailVerifiedAt: verified, email: "a@b.test" },
    isAdmin: true,
    mentions: "ADMIN_HANDLES",
  },
  {
    name: "ADMIN_HANDLES alone is NOT enough: the email must be confirmed",
    env: { ADMIN_HANDLES: "mario242", ADMIN_EMAILS: "" },
    u: { handle: "mario242", role: "resident", emailVerifiedAt: null, email: "a@b.test" },
    isAdmin: false,
    mentions: "not confirmed",
  },
  {
    name: "an empty ADMIN_HANDLES is reported as such, not as a missing name",
    env: { ADMIN_HANDLES: "", ADMIN_EMAILS: "" },
    u: { handle: "mario242", role: "resident", emailVerifiedAt: verified, email: "a@b.test" },
    isAdmin: false,
    mentions: "ADMIN_HANDLES is not set",
  },
  {
    name: "a set ADMIN_HANDLES that lacks this handle names the real gap",
    env: { ADMIN_HANDLES: "eastsiderick", ADMIN_EMAILS: "" },
    u: { handle: "mario242", role: "resident", emailVerifiedAt: verified, email: "a@b.test" },
    isAdmin: false,
    mentions: "not listed in ADMIN_HANDLES",
  },
];

for (const c of CASES) {
  test(c.name, () => {
    const saved = { ...process.env };
    for (const [k, v] of Object.entries(c.env)) {
      if (v === "") delete process.env[k];
      else process.env[k] = v;
    }
    try {
      const got = adminAccess(c.u);
      assert.equal(got.isAdmin, c.isAdmin, `isAdmin for ${c.u.handle}: ${got.reason}`);
      assert.match(got.reason, new RegExp(c.mentions, "i"), `reason should say "${c.mentions}"`);
      // The verdict must agree with the rule getViewer uses, or the page lies.
      assert.equal(got.isAdmin, c.u.role === "admin" || (isEnvAdmin(c.u.handle) && c.u.emailVerifiedAt !== null));
      assert.equal(got.inAdminHandles, isEnvAdmin(c.u.handle));
      assert.equal(got.emailVerified, c.u.emailVerifiedAt !== null);
      assert.equal(got.adminHandlesSet, (c.env.ADMIN_HANDLES ?? "") !== "");
    } finally {
      process.env = saved;
    }
  });
}

test("the parsing quirks of ADMIN_HANDLES do not change the verdict", () => {
  const saved = { ...process.env };
  try {
    // A leading @, surrounding spaces and mixed case are all accepted, because the owner types
    // this by hand into a hosting dashboard.
    for (const value of ["mario242", " mario242 ", "@mario242", "eastsiderick, mario242", "Mario242"]) {
      process.env.ADMIN_HANDLES = value;
      assert.equal(
        adminAccess({ handle: "mario242", role: "resident", emailVerifiedAt: verified, email: "a@b.test" }).isAdmin,
        true,
        `ADMIN_HANDLES="${value}" should grant admin`,
      );
    }
    // A substring is not a match: "mario" must not unlock "mario242".
    process.env.ADMIN_HANDLES = "mario";
    assert.equal(
      adminAccess({ handle: "mario242", role: "resident", emailVerifiedAt: verified, email: "a@b.test" }).isAdmin,
      false,
      "a handle that merely contains the listed name must not be an admin",
    );
  } finally {
    process.env = saved;
  }
});

test("mayClaim reflects ADMIN_EMAILS without ever disclosing the list", () => {
  const saved = { ...process.env };
  try {
    process.env.ADMIN_HANDLES = "mario242";
    process.env.ADMIN_EMAILS = "owner@example.com, @crew.example";
    const exact = adminAccess({ handle: "mario242", role: "resident", emailVerifiedAt: null, email: "Owner@Example.com" });
    assert.equal(exact.mayClaim, true, "an exact address is allowed, case-insensitively");
    assert.equal(exact.adminEmailsSet, true);

    const domain = adminAccess({ handle: "mario242", role: "resident", emailVerifiedAt: null, email: "anyone@crew.example" });
    assert.equal(domain.mayClaim, true, "a whole domain is allowed");

    const other = adminAccess({ handle: "mario242", role: "resident", emailVerifiedAt: null, email: "stranger@elsewhere.test" });
    assert.equal(other.mayClaim, false, "an address outside the list may not claim the handle");

    // Whatever the verdict, the list itself must not appear in the payload.
    for (const r of [exact, domain, other]) {
      assert.equal(JSON.stringify(r).includes("owner@example.com"), false, "the ADMIN_EMAILS list must not leak");
      assert.equal(JSON.stringify(r).includes("crew.example"), false, "the ADMIN_EMAILS domain must not leak");
    }
  } finally {
    process.env = saved;
  }
});
