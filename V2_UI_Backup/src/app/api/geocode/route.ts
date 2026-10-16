import { NextResponse } from "next/server";
import { GAZETTEER, inBahamas, nearestParish, searchGazetteer } from "@/lib/geo";
import { googleReverse, googleSearch } from "@/lib/geocode";
import { clientIp, hit, tooMany } from "@/lib/ratelimit";



const UA = "NowBey-Web/1.0 (community safety map; contact: alerts@nowbey.app)";
const cache = new Map<string, { at: number; body: unknown }>();
const TTL = 1000 * 60 * 60 * 6;

function remember(key: string, body: unknown) {
  cache.set(key, { at: Date.now(), body });
  if (cache.size > 400) cache.delete(cache.keys().next().value as string);
  return body;
}

function recall(key: string) {
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < TTL) return hit.body;
  return null;
}

/** Bahamas-biased bounding box for text search. */
const VIEWBOX = "-79.4,27.0,-72.5,20.6";

async function nominatim(url: string, signal: AbortSignal) {
  const res = await fetch(url, {
    headers: { "User-Agent": UA, Accept: "application/json", "Accept-Language": "en" },
    cache: "no-store",
    signal,
  });
  if (!res.ok) throw new Error(`geocoder ${res.status}`);
  return res.json();
}

function tidy(displayName: string): string {
  const parts = displayName.split(",").map((p) => p.trim()).filter(Boolean);
  return parts.slice(0, 3).join(", ");
}

function parishFrom(a: Record<string, string> | undefined, lat: number, lng: number): string {
  const direct = a?.county ?? a?.state ?? a?.city ?? a?.town ?? a?.village ?? a?.municipality;
  if (direct && GAZETTEER.some((g) => g.parish.toLowerCase() === String(direct).toLowerCase())) {
    return String(direct);
  }
  // Nominatim often answers with the town ("Nassau", "Freeport") rather than the
  // parish, so anything unrecognised is resolved by distance instead.
  const nearest = nearestParish(lat, lng);
  return nearest;
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q")?.trim().slice(0, 120);
  const lat = searchParams.get("lat");
  const lng = searchParams.get("lng");
  const forceFallback = searchParams.get("fallback") === "1";

  // This route calls a free public service on the visitor's behalf, so keep one visitor from hammering it.
  const gate = hit(`geo:${clientIp(req)}`, 60, 60_000);
  if (!gate.ok) return tooMany(gate.retryAfter, "lookups");
  if (lat !== null || lng !== null) {
    const la = Number(lat);
    const ln = Number(lng);
    if (lat === null || lng === null || lat === "" || lng === "" || !Number.isFinite(la) || !Number.isFinite(ln)) {
      return NextResponse.json({ error: "Send numeric lat and lng." }, { status: 400 });
    }
    if (!inBahamas(la, ln)) {
      return NextResponse.json({ error: "That spot is outside The Bahamas." }, { status: 400 });
    }
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 5500);

  try {
    if (q) {
      const key = `s:${q.toLowerCase()}`;
      const hit = recall(key);
      if (hit) return NextResponse.json(hit);
      let results: unknown[] = [];
      let source = "local";
      if (!forceFallback) {
        try {
          const raw = await nominatim(
            `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=6&bounded=0&countrycodes=bs&q=${encodeURIComponent(
              `${q}, The Bahamas`,
            )}&viewbox=${VIEWBOX}`,
            controller.signal,
          );
          results = (raw as any[]).map((r) => ({
            label: tidy(r.display_name as string),
            lat: Number(r.lat),
            lng: Number(r.lon),
            street: (r.address?.road as string) ?? (r.name as string),
            address: r.display_name as string,
            parish: parishFrom(r.address, Number(r.lat), Number(r.lon)),
            kind: r.type as string,
          }));
          source = "osm";
        } catch {
          results = [];
        }
        // Second rung: Google knows many Nassau streets the free geocoder misses.
        if (!results.length) {
          const g = await googleSearch(q);
          if (g && g.length) {
            results = g;
            source = "google";
          }
        }
      }
      if (!results.length) {
        results = searchGazetteer(q, 6);
        source = "local";
      }
      const body = { results, source, note: source === "local" ? "Local Bahamas place list" : null };
      remember(key, body);
      return NextResponse.json(body);
    }

    if (lat && lng) {
      const key = `r:${Number(lat).toFixed(4)}:${Number(lng).toFixed(4)}`;
      const hit = recall(key);
      if (hit) return NextResponse.json(hit);
      const la = Number(lat);
      const ln = Number(lng);
      let body: Record<string, unknown>;
      if (!forceFallback) {
        try {
          const r = await nominatim(
            `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${la}&lon=${ln}&zoom=18&addressdetails=1`,
            controller.signal,
          );
          const a = r.address ?? {};
          body = {
            street: a.road ?? a.pedestrian ?? a.foot ?? r.name ?? null,
            address: r.display_name ? tidy(r.display_name as string) : null,
            parish: parishFrom(a, la, ln),
            houseNumber: a.house_number ?? null,
            neighbourhood: a.neighbourhood ?? a.suburb ?? a.quarter ?? null,
            source: "osm",
          };
        } catch {
          body = localReverse(la, ln);
        }
        // OSM often names no street for a Nassau pin — ask Google before settling for the local list.
        if (!body.street) {
          const g = await googleReverse(la, ln);
          if (g) body = g;
        }
      } else {
        body = localReverse(la, ln);
      }
      if (!body.street) body = { ...body, ...localReverse(la, ln) };
      remember(key, body);
      return NextResponse.json(body);
    }

    return NextResponse.json({ results: [], note: "Pass q= or lat=&lng=" });
  } finally {
    clearTimeout(timer);
  }
}

function localReverse(lat: number, lng: number) {
  let best = { d: Infinity, place: GAZETTEER[0] };
  for (const place of GAZETTEER) {
    const dx = (place.lat - lat) * 111.32;
    const dy = (place.lng - lng) * 111.32 * Math.cos((lat * Math.PI) / 180);
    const d = Math.hypot(dx, dy);
    if (d < best.d) best = { d, place };
  }
  return {
    street: best.place.street,
    address: `${best.place.name} area${best.d < 4 ? " (at)" : ` · ~${(best.d * 1.11).toFixed(1)} km`}`,
    parish: best.place.parish,
    houseNumber: null,
    neighbourhood: null,
    source: "local",
  };
}
