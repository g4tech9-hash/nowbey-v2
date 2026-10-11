import { NextResponse } from "next/server";
import { eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { postFlags, posts } from "@/db/schema";
import { actorKey } from "@/lib/actor";
import { isFlagReason } from "@/lib/life-kinds";
import { clientIp, hit, tooMany } from "@/lib/ratelimit";
import { UUID_RE, readJson, isGone } from "@/lib/validate";
import { getViewer } from "@/lib/viewer";

export const dynamic = "force-dynamic";

/** Tell staff a post needs a look. One report per person per post. */
export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  if (!UUID_RE.test(id)) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const gate = hit(`flag:${clientIp(req)}`, 10, 60 * 60_000);
  if (!gate.ok) return tooMany(gate.retryAfter, "reports");

  const input = await readJson(req);
  const reason = input?.reason;
  if (!isFlagReason(reason)) return NextResponse.json({ error: "Choose a reason." }, { status: 400 });

  const viewer = await getViewer();
  const actor = actorKey(req, viewer);

  const result = await db.transaction(async (tx) => {
    const [post] = await tx.select({ status: posts.status }).from(posts).where(eq(posts.id, id)).limit(1);
    if (!post || post.status !== "published") return null;
    const added = await tx.insert(postFlags).values({ postId: id, actorKey: actor, reason }).onConflictDoNothing().returning({ id: postFlags.id });
    if (!added.length) return { already: true };
    await tx
      .update(posts)
      .set({ flagCount: sql`${posts.flagCount} + 1` })
      .where(eq(posts.id, id));
    return { already: false };
  }).catch((e: unknown) => {
    if (isGone(e)) return null; // deleted a moment ago
    throw e;
  });
  if (!result) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ ok: true, ...result });
}
