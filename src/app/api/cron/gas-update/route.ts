import { NextResponse } from "next/server";
import { officialPrices } from "@/lib/gas";
import { cronUnauthorized, isCronAuthorized } from "@/lib/cron";

export const runtime = "nodejs";

/**
 * Daily gas job. It used to insert three hard-coded prices (Shell 7.08, Esso 7.50, Rubis 7.56) as if a
 * member had reported them, every run, so the Gas board slowly filled with invented numbers presented as
 * real. There is no trustworthy price feed for The Bahamas to read yet, so this job now writes nothing:
 * government-set prices are shown straight from GAS_OFFICIAL, and station prices come only from members.
 * The route stays so an existing scheduler does not start failing, and it says plainly what it did.
 */
export async function GET(request: Request) {
  if (!isCronAuthorized(request)) {
    return cronUnauthorized();
  }
  const official = officialPrices();
  return NextResponse.json({
    success: true,
    updated: 0,
    note: "No price feed is connected, so nothing was written. Official prices come from GAS_OFFICIAL; station prices come from members.",
    official,
  });
}
