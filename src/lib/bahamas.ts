/**
 * NOWBEY — REAL BAHAMIAN CONTENT BANK (Master Build Section 14).
 *
 * Every island, settlement, street and outlet used by the safety surfaces
 * lives here. No US cities, no lorem, no invented outlets. Settlement
 * coordinates are approximate island anchors used to place radar pins and
 * to give the report API sensible lat/lng defaults per island.
 *
 * This module is dependency-free on purpose: API routes, server components
 * and client screens all import it.
 */

/* ------------------------------------------------------------------ */
/* Hazard taxonomy (API values are stable — never rename)               */
/* ------------------------------------------------------------------ */

export const HAZARD_TYPES = [
  "flooding",
  "power_outage",
  "road_hazard",
  "weather",
  "fire",
  "safety",
] as const;
export type HazardType = (typeof HAZARD_TYPES)[number];

export const SEVERITIES = ["low", "medium", "high", "critical"] as const;
export type Severity = (typeof SEVERITIES)[number];

export const REPORT_STATUSES = ["active", "verified", "resolved"] as const;
export type ReportStatus = (typeof REPORT_STATUSES)[number];

/** Spec 13 — hazard mapping is fixed: Waves=flooding, Zap=power, AlertTriangle=road, Wind=storm, Flame=fire, ShieldAlert=advisory. */
export const HAZARD_META: Record<
  HazardType,
  {
    label: string;
    short: string;
    /** Semantic token names from Section 3 (fills/dots/borders — identical in both modes). */
    color: string;
    /** Small-label text tier var (>=4.5:1 in both modes). */
    textVar: string;
    colorVar: string;
    blurb: string;
  }
> = {
  flooding: {
    label: "Flooding & Surge",
    short: "Flooding",
    color: "#3B82F6",
    colorVar: "--nb-flood",
    textVar: "--nb-flood-text",
    blurb: "Standing water, storm surge, washover",
  },
  power_outage: {
    label: "Power Outage / BPL",
    short: "Power",
    color: "#F59E0B",
    colorVar: "--nb-power",
    textVar: "--nb-power-text",
    blurb: "Outage, sparking line, transformer",
  },
  road_hazard: {
    label: "Road Hazard",
    short: "Roads",
    color: "#F43F5E",
    colorVar: "--nb-road",
    textVar: "--nb-road-text",
    blurb: "Blocked road, downed tree, debris",
  },
  weather: {
    label: "Storm & Gale",
    short: "Storm",
    color: "#14B8A6",
    colorVar: "--nb-storm",
    textVar: "--nb-storm-text",
    blurb: "Squall, gale, marine conditions",
  },
  fire: {
    label: "Brush Fire & Smoke",
    short: "Fire",
    color: "#F97316",
    colorVar: "--nb-fire",
    textVar: "--nb-fire-text",
    blurb: "Brush fire, smoke, visibility",
  },
  safety: {
    label: "Community Advisory",
    short: "Advisory",
    color: "#6366F1",
    colorVar: "--nb-advisory",
    textVar: "--nb-advisory-text",
    blurb: "General neighbour-to-neighbour notice",
  },
};

export function hazardColorVar(type: string): string {
  return HAZARD_META[type as HazardType]?.colorVar ?? "--nb-advisory";
}
export function hazardTextVar(type: string): string {
  return HAZARD_META[type as HazardType]?.textVar ?? "--nb-advisory-text";
}
export function hazardLabel(type: string): string {
  return HAZARD_META[type as HazardType]?.label ?? "Community Advisory";
}
export function hazardShort(type: string): string {
  return HAZARD_META[type as HazardType]?.short ?? "Advisory";
}

export function isHazardType(v: unknown): v is HazardType {
  return typeof v === "string" && (HAZARD_TYPES as readonly string[]).includes(v);
}
export function isSeverity(v: unknown): v is Severity {
  return typeof v === "string" && (SEVERITIES as readonly string[]).includes(v);
}

/* ------------------------------------------------------------------ */
/* Islands, settlements, streets (Master Build Section 14)              */
/* ------------------------------------------------------------------ */

