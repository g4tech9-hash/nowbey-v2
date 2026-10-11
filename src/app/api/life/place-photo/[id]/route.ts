import { eq } from "drizzle-orm";
import { db } from "@/db";
import { placePhotos } from "@/db/schema";
import { UUID_RE } from "@/lib/validate";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** Serves a place photo. Place photos are public, so they are cached. */
export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const miss = () => new Response("Not found", { status: 404, headers: { "Cache-Control": "no-store" } });
  if (!UUID_RE.test(id)) return miss();
  const thumb = new URL(req.url).searchParams.get("size") === "thumb";
  const [row] = await db
    .select({ data: thumb ? placePhotos.thumb : placePhotos.data })
    .from(placePhotos)
    .where(eq(placePhotos.id, id))
    .limit(1);
  if (!row) return miss();
  return new Response(new Uint8Array(row.data), {
    headers: { "Content-Type": "image/jpeg", "Content-Length": String(row.data.length), "Cache-Control": "public, max-age=86400" },
  });
}
