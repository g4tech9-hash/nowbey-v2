import { NextResponse } from "next/server";
import { createHash } from "node:crypto";
import { and, eq, ne, sql } from "drizzle-orm";
import { db } from "@/db";
import { incidents, incidentUpdates } from "@/db/schema";
import { getViewer, type Viewer } from "@/lib/viewer";
import { isHiddenStatus } from "@/lib/command";
import { publicIncident } from "@/lib/public";
import { serverSecret } from "@/lib/auth";
import { clientIp, hit, tooMany } from "@/lib/ratelimit";
import { text, UUID_RE, readJson, isGone } from "@/lib/validate";
import { isFlagReason } from "@/lib/life-kinds";


const KINDS = new Set(["confirm", "photo", "note", "clear", "escalate", "flag"]);

const ALREADY: Record<string, string> = {
  confirm: "You have already confirmed this report.",
  photo: "You have already said you saw this one too.",
  clear: "You have already voted to clear this report.",
  escalate: "You have already said this is getting worse.",
  flag: "You have already reported this. Thank you.",
};

/** Who is voting: the signed-in account, or a one-way hash of the visitor's address. */
function actorKey(req: Request, viewer: Viewer): string {
  if (viewer.userId) return `u:${viewer.userId}`;
  const digest = createHash("sha256").update(`${serverSecret()}|${clientIp(req)}`).digest("hex").slice(0, 24);
  return `ip:${digest}`;
}

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  if (!UUID_RE.test(id)) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const gate = hit(`vote:${clientIp(req)}`, 40, 10 * 60_000);
  if (!gate.ok) return tooMany(gate.retryAfter, "updates");

  const body = await readJson(req);
  const kind = typeof body.kind === "string" ? body.kind : "note";
  if (!KINDS.has(kind)) {
    return NextResponse.json({ error: `kind must be one of ${[...KINDS].join(", ")}` }, { status: 400 });
  }

  const [existing] = await db.select().from(incidents).where(eq(incidents.id, id)).limit(1);
  if (!existing || isHiddenStatus(existing.status)) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const viewer = await getViewer();
  const actor = actorKey(req, viewer);
  const isOwner = Boolean(viewer.userId) && existing.userId === viewer.userId;
  const resolved = existing.status !== "active";

  if (isOwner && (kind === "confirm" || kind === "photo")) {
    return NextResponse.json({ error: "You filed this report, so it already counts as confirmed." }, { status: 409 });
  }
  if (resolved && (kind === "clear" || kind === "escalate")) {
    return NextResponse.json({ error: "This report has already been cleared." }, { status: 409 });
  }

  // One vote of each kind per person per report, so the counts mean something.
  if (kind !== "note") {
    const [dupe] = await db
      .select({ id: incidentUpdates.id })
      .from(incidentUpdates)
      .where(and(eq(incidentUpdates.incidentId, id), eq(incidentUpdates.kind, kind), eq(incidentUpdates.actorKey, actor)))
      .limit(1);
    if (dupe) return NextResponse.json({ error: ALREADY[kind] }, { status: 409 });
  }

  // A report to staff: stored with its reason, never shown on the public timeline, no counters changed.
  if (kind === "flag") {
    const reason = body.reason;
    if (!isFlagReason(reason)) return NextResponse.json({ error: "Choose a reason." }, { status: 400 });
    await db
      .insert(incidentUpdates)
      .values({ incidentId: existing.id, kind: "flag", note: reason, authorHandle: viewer.handle ?? "neighbour", actorKey: actor })
      .catch((e: unknown) => {
        if (!isGone(e)) throw e;
      });
    return NextResponse.json({ ok: true }, { status: 201 });
  }

  // Clearing a report hides it from the map, so one stranger cannot do it alone: the person who filed it
  // (or an admin) can clear it straight away, anyone else needs a second neighbour to agree.
  let othersCleared = 0;
  if (kind === "clear") {
    const [{ n }] = await db
      .select({ n: sql<number>`count(distinct ${incidentUpdates.actorKey})::int` })
      .from(incidentUpdates)
      .where(and(eq(incidentUpdates.incidentId, id), eq(incidentUpdates.kind, "clear"), ne(incidentUpdates.actorKey, actor)));
    othersCleared = n;
  }
  const clears = kind === "clear" && (isOwner || viewer.isAdmin || othersCleared >= 1);

  const note = text(body.note, 500);
  const [update] = await db
    .insert(incidentUpdates)
    .values({ incidentId: existing.id, kind, note: note || null, authorHandle: viewer.handle ?? "neighbour", actorKey: actor })
    .returning()
    .catch((e: unknown) => {
      if (isGone(e)) return []; // the report was deleted a moment ago
      throw e;
    });
  if (!update) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Counters are changed in the database itself, so two people voting at once are both counted.
  const [row] = await db
    .update(incidents)
    .set({
      confirmations: kind === "confirm" ? sql`${incidents.confirmations} + 1` : incidents.confirmations,
      sightings: kind === "photo" ? sql`${incidents.sightings} + 1` : incidents.sightings,
      severity: kind === "escalate" ? sql`least(4, ${incidents.severity} + 1)` : incidents.severity,
      status: clears ? "resolved" : incidents.status,
      resolvedAt: clears ? new Date() : incidents.resolvedAt,
      updatedAt: new Date(),
    })
    .where(eq(incidents.id, existing.id))
    .returning();

  const pending = kind === "clear" && !clears;
  return NextResponse.json(
    {
      update,
      incident: publicIncident(row),
      ...(pending ? { pending: true, message: "Thanks. One more neighbour needs to agree before it is marked cleared." } : {}),
      ...(clears ? { message: "Marked cleared. Thanks for keeping the map honest." } : {}),
    },
    { status: 201 },
  );
}
