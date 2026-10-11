import { NextResponse } from "next/server";
import { audit } from "@/lib/audit";
import { importOsmPlaces } from "@/lib/osm";
import { requireStaff } from "@/lib/staff";

export const dynamic = "force-dynamic";
// The OpenStreetMap query can take a while on a large island chain.
export const maxDuration = 60;

/** Adds bars, restaurants, cafes and beaches from OpenStreetMap that are not listed yet. Admins only. */
export async function POST() {
  const gate = await requireStaff("admin");
  if (gate.error) return gate.error;
  try {
    const result = await importOsmPlaces();
    await audit(gate.viewer.handle ?? "admin", "places.import", "place", null, "OpenStreetMap", `found ${result.found}, added ${result.added}`);
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    return NextResponse.json({ ok: false, error: err instanceof Error ? err.message : "The import failed." }, { status: 502 });
  }
}
