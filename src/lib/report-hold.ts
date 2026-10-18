/**
 * HOLDING A REPORT FOR A HUMAN.
 *
 * A safety map is only as good as what is on it. One advert filed as a flood,
 * with a neighbour's "saw it too" under it, is a false hazard that somebody
 * might route around at night. That is worth more than a missing pin.
 *
 * So when a report does not look like the thing it was filed as, it is HELD:
 * taken off the map and out of the public feed, and put in the staff queue with
 * the reason. A human releases it if it is real.
 *
 * This is the same shape as the AI first pass (src/lib/moderation.ts): the
 * machine jumps the queue, the human decides. The difference is that a held
 * report is not published in the meantime, because an advert is not a
 * "maybe".
 */
import { and, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { incidentUpdates, incidents } from "@/db/schema";
import { holdReason, type ReportLike } from "./report-check";

/** The status a held report carries. It is in HIDDEN_STATUSES, so the public never sees it. */
export const HOLD_STATUS = "held";

/** Who the hold is attributed to, so staff can tell a machine check from a reader report. */
const SYSTEM_ACTOR = "system:check";
const SYSTEM_HANDLE = "NowBey check";

/**
 * Hold a report if it does not look like the thing it was filed as.
 *
 * Returns the reason it was held, or null when it was left alone. Safe to
 * call more than once: a report that is already held is not re-flagged.
 */
export async function holdIfMismatched(row: ReportLike): Promise<string | null> {
  const reason = holdReason(row);
  if (!reason) return null;
  if (row.status === HOLD_STATUS) return reason;

  try {
    await db
      .update(incidents)
      .set({ status: HOLD_STATUS, updatedAt: new Date() })
      .where(eq(incidents.id, row.id));
  } catch {
    // If the status could not be written the report stays visible, which is
    // the safer of the two failures: a real hazard is never hidden by a bug.
    return null;
  }

  try {
    await db
      .insert(incidentUpdates)
      .values({
        incidentId: row.id,
        kind: "flag",
        note: reason,
        authorHandle: SYSTEM_HANDLE,
        actorKey: SYSTEM_ACTOR,
      })
      .onConflictDoNothing();
  } catch {
    /* the queue row is a nicety; the hold itself already landed */
  }

  return reason;
}

/**
 * Re-check a report after somebody confirmed it or said they saw it too.
 * A report that only looks wrong once a neighbour has backed it is exactly
 * the case worth catching.
 */
export async function recheckAfterVote(row: ReportLike): Promise<string | null> {
  const backed = (row.confirmations ?? 0) + (row.sightings ?? 0);
  if (backed === 0) return null;
  return holdIfMismatched(row);
}

/** The counts a held report has, for the staff queue. */
export async function heldReportCounts(): Promise<number> {
  try {
    const [row] = await db
      .select({ n: sql<number>`count(*)::int` })
      .from(incidents)
      .where(eq(incidents.status, HOLD_STATUS));
    return Number(row?.n ?? 0);
  } catch {
    return 0;
  }
}

/** True when a report is held. */
export function isHeld(status: string): boolean {
  return status === HOLD_STATUS;
}

/** The statuses a staff member can act on. */
export async function heldReports(limit = 50) {
  return db
    .select()
    .from(incidents)
    .where(eq(incidents.status, HOLD_STATUS))
    .orderBy(sql`${incidents.createdAt} desc`)
    .limit(limit);
}

/** Used by the staff queue: put a held report back in front of the public. */
export async function releaseHold(id: string): Promise<boolean> {
  try {
    await db
      .update(incidents)
      .set({ status: "active", updatedAt: new Date() })
      .where(and(eq(incidents.id, id), eq(incidents.status, HOLD_STATUS)));
    return true;
  } catch {
    return false;
  }
}
