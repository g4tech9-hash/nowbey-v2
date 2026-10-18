/*
 * Pure core for the Facebook→wire ingest: no database, no path aliases.
 * src/lib/facebook-ingest.ts (DB-bound) imports this; tests import it directly.
 */
import { alertLevelFor, categorize, normalizeUrl, placeFromText } from "./ingest-core.ts";
import { titleForPost, type FbPost } from "./facebook.ts";

/** The page the wire follows when the admin has not configured any (BPL — the original ask). */
export const DEFAULT_FB_PAGE = "mybpl242";

/**
 * Pure conversion: one converter post → one news_items row's values.
 * Same treatment as the newspaper ingest: categorise, alert-level, cheap offline geocoding,
 * and a normalized URL so the unique column deduplicates reposts and tracking variants.
 */
export function fbPostToNewsRow(post: FbPost, pageName: string) {
  const title = titleForPost(post, pageName);
  const text = `${title} ${post.text}`;
  const category = categorize(text);
  const place = placeFromText(text);
  return {
    title,
    summary: post.text.slice(0, 480),
    url: normalizeUrl(post.url),
    sourceName: pageName,
    imageUrl: post.imageUrl,
    parish: place?.parish ?? null,
    lat: place?.lat ?? null,
    lng: place?.lng ?? null,
    geocoded: Boolean(place),
    category,
    alertLevel: alertLevelFor(text, category),
    publishedAt: post.publishedAt,
    review: "approved",
  };
}
