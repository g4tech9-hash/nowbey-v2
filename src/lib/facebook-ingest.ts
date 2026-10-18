/*
 * Admin-configured Facebook pages → regular wire stories.
 *
 * The page list lives in site_settings ("fb_pages"), edited on /admin/wire. Each refresh,
 * every configured page is run through the Facebook→RSS converter (src/lib/facebook.ts)
 * and its posts are inserted into news_items — the same table the other news feeds use —
 * so Facebook posts appear inline on /wire with the same cards, categories, map pins and
 * alert candidacy as any other story. Deduplication is the unique url column, exactly like
 * the newspaper ingest.
 */
import { db } from "@/db";
import { newsItems } from "@/db/schema";
import { getAuxSetting } from "@/lib/settings";
import { fetchFacebookPosts, fbPagesFromValue, type FbPost } from "@/lib/facebook";
import { DEFAULT_FB_PAGE, fbPostToNewsRow } from "@/lib/facebook-ingest-core";

export { DEFAULT_FB_PAGE };

/** Admin list first; when nothing is configured yet, fall back to FB_WIRE_PAGE / the default. */
export async function configuredFbPageList(env: NodeJS.ProcessEnv = process.env): Promise<{ username: string; pageName: string }[]> {
  const saved = await getAuxSetting("fb_pages");
  const pages = fbPagesFromValue(saved, env);
  if (pages.length) return pages;
  const fallback = (env.FB_WIRE_PAGE ?? "").trim() || DEFAULT_FB_PAGE;
  return fbPagesFromValue(fallback, env);
}

export type FacebookIngestStats = {
  pages: { username: string; pageName: string; found: number; inserted: number; note: string }[];
  inserted: number;
  ranAt: string;
};

/** Refresh every configured page. Never throws — a broken page lands in stats, like the other feeds. */
export async function runFacebookIngest(opts: { limit?: number } = {}): Promise<FacebookIngestStats> {
  const perPage = Math.min(15, Math.max(1, opts.limit ?? 8));
  const stats: FacebookIngestStats = { pages: [], inserted: 0, ranAt: new Date().toISOString() };
  const pages = await configuredFbPageList();

  await Promise.all(
    pages.map(async (page) => {
      let posts: FbPost[] = [];
      let note = "";
      try {
        const res = await fetchFacebookPosts(page.username, process.env, 9000);
        posts = res.posts;
        note = `${res.source.kind}: ${res.note}`;
      } catch (err) {
        note = err instanceof Error ? err.message : String(err);
      }
      let inserted = 0;
      for (const post of posts.slice(0, perPage)) {
        try {
          const [row] = await db
            .insert(newsItems)
            .values(fbPostToNewsRow(post, page.pageName))
            .onConflictDoNothing()
            .returning({ id: newsItems.id });
          if (row) inserted += 1;
        } catch (err) {
          console.error(`[fb] insert failed for @${page.username}: ${err instanceof Error ? err.message : err}`);
        }
      }
      console.log(`[fb] @${page.username}: ${posts.length} found, ${inserted} inserted (${note})`);
      stats.pages.push({ username: page.username, pageName: page.pageName, found: posts.length, inserted, note });
      stats.inserted += inserted;
    }),
  );
  return stats;
}
