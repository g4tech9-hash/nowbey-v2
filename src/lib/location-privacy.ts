/**
 * Resident pins are published approximately.
 *
 * A pin dropped on a house is also a pin on a person: the public feed shows the coordinates next to the
 * reporter's handle, so an exact pin can say where someone lives. A resident report is therefore stored a
 * short, random distance from the spot they chose. Street-level safety information survives that (a flooded
 * junction is still the junction); a home address does not.
 *
 * The distance comes from PIN_PRIVACY_METERS. Unset means the default below. "0" turns the rule off.
 * It applies to new reports only; existing rows are not rewritten.
 *
 * Pure functions with an injectable random source, so the tests are hermetic.
 */

export const DEFAULT_PIN_PRIVACY_METERS = 60;
const MAX_PIN_PRIVACY_METERS = 500;

export function pinPrivacyMeters(raw: string | undefined = process.env.PIN_PRIVACY_METERS): number {
  const text = raw?.trim();
  if (text === undefined || text === "") return DEFAULT_PIN_PRIVACY_METERS;
  const n = Number(text);
  if (!Number.isFinite(n) || n < 0) return DEFAULT_PIN_PRIVACY_METERS;
  return Math.min(n, MAX_PIN_PRIVACY_METERS);
}

const METRES_PER_DEGREE_LAT = 111_320;
const round6 = (n: number) => Math.round(n * 1e6) / 1e6;

/**
 * Moves a point by a random bearing and a distance between half and the full `meters`, so the published
 * pin is never the exact spot. `offsetMeters` is the distance actually applied (0 when the rule is off).
 */
export function approximatePin(
  lat: number,
  lng: number,
  meters: number,
  random: () => number = Math.random,
): { lat: number; lng: number; offsetMeters: number } {
  if (!(meters > 0)) return { lat, lng, offsetMeters: 0 };
  const bearing = random() * 2 * Math.PI;
  const distance = meters * (0.5 + random() * 0.5);
  const dLat = (distance * Math.cos(bearing)) / METRES_PER_DEGREE_LAT;
  const dLng = (distance * Math.sin(bearing)) / (METRES_PER_DEGREE_LAT * Math.cos((lat * Math.PI) / 180));
  return { lat: round6(lat + dLat), lng: round6(lng + dLng), offsetMeters: Math.round(distance) };
}
