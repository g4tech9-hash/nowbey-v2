import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { postFlags, posts } from "@/db/schema";
import { audit } from "@/lib/audit";
import { requireStaff } from "@/lib/staff";
import { UUID_RE, readJson } from "@/lib/validate";

export const dynamic = "force-dynamic";

/**
 * Moderate Island Life. Editors and admins can hide, restore, dismiss reports and remove comments.
 * Deleting a post for good is admin only, and hiding is almost always the better choice because it can be undone.
 */
export async function PATCH(req: Request) {
  const body = await readJson(req);
  const action = String(body.action ?? "");
  const gate = await requireStaff(action === "delete" ? "admin" : "editor");
  if (gate.error) return gate.error;
  const actor = gate.viewer.handle ?? "staff";

  const id = String(body.id ?? "");
  if (!UUID_RE.test(id)) return NextResponse.json({ error: "Unknown post." }, { status: 400 });
  const [p] = await db.select({ title: posts.title, status: posts.status }).from(posts).where(eq(posts.id, id)).limit(1);
  if (!p) return NextResponse.json({ error: "That post no longer exists." }, { status: 404 });

  const now = new Date();
  switch (action) {
    case "hide":
      await db.update(posts).set({ status: "hidden", updatedAt: now }).where(eq(posts.id, id));
      break;
    case "restore":
      await db.update(posts).set({ status: "published", updatedAt: now }).where(eq(posts.id, id));
      break;
    case "clearFlags":
      await db.transaction(async (tx) => {
        await tx.delete(postFlags).where(eq(postFlags.postId, id));
        await tx.update(posts).set({ flagCount: 0 }).where(eq(posts.id, id));
      });
      break;
    case "delete":
      await db.delete(posts).where(eq(posts.id, id));
      break;
    default:
      return NextResponse.json({ error: "Unknown action." }, { status: 400 });
  }
  await audit(actor, `post.${action}`, "post", id, p.title, `was ${p.status}`);
  return NextResponse.json({ ok: true });
}
