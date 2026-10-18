import { createHash } from "node:crypto";

/*
 * Incident-command helpers. Everything in this file is pure (no database, no network) so the
 * hermetic unit tests in tests/admin-command.test.mjs can exercise it without a server.
 */

export const MILES_TO_METERS = 1609.344;
/** A custom geofenced alert must cover at least half a mile and at most the whole archipelago. */
export const ALERT_RADIUS_MILES_MIN = 0.5;
export const ALERT_RADIUS_MILES_MAX = 200;
export const ALERT_RADIUS_MILES_DEFAULT = 5;
/** Hard ceiling on one manual blast so a typo cannot email the entire island twice. */
export const ALERT_MAX_RECIPIENTS = 5000;

export function milesToMeters(miles: number): number {
  return miles * MILES_TO_METERS;
}

/** Parses the admin's radius box. Anything unusable falls back to the default; never NaN. */
export function clampAlertRadiusMiles(raw: unknown): number {
  const n = typeof raw === "string" ? Number(raw.trim()) : typeof raw === "number" ? raw : NaN;
  if (!Number.isFinite(n)) return ALERT_RADIUS_MILES_DEFAULT;
  return Math.min(ALERT_RADIUS_MILES_MAX, Math.max(ALERT_RADIUS_MILES_MIN, n));
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Validates a merge request: both ids must be real incident ids and they must differ.
 * Returns the normalised pair, or the error the API should answer with.
 */
export function validateMerge(intoId: unknown, fromId: unknown): { into: string; from: string } | { error: string } {
  const into = String(intoId ?? "").trim();
  const from = String(fromId ?? "").trim();
  if (!UUID_RE.test(into) || !UUID_RE.test(from)) return { error: "Both incidents need a valid id." };
  if (into.toLowerCase() === from.toLowerCase()) return { error: "An incident cannot be merged into itself." };
  return { into, from };
}

/**
 * One-way fingerprint of a push/device token. Ban lists store this, never the token itself,
 * so a leaked backup cannot be used to impersonate a device.
 */
export function tokenFingerprint(token: string): string {
  return createHash("sha256").update(`nowbey-device:${token.trim()}`, "utf8").digest("hex");
}

/** Statuses a report can sit in. "unfounded" = checked out, nothing there. Kept distinct from "archived" (hidden). */
export const REPORT_STATUSES = ["active", "resolved", "unfounded", "archived"] as const;
export type ReportStatus = (typeof REPORT_STATUSES)[number];

export function isReportStatus(v: unknown): v is ReportStatus {
  return typeof v === "string" && (REPORT_STATUSES as readonly string[]).includes(v);
}

/** Statuses the public never sees on the map or in feeds (staff can still open them). Mutable array: drizzle's notInArray requires one. */
export const HIDDEN_STATUSES: string[] = ["archived", "unfounded", "held"];

export function isHiddenStatus(status: string): boolean {
  return HIDDEN_STATUSES.includes(status);
}

export type CustomAlertInput = { title: string; body: string; lat: number; lng: number; radiusMiles: number };

/**
 * Validates the "custom geofenced push" form. Returns the cleaned input or the first problem.
 * Coordinates must be a real point inside The Bahamas (same bounding box as src/lib/geo.ts).
 */
export function validateCustomAlert(raw: { title?: unknown; body?: unknown; lat?: unknown; lng?: unknown; radiusMiles?: unknown }): CustomAlertInput | { error: string } {
  const title = String(raw.title ?? "").trim().replace(/\s+/g, " ");
  const body = String(raw.body ?? "").trim().replace(/\s+/g, " ");
  if (title.length < 4) return { error: "Give the alert a title of at least 4 characters." };
  if (title.length > 120) return { error: "Keep the title under 120 characters so it fits a push notification." };
  if (body.length < 10) return { error: "Describe what is happening in at least 10 characters." };
  if (body.length > 500) return { error: "Keep the description under 500 characters." };
  const lat = typeof raw.lat === "string" ? Number(raw.lat.trim()) : typeof raw.lat === "number" ? raw.lat : NaN;
  const lng = typeof raw.lng === "string" ? Number(raw.lng.trim()) : typeof raw.lng === "number" ? raw.lng : NaN;
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return { error: "Latitude and longitude must be numbers." };
  if (lat < 20.5 || lat > 27.7 || lng < -80.6 || lng > -72.5) return { error: "That point is outside The Bahamas." };
  return { title, body, lat, lng, radiusMiles: clampAlertRadiusMiles(raw.radiusMiles) };
}
