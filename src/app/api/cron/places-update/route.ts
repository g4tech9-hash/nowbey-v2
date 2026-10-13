import { NextResponse } from "next/server";
import { db } from "@/db";
import { places } from "@/db/schema";
import { eq, inArray } from "drizzle-orm";
import { cronUnauthorized, isCronAuthorized } from "@/lib/cron";
import placesData from "@/data/places.json";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

type PlaceJson = {
  id?: string;
  name?: string;
  category?: string;
  city?: string;
  address?: string;
  latitude?: number | null;
  lat?: number | null;
  longitude?: number | null;
  lng?: number | null;
  phone?: string | null;
  contactNumber?: string | null;
  website?: string | null;
  image?: string | string[] | null;
  imageUrls?: string[] | null;
  hours?: unknown;
};

export async function GET(request: Request) {
  if (!isCronAuthorized(request)) {
    return cronUnauthorized();
  }

  try {
    const data = (placesData ?? []) as PlaceJson[];

    let addedCount = 0;
    let updatedCount = 0;
    const CHUNK = 400;
    const ids = [...new Set(data.map((p) => p.id).filter((v): v is string => typeof v === "string" && v.length > 0))];
    const byExternal = new Map<string, typeof places.$inferSelect>();
    for (let i = 0; i < ids.length; i += CHUNK) {
      const rows = await db
        .select()
        .from(places)
        .where(inArray(places.externalId, ids.slice(i, i + CHUNK)));
      for (const r of rows) if (r.externalId) byExternal.set(r.externalId, r);
    }
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
        const h = place.hours as Record<string, unknown>;
        const detail = String(h.detail ?? h.status ?? "");
        if (detail) hours = JSON.stringify({ note: detail, status: (h.status as string | null) ?? null });
      } else if (typeof place.hours === "string" && place.hours.trim()) {
        hours = JSON.stringify({ note: place.hours.trim() });
      }

      const existing = place.id ? byExternal.get(place.id) : undefined;

      if (!existing) {
        if (!place.name || !place.id) continue;
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
        const row = existing;
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
