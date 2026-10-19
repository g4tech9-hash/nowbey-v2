/**
 * Report utilities for data integrity — FEED POLLUTION & FALSE PRECISION
 */

import { haversineMeters } from "./geo.ts";

export const CANNED_PHOTO_NOTES = [
  "Photo note: water up to the first step of the shelter",
  "water up to the first step",
] as const;

export function isCannedPhotoNote(note: string | null | undefined): boolean {
  if (!note) return false;
  const n = note.trim().toLowerCase();
  return CANNED_PHOTO_NOTES.some((c) => n.includes(c.toLowerCase()));
}

export function shouldCollapseTitleBody(title: string, body: string | null): boolean {
  if (!body) return false;
  const norm = (s: string) => s.trim().toLowerCase().replace(/[^a-z0-9]+/g, " ");
  return norm(title) === norm(body);
}

/** Approximate island centroid for Grand Bahama — used to detect unmapped pins */
export const ISLAND_CENTROIDS: Record<string, { lat: number; lng: number }> = {
  "Grand Bahama": { lat: 26.533, lng: -78.6999 },
  Exuma: { lat: 23.6, lng: -75.9 },
  Abaco: { lat: 26.05, lng: -77.1 },
  Eleuthera: { lat: 25.1, lng: -76.2 },
  Andros: { lat: 24.7, lng: -77.8 },
};

export function isApproximateLocation(lat: number, lng: number, toleranceMeters = 200): boolean {
  for (const c of Object.values(ISLAND_CENTROIDS)) {
    if (haversineMeters([lat, lng], [c.lat, c.lng]) < toleranceMeters) return true;
  }
  // Also treat exact integer-like centroid as approximate
  return false;
}

export function isIslandLevelApproximate(lat: number, lng: number): boolean {
  // Grand Bahama centroid exact match (4 decimals)
  return Math.abs(lat - 26.533) < 0.001 && Math.abs(lng - -78.6999) < 0.001;
}

/** Content-vs-category sanity check: sale spam under Flooding etc should be auto-held */
const SALE_TOKENS = /(big sale|saw it too|discount|shop now|o-tech|pc solutions|% off|limited stock)/i;
const FLOOD_TOKENS = /(flood|water|drainage|storm|outage)/i;

export function isContentCategoryMismatch(title: string, details: string | null, category: string): boolean {
  const text = `${title} ${details ?? ""}`;
  // If text is clearly commercial but category is a hazard, flag it
  if (SALE_TOKENS.test(text) && ["flood", "storm", "power", "water", "road", "fire", "health", "crime", "marine"].includes(category)) {
    return true;
  }
  return false;
}

export function flagReasonForMismatch(title: string, details: string | null, category: string): string | null {
  if (isContentCategoryMismatch(title, details, category)) {
    return `Content-category mismatch: "${title.slice(0, 60)}" filed as ${category}`;
  }
  return null;
}

export type ClusterGroup<T extends { id: string; title: string; lat: number; lng: number; createdAt: string | Date }> = {
  key: string;
  primary: T;
  duplicates: T[];
  count: number;
};

/**
 * Cluster duplicate reports: same normalised title within ~150m and 24h → ONE card
 * Returns groups where duplicates are merged.
 */
export function clusterDuplicateReports<T extends { id: string; title: string; lat: number; lng: number; createdAt: string | Date }>(
  rows: T[],
  opts: { distanceM?: number; windowMs?: number } = {},
): ClusterGroup<T>[] {
  const distanceM = opts.distanceM ?? 150;
  const windowMs = opts.windowMs ?? 24 * 3600 * 1000;
  const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
  const groups: ClusterGroup<T>[] = [];
  const used = new Set<string>();

  for (const row of rows) {
    if (used.has(row.id)) continue;
    const nTitle = norm(row.title);
    const group: T[] = [row];
    for (const other of rows) {
      if (other.id === row.id || used.has(other.id)) continue;
      if (norm(other.title) !== nTitle) continue;
      const d = haversineMeters([row.lat, row.lng], [other.lat, other.lng]);
      const timeDiff = Math.abs(new Date(row.createdAt).getTime() - new Date(other.createdAt).getTime());
      if (d <= distanceM && timeDiff <= windowMs) {
        group.push(other);
        used.add(other.id);
      }
    }
    used.add(row.id);
    groups.push({
      key: row.id,
      primary: row,
      duplicates: group.slice(1),
      count: group.length,
    });
  }
  return groups;
}
