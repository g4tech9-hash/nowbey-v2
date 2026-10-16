import { NextResponse, after } from "next/server";
import { db } from "@/db";
import { postPhotos, posts } from "@/db/schema";
import { findOrCreatePlace } from "@/lib/places";
import { badgesFor } from "@/lib/badges";
import { PARISHES, inBahamas, resolveParish } from "@/lib/geo";
import { PhotoError, processPhoto, type ProcessedPhoto } from "@/lib/images";
import { autoFlagPost, screenPhotos } from "@/lib/moderation";
import { engagementFor } from "@/lib/engage";
import { NO_ENGAGEMENT } from "@/lib/engage-kinds";
import { KINDS, LIMITS, isKind, listPosts, publicPost } from "@/lib/life";
import { clientIp, exhausted, hit, record, tooMany } from "@/lib/ratelimit";
import { clampInt, text } from "@/lib/validate";
import { getViewer } from "@/lib/viewer";


export const runtime = "nodejs";

const MAX_REQUEST_BYTES = 14 * 1024 * 1024;
const MAX_PHOTO_BYTES = 8 * 1024 * 1024;
const HOUR = 60 * 60_000;

const bad = (error: string, status = 400) => NextResponse.json({ error }, { status });

export async function GET(req: Request) {
  const sp = new URL(req.url).searchParams;
  const kindRaw = sp.get("kind");
  const parishRaw = sp.get("parish");
  const kind = isKind(kindRaw) ? kindRaw : null;
  const parish = parishRaw && (PARISHES as readonly string[]).includes(parishRaw) ? parishRaw : null;
  const sort = sp.get("sort") === "loved" ? "loved" : "new";

  const viewer = await getViewer();
  const { rows, total, page, pages } = await listPosts({
    kind,
    parish,
    sort,
    page: clampInt(sp.get("page"), 1, 1, 10000),
    perPage: clampInt(sp.get("limit"), 12, 1, 30),
  });
  const [engMap, badges] = await Promise.all([engagementFor("post", rows.map((r) => r.id), viewer.userId), badgesFor(rows.map((r) => r.authorHandle))]);

  return NextResponse.json({
    posts: rows.map((r) => {
      const e = engMap.get(r.id) ?? NO_ENGAGEMENT;
      return {
        ...publicPost(r),
        // likeCount is the total of every reaction; likedByMe stays for older copies of the mobile app.
        likeCount: e.total,
        commentCount: e.comments,
        reactions: e.counts,
        myReaction: e.mine,
        likedByMe: e.mine === "like",
        authorBadge: badges.get(r.authorHandle) ?? null,
      };
    }),
    total,
    page,
    pages,
  });
}

