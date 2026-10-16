import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { Inter, Space_Grotesk, Space_Mono } from "next/font/google";
import { AppShell } from "@/components/app-shell";
import { ErrorReporter } from "@/components/error-reporter";
import { SceneBackdrop } from "@/components/scene-backdrop";
import { SplashScreen } from "@/components/splash-screen";
import { BRAND } from "@/lib/brand";
import { getSiteSettings } from "@/lib/settings";
import { getViewer } from "@/lib/viewer";
import "./globals.css";

/* Option B type system: Space Grotesk (display), Inter (body), Space Mono (data).
   The CSS variables feed the @theme font tokens in src/index.css. */
const display = Space_Grotesk({ subsets: ["latin"], variable: "--font-space-grotesk", display: "swap" });
const body = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });
const mono = Space_Mono({ subsets: ["latin"], weight: ["400", "700"], variable: "--font-space-mono", display: "swap" });

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
    { media: "(prefers-color-scheme: light)", color: "var(--color-ink)" },
    { media: "(prefers-color-scheme: dark)", color: "var(--color-page)" },
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
  const [viewer, settings] = await Promise.all([getViewer(), getSiteSettings()]);

  return (
    <html
      lang="en"
      className={`${display.variable} ${body.variable} ${mono.variable}`}
      data-theme={settings.theme}
      data-mode={settings.mode}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: MODE_BOOT.replace("__SITE_MODE__", settings.mode) }} />
        <script dangerouslySetInnerHTML={{ __html: PREFS_BOOT }} />
        {settings.splash ? <script dangerouslySetInnerHTML={{ __html: SPLASH_BOOT }} /> : null}
      </head>
      <body className="min-h-screen bg-page text-ink antialiased">
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
