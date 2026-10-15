export type LayerKey = "hybrid" | "satellite" | "road" | "streets";

export type LayerDef = {
  key: LayerKey;
  label: string;
  /** Short pill text for narrow phones; the full label shows from `sm` up. */
  short: string;
  hint: string;
  url: string;
  subdomains?: string;
  attribution: string;
  maxZoom: number;
  overlay?: string;
  overlayAttribution?: string;
};

/**
 * Keyless tile sources. `hybrid` is what makes the map feel like Google:
 * high-resolution aerial imagery with street names and place labels drawn on top.
 */
export const LAYERS: Record<LayerKey, LayerDef> = {
  hybrid: {
    key: "hybrid",
    label: "Hybrid",
    short: "Hybrid",
    hint: "Aerial imagery with street names",
    url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
    attribution: "Imagery &copy; Esri, Maxar, Earthstar Geographics",
    maxZoom: 19,
    overlay:
      "https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}",
    overlayAttribution: "Labels &copy; Esri",
  },
  satellite: {
    key: "satellite",
    label: "Satellite",
    short: "Sat",
    hint: "Clean aerial imagery, no labels",
    url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
    attribution: "Imagery &copy; Esri, Maxar, Earthstar Geographics",
    maxZoom: 19,
  },
  road: {
    key: "road",
    label: "Road map",
    short: "Road",
    hint: "OpenStreetMap streets and buildings",
    url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
    subdomains: "abc",
    attribution: "&copy; OpenStreetMap contributors",
    maxZoom: 19,
  },
  streets: {
    key: "streets",
    label: "Dark streets",
    short: "Dark",
    hint: "Night mode, easier on the eyes",
    url: "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
    subdomains: "abc",
    attribution: "&copy; OpenStreetMap contributors &copy; CARTO",
    maxZoom: 20,
  },
};

export const BAHAMAS_CENTER: [number, number] = [25.0629, -77.3417];

export const PARISHES = [
  "New Providence",
  "Grand Bahama",
  "Abaco",
  "Bimini",
  "Cat Island",
  "Crooked Island",
  "Eleuthera",
  "Exuma",
  "Inagua",
  "Long Island",
  "Berry Islands",
  "Acklins",
  "Mayaguana",
  "San Salvador",
  "Andros",
  "Spanish Wells",
  "Harbour Island",
  "Cay Sal Bank",
] as const;

export type CategoryKey =
  | "flood"
  | "storm"
  | "power"
  | "water"
  | "crime"
  | "road"
  | "marine"
  | "fire"
  | "health"
  | "trash"
  | "event"
  | "notice"
  | "accident";

export const CATEGORIES: Record<
  CategoryKey,
  { label: string; color: string; glyph: string; blurb: string }
> = {
  flood: { label: "Flooding", color: "#38bdf8", glyph: "wave", blurb: "Standing water, washover, flash flood" },
  storm: { label: "Storm", color: "#fbbf24", glyph: "cloud", blurb: "Squall, surge, hurricane watch" },
  power: { label: "Power", color: "#facc15", glyph: "bolt", blurb: "Outage, lines down, generator" },
  water: { label: "Water", color: "#22d3ee", glyph: "drop", blurb: "No water, main break, boil notice" },
  crime: { label: "Safety", color: "#fb7185", glyph: "shield", blurb: "Theft, break-in, suspicious" },
  road: { label: "Road", color: "#f97316", glyph: "cone", blurb: "Pothole, blockage, closure" },
  marine: { label: "Marine", color: "#2dd4bf", glyph: "anchor", blurb: "Debris, grounding, sea state" },
  fire: { label: "Fire", color: "#ef4444", glyph: "flame", blurb: "Brush or structure fire, smoke" },
  health: { label: "Health", color: "#a78bfa", glyph: "cross", blurb: "Assistance, medical, rescue" },
  trash: { label: "Sanitation", color: "#84cc16", glyph: "bin", blurb: "Missed pickup, dumping" },
  event: { label: "Community", color: "#f472b6", glyph: "star", blurb: "Junkanoo, regatta, fundraiser" },
  notice: { label: "Notice", color: "#94a3b8", glyph: "info", blurb: "General heads-up" },
  accident: { label: "Car Accident", color: "#ef4444", glyph: "car", blurb: "Traffic accident, road blockage, or vehicle hazard" },
};

