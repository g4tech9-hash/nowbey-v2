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
