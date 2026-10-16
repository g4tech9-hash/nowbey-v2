import { NextResponse } from "next/server";
import { cronUnauthorized, isCronAuthorized } from "@/lib/cron";
import { markRun, runOfficialIngest } from "@/lib/official";
import { nowMs } from "@/lib/geo";

export const runtime = "nodejs";
export const maxDuration = 60;

/** Import official bulletins (NHC, plus OFFICIAL_EXTRA_FEEDS) as live "official" pins. Schedule every 15–60 minutes in Vercel cron. */
export async function GET(request: Request) {
  if (!isCronAuthorized(request)) return cronUnauthorized();
  try {
    const stats = await runOfficialIngest();
    await markRun(nowMs());
    return NextResponse.json({ ok: true, stats });
  } catch (err) {
    console.error(`[cron] official-feeds failed: ${err instanceof Error ? err.message : err}`);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
