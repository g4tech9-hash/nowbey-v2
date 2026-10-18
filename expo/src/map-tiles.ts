/**
 * The basemap the phone app uses.
 *
 * Same problem as the website (src/lib/tiles.ts): OpenStreetMap's community tile server forbids app
 * distribution, and the keyless Esri imagery needs an agreement for anything beyond evaluation. The Expo
 * build reads EXPO_PUBLIC_TILE_* so switching to a licensed provider is an EAS environment change, not a
 * code change:
 *
 *   EXPO_PUBLIC_TILE_STREETS_URL, EXPO_PUBLIC_TILE_IMAGERY_URL, EXPO_PUBLIC_TILE_LABELS_URL,
 *   EXPO_PUBLIC_TILE_MAX_ZOOM
 */
const env = (key: string) => (process.env[key] ?? "").trim();

export const IMAGERY =
  env("EXPO_PUBLIC_TILE_IMAGERY_URL") || "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}";
export const LABELS =
  env("EXPO_PUBLIC_TILE_LABELS_URL") ||
  (env("EXPO_PUBLIC_TILE_IMAGERY_URL")
    ? ""
    : "https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}");
export const STREETS = env("EXPO_PUBLIC_TILE_STREETS_URL") || "https://tile.openstreetmap.org/{z}/{x}/{y}.png";
export const MAX_ZOOM = Number(env("EXPO_PUBLIC_TILE_MAX_ZOOM")) || 19;
