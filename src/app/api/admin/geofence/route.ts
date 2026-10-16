/**
 * Geospatial Notification: an admin-authored alert to every device inside a
 * radius, rather than to an island or a category.
 *
 * The public report flow pushes incidents through dispatchIncidentPush(), which
 * matches by parish + category. That is right for a report a member filed and
 * wrong for "avoid Bay Street for the next hour" -- which needs a circle on a
 * map. dispatchGeofencePush() in src/lib/push.ts does the distance matching;
 * this route is the form behind it.
 *
 * POST /api/admin/geofence   { title, body, lat, lng, radiusMiles }
 */

import { NextResponse } from "next/server";
import { db } from "@/db";
import { incidents } from "@/db/schema";
import { audit } from "@/lib/audit";
import { publicBase } from "@/lib/billing";
import { dispatchGeofencePush, pushConfigured } from "@/lib/push";
import { withinMiles } from "@/lib/geo-distance";
import { requireStaff } from "@/lib/staff";
import { sql } from "drizzle-orm";
import { numOrNull, readJson, text } from "@/lib/validate";

/** A radius outside this range is a typo, not an instruction. */
const MIN_RADIUS_MILES = 1;
const MAX_RADIUS_MILES = 100;

const fail = (error: string, status = 409) => NextResponse.json({ error }, { status });

export async function POST(req: Request) {
  const gate = await requireStaff("admin");
  if (gate.error) return gate.error;
  const actorName = gate.viewer.handle ?? "admin";

  // Say so plainly rather than reporting zero recipients, which reads as "nobody
  // is there" when the truth is "push is not switched on".
  if (!pushConfigured()) {
    return fail("Push notifications are not configured. Set the FIREBASE_* server keys first.", 400);
  }

  const body = await readJson(req);
  const title = text(body.title, 100);
  const description = text(body.description, 500);
  const lat = numOrNull(body.lat);
  const lng = numOrNull(body.lng);
  const radiusMiles = numOrNull(body.radiusMiles);

  if (title.length < 3) return fail("Give the alert a title.", 400);
  if (description.length < 10) return fail("Describe what people should do.", 400);
  if (lat === null || lng === null) return fail("Pick the centre point on the map.", 400);
  if (lat < -90 || lat > 90) return fail("Latitude is out of range.", 400);
  if (lng < -180 || lng > 180) return fail("Longitude is out of range.", 400);
  if (radiusMiles === null || radiusMiles < MIN_RADIUS_MILES || radiusMiles > MAX_RADIUS_MILES) {
    return fail(`Radius must be between ${MIN_RADIUS_MILES} and ${MAX_RADIUS_MILES} miles.`, 400);
  }

  const base = publicBase(req);
  // The notification has to land somewhere. Without a base URL the tap target
  // would be a broken link, so refuse rather than send a dead end.
  if (!base) return fail("Set APP_URL in Vercel so the alert can link somewhere.", 400);

  const stats = await dispatchGeofencePush({
    title,
    body: description,
    lat,
    lng,
    radiusMiles,
    link: `${base}/alerts`,
  });

  await audit(
    actorName,
    "geofence.send",
    "setting",
    null,
    title,
    `${lat.toFixed(4)},${lng.toFixed(4)} r=${stats.radiusMiles}mi · matched ${stats.matched}, sent ${stats.sent}, skipped ${stats.skipped}, failed ${stats.failed}`,
  );

  return NextResponse.json({ ok: true, stats });
}

/**
 * Active incidents near a point, so the composer's map can show what is already
 * happening where the admin is about to broadcast. Read-only and admin-gated.
 *
 * GET /api/admin/geofence?lat=..&lng=..&miles=..
 */
export async function GET(req: Request) {
  const gate = await requireStaff("admin");
  if (gate.error) return gate.error;

  const url = new URL(req.url);
  const miles = Math.min(Math.max(Number(url.searchParams.get("miles") ?? 15), 1), 100);
  const lat = numOrNull(url.searchParams.get("lat"));
  const lng = numOrNull(url.searchParams.get("lng"));

  // With no centre point, return the live picture island-wide instead of an
  // empty result -- the map still has something to show.
  if (lat === null || lng === null) {
    const rows = await db
      .select({
        id: incidents.id,
        title: incidents.title,
        status: incidents.status,
        severity: incidents.severity,
        lat: incidents.lat,
        lng: incidents.lng,
        createdAt: incidents.createdAt,
      })
      .from(incidents)
      .orderBy(incidents.createdAt)
      .limit(200);
    return NextResponse.json({ incidents: rows, radiusMiles: miles });
  }

  // A bounding box first, then an exact circle in JS. The box is what the index
  // can use; the circle is what the admin asked for. One degree is ~69 miles,
  // which makes the box generous without pulling the whole table.
  const dLat = miles / 69;
  const dLng = miles / (69 * Math.cos((lat * Math.PI) / 180) || 1);
  const rows = await db
    .select({
      id: incidents.id,
      title: incidents.title,
      status: incidents.status,
      severity: incidents.severity,
      lat: incidents.lat,
      lng: incidents.lng,
      createdAt: incidents.createdAt,
    })
    .from(incidents)
    .where(
      sql`${incidents.lat} between ${lat - dLat} and ${lat + dLat}
          and ${incidents.lng} between ${lng - dLng} and ${lng + dLng}`,
    )
    .limit(400);

  // Exact circle, so a corner of the box is not reported as inside the radius.
  // Same predicate the push matcher uses, so the map and the alert agree.
  const inside = rows.filter((r) => withinMiles(lat, lng, r.lat, r.lng, miles));

  return NextResponse.json({ incidents: inside, radiusMiles: miles });
}
