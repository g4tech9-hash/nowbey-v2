import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { pushTokens } from "@/db/schema";
import { badOrigin, hasBadOrigin } from "@/lib/http";
import { clientIp, hit, tooMany } from "@/lib/ratelimit";
import { readJson } from "@/lib/validate";

/** Remove a browser's push registration. Knowing the token is the authority to remove it — the token never leaves the device except to reach us. */
export async function POST(req: Request) {
  if (hasBadOrigin(req)) return badOrigin();
  const gate = hit(`push:unregister:${clientIp(req)}`, 30, 60 * 60_000);
  if (!gate.ok) return tooMany(gate.retryAfter, "push changes");

  const body = await readJson(req);
  const token = typeof body.token === "string" ? body.token.trim() : "";
  if (!/^[\w:.-]{10,4092}$/.test(token)) return NextResponse.json({ error: "That does not look like a push registration." }, { status: 400 });

  await db.delete(pushTokens).where(eq(pushTokens.token, token));
  return NextResponse.json({ ok: true });
}
