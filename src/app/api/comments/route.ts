import { NextResponse, after } from "next/server";
import { and, eq, gt } from "drizzle-orm";
import { db } from "@/db";
import { comments } from "@/db/schema";
import { columnsFor, engagementFor, listComments, targetInfo, targetValue } from "@/lib/engage";
import { COMMENT_MAX, isTargetType } from "@/lib/engage-kinds";
import { autoFlagComment } from "@/lib/moderation";
import { clientIp, exhausted, record, tooMany } from "@/lib/ratelimit";
import { UUID_RE, text, readJson, dbInt, isGone } from "@/lib/validate";
import { getViewer } from "@/lib/viewer";



const HOUR = 60 * 60_000;
const bad = (error: string, status = 400) => NextResponse.json({ error }, { status });

/** The comments and reaction counts for one item. Used by the mobile app. */
export async function GET(req: Request) {
  const sp = new URL(req.url).searchParams;
  const type = sp.get("type");
  const id = sp.get("id") ?? "";
  if (!isTargetType(type) || !UUID_RE.test(id)) return bad("We could not find that.", 404);

  const viewer = await getViewer();
  const info = await targetInfo(type, id);
  if (!info || (!info.open && !viewer.isEditor)) return bad("We could not find that.", 404);

  const [thread, eng] = await Promise.all([listComments(type, id, viewer), engagementFor(type, [id], viewer.userId)]);
  return NextResponse.json({ comments: thread.nodes, total: thread.total, truncated: thread.truncated, engagement: eng.get(id), open: info.open });
}

export async function POST(req: Request) {
  const viewer = await getViewer();
  if (!viewer.signedIn || !viewer.userId || !viewer.handle) return bad("Sign in to comment.", 401);
  const { userId, handle } = { userId: viewer.userId, handle: viewer.handle };

  // Counted only after a comment succeeds, so fixing a typo does not use up your allowance.
  const userKey = `comment:u:${userId}`;
  const ipKey = `comment:ip:${clientIp(req)}`;
  const u = exhausted(userKey, 20, HOUR);
  if (u.blocked) return tooMany(u.retryAfter, "comments");
  const i = exhausted(ipKey, 60, HOUR);
  if (i.blocked) return tooMany(i.retryAfter, "comments");

  const input = (await readJson(req)) as { type?: unknown; id?: unknown; body?: unknown; parentId?: unknown };
  if (!isTargetType(input.type) || typeof input.id !== "string" || !UUID_RE.test(input.id)) return bad("We could not find that.", 404);
  const { type, id } = { type: input.type, id: input.id };

  const body = text(input.body, COMMENT_MAX);
  if (body.length < 1) return bad("Write something first.");

  const info = await targetInfo(type, id);
  if (!info || !info.open) return bad("Comments are closed on this one.", 404);
  const col = columnsFor(type).cm;

  // Replies sit one level down: replying to a reply attaches to the comment it is under.
  let parentId: number | null = null;
  if (input.parentId !== undefined && input.parentId !== null) {
    const pid = dbInt(input.parentId);
    if (pid === null) return bad("We could not find the comment you are replying to.");
    const [parent] = await db.select({ id: comments.id, parentId: comments.parentId, status: comments.status, target: col }).from(comments).where(eq(comments.id, pid)).limit(1);
    if (!parent || parent.target !== id) return bad("The comment you are replying to is no longer there.", 404);
    if (parent.status !== "published") return bad("You cannot reply to a comment that has been removed.", 409);
    parentId = parent.parentId ?? parent.id;
  }

  const [dupe] = await db
    .select({ id: comments.id })
    .from(comments)
    .where(and(eq(comments.userId, userId), eq(col, id), eq(comments.body, body), gt(comments.createdAt, new Date(Date.now() - 120_000))))
    .limit(1);
  if (dupe) return bad("You already posted that.", 409);

  const row = await db
    .insert(comments)
    .values({ userId, authorHandle: handle, body, parentId, ...targetValue(type, id) })
    .returning({ id: comments.id, authorHandle: comments.authorHandle, body: comments.body, createdAt: comments.createdAt, parentId: comments.parentId })
    .then((r) => r[0])
    .catch((e: unknown) => {
      if (isGone(e)) return null; // the post, pin or comment was deleted a moment ago
      throw e;
    });
  if (!row) return bad("That is no longer there.", 404);

  record(userKey, HOUR);
  record(ipKey, HOUR);
  // The comment is live now; the AI first pass (no-op without a key) can only add a staff flag.
  after(() => autoFlagComment(row.id));
  return NextResponse.json({ comment: row }, { status: 201 });
}
