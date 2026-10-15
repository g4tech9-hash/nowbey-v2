import { NextResponse } from "next/server";
import { db } from "@/db";
import { deviceTokens, pushTokens } from "@/db/schema";
import { isExpoPushToken } from "@/lib/collect";
import { CATEGORY_KEYS, PARISHES } from "@/lib/geo";
import { badOrigin, hasBadOrigin } from "@/lib/http";
import { pushConfigured } from "@/lib/push";
import { clientIp, hit, tooMany } from "@/lib/ratelimit";
import { readJson } from "@/lib/validate";
import { getViewer } from "@/lib/viewer";

export const dynamic = "force-dynamic";

/** FCM registration tokens are long opaque blobs of these characters. */
const TOKEN_RE = /^[\w:.-]{10,4092}$/;

/**
 * Registers one push token. Two kinds share this door:
 *  - mobile app: an Expo push token, tied to the signed-in member (Bearer auth)
 *  - website: a browser FCM token, with the islands/categories it wants pushes about
 */
export async function POST(req: Request) {
  if (hasBadOrigin(req)) return badOrigin();

  const body = await readJson(req);
  const token = typeof body.token === "string" ? body.token.trim() : "";

  // --- Mobile app (Expo Push Service): one row per member per device, upsert so re-registering is harmless. ---
  if (isExpoPushToken(token)) {
    const viewer = await getViewer();
    if (!viewer.signedIn || !viewer.userId) {
      return NextResponse.json({ error: "Sign in first." }, { status: 401 });
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

  // --- Website (FCM): save/refresh this browser's token and topic choices. ---
  if (!pushConfigured()) return NextResponse.json({ error: "Push alerts are not set up on this server." }, { status: 503 });
  const gate = hit(`push:register:${clientIp(req)}`, 30, 60 * 60_000);
  if (!gate.ok) return tooMany(gate.retryAfter, "push registrations");

  if (!TOKEN_RE.test(token)) return NextResponse.json({ error: "That does not look like a push registration." }, { status: 400 });

  const parishes = (Array.isArray(body.parishes) ? body.parishes : [])
    .map((p: unknown) => String(p))
    .filter((p: string) => (PARISHES as readonly string[]).includes(p));
  const categories = (Array.isArray(body.categories) ? body.categories : [])
    .map((c: unknown) => String(c))
    .filter((c: string) => (CATEGORY_KEYS as string[]).includes(c));

  const viewer = await getViewer();
  const values = {
    token,
    platform: "web",
    parishes: (parishes.length ? parishes : ["New Providence"]).join(","),
    categories: categories.join(","),
    active: true,
    lastSeenAt: new Date(),
  };

  await db
    .insert(pushTokens)
    .values({ ...values, userId: viewer.userId })
    .onConflictDoUpdate({
      target: pushTokens.token,
      // A returning browser keeps its original account link if it is signed out right now.
      set: { ...values, userId: viewer.userId ?? undefined },
    });

  return NextResponse.json({ ok: true });
}
