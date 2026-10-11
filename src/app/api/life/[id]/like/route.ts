import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { reactions } from "@/db/schema";
import { engagementFor, targetInfo } from "@/lib/engage";
import { hit, tooMany } from "@/lib/ratelimit";
import { UUID_RE, isGone } from "@/lib/validate";
import { getViewer } from "@/lib/viewer";

export const dynamic = "force-dynamic";

/**
 * Tap once to like, tap again to take it back. Kept so older copies of the mobile app keep working;
 * new code uses /api/react, which offers every reaction.
 */
export async function POST(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  if (!UUID_RE.test(id)) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const viewer = await getViewer();
  if (!viewer.signedIn || !viewer.userId) return NextResponse.json({ error: "Sign in to like posts." }, { status: 401 });
  const userId = viewer.userId;

  const gate = hit(`like:${userId}`, 120, 60 * 60_000);
  if (!gate.ok) return tooMany(gate.retryAfter, "likes");

  const info = await targetInfo("post", id);
  if (!info || !info.open) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const [mine] = await db.select({ kind: reactions.kind }).from(reactions).where(and(eq(reactions.postId, id), eq(reactions.userId, userId))).limit(1);
  if (mine?.kind === "like") {
    await db.delete(reactions).where(and(eq(reactions.postId, id), eq(reactions.userId, userId)));
  } else {
    try {
      await db
        .insert(reactions)
        .values({ userId, kind: "like", postId: id })
        .onConflictDoUpdate({ target: [reactions.postId, reactions.userId], set: { kind: "like" } });
    } catch (e) {
      if (isGone(e)) return NextResponse.json({ error: "Not found" }, { status: 404 }); // deleted a moment ago
      throw e;
    }
  }
  const e = (await engagementFor("post", [id], userId)).get(id);
  return NextResponse.json({ liked: e?.mine === "like", count: e?.total ?? 0 });
}
