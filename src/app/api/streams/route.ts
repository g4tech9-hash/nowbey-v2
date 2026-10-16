import { NextResponse } from "next/server";
import { and, desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { incidents, liveStreams } from "@/db/schema";
import { hasLiveBadge } from "@/lib/badges";
import { badOrigin, hasBadOrigin } from "@/lib/http";
import { clientIp, hit, tooMany } from "@/lib/ratelimit";
import { UUID_RE, readJson, text } from "@/lib/validate";
import { getViewer } from "@/lib/viewer";

export const dynamic = "force-dynamic";

/**
 * Live broadcasts. The app does not relay video itself: a verified broadcaster's phone publishes
 * to the streaming provider and registers the playback URL here, so the map and the admin grid
 * can show it. Staff can kill any live row from /admin/streams, which flips the status so every
 * client drops it.
 *
 * AUTH: starting/stopping needs the session cookie (getViewer). Staff checks come from
 * src/lib/staff.ts (see /api/admin/streams). To move auth to an external middleware, replace
 * those two call sites; the broadcast rules below stay the same.
 */

/** Every broadcast that is live right now. Public — this is what the map and apps poll. */
export async function GET() {
  const rows = await db.select().from(liveStreams).where(eq(liveStreams.status, "live")).orderBy(desc(liveStreams.startedAt)).limit(50);
  return NextResponse.json({
    streams: rows.map((s) => ({
      id: s.id,
      handle: s.authorHandle,
      title: s.title,
      incidentId: s.incidentId,
      playbackUrl: s.playbackUrl,
      startedAt: s.startedAt.toISOString(),
    })),
  });
}

/** Go live. The member must hold a live "broadcaster" grant (or be staff), and can only run one stream. */
export async function POST(req: Request) {
  if (hasBadOrigin(req)) return badOrigin();
  const viewer = await getViewer();
  if (!viewer.signedIn || !viewer.userId) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  const gate = hit(`stream:start:${viewer.userId}`, 10, 60 * 60_000);
  if (!gate.ok) return tooMany(gate.retryAfter, "going live");
  if (!viewer.isEditor && !(await hasLiveBadge(viewer.userId, "broadcaster"))) {
    return NextResponse.json({ error: "Going live is for verified broadcasters. Ask staff for broadcaster status." }, { status: 403 });
  }

  const body = await readJson(req);
  try {
    await db.select({ id: liveStreams.id }).from(liveStreams).limit(1);
  } catch {
    return NextResponse.json({ error: "Live broadcasts are not switched on yet." }, { status: 503 });
  }
  const title = text(body.title, 120);
  if (title.length < 4) return NextResponse.json({ error: "Give the broadcast a title of at least 4 characters." }, { status: 400 });
  const playbackUrl = text(body.playbackUrl, 500);
  if (playbackUrl && !/^https:\/\//.test(playbackUrl)) return NextResponse.json({ error: "The playback URL must be https." }, { status: 400 });
  let incidentId: string | null = null;
  if (body.incidentId !== undefined && body.incidentId !== null && String(body.incidentId) !== "") {
    incidentId = String(body.incidentId);
    if (!UUID_RE.test(incidentId)) return NextResponse.json({ error: "That incident id is not valid." }, { status: 400 });
    const [pin] = await db.select({ id: incidents.id }).from(incidents).where(eq(incidents.id, incidentId)).limit(1);
    if (!pin) return NextResponse.json({ error: "That incident no longer exists." }, { status: 404 });
  }

  const [existing] = await db
    .select({ id: liveStreams.id })
    .from(liveStreams)
    .where(and(eq(liveStreams.userId, viewer.userId), eq(liveStreams.status, "live")))
    .limit(1);
  if (existing) return NextResponse.json({ error: "You are already live. End that broadcast first.", streamId: existing.id }, { status: 409 });

  const [row] = await db
    .insert(liveStreams)
    .values({
      userId: viewer.userId,
      authorHandle: viewer.handle ?? "someone",
      title,
      incidentId,
      playbackUrl: playbackUrl || null,
    })
    .returning({ id: liveStreams.id });
  return NextResponse.json({ ok: true, id: row.id });
}

/** End your own broadcast. Staff kills go through PATCH /api/admin/streams instead. */
export async function PATCH(req: Request) {
  if (hasBadOrigin(req)) return badOrigin();
  const viewer = await getViewer();
  if (!viewer.signedIn || !viewer.userId) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  const body = await readJson(req);
  const id = String(body.id ?? "");
  if (!UUID_RE.test(id)) return NextResponse.json({ error: "Unknown broadcast." }, { status: 400 });
  try {
    await db.select({ id: liveStreams.id }).from(liveStreams).limit(1);
  } catch {
    return NextResponse.json({ error: "Live broadcasts are not switched on yet." }, { status: 503 });
  }
  const done = await db
    .update(liveStreams)
    .set({ status: "ended", endedAt: new Date() })
    .where(and(eq(liveStreams.id, id), eq(liveStreams.userId, viewer.userId), eq(liveStreams.status, "live")))
    .returning({ id: liveStreams.id });
  if (!done.length) return NextResponse.json({ error: "That broadcast is not yours, or it already ended." }, { status: 404 });
  return NextResponse.json({ ok: true });
}
