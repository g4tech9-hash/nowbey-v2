import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import localFont from "next/font/local";
import { AppShell } from "@/components/app-shell";
import { ErrorReporter } from "@/components/error-reporter";
import { SceneBackdrop } from "@/components/scene-backdrop";
import { SplashScreen } from "@/components/splash-screen";
import { OfflineWorker } from "@/components/offline-worker";
import { PulseTokensGuard } from "@/ui/pulse";
import { headers } from "next/headers";
import { BRAND } from "@/lib/brand";
import { getSiteSettings } from "@/lib/settings";
import { lookAttr } from "@/lib/themes";
import { getViewer } from "@/lib/viewer";
import { pulseBootScript } from "@/lib/pulse/prefs";
import { PULSE_META_COLOR } from "@/lib/pulse/prefs";
import "./globals.css";

/* =============================================================================
   NOWBEY PULSE — ROOT LAYOUT
   Typography and theming are set here and nowhere else:

   • Type: Bricolage Grotesque (display), Inter (UI/body), JetBrains Mono
     (coordinates, timestamps, counts). Self-hosted as latin variable subsets,
     so first paint never waits on a font CDN — the FCP budget has no room for
     a render-blocking third-party request.
   • Theme: `data-theme` is light|dark (the Pulse axis); the photographic
     "Island" look moved to `data-look`. Both are applied before paint by
     pulseBootScript(), which is the only reason a returning visitor does not
     see a flash of the wrong theme.
   ============================================================================= */

const bricolage = localFont({
  src: "./fonts/bricolage-latin.woff2",
  weight: "200 800",
  variable: "--font-bricolage",
  display: "swap",
});
const inter = localFont({
  src: "./fonts/inter-latin.woff2",
  weight: "100 900",
  variable: "--font-inter",
  display: "swap",
});
const jetbrainsMono = localFont({
  src: "./fonts/jetbrains-mono-latin.woff2",
  weight: "100 800",
  variable: "--font-jbmono",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: `${BRAND.name} · ${BRAND.tagline}`,
    template: `%s · ${BRAND.name}`,
  },
  description: BRAND.description,
  applicationName: BRAND.name,
};

/**
 * One theme-color, not a prefers-color-scheme pair: on a Pulse page the theme
 * is what the *page* says it is, and the toggle in src/ui/pulse/theme.tsx
 * rewrites this value in the same tick it flips the theme. A media-queried pair
 * would let the browser chrome disagree with the page whenever a visitor had
 * picked Daylight on a dark-mode OS.
 */
export const viewport: Viewport = {
  themeColor: PULSE_META_COLOR.dark,
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover", // let the shell draw under the notch, then pad for it
  colorScheme: "dark light",
};

/** Runs before the page is painted, so the splash screen never flashes up again on a return visit. */
const SPLASH_BOOT = `try{if(sessionStorage.getItem("nb_splash"))document.documentElement.setAttribute("data-splash-seen","1")}catch(e){}`;

export default async function RootLayout({ children }: { children: ReactNode }) {
  // Checks the database, so a deleted or suspended member stops looking signed in straight away.
  const [viewer, settings, h] = await Promise.all([getViewer(), getSiteSettings(), headers()]);
  // The proxy sets a per-request nonce and pathname; both are trusted request-scoped values.
  const nonce = h.get("x-nonce") ?? undefined;
  const initialPath = h.get("x-nowbey-pathname");

  return (
    <html
      lang="en"
      className={`${bricolage.variable} ${inter.variable} ${jetbrainsMono.variable}`}
      data-theme={settings.mode}
      data-mode={settings.mode}
      data-look={lookAttr(settings.theme)}
      suppressHydrationWarning
    >
      <head>
        <script nonce={nonce} dangerouslySetInnerHTML={{ __html: pulseBootScript(settings.mode, { splash: settings.splash }) }} />
        {settings.splash ? <script nonce={nonce} dangerouslySetInnerHTML={{ __html: SPLASH_BOOT }} /> : null}
      </head>
      <body className="pulse-shell min-h-screen">
        <a href="#main" className="pulse-skip">
          Skip to content
        </a>
        <div className="pulse-ambient pulse-noise" aria-hidden />
        <ErrorReporter />
        <OfflineWorker />
        <PulseTokensGuard />
        {settings.theme === "island" ? <SceneBackdrop /> : null}
        {settings.splash && initialPath !== "/" ? <SplashScreen tagline={BRAND.tagline} promise={BRAND.promise} /> : null}
        <AppShell handle={viewer.handle} defaultMode={settings.mode}>
          {children}
        </AppShell>
      </body>
    </html>
  );
}
