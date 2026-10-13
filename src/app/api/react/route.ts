import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { reactions } from "@/db/schema";
import { columnsFor, engagementFor, targetInfo, targetValue } from "@/lib/engage";
import { isReactionKind, isTargetType } from "@/lib/engage-kinds";
import { hit, tooMany } from "@/lib/ratelimit";
import { UUID_RE, readJson, isGone } from "@/lib/validate";
import { getViewer } from "@/lib/viewer";



const bad = (error: string, status = 400) => NextResponse.json({ error }, { status });

/**
 * Set, change or remove your reaction on a post, a map pin or a news story. Send kind: null to take it back.
 * Each person has at most one reaction per item, so choosing a different one replaces the old one.
 */
export async function POST(req: Request) {
  const viewer = await getViewer();
  if (!viewer.signedIn || !viewer.userId) return bad("Sign in to react.", 401);
  const userId = viewer.userId;

  const gate = hit(`react:${userId}`, 240, 60 * 60_000);
  if (!gate.ok) return tooMany(gate.retryAfter, "reactions");

  const input = await readJson(req);
  const { type, id, kind } = (input ?? {}) as { type?: unknown; id?: unknown; kind?: unknown };
  if (!isTargetType(type) || typeof id !== "string" || !UUID_RE.test(id)) return bad("We could not find that.", 404);
  if (kind !== null && !isReactionKind(kind)) return bad("Pick one of the reactions.");

  const info = await targetInfo(type, id);
  if (!info || !info.open) return bad("That is no longer available.", 404);

  const col = columnsFor(type).rx;
  if (kind === null) {
    await db.delete(reactions).where(and(eq(reactions.userId, userId), eq(col, id)));
  } else {
    try {
      await db
        .insert(reactions)
        .values({ userId, kind, ...targetValue(type, id) })
        .onConflictDoUpdate({ target: [col, reactions.userId], set: { kind } });
    } catch (e) {
      if (isGone(e)) return bad("That is no longer available.", 404); // deleted a moment ago
      throw e;
    }
  }

  const summary = (await engagementFor(type, [id], userId)).get(id);
  return NextResponse.json(summary);
}
