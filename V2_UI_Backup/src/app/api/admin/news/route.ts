import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { newsItems } from "@/db/schema";
import { dispatchNewsAlert } from "@/lib/alerts";
import { dispatchNewsPush } from "@/lib/push";
import { publicBase } from "@/lib/billing";
import { audit } from "@/lib/audit";
import { requireStaff } from "@/lib/staff";
import { UUID_RE, readJson } from "@/lib/validate";


/** Approve or reject a reader-submitted link, or take a story off the wire. Editors and admins. */
export async function PATCH(req: Request) {
  const gate = await requireStaff("editor");
  if (gate.error) return gate.error;
  const actorName = gate.viewer.handle ?? "staff";

  const body = await readJson(req);
  const id = String(body.id ?? "");
  if (!UUID_RE.test(id)) return NextResponse.json({ error: "Unknown story." }, { status: 400 });
  const [story] = await db
    .select({ title: newsItems.title, summary: newsItems.summary, url: newsItems.url, parish: newsItems.parish, category: newsItems.category, sourceName: newsItems.sourceName, alertedAt: newsItems.alertedAt })
    .from(newsItems)
    .where(eq(newsItems.id, id))
    .limit(1);
  if (!story) return NextResponse.json({ ok: false, error: "That story is already gone." }, { status: 404 });

  if (body.action === "alert") {
    if (story.alertedAt) return NextResponse.json({ error: "An alert for this story has already been sent." }, { status: 409 });
    if (!story.parish) return NextResponse.json({ error: "Set the island first. Alerts go to islands." }, { status: 400 });
    const base = publicBase(req);
    if (!base) return NextResponse.json({ error: "Set APP_URL in Vercel so alert links work." }, { status: 400 });
    const stats = await dispatchNewsAlert({ id, ...story, parish: story.parish, summary: story.summary, url: story.url, sourceName: story.sourceName }, base);
    let push = null;
    try {
      push = await dispatchNewsPush({ id, title: story.title, parish: story.parish, category: story.category, sourceName: story.sourceName }, base);
    } catch (e) {
      console.error("push dispatch failed", e instanceof Error ? e.message : e);
    }
    await db.update(newsItems).set({ alertedAt: new Date() }).where(eq(newsItems.id, id));
    await audit(actorName, "story.alert", "story", id, `${story.title} (sent ${stats.sent}${push ? `, push ${push.sent}` : ""})`);
    return NextResponse.json({ ok: true, stats, push });
  }

  if (body.action === "approve") {
    const done = await db
      .update(newsItems)
      .set({ review: "approved" })
      .where(and(eq(newsItems.id, id), eq(newsItems.review, "pending")))
      .returning({ id: newsItems.id });
    if (done.length) await audit(actorName, "story.approve", "story", id, story.title);
    return NextResponse.json({ ok: done.length > 0 });
  }
  if (body.action === "reject") {
    const done = await db
      .delete(newsItems)
      .where(and(eq(newsItems.id, id), eq(newsItems.review, "pending")))
      .returning({ id: newsItems.id });
    if (done.length) await audit(actorName, "story.reject", "story", id, story.title);
    return NextResponse.json({ ok: done.length > 0 });
  }
  if (body.action === "remove") {
    const done = await db.delete(newsItems).where(eq(newsItems.id, id)).returning({ id: newsItems.id });
    if (done.length) await audit(actorName, "story.remove", "story", id, story.title);
    return NextResponse.json({ ok: done.length > 0 });
  }
  return NextResponse.json({ error: "Choose approve, reject or remove." }, { status: 400 });
}
