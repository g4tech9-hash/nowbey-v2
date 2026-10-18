/*
 * Facebook page → RSS 2.0 conversion endpoint.
 *
 *   GET /api/rss/facebook?url=https://www.facebook.com/mybpl242/
 *   GET /api/rss/facebook?page=mybpl242
 *   GET /api/rss/facebook              → first admin-configured page (site setting "fb_pages")
 *
 * Answers application/rss+xml. The page's posts are resolved through a configured
 * bridge (FB_RSS_BRIDGES) when one exists, otherwise Facebook's public mobile page
 * is parsed directly (best effort — see src/lib/facebook.ts). Either way the output
 * is normalized strict RSS 2.0, machine-checked by qa/rss-qa/validate.mjs. The same
 * admin list also feeds stories onto the wire (src/lib/facebook-ingest.ts).
 */
import { NextResponse } from "next/server";
import { configuredFbPageList } from "@/lib/facebook-ingest";
import { fbUsernameFromUrl, fetchFacebookPosts, postsToRssXml } from "@/lib/facebook";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const target = searchParams.get("url") ?? searchParams.get("page") ?? (await configuredFbPageList())[0]?.username ?? "";
  const username = fbUsernameFromUrl(target);
  if (!username) {
    return NextResponse.json(
      {
        ok: false,
        error:
          "Provide a public Facebook page link: /api/rss/facebook?url=https://www.facebook.com/mybpl242/ (or ?page=mybpl242). Only facebook.com page/profile links are accepted.",
      },
      { status: 400 },
    );
  }

  const { posts, source, note } = await fetchFacebookPosts(username);
  const xml = postsToRssXml({
    username,
    pageName: source.pageName,
    posts,
    selfUrl: new URL(request.url).toString(),
    sourceNote: `source: ${source.kind}; ${note}; posts: ${posts.length}`,
  });
  return new Response(xml, {
    status: 200,
    headers: {
      "Content-Type": "application/rss+xml; charset=utf-8",
      "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600",
    },
  });
}
