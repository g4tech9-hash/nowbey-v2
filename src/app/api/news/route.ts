import { NextResponse, after } from "next/server";
import { and, desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { newsItems } from "@/db/schema";
import { CATEGORY_KEYS, knownParish } from "@/lib/geo";
import { configuredFeeds, refreshIfStale, runIngest } from "@/lib/ingest";
import { clientIp, hit, tooMany } from "@/lib/ratelimit";
import { clampInt, readJson } from "@/lib/validate";



export async function GET(req: Request) {
  after(() => refreshIfStale());
  const { searchParams } = new URL(req.url);
  const parish = knownParish(searchParams.get("parish"));
  const categoryRaw = searchParams.get("category");
  const category = categoryRaw && (CATEGORY_KEYS as readonly string[]).includes(categoryRaw) ? categoryRaw : null;
  const limit = clampInt(searchParams.get("limit"), 40, 1, 80);

  // Reader tips stay out of every public list until an admin approves them.
  const filters = [eq(newsItems.review, "approved")];
  if (parish) filters.push(eq(newsItems.parish, parish));
  if (category) filters.push(eq(newsItems.category, category));

  const rows = await db
    .select()
    .from(newsItems)
    .where(and(...filters))
    .orderBy(desc(newsItems.publishedAt))
    .limit(limit);

  return NextResponse.json({ items: rows, feeds: configuredFeeds().map((f) => f.name) });
}

export async function POST(req: Request) {
  // Anyone can press Refresh, so cap how often one visitor can make the server call out to the outlets.
  const gate = hit(`ingest:${clientIp(req)}`, 6, 10 * 60_000);
  if (!gate.ok) return tooMany(gate.retryAfter, "refreshes");
  const body = await readJson(req);
  const stats = await runIngest({ limit: clampInt(String(body?.limit ?? ""), 12, 1, 40) });
  return NextResponse.json({ stats });
}
