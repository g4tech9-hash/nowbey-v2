import { AccessToken, RoomServiceClient } from "livekit-server-sdk";
import { TrackSource } from "livekit-server-sdk";

export const broadcastConfigured = () => Boolean(process.env.LIVEKIT_URL && process.env.LIVEKIT_API_KEY && process.env.LIVEKIT_API_SECRET);
export const broadcastRoom = (id: string) => `nowbey-${id}`;
export function broadcastService() {
  if (!broadcastConfigured()) throw new Error("Broadcasting is not configured.");
  const url = new URL(process.env.LIVEKIT_URL!);
  if (url.protocol !== "wss:") throw new Error("LIVEKIT_URL must use wss.");
  url.protocol = "https:";
  return new RoomServiceClient(url.origin, process.env.LIVEKIT_API_KEY!, process.env.LIVEKIT_API_SECRET!);
}
export async function broadcastToken(id: string, identity: string, publish: boolean) {
  const token = new AccessToken(process.env.LIVEKIT_API_KEY!, process.env.LIVEKIT_API_SECRET!, { identity, ttl: 60 });
  token.addGrant({ room: broadcastRoom(id), roomJoin: true, canPublish: publish,
    canPublishSources: publish ? [TrackSource.CAMERA, TrackSource.MICROPHONE] : [],
    canSubscribe: true, canPublishData: false });
  return token.toJwt();
}
export async function stopBroadcast(id: string) {
  try { await broadcastService().deleteRoom(broadcastRoom(id)); }
  catch (error) {
    // A room that already disappeared is already stopped. Other provider errors must surface.
    const e = error as { status?: number; code?: string };
    if (e.status !== 404 && e.code !== "not_found") throw error;
  }
}
