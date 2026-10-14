import { NextResponse } from "next/server";
import { cronUnauthorized, isCronAuthorized } from "@/lib/cron";
import { enrichRecentStories } from "@/lib/news-ai";

export const runtime = "nodejs";
export const maxDuration = 60;

/** Gemini pass over wire stories that have not been briefed yet. Schedule alongside the other Vercel crons. */
export async function GET(request: Request) {
  if (!isCronAuthorized(request)) return cronUnauthorized();
  try {
    const stats = await enrichRecentStories(20);
    return NextResponse.json({ ok: true, stats });
  } catch (err) {
    console.error(`[cron] ai-enrich failed: ${err instanceof Error ? err.message : err}`);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
