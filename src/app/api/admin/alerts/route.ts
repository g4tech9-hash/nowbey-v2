import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { alertSubscriptions } from "@/db/schema";
import { dispatchCustomAlerts } from "@/lib/alerts";
import { audit } from "@/lib/audit";
import { publicBase } from "@/lib/billing";
import { milesToMeters, validateCustomAlert } from "@/lib/command";
import { haversineMeters, nearestParish } from "@/lib/geo";
import { dispatchCustomPush } from "@/lib/push";
import { clientIp, hit, tooMany } from "@/lib/ratelimit";
import { requireStaff } from "@/lib/staff";
import { readJson } from "@/lib/validate";


/**
 * Custom geofenced blasts. ADMIN ONLY — this emails and pushes real people, so it sits behind
 * the admin gate (not editor), a 5-per-hour rate limit, and a confirm screen on the page.
 *
 * AUTH: requireStaff("admin") below is the gate (session cookie → src/lib/viewer.ts). To move
 * staff auth to an external middleware, replace that one call.
 *
 * GET ?lat=&lng=&radiusMiles= previews the audience (counts only, sends nothing).
 * POST {title, body, lat, lng, radiusMiles} sends. Both validate the same input.
 */
export async function GET(req: Request) {
  const gate = await requireStaff("admin");
  if (gate.error) return gate.error;
  const { searchParams } = new URL(req.url);
  const v = validateCustomAlert({
    title: "preview",
    body: "preview preview",
    lat: searchParams.get("lat"),
    lng: searchParams.get("lng"),
    radiusMiles: searchParams.get("radiusMiles"),
  });
  if ("error" in v) return NextResponse.json({ error: v.error }, { status: 400 });
  const { count } = await audience(v.lat, v.lng, v.radiusMiles);
  return NextResponse.json({ ok: true, audience: count, parish: nearestParish(v.lat, v.lng) });
}

export async function POST(req: Request) {
  const gate = await requireStaff("admin");
  if (gate.error) return gate.error;
  const actorName = gate.viewer.handle ?? "admin";
  const rl = hit(`admin:blast:${clientIp(req)}`, 5, 60 * 60_000);
  if (!rl.ok) return tooMany(rl.retryAfter, "custom alerts");

  const body = await readJson(req);
  const v = validateCustomAlert({ title: body.title, body: body.body, lat: body.lat, lng: body.lng, radiusMiles: body.radiusMiles });
  if ("error" in v) return NextResponse.json({ error: v.error }, { status: 400 });
  const base = publicBase(req);
  if (!base) return NextResponse.json({ error: "Set APP_URL in Vercel so alert links work." }, { status: 400 });

  const email = await dispatchCustomAlerts(v, base);
  let push = null;
  try {
    push = await dispatchCustomPush(nearestParish(v.lat, v.lng), v.title, v.body, `${base}/map`, base);
  } catch (e) {
    console.error("custom push failed", e instanceof Error ? e.message : e);
  }
  await audit(
    actorName,
    "alert.custom",
    "alert",
    `${v.lat.toFixed(4)},${v.lng.toFixed(4)}`,
    `“${v.title}” (${v.radiusMiles} mi) — email ${email.sent}/${email.matched}${push ? `, push ${push.sent}` : ""}${email.capped ? ", CAPPED" : ""}`,
  );
  return NextResponse.json({ ok: true, email, push });
}

/** Counts who a blast would reach, using the same matching rules as the send. Sends nothing. */
async function audience(lat: number, lng: number, radiusMiles: number): Promise<{ count: number }> {
  const radiusM = milesToMeters(radiusMiles);
  const parish = nearestParish(lat, lng);
  const rows = await db
    .select({ lat: alertSubscriptions.lat, lng: alertSubscriptions.lng, parishes: alertSubscriptions.parishes })
    .from(alertSubscriptions)
    .where(
      and(eq(alertSubscriptions.verified, true), eq(alertSubscriptions.active, true), eq(alertSubscriptions.channel, "email")),
    );
  let count = 0;
  for (const sub of rows) {
    const hasCentre = typeof sub.lat === "number" && typeof sub.lng === "number" && Number.isFinite(sub.lat) && Number.isFinite(sub.lng);
    if (hasCentre) {
      if (haversineMeters([sub.lat as number, sub.lng as number], [lat, lng]) <= radiusM) count += 1;
    } else if (sub.parishes.split(",").map((s) => s.trim()).includes(parish)) {
      count += 1;
    }
  }
  return { count };
}
