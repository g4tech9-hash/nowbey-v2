/*
 * Admin-configured Facebook pages → regular wire stories.
 *
 * The page list lives in site_settings ("fb_pages"), edited on /admin/wire. Each refresh,
 * every configured page is run through the Facebook→RSS converter (src/lib/facebook.ts)
 * and its posts are inserted into news_items — the same table the other news feeds use —
 * so Facebook posts appear inline on /wire with the same cards, categories, map pins and
 * alert candidacy as any other story. Deduplication is the unique url column, exactly like
 * the newspaper ingest.
 *
 * Facebook serves a login wall to hosting IPs, so the reliable source is a bridge feed
 * (rss.app / fetchrss / a self-hosted RSS-Bridge). Admins can paste one per page on
 * /admin/wire; it is stored in site_settings ("fb_bridges") and takes effect on the next
 * refresh. FB_RSS_BRIDGES stays as the server-level fallback, and the outcome of every
 * refresh — including the converter's diagnosis — is saved as "fb_ingest_status" so the
 * admin page can show why a page is (or is not) producing stories.
 */
import { db } from "@/db";
import { newsItems } from "@/db/schema";
import { getAuxSetting, saveSetting } from "@/lib/settings";
import { fetchFacebookPosts, fbBridgesFromValue, fbPagesFromValue, type FbPost } from "@/lib/facebook";
import { DEFAULT_FB_PAGE, fbPostToNewsRow, parseFbIngestStatus, type FbIngestPageResult, type FbIngestStatus } from "@/lib/facebook-ingest-core";

export { DEFAULT_FB_PAGE, parseFbIngestStatus };
export type { FbIngestStatus };

/** Admin list first; when nothing is configured yet, fall back to FB_WIRE_PAGE / the default. */
export async function configuredFbPageList(env: NodeJS.ProcessEnv = process.env): Promise<{ username: string; pageName: string }[]> {
  const saved = await getAuxSetting("fb_pages");
  const pages = fbPagesFromValue(saved, env);
  if (pages.length) return pages;
  const fallback = (env.FB_WIRE_PAGE ?? "").trim() || DEFAULT_FB_PAGE;
  return fbPagesFromValue(fallback, env);
}

/** Bridge feeds pasted by an admin (site setting "fb_bridges"). Never throws. */
export async function configuredFbBridges(): Promise<Record<string, string>> {
  try {
    return fbBridgesFromValue(await getAuxSetting("fb_bridges"));
  } catch {
    return {};
  }
}

/**
 * The converter with the admin bridges applied. Both the RSS endpoint and the wire ingest go
 * through this, so a bridge pasted on /admin/wire lights up the feed and the stories together.
 */
export async function fetchFacebookPostsConfigured(username: string, timeoutMs = 9000) {
  return fetchFacebookPosts(username, process.env, timeoutMs, await configuredFbBridges());
}

export type FacebookIngestStats = {
  pages: FbIngestPageResult[];
  inserted: number;
  ranAt: string;
  /** True when a run happened seconds ago and this call returned without fetching. */
  throttled?: boolean;
};

// Two people loading the wire together should not fetch Facebook twice. Per server instance,
// like runIngest's guard; the admin's Check now passes force to bypass it.
let lastRun = 0;
const MIN_GAP_MS = 60_000;

/**
 * Refresh the configured pages ("only" restricts the run to one page, for the admin's
 * Check now button; "force" bypasses the one-minute guard). Never throws — a broken page
 * lands in stats, like the other feeds.
 */
export async function runFacebookIngest(opts: { limit?: number; only?: string; force?: boolean } = {}): Promise<FacebookIngestStats> {
  if (!opts.force && Date.now() - lastRun < MIN_GAP_MS) {
    return { pages: [], inserted: 0, ranAt: new Date().toISOString(), throttled: true };
  }
  lastRun = Date.now();
  const perPage = Math.min(15, Math.max(1, opts.limit ?? 8));
  const stats: FacebookIngestStats = { pages: [], inserted: 0, ranAt: new Date().toISOString() };
  const [allPages, bridges] = await Promise.all([configuredFbPageList(), configuredFbBridges()]);
  const pages = opts.only ? allPages.filter((p) => p.username === opts.only) : allPages;

  await Promise.all(
    pages.map(async (page) => {
      let posts: FbPost[] = [];
      let note = "";
      try {
        const res = await fetchFacebookPosts(page.username, process.env, 9000, bridges);
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
      stats.pages.push({ username: page.username, pageName: page.pageName, found: posts.length, inserted, note, at: new Date().toISOString() });
      stats.inserted += inserted;
    }),
  );

  // Remember the outcome for /admin/wire. A one-page check keeps the other pages' results.
  // Best effort: a settings write must never fail an ingest (a throttled call returned above).
  try {
    let pages = stats.pages;
    if (opts.only) {
      const previous = parseFbIngestStatus(await getAuxSetting("fb_ingest_status"));
      if (previous) pages = [...previous.pages.filter((p) => p.username !== opts.only), ...stats.pages];
    }
    await saveSetting("fb_ingest_status", JSON.stringify({ ranAt: stats.ranAt, inserted: stats.inserted, pages }), "facebook-ingest");
  } catch {
    /* the run still counts, even if we cannot show it on the admin page */
  }
  return stats;
}
