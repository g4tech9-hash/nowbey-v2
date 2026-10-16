import { and, asc, desc, eq, inArray, isNull, ne, sql } from "drizzle-orm";
import { db } from "@/db";
import { comments, incidents, newsItems, posts, reactions } from "@/db/schema";
import { badgesFor, type Badge } from "@/lib/badges";
import { isReactionKind, type Engagement, type TargetType } from "@/lib/engage-kinds";
import type { Viewer } from "@/lib/viewer";

/** Which column points at which kind of item, in the reactions and comments tables. */
const COLS = {
  post: { rx: reactions.postId, cm: comments.postId, field: "postId" as const },
  incident: { rx: reactions.incidentId, cm: comments.incidentId, field: "incidentId" as const },
  news: { rx: reactions.newsId, cm: comments.newsId, field: "newsId" as const },
};

export function columnsFor(type: TargetType) {
  return COLS[type];
}

/** The foreign-key value to insert for an item, for example { postId: "..." }. */
export function targetValue(type: TargetType, id: string) {
  return { [COLS[type].field]: id } as { postId?: string; incidentId?: string; newsId?: string };
}

export type TargetInfo = { title: string; ownerId: string | null; open: boolean };

/**
 * Whether an item exists, and whether people may still react and comment on it right now.
 * Hidden posts, hidden reports and unapproved stories are closed: nobody can add to them.
 */
export async function targetInfo(type: TargetType, id: string): Promise<TargetInfo | null> {
  if (type === "post") {
    const [r] = await db.select({ title: posts.title, status: posts.status, owner: posts.userId }).from(posts).where(eq(posts.id, id)).limit(1);
    return r ? { title: r.title, ownerId: r.owner, open: r.status === "published" } : null;
  }
  if (type === "incident") {
    const [r] = await db.select({ title: incidents.title, status: incidents.status, owner: incidents.userId }).from(incidents).where(eq(incidents.id, id)).limit(1);
    return r ? { title: r.title, ownerId: r.owner, open: r.status !== "archived" } : null;
  }
  const [r] = await db.select({ title: newsItems.title, review: newsItems.review }).from(newsItems).where(eq(newsItems.id, id)).limit(1);
  return r ? { title: r.title, ownerId: null, open: r.review === "approved" } : null;
}

/** Reaction counts, comment counts and "what did I react with" for a batch of items of one kind. */
export async function engagementFor(type: TargetType, ids: string[], userId: string | null): Promise<Map<string, Engagement>> {
  const out = new Map<string, Engagement>();
  for (const id of ids) out.set(id, { counts: {}, total: 0, mine: null, comments: 0 });
  if (!ids.length) return out;
  const c = COLS[type];

  const [rx, mine, cm] = await Promise.all([
    db.select({ id: c.rx, kind: reactions.kind, n: sql<number>`count(*)::int` }).from(reactions).where(inArray(c.rx, ids)).groupBy(c.rx, reactions.kind),
    userId
      ? db.select({ id: c.rx, kind: reactions.kind }).from(reactions).where(and(eq(reactions.userId, userId), inArray(c.rx, ids)))
      : Promise.resolve([] as { id: string | null; kind: string }[]),
    db
      .select({ id: c.cm, n: sql<number>`count(*)::int` })
      .from(comments)
      .where(and(inArray(c.cm, ids), eq(comments.status, "published")))
      .groupBy(c.cm),
  ]);

  for (const r of rx) {
    if (!r.id || !isReactionKind(r.kind)) continue;
    const e = out.get(r.id);
    if (!e) continue;
    e.counts[r.kind] = r.n;
    e.total += r.n;
  }
  for (const m of mine) {
    if (!m.id || !isReactionKind(m.kind)) continue;
    const e = out.get(m.id);
    if (e) e.mine = m.kind;
  }
  for (const k of cm) {
    if (!k.id) continue;
    const e = out.get(k.id);
    if (e) e.comments = k.n;
  }
  return out;
}

export type CommentNode = {
  id: number;
  authorHandle: string;
  body: string;
  /** published | hidden | removed */
  status: string;
  createdAt: Date;
  badge: Badge | null;
  mine: boolean;
  /** Only filled in for staff. */
  flagCount: number;
  /** A hidden or deleted comment that is only shown so the replies under it still make sense. */
  placeholder: boolean;
  replies: CommentNode[];
};

const ROOT_LIMIT = 200;
const REPLY_LIMIT = 1000;

