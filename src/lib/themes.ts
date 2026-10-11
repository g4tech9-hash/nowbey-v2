/**
 * Looks the app can wear. "classic" is exactly how NowBey looked before photos and the splash
 * screen were added, so switching back is always one click (Admin, Appearance) or one setting
 * (NOWBEY_THEME=classic in the server settings).
 */
export const THEMES = {
  island: {
    label: "Island",
    blurb: "Scenic photo backgrounds, a warm lagoon-and-sunset palette and an opening splash screen.",
  },
  classic: {
    label: "Classic",
    blurb: "The original deep-teal look. No photos and no splash screen.",
  },
} as const;

export type ThemeKey = keyof typeof THEMES;
export const THEME_KEYS = Object.keys(THEMES) as ThemeKey[];
export const DEFAULT_THEME: ThemeKey = "island";

export function isThemeKey(v: unknown): v is ThemeKey {
  return typeof v === "string" && Object.prototype.hasOwnProperty.call(THEMES, v);
}

/**
 * The photos, kept in /public/scenes. To use your own, replace a file with another JPEG of the same
 * name (landscape, about 2000px wide and under 500 KB works well). Nothing else needs to change.
 */
export const SCENES = {
  nassau: { src: "/scenes/nassau.jpg", focus: "50% 55%" },
  aerial: { src: "/scenes/aerial.jpg", focus: "50% 50%" },
  sunset: { src: "/scenes/sunset.jpg", focus: "50% 60%" },
  shore: { src: "/scenes/shore.jpg", focus: "50% 50%" },
  lagoon: { src: "/scenes/lagoon.jpg", focus: "50% 50%" },
} as const;

export type SceneKey = keyof typeof SCENES;

/** Which photo sits behind each part of the site. null means a plain background. */
const ROUTES: [prefix: string, scene: SceneKey | null][] = [
  ["/admin", null],
  ["/wire", "nassau"],
  ["/incident", "nassau"],
  ["/life", "sunset"],
  ["/login", "sunset"],
  ["/forgot-password", "sunset"],
  ["/reset-password", "sunset"],
  ["/you", "sunset"],
  ["/support", "shore"],
  ["/mobile", "shore"],
  ["/alerts", "shore"],
  ["/credits", "shore"],
  ["/map", "aerial"],
  ["/report", "aerial"],
];

export function sceneForPath(path: string): SceneKey | null {
  if (path === "/") return "aerial";
  for (const [prefix, scene] of ROUTES) {
    if (path === prefix || path.startsWith(`${prefix}/`)) return scene;
  }
  return "lagoon";
}

export const PHOTO_CREDITS = [
  { scene: "nassau" as const, creator: "Francisco Cornellana Castells", url: "https://www.pexels.com/photo/scenic-view-of-ocean-during-dawn-1062021/", note: "Beach and pier at twilight, Nassau, The Bahamas" },
  { scene: "aerial" as const, creator: "Jess Loiterton", url: "https://www.pexels.com/photo/aerial-view-of-green-trees-and-body-of-water-4784391/", note: "Aerial view of a tropical beach" },
  { scene: "sunset" as const, creator: "Ahmed Ashraf", url: "https://www.pexels.com/photo/serene-tropical-sunset-with-silhouetted-palms-31167764/", note: "Tropical sunset with palm silhouettes" },
  { scene: "shore" as const, creator: "Asad Photo Maldives", url: "https://www.pexels.com/photo/serene-white-sand-beach-and-turquoise-water-28408402/", note: "White sand beach and turquoise water" },
  { scene: "lagoon" as const, creator: "Francesco Ungaro", url: "https://www.pexels.com/photo/an-aerial-view-of-a-beach-with-blue-water-27705360/", note: "Aerial view of a beach with blue water" },
];
