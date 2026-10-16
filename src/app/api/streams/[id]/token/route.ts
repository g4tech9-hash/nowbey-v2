import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { liveStreams } from "@/db/schema";
import { getViewer } from "@/lib/viewer";
import { hasLiveBadge } from "@/lib/badges";
import { broadcastConfigured, broadcastToken, broadcastService, broadcastRoom } from "@/lib/broadcast";
import { badOrigin, hasBadOrigin } from "@/lib/http";
import { clientIp, hit, tooMany } from "@/lib/ratelimit";
import { UUID_RE } from "@/lib/validate";
export const dynamic = "force-dynamic";
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (hasBadOrigin(req)) return badOrigin();
  if (!broadcastConfigured()) return Response.json({ error: "Broadcasting is not configured." }, { status: 503 });
  const gate = hit(`stream:token:${clientIp(req)}`, 60, 60_000);
  if (!gate.ok) return tooMany(gate.retryAfter, "broadcast connections");
  const { id } = await params;
  if (!UUID_RE.test(id)) return Response.json({ error: "Unknown broadcast." }, { status: 400 });
  const [stream] = await db.select().from(liveStreams).where(eq(liveStreams.id, id)).limit(1);
  if (!stream || stream.status !== "live" || stream.playbackUrl !== null) return Response.json({ error: "Broadcast is not live." }, { status: 404 });
  const rooms = await broadcastService().listRooms([broadcastRoom(id)]);
  if (!rooms.length) return Response.json({ error: "Broadcast room has ended." }, { status: 410 });
  const viewer = await getViewer();
  const owner = viewer.userId === stream.userId;
  if (owner && !viewer.isEditor && !(await hasLiveBadge(stream.userId, "broadcaster"))) return Response.json({ error: "Broadcaster access was removed." }, { status: 403 });
  return Response.json({ url: process.env.LIVEKIT_URL, token: await broadcastToken(id, owner ? `publisher-${stream.userId}` : `viewer-${randomUUID()}`, owner), publish: owner }, { headers: { "Cache-Control": "no-store" } });
}
