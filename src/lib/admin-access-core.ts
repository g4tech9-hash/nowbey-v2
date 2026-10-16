/*
 * Who holds admin, and why. No imports at all, so the whole rule can be unit-tested directly
 * (`tests/admin-access.test.mjs`) without a bundler resolving "@/".
 *
 * There are exactly two doors, and only one has to be open:
 *
 *   1. `role = 'admin'` on the account's row — set by another admin, or by setup_admins.sql.
 *   2. The handle is listed in ADMIN_HANDLES *and* the account's email is confirmed.
 *
 * `adminAccess` turns that into a sentence a person can act on. It is the single source of truth:
 * `getViewer` computes `isAdmin` from `envAdminActive`, which uses the same two rules, so the
 * diagnosis can never disagree with the gate.
 */

/** Handles listed in ADMIN_HANDLES are always admins, whatever their role says in the database. */
export function envAdminHandles(): string[] {
  return (process.env.ADMIN_HANDLES ?? "")
    .split(",")
    .map((s) => s.trim().toLowerCase().replace(/^@/, ""))
    .filter(Boolean);
}

export function isEnvAdmin(handle: string): boolean {
  return envAdminHandles().includes(handle.toLowerCase());
}

/**
 * Who may *register* a handle that is listed in ADMIN_HANDLES. A handle on that list carries admin rights,
 * so it must never be a prize for whoever signs up first. ADMIN_EMAILS is a comma-separated list of full
 * addresses (`owner@example.com`) or whole domains (`@example.com`); with it unset, nobody can register
 * such a handle through the sign-up form at all.
 *
 * This is one of two locks: the rights themselves also need a confirmed email (see `envAdminActive`), so
 * typing the owner's address without being able to read their inbox gains nothing.
 */
export function adminClaimEmails(): string[] {
  return (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
}

export function mayClaimAdminHandle(email: string): boolean {
  const e = email.trim().toLowerCase();
  const at = e.lastIndexOf("@");
  if (at < 1) return false;
  const domain = e.slice(at);
  return adminClaimEmails().some((entry) => (entry.startsWith("@") ? entry === domain : entry === e));
}

/** ADMIN_HANDLES rights apply only once the account's email address is confirmed. */
export function envAdminActive(u: { handle: string; emailVerifiedAt: Date | null }): boolean {
  return isEnvAdmin(u.handle) && u.emailVerifiedAt !== null;
}

export type AdminAccess = {
  isAdmin: boolean;
  /** Plain-English answer to "why is this account (not) an admin?". */
  reason: string;
  /** The handle is listed in ADMIN_HANDLES. */
  inAdminHandles: boolean;
  /** ADMIN_HANDLES lists anything at all. An empty list and a missing name are different problems. */
  adminHandlesSet: boolean;
  emailVerified: boolean;
  /** ADMIN_EMAILS lists anything at all. */
  adminEmailsSet: boolean;
  /** This account's address may register an ADMIN_HANDLES handle. */
  mayClaim: boolean;
};

/**
 * Which of the two doors an account is coming through — or why neither is open.
 *
 * When /admin will not open, this says which link in the chain is broken, in words someone can act
 * on. It deliberately reports booleans and never the contents of ADMIN_HANDLES or ADMIN_EMAILS:
 * an admin reading it does not need the list echoed back, and a leaked list is a leaked invite.
 */
export function adminAccess(u: {
  handle: string;
  role: string;
  emailVerifiedAt: Date | null;
  email?: string | null;
}): AdminAccess {
  const inAdminHandles = isEnvAdmin(u.handle);
  const adminHandlesSet = envAdminHandles().length > 0;
  const emailVerified = u.emailVerifiedAt !== null;
  const adminEmailsSet = adminClaimEmails().length > 0;
  const mayClaim = adminEmailsSet && Boolean(u.email) && mayClaimAdminHandle(u.email as string);
  const flags = { inAdminHandles, adminHandlesSet, emailVerified, adminEmailsSet, mayClaim };

  if (u.role === "admin") {
    return { isAdmin: true, reason: "Admin through the role stored on the account. ADMIN_HANDLES is not involved.", ...flags };
  }
  if (inAdminHandles && emailVerified) {
    return { isAdmin: true, reason: "Admin through ADMIN_HANDLES, and the account's email is confirmed.", ...flags };
  }
  if (inAdminHandles && !emailVerified) {
    return {
      isAdmin: false,
      reason:
        "The handle is listed in ADMIN_HANDLES, but this account's email is not confirmed, so the rights are not active yet. Open the confirmation email (or resend it from Your account), or finish a password reset — completing one marks the address verified.",
      ...flags,
    };
  }
  if (!adminHandlesSet) {
    return {
      isAdmin: false,
      reason:
        "ADMIN_HANDLES is not set on this deployment, so no handle gets admin from the environment. Set it to this handle and redeploy, or promote the account in the database.",
      ...flags,
    };
  }
  return {
    isAdmin: false,
    reason:
      "The handle is not listed in ADMIN_HANDLES on this deployment, and the account's role is a plain member. Add the handle to ADMIN_HANDLES and redeploy, or promote the account in the database.",
    ...flags,
  };
}
