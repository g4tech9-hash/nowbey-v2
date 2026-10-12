import { NextResponse } from "next/server";
import { db } from "@/db";
import { places } from "@/db/schema";
import { eq, sql } from "drizzle-orm";
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
    let updatedCount = 0;
    for (const place of data) {
      // The scraper writes latitude/longitude, phone, website, image and an
      // hours object { status, detail }. Map them onto the real columns.
      const parish = place.city || place.address?.split(",").pop()?.trim() || "Unknown";
      const lat = place.latitude ?? place.lat ?? null;
      const lng = place.longitude ?? place.lng ?? null;
      const contactNumber = place.phone ?? place.contactNumber ?? null;
      const website = place.website ?? null;
      const socialLinks = website ? JSON.stringify({ website }) : null;
      const imageUrls = place.image
        ? JSON.stringify([place.image])
        : place.imageUrls
          ? JSON.stringify(place.imageUrls)
          : null;
      let hours: string | null = null;
      if (place.hours && typeof place.hours === "object") {
        const detail = place.hours.detail || place.hours.status || "";
        if (detail) hours = JSON.stringify({ note: detail, status: place.hours.status ?? null });
      } else if (typeof place.hours === "string" && place.hours.trim()) {
        hours = JSON.stringify({ note: place.hours.trim() });
      }

      const existing = await db.select().from(places).where(sql`${places.externalId} = ${place.id}`).limit(1);

      if (existing.length === 0) {
        await db.insert(places).values({
          name: place.name,
          kind: place.category || "tip",
          parish,
          address: place.address ?? null,
          lat,
          lng,
          externalId: place.id,
          source: "openplaces",
          contactNumber,
          socialLinks,
          imageUrls,
          hours,
        });
        addedCount++;
      } else {
        // Backfill fields the first import dropped; never overwrite member edits.
        const row = existing[0];
        const patch: Record<string, string | number | null> = {};
        if (!row.hours && hours) patch.hours = hours;
        if (!row.contactNumber && contactNumber) patch.contactNumber = contactNumber;
        if (!row.socialLinks && socialLinks) patch.socialLinks = socialLinks;
        if (!row.imageUrls && imageUrls) patch.imageUrls = imageUrls;
        if (row.lat === null && lat !== null) patch.lat = lat;
        if (row.lng === null && lng !== null) patch.lng = lng;
        if ((row.parish === "Unknown" || !row.parish) && parish !== "Unknown") patch.parish = parish;
        if (Object.keys(patch).length) {
          await db.update(places).set(patch).where(eq(places.id, row.id));
          updatedCount++;
        }
      }
    }

    return NextResponse.json({ success: true, added: addedCount, updated: updatedCount });
  } catch (e) {
    console.error("Places update failed:", e);
    return NextResponse.json({ error: "Update failed" }, { status: 500 });
  }
}
