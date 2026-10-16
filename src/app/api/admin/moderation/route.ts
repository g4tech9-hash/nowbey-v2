/**
 * Content Moderation: live broadcasts, the flagged-comment queue, and the
 * actions that clear them.
 *
 * Two halves, one route, because they are one job: "what is being published
 * right now that I should look at".
 *
 * GET   /api/admin/moderation            live streams + flagged queue
 * POST  /api/admin/moderation            killStream | approveComment | removeComment | hidePost | approvePost
 */

import { NextResponse } from "next/server";
import { desc, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { commentFlags, comments, liveStreams, memberNotes, posts, postFlags } from "@/db/schema";
import { audit } from "@/lib/audit";
import { requireStaff } from "@/lib/staff";
import { dbInt, readJson, text, UUID_RE } from "@/lib/validate";

const fail = (error: string, status = 409) => NextResponse.json({ error }, { status });

export async function GET() {
  const gate = await requireStaff("admin");
  if (gate.error) return gate.error;

  const [streams, flaggedComments, flaggedPosts] = await Promise.all([
    db
      .select()
      .from(liveStreams)
      .where(eq(liveStreams.status, "live"))
      .orderBy(desc(liveStreams.createdAt))
      .limit(60)
      .catch(() => [] as (typeof liveStreams.$inferSelect)[]),
    // Flagged comments still published. Grouped so one comment with five
    // flags is one queue row, not five.
    db
      .select({
        id: comments.id,
        authorHandle: comments.authorHandle,
        body: comments.body,
        flagCount: comments.flagCount,
        incidentId: comments.incidentId,
        postId: comments.postId,
        createdAt: comments.createdAt,
        flags: sql<number>`count(${commentFlags.id})::int`,
      })
      .from(commentFlags)
      .innerJoin(comments, eq(commentFlags.commentId, comments.id))
      .where(eq(comments.status, "published"))
      .groupBy(comments.id)
      .orderBy(sql`count(${commentFlags.id}) desc`)
      .limit(60),
    db
      .select({
        id: posts.id,
        authorHandle: posts.authorHandle,
        title: posts.title,
        body: posts.body,
        flagCount: posts.flagCount,
        createdAt: posts.createdAt,
        flags: sql<number>`count(${postFlags.id})::int`,
      })
      .from(postFlags)
      .innerJoin(posts, eq(postFlags.postId, posts.id))
      .where(eq(posts.status, "published"))
      .groupBy(posts.id)
      .orderBy(sql`count(${postFlags.id}) desc`)
      .limit(60),
  ]);

  return NextResponse.json({ streams, flaggedComments, flaggedPosts });
}

export async function POST(req: Request) {
  const gate = await requireStaff("admin");
  if (gate.error) return gate.error;
  const actorName = gate.viewer.handle ?? "admin";

  const body = await readJson(req);

  switch (body.action) {
    /**
     * Kill Stream. Sets status = 'killed' and stamps who and when.
     *
     * The media plane (Agora/LiveKit/whatever) is external and is told to stop
     * by the broadcaster's own client, which polls this row. Writing the row is
     * therefore the whole of the server's job: the moment it flips, every
     * viewer's client sees the stream as ended and stops rendering it. If you
     * later add a provider-side kill, it belongs here -- one call, right after
     * the update, never before it, so the database is never more optimistic
     * than reality.
     */
    case "killStream": {
      const id = String(body.id ?? "");
      if (!UUID_RE.test(id)) return fail("Which stream?", 400);

      const [stream] = await db.select().from(liveStreams).where(eq(liveStreams.id, id)).limit(1);
      if (!stream) return fail("No such stream.", 404);
      if (stream.status !== "live") return NextResponse.json({ ok: true, already: stream.status });

      const reason = text(body.reason, 300);
      await db
        .update(liveStreams)
        .set({ status: "killed", killedBy: actorName, killedAt: new Date(), updatedAt: new Date() })
        .where(eq(liveStreams.id, id));

      await audit(actorName, "stream.kill", "post", id, `${stream.authorHandle}: ${stream.title}`, reason || null);
      return NextResponse.json({ ok: true });
    }

    /** A broadcaster who stopped cleanly. Kept distinct from a kill for the log. */
    case "endStream": {
      const id = String(body.id ?? "");
      if (!UUID_RE.test(id)) return fail("Which stream?", 400);
      await db
        .update(liveStreams)
        .set({ status: "ended", endedAt: new Date(), updatedAt: new Date() })
        .where(eq(liveStreams.id, id));
      return NextResponse.json({ ok: true });
    }

    /**
     * Approve a flagged comment: leave it published, drop the flags, reset the
     * counter. "Approve" means staff looked and it is fine -- which is a
     * decision worth recording, because a comment that keeps getting flagged
     * and keeps getting approved is a signal about the flagging, not the
     * comment.
     */
    case "approveComment": {
      const id = dbInt(body.id);
      if (!id) return fail("Which comment?", 400);
      const [c] = await db.select().from(comments).where(eq(comments.id, id)).limit(1);
      if (!c) return fail("No such comment.", 404);

      await db.delete(commentFlags).where(eq(commentFlags.commentId, id));
      await db.update(comments).set({ flagCount: 0 }).where(eq(comments.id, id));
      await audit(actorName, "comment.approve", "comment", String(id), c.authorHandle, c.body.slice(0, 100));
      return NextResponse.json({ ok: true });
    }

    /**
     * Delete & warn. Two things happen, in this order:
     *   1. the comment is removed (status = 'removed', kept as a stub so replies
     *      still make sense -- the schema comment says exactly this),
     *   2. the author is warned, which here means a staff note on their account
     *      plus an entry in the activity log.
     *
     * Warnings are not silent: a member who is told nothing and keeps
     * commenting has not been warned. The notification itself is a one-line
     * insert into member_notes so the next admin to open the profile sees it.
     */
    case "removeComment": {
      const id = dbInt(body.id);
      const warn = body.warn !== false;
      const reason = text(body.reason, 300);
      if (!id) return fail("Which comment?", 400);
      if (reason.length < 4) return fail("Say why it is being removed.", 400);

      const [c] = await db.select().from(comments).where(eq(comments.id, id)).limit(1);
      if (!c) return fail("No such comment.", 404);

      await db.update(comments).set({ status: "removed", flagCount: 0 }).where(eq(comments.id, id));
      await db.delete(commentFlags).where(eq(commentFlags.commentId, id));

      // member_notes.user_id is NOT NULL, and a comment can outlive its author
      // (the schema sets comments.user_id to null when an account is deleted),
      // so a warning is only attachable when there is still an account to
      // attach it to. The log line is written either way -- the removal
      // happened regardless of whether the author could be warned.
      const warned = warn && Boolean(c.userId);
      if (warned && c.userId) {
        await db.insert(memberNotes).values({
          userId: c.userId,
          authorHandle: actorName,
          body: `Warning: a comment was removed by staff. Reason: ${reason}`,
        });
      }

      await audit(actorName, warned ? "comment.remove_warn" : "comment.remove", "comment", String(id), c.authorHandle, reason);
      return NextResponse.json({ ok: true, warned });
    }

    /** Hide a flagged post. Hidden posts are visible to staff only, per the schema. */
    case "hidePost": {
      const id = String(body.id ?? "");
      const reason = text(body.reason, 300);
      if (!UUID_RE.test(id)) return fail("Which post?", 400);
      if (reason.length < 4) return fail("Say why it is being hidden.", 400);
      const [p] = await db.select().from(posts).where(eq(posts.id, id)).limit(1);
      if (!p) return fail("No such post.", 404);

      await db.update(posts).set({ status: "hidden", flagCount: 0 }).where(eq(posts.id, id));
      await db.delete(postFlags).where(eq(postFlags.postId, id));
      await audit(actorName, "post.hide", "post", id, p.authorHandle, reason);
      return NextResponse.json({ ok: true });
    }

    /** Approve a flagged post: publish it, drop the flags. */
    case "approvePost": {
      const id = String(body.id ?? "");
      if (!UUID_RE.test(id)) return fail("Which post?", 400);
      const [p] = await db.select().from(posts).where(eq(posts.id, id)).limit(1);
      if (!p) return fail("No such post.", 404);

      await db.update(posts).set({ status: "published", flagCount: 0 }).where(eq(posts.id, id));
      await db.delete(postFlags).where(eq(postFlags.postId, id));
      await audit(actorName, "post.approve", "post", id, p.authorHandle, p.title);
      return NextResponse.json({ ok: true });
    }

    default:
      return fail("Unknown action.", 400);
  }
}
