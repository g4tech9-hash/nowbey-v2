import { NextResponse } from "next/server";
import { readJson, dbInt } from "@/lib/validate";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { commentFlags, comments } from "@/db/schema";
import { audit } from "@/lib/audit";
import { removeComment } from "@/lib/engage";
import { requireStaff } from "@/lib/staff";


/** Moderate comments. Editors and admins can hide, restore, dismiss reports and delete. Every change is logged. */
export async function PATCH(req: Request) {
  const gate = await requireStaff("editor");
  if (gate.error) return gate.error;
  const actor = gate.viewer.handle ?? "staff";

  const body = await readJson(req);
  const id = dbInt(body.id);
  const action = String(body.action ?? "");
  if (id === null) return NextResponse.json({ error: "Unknown comment." }, { status: 400 });

  const [c] = await db.select({ body: comments.body, status: comments.status }).from(comments).where(eq(comments.id, id)).limit(1);
  if (!c) return NextResponse.json({ error: "That comment no longer exists." }, { status: 404 });
  const label = c.body.slice(0, 80) || "(comment)";

  switch (action) {
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
    default:
      return NextResponse.json({ error: "Unknown action." }, { status: 400 });
  }
  await audit(actor, `comment.${action}`, "comment", String(id), label, `was ${c.status}`);
  return NextResponse.json({ ok: true });
}
