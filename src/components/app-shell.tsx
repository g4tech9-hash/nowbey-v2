"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useId, type ReactNode } from "react";
import { NavLinks, SessionChip } from "./nav-links";
import { ModeToggle } from "./mode-toggle";
import { BRAND } from "@/lib/brand";
import type { ModeKey } from "@/lib/themes";
import { AccessibilityControls } from "./accessibility-controls";
import { SimpleViewToggle } from "./simple-view-toggle";
import { DisplayTip } from "./display-tip";
import { ArrowIcon, PageIntro } from "./ui";
import { useFillHeight } from "@/lib/use-fill-height";
import { RouteAnnouncer } from "./route-announcer";

export function NowBeyMark({ size = 30 }: { size?: number }) {
  const gradientId = `nbmark-${useId().replace(/:/g, "")}`;

  return (
    <svg width={size} height={size} viewBox="0 0 40 40" aria-hidden className="shrink-0">
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#6be9d9" />
          <stop offset="55%" stopColor="#43e0cc" />
          <stop offset="100%" stopColor="#ff8877" />
        </linearGradient>
      </defs>
      <rect x="1.5" y="1.5" width="37" height="37" rx="12" fill="#0a1b26" stroke={`url(#${gradientId})`} strokeWidth="2" />
      <path d="M8 25.5c3.6-3.4 6.2 2.2 9.9 0 3.7-2.2 5.6 2.6 9.4 0" stroke="#43e0cc" strokeWidth="2" fill="none" strokeLinecap="round" />
      <path
        d="M20 8.5c-3.9 0-7 3-7 6.8 0 4.9 7 11.2 7 11.2s7-6.3 7-11.2c0-3.8-3.1-6.8-7-6.8Z"
        fill="none"
        stroke={`url(#${gradientId})`}
        strokeWidth="2.2"
      />
      <circle cx="20" cy="15.2" r="2.4" fill="#f5c75d" />
    </svg>
  );
}

/**
 * The application shell, re-architected on the landing page's layout grammar:
 * a sticky glass header with pill actions, a centered content column, an
 * editorial footer, and a phone tab bar with a More sheet. The old boxed
 * header/main/footer containers are gone.
 */
