import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { comments } from "@/db/schema";
import { audit } from "@/lib/audit";
import { removeComment } from "@/lib/engage";
import { getViewer } from "@/lib/viewer";


/** Delete a comment. Its author can, and so can staff (which is written to the activity log). */
export async function DELETE(_req: Request, ctx: { params: Promise<{ cid: string }> }) {
  const { cid } = await ctx.params;
  const id = /^\d{1,9}$/.test(cid) ? Number(cid) : NaN;
  if (!Number.isInteger(id)) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const viewer = await getViewer();
  if (!viewer.signedIn) return NextResponse.json({ error: "Sign in first." }, { status: 401 });

  const [c] = await db.select({ userId: comments.userId, body: comments.body, status: comments.status }).from(comments).where(eq(comments.id, id)).limit(1);
  if (!c) return NextResponse.json({ error: "That comment is already gone." }, { status: 404 });
  // A deleted comment is gone for everyone, whoever asks. Checked first because it no longer has an owner.
  if (c.status === "removed") return NextResponse.json({ error: "That comment is already gone." }, { status: 404 });
  const own = Boolean(viewer.userId) && c.userId === viewer.userId;
  if (!own && !viewer.isEditor) return NextResponse.json({ error: "You can only delete your own comments." }, { status: 403 });

  const result = await removeComment(id);
  if (result === "missing") return NextResponse.json({ error: "That comment is already gone." }, { status: 404 });
  if (!own) await audit(viewer.handle ?? "staff", "comment.delete", "comment", String(id), c.body.slice(0, 80) || "(comment)");
  return NextResponse.json({ ok: true, result });
}
