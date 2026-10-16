import { clean } from "@/lib/validate";
import { isEnvAdmin } from "./admin-access-core";

// The admin-access rules live in admin-access-core so they can be unit-tested without a bundler.
// Re-exported here so every caller keeps importing them from one place.
export * from "./admin-access-core";

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
