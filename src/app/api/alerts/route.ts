import { NextResponse } from "next/server";
import { createHash } from "node:crypto";
import { and, eq, or } from "drizzle-orm";
import { db, hasDatabase } from "@/db";
import { alertSubscriptions } from "@/db/schema";
import { islandFor } from "@/lib/bahamas";
import { getViewer } from "@/lib/viewer";
import { clientIp, hit, tooMany } from "@/lib/ratelimit";
import { badOrigin, dbNotConfigured, hasBadOrigin } from "@/lib/http";
import { EMAIL_RE, text, readJson, dbInt } from "@/lib/validate";
import { upsertAlert } from "@/lib/safety-store";
import { HAZARD_TYPES } from "@/lib/bahamas";

/**
 * Master Build Section 15.
 * POST /api/alerts  body { email, island, types[], frequency }
 *   -> 400 on an invalid email; otherwise { success, message, subscription }
 *      with the success message naming the island.
 * Island email alerts are a free life-safety service — storm warnings are
 * never paywalled and frequency defaults to instant.
 */
export async function POST(req: Request) {
  if (hasBadOrigin(req)) return badOrigin();
  const gate = hit(`nb-alert:${clientIp(req)}`, 10, 60 * 60_000);
  if (!gate.ok) return tooMany(gate.retryAfter, "alert sign-ups");

  const body = await readJson(req);
  const email = text(body.email, 160).trim().toLowerCase();
  if (!EMAIL_RE.test(email)) {
    return NextResponse.json(
      { success: false, error: "That email address does not look right — check it and try again." },
      { status: 400 },
    );
  }

  const islandName = text(body.island, 60).trim();
  const island = islandFor(islandName);
  if (!island) {
    return NextResponse.json(
      { success: false, error: "Pick one of the six islands NowBey covers." },
      { status: 400 },
    );
  }

  const rawTypes = Array.isArray(body.types) ? body.types : [];
  const types = [...new Set(rawTypes.map((t: unknown) => text(t, 40).trim()).filter((t: string) => (HAZARD_TYPES as readonly string[]).includes(t)))];
  const frequency = body.frequency === "daily_digest" ? "daily_digest" : "instant";

  const subscription = await upsertAlert({ email, island: island.name, types, frequency });

  return NextResponse.json({
    success: true,
    message: `Alerts are on for ${island.name}. Storm warnings always reach you immediately, at zero cost.`,
    subscription,
  });
}

/**
 * Unsubscribe (link in alert emails, or the member's own profile). Kept from the
 * original alerts contract — the confirm-email links already in inboxes must keep
 * working after the rebuild.
 */
export async function DELETE(req: Request) {
  if (hasBadOrigin(req)) return badOrigin();
  if (!hasDatabase()) return dbNotConfigured();
  const gate = hit(`alertdel:${clientIp(req)}`, 30, 10 * 60_000);
  if (!gate.ok) return tooMany(gate.retryAfter, "requests");
  const body = await readJson(req);
  const token = text(body.token, 100);
  if (token.length >= 10) {
    const tokenHash = createHash("sha256").update(token).digest("hex");
    const gone = await db
      .delete(alertSubscriptions)
      .where(or(eq(alertSubscriptions.tokenHash, tokenHash), eq(alertSubscriptions.token, token)))
      .returning({ id: alertSubscriptions.id });
    return NextResponse.json({ ok: gone.length > 0 });
  }
  const viewer = await getViewer();
  const id = dbInt(body.id);
  if (!viewer.userId || id === null) return NextResponse.json({ error: "Not allowed." }, { status: 401 });
  const gone = await db
    .delete(alertSubscriptions)
    .where(and(eq(alertSubscriptions.id, id), eq(alertSubscriptions.userId, viewer.userId)))
    .returning({ id: alertSubscriptions.id });
  return NextResponse.json({ ok: gone.length > 0 });
}
