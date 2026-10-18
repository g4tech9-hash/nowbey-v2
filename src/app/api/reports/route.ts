import { NextResponse } from "next/server";
import { badOrigin, hasBadOrigin } from "@/lib/http";
import { clientIp, hit, tooMany } from "@/lib/ratelimit";
import { readJson, text } from "@/lib/validate";
import { isHazardType, isSeverity } from "@/lib/bahamas";
import { createReport, listReports } from "@/lib/safety-store";

export const dynamic = "force-dynamic";

/**
 * Master Build Section 15.
 * GET  /api/reports?island=&type= -> { success, reports } newest first (auto-seeds 6 when empty).
 * POST /api/reports               -> { success, report }; 400 when title / type / island missing.
 */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const island = searchParams.get("island") ?? "";
  const type = searchParams.get("type") ?? "";
  const reports = await listReports({
    island: island.trim() || undefined,
    type: type.trim() || undefined,
  });
  return NextResponse.json(
    { success: true, reports, count: reports.length },
    { headers: { "Cache-Control": "no-store" } },
  );
}

export async function POST(req: Request) {
  if (hasBadOrigin(req)) return badOrigin();
  const gate = hit(`nb-report:${clientIp(req)}`, 20, 60 * 60_000);
  if (!gate.ok) return tooMany(gate.retryAfter, "reports");

  const body = await readJson(req);
  const title = text(body.title, 140).trim();
  const hazardType = text(body.hazardType ?? body.type, 40).trim();
  const island = text(body.island, 60).trim();

  if (!title) {
    return NextResponse.json({ success: false, error: "A headline is required." }, { status: 400 });
  }
  if (!isHazardType(hazardType)) {
    return NextResponse.json(
      { success: false, error: "A hazard type is required — one of flooding, power_outage, road_hazard, weather, fire, safety." },
      { status: 400 },
    );
  }
  if (!island) {
    return NextResponse.json({ success: false, error: "An island is required." }, { status: 400 });
  }

  let severity: string | undefined = text(body.severity, 20).trim() || undefined;
  if (severity !== undefined && !isSeverity(severity)) {
    return NextResponse.json(
      { success: false, error: "Severity must be low, medium, high or critical." },
      { status: 400 },
    );
  }

  const lat = typeof body.lat === "number" ? body.lat : Number(body.lat);
  const lng = typeof body.lng === "number" ? body.lng : Number(body.lng);

  const report = await createReport({
    title,
    description: text(body.description, 2000),
    hazardType,
    severity,
    island,
    settlement: text(body.settlement, 80),
    address: text(body.address, 160),
    lat: Number.isFinite(lat) ? lat : null,
    lng: Number.isFinite(lng) ? lng : null,
    isAnonymous: body.isAnonymous !== false,
    reporterName: body.reporterName,
  });

  return NextResponse.json({ success: true, report }, { status: 201 });
}
