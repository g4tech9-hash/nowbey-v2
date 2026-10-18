import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import localFont from "next/font/local";
import { AppShell, LiveTicker } from "@/components/app-shell";
import { ErrorReporter } from "@/components/error-reporter";
import { SceneBackdrop } from "@/components/scene-backdrop";
import { SplashScreen } from "@/components/splash-screen";
import { OfflineWorker } from "@/components/offline-worker";
import { headers } from "next/headers";
import { BRAND } from "@/lib/brand";
import { getSiteSettings } from "@/lib/settings";
import { getViewer } from "@/lib/viewer";
import { warnIfTilesUnlicensed } from "@/lib/tiles";
import "./globals.css";

const sora = localFont({ src: "./fonts/sora-latin.woff2", weight: "100 800", variable: "--font-sora", display: "swap" });
const manrope = localFont({ src: "./fonts/manrope-latin.woff2", weight: "200 800", variable: "--font-manrope", display: "swap" });
/**
 * The claim voice. One job only: the single sentence per screen that states the situation. Never body copy,
 * never a row, never a button — see REGISTERS.md. Variable weight, so the claim can be 420 in rest and 500 in
 * storm without shipping a second file.
 */
const newsreader = localFont({ src: "./fonts/newsreader-latin.woff2", weight: "200 800", variable: "--font-newsreader", display: "swap" });

export const metadata: Metadata = {
  title: {
    default: `${BRAND.name} · ${BRAND.tagline}`,
    template: `%s · ${BRAND.name}`,
  },
  description: BRAND.description,
  applicationName: BRAND.name,
  // These were missing, so every install prompt and every tab had no icon: `public/` did not exist at all and
  // the manifest pointed at /icon.svg, which 404'd. An installable app with a blank icon reads as unfinished.
  icons: {
    icon: [
      { url: "/icon.svg", type: "image/svg+xml" },
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180" }],
  },
  openGraph: {
    type: "website",
    siteName: BRAND.name,
    title: `${BRAND.name} · ${BRAND.tagline}`,
    description: BRAND.description,
    images: [{ url: "/og.png", width: 1200, height: 630, alt: `${BRAND.name} — ${BRAND.tagline}` }],
  },
  twitter: { card: "summary_large_image", images: ["/og.png"] },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f4ede0" },
    { media: "(prefers-color-scheme: dark)", color: "#03121b" },
  ],
  colorScheme: "dark light",
};

/** Runs before the page is painted, so the splash screen never flashes up again on a return visit. */
const SPLASH_BOOT = `try{if(sessionStorage.getItem("nb_splash"))document.documentElement.setAttribute("data-splash-seen","1")}catch(e){}`;

/** Applies accessibility/data preferences before paint to avoid a flash of the standard view. */
const PREFS_BOOT = `try{var r=document.documentElement;r.setAttribute("data-simple",localStorage.getItem("nb_simple")==="1"?"true":"false");r.setAttribute("data-low-data",localStorage.getItem("nb_low_data")==="1"?"true":"false")}catch(e){}`;

/**
 * Applies the brightness before paint so there is no dark-to-light flash:
 * a saved choice wins, otherwise the admin default, otherwise the OS setting.
 */
const MODE_BOOT = `try{(function(){var d="__SITE_MODE__";var m=null;try{m=localStorage.getItem("nb_mode")}catch(e){}if(m!=="dark"&&m!=="light"){m=d;if(!m||(m!=="dark"&&m!=="light")){try{m=matchMedia("(prefers-color-scheme: light)").matches?"light":"dark"}catch(e){m="dark"}}}document.documentElement.setAttribute("data-mode",m)})()}catch(e){}`;

export default async function RootLayout({ children }: { children: ReactNode }) {
  // One line in the server log if production is still on community tile servers. Never a build failure.
  warnIfTilesUnlicensed();
  // Checks the database, so a deleted or suspended member stops looking signed in straight away.
  const [viewer, settings, h] = await Promise.all([getViewer(), getSiteSettings(), headers()]);
  // The proxy sets a per-request nonce and pathname; both are trusted request-scoped values.
  const nonce = h.get("x-nonce") ?? undefined;
  const initialPath = h.get("x-nowbey-pathname");

  return (
    <html lang="en" className={`${sora.variable} ${manrope.variable} ${newsreader.variable}`} data-theme={settings.theme} data-mode={settings.mode} suppressHydrationWarning>
      <head>
        <script nonce={nonce} dangerouslySetInnerHTML={{ __html: MODE_BOOT.replace("__SITE_MODE__", settings.mode) }} />
        <script nonce={nonce} dangerouslySetInnerHTML={{ __html: PREFS_BOOT }} />
        {settings.splash ? <script nonce={nonce} dangerouslySetInnerHTML={{ __html: SPLASH_BOOT }} /> : null}
      </head>
      <body className="min-h-screen bg-abyss-950 text-ink-100 antialiased">
        <ErrorReporter />
        <OfflineWorker />
        {settings.theme === "island" ? <SceneBackdrop /> : null}
        {/*
          The splash is a brand moment for the front door, not a toll gate on every link. It used to render on
          every route except "/", so someone following a shared hazard report waited 3.9 seconds to see it —
          the worst possible place to spend the reader's patience. Now: front door only, and short.
        */}
        {settings.splash && initialPath === "/" ? <SplashScreen tagline={BRAND.tagline} promise={BRAND.promise} /> : null}
        <AppShell handle={viewer.handle} defaultMode={settings.mode}>
          {children}
        </AppShell>
      </body>
    </html>
  );
}
