/** Launch-scope feature flags. Features are opt-in: unset and "false" both mean off. */
export const FEATURES = {
  islandLife: process.env.NEXT_PUBLIC_FEATURE_ISLAND_LIFE === "true",
  gasTracker: process.env.NEXT_PUBLIC_FEATURE_GAS_TRACKER === "true",
} as const;
