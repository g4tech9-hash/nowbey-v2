/**
 * The words and the look of the app, in one place.
 *
 * To go back to the original plain look, start Expo with EXPO_PUBLIC_NOWBEY_THEME=classic
 * (or change THEME below). Classic has no photos and no splash screen. To keep the Island look
 * but skip only the splash, use EXPO_PUBLIC_NOWBEY_SPLASH=off.
 */
export const BRAND = {
  name: "NowBey",
  tagline: "Stay Safe, Bahamas",
  promise: "Know what is happening, island by island.",
} as const;

/**
 * Who owns the app, and the notice that goes with it.
 *
 * ™ not ®: the marks are claimed by use, not yet registered. Switch to ® only
 * once a registration issues — using it early is itself a misrepresentation.
 * See TRADEMARKS.md in the repository root.
 */
export const LEGAL = {
  entity: "Oasis Technology",
  email: "oasistechnology242@gmail.com",
  trademark: "NowBey™ is a trademark of Oasis Technology.",
  copyright: (year = new Date().getFullYear()) => `© ${year} Oasis Technology. All rights reserved.`,
} as const;

export type ThemeKey = "island" | "classic";

const requested = process.env.EXPO_PUBLIC_NOWBEY_THEME?.trim().toLowerCase();
export const THEME: ThemeKey = requested === "classic" ? "classic" : "island";

export const SPLASH_ENABLED = THEME === "island" && process.env.EXPO_PUBLIC_NOWBEY_SPLASH?.trim().toLowerCase() !== "off";
