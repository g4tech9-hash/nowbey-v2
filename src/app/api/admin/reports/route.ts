import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { incidents } from "@/db/schema";
import { audit } from "@/lib/audit";
import { requireStaff } from "@/lib/staff";
import { UUID_RE, readJson } from "@/lib/validate";

export const dynamic = "force-dynamic";

/**
 * Moderate a report. Editors and admins can resolve, reopen, hide ("archive") and restore.
 * Deleting for good is admin only, and hiding is almost always the better choice because it can be undone.
 */
export async function PATCH(req: Request) {
  const body = await readJson(req);
  const action = String(body.action ?? "");
  const gate = await requireStaff(action === "delete" ? "admin" : "editor");
  if (gate.error) return gate.error;
  const actorName = gate.viewer.handle ?? "staff";

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
