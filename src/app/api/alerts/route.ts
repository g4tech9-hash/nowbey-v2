import { NextResponse } from "next/server";
import { createHash, randomBytes } from "node:crypto";
import { and, eq, gte, or, sql } from "drizzle-orm";
import { db } from "@/db";
import { alertSubscriptions } from "@/db/schema";
import { CATEGORY_KEYS, PARISHES, inBahamas } from "@/lib/geo";
import { getViewer } from "@/lib/viewer";
import { publicBase } from "@/lib/billing";
import { emailButton, emailLayout, sendMail } from "@/lib/mail";
import { clientIp, hit, tooMany } from "@/lib/ratelimit";
import { badOrigin, hasBadOrigin } from "@/lib/http";
import { EMAIL_RE, clampInt, numOrNull, text, readJson, dbInt } from "@/lib/validate";



export async function POST(req: Request) {
  if (hasBadOrigin(req)) return badOrigin();
  // Every request here sends an email to an address the visitor typed, so it must not be usable to spam someone.
  const gate = hit(`alert:${clientIp(req)}`, 6, 60 * 60_000);
  if (!gate.ok) return tooMany(gate.retryAfter, "alert sign-ups");

  const viewer = await getViewer();
  const body = await readJson(req);

  if (String(body.channel ?? "email") !== "email") {
    return NextResponse.json({ error: "Push and text alerts are coming soon. Email alerts work today." }, { status: 400 });
  }
  const target = text(body.target, 160).toLowerCase();
  if (!EMAIL_RE.test(target)) {
    return NextResponse.json({ error: "That email address does not look right." }, { status: 400 });
  }

  const base = publicBase(req);
  if (!base) {
    return NextResponse.json({ error: "Email alerts are not fully set up on this server yet. Please try again later." }, { status: 503 });
  }

  const islands = (Array.isArray(body.parishes) ? body.parishes : []).filter((p: unknown): p is string =>
    (PARISHES as readonly string[]).includes(String(p)),
  );
  const parishes = [...new Set<string>(islands)].length ? [...new Set<string>(islands)] : ["New Providence"];
  const categories = [
    ...new Set<string>(
      (Array.isArray(body.categories) ? body.categories : []).filter((c: unknown): c is string => (CATEGORY_KEYS as readonly string[]).includes(String(c))),
    ),
  ];

  const paid = viewer.tier !== null;
  if (!paid && parishes.length > 1) {
    return NextResponse.json(
      { error: "The free plan covers one island. Pick one, or choose a plan for as many as you like." },
      { status: 402 },
    );
  }

  // Optional geofence centre: only kept when it is a real point inside The Bahamas.
  const rawLat = numOrNull(body.lat);
  const rawLng = numOrNull(body.lng);
  const hasCentre = rawLat !== null && rawLng !== null && inBahamas(rawLat, rawLng);
  const lat = hasCentre ? rawLat : null;
  const lng = hasCentre ? rawLng : null;
  // Radius only matters with a centre; 2–100 km, default 12 km (the column default).
  const radiusKm = hasCentre ? clampInt(body.radiusKm ?? body.radius_km, 12, 2, 100) : 12;

  // One confirmation email per address every couple of minutes.
  const [recent] = await db
    .select({ id: alertSubscriptions.id })
    .from(alertSubscriptions)
    .where(
      and(
        eq(alertSubscriptions.target, target),
        eq(alertSubscriptions.verified, false),
        gte(alertSubscriptions.createdAt, new Date(Date.now() - 2 * 60_000)),
      ),
    )
    .limit(1);
  if (recent) {
    return NextResponse.json({ error: "We just sent a confirmation to that address. Check your inbox (and spam) before asking again." }, { status: 429 });
  }

  if (!paid) {
    // Free accounts get one profile in total; visitors without an account get one per email address.
    const [{ n }] = await db
      .select({ n: sql<number>`count(*)::int` })
      .from(alertSubscriptions)
      .where(
        viewer.userId
          ? and(eq(alertSubscriptions.userId, viewer.userId), eq(alertSubscriptions.verified, true))
          : and(eq(alertSubscriptions.target, target), eq(alertSubscriptions.verified, true)),
      );
    if (n >= 1) {
      return NextResponse.json(
        { error: "The free plan includes one alert profile. Remove the old one first, or choose a plan." },
        { status: 402 },
      );
    }
  }

  // A fresh request replaces any profile for this address that was never confirmed.
  await db.delete(alertSubscriptions).where(and(eq(alertSubscriptions.target, target), eq(alertSubscriptions.verified, false)));

  const token = randomBytes(18).toString("base64url");
  const tokenHash = createHash("sha256").update(token).digest("hex");
  await db.insert(alertSubscriptions).values({
    channel: "email",
    target,
    parishes: parishes.join(","),
    categories: categories.join(","),
    radiusKm,
    lat,
    lng,
    token,
    tokenHash,
    tokenExpiresAt: new Date(Date.now() + 7 * 24 * 60 * 60_000),
    userId: viewer.userId,
  });

  const confirm = `${base}/api/alerts/verify?token=${token}`;
  const mail = await sendMail({
    to: target,
    subject: "Confirm your NowBey alerts",
    kind: "alert-confirm",
    html: emailLayout(
      "Confirm your alerts",
      `<p style="margin:0;font-size:14px;line-height:1.55;color:#cfeee9">Tap the button to switch on NowBey alerts for ${parishes.join(", ")}. If you did not ask for this, ignore this email and nothing will be sent.</p>${emailButton(confirm, "Yes, send me alerts")}`,
    ),
    text: `Confirm your NowBey alerts for ${parishes.join(", ")}: ${confirm}\n\nIf you did not ask for this, ignore this email.`,
  });

  return NextResponse.json({ ok: true, mail: mail.status }, { status: 201 });
}

/** Stop an alert profile: with the secret token from an email, or by id while signed in as its owner. */
export async function DELETE(req: Request) {
  if (hasBadOrigin(req)) return badOrigin();
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
