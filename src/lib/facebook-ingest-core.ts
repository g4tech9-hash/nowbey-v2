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

/** What one page's last refresh did — the note is the converter's own diagnosis, verbatim. */
export type FbIngestPageResult = {
  username: string;
  pageName?: string;
  found: number;
  inserted: number;
  note: string;
  /** When this page's result was produced (one-page checks leave the others untouched). */
  at?: string;
};

export type FbIngestStatus = {
  ranAt: string;
  inserted: number;
  pages: FbIngestPageResult[];
};

/**
 * Parse the saved last-run blob defensively. A corrupt or half-written value must never break the
 * admin page that explains why the wire has no Facebook posts.
 */
export function parseFbIngestStatus(raw: string): FbIngestStatus | null {
  if (!raw) return null;
  try {
    const value = JSON.parse(raw) as Partial<FbIngestStatus>;
    if (!value || typeof value.ranAt !== "string" || !Array.isArray(value.pages)) return null;
    const pages = value.pages
      .filter((p): p is FbIngestPageResult => Boolean(p) && typeof p.username === "string" && typeof p.note === "string")
      .map((p) => ({
        username: p.username,
        pageName: typeof p.pageName === "string" ? p.pageName : undefined,
        found: Number(p.found) || 0,
        inserted: Number(p.inserted) || 0,
        note: p.note,
        at: typeof p.at === "string" ? p.at : undefined,
      }));
    return { ranAt: value.ranAt, inserted: Number(value.inserted) || 0, pages };
  } catch {
    return null;
  }
}
