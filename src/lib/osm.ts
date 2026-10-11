import { inArray } from "drizzle-orm";
import { db } from "@/db";
import { places } from "@/db/schema";
import { nearestParish } from "@/lib/geo";
import type { KindKey } from "@/lib/life-kinds";

/**
 * Venues from OpenStreetMap (free, open data). Requires the credit line
 * "© OpenStreetMap contributors" wherever these listings are shown.
 * OpenStreetMap does not hold menus, photos, reviews or reliable opening hours, so those stay member-written.
 */
export const OSM_CREDIT = "© OpenStreetMap contributors";

const ENDPOINTS = ["https://overpass-api.de/api/interpreter", "https://overpass.kumi.systems/api/interpreter"];

/** Which OpenStreetMap tags become which Island Life type. */
export function kindFor(tags: Record<string, string>): KindKey | null {
  const amenity = tags.amenity;
  if (amenity === "bar" || amenity === "pub" || amenity === "nightclub") return "night";
  if (amenity === "restaurant" || amenity === "cafe" || amenity === "fast_food" || amenity === "food_court" || amenity === "ice_cream") return "food";
  if (tags.natural === "beach") return "beach";
  return null;
}

/** Turns the tags into one readable line, using the house number and street when they are there. */
export function addressFor(tags: Record<string, string>): string | null {
  const full = tags["addr:full"];
  if (full) return full.slice(0, 160);
  const street = [tags["addr:housenumber"], tags["addr:street"]].filter(Boolean).join(" ");
  const line = [street, tags["addr:city"] ?? tags["addr:suburb"]].filter(Boolean).join(", ");
  return line ? line.slice(0, 160) : null;
}

const QUERY = `
[out:json][timeout:50];
area["ISO3166-1"="BS"][admin_level=2]->.bs;
(
  nwr(area.bs)["amenity"~"^(restaurant|cafe|fast_food|food_court|ice_cream|bar|pub|nightclub)$"]["name"];
  nwr(area.bs)["natural"="beach"]["name"];
);
out center tags;`;

export type OsmElement = { type: string; id: number; lat?: number; lon?: number; center?: { lat: number; lon: number }; tags?: Record<string, string> };

async function fetchElements(): Promise<OsmElement[]> {
  let lastError = "";
  for (const url of ENDPOINTS) {
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "content-type": "application/x-www-form-urlencoded", "user-agent": "NowBey/1.0 (venue import)" },
        body: new URLSearchParams({ data: QUERY }).toString(),
        signal: AbortSignal.timeout(55_000),
      });
      if (!res.ok) {
        lastError = `${url} answered ${res.status}`;
        continue;
      }
      const json = (await res.json()) as { elements?: OsmElement[] };
      return json.elements ?? [];
    } catch (err) {
      lastError = `${url}: ${err instanceof Error ? err.message : "failed"}`;
    }
  }
  throw new Error(`OpenStreetMap could not be reached (${lastError}). Try again in a few minutes.`);
}

export type ImportResult = { found: number; added: number; skipped: number };

/** Pulls every named bar, restaurant, cafe and beach in The Bahamas and adds the ones not already listed. */
export async function importOsmPlaces(): Promise<ImportResult> {
  const elements = await fetchElements();
  const rows: (typeof places.$inferInsert)[] = [];
  const seen = new Set<string>();
  for (const el of elements) {
    const tags = el.tags ?? {};
    const name = (tags.name ?? "").replace(/\s+/g, " ").trim().slice(0, 120);
    const kind = kindFor(tags);
    const lat = el.lat ?? el.center?.lat;
    const lng = el.lon ?? el.center?.lon;
    if (!name || !kind || typeof lat !== "number" || typeof lng !== "number") continue;
    const externalId = `${el.type}/${el.id}`;
    if (seen.has(externalId)) continue;
    seen.add(externalId);
    rows.push({
      name,
      kind,
      parish: nearestParish(lat, lng),
      address: addressFor(tags),
      lat,
      lng,
      source: "openstreetmap",
      externalId,
    });
  }

  // Skip anything already imported, then insert in small batches.
  const existing = new Set<string>();
  for (let i = 0; i < rows.length; i += 500) {
    const ids = rows.slice(i, i + 500).map((r) => r.externalId as string);
    const hits = await db.select({ id: places.externalId }).from(places).where(inArray(places.externalId, ids));
    for (const h of hits) if (h.id) existing.add(h.id);
  }
  const fresh = rows.filter((r) => !existing.has(r.externalId as string));
  for (let i = 0; i < fresh.length; i += 200) {
    await db.insert(places).values(fresh.slice(i, i + 200)).onConflictDoNothing({ target: places.externalId });
  }
  return { found: rows.length, added: fresh.length, skipped: rows.length - fresh.length };
}
