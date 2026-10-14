import { NextResponse } from "next/server";
import { and, desc, eq, gt } from "drizzle-orm";
import { db } from "@/db";
import { gasReports } from "@/db/schema";
import { PARISHES } from "@/lib/geo";
import { MAX_CENTS, MIN_CENTS, gasBoard, isFuel, median } from "@/lib/gas";
import { hit, tooMany } from "@/lib/ratelimit";
import { text, readJson } from "@/lib/validate";
import { getViewer } from "@/lib/viewer";



export async function GET(req: Request) {
  const parish = new URL(req.url).searchParams.get("parish");
  const known = parish && (PARISHES as readonly string[]).includes(parish) ? parish : null;
  return NextResponse.json(await gasBoard(known));
}

export async function POST(req: Request) {
  const viewer = await getViewer();
  if (!viewer.signedIn || !viewer.userId) return NextResponse.json({ error: "Sign in to report a gas price." }, { status: 401 });
  const gate = hit(`gas:${viewer.userId}`, 12, 24 * 60 * 60_000);
  if (!gate.ok) return tooMany(gate.retryAfter, "gas reports");

  const body = await readJson(req);
  const station = text(body.station, 60);
  const parish = text(body.parish, 40);
  const fuel = body.fuel;
  const dollars = typeof body.price === "number" ? body.price : Number(String(body.price ?? "").replace(/[^0-9.]/g, ""));
  const cents = Math.round(dollars * 100);

  if (station.length < 2) return NextResponse.json({ error: "Enter the station's name, for example Shell Prince George Wharf." }, { status: 400 });
  if (!(PARISHES as readonly string[]).includes(parish)) return NextResponse.json({ error: "Choose the island." }, { status: 400 });
  if (!isFuel(fuel)) return NextResponse.json({ error: "Choose regular, premium or diesel." }, { status: 400 });
  if (!Number.isFinite(cents) || cents < MIN_CENTS || cents > MAX_CENTS) {
    return NextResponse.json({ error: `Enter the price per gallon in B$, for example 5.49 (between ${MIN_CENTS / 100} and ${MAX_CENTS / 100}).` }, { status: 400 });
  }

  // Catch typos: if at least three people reported this fuel on this island lately, a price far from the middle is rejected.
  const recent = await db
    .select({ p: gasReports.priceCents })
    .from(gasReports)
    .where(and(eq(gasReports.parish, parish), eq(gasReports.fuel, fuel), gt(gasReports.createdAt, new Date(Date.now() - 14 * 86_400_000))))
    .orderBy(desc(gasReports.createdAt))
    .limit(50);
  const mid = recent.length >= 3 ? median(recent.map((r) => r.p)) : null;
  if (mid && Math.abs(cents - mid) / mid > 0.4) {
    return NextResponse.json({ error: `That looks off. Other reports for ${parish} are around B$${(mid / 100).toFixed(2)}. Check the price and try again.` }, { status: 400 });
  }

  await db.insert(gasReports).values({ userId: viewer.userId, station, parish, fuel, priceCents: cents });
  return NextResponse.json({ ok: true }, { status: 201 });
}