export type IslandCode = "NP" | "GB" | "EL" | "AB" | "EX" | "AN";

export interface Settlement {
  name: string;
  lat: number;
  lng: number;
}

export interface Island {
  code: IslandCode;
  name: string;
  /** Anchor point for the island card / default pin. */
  lat: number;
  lng: number;
  /** Coords readout in the radar header ("LAT 25 04 N · LON 77 20 W" for NP). */
  coordsReadout: string;
  settlements: Settlement[];
}

export const ISLANDS: Island[] = [
  {
    code: "NP",
    name: "New Providence",
    lat: 25.0443,
    lng: -77.3504,
    coordsReadout: "LAT 25 04 N · LON 77 20 W",
    settlements: [
      { name: "Downtown Nassau", lat: 25.078, lng: -77.3383 },
      { name: "Cable Beach", lat: 25.076, lng: -77.401 },
      { name: "Shirley Heights", lat: 25.0356, lng: -77.305 },
      { name: "Carmichael", lat: 25.023, lng: -77.321 },
      { name: "Fox Hill", lat: 25.033, lng: -77.279 },
      { name: "Gladstone", lat: 25.027, lng: -77.348 },
      { name: "Coral Harbour", lat: 24.976, lng: -77.38 },
      { name: "Paradise Island", lat: 25.084, lng: -77.328 },
    ],
  },
  {
    code: "GB",
    name: "Grand Bahama",
    lat: 26.5335,
    lng: -78.6336,
    coordsReadout: "LAT 26 32 N · LON 78 38 W",
    settlements: [
      { name: "Freeport", lat: 26.5333, lng: -78.6333 },
      { name: "Lucaya", lat: 26.512, lng: -78.668 },
      { name: "Eight Mile Rock", lat: 26.226, lng: -78.922 },
      { name: "West End", lat: 26.683, lng: -78.95 },
      { name: "High Rock", lat: 26.6, lng: -78.233 },
    ],
  },
  {
    code: "EL",
    name: "Eleuthera",
    lat: 25.15,
    lng: -76.25,
    coordsReadout: "LAT 25 09 N · LON 76 15 W",
    settlements: [
      { name: "Governor's Harbour", lat: 25.1667, lng: -76.2333 },
      { name: "Rock Sound", lat: 24.8833, lng: -76.2 },
      { name: "Harbour Island", lat: 25.5, lng: -76.6333 },
      { name: "Spanish Wells", lat: 25.55, lng: -76.75 },
      { name: "Glass Window", lat: 25.4333, lng: -76.65 },
    ],
  },
  {
    code: "AB",
    name: "Abaco",
    lat: 26.55,
    lng: -77.0667,
    coordsReadout: "LAT 26 33 N · LON 77 04 W",
    settlements: [
      { name: "Marsh Harbour", lat: 26.545, lng: -77.066 },
      { name: "Hope Town", lat: 26.688, lng: -77.133 },
      { name: "Treasure Cay", lat: 26.755, lng: -77.373 },
      { name: "Green Turtle Cay", lat: 26.772, lng: -77.325 },
      { name: "Coopers Town", lat: 26.878, lng: -77.532 },
    ],
  },
  {
    code: "EX",
    name: "Exuma",
    lat: 23.5167,
    lng: -75.8333,
    coordsReadout: "LAT 23 31 N · LON 75 50 W",
    settlements: [
      { name: "George Town", lat: 23.5167, lng: -75.8333 },
      { name: "Rolleville", lat: 23.6, lng: -75.87 },
      { name: "Staniel Cay", lat: 24.1667, lng: -76.45 },
      { name: "Barreterre", lat: 23.72, lng: -75.9 },
      { name: "Williams Town", lat: 23.567, lng: -75.917 },
    ],
  },
  {
    code: "AN",
    name: "Andros",
    lat: 24.4,
    lng: -77.85,
    coordsReadout: "LAT 24 24 N · LON 77 51 W",
    settlements: [
      { name: "Nicholl's Town", lat: 24.7, lng: -77.7667 },
      { name: "Fresh Creek", lat: 24.2, lng: -77.75 },
      { name: "Kemp's Bay", lat: 24.02, lng: -77.72 },
      { name: "Mangrove Cay", lat: 24.15, lng: -77.87 },
    ],
  },
];

