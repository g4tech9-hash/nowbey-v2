import { NextResponse } from "next/server";
import { readJson, dbInt } from "@/lib/validate";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { enterpriseInquiries } from "@/db/schema";
import { audit } from "@/lib/audit";
import { requireStaff } from "@/lib/staff";


const STATUSES = ["new", "contacted", "closed"];

export async function PATCH(req: Request) {
  const gate = await requireStaff("admin");
  if (gate.error) return gate.error;

  const body = await readJson(req);
  const id = dbInt(body.id);
  const status = String(body.status ?? "");
  if (id === null || !STATUSES.includes(status)) {
    return NextResponse.json({ error: "Choose new, contacted or closed." }, { status: 400 });
  }
  const [row] = await db
    .update(enterpriseInquiries)
    .set({ status, handledAt: status === "new" ? null : new Date() })
    .where(eq(enterpriseInquiries.id, id))
    .returning({ organisation: enterpriseInquiries.organisation });
  if (!row) return NextResponse.json({ error: "That enquiry no longer exists." }, { status: 404 });
  await audit(gate.viewer.handle ?? "admin", `enquiry.${status}`, "enquiry", String(id), row.organisation);
  return NextResponse.json({ ok: true });
}
