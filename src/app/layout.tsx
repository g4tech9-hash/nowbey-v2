import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { Manrope, Sora } from "next/font/google";
import { AppShell, LiveTicker } from "@/components/app-shell";
import { ErrorReporter } from "@/components/error-reporter";
import { SceneBackdrop } from "@/components/scene-backdrop";
import { SplashScreen } from "@/components/splash-screen";
import { BRAND } from "@/lib/brand";
import { getSiteSettings } from "@/lib/settings";
import { getViewer } from "@/lib/viewer";
import "./globals.css";

const sora = Sora({ subsets: ["latin"], variable: "--font-sora", display: "swap" });
const manrope = Manrope({ subsets: ["latin"], variable: "--font-manrope", display: "swap" });

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

/**
 * Applies the brightness before paint so there is no dark-to-light flash:
 * a saved choice wins, otherwise the admin default, otherwise the OS setting.
 */
const MODE_BOOT = `try{(function(){var d="__SITE_MODE__";var m=null;try{m=localStorage.getItem("nb_mode")}catch(e){}if(m!=="dark"&&m!=="light"){m=d;if(!m||(m!=="dark"&&m!=="light")){try{m=matchMedia("(prefers-color-scheme: light)").matches?"light":"dark"}catch(e){m="dark"}}}document.documentElement.setAttribute("data-mode",m)})()}catch(e){}`;

export default async function RootLayout({ children }: { children: ReactNode }) {
  // Checks the database, so a deleted or suspended member stops looking signed in straight away.
  const [viewer, settings] = await Promise.all([getViewer(), getSiteSettings()]);

  return (
    <html lang="en" className={`${sora.variable} ${manrope.variable}`} data-theme={settings.theme} data-mode={settings.mode} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: MODE_BOOT.replace("__SITE_MODE__", settings.mode) }} />
        {settings.splash ? <script dangerouslySetInnerHTML={{ __html: SPLASH_BOOT }} /> : null}
      </head>
      <body className="min-h-screen bg-abyss-950 text-[#e8f6f4] antialiased">
        <ErrorReporter />
        {settings.theme === "island" ? <SceneBackdrop /> : null}
        {settings.splash ? <SplashScreen tagline={BRAND.tagline} promise={BRAND.promise} /> : null}
        <AppShell handle={viewer.handle} defaultMode={settings.mode}>
          {children}
        </AppShell>
      </body>
    </html>
  );
}
