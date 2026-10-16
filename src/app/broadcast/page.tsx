import { BroadcastStudio } from "@/components/broadcast-studio";
import { getViewer } from "@/lib/viewer";
import { hasLiveBadge } from "@/lib/badges";
import { broadcastConfigured } from "@/lib/broadcast";
export const dynamic = "force-dynamic";
export const metadata = { title: "Live broadcasts" };
export default async function BroadcastPage() {
  if (!broadcastConfigured()) return <section className="nb-surface p-5"><h1 className="text-xl font-bold">Broadcasting setup required</h1><p className="mt-2">Add LIVEKIT_URL, LIVEKIT_API_KEY and LIVEKIT_API_SECRET to the server environment, apply add-live-streams.sql, then redeploy. No camera or microphone will start until you choose Go live.</p></section>;
  const viewer = await getViewer();
  const canPublish = viewer.signedIn && (viewer.isEditor || Boolean(viewer.userId && await hasLiveBadge(viewer.userId, "broadcaster")));
  return <BroadcastStudio canPublish={canPublish} />;
}
