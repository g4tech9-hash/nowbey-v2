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
import "./globals.css";

const sora = localFont({ src: "./fonts/sora-latin.woff2", weight: "100 800", variable: "--font-sora", display: "swap" });
const manrope = localFont({ src: "./fonts/manrope-latin.woff2", weight: "200 800", variable: "--font-manrope", display: "swap" });

export const metadata: Metadata = {
  title: {
    default: `${BRAND.name} · ${BRAND.tagline}`,
    template: `%s · ${BRAND.name}`,
  },
  description: BRAND.description,
  applicationName: BRAND.name,
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
  // Checks the database, so a deleted or suspended member stops looking signed in straight away.
  const [viewer, settings, h] = await Promise.all([getViewer(), getSiteSettings(), headers()]);
  // The proxy sets a per-request nonce for the content security policy; the inline boot scripts carry it.
  const nonce = h.get("x-nonce") ?? undefined;

  return (
    <html lang="en" className={`${sora.variable} ${manrope.variable}`} data-theme={settings.theme} data-mode={settings.mode} suppressHydrationWarning>
      <head>
        <script nonce={nonce} dangerouslySetInnerHTML={{ __html: MODE_BOOT.replace("__SITE_MODE__", settings.mode) }} />
        <script nonce={nonce} dangerouslySetInnerHTML={{ __html: PREFS_BOOT }} />
        {settings.splash ? <script nonce={nonce} dangerouslySetInnerHTML={{ __html: SPLASH_BOOT }} /> : null}
      </head>
      <body className="min-h-screen bg-abyss-950 text-ink-100 antialiased">
        <ErrorReporter />
        <OfflineWorker />
        {settings.theme === "island" ? <SceneBackdrop /> : null}
        {settings.splash ? <SplashScreen tagline={BRAND.tagline} promise={BRAND.promise} /> : null}
        <AppShell handle={viewer.handle} defaultMode={settings.mode} bare={!viewer.signedIn && (h.get("x-pathname") ?? "") === "/"}>
          {children}
        </AppShell>
      </body>
    </html>
  );
}
