import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { serviceStatuses } from "@/db/schema";
import { getViewer } from "@/lib/viewer";
import { PARISHES } from "@/lib/geo";
import { badOrigin, hasBadOrigin } from "@/lib/http";
import { dbInt, readJson, text } from "@/lib/validate";

const KINDS = new Set(["pharmacy", "food", "fuel", "hardware", "water", "charging", "clinic", "shelter", "other"]);
const STATES = new Set(["open", "limited", "closed", "unknown"]);

async function admin() {
  const viewer = await getViewer();
  return viewer.isAdmin && viewer.handle ? viewer : null;
}

export async function POST(req: Request) {
  if (hasBadOrigin(req)) return badOrigin();
  const viewer = await admin();
  if (!viewer) return NextResponse.json({ error: "Admins only." }, { status: 403 });
  const body = await readJson(req);
  const name = text(body.name, 120);
  const kind = text(body.kind, 30);
  const status = text(body.status, 20);
  const parish = text(body.parish, 40);
  if (name.length < 2 || !KINDS.has(kind) || !STATES.has(status) || !(PARISHES as readonly string[]).includes(parish)) return NextResponse.json({ error: "Check the name, service type, status and island." }, { status: 400 });
  const hours = Math.min(168, Math.max(1, Number(body.hours) || 24));
  const [row] = await db.insert(serviceStatuses).values({ name, kind, status, parish, address: text(body.address, 180) || null, note: text(body.note, 500) || null, sourceName: text(body.sourceName, 120) || null, sourceUrl: text(body.sourceUrl, 500) || null, verified: body.verified === true, updatedBy: viewer.handle, expiresAt: new Date(Date.now() + hours * 3_600_000) }).returning();
  return NextResponse.json({ status: row }, { status: 201 });
}

export async function DELETE(req: Request) {
  if (hasBadOrigin(req)) return badOrigin();
  if (!(await admin())) return NextResponse.json({ error: "Admins only." }, { status: 403 });
  const id = dbInt((await readJson(req)).id);
  if (id === null) return NextResponse.json({ error: "Invalid status id." }, { status: 400 });
  await db.delete(serviceStatuses).where(eq(serviceStatuses.id, id));
  return NextResponse.json({ ok: true });
}
