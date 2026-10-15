import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { deviceTokens, pushTokens } from "@/db/schema";
import { isExpoPushToken } from "@/lib/collect";
import { getViewer } from "@/lib/viewer";
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
  if (isExpoPushToken(token)) {
    const viewer = await getViewer();
    if (!viewer.signedIn || !viewer.userId) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
    // userId is intentionally checked: possession of one member's token must not let another account remove it.
    await db.delete(deviceTokens).where(and(eq(deviceTokens.userId, viewer.userId), eq(deviceTokens.token, token)));
    return NextResponse.json({ ok: true });
  }

  if (!/^[\w:.-]{10,4092}$/.test(token)) return NextResponse.json({ error: "That does not look like a push registration." }, { status: 400 });
  await db.delete(pushTokens).where(eq(pushTokens.token, token));
  return NextResponse.json({ ok: true });
}
