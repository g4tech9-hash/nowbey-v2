import { and, eq, gt, inArray, isNull, or } from "drizzle-orm";
import { db } from "@/db";
import { badgeGrants, users } from "@/db/schema";
import { entitledTier } from "@/lib/tiers";
import { demoPlansAllowed } from "@/lib/billing";

export type Badge = "verified" | "desk";

/**
 * Which of these handles earn a badge. Staff get "desk"; a member whose account a person checked gets
 * "verified", which comes from badge_grants (src/db/add-profiles.sql) and is never tied to a plan.
 * Looked up at read time so a revoked or expired grant disappears straight away, with no job to run.
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

  // That verification system: a human grant, still live. Revoked in the table, or left to expire, and the
  // badge is gone from every surface at once (report authors, Island Life posts, comments, profiles).
  const granted = await db
    .select({ handle: users.handle })
    .from(badgeGrants)
    .innerJoin(users, eq(users.id, badgeGrants.userId))
    .where(
      and(
        inArray(users.handle, list),
        eq(badgeGrants.badge, "verified"),
        isNull(badgeGrants.revokedAt),
        or(isNull(badgeGrants.expiresAt), gt(badgeGrants.expiresAt, new Date())),
      ),
    );
  for (const g of granted) if (!out.has(g.handle)) out.set(g.handle, "verified");

  return out;
}
