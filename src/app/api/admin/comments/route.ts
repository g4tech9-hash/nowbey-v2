import { NextResponse } from "next/server";
import { readJson, dbInt, text } from "@/lib/validate";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { commentFlags, comments, memberNotes } from "@/db/schema";
import { audit } from "@/lib/audit";
import { removeComment } from "@/lib/engage";
import { requireStaff } from "@/lib/staff";


/**
 * Moderate comments. Editors and admins can approve, hide, restore, dismiss reports, delete,
 * and delete-with-a-warning. Every change is logged.
 *
 * AUTH: requireStaff() below is the gate (session cookie → src/lib/viewer.ts). To move staff auth
 * to an external middleware, replace that one call; the actions below only need the actor handle.
 */
export async function PATCH(req: Request) {
  const gate = await requireStaff("editor");
  if (gate.error) return gate.error;
  const actor = gate.viewer.handle ?? "staff";

  const body = await readJson(req);
  const id = dbInt(body.id);
  const action = String(body.action ?? "");
  if (id === null) return NextResponse.json({ error: "Unknown comment." }, { status: 400 });

  const [c] = await db
    .select({ body: comments.body, status: comments.status, userId: comments.userId, authorHandle: comments.authorHandle })
    .from(comments)
    .where(eq(comments.id, id))
    .limit(1);
  if (!c) return NextResponse.json({ error: "That comment no longer exists." }, { status: 404 });
  const label = c.body.slice(0, 80) || "(comment)";

  switch (action) {
    case "approve":
      // The reports were wrong: the comment stays up and the queue is cleared.
      await db.transaction(async (tx) => {
        await tx.delete(commentFlags).where(eq(commentFlags.commentId, id));
        await tx.update(comments).set({ status: "published", flagCount: 0 }).where(eq(comments.id, id));
      });
      break;
    case "hide":
      await db.update(comments).set({ status: "hidden" }).where(and(eq(comments.id, id), eq(comments.status, "published")));
      break;
    case "restore":
      await db.update(comments).set({ status: "published" }).where(and(eq(comments.id, id), eq(comments.status, "hidden")));
      break;
    case "clearFlags":
      await db.transaction(async (tx) => {
        await tx.delete(commentFlags).where(eq(commentFlags.commentId, id));
        await tx.update(comments).set({ flagCount: 0 }).where(eq(comments.id, id));
      });
      break;
    case "delete":
      if ((await removeComment(id)) === "missing") return NextResponse.json({ error: "That comment no longer exists." }, { status: 404 });
      break;
    case "deleteWarn": {
      // Delete the comment AND leave a strike on the author's staff record, so the next moderator
      // sees the pattern. The note is staff-only; the member is not notified in-app (yet).
      if ((await removeComment(id)) === "missing") return NextResponse.json({ error: "That comment no longer exists." }, { status: 404 });
      const reason = text(body.reason, 200) || "comment removed by staff";
      if (c.userId) {
        await db.insert(memberNotes).values({ userId: c.userId, authorHandle: actor, body: `Warned: ${reason} — “${label}”` });
        await audit(actor, "member.warn", "user", c.userId, c.authorHandle, reason);
      }
      break;
    }
    default:
      return NextResponse.json({ error: "Unknown action." }, { status: 400 });
  }
  await audit(actor, `comment.${action}`, "comment", String(id), label, `was ${c.status}`);
  return NextResponse.json({ ok: true });
}
