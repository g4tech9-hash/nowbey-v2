/**
 * Where the basemap comes from — one place, overridable, with a warning nobody can miss.
 *
 * The audit's H3 finding was a licensing problem, not a coding one: `tile.openstreetmap.org` is run by
 * volunteers and its tile usage policy forbids distributing it inside an app, and the Esri endpoints are
 * keyless but need an ArcGIS agreement for anything beyond light use. Neither can be *fixed* in this
 * repository — a contract has to be signed. What this file can do is make switching providers a one-line
 * environment change at build time, and make shipping without one loud.
 *
 * Set these on the deployment:
 *   NEXT_PUBLIC_TILE_STREETS_URL   e.g. https://tiles.yourprovider.example/{z}/{x}/{y}.png
 *   NEXT_PUBLIC_TILE_STREETS_ATTRIBUTION   the credit line the provider requires (HTML allowed)
 *   NEXT_PUBLIC_TILE_IMAGERY_URL   aerial imagery template
 *   NEXT_PUBLIC_TILE_LABELS_URL    transparent label overlay, if the provider splits them
 *   NEXT_PUBLIC_TILE_MAX_ZOOM      defaults to 19
 *
 * The Expo app reads the matching EXPO_PUBLIC_* names (see expo/src/map-tiles.ts).
 */

const streets = (process.env.NEXT_PUBLIC_TILE_STREETS_URL ?? "").trim();
const imagery = (process.env.NEXT_PUBLIC_TILE_IMAGERY_URL ?? "").trim();
const labels = (process.env.NEXT_PUBLIC_TILE_LABELS_URL ?? "").trim();
const maxZoomRaw = Number(process.env.NEXT_PUBLIC_TILE_MAX_ZOOM);
const attribution = process.env.NEXT_PUBLIC_TILE_STREETS_ATTRIBUTION?.trim();

/** Shown in place of the default credit when a contracted provider supplies its own. */
export const TILE_ATTRIBUTION =
  attribution || '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';

/** True when the deployment has pointed the map at a licensed provider. */
export const TILES_CONFIGURED = Boolean(streets || imagery);

export const TILE_MAX_ZOOM = Number.isFinite(maxZoomRaw) && maxZoomRaw >= 1 && maxZoomRaw <= 24 ? maxZoomRaw : 19;

/**
 * Development defaults. They are honest about their limits: OSM for streets is fine for a laptop and not fine
 * for an app in a store; Esri's keyless imagery is fine while evaluating.
 */
export const DEFAULT_STREETS = "https://tile.openstreetmap.org/{z}/{x}/{y}.png";
export const DEFAULT_IMAGERY = "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}";
export const DEFAULT_LABELS =
  "https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}";

export const STREET_URL = streets || DEFAULT_STREETS;
export const IMAGERY_URL = imagery || DEFAULT_IMAGERY;
export const LABELS_URL = labels || (imagery ? "" : DEFAULT_LABELS);

/**
 * A single warning in the server log when production is still on the community endpoints.
 *
 * Not a build failure on purpose: the site must still boot if the key is missing, or a typo in an env
 * variable becomes an outage. But it must be impossible to ship quietly.
 */
let warned = false;
export function warnIfTilesUnlicensed(): void {
  if (warned || process.env.NODE_ENV !== "production" || TILES_CONFIGURED) return;
  warned = true;
  console.warn(
    "[tiles] Production is using OpenStreetMap's community tile server and/or Esri keyless imagery. " +
      "OSM's tile policy forbids app distribution and Esri requires an agreement beyond light use. " +
      "Set NEXT_PUBLIC_TILE_STREETS_URL / NEXT_PUBLIC_TILE_IMAGERY_URL before release. See docs/TILES.md.",
  );
}
