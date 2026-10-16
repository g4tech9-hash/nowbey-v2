import { NextResponse } from "next/server";
import { badOrigin, hasBadOrigin } from "@/lib/http";
import { inBahamas } from "@/lib/geo";
import { assistReportDraft } from "@/lib/report-ai";
import { clientIp, hit, tooMany } from "@/lib/ratelimit";
import { readJson, text } from "@/lib/validate";

export const runtime = "nodejs";

/**
 * The intake copilot's one call (report wizard + Expo app). Advisory only: it creates
 * nothing, so it shares the publish path's origin wall but needs no session — exactly
 * like posting, which also allows anonymous reporters. Tighter rate limit than most
 * reads because a Gemini call may sit behind it.
 */
export async function POST(req: Request) {
  if (hasBadOrigin(req)) return badOrigin();
  const gate = hit(`assist:${clientIp(req)}`, 20, 60 * 60_000);
  if (!gate.ok) return tooMany(gate.retryAfter, "report checks");

  const body = await readJson(req);
  const title = text(body.title, 140);
  if (title.length < 5) return NextResponse.json({ error: "Write the headline first, then let the assistant check it." }, { status: 400 });

  const lat = typeof body.lat === "number" ? body.lat : Number(body.lat);
  const lng = typeof body.lng === "number" ? body.lng : Number(body.lng);
  const hasPin = Number.isFinite(lat) && Number.isFinite(lng) && inBahamas(lat, lng);
  const sev = Math.round(Number(body.severity ?? 2));

  const result = await assistReportDraft({
    title,
    details: text(body.details, 1200),
    photoNote: text(body.photoNote, 300),
    category: text(body.category, 24) || "notice",
    severity: Number.isFinite(sev) ? Math.min(4, Math.max(1, sev)) : 2,
    parish: text(body.parish, 60) || null,
    lat: hasPin ? lat : null,
    lng: hasPin ? lng : null,
  });
  return NextResponse.json(result);
}