/**
 * The comment thread for an item. The public sees published comments; a hidden or deleted one only appears, as an
 * empty placeholder, when it has published replies. Staff see everything, labelled. The text of a hidden comment is
 * never sent to anyone else.
 */
export async function listComments(type: TargetType, id: string, viewer: Viewer): Promise<{ nodes: CommentNode[]; total: number; truncated: boolean }> {
  const c = COLS[type];
  // On a busy item the NEWEST conversations are the ones shown. Reading the oldest first would hide every new
  // comment once the limit was reached, which is the opposite of what people come to read.
  const newest = await db
    .select()
    .from(comments)
    .where(and(eq(c.cm, id), isNull(comments.parentId)))
    .orderBy(desc(comments.createdAt), desc(comments.id))
    .limit(ROOT_LIMIT + 1);
  const truncated = newest.length > ROOT_LIMIT;
  const roots = newest.slice(0, ROOT_LIMIT).reverse();
  const replyRows = roots.length
    ? await db
        .select()
        .from(comments)
        .where(inArray(comments.parentId, roots.map((r) => r.id)))
        .orderBy(asc(comments.createdAt), asc(comments.id))
        .limit(REPLY_LIMIT)
    : [];
  const rows = [...roots, ...replyRows];
  const [{ n: total }] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(comments)
    .where(and(eq(c.cm, id), eq(comments.status, "published")));

  const staff = viewer.isEditor;
  const seen = (r: (typeof rows)[number]) => r.status === "published" || staff;
  const badges = await badgesFor(rows.filter(seen).map((r) => r.authorHandle));

  const repliesOf = new Map<number, typeof rows>();
  for (const r of rows) {
    if (r.parentId === null) continue;
    const list = repliesOf.get(r.parentId) ?? [];
    list.push(r);
    repliesOf.set(r.parentId, list);
  }

  const make = (r: (typeof rows)[number], replies: CommentNode[]): CommentNode => {
    const visible = seen(r);
    return {
      id: r.id,
      authorHandle: visible ? r.authorHandle : "",
      body: visible ? r.body : "",
      status: r.status,
      createdAt: r.createdAt,
      badge: visible ? (badges.get(r.authorHandle) ?? null) : null,
      mine: Boolean(viewer.userId) && r.userId === viewer.userId,
      flagCount: staff ? r.flagCount : 0,
      placeholder: !visible,
      replies,
    };
  };

  const nodes: CommentNode[] = [];
  for (const r of rows) {
    if (r.parentId !== null) continue;
    const kids = (repliesOf.get(r.id) ?? []).filter(seen).map((k) => make(k, []));
    if (!seen(r) && kids.length === 0) continue;
    nodes.push(make(r, kids));
  }
  return { nodes, total, truncated };
}

/**
 * Deletes a comment. If other people have replied to it, it is blanked out instead of removed, so their replies
 * keep their context. When the last reply under a blanked comment goes, the blank goes with it.
 */
export async function removeComment(id: number): Promise<"deleted" | "removed" | "missing"> {
  return db.transaction(async (tx) => {
    // Locked, so a reply being written at this very moment either lands first (and is counted below) or waits and is refused.
    const [c] = await tx.select({ parentId: comments.parentId }).from(comments).where(eq(comments.id, id)).limit(1).for("update");
    if (!c) return "missing";
    const [{ n }] = await tx.select({ n: sql<number>`count(*)::int` }).from(comments).where(eq(comments.parentId, id));
    if (n > 0) {
      const done = await tx
        .update(comments)
        .set({ status: "removed", body: "", userId: null, authorHandle: "someone" })
        .where(and(eq(comments.id, id), ne(comments.status, "removed")))
        .returning({ id: comments.id });
      return done.length ? "removed" : "missing";
    }
    const gone = await tx.delete(comments).where(eq(comments.id, id)).returning({ id: comments.id });
    // Someone deleted it a moment ago. Say so, instead of reporting a second successful delete.
    if (!gone.length) return "missing";
    if (c.parentId !== null) {
      const [p] = await tx.select({ status: comments.status }).from(comments).where(eq(comments.id, c.parentId)).limit(1);
      if (p?.status === "removed") {
        const [{ left }] = await tx.select({ left: sql<number>`count(*)::int` }).from(comments).where(eq(comments.parentId, c.parentId));
        if (left === 0) await tx.delete(comments).where(eq(comments.id, c.parentId));
      }
    }
    return "deleted";
  });
}
