import { NextResponse } from "next/server";
import { db } from "@/db";
import { deviceTokens } from "@/db/schema";
import { getViewer } from "@/lib/viewer";
import { isExpoPushToken } from "@/lib/collect";

export const dynamic = "force-dynamic";

/** Stores one Expo push token for the signed-in member (upsert, so re-registering is harmless). */
export async function POST(req: Request) {
  const viewer = await getViewer();
  if (!viewer.signedIn || !viewer.userId) {
    return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  }
  let token: unknown;
  try {
    token = ((await req.json()) as { token?: unknown }).token;
  } catch {
    token = undefined;
  }
  if (!isExpoPushToken(token)) {
    return NextResponse.json({ error: "That push token looks wrong." }, { status: 400 });
  }
  await db
    .insert(deviceTokens)
    .values({ userId: viewer.userId, token })
    .onConflictDoUpdate({
      target: [deviceTokens.userId, deviceTokens.token],
      set: { updatedAt: new Date() },
    });
  return NextResponse.json({ ok: true });
}
