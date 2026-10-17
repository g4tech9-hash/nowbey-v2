import { desc, eq, notInArray, sql } from "drizzle-orm";
import { unstable_cache } from "next/cache";
import { db } from "@/db";
import { incidents } from "@/db/schema";
import { HIDDEN_STATUSES } from "@/lib/command";
import { nowMs } from "@/lib/geo";

/**
 * The numbers and the newest rows a signed-out visitor sees on the landing page.
 *
 * Deliberately small: the front door gets a count and three headlines, not the whole feed. It is
 * cached for half a minute like the home feed, so a launch-day crowd costs one set of queries
 * rather than one per visitor. The caller treats a failure as "no numbers yet" (see Landing), so a
 * database that is briefly unreachable still renders the page.
 */
export type LandingSnapshot = {
  /** Reports that are still open. */
  active: number;
  /** Reports filed in the last 24 hours, including ones already resolved. */
  reportsToday: number;
  /** How many parishes have at least one visible report. */
  parishes: number;
  /** The three newest open reports, for the "Newest on the map" list. */
  latest: { id: string; title: string; category: string; parish: string | null; createdAt: string }[];
};

async function loadLandingSnapshot(): Promise<LandingSnapshot> {
  const dayAgo = new Date(nowMs() - 864e5);

  const [totals] = await db
    .select({
      reportsToday: sql<number>`count(*) filter (where ${incidents.createdAt} >= ${dayAgo})`,
      active: sql<number>`count(*) filter (where ${incidents.status} = 'active')`,
      parishes: sql<number>`count(distinct ${incidents.parish})`,
    })
    .from(incidents)
    .where(notInArray(incidents.status, HIDDEN_STATUSES));

  const latest = await db
    .select({
      id: incidents.id,
      title: incidents.title,
      category: incidents.category,
      parish: incidents.parish,
      createdAt: incidents.createdAt,
    })
    .from(incidents)
    .where(eq(incidents.status, "active"))
    .orderBy(desc(incidents.createdAt))
    .limit(3);

  return {
    active: Number(totals?.active ?? 0),
    reportsToday: Number(totals?.reportsToday ?? 0),
    parishes: Number(totals?.parishes ?? 0),
    latest: latest.map((row) => ({
      id: row.id,
      title: row.title,
      category: row.category,
      parish: row.parish,
      createdAt: new Date(row.createdAt).toISOString(),
    })),
  };
}

export const landingSnapshot = unstable_cache(loadLandingSnapshot, ["landing-snapshot-v1"], { revalidate: 30 });
