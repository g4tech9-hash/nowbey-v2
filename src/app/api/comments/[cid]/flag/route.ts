import { NextResponse } from "next/server";
import { readJson, isGone } from "@/lib/validate";
import { eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { commentFlags, comments } from "@/db/schema";
import { actorKey } from "@/lib/actor";
import { isFlagReason } from "@/lib/life-kinds";
import { clientIp, hit, tooMany } from "@/lib/ratelimit";
import { getViewer } from "@/lib/viewer";

export const dynamic = "force-dynamic";

/** Tell staff a comment needs a look. One report per person per comment. */
export async function POST(req: Request, ctx: { params: Promise<{ cid: string }> }) {
  const { cid } = await ctx.params;
  const id = /^\d{1,9}$/.test(cid) ? Number(cid) : NaN;
  if (!Number.isInteger(id)) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const gate = hit(`cflag:${clientIp(req)}`, 10, 60 * 60_000);
  if (!gate.ok) return tooMany(gate.retryAfter, "reports");

  const input = await readJson(req);
  const reason = input?.reason;
  if (!isFlagReason(reason)) return NextResponse.json({ error: "Choose a reason." }, { status: 400 });

  const viewer = await getViewer();
  const actor = actorKey(req, viewer);

  const result = await db.transaction(async (tx) => {
    const [c] = await tx.select({ status: comments.status }).from(comments).where(eq(comments.id, id)).limit(1);
    if (!c || c.status !== "published") return null;
    const added = await tx.insert(commentFlags).values({ commentId: id, actorKey: actor, reason }).onConflictDoNothing().returning({ id: commentFlags.id });
    if (!added.length) return { already: true };
    await tx
      .update(comments)
      .set({ flagCount: sql`${comments.flagCount} + 1` })
      .where(eq(comments.id, id));
    return { already: false };
  }).catch((e: unknown) => {
    if (isGone(e)) return null; // deleted a moment ago
    throw e;
  });
  if (!result) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ ok: true, ...result });
}
