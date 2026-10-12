import { NextResponse } from "next/server";
import { db } from "@/db";
import { places } from "@/db/schema";
import { sql } from "drizzle-orm";
import { Places } from "openplaces";

export async function GET(request: Request) {
  const authHeader = request.headers.get("Authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  try {
    const op = new Places();
    const results = await op.search({
      query: "restaurants, bars, clubs in The Bahamas",
      limit: 100,
    });

    let addedCount = 0;
    for (const place of results) {
      // Use externalId (from OpenPlaces/Google) to prevent duplicates
      const existing = await db.select().from(places).where(sql`${places.externalId} = ${place.id}`).limit(1);
      
      if (existing.length === 0) {
        await db.insert(places).values({
          name: place.name,
          kind: place.category,
          parish: place.address?.split(',').pop()?.trim() || "Unknown",
          address: place.address,
          lat: place.lat,
          lng: place.lng,
          externalId: place.id,
          source: "openplaces",
        });
        addedCount++;
      }
    }

    return NextResponse.json({ success: true, added: addedCount });
  } catch (e) {
    console.error("Places update failed:", e);
    return NextResponse.json({ error: "Update failed" }, { status: 500 });
  }
}
