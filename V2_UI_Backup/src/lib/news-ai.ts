/*
 * Gemini pass over fresh wire stories. The scraper (ingest.ts) does its job offline with regexes;
 * this adds what regexes cannot: a plain-English brief per story, a better category guess when the
 * rules only saw "notice", and a place name that the gazetteer can then pin onto the map.
 *
 * Runs after each news refresh and from /api/cron/ai-enrich. With no GEMINI_API_KEY it is a no-op.
 */
import { desc, eq, isNull } from "drizzle-orm";
import { db } from "@/db";
import { newsItems } from "@/db/schema";
import { aiConfigured, geminiJson, oneLine } from "@/lib/ai";
import { CATEGORY_KEYS, type CategoryKey } from "@/lib/geo";
import { placeFromText } from "@/lib/ingest";

export type EnrichStats = {
  configured: boolean;
  checked: number;
  briefed: number;
  pinned: number;
  recategorised: number;
};

type AiAnswer = { brief?: unknown; category?: unknown; place?: unknown };

const PROMPT = `You are the news editor for NowBey, a community safety app for The Bahamas. Given the headline, outlet and excerpt of one Bahamian news story, answer in JSON with exactly these keys:

- "brief": two short sentences (45 words max, plain English, present tense) telling a Nassau resident what happened and why it matters to them. No opinion, no quoting, no "the article says", nothing you were not told.
- "category": one of ${CATEGORY_KEYS.join(", ")} — the kind of community report this story reads most like — or null when none fits.
- "place": the single most specific settlement, street or island named in the story (for example "Carmichael Road, New Providence"), or null when no place is named.
`;

export async function enrichRecentStories(limit = 6): Promise<EnrichStats> {
  const stats: EnrichStats = { configured: aiConfigured(), checked: 0, briefed: 0, pinned: 0, recategorised: 0 };
  if (!stats.configured) return stats;

  // Only stories the AI pass has never seen. ai_summary failures leave ai_at null, so one bad
  // story cannot poison the run: we stop the whole run when Gemini stops answering,
  // instead of stamping every story as "seen".
  const rows = await db
    .select({
      id: newsItems.id,
      title: newsItems.title,
      summary: newsItems.summary,
      sourceName: newsItems.sourceName,
      parish: newsItems.parish,
      category: newsItems.category,
    })
    .from(newsItems)
    .where(isNull(newsItems.aiAt))
    .orderBy(desc(newsItems.publishedAt))
    .limit(Math.min(40, Math.max(1, limit)));

  for (const row of rows) {
    stats.checked += 1;
    const answer = await geminiJson<AiAnswer>(
      `${PROMPT}\nHeadline: ${row.title}\nOutlet: ${row.sourceName}\nExcerpt: ${(row.summary ?? "").slice(0, 600)}`,
      { maxTokens: 220 },
    );
    // Gemini is down, over quota or refusing — stop now so the rest stay queued for the next run.
    if (!answer) break;

    const brief = oneLine(answer.brief, 320);
    const patch: Partial<typeof newsItems.$inferInsert> = { aiAt: new Date() };
    if (brief && brief.length >= 20) {
      patch.aiSummary = brief;
      stats.briefed += 1;
    }

    if (!row.parish && typeof answer.place === "string" && answer.place.trim().length >= 4) {
      const place = placeFromText(oneLine(answer.place, 120));
      if (place) {
        patch.parish = place.parish;
        patch.lat = place.lat;
        patch.lng = place.lng;
        patch.geocoded = true;
        stats.pinned += 1;
      }
    }

    const cat = typeof answer.category === "string" ? answer.category.trim().toLowerCase() : "";
    if (row.category === "notice" && (CATEGORY_KEYS as string[]).includes(cat) && cat !== "notice") {
      patch.category = cat as CategoryKey;
      stats.recategorised += 1;
    }

    await db.update(newsItems).set(patch).where(eq(newsItems.id, row.id));
  }
  return stats;
}
