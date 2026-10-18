import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import { badOrigin, hasBadOrigin } from "@/lib/http";
import { TERMS_VERSION } from "@/lib/legal";
import { getViewer } from "@/lib/viewer";

/**
 * POST /api/account/consent — records that a signed-in member agrees to the current wording.
 *
 * Needed for two groups the automated sign-up path cannot cover:
 *
 *  - accounts created before consent was collected at all (including every Google account made before this
 *    release), which have `terms_version = NULL`;
 *  - accounts that agreed to an older version, when the policy changes materially.
 *
 * It records the server's own TERMS_VERSION, never one supplied by the client: an old or edited client must
 * not be able to write "agreed to the 2027 wording" before that wording exists.
 */
export async function POST(req: Request) {
  if (hasBadOrigin(req)) return badOrigin();
  const viewer = await getViewer();
  if (!viewer.signedIn || !viewer.userId) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  if (body?.accepted !== true) {
    return NextResponse.json({ error: "Tick the box to agree before saving." }, { status: 400 });
  }
  await db.update(users).set({ termsVersion: TERMS_VERSION, termsAcceptedAt: new Date() }).where(eq(users.id, viewer.userId));
  return NextResponse.json({ ok: true, termsVersion: TERMS_VERSION });
}
