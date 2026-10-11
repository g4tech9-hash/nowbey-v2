import { eq } from "drizzle-orm";
import { db } from "@/db";
import { postPhotos, posts } from "@/db/schema";
import { UUID_RE } from "@/lib/validate";
import { getViewer } from "@/lib/viewer";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const notFound = () => new Response("Not found", { status: 404, headers: { "Cache-Control": "no-store" } });

/** Serves a member's photo. Everything stored here was re-encoded as a JPEG when it was uploaded. */
export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  if (!UUID_RE.test(id)) return notFound();
  const thumb = new URL(req.url).searchParams.get("size") === "thumb";

  const [row] = await db
    .select({ data: thumb ? postPhotos.thumb : postPhotos.data, status: posts.status, author: posts.userId })
    .from(postPhotos)
    .innerJoin(posts, eq(posts.id, postPhotos.postId))
    .where(eq(postPhotos.id, id))
    .limit(1);
  if (!row) return notFound();

  // Photos on a hidden post are only for staff and the person who posted them.
  const published = row.status === "published";
  if (!published) {
    const viewer = await getViewer();
    if (!viewer.isEditor && viewer.userId !== row.author) return notFound();
  }

  const etag = `W/"${id}-${thumb ? "t" : "f"}"`;
  if (published && req.headers.get("if-none-match") === etag) {
    return new Response(null, { status: 304, headers: { ETag: etag, "Cache-Control": "public, max-age=3600" } });
  }
  return new Response(new Uint8Array(row.data), {
    headers: {
      "Content-Type": "image/jpeg",
      "Content-Length": String(row.data.length),
      "Cache-Control": published ? "public, max-age=3600" : "private, no-store",
      ...(published ? { ETag: etag } : {}),
      "X-Content-Type-Options": "nosniff",
      "Content-Disposition": "inline",
      "Cross-Origin-Resource-Policy": "cross-origin",
    },
  });
}
