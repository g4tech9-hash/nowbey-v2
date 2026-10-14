import { inArray } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import { entitledTier } from "@/lib/tiers";
import { demoPlansAllowed } from "@/lib/billing";

export type Badge = "verified" | "desk";

/**
 * Which of these handles earn a badge. Staff get "desk"; Admiral members get "verified".
 * Looked up at read time so a cancelled plan loses its badge straight away.
 */
export async function badgesFor(handles: (string | null | undefined)[]): Promise<Map<string, Badge>> {
  const list = [...new Set(handles.filter((h): h is string => !!h && h !== "someone" && h !== "neighbour"))];
  const out = new Map<string, Badge>();
  if (!list.length) return out;
  const demo = demoPlansAllowed();
  const rows = await db
    .select({ handle: users.handle, role: users.role, tier: users.adFreeTier, status: users.planStatus, account: users.status })
    .from(users)
    .where(inArray(users.handle, list));
  for (const r of rows) {
    if (r.account === "suspended") continue; // a suspended member loses their badge
    if (r.role === "admin" || r.role === "editor") out.set(r.handle, "desk");
    // Verified badge is now decoupled from the Admiral paid tier to prevent trust-washing.
    // It must be granted manually via the 'role' or a future explicit verification system.
  }
  return out;
}
