import { stopBroadcast } from "@/lib/broadcast";
import { badOrigin, hasBadOrigin } from "@/lib/http";
import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { liveStreams } from "@/db/schema";
import { audit } from "@/lib/audit";
import { requireStaff } from "@/lib/staff";
import { UUID_RE, readJson, text } from "@/lib/validate";


/**
 * Staff stream control. Editors and admins can kill a live broadcast instantly; the row is kept
 * as "killed" so the audit trail shows who stopped what and why.
 *
 * AUTH: requireStaff() below is the gate (session cookie → src/lib/viewer.ts). To move staff auth
 * to an external middleware, replace that one call.
 */
export async function PATCH(req: Request) {
  if (hasBadOrigin(req)) return badOrigin();
  const gate = await requireStaff("editor");
  if (gate.error) return gate.error;
  const actorName = gate.viewer.handle ?? "staff";

  const body = await readJson(req);
  if (String(body.action ?? "") !== "kill") return NextResponse.json({ error: "Unknown action." }, { status: 400 });
  const id = String(body.id ?? "");
  if (!UUID_RE.test(id)) return NextResponse.json({ error: "Unknown broadcast." }, { status: 400 });
  const reason = text(body.reason, 200) || "stopped by staff";

  const [s] = await db.select().from(liveStreams).where(eq(liveStreams.id, id)).limit(1);
  if (!s) return NextResponse.json({ error: "That broadcast no longer exists." }, { status: 404 });
  if (s.status !== "live") {
    try { if (s.playbackUrl === null) await stopBroadcast(id); }
    catch { return NextResponse.json({ error: "Provider disconnect failed. Stop the room in LiveKit." }, { status: 502 }); }
    return NextResponse.json({ ok: true });
  }

  await db
    .update(liveStreams)
    .set({ status: "killed", killReason: reason, killedBy: actorName, endedAt: new Date() })
    .where(eq(liveStreams.id, id));
  await audit(actorName, "stream.kill", "stream", id, `“${s.title}” by @${s.authorHandle}`, reason);
  try { if (s.playbackUrl === null) await stopBroadcast(id); }
  catch { return NextResponse.json({ error: "Listing removed, but provider disconnect failed. Stop the room in the LiveKit dashboard." }, { status: 502 }); }
  return NextResponse.json({ ok: true });
}
