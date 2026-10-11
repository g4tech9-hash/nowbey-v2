import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { alertSubscriptions } from "@/db/schema";
import { baseUrl } from "@/lib/billing";
import { param } from "@/lib/validate";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const token = param(new URL(req.url).searchParams.get("token"), 100);
  const base = baseUrl(req);
  if (!token) return NextResponse.redirect(`${base}/alerts?confirmed=0`);
  const done = await db
    .update(alertSubscriptions)
    .set({ verified: true, verifiedAt: new Date() })
    .where(eq(alertSubscriptions.token, token))
    .returning({ id: alertSubscriptions.id });
  return NextResponse.redirect(`${base}/alerts?confirmed=${done.length ? "1" : "0"}`);
}
