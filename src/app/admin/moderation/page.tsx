/**
 * Content Moderation -- live broadcasts and the flagged queue, in one place
 * because they are one job: "what is being published right now that I should
 * look at".
 *
 * Server component. It reads live streams and the flagged comment/post queues
 * and hands them to ModerationConsole.tsx, which owns the actions.
 */

import { notFound } from "next/navigation";
import { desc, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { commentFlags, comments, liveStreams, postFlags, posts } from "@/db/schema";
import { getViewer } from "@/lib/viewer";
import { timeAgo } from "@/lib/geo";
import { StatCard } from "@/components/admin-ui";
import { ModerationConsole } from "@/components/moderation-console";

export const dynamic = "force-dynamic";
export const metadata = { title: "Moderation" };

export default async function ModerationPage() {
  const viewer = await getViewer();
  if (!viewer.isAdmin) notFound();

  const [streams, flaggedComments, flaggedPosts] = await Promise.all([
    // live_streams is new. Until add-admin-modules.sql has run, an empty grid is
    // the honest answer and the rest of the console must still work -- so this
    // one query is guarded and the two that touch old tables are not.
    db
      .select()
      .from(liveStreams)
      .where(eq(liveStreams.status, "live"))
      .orderBy(desc(liveStreams.createdAt))
      .limit(60)
      .catch((err) => {
        console.warn("[moderation] live_streams unavailable, showing no broadcasts:", (err as Error).message);
        return [] as (typeof liveStreams.$inferSelect)[];
      }),
    // One queue row per comment, not one per flag: a comment flagged five times
    // is one decision to make, not five.
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

  return (
    <div className="mx-auto max-w-[1200px] py-6">
      <header className="mb-5">
        <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#6e97a0]">Command</p>
        <h1 className="display mt-1 text-[26px] font-extrabold text-sand-100">Content Moderation</h1>
        <p className="mt-1 max-w-[70ch] text-[13px] text-[#a9cdc9]">
          Live broadcasts and everything the community has flagged. Killing a stream stops it for every viewer at once; approving
          a flag drops it, deleting warns the author.
        </p>
      </header>

      <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-3">
        <StatCard label="Live now" value={streams.length} tone={streams.length > 0 ? "warn" : undefined} />
        <StatCard label="Flagged comments" value={flaggedComments.length} tone={flaggedComments.length > 0 ? "warn" : undefined} />
        <StatCard label="Flagged posts" value={flaggedPosts.length} tone={flaggedPosts.length > 0 ? "warn" : undefined} />
      </div>

      <ModerationConsole
        streams={streams.map((s) => ({
          id: s.id,
          authorHandle: s.authorHandle,
          title: s.title,
          locationLabel: s.locationLabel,
          parish: s.parish,
          provider: s.provider,
          roomId: s.roomId,
          viewers: s.viewers,
          peakViewers: s.peakViewers,
          ago: timeAgo(s.createdAt),
        }))}
        comments={flaggedComments.map((c) => ({
          id: c.id,
          authorHandle: c.authorHandle,
          body: c.body,
          flags: c.flags,
          incidentId: c.incidentId,
          postId: c.postId,
          ago: timeAgo(c.createdAt),
        }))}
        posts={flaggedPosts.map((p) => ({
          id: p.id,
          authorHandle: p.authorHandle,
          title: p.title,
          body: p.body,
          flags: p.flags,
          ago: timeAgo(p.createdAt),
        }))}
      />
    </div>
  );
}
