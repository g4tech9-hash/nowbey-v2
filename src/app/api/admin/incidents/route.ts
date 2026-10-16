/**
 * Incident Command: edit an incident, move it through its lifecycle, or fold it
 * into another one.
 *
 * The public report form creates incidents; this route is the staff side of the
 * same table. Every mutation is gated by requireStaff("admin"), validated with
 * the same helpers the rest of the admin surface uses, and written to the
 * activity log with audit().
 *
 * PATCH  /api/admin/incidents   { action, id, ... }
 */

import { NextResponse } from "next/server";
import { eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { commentFlags, comments, incidentUpdates, incidents, postFlags, posts } from "@/db/schema";
import { audit } from "@/lib/audit";
import { requireStaff } from "@/lib/staff";
import { dbInt, numOrNull, readJson, text, UUID_RE } from "@/lib/validate";

/** The three states an incident can be moved between, as the dashboard shows them. */
const STATUSES = ["active", "resolved", "unfounded"];
const SEVERITIES = [1, 2, 3, 4];
const MAX_TITLE = 140;
const MAX_DETAILS = 4000;

const fail = (error: string, status = 409) => NextResponse.json({ error }, { status });

export async function PATCH(req: Request) {
  const gate = await requireStaff("admin");
  if (gate.error) return gate.error;
  const actorName = gate.viewer.handle ?? "admin";

  const body = await readJson(req);
  const id = String(body.id ?? "");
  if (!UUID_RE.test(id)) return fail("Which incident?", 400);

  const [incident] = await db.select().from(incidents).where(eq(incidents.id, id)).limit(1);
  if (!incident) return fail("No incident with that id.", 404);

  switch (body.action) {
    /**
     * Edit the details. Only the fields a human may reasonably correct are
     * accepted -- title, description, severity, category and location. Source
     * and reporter are deliberately absent: rewriting who reported something
     * would destroy the provenance the rest of the product leans on.
     */
    case "edit": {
      const title = text(body.title, MAX_TITLE);
      const details = text(body.details, MAX_DETAILS);
      const category = text(body.category, 40) || incident.category;
      const severity = dbInt(body.severity);
      const lat = numOrNull(body.lat);
      const lng = numOrNull(body.lng);

      if (title.length < 3) return fail("Give it a title of at least 3 characters.", 400);
      if (details.length < 3) return fail("Give it a description.", 400);
      if (severity !== null && !SEVERITIES.includes(severity)) return fail("Severity must be 1 to 4.", 400);
      if ((lat === null) !== (lng === null)) return fail("Latitude and longitude go together.", 400);
      if (lat !== null && (lat < -90 || lat > 90)) return fail("Latitude is out of range.", 400);
      if (lng !== null && (lng < -180 || lng > 180)) return fail("Longitude is out of range.", 400);

      await db
        .update(incidents)
        .set({
          title,
          details,
          category,
          severity: severity ?? incident.severity,
          lat: lat ?? incident.lat,
          lng: lng ?? incident.lng,
          address: body.address === undefined ? incident.address : text(body.address, 200) || null,
          updatedAt: new Date(),
        })
        .where(eq(incidents.id, id));

      await audit(actorName, "incident.edit", "report", id, incident.title, `title -> "${title}"`);
      return NextResponse.json({ ok: true });
    }

    /**
     * Move it between active, resolved and unfounded. Setting a terminal state
     * stamps resolved_at so "how long did that take" can be answered later;
     * reopening clears it again.
     */
    case "setStatus": {
      const status = text(body.status, 20);
      const reason = text(body.reason, 300);
      if (!STATUSES.includes(status)) return fail("Choose active, resolved or unfounded.", 400);
      if (status === incident.status) return NextResponse.json({ ok: true });

      // "Unfounded" is an accusation against the reporter, so it needs a reason.
      if (status === "unfounded" && reason.length < 4) {
        return fail("Say why it is unfounded -- the reason is kept in the log.", 400);
      }

      await db
        .update(incidents)
        .set({
          status,
          resolvedAt: status === "active" ? null : new Date(),
          updatedAt: new Date(),
        })
        .where(eq(incidents.id, id));

      await audit(actorName, `incident.${status}`, "report", id, incident.title, reason || null);
      return NextResponse.json({ ok: true });
    }

    /**
     * Fold one incident into another.
     *
     * The survivor is `intoId`. Everything that pointed at this incident is
     * repointed at it -- updates, comments, confirmations -- then this row is
     * deleted. The count on the survivor is recomputed from the rows that now
     * belong to it, so the number stays truthful instead of being summed (the
     * same person may have confirmed both reports, and counting them twice
     * would inflate it).
     *
     * Both rows must exist and must not be the same row. Self-merge is the
     * easy mistake to make with a mis-clicked dropdown, so it is refused
     * outright rather than silently doing nothing.
     */
    case "merge": {
      const intoId = String(body.intoId ?? "");
      if (!UUID_RE.test(intoId)) return fail("Which incident should this be merged into?", 400);
      if (intoId === id) return fail("An incident cannot be merged into itself.", 400);

      const [target] = await db.select().from(incidents).where(eq(incidents.id, intoId)).limit(1);
      if (!target) return fail("No incident with that id.", 404);

      // Count what will move, so the log line and the response can say so.
      const [moving] = await db
        .select({ updates: sql<number>`count(*)::int` })
        .from(incidentUpdates)
        .where(eq(incidentUpdates.incidentId, id));

      // Repoint the children, but only the ones that are not already on the
      // survivor. incident_updates has no unique constraint on
      // (incident_id, actor_key), so ON CONFLICT is not available and a plain
      // UPDATE would happily double-count a person who confirmed both reports.
      // Dropping the duplicates first is what keeps the survivor's count honest.
      await db.execute(sql`
        delete from incident_updates
        where incident_id = ${id}
          and exists (
            select 1 from incident_updates dupe
            where dupe.incident_id = ${intoId}
              and dupe.kind = incident_updates.kind
              and dupe.actor_key is not distinct from incident_updates.actor_key
          )
      `);
      await db.execute(sql`
        update incident_updates set incident_id = ${intoId} where incident_id = ${id}
      `);
      await db.execute(sql`
        update comments set incident_id = ${intoId} where incident_id = ${id}
      `);

      // Recompute the survivor's confirmation count from what now belongs to it.
      await db
        .update(incidents)
        .set({
          confirmations: sql`(
            select count(distinct coalesce(author_handle, 'anon:' || id::text))
            from incident_updates where incident_id = ${intoId} and kind = 'confirm'
          )`,
          sightings: sql`(
            select count(*) from incident_updates where incident_id = ${intoId} and kind = 'photo'
          )`,
          updatedAt: new Date(),
        })
        .where(eq(incidents.id, intoId));

      await db.delete(incidents).where(eq(incidents.id, id));

      await audit(
        actorName,
        "incident.merge",
        "report",
        intoId,
        target.title,
        `absorbed "${incident.title}" (${moving?.updates ?? 0} updates moved)`,
      );
      return NextResponse.json({ ok: true, intoId, updatesMoved: moving?.updates ?? 0 });
    }

    default:
      return fail("Unknown action.", 400);
  }
}

/**
 * The moderation console needs to know which comments and posts are flagged,
 * so the queue can show them next to the incident they belong to. Read-only,
 * still admin-gated, and paginated -- a busy island generates a lot of flags.
 */
export async function GET(req: Request) {
  const gate = await requireStaff("admin");
  if (gate.error) return gate.error;

  const url = new URL(req.url);
  const limit = Math.min(Math.max(Number(url.searchParams.get("limit") ?? 50), 1), 200);

  const [flaggedComments, flaggedPosts, statusCounts] = await Promise.all([
    db
      .select({
        id: comments.id,
        authorHandle: comments.authorHandle,
        body: comments.body,
        flagCount: comments.flagCount,
        incidentId: comments.incidentId,
        postId: comments.postId,
        createdAt: comments.createdAt,
      })
      .from(commentFlags)
      .innerJoin(comments, eq(commentFlags.commentId, comments.id))
      .where(eq(comments.status, "published"))
      .groupBy(comments.id)
      .orderBy(sql`count(${commentFlags.id}) desc`)
      .limit(limit),
    db
      .select({
        id: posts.id,
        authorHandle: posts.authorHandle,
        body: posts.body,
        flagCount: posts.flagCount,
        status: posts.status,
        createdAt: posts.createdAt,
      })
      .from(postFlags)
      .innerJoin(posts, eq(postFlags.postId, posts.id))
      .where(eq(posts.status, "published"))
      .groupBy(posts.id)
      .orderBy(sql`count(${postFlags.id}) desc`)
      .limit(limit),
    db
      .select({ status: incidents.status, n: sql<number>`count(*)::int` })
      .from(incidents)
      .groupBy(incidents.status),
  ]);

  return NextResponse.json({
    flaggedComments,
    flaggedPosts,
    statusCounts: Object.fromEntries(statusCounts.map((r) => [r.status, r.n])),
  });
}