export function AppShell({
  children,
  handle,
  defaultMode,
  kicker,
}: {
  children: ReactNode;
  handle: string | null;
  defaultMode: ModeKey;
  kicker?: ReactNode;
}) {
  const isLanding = usePathname() === "/";
  // Measures the real header and bottom nav so --nb-fill-h is never a stale constant. See src/lib/fill-height.ts.
  useFillHeight();
  // Publishes --nb-fill-h from live measurements (header, main padding, bottom nav). See src/lib/fill-height.ts.

  return (
    <div className="grain relative min-h-screen">
      {/* Announces each in-app navigation; the shell swaps <main> without a page load. */}
      <RouteAnnouncer />
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-3 focus:top-3 focus:z-[800] focus:rounded-full focus:bg-tide-500 focus:px-4 focus:py-2 focus:text-[13px] focus:font-extrabold focus:text-[#04202a]"
      >
        Skip to content
      </a>
      {!isLanding ? (
        <>
          {/* The header scrolls with the document on purpose (map and feed content must never sit
              under a sticky bar); only the phone tab bar stays pinned. Same landing material. */}
          <header className="glass-strong nb-pad-top relative z-[650] border-b hairline">
            <div className="mx-auto flex min-h-[76px] w-full max-w-[1320px] items-center gap-4 px-4 sm:px-8">
              <Link href="/" className="flex flex-none items-center gap-2.5">
                <NowBeyMark />
                <span className="leading-none">
                  <span className="block text-[19px] font-extrabold tracking-[-0.055em] text-sand-100" style={{ fontFamily: "var(--font-display)" }}>
                    Now<span className="text-tide-500">Bey</span>
                  </span>
                  <span className="nb-tagline mt-1 block text-[11.5px] font-bold uppercase tracking-[0.14em] text-ink-400">
                    {BRAND.tagline}
                  </span>
                </span>
              </Link>

              <div className="mx-auto hidden items-center lg:flex">
                <NavLinks />
              </div>

              <div className="ml-auto flex items-center gap-2">
                <Link
                  href="/report"
                  className="nb-btn nb-btn-primary hidden sm:inline-flex"
                >
                  Report a spot
                  <ArrowIcon />
                </Link>
                <SimpleViewToggle />
                <ModeToggle defaultMode={defaultMode} />
                <SessionChip handle={handle} />
              </div>
            </div>
            {kicker}
          </header>

          <DisplayTip />
        </>
      ) : null}

      {/* The marketing route has its own full-bleed, sticky navigation and footer. */}
      <main
        id="main"
        className={
          isLanding
            ? "landing-main min-w-0 w-full max-w-none overflow-visible p-0"
            : "mx-auto min-w-0 w-full max-w-[1240px] overflow-x-clip px-4 pb-6 pt-5 sm:px-8 sm:pt-7 lg:pb-12"
        }
      >
        {children}
      </main>

      {!isLanding ? (
        <>
          <footer id="display-options" className="nb-clear-nav mx-auto w-full max-w-[1240px] overflow-x-clip px-4 sm:px-8">
            <div className="grid gap-8 border-t hairline py-9 sm:grid-cols-[1.5fr_1fr_1fr]">
              <div>
                <p className="text-[19px] font-extrabold tracking-[-0.055em] text-sand-100" style={{ fontFamily: "var(--font-display)" }}>
                  Now<span className="text-tide-500">Bey</span>
                </p>
                <p className="mt-2 max-w-[42ch] text-[12.5px] leading-[1.75] text-ink-300">
                  {BRAND.name} · {BRAND.tagline}. Community safety, news and island life — pinned by residents,
                  confirmed by neighbours.
                </p>
                <p className="mt-2 text-[12px] text-ink-400">Pins are placed by residents — verify before you travel.</p>
              </div>
              <nav aria-label="Product">
                <p className="nb-eyebrow mb-3">Explore</p>
                <ul className="space-y-2 text-[12.5px] font-semibold">
                  {[
                    ["/feed", "Community feed"],
                    ["/map", "The map"],
                    ["/report", "Report a hazard"],
                    ["/wire", "News wire"],
                    ["/alerts", "Alerts"],
                  ].map(([href, label]) => (
                    <li key={href}>
                      <Link href={href} className="text-ink-200 transition duration-200 ease-standard hover:text-tide-300">
                        {label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </nav>
              <nav aria-label="Company">
                <p className="nb-eyebrow mb-3">NowBey</p>
                <ul className="space-y-2 text-[12.5px] font-semibold">
                  {[
                    ["/open-now", "What is open now"],
                    ["/support", "Plans and pricing"],
                    ["/mobile", "Mobile app (developers)"],
                    ["/terms", "Terms"],
                    ["/privacy", "Privacy"],
                    ["/cookies", "Cookies and storage"],
                    ["/credits", "Photo credits"],
                  ].map(([href, label]) => (
                    <li key={href}>
                      <Link href={href} className="text-ink-200 transition duration-200 ease-standard hover:text-tide-300">
                        {label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </nav>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-3 border-t hairline py-5">
              <span className="text-[12px] font-bold text-ink-300">Display options</span>
              <AccessibilityControls compact />
            </div>
          </footer>

          <div className="lg:hidden">
            <NavLinks variant="bar" />
          </div>
        </>
      ) : null}
    </div>
  );
}

/**
 * Page intro kept for routes outside the rebuilt core (admin, legal, static).
 * It now renders the landing "section intro" grammar: eyebrow → display
 * headline → muted lede → pill actions.
 */
export function PageHead({
  eyebrow,
  title,
  blurb,
  actions,
}: {
  eyebrow: string;
  title: string;
  blurb?: string;
  actions?: ReactNode;
}) {
  return <PageIntro eyebrow={eyebrow} title={title} blurb={blurb} actions={actions} className="mb-6" />;
}

