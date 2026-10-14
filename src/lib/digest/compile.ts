import { and, desc, eq, gte, or, sql } from "drizzle-orm";
import { db } from "@/db";
import { incidents, newsItems } from "@/db/schema";
import { nowMs, timeAgo } from "@/lib/geo";

export type DigestItem = {
  type: 'hazard' | 'news';
  title: string;
  details: string;
  category: string;
  area: string;
  time: string;
  url: string;
};

export async function compilePartnerDigest(parish: string, categories: string[]) {
  const since = new Date(nowMs() - 7 * 86400 * 1000); // Last 7 days
  
  const hazardFilters = [gte(incidents.createdAt, since)];
  if (parish) hazardFilters.push(eq(incidents.parish, parish));
  if (categories.length > 0) {
    hazardFilters.push(or(...categories.map(c => eq(incidents.category, c))));
  }

  // Use a variable to avoid the ternary inside .where() which confuses TS
  const hazardWhere = and(...hazardFilters);

  const [hazards, news] = await Promise.all([
    db.select().from(incidents).where(hazardWhere as any).orderBy(desc(incidents.createdAt)).limit(10),
    db.select().from(newsItems).where(
      and(
        eq(newsItems.review, 'approved'),
        gte(newsItems.publishedAt, since),
        parish ? eq(newsItems.parish, parish) : (sql`TRUE` as any)
      )
    ).orderBy(desc(newsItems.publishedAt)).limit(5)
  ]);

  const items: DigestItem[] = [
    ...hazards.map(h => ({
      type: 'hazard' as const,
      title: h.title,
      details: h.details ?? '',
      category: h.category,
      area: h.address || h.parish || 'Unknown',
      time: timeAgo(h.createdAt),
      url: `/incident/${h.id}`
    })),
    ...news.map(n => ({
      type: 'news' as const,
      title: n.title,
      details: n.summary ?? '',
      category: n.category,
      area: n.parish || 'Bahamas',
      time: timeAgo(n.publishedAt),
      url: n.url
    }))
  ];

  return items;
}