export async function POST(req: Request) {
  const viewer = await getViewer();
  if (!viewer.signedIn || !viewer.userId || !viewer.handle) return bad("Sign in to share an experience.", 401);

  // Counted only after a post succeeds, so fixing a typo does not use up your allowance.
  const userKey = `life:u:${viewer.userId}`;
  const ipKey = `life:ip:${clientIp(req)}`;
  const u = exhausted(userKey, 6, HOUR);
  if (u.blocked) return tooMany(u.retryAfter, "posts");
  const i = exhausted(ipKey, 15, HOUR);
  if (i.blocked) return tooMany(i.retryAfter, "posts");
  // Every attempt counts here, even a failed one, so a stream of bad uploads cannot keep the server busy decoding photos.
  const attempts = hit(`life:try:${viewer.userId}`, 40, HOUR);
  if (!attempts.ok) return tooMany(attempts.retryAfter, "upload attempts");

  const length = Number(req.headers.get("content-length") ?? "0");
  if (!Number.isFinite(length) || length <= 0) return bad("Send the post as a form.", 411);
  if (length > MAX_REQUEST_BYTES) return bad("That is too much to upload at once. Try fewer or smaller photos.", 413);

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return bad("We could not read that upload. Please try again.");
  }
  let input: Record<string, unknown>;
  try {
    const parsed = JSON.parse(String(form.get("data") ?? ""));
    if (!parsed || typeof parsed !== "object") throw new Error("not an object");
    input = parsed as Record<string, unknown>;
  } catch {
    return bad("We could not read that post. Please try again.");
  }

  const kind = input.kind;
  if (!isKind(kind)) return bad("Choose what kind of post this is.");
  const def = KINDS[kind];

  const title = text(input.title, LIMITS.title);
  if (title.length < 5) return bad("Give your post a headline of at least 5 characters.");
  const body = text(input.body, LIMITS.body);
  if (body.length < LIMITS.minBody) return bad(`Tell us a little more. At least ${LIMITS.minBody} characters.`);
  const placeName = text(input.placeName, LIMITS.place);
  if (def.placeRequired && placeName.length < 2) return bad(`Add the ${def.placeLabel.toLowerCase()}.`);

  let rating: number | null = null;
  if (def.rating) {
    const r = Math.round(Number(input.rating));
    if (!Number.isFinite(r) || r < 1 || r > 5) return bad("Give it a star rating from 1 to 5.");
    rating = r;
  }
  let priceLevel: number | null = null;
  if (def.price && input.priceLevel !== null && input.priceLevel !== undefined && input.priceLevel !== "") {
    const p = Math.round(Number(input.priceLevel));
    if (!Number.isFinite(p) || p < 1 || p > 4) return bad("Pick a price from $ to $$$$.");
    priceLevel = p;
  }

  const hasLat = input.lat !== null && input.lat !== undefined && input.lat !== "";
  const hasLng = input.lng !== null && input.lng !== undefined && input.lng !== "";
  let lat: number | null = null;
  let lng: number | null = null;
  if (hasLat || hasLng) {
    lat = Number(input.lat);
    lng = Number(input.lng);
    if (!hasLat || !hasLng || !Number.isFinite(lat) || !Number.isFinite(lng)) return bad("The map pin is not valid. Remove it or place it again.");
    if (!inBahamas(lat, lng)) return bad("That pin is outside The Bahamas. Move it back onto the islands, or remove it.");
  }
  let parish: string;
  if (lat !== null && lng !== null) parish = resolveParish(input.parish, lat, lng);
  else if (typeof input.parish === "string" && (PARISHES as readonly string[]).includes(input.parish)) parish = input.parish;
  else return bad("Pick the island this is on.");

  const files = form.getAll("photos").filter((f): f is File => typeof f !== "string" && f.size > 0);
  if (files.length > LIMITS.photos) return bad(`You can add up to ${LIMITS.photos} photos.`);
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

  // Gemini safe-check on the thumbnails (no-op without a key; fails open when the model is down).
  const photoProblem = await screenPhotos(processed);
  if (photoProblem) return bad(photoProblem);

  const post = await db.transaction(async (tx) => {
    const placeId = placeName.length >= 2 ? await findOrCreatePlace(tx, { name: placeName, kind, parish, lat, lng, street: text(input.street, 120) || null }) : null;
    const [row] = await tx
      .insert(posts)
      .values({
        placeId,
        userId: viewer.userId as string,
        authorHandle: viewer.handle as string,
        kind,
        placeName: placeName || null,
        title,
        body,
        rating,
        priceLevel,
        parish,
        lat,
        lng,
        street: text(input.street, 120) || null,
        photoCount: processed.length,
      })
      .returning();
    for (const [position, p] of processed.entries()) {
      await tx.insert(postPhotos).values({ postId: row.id, position, data: p.data, thumb: p.thumb, width: p.width, height: p.height, bytes: p.data.length });
    }
    return row;
  });

  record(userKey, HOUR);
  record(ipKey, HOUR);
  // The post is live now; the AI first pass (no-op without a key) can only add a staff flag.
  after(() => autoFlagPost(post.id));
  return NextResponse.json({ post: publicPost(post) }, { status: 201 });
}