export const ISLAND_CODES = ISLANDS.map((i) => i.code);
export const ISLAND_NAMES = ISLANDS.map((i) => i.name);

export function islandByCode(code: string): Island | undefined {
  return ISLANDS.find((i) => i.code === code);
}

export function islandByName(name: string): Island | undefined {
  return ISLANDS.find((i) => i.name.toLowerCase() === name.trim().toLowerCase());
}

/** Accepts "NP" or "New Providence". */
export function islandFor(value: string): Island | undefined {
  const v = value.trim();
  return islandByCode(v.toUpperCase()) ?? islandByName(v);
}

export function settlementsFor(islandValue: string): Settlement[] {
  return islandFor(islandValue)?.settlements ?? [];
}

/** Sensible lat/lng defaults per island (API rule: defaults per island). */
export function defaultCoords(islandValue: string): { lat: number; lng: number } {
  const island = islandFor(islandValue);
  return island ? { lat: island.lat, lng: island.lng } : { lat: 25.0443, lng: -77.3504 };
}

/** Best settlement anchor for a named settlement, else the island anchor. */
export function coordsForSettlement(islandValue: string, settlement: string): { lat: number; lng: number } {
  const island = islandFor(islandValue);
  if (!island) return defaultCoords(islandValue);
  const hit = island.settlements.find((s) => s.name.toLowerCase() === settlement.trim().toLowerCase());
  return hit ? { lat: hit.lat, lng: hit.lng } : { lat: island.lat, lng: island.lng };
}

/** Normalized radar placement (0–1) inside the archipelago bounding box. */
export const RADAR_BOUNDS = { minLat: 23.35, maxLat: 27.05, minLng: -79.15, maxLng: -76.05 };

export function radarXY(lat: number, lng: number): { x: number; y: number } {
  const { minLat, maxLat, minLng, maxLng } = RADAR_BOUNDS;
  const x = (lng - minLng) / (maxLng - minLng);
  const y = (maxLat - lat) / (maxLat - minLat);
  // Keep pills fully inside the canvas edges.
  return { x: Math.min(0.93, Math.max(0.07, x)), y: Math.min(0.9, Math.max(0.08, y)) };
}

/* ------------------------------------------------------------------ */
/* Streets / landmarks                                                 */
/* ------------------------------------------------------------------ */

export const STREETS = [
  "Bay Street",
  "Shirley Street",
  "East Bay St",
  "Queen's Highway",
  "Glass Window Bridge",
  "Gladstone Road",
  "John F. Kennedy Drive",
  "Coral Harbour",
  "George Town Government Dock",
] as const;

/* ------------------------------------------------------------------ */
/* Outlets & agencies (the ONLY sources on the wire)                   */
/* ------------------------------------------------------------------ */

export interface Outlet {
  name: string;
  url: string;
  kind: "outlet" | "agency";
}

export const OUTLETS: Record<string, Outlet> = {
  tribune: { name: "The Tribune 242", url: "https://www.tribune242.com/", kind: "outlet" },
  guardian: { name: "Nassau Guardian", url: "https://nassauguardian.net/", kind: "outlet" },
  press: { name: "Bahamas Press", url: "https://bahamaspress.com/", kind: "outlet" },
  zns: { name: "ZNS Network", url: "https://www.znsbahamas.com/", kind: "outlet" },
  met: { name: "Bahamas Met Department", url: "https://met.gov.bs/", kind: "agency" },
  bpl: { name: "BPL (Bahamas Power and Light)", url: "https://www.bpl.com.bs/", kind: "agency" },
  police: { name: "Royal Bahamas Police Force", url: "https://www.police.gov.bs/", kind: "agency" },
  works: { name: "Ministry of Works", url: "https://www.works.gov.bs/", kind: "agency" },
};

export const OUTLET_NAMES = Object.values(OUTLETS).map((o) => o.name);

export function outletFor(name: string): Outlet | undefined {
  return Object.values(OUTLETS).find((o) => o.name.toLowerCase() === name.trim().toLowerCase());
}
