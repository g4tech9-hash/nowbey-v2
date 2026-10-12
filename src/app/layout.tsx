import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { Manrope, Sora } from "next/font/google";
import { AppShell, LiveTicker } from "@/components/app-shell";
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
  themeColor: "#03121b",
  colorScheme: "dark",
};

/** Runs before the page is painted, so the splash screen never flashes up again on a return visit. */
const SPLASH_BOOT = `try{if(sessionStorage.getItem("nb_splash"))document.documentElement.setAttribute("data-splash-seen","1")}catch(e){}`;

export default async function RootLayout({ children }: { children: ReactNode }) {
  // Checks the database, so a deleted or suspended member stops looking signed in straight away.
  const [viewer, settings] = await Promise.all([getViewer(), getSiteSettings()]);

  return (
    <html lang="en" className={`${sora.variable} ${manrope.variable}`} data-theme={settings.theme} suppressHydrationWarning>
      <head>{settings.splash ? <script dangerouslySetInnerHTML={{ __html: SPLASH_BOOT }} /> : null}</head>
      <body className="min-h-screen bg-abyss-950 text-[#e8f6f4] antialiased">
        {settings.theme === "island" ? <SceneBackdrop /> : null}
        {settings.splash ? <SplashScreen tagline={BRAND.tagline} promise={BRAND.promise} /> : null}
        <AppShell handle={viewer.handle}>
          {children}
        </AppShell>
      </body>
    </html>
  );
}
