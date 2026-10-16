import { NextResponse } from "next/server";
import { and, desc, eq, ne } from "drizzle-orm";
import { db } from "@/db";
import { incidents, incidentUpdates } from "@/db/schema";
import { badgesFor } from "@/lib/badges";
import { publicIncident } from "@/lib/public";
import { getViewer } from "@/lib/viewer";


const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  if (!UUID_RE.test(id)) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const [incident] = await db.select().from(incidents).where(eq(incidents.id, id)).limit(1);
  if (!incident || (incident.status === "archived" && !(await getViewer()).isEditor)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  const updates = await db
    .select()
    .from(incidentUpdates)
    .where(and(eq(incidentUpdates.incidentId, id), ne(incidentUpdates.kind, "flag")))
    .orderBy(desc(incidentUpdates.createdAt));
  const badges = await badgesFor([incident.anonymous ? null : incident.authorHandle]);
  return NextResponse.json({
    incident: { ...publicIncident(incident), authorBadge: badges.get(incident.authorHandle ?? "") ?? null },
    updates,
  });
}
