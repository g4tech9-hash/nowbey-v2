import { NextResponse } from "next/server";
import { asc, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { placePhotos, places } from "@/db/schema";
import { inBahamas } from "@/lib/geo";
import { PhotoError, processPhoto, type ProcessedPhoto } from "@/lib/images";
import { listPosts, publicPost } from "@/lib/life";
import { cleanHours, parseHours } from "@/lib/places";
import { exhausted, hit, record, tooMany } from "@/lib/ratelimit";
import { UUID_RE, readJson, text } from "@/lib/validate";
import { getViewer } from "@/lib/viewer";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const HOUR = 60 * 60_000;
const MAX_PHOTOS_PER_PLACE = 40;
const MAX_PHOTO_BYTES = 8 * 1024 * 1024;
const bad = (error: string, status = 400) => NextResponse.json({ error }, { status });

type Ctx = { params: Promise<{ id: string }> };

/** The place page's data: details, photos, reviews and the average rating. Anyone can read it. */
export async function GET(_req: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  if (!UUID_RE.test(id)) return bad("Unknown place.", 404);
  const [place] = await db.select().from(places).where(eq(places.id, id)).limit(1);
  if (!place) return bad("Unknown place.", 404);

  const [photos, reviews, stats] = await Promise.all([
    db
      .select({ id: placePhotos.id, kind: placePhotos.kind, width: placePhotos.width, height: placePhotos.height })
      .from(placePhotos)
      .where(eq(placePhotos.placeId, id))
      .orderBy(asc(placePhotos.position), asc(placePhotos.createdAt)),
    listPosts({ placeId: id, perPage: 20 }),
    db.execute(sql`
      with latest as (
        select distinct on (user_id) user_id, rating from posts
        where place_id = ${id} and status = 'published'
        order by user_id, created_at desc)
      select count(rating)::int as ratings, round(avg(rating)::numeric, 1)::float as avg from latest`),
  ]);
  const s = (stats.rows[0] ?? { ratings: 0, avg: null }) as { ratings: number; avg: number | null };

  return NextResponse.json({
    place: {
      id: place.id,
      name: place.name,
      kind: place.kind,
      parish: place.parish,
      address: place.address,
      lat: place.lat,
      lng: place.lng,
      hours: parseHours(place.hours),
      menuText: place.menuText,
      updatedAt: place.updatedAt,
    },
    photos,
    reviews: reviews.rows.map((r) => publicPost(r)),
    stats: { ratings: s.ratings, avg: s.avg },
  });
}

/** Members can fill in or correct a place. Every change is recorded with the handle that made it. */
export async function PATCH(req: Request, ctx: Ctx) {
  const viewer = await getViewer();
  if (!viewer.signedIn || !viewer.userId || !viewer.handle) return bad("Sign in to update a place.", 401);
  const { id } = await ctx.params;
  if (!UUID_RE.test(id)) return bad("Unknown place.", 404);
  const gate = exhausted(`placeedit:${viewer.userId}`, 30, HOUR);
  if (gate.blocked) return tooMany(gate.retryAfter, "updates");

  const [place] = await db.select({ id: places.id, lat: places.lat }).from(places).where(eq(places.id, id)).limit(1);
  if (!place) return bad("Unknown place.", 404);
  const body = await readJson(req);

  const patch: Partial<typeof places.$inferInsert> = { lastEditedBy: viewer.handle, updatedAt: new Date() };
  if ("address" in body) patch.address = text(body.address, 160) || null;
  if ("hours" in body) patch.hours = JSON.stringify(cleanHours(body.hours));
  if ("menuText" in body) patch.menuText = text(body.menuText, 4000) || null;
  // A location is only added where the place has none yet. Moving a place is for staff.
  if (place.lat === null && typeof body.lat === "number" && typeof body.lng === "number") {
    if (!inBahamas(body.lat, body.lng)) return bad("That pin is outside The Bahamas.");
    patch.lat = body.lat;
    patch.lng = body.lng;
  }

  await db.update(places).set(patch).where(eq(places.id, id));
  record(`placeedit:${viewer.userId}`, HOUR);
  return NextResponse.json({ ok: true });
}

/** Adds photos to a place: general photos or the menu. Photos are re-encoded as JPEG, as with reviews. */
export async function POST(req: Request, ctx: Ctx) {
  const viewer = await getViewer();
  if (!viewer.signedIn || !viewer.userId || !viewer.handle) return bad("Sign in to add photos.", 401);
  const { id } = await ctx.params;
  if (!UUID_RE.test(id)) return bad("Unknown place.", 404);
  const gate = exhausted(`placephoto:${viewer.userId}`, 60, HOUR);
  if (gate.blocked) return tooMany(gate.retryAfter, "photo uploads");

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return bad("We could not read that upload. Please try again.");
  }
  const kind = form.get("kind") === "menu" ? "menu" : "photo";
  const files = form.getAll("photos").filter((f): f is File => typeof f !== "string" && f.size > 0);
  if (!files.length) return bad("Choose at least one photo.");
  if (files.length > 6) return bad("You can add up to 6 photos at a time.");

  const [{ n }] = await db.select({ n: sql<number>`count(*)::int` }).from(placePhotos).where(eq(placePhotos.placeId, id));
  if (n + files.length > MAX_PHOTOS_PER_PLACE) return bad(`A place can have up to ${MAX_PHOTOS_PER_PLACE} photos.`);

  const processed: ProcessedPhoto[] = [];
  try {
    for (const f of files) {
      if (f.size > MAX_PHOTO_BYTES) return bad("One of your photos is too large. Photos can be up to 8 MB.", 413);
      processed.push(await processPhoto(Buffer.from(await f.arrayBuffer())));
    }
  } catch (e) {
    if (e instanceof PhotoError) return bad(e.message);
    throw e;
  }

  await db.insert(placePhotos).values(
    processed.map((p, i) => ({
      placeId: id,
      kind,
      position: n + i,
      data: p.data,
      thumb: p.thumb,
      width: p.width,
      height: p.height,
      bytes: p.data.length,
      uploadedBy: viewer.handle,
    })),
  );
  record(`placephoto:${viewer.userId}`, HOUR);
  return NextResponse.json({ ok: true, added: processed.length }, { status: 201 });
}
