import { NextResponse } from "next/server";
import { and, eq, or } from "drizzle-orm";
import { db } from "@/db";
import { hiddenProfileReports, incidents } from "@/db/schema";
import { badOrigin, hasBadOrigin } from "@/lib/http";
import { clientIp, hit, tooMany } from "@/lib/ratelimit";
import { isGone, readJson, UUID_RE } from "@/lib/validate";
import { getViewer } from "@/lib/viewer";

export const dynamic = "force-dynamic";

/**
 * Hiding a report from your own profile, and putting it back.
 *
 * The report itself is untouched: it stays on the map, keeps its confirmations and still counts toward the
 * record. `hidden_profile_reports` only stops the listing by name, so there is nothing here that could
 * remove a hazard report from anyone's view.
 *
 * The report has to be the caller's own — by account id, or by the handle on older rows that predate
 * accounts. An anonymous report is never matched by handle, so hiding can never confirm who filed one.
 */
async function ownedReport(userId: string, handle: string | null, incidentId: string) {
  const byHandle = handle ? and(eq(incidents.authorHandle, handle), eq(incidents.anonymous, false)) : undefined;
  const mine = byHandle ? or(eq(incidents.userId, userId), byHandle) : eq(incidents.userId, userId);
  const [row] = await db.select({ id: incidents.id }).from(incidents).where(and(eq(incidents.id, incidentId), mine)).limit(1);
  return Boolean(row);
}

/** The report id both verbs work on, or an answer explaining why there is none. */
async function target(req: Request) {
  if (hasBadOrigin(req)) return { error: badOrigin() };
  const viewer = await getViewer();
  if (!viewer.signedIn || !viewer.userId) return { error: NextResponse.json({ error: "Sign in first." }, { status: 401 }) };

  const gate = hit(`profilehide:${viewer.userId}:${clientIp(req)}`, 60, 10 * 60_000);
  if (!gate.ok) return { error: tooMany(gate.retryAfter, "profile changes") };

  const body = await readJson(req);
  const incidentId = typeof body.incidentId === "string" && UUID_RE.test(body.incidentId) ? body.incidentId : "";
  if (!incidentId) return { error: NextResponse.json({ error: "Which report?" }, { status: 400 }) };
  if (!(await ownedReport(viewer.userId, viewer.handle, incidentId))) {
    return { error: NextResponse.json({ error: "That is not one of your reports." }, { status: 403 }) };
  }
  return { userId: viewer.userId, incidentId };
}

/** Hide it. Doing this twice is not an error — the row is simply already there. */
export async function POST(req: Request) {
  const t = await target(req);
  if (t.error) return t.error;
  try {
    await db.insert(hiddenProfileReports).values({ userId: t.userId, incidentId: t.incidentId }).onConflictDoNothing();
  } catch (err) {
    // The report was deleted between the check and the write (or the account was, which cascades the other way).
    if (!isGone(err)) throw err;
    return NextResponse.json({ error: "That report is no longer there." }, { status: 404 });
  }
  return NextResponse.json({ ok: true, hidden: true });
}

/** Put it back on the profile. Hiding a report that was never hidden is the same answer. */
export async function DELETE(req: Request) {
  const t = await target(req);
  if (t.error) return t.error;
  await db.delete(hiddenProfileReports).where(and(eq(hiddenProfileReports.userId, t.userId), eq(hiddenProfileReports.incidentId, t.incidentId)));
  return NextResponse.json({ ok: true, hidden: false });
}
