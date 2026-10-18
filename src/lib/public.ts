/**
 * Report fields that must never leave the server.
 *
 * `userId` would link a report marked anonymous to a member's handle — the pin is deliberately blurred
 * (see location-privacy.ts), so the identifier is the only thing left that could identify the author.
 *
 * `address` is the second half of that same promise (audit R4). The pin is offset 30–60m, but the stored
 * address came from a reverse-geocode of the exact spot and was published verbatim — so "12 Village Rd"
 * sat next to the blurred coordinate and made the blur decorative. Anything published is now reduced to a
 * road-level description: no house number, no unit, no plot. `street` is already road-level and is used as
 * the fallback.
 */

// A leading house/plot number, with the forms the geocoder actually returns: "12", "12A", "#4", "No. 7",
// "12-A". The [a-z]? is what makes "1st Avenue" survive: "1" cannot be followed by whitespace there.
const HOUSE_NUMBER = /^\s*(?:#|no\.?|number)?\s*\d{1,5}[a-z]?(?:[\s-]*[/-][\s-]*[a-z0-9]{1,4})?\s+/i;

// Unit designators that survive the first cut, e.g. "Coral Gardens Apt 3".
const UNIT_TAIL = /[,·]?\s*\b(?:apt|apartment|unit|suite|flat|studio)\b\.?\s*[\w-]*\s*$/i;

/**
 * Reduce a stored address to something safe to publish: the first segment, without a house number.
 * Returns null rather than an empty string, so callers can fall back cleanly.
 */
export function publicAddress(address?: string | null): string | null {
  if (!address) return null;

  // Everything after the first comma is a town/suburb and is either redundant with the parish or more
  // identifying than the road itself ("…, Nassau").
  let segment = address.split(",")[0] ?? "";
  segment = segment.replace(UNIT_TAIL, "").replace(HOUSE_NUMBER, "").trim();

  // "12" on its own is not a place.
  if (!segment || /^\d+$/.test(segment)) return null;
  return segment.slice(0, 80);
}

type Incidentish = {
  userId?: string | null;
  address?: string | null;
  street?: string | null;
};

/**
 * The only sanctioned shape for a report leaving the server. Anything added to `incidents` that identifies
 * a person or a doorway belongs here, not in the route.
 */
export function publicIncident<T extends Incidentish>(row: T): Omit<T, "userId"> {
  const copy: Record<string, unknown> = { ...row };
  delete copy.userId;

  if ("address" in row || "street" in row) {
    // Keep the key (the UI reads it) but never the doorway.
    copy.address = publicAddress(row.address) ?? row.street ?? null;
  }

  return copy as Omit<T, "userId">;
}
