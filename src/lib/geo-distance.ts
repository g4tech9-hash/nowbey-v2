/**
 * Great-circle distance, with no imports.
 *
 * Split out of src/lib/push.ts for one reason: push.ts imports the database, so
 * anything that needs the maths -- the geofence matcher, the map's "what is
 * near me", a future "sort by distance" -- had to pull the whole database in to
 * get at it. This module is pure, which means it can be unit-tested without a
 * server, and imported from anywhere without dragging a connection along.
 */

/** Mean Earth radius in kilometres. */
export const EARTH_RADIUS_KM = 6371;

/** One mile, in kilometres. The US survey mile, which is what "miles" means here. */
export const MILES_TO_KM = 1.609344;

/**
 * Distance between two points on the globe, in kilometres.
 *
 * Haversine, which treats the Earth as a sphere. Over the length of a Bahamian
 * island that approximation is worth metres, and a radius measured in miles
 * does not need better. Clamping the argument to asin() keeps a floating-point
 * overshoot at the antipodes from producing NaN.
 */
export function distanceKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.min(1, Math.sqrt(a)));
}

/** Miles to kilometres. Named so the call sites read as a conversion, not a magic number. */
export function milesToKm(miles: number): number {
  return miles * MILES_TO_KM;
}

/**
 * Is this point inside a circle of `radiusMiles` around the centre?
 *
 * Written as its own function because the comparison is the part that must not
 * drift: "within 2 miles" has to mean the same thing in the push matcher, in
 * the map, and in the admin composer.
 */
export function withinMiles(lat1: number, lng1: number, lat2: number, lng2: number, radiusMiles: number): boolean {
  return distanceKm(lat1, lng1, lat2, lng2) <= milesToKm(radiusMiles);
}
