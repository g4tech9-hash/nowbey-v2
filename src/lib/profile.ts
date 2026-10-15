import { and, desc, eq, gt, isNull, ne, or, sql, type SQL } from "drizzle-orm";
import { db } from "@/db";
import { alertSubscriptions, badgeGrants, hiddenProfileReports, incidents, memberProfiles } from "@/db/schema";

/**
 * Reading half of member profiles. The tables are described in src/db/add-profiles.sql, and this file is the
 * only place that knows the rules that keep three promises the schema makes in writing:
 *
 *  - a missing row means the defaults, so a member who never opened the profile page is "open", exactly like
 *    one who chose "open" (this is why nothing here ever inserts a row just to read it);
 *  - a hidden report stays on the map and in the record — only the listing by name stops, so counts include
 *    it and the list does not;
 *  - an anonymous report is never listed by name, on any page, including its author's.
 */

export type ProfileSettings = { visibility: "open" | "private"; bio: string | null; showAlertSummary: boolean };

/** What a member gets before they touch anything: open, no bio, no alert summary. */
export const DEFAULT_SETTINGS: ProfileSettings = { visibility: "open", bio: null, showAlertSummary: false };

/** Turns a stored row (or no row at all) into settings. Anything unrecognised reads as the safe default. */
export function settingsFrom(row: { visibility: string; bio: string | null; showAlertSummary: boolean } | undefined): ProfileSettings {
  if (!row) return DEFAULT_SETTINGS;
  return {
    visibility: row.visibility === "private" ? "private" : "open",
    bio: row.bio,
    showAlertSummary: Boolean(row.showAlertSummary),
  };
}

export async function profileSettings(userId: string): Promise<ProfileSettings> {
  const [row] = await db
    .select({ visibility: memberProfiles.visibility, bio: memberProfiles.bio, showAlertSummary: memberProfiles.showAlertSummary })
    .from(memberProfiles)
    .where(eq(memberProfiles.userId, userId))
    .limit(1);
  return settingsFrom(row);
}

export type LiveBadge = { badge: string; reason: string; grantedBy: string; grantedAt: Date; expiresAt: Date | null };

/**
 * A badge that is still live: not revoked, and either with no expiry or one that has not passed.
 * Expiry is checked at read time so a lapsed badge disappears on its own, with no job to run.
 */
export function liveBadgeWhere(userId: string): SQL | undefined {
  return and(
    eq(badgeGrants.userId, userId),
    isNull(badgeGrants.revokedAt),
    or(isNull(badgeGrants.expiresAt), gt(badgeGrants.expiresAt, new Date())),
  );
}

/** The badges a person granted that still stand, newest first, with why and by whom. */
export async function liveBadges(userId: string, limit = 20): Promise<LiveBadge[]> {
  return db
    .select({
      badge: badgeGrants.badge,
      reason: badgeGrants.reason,
      grantedBy: badgeGrants.grantedBy,
      grantedAt: badgeGrants.grantedAt,
      expiresAt: badgeGrants.expiresAt,
    })
    .from(badgeGrants)
    .where(liveBadgeWhere(userId))
    .orderBy(desc(badgeGrants.grantedAt))
    .limit(limit);
}

/** Every badge ever granted to this member, including revoked ones, for the staff view. */
export async function badgeHistory(userId: string, limit = 20) {
  return db
    .select()
    .from(badgeGrants)
    .where(eq(badgeGrants.userId, userId))
    .orderBy(desc(badgeGrants.grantedAt))
    .limit(limit);
}

/**
 * How many islands this member's live alert profiles cover — the count only, never the address and never the
 * chosen categories, which is what the "show_alert_summary" switch promises.
 */
export async function alertIslandCount(userId: string): Promise<number> {
  const rows = await db
    .select({ parishes: alertSubscriptions.parishes })
    .from(alertSubscriptions)
    .where(and(eq(alertSubscriptions.userId, userId), eq(alertSubscriptions.verified, true), eq(alertSubscriptions.active, true)));
  const islands = new Set<string>();
  for (const row of rows) {
    for (const part of row.parishes.split(",")) {
      const island = part.trim();
      if (island) islands.add(island);
    }
  }
  return islands.size;
}

export type ProfileReport = {
  id: string;
  title: string;
  category: string;
  parish: string | null;
  status: string;
  confirmations: number;
  createdAt: Date;
  anonymous: boolean;
  hidden: boolean;
};

/** Reports that belong to this member: the account's own, plus older rows filed under the same handle. */
function ownedBy(userId: string, handle: string | null): SQL | undefined {
  const byHandle = handle ? and(eq(incidents.authorHandle, handle), eq(incidents.anonymous, false)) : undefined;
  return byHandle ? or(eq(incidents.userId, userId), byHandle) : eq(incidents.userId, userId);
}

/**
 * The member's reports, with a `hidden` flag from the profile table. The listing is the only thing hiding
 * changes: the report keeps its place on the map, its confirmations and its part in the record below.
 */
export async function reportsFor(
  userId: string,
  handle: string | null,
  { includeAnonymous = false, includeHidden = true, limit = 20 }: { includeAnonymous?: boolean; includeHidden?: boolean; limit?: number } = {},
): Promise<ProfileReport[]> {
  const conds: SQL[] = [ne(incidents.status, "archived")];
  const owner = ownedBy(userId, handle);
  if (owner) conds.push(owner);
  if (!includeAnonymous) conds.push(eq(incidents.anonymous, false));
  if (!includeHidden) conds.push(isNull(hiddenProfileReports.hiddenAt));

  const rows = await db
    .select({
      id: incidents.id,
      title: incidents.title,
      category: incidents.category,
      parish: incidents.parish,
      status: incidents.status,
      confirmations: incidents.confirmations,
      createdAt: incidents.createdAt,
      anonymous: incidents.anonymous,
      hiddenAt: hiddenProfileReports.hiddenAt,
    })
    .from(incidents)
    .leftJoin(hiddenProfileReports, and(eq(hiddenProfileReports.incidentId, incidents.id), eq(hiddenProfileReports.userId, userId)))
    .where(and(...conds))
    .orderBy(desc(incidents.createdAt))
    .limit(Math.min(Math.max(limit, 1), 50));

  return rows.map((r) => ({ ...r, hidden: Boolean(r.hiddenAt) }));
}

/** How many reports this member has filed, and how many confirmations they have gathered. */
export async function reportRecord(userId: string, handle: string | null): Promise<{ reports: number; confirmations: number }> {
  const conds: SQL[] = [ne(incidents.status, "archived"), eq(incidents.anonymous, false)];
  const owner = ownedBy(userId, handle);
  if (owner) conds.push(owner);
  const [row] = await db
    .select({ reports: sql<number>`count(*)::int`, confirmations: sql<number>`coalesce(sum(${incidents.confirmations}), 0)::int` })
    .from(incidents)
    .where(and(...conds));
  return { reports: Number(row?.reports ?? 0), confirmations: Number(row?.confirmations ?? 0) };
}
