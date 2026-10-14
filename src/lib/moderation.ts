/*
 * AI first-pass moderation (needs GEMINI_API_KEY; a no-op without one).
 *
 * The model never hides, blocks or deletes anything. It only jumps the queue: flagged items land
 * in the same staff queues reader reports already use (post_flags, comment_flags and the
 * "Reported by readers" filter on admin reports), and a human makes the call. Bahamian dialect,
 * complaints about utilities and strong opinions are explicitly not moderation problems — the
 * prompt says so, because false flags waste a one-person moderation team faster than spam does.
 */
import { and, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { commentFlags, comments, incidentUpdates, postFlags, posts } from "@/db/schema";
import { aiConfigured, geminiJson, geminiVisionJson, oneLine } from "@/lib/ai";
import { isFlagReason, type FlagReason } from "@/lib/life-kinds";

/** actor_key used for every AI-raised flag, so staff can tell machine reports from human ones. */
const AI_ACTOR = "ai:mod";
const AI_HANDLE = "NowBey AI";

export function moderationOn(): boolean {
  return aiConfigured();
}

type Verdict = { flag?: unknown; reason?: unknown; note?: unknown };

const TEXT_PROMPT = (kind: string) => `You run first-pass moderation for NowBey, a community safety and local-life app in The Bahamas. Read this ${kind} and decide whether a human moderator should look at it right away.

Flag ONLY when the ${kind} clearly contains one of:
- spam, adverts, crypto/betting/sugar-daddy promotions ("spam")
- hate speech, slurs, targeted harassment, or credible threats ("offensive")
- advice that could physically endanger someone, or dangerous misinformation ("unsafe")
- claims that are obviously about somewhere outside The Bahamas ("wrong")

Do NOT flag: Bahamian dialect or slang, profanity on its own, complaints about government, BPL, Water & Sewerage or any company, blunt or frustrated language, unverified but plausible reports, politics, or strong opinions. When unsure, do NOT flag — false flags waste a volunteer moderator's limited time.

Answer in JSON: {"flag": true|false, "reason": "spam"|"offensive"|"unsafe"|"wrong"|"other", "note": "at most 8 words telling the moderator what to check"}`;

async function judge(kind: string, text: string): Promise<{ reason: FlagReason; note: string } | null> {
  if (!moderationOn() || !text.trim()) return null;
  const v = await geminiJson<Verdict>(`${TEXT_PROMPT(kind)}\n\n${kind.slice(0, 1).toUpperCase()}${kind.slice(1)}:\n${text.slice(0, 2500)}`, { maxTokens: 120, temperature: 0.1 });
  if (!v || v.flag !== true) return null;
  return {
    reason: isFlagReason(v.reason) ? v.reason : "other",
    note: oneLine(v.note, 120) || "flagged by first-pass AI",
  };
}

/* Each helper swallows its own errors: moderation must never break posting for real users. */

async function flagOnce(table: "post" | "comment", id: number | string, reason: FlagReason): Promise<void> {
  if (table === "post") {
    const added = await db.insert(postFlags).values({ postId: String(id), actorKey: AI_ACTOR, reason }).onConflictDoNothing().returning({ id: postFlags.id });
    if (added.length) await db.update(posts).set({ flagCount: sql`${posts.flagCount} + 1` }).where(eq(posts.id, String(id)));
  } else {
    const added = await db.insert(commentFlags).values({ commentId: Number(id), actorKey: AI_ACTOR, reason }).onConflictDoNothing().returning({ id: commentFlags.id });
    if (added.length) await db.update(comments).set({ flagCount: sql`${comments.flagCount} + 1` }).where(eq(comments.id, Number(id)));
  }
}

/** Screen a fresh comment; raises a staff flag when the model is confident. Call from after(). */
export async function autoFlagComment(id: number): Promise<void> {
  try {
    const [row] = await db.select({ body: comments.body, status: comments.status }).from(comments).where(eq(comments.id, id)).limit(1);
    if (!row || row.status !== "published") return;
    const hit = await judge("comment", row.body);
    if (!hit) return;
    await flagOnce("comment", id, hit.reason);
    console.warn(`[moderation] comment ${id} flagged (${hit.reason}): ${hit.note}`);
  } catch (err) {
    console.warn(`[moderation] comment ${id} check skipped: ${err instanceof Error ? err.message : err}`);
  }
}

/** Screen a fresh Island Life post. */
export async function autoFlagPost(id: string): Promise<void> {
  try {
    const [row] = await db.select({ title: posts.title, body: posts.body, status: posts.status }).from(posts).where(eq(posts.id, id)).limit(1);
    if (!row || row.status !== "published") return;
    const hit = await judge("post", `${row.title}\n${row.body}`);
    if (!hit) return;
    await flagOnce("post", id, hit.reason);
    console.warn(`[moderation] post ${id} flagged (${hit.reason}): ${hit.note}`);
  } catch (err) {
    console.warn(`[moderation] post ${id} check skipped: ${err instanceof Error ? err.message : err}`);
  }
}

/** Screen a fresh hazard report; flags land in the admin reports "Reported by readers" filter. */
export async function autoFlagIncident(id: string, title: string, details: string | null): Promise<void> {
  try {
    const [dupe] = await db
      .select({ id: incidentUpdates.id })
      .from(incidentUpdates)
      .where(and(eq(incidentUpdates.incidentId, id), eq(incidentUpdates.kind, "flag"), eq(incidentUpdates.actorKey, AI_ACTOR)))
      .limit(1);
    if (dupe) return;
    const hit = await judge("hazard report", `${title}\n${details ?? ""}`);
    if (!hit) return;
    await db.insert(incidentUpdates).values({
      incidentId: id,
      kind: "flag",
      note: oneLine(`AI first-pass (${hit.reason}): ${hit.note}`, 300),
      authorHandle: AI_HANDLE,
      actorKey: AI_ACTOR,
    });
    console.warn(`[moderation] incident ${id} flagged (${hit.reason}): ${hit.note}`);
  } catch (err) {
    console.warn(`[moderation] incident ${id} check skipped: ${err instanceof Error ? err.message : err}`);
  }
}

const VISION_PROMPT = `This photo was uploaded to a community app for The Bahamas — hazard reports plus restaurant, beach and event reviews. Decide if it is clearly inappropriate to show the public.

Answer in JSON: {"ok": true|false, "problem": "short phrase, or null"}.

Say ok=false ONLY for: nudity or sexual content, gore or graphic violence, or clearly hateful/illegal imagery. Food, menus, flooding, roads, beaches, buildings, receipts, screenshots of documents and people at a venue are all fine. When unsure, answer ok=true — a human moderator reviews uploads anyway.`;

/**
 * Look at processed upload thumbnails before they are stored. Returns the user-safe
 * rejection message for the first bad photo, or null when every photo passed.
 * Fails OPEN on any model error: with Gemini down, uploads keep working (human queues remain).
 */
export async function screenPhotos(photos: { thumb: Buffer }[]): Promise<string | null> {
  if (!moderationOn() || !photos.length) return null;
  for (const p of photos) {
    try {
      const parsed = await geminiVisionJson<{ ok?: unknown; problem?: unknown }>(VISION_PROMPT, [{ data: p.thumb, mimeType: "image/jpeg" }], {
        maxTokens: 60,
        temperature: 0,
        timeoutMs: 10_000,
      });
      if (!parsed) continue; // model unavailable — fail open
      if (parsed.ok === false) {
        const why = oneLine(parsed.problem, 80) || "not suitable for a public community page";
        return `One of your photos cannot be used: ${why}. Remove it and try again.`;
      }
    } catch {
      // Never let moderation take the upload flow down.
    }
  }
  return null;
}
