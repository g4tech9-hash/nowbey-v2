import { NextResponse } from "next/server";
import { listWire } from "@/lib/safety-store";

export const dynamic = "force-dynamic";

/**
 * Master Build Section 15.
 * GET /api/wire -> { success, stories } — Bahamian outlets only (auto-seeds 5 when empty).
 */
export async function GET() {
  const stories = await listWire();
  return NextResponse.json(
    { success: true, stories, count: stories.length },
    { headers: { "Cache-Control": "no-store" } },
  );
}
