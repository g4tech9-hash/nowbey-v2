/*
 * Google Geocoding API as the middle rung of the geocoder chain:
 * OpenStreetMap (free) → Google (when it knows a Nassau street OSM does not) → the local gazetteer.
 * Needs GOOGLE_MAPS_API_KEY with the Geocoding API enabled; without it both helpers return null
 * and the chain quietly behaves as before. Google's $200/month free credit covers ~40k lookups;
 * as a fallback-only this stays near zero.
 */
import { inBahamas, nearestParish, PARISHES } from "@/lib/geo";

export type GeoHit = {
  label: string;
  lat: number;
  lng: number;
  street: string | null;
  address: string | null;
  parish: string;
  kind: string;
};

export type ReverseHit = {
  street: string | null;
  address: string | null;
  parish: string;
  houseNumber: string | null;
  neighbourhood: string | null;
  source: string;
};

export function googleConfigured(): boolean {
  return Boolean(process.env.GOOGLE_MAPS_API_KEY?.trim());
}

const BASE = "https://maps.googleapis.com/maps/api/geocode/json";

type GComponent = { long_name?: string; short_name?: string; types?: string[] };
type GResult = {
  formatted_address?: string;
  geometry?: { location?: { lat?: number; lng?: number } };
  address_components?: GComponent[];
  types?: string[];
  partial_match?: boolean;
};
type GResponse = { status?: string; results?: GResult[]; error_message?: string };

function component(r: GResult, ...types: string[]): string | null {
  for (const c of r.address_components ?? []) {
    if ((c.types ?? []).some((t) => types.includes(t)) && c.long_name) return c.long_name;
  }
  return null;
}

function tidy(formatted: string): string {
  const parts = formatted.split(",").map((p) => p.trim()).filter(Boolean);
  return parts.slice(0, 3).join(", ");
}

async function call(params: Record<string, string>): Promise<GResponse | null> {
  const key = process.env.GOOGLE_MAPS_API_KEY?.trim();
  if (!key) return null;
  try {
    const res = await fetch(`${BASE}?${new URLSearchParams({ ...params, key })}`, {
      cache: "no-store",
      signal: AbortSignal.timeout(5000),
      headers: { Accept: "application/json" },
    });
    if (!res.ok) {
      console.warn(`[geocode] Google answered HTTP ${res.status}`);
      return null;
    }
    const data = (await res.json()) as GResponse;
    if (data.status === "ZERO_RESULTS") return { status: data.status, results: [] };
    if (data.status !== "OK") {
      // REQUEST_DENIED / OVER_QUERY_LIMIT / INVALID_REQUEST — log so the admin can fix the key, then fall through to the gazetteer.
      console.warn(`[geocode] Google said ${data.status ?? "UNKNOWN"}${data.error_message ? `: ${data.error_message}` : ""}`);
      return null;
    }
    return data;
  } catch (err) {
    console.warn(`[geocode] Google lookup failed: ${err instanceof Error ? err.message : err}`);
    return null;
  }
}

// geo.ts never imports this file, so the chain lives here cleanly.

function parishFor(r: GResult, lat: number, lng: number): string {
  const named = component(r, "administrative_area_level_1", "locality") ?? "";
  if ((PARISHES as readonly string[]).some((p) => p.toLowerCase() === named.toLowerCase())) return named;
  return nearestParish(lat, lng);
}

/** Text search, e.g. "Carmichael Road". Only results physically inside The Bahamas are kept. */
export async function googleSearch(q: string): Promise<GeoHit[] | null> {
  if (!googleConfigured() || !q.trim()) return null;
  const data = await call({
    address: `${q.slice(0, 120)}, The Bahamas`,
    components: "country:BS",
    region: "bs",
    bounds: "20.6,-79.4|27.0,-72.5",
  });
  if (!data?.results) return null;
  const out: GeoHit[] = [];
  for (const r of data.results.slice(0, 6)) {
    const lat = r.geometry?.location?.lat;
    const lng = r.geometry?.location?.lng;
    if (typeof lat !== "number" || typeof lng !== "number" || !Number.isFinite(lat) || !Number.isFinite(lng)) continue;
    if (!inBahamas(lat, lng)) continue;
    const formatted = (r.formatted_address ?? "").slice(0, 200);
    out.push({
      label: formatted ? tidy(formatted) : `${lat.toFixed(5)}, ${lng.toFixed(5)}`,
      lat,
      lng,
      street: component(r, "route") ?? component(r, "neighborhood", "sublocality", "sublocality_level_1") ?? null,
      address: formatted || null,
      parish: parishFor(r, lat, lng),
      kind: r.types?.[0] ?? "place",
    });
  }
  return out;
}

/** Reverse lookup for a dropped pin: street name and address for the report form. */
export async function googleReverse(lat: number, lng: number): Promise<ReverseHit | null> {
  if (!googleConfigured() || !Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  const data = await call({ latlng: `${lat},${lng}`, region: "bs", result_type: "street_address|route|premise|neighborhood|sublocality|point_of_interest|establishment" });
  const r = data?.results?.[0];
  if (!r) return null;
  const formatted = (r.formatted_address ?? "").slice(0, 200);
  return {
    street: component(r, "route") ?? component(r, "point_of_interest", "establishment", "premise") ?? null,
    address: formatted ? tidy(formatted) : null,
    parish: parishFor(r, lat, lng),
    houseNumber: component(r, "street_number"),
    neighbourhood: component(r, "neighborhood", "sublocality", "sublocality_level_1"),
    source: "google",
  };
}
