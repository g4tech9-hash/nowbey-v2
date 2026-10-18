import { NextResponse } from "next/server";
import { badOrigin, hasBadOrigin } from "@/lib/http";
import { clientIp, hit, tooMany } from "@/lib/ratelimit";
import { confirmReport } from "@/lib/safety-store";

export const dynamic = "force-dynamic";

/**
 * Master Build Section 15.
 * POST /api/reports/[id]/confirm -> atomic confirmedCount + 1, returns the updated report.
 * The UI guards against a second tap per visitor; the count itself increments exactly once per call.
 */
export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  if (hasBadOrigin(req)) return badOrigin();
  const gate = hit(`nb-confirm:${clientIp(req)}`, 60, 60 * 60_000);
  if (!gate.ok) return tooMany(gate.retryAfter, "confirmations");

  const { id } = await ctx.params;
  const report = await confirmReport(id);
  if (!report) {
    return NextResponse.json({ success: false, error: "That incident is not on the map." }, { status: 404 });
  }
  return NextResponse.json({ success: true, report });
}
