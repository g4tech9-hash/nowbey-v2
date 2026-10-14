import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { clientErrors } from "@/db/schema";
import { audit } from "@/lib/audit";
import { requireStaff } from "@/lib/staff";
import { dbInt, readJson } from "@/lib/validate";

/** Clear crash groups from the admin overview once they are fixed or understood. Admins only. */
export async function DELETE(req: Request) {
  const gate = await requireStaff("admin");
  if (gate.error) return gate.error;
  const actor = gate.viewer.handle ?? "admin";
  const body = (await readJson(req).catch(() => ({}))) as Record<string, unknown>;

  if (body.all === true) {
    await db.delete(clientErrors);
    await audit(actor, "errors.clear", "setting", null, "cleared all crash records");
    return NextResponse.json({ ok: true });
  }
  const id = dbInt(body.id);
  if (id === null) return NextResponse.json({ error: "Unknown record." }, { status: 400 });
  const done = await db.delete(clientErrors).where(eq(clientErrors.id, id)).returning({ id: clientErrors.id });
  if (done.length) await audit(actor, "errors.delete", "setting", String(id), "dismissed a crash group");
  return NextResponse.json({ ok: done.length > 0 });
}
