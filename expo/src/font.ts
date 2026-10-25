/**
 * Pulse typography loader — bundles the web's own fonts so the app reads
 * “Bricolage Grotesque (display) + Inter (body) + JetBrains Mono (coords)”
 * instead of the OS sans. You picked “bundle” for fonts.
 *
 * The .woff2 files are the latin variable subsets from src/app/fonts (FCP
 * budget safe: no CDN, display:swap equivalent via expo-font).
 */
import { useEffect } from "react";

// woff2 is web-only. On native, Metro + expo-font expect ttf/otf. We keep the
// woff2 assets for expo-web parity and load fonts only where supported.
// Native falls back to system sans (San Francisco/Roboto) with matching weights
// until ttf sources are added — see DECISIONS.md note below.

let useFonts: any = () => [true, null] as const;
try {
  // optional dep — not fatal if missing (e.g. fresh clone without `npm i`)
  useFonts = require("expo-font").useFonts;
} catch {}
let SplashScreen: any = { preventAutoHideAsync: async () => {}, hideAsync: async () => {} };
try {
  SplashScreen = require("expo-splash-screen");
  SplashScreen.preventAutoHideAsync().catch(() => {});
} catch {}

// Only attempt woff2 on web; native defers to system fonts.
const isWeb = typeof window !== "undefined" && typeof document !== "undefined";

const fonts = isWeb
  ? {
      BricolageGrotesque: require("../assets/bricolage-latin.woff2"),
      Inter: require("../assets/inter-latin.woff2"),
      JetBrainsMono: require("../assets/jetbrains-mono-latin.woff2"),
    }
  : null;

export function usePulseFonts() {
  const [loaded, error] = fonts ? (useFonts(fonts as any) as [boolean, unknown]) : [true, null];
  useEffect(() => {
    if (loaded || error) SplashScreen.hideAsync().catch(() => {});
  }, [loaded, error]);
  return loaded;
}

export const fontFamily = {
  display: "BricolageGrotesque",
  sans: "Inter",
  mono: "JetBrainsMono",
} as const;
