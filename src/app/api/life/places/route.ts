import { NextResponse } from "next/server";
import { PARISHES } from "@/lib/geo";
import { isKind, listPlaces } from "@/lib/life";
import { clampInt } from "@/lib/validate";

export const dynamic = "force-dynamic";

/** The place directory: one entry per place, type and island, with member ratings and prices. */
export async function GET(req: Request) {
  const sp = new URL(req.url).searchParams;
  const kindIn = sp.get("kind");
  const parishIn = sp.get("parish");
  const result = await listPlaces({
    kind: isKind(kindIn) ? kindIn : null,
    parish: parishIn && (PARISHES as readonly string[]).includes(parishIn) ? parishIn : null,
    page: clampInt(sp.get("page"), 1, 1, 10000),
    perPage: clampInt(sp.get("perPage") ?? sp.get("limit"), 60, 1, 200),
  });
  return NextResponse.json({ places: result.rows, page: result.page, pages: result.pages, total: result.total, note: "Ratings and prices come from NowBey members only." });
}
