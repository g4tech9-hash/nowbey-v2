import { and, eq, gt, inArray, isNull, or } from "drizzle-orm";
import { db } from "@/db";
import { badgeGrants, users } from "@/db/schema";
import { envAdminActive } from "@/lib/handles";
import { earnsDeskBadge } from "@/lib/profile";

export type Badge = "verified" | "desk" | "broadcaster";

/**
 * Which of these handles earn a badge. Staff get "desk"; a member whose account a person checked gets
 * "verified", which comes from badge_grants (src/db/add-profiles.sql) and is never tied to a plan.
 * Looked up at read time so a revoked or expired grant disappears straight away, with no job to run.
 */
export async function badgesFor(handles: (string | null | undefined)[]): Promise<Map<string, Badge>> {
  const list = [...new Set(handles.filter((h): h is string => !!h && h !== "someone" && h !== "neighbour"))];
  const out = new Map<string, Badge>();
  if (!list.length) return out;
  const rows = await db
    .select({ handle: users.handle, role: users.role, account: users.status, emailVerifiedAt: users.emailVerifiedAt })
    .from(users)
    .where(inArray(users.handle, list));
  for (const r of rows) {
    if (r.account === "suspended") continue; // a suspended member loses their badge
    if (earnsDeskBadge(r.role) || envAdminActive(r)) out.set(r.handle, "desk");
  }

  // The verified badge is deliberately not tied to a plan — it is a human grant, still live. Revoked in
  // the table, or left to expire, and it is gone from every surface at once (report authors, Island Life
  // posts, comments, profiles), with no job to run.
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

/**
 * Does this member hold a live (unrevoked, unexpired) grant of the named badge right now?
 * Used to gate going live ("broadcaster"). Read live so a revoked grant stops working at once.
 */
export async function hasLiveBadge(userId: string, badge: string): Promise<boolean> {
  const [row] = await db
    .select({ id: badgeGrants.id })
    .from(badgeGrants)
    .where(
      and(
        eq(badgeGrants.userId, userId),
        eq(badgeGrants.badge, badge),
        isNull(badgeGrants.revokedAt),
        or(isNull(badgeGrants.expiresAt), gt(badgeGrants.expiresAt, new Date())),
      ),
    )
    .limit(1);
  return Boolean(row);
}
