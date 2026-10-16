import { readAvatarBody } from "@/lib/avatar-upload";
import { WebhookReceiver } from "livekit-server-sdk";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { liveStreams } from "@/db/schema";
import { broadcastConfigured, stopBroadcast } from "@/lib/broadcast";
import { UUID_RE } from "@/lib/validate";
export const dynamic = "force-dynamic";
export async function POST(req: Request) {
  if (!broadcastConfigured()) return new Response(null, { status: 503 });
  // Provider signature covers the exact raw body; never parse/re-serialize before verification.
  if (!req.headers.get("authorization")) return new Response(null, { status: 401 });
  let body: string;
  try { body = (await readAvatarBody(req, 65536)).toString("utf8"); }
  catch { return new Response(null, { status: 413 }); }
  const receiver = new WebhookReceiver(process.env.LIVEKIT_API_KEY!, process.env.LIVEKIT_API_SECRET!);
  let event;
  try { event = await receiver.receive(body, req.headers.get("authorization") ?? undefined); }
  catch { return new Response(null, { status: 401 }); }
  const name = event.room?.name ?? "";
  const id = name.startsWith("nowbey-") ? name.slice(7) : "";
  if (!UUID_RE.test(id)) return new Response(null, { status: 204 });
  const [stream] = await db.select().from(liveStreams).where(eq(liveStreams.id, id)).limit(1);
  if (!stream || stream.playbackUrl !== null) return new Response(null, { status: 204 });
  const publisherLeft = event.event === "participant_left" && event.participant?.identity === `publisher-${stream.userId}`;
  if (event.event === "room_finished" || publisherLeft) {
    await db.update(liveStreams).set({ status: "ended", endedAt: new Date() })
      .where(and(eq(liveStreams.id, id), eq(liveStreams.status, "live")));
    if (publisherLeft) await stopBroadcast(id);
  }
  return new Response(null, { status: 204 });
}
