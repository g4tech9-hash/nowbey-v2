import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import { normalizeHandle } from "@/lib/handles";
import { getViewer } from "@/lib/viewer";
import { profileSettings } from "@/lib/profile";
import { avatarFor } from "@/lib/avatar";

export const dynamic = "force-dynamic";
export async function GET(_req: Request, { params }: { params: Promise<{ handle: string }> }) {
  const { handle } = await params;
  const [member] = await db.select({ id: users.id, status: users.status }).from(users).where(eq(users.handle, normalizeHandle(handle))).limit(1);
  const absent = () => new Response(null, { status: 404, headers: { "Cache-Control": "private, no-store" } });
  if (!member || member.status === "suspended") return absent();
  const settings = await profileSettings(member.id);
  if (settings.visibility === "private") {
    const viewer = await getViewer();
    if (viewer.userId !== member.id && !viewer.isAdmin) return absent();
  }
  const data = await avatarFor(member.id);
  if (!data) return absent();
  return new Response(new Uint8Array(data), { headers: {
    "Content-Type": "image/jpeg", "X-Content-Type-Options": "nosniff",
    "Cache-Control": "private, no-store",
  } });
}
