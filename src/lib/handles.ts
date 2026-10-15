import { clean } from "@/lib/validate";

export const HANDLE_RE = /^[a-z0-9_]{3,18}$/;

/** Handles that would let someone pass as anonymous, as staff, or as NowBey itself. */
export const RESERVED = new Set([
  "someone",
  "neighbour",
  "neighbor",
  "anonymous",
  "admin",
  "administrator",
  "nowbey",
  "desk",
  "staff",
  "support",
  "moderator",
  "mod",
  "system",
  "root",
  "editor",
  "verified",
  "official",
  "help",
  "info",
  "security",
]);

export function normalizeHandle(raw: unknown): string {
  return typeof raw === "string" ? clean(raw).trim().toLowerCase().replace(/^@/, "").slice(0, 40) : "";
}

/** Why a handle cannot be used for a new account, or null if it is fine. */
export function handleProblem(h: string): string | null {
  if (!HANDLE_RE.test(h)) return "Pick a handle: 3-18 characters, letters, numbers or underscore.";
  // The owner's own admin handle (set in ADMIN_HANDLES) may use a reserved word such as "admin".
  if (isEnvAdmin(h)) return null;
  if (RESERVED.has(h) || h.startsWith("nowbey")) return "That handle is reserved. Please choose another.";
  return null;
}

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
