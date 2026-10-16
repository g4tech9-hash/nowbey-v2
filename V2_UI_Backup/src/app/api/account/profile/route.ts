import { NextResponse } from "next/server";
import { db } from "@/db";
import { memberProfiles } from "@/db/schema";
import { badOrigin, hasBadOrigin } from "@/lib/http";
import { clientIp, hit, tooMany } from "@/lib/ratelimit";
import { readJson, text } from "@/lib/validate";
import { getViewer } from "@/lib/viewer";

export const dynamic = "force-dynamic";

const VISIBILITIES = ["open", "private"] as const;
const BIO_MAX = 200;

/**
 * The member's own profile settings: whether the profile is open or private, the one-line bio, and whether
 * to show how many islands their alerts cover.
 *
 * One row per member, written on the first save. The route deliberately reads nothing back — the page that
 * calls it re-renders from the database, so there is only ever one source of truth.
 */
export async function PATCH(req: Request) {
  if (hasBadOrigin(req)) return badOrigin();

  const viewer = await getViewer();
  if (!viewer.signedIn || !viewer.userId) return NextResponse.json({ error: "Sign in first." }, { status: 401 });

  const gate = hit(`profile:${viewer.userId}:${clientIp(req)}`, 30, 10 * 60_000);
  if (!gate.ok) return tooMany(gate.retryAfter, "profile changes");

  const body = await readJson(req);
  const visibility = VISIBILITIES.includes(body.visibility) ? (body.visibility as (typeof VISIBILITIES)[number]) : null;
  if (!visibility) return NextResponse.json({ error: "Choose whether your profile is open or private." }, { status: 400 });

  // An empty bio is stored as NULL rather than "": "not set" and "set to nothing" should look the same.
  const bio = text(body.bio, BIO_MAX) || null;
  const showAlertSummary = body.showAlertSummary === true;

  await db
    .insert(memberProfiles)
    .values({ userId: viewer.userId, visibility, bio, showAlertSummary })
    .onConflictDoUpdate({
      target: memberProfiles.userId,
      set: { visibility, bio, showAlertSummary, updatedAt: new Date() },
    });

  return NextResponse.json({ ok: true, visibility, bio, showAlertSummary });
}
