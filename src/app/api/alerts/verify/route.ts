import { NextResponse } from "next/server";
import { createHash } from "node:crypto";
import { or, eq } from "drizzle-orm";
import { db } from "@/db";
import { alertSubscriptions } from "@/db/schema";
import { baseUrl } from "@/lib/billing";
import { param } from "@/lib/validate";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const token = param(new URL(req.url).searchParams.get("token"), 100);
  const base = baseUrl(req);
  if (!token) return NextResponse.redirect(`${base}/alerts?confirmed=0`);
  const tokenHash = createHash("sha256").update(token).digest("hex");
  const [row] = await db
    .select({ id: alertSubscriptions.id, expires: alertSubscriptions.tokenExpiresAt })
    .from(alertSubscriptions)
    .where(or(eq(alertSubscriptions.tokenHash, tokenHash), eq(alertSubscriptions.token, token)))
    .limit(1);
  if (!row) return NextResponse.redirect(`${base}/alerts?confirmed=0`);
  // Legacy rows have no expiry; new links expire after 7 days.
  if (row.expires && row.expires.getTime() < Date.now()) {
    return NextResponse.redirect(`${base}/alerts?confirmed=0`);
  }
  await db
    .update(alertSubscriptions)
    .set({ verified: true, verifiedAt: new Date() })
    .where(eq(alertSubscriptions.id, row.id));
  return NextResponse.redirect(`${base}/alerts?confirmed=1`);
}
