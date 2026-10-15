/**
 * Launch-scope feature flags. Deferred products require an explicit expanded launch stage as well
 * as their individual switch, so a stale Vercel variable cannot accidentally put them back into
 * the streamlined Nassau hazard/news MVP.
 */
const EXPANDED = process.env.NEXT_PUBLIC_LAUNCH_STAGE === "expanded";

export const FEATURES = {
  islandLife: EXPANDED && process.env.NEXT_PUBLIC_FEATURE_ISLAND_LIFE === "true",
  gasTracker: EXPANDED && process.env.NEXT_PUBLIC_FEATURE_GAS_TRACKER === "true",
} as const;
