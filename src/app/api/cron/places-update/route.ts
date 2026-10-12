import { NextResponse } from "next/server";
import { db } from "@/db";
import { places } from "@/db/schema";
import { sql } from "drizzle-orm";
import fs from "fs";
import path from "path";

export async function GET(request: Request) {
  const authHeader = request.headers.get("Authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  try {
    // Read the static data directly to avoid bundling issues with OpenPlaces
    const dataPath = path.join(process.cwd(), "src/data/places.json");
    const data = JSON.parse(fs.readFileSync(dataPath, "utf8"));

    let addedCount = 0;
    for (const place of data) {
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
