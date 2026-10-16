import { NextResponse } from "next/server";
import { and, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { comments, incidentUpdates, incidents, reactions } from "@/db/schema";
import { audit } from "@/lib/audit";
import { validateMerge } from "@/lib/command";
import { CATEGORY_KEYS, PARISHES } from "@/lib/geo";
import { requireStaff } from "@/lib/staff";
import { UUID_RE, readJson, text } from "@/lib/validate";


/**
 * Incident Command: moderate a report.
 *
 * AUTH: the requireStaff() call below is the authentication/authorization gate — editors and
 * admins come from the session cookie (src/lib/viewer.ts). If you ever move staff auth to an
 * external middleware (e.g. Clerk, Auth0, a VPN header), replace requireStaff with that check;
 * everything below it only needs `actorName` and the editor/admin decision.
 *
 * Editors and admins can resolve, reopen, mark unfounded, edit details, merge duplicates,
 * hide ("archive") and restore. Deleting for good is admin only, and hiding is almost always
 * the better choice because it can be undone.
 */
export async function PATCH(req: Request) {
  const body = await readJson(req);
  const action = String(body.action ?? "");
  const gate = await requireStaff(action === "delete" ? "admin" : "editor");
  if (gate.error) return gate.error;
  const actorName = gate.viewer.handle ?? "staff";

  // Merge addresses TWO incidents (survivor + absorbed), so it validates its own ids first.
  if (action === "merge") return mergeIncidents(body, actorName);

  const id = String(body.id ?? "");
  if (!UUID_RE.test(id)) return NextResponse.json({ error: "Unknown report." }, { status: 400 });
  const [r] = await db.select().from(incidents).where(eq(incidents.id, id)).limit(1);
  if (!r) return NextResponse.json({ error: "That report no longer exists." }, { status: 404 });

  const now = new Date();
  switch (action) {
    case "resolve":
      await db.update(incidents).set({ status: "resolved", resolvedAt: now, updatedAt: now }).where(eq(incidents.id, id));
      break;
    case "reopen":
      await db.update(incidents).set({ status: "active", resolvedAt: null, updatedAt: now }).where(eq(incidents.id, id));
      break;
    case "unfounded":
      // Checked out, nothing there. Distinct from "archived" (hidden) so the record stays honest.
      await db.update(incidents).set({ status: "unfounded", resolvedAt: now, updatedAt: now }).where(eq(incidents.id, id));
      break;
    case "update":
      return updateIncident(id, r.title, body, actorName);
    case "archive":
      await db.update(incidents).set({ status: "archived", updatedAt: now }).where(eq(incidents.id, id));
      break;
    case "restore":
      await db.update(incidents).set({ status: "active", resolvedAt: null, updatedAt: now }).where(eq(incidents.id, id));
      break;
    case "delete":
      await db.delete(incidents).where(eq(incidents.id, id));
      break;
    default:
      return NextResponse.json({ error: "Unknown action." }, { status: 400 });
  }
  await audit(actorName, `report.${action}`, "report", id, r.title, `was ${r.status}`);
  return NextResponse.json({ ok: true });
}

/** Edit a report's details in place. Only the fields the form sends are touched. */
async function updateIncident(id: string, oldTitle: string, body: Record<string, any>, actorName: string) {
  const patch: Partial<typeof incidents.$inferInsert> = {};
  if (body.title !== undefined) {
    const title = text(body.title, 140);
    if (title.length < 4) return NextResponse.json({ error: "The headline needs at least 4 characters." }, { status: 400 });
    patch.title = title;
  }
  if (body.details !== undefined) {
    const details = text(body.details, 2000);
    patch.details = details || null;
  }
  if (body.category !== undefined) {
    const category = String(body.category ?? "");
    if (!(CATEGORY_KEYS as string[]).includes(category)) return NextResponse.json({ error: "Unknown category." }, { status: 400 });
    patch.category = category;
  }
  if (body.severity !== undefined) {
    const severity = Number(body.severity);
    if (!Number.isInteger(severity) || severity < 1 || severity > 4) {
      return NextResponse.json({ error: "Severity is 1 (annoying) to 4 (dangerous)." }, { status: 400 });
    }
    patch.severity = severity;
  }
  if (body.street !== undefined) patch.street = text(body.street, 160) || null;
  if (body.parish !== undefined) {
    const parish = String(body.parish ?? "");
    if (parish && !(PARISHES as readonly string[]).includes(parish)) return NextResponse.json({ error: "Unknown island." }, { status: 400 });
    patch.parish = parish || null;
  }
  if (!Object.keys(patch).length) return NextResponse.json({ error: "Nothing to change." }, { status: 400 });
  patch.updatedAt = new Date();
  await db.update(incidents).set(patch).where(eq(incidents.id, id));
  const changed = Object.keys(patch).filter((k) => k !== "updatedAt").join(", ");
  await audit(actorName, "report.update", "report", id, (patch.title as string) ?? oldTitle, `edited ${changed}`);
  return NextResponse.json({ ok: true });
}

/**
 * Merge a duplicate report INTO another one. The survivor keeps its id; the absorbed report's
 * updates, comments and reactions are re-pointed at the survivor, its confirmations/sightings are
 * added on, and the absorbed row itself is archived (never deleted) with a note saying where it went.
 * All inside one transaction, so a half-merge cannot happen.
 */
async function mergeIncidents(body: Record<string, any>, actorName: string) {
  const v = validateMerge(body.into, body.from);
  if ("error" in v) return NextResponse.json({ error: v.error }, { status: 400 });
  const { into, from } = v;

  const [survivor] = await db.select().from(incidents).where(eq(incidents.id, into)).limit(1);
  const [absorbed] = await db.select().from(incidents).where(eq(incidents.id, from)).limit(1);
  if (!survivor) return NextResponse.json({ error: "The report to keep no longer exists." }, { status: 404 });
  if (!absorbed) return NextResponse.json({ error: "The report to merge no longer exists." }, { status: 404 });
  if (absorbed.status === "archived") return NextResponse.json({ error: "That report is already hidden." }, { status: 409 });

  const now = new Date();
  await db.transaction(async (tx) => {
    // Re-point everything at the survivor. Reactions are unique per (incident, user), so a reaction
    // the survivor already has from the same person is dropped first — otherwise the move would fail.
    await tx.update(incidentUpdates).set({ incidentId: into }).where(eq(incidentUpdates.incidentId, from));
    await tx.update(comments).set({ incidentId: into }).where(eq(comments.incidentId, from));
    await tx.execute(
      sql`delete from reactions where incident_id = ${from} and user_id in (select user_id from reactions where incident_id = ${into})`,
    );
    await tx.update(reactions).set({ incidentId: into }).where(eq(reactions.incidentId, from));
    await tx
      .update(incidents)
      .set({
        confirmations: sql`${incidents.confirmations} + ${absorbed.confirmations}`,
        sightings: sql`${incidents.sightings} + ${absorbed.sightings}`,
        updatedAt: now,
      })
      .where(eq(incidents.id, into));
    await tx.insert(incidentUpdates).values({
      incidentId: into,
      kind: "note",
      note: `Merged duplicate “${absorbed.title.slice(0, 100)}” by ${actorName}.`,
      authorHandle: actorName,
      actorKey: `staff:${actorName}`,
    });
    await tx
      .update(incidents)
      .set({ status: "archived", updatedAt: now })
      .where(and(eq(incidents.id, from)));
  });

  await audit(actorName, "report.merge", "report", into, survivor.title, `absorbed “${absorbed.title.slice(0, 80)}” (${from})`);
  return NextResponse.json({ ok: true, into });
}
