import { NextResponse } from "next/server";
import { cronUnauthorized, isCronAuthorized } from "@/lib/cron";
import { analyzePendingErrorGroups } from "@/lib/error-ai";

export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * Automatic AI diagnosis of collected crash groups (Admin → Logs reviews the results).
 * Schedule every 15–60 min alongside the other crons, with the CRON_SECRET bearer.
 * Without GEMINI_API_KEY it records honest "unavailable" rows instead of diagnosing.
 */
export async function GET(request: Request) {
  if (!isCronAuthorized(request)) return cronUnauthorized();
  try {
    const stats = await analyzePendingErrorGroups(5);
    return NextResponse.json({ ok: true, stats });
  } catch (err) {
    console.error(`[cron] error-analysis failed: ${err instanceof Error ? err.message : err}`);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