export const CATEGORY_KEYS = Object.keys(CATEGORIES) as CategoryKey[];

/** Metres represented by one screen pixel at a given zoom / latitude. */
export function metersPerPixel(zoom: number, lat: number): number {
  return (156543.03392 * Math.cos((lat * Math.PI) / 180)) / Math.pow(2, zoom);
}

export function haversineMeters(a: [number, number], b: [number, number]): number {
  const R = 6371000;
  const dLat = ((b[0] - a[0]) * Math.PI) / 180;
  const dLng = ((b[1] - a[1]) * Math.PI) / 180;
  const la1 = (a[0] * Math.PI) / 180;
  const la2 = (b[0] * Math.PI) / 180;
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(la1) * Math.cos(la2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}

/** Rough "how exact is this pin" readout for the pin panel. */
export function precisionLabel(zoom: number, lat: number): string {
  const m = metersPerPixel(zoom, lat) * 4;
  if (m <= 2) return `about ${m.toFixed(1)} m across`;
  if (m < 1000) return `about ${Math.round(m)} m across`;
  return `about ${(m / 1000).toFixed(1)} km across`;
}

export function formatCoord(value: number, axis: "lat" | "lng"): string {
  const hemi = axis === "lat" ? (value >= 0 ? "N" : "S") : value >= 0 ? "E" : "W";
  return `${Math.abs(value).toFixed(6)}\u00b0 ${hemi}`;
}

export function timeAgo(iso: string | Date): string {
  const then = typeof iso === "string" ? new Date(iso).getTime() : iso.getTime();
  const secs = Math.max(1, Math.round((Date.now() - then) / 1000));
  if (secs < 60) return `${secs}s ago`;
  const mins = Math.round(secs / 60);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.round(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(then).toLocaleDateString("en-BS", { month: "short", day: "numeric" });
}

/**
 * Offline gazetteer used when the live geocoder is unreachable (rate limited,
 * offline, or a blocked network). Keeps search and area prefill working.
 */
export const GAZETTEER: { name: string; aliases: string[]; lat: number; lng: number; parish: string; street: string }[] = [
  { name: "Bay Street, Nassau", aliases: ["bay st", "downtown nassau", "parliament"], lat: 25.0648, lng: -77.3432, parish: "New Providence", street: "Bay Street" },
  { name: "Rawson Square, Nassau", aliases: ["rawson"], lat: 25.0652, lng: -77.3424, parish: "New Providence", street: "Bay Street" },
  { name: "Fort Charlotte, Nassau", aliases: ["west hill", "fort charlotte"], lat: 25.0585, lng: -77.3464, parish: "New Providence", street: "West Hill Street" },
  { name: "Queen's Staircase", aliases: ["Queens Staircase", "396 steps"], lat: 25.0589, lng: -77.3452, parish: "New Providence", street: "Poole's Drive" },
  { name: "Montagu Beach, Nassau", aliases: ["montagu fouche", "cable beach public beach"], lat: 25.0756, lng: -77.3581, parish: "New Providence", street: "West Bay Street" },
  { name: "Cable Beach, Nassau", aliases: ["balmoral"], lat: 25.0808, lng: -77.4004, parish: "New Providence", street: "West Bay Street" },
  { name: "Lynden Pindling Airport", aliases: ["Nassau airport", "LPIA"], lat: 25.039, lng: -77.4676, parish: "New Providence", street: "Airport Road" },
  { name: "Paradise Island", aliases: ["Atlantis", "Cabbage Beach"], lat: 25.0779, lng: -77.3403, parish: "New Providence", street: "Paradise Island" },
  { name: "Grant's Town, Nassau", aliases: ["grants town", "east village"], lat: 25.0636, lng: -77.3368, parish: "New Providence", street: "Grant's Town Road" },
  { name: "Village Road, Nassau", aliases: ["east street"], lat: 25.0669, lng: -77.3383, parish: "New Providence", street: "Village Road" },
  { name: "Over the Hill, Nassau", aliases: ["east street south"], lat: 25.0551, lng: -77.3442, parish: "New Providence", street: "East Street" },
  { name: "Spring Garden, Nassau", aliases: ["spring garden road"], lat: 25.0699, lng: -77.3503, parish: "New Providence", street: "Spring Garden Road" },
  { name: "Centreville, Nassau", aliases: ["centreville community"], lat: 25.0787, lng: -77.3501, parish: "New Providence", street: "Eastern Road" },
  { name: "Garden of the Grove, Nassau", aliases: ["western highway"], lat: 25.0542, lng: -77.3638, parish: "New Providence", street: "Western Boulevard" },
  { name: "Pinewood / Glenwood, Nassau", aliases: ["pinewood avenue"], lat: 25.0585, lng: -77.3626, parish: "New Providence", street: "Pinewood Avenue" },
  { name: "Lyford Cay, Nassau", aliases: ["lyford"], lat: 25.0974, lng: -77.4651, parish: "New Providence", street: "Northern Shore Road" },
  { name: "Sandycay / Cabbage Beach Road", aliases: ["northern shore"], lat: 25.0865, lng: -77.4199, parish: "New Providence", street: "Cabbage Beach Road" },
  { name: "Freeport, Grand Bahama", aliases: ["lucaya", "grand bahama"], lat: 26.533, lng: -78.6999, parish: "Grand Bahama", street: "East Bay Street" },
  { name: "Lucaya Mall, Freeport", aliases: ["marina village"], lat: 26.5709, lng: -78.6905, parish: "Grand Bahama", street: "Lucaya Road" },
  { name: "Grand Bahama Airport", aliases: ["fpo", "freeport airport"], lat: 26.5534, lng: -78.6959, parish: "Grand Bahama", street: "Airport Boulevard" },
  { name: "Marsh Harbour, Abaco", aliases: ["abaco"], lat: 26.5414, lng: -77.0642, parish: "Abaco", street: "Mercedes Street" },
  { name: "Treasure Cay, Abaco", aliases: ["green turtle"], lat: 26.7167, lng: -77.3664, parish: "Abaco", street: "Treasure Cay Parkway" },
  { name: "Hope Town, Abaco", aliases: ["lighthouse"], lat: 26.5842, lng: -77.1469, parish: "Abaco", street: "Cobb's Crossing Road" },
  { name: "George Town, Exuma", aliases: ["exuma"], lat: 24.1222, lng: -76.4273, parish: "Exuma", street: "Reid Street" },
  { name: "Freetown, Great Exuma", aliases: ["exuma point"], lat: 23.5911, lng: -75.7242, parish: "Exuma", street: "Harrison Street" },
  { name: "Governor's Harbour, Eleuthera", aliases: ["eleuthera"], lat: 25.2892, lng: -76.4142, parish: "Eleuthera", street: "Government Hill Road" },
  { name: "Rock Sound, Eleuthera", aliases: ["preacher's cave"], lat: 24.8836, lng: -76.1989, parish: "Eleuthera", street: "Queens Highway" },
  { name: "Gregory Town, Eleuthera", aliases: ["pineapple festival"], lat: 24.9506, lng: -76.2144, parish: "Eleuthera", street: "Queens Highway" },
  { name: "Spanish Wells, Eleuthera", aliases: ["baqua"], lat: 25.5158, lng: -76.66, parish: "Eleuthera", street: "Queen Elizabeth Highway" },
  { name: "Clarence Town, Long Island", aliases: ["long island"], lat: 23.2481, lng: -75.2836, parish: "Long Island", street: "Duncan Town Road" },
  { name: "Alice Town, Bimini", aliases: ["bimini"], lat: 25.7367, lng: -79.2881, parish: "Bimini", street: "Harbour Road" },
  { name: "Nicholls Town, Andros", aliases: ["andros"], lat: 24.7067, lng: -77.5522, parish: "Andros", street: "Queens Highway" },
  { name: "Gordon's Town, Andros", aliases: ["andros town"], lat: 24.9011, lng: -77.5414, parish: "Andros", street: "Queens Highway" },
  { name: "Cockburn Town, San Salvador", aliases: ["san salvador", "gowan's hill"], lat: 24.0334, lng: -74.4803, parish: "San Salvador", street: "Bay Street" },
  { name: "Matthew Town, Inagua", aliases: ["inagua"], lat: 20.9825, lng: -73.6956, parish: "Inagua", street: "Raymond's Road" },
  { name: "Duncan Town, Crooked Island", aliases: ["crooked"], lat: 22.4714, lng: -74.6306, parish: "Crooked Island", street: "Long Wharf Road" },
  { name: "The Bight, Acklins", aliases: ["acklins"], lat: 22.3436, lng: -74.0033, parish: "Acklins", street: "Bight Road" },
  { name: "Gordon's Harbour, Berry Islands", aliases: ["berries"], lat: 26.5378, lng: -77.8478, parish: "Berry Islands", street: "Government Road" },
  { name: "George Town, Harbour Island", aliases: ["harbour island", "pink sand"], lat: 25.5436, lng: -76.6275, parish: "Harbour Island", street: "Bay Street" },
  { name: "Stella Maris, Long Island", aliases: ["underwater restaurant"], lat: 22.4192, lng: -75.4472, parish: "Long Island", street: "Queens Highway" },
  { name: "Arthur's Town, Cat Island", aliases: ["cat island", "mount alvernia"], lat: 24.6283, lng: -75.6736, parish: "Cat Island", street: "Queens Highway" },
  { name: "New Bight, Cat Island", aliases: ["bight cat island"], lat: 24.3, lng: -75.4, parish: "Cat Island", street: "Queens Highway" },
  { name: "Abraham's Bay, Mayaguana", aliases: ["mayaguana", "abrahams bay"], lat: 22.3517, lng: -72.9567, parish: "Mayaguana", street: "Main Road" },
  { name: "Great Harbour Cay, Berry Islands", aliases: ["great harbour cay", "berry islands"], lat: 25.7436, lng: -77.8453, parish: "Berry Islands", street: "Bullock's Harbour Road" },
  { name: "Cay Sal Bank", aliases: ["cay sal"], lat: 23.7, lng: -80.0, parish: "Cay Sal Bank", street: "Cay Sal" },
  { name: "Colonel Hill, Crooked Island", aliases: ["colonel hill"], lat: 22.7456, lng: -74.1869, parish: "Crooked Island", street: "Queens Highway" },
  { name: "Mangrove Cay, Andros", aliases: ["mangrove cay"], lat: 24.1, lng: -77.7, parish: "Andros", street: "Queens Highway" },
  { name: "Andros Town", aliases: ["fresh creek"], lat: 24.7, lng: -77.77, parish: "Andros", street: "Queens Highway" },
];

export function searchGazetteer(q: string, limit = 6) {
  const needle = q.trim().toLowerCase();
  if (!needle) return [];
  return GAZETTEER.filter((place) => {
    const hay = [place.name, place.parish, place.street, ...place.aliases].join(" ").toLowerCase();
    return needle.split(/[\s,]+/).every((token) => hay.includes(token));
  })
    .slice(0, limit)
    .map((place) => ({
      label: `${place.name} \u00b7 ${place.parish}`,
      lat: place.lat,
      lng: place.lng,
      street: place.street,
      parish: place.parish,
      address: place.name,
      source: "local" as const,
    }));
}

/**
 * True when a point is inside the Bahamas. Two boxes: the main archipelago, and Cay Sal Bank.
 * They are drawn to keep out the Florida coast and most of Cuba, which a single box would not.
 */
export function inBahamas(lat: number, lng: number): boolean {
  const main = lat >= 20.7 && lat <= 27.4 && lng >= -79.6 && lng <= -72.5;
  const caySal = lat >= 23.3 && lat <= 24.3 && lng >= -80.6 && lng <= -79.4;
  return main || caySal;
}

const PARISH_SET = new Set<string>(PARISHES);

/** The island a report belongs to: the one given if it is a real one, otherwise the nearest to the pin. */
export function resolveParish(candidate: unknown, lat: number, lng: number): string {
  if (typeof candidate === "string" && PARISH_SET.has(candidate)) return candidate;
  return nearestParish(lat, lng);
}

/** The island if it is one of the real ones, otherwise null. Used for filters that come from a web address. */
export function knownParish(value: string | null | undefined): string | null {
  return typeof value === "string" && PARISH_SET.has(value) ? value : null;
}

/** Current time in milliseconds. Kept in one function so server pages do not call Date.now() while rendering. */
export const nowMs = (): number => Date.now();

export function nearestParish(lat: number, lng: number): string {
  let best = { parish: "New Providence", d: Infinity };
  for (const place of GAZETTEER) {
    const d = haversineMeters([lat, lng], [place.lat, place.lng]);
    if (d < best.d) best = { parish: place.parish, d };
  }
  return best.parish;
}
