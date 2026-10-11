import { NextResponse } from "next/server";
import { asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { postPhotos, posts } from "@/db/schema";
import { audit } from "@/lib/audit";
import { badgesFor } from "@/lib/badges";
import { engagementFor } from "@/lib/engage";
import { publicPost } from "@/lib/life";
import { UUID_RE } from "@/lib/validate";
import { getViewer } from "@/lib/viewer";

export const dynamic = "force-dynamic";

/** One post with its photos and reaction counts. Hidden posts are only for their author and staff. */
export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  if (!UUID_RE.test(id)) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const viewer = await getViewer();

  const [post] = await db.select().from(posts).where(eq(posts.id, id)).limit(1);
  if (!post) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const own = Boolean(viewer.userId) && viewer.userId === post.userId;
  if (post.status !== "published" && !viewer.isEditor && !own) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const [photos, eng, badges] = await Promise.all([
    db.select({ id: postPhotos.id, width: postPhotos.width, height: postPhotos.height }).from(postPhotos).where(eq(postPhotos.postId, id)).orderBy(asc(postPhotos.position)),
    engagementFor("post", [id], viewer.userId),
    badgesFor([post.authorHandle]),
  ]);
  const e = eng.get(id);
  return NextResponse.json({
    post: {
      ...publicPost(post),
      likeCount: e?.total ?? 0,
      commentCount: e?.comments ?? 0,
      reactions: e?.counts ?? {},
      myReaction: e?.mine ?? null,
      likedByMe: e?.mine === "like",
      authorBadge: badges.get(post.authorHandle) ?? null,
    },
    photos,
  });
}

/** Delete a post. Its author can, and so can staff (which is written to the activity log). */
export async function DELETE(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  if (!UUID_RE.test(id)) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const viewer = await getViewer();
  if (!viewer.signedIn) return NextResponse.json({ error: "Sign in first." }, { status: 401 });

  const [post] = await db.select({ userId: posts.userId, title: posts.title }).from(posts).where(eq(posts.id, id)).limit(1);
  if (!post) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const own = post.userId === viewer.userId;
  if (!own && !viewer.isEditor) return NextResponse.json({ error: "You can only delete your own posts." }, { status: 403 });

  await db.delete(posts).where(eq(posts.id, id));
  if (!own) await audit(viewer.handle ?? "staff", "post.delete", "post", id, post.title);
  return NextResponse.json({ ok: true });
}
