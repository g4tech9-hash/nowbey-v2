"use client";

import Link from "next/link";
import { useId } from "react";
import { usePathname } from "next/navigation";
import type { ModeKey } from "@/lib/themes";
import type { ReactNode } from "react";
import { NavLinks, PulseNavRail, PulseTabBar, ReportFab, SessionChip } from "./nav-links";
import { ModeToggle } from "./mode-toggle";
import { LiveTicker } from "./live-ticker";
import { BRAND } from "@/lib/brand";
import { AccessibilityControls } from "./accessibility-controls";
import { SimpleViewToggle } from "./simple-view-toggle";
import { DisplayTip } from "./display-tip";
import { ArrowIcon, PageIntro } from "./ui";
import { CommandPalette } from "@/ui/pulse/command-palette";
import { CategoryLegend } from "@/ui/pulse/theme";

/**
 * The brand mark, drawn from the theme rather than from four hex literals: the
 * stroke is the accent token, so the mark is automatically the light-theme teal
 * on paper and the glowing teal on black.
 */
export function NowBeyMark({ size = 32 }: { size?: number }) {
  const gradientId = `nbmark-${useId().replace(/:/g, "")}`;
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" aria-hidden className="shrink-0">
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="var(--accent)" />
          <stop offset="62%" stopColor="var(--accent)" />
          <stop offset="100%" stopColor="var(--danger)" />
        </linearGradient>
      </defs>
      <rect x="1.5" y="1.5" width="37" height="37" rx="12" fill="var(--bg-raised)" stroke={`url(#${gradientId})`} strokeWidth="2" />
      <path d="M8 25.5c3.6-3.4 6.2 2.2 9.9 0 3.7-2.2 5.6 2.6 9.4 0" stroke="var(--accent)" strokeWidth="2" fill="none" strokeLinecap="round" opacity="0.85" />
      <path
        d="M20 8.5c-3.9 0-7 3-7 6.8 0 4.9 7 11.2 7 11.2s7-6.3 7-11.2c0-3.8-3.1-6.8-7-6.8Z"
        fill="none"
        stroke={`url(#${gradientId})`}
        strokeWidth="2.2"
      />
      <circle cx="20" cy="15.2" r="2.4" fill="var(--warning)" />
    </svg>
  );
}

export function Wordmark({ size = 19 }: { size?: number }) {
  return (
    <span className="leading-none tracking-[-0.045em] text-primary" style={{ fontFamily: "var(--font-display)", fontSize: size, fontWeight: 800 }}>
      Now<span style={{ color: "var(--text-accent)" }}>Bey</span>
    </span>
  );
}

/**
 * The application shell.
 *
 * One chrome, three geometries (the responsive contract in the design doc):
 *   <640        bottom nav with a raised centre Report action, sheets from below
 *   640–1024    top bar with pills, inspector docks under the stream
 *   ≥1024       sticky left rail + content, FAB bottom-right
 *
 * The landing route owns its own header and footer and gets no shell chrome;
 * /admin keeps the bar but not the rail, because a moderation table needs every
 * pixel of width and already has its own nav.
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
  const pathname = usePathname();
  const isLanding = pathname === "/";
  const isAdmin = pathname === "/admin" || pathname.startsWith("/admin/");
  const showRail = !isLanding && !isAdmin;

  if (isLanding) {
    return (
      <div className="pulse-shell">
        <main id="main" className="w-full max-w-none p-0">
          {children}
        </main>
      </div>
    );
  }

  return (
    <div className="pulse-shell">
      <header className="pulse-topbar pulse-glass-strong relative z-[650] border-b border-default">
        <div className="mx-auto flex min-h-[var(--pulse-header-h)] w-full max-w-[var(--pulse-page-max)] items-center gap-3 px-3 sm:px-6">
          <Link href="/" className="flex flex-none items-center gap-2.5" aria-label={`${BRAND.name} home`}>
            <NowBeyMark />
            <span className="hidden leading-none sm:block">
              <Wordmark />
              <span className="nb-tagline nb-label mt-1 block">{BRAND.tagline}</span>
            </span>
          </Link>

          <div className="mx-auto hidden min-w-0 md:flex lg:hidden">{kicker ?? <NavLinks />}</div>

          <div className="ml-auto flex items-center gap-2">
            <Link href="/report" className="nb-btn nb-btn-primary nb-btn-sm hidden md:inline-flex">
              Report a spot
              <ArrowIcon />
            </Link>
            <SimpleViewToggle />
            <ModeToggle defaultMode={defaultMode} />
            <SessionChip handle={handle} />
          </div>
        </div>
        {/* The live wire belongs under the nav, not above it: it is the first
            thing you read, not the thing you navigate by. */}
        {!isAdmin ? <LiveTicker /> : null}
        {kicker && !isAdmin ? kicker : null}
      </header>

      <div
        className={`mx-auto w-full max-w-[var(--pulse-page-max)] px-3 pb-6 sm:px-6 lg:pb-12 pulse-clear-nav ${showRail ? "pulse-shell-row" : ""}`}
      >
        {showRail ? (
          <aside className="hidden lg:block">
            <PulseNavRail />
          </aside>
        ) : null}
        <main id="main" className="pulse-main min-w-0 pt-4">
          {children}
        </main>
      </div>

      <DisplayTip />

      {!isAdmin ? (
        <>
          <footer id="display-options" className="nb-clear-nav mx-auto w-full max-w-[var(--pulse-page-max)] px-3 sm:px-6">
            <div className="grid gap-8 border-t border-default py-9 sm:grid-cols-[1.5fr_1fr_1fr]">
              <div>
                <Wordmark size={20} />
                <p className="mt-2 max-w-[42ch] text-[13px] leading-[1.75] text-tertiary">
                  {BRAND.name} · {BRAND.tagline}. Community safety, news and island life — pinned by residents,
                  confirmed by neighbours.
                </p>
                <p className="mt-2 text-[12.5px] text-tertiary">Pins are placed by residents — verify before you travel.</p>
                <div className="mt-3">
                  <CategoryLegend categories={["flood", "power", "road", "water", "crime", "marine", "health", "trash"]} />
                </div>
              </div>
              <nav aria-label="Product">
                <p className="nb-eyebrow mb-3">Explore</p>
                <ul className="grid gap-2 text-[13px] font-semibold">
                  {[
                    ["/feed", "Community feed"],
                    ["/map", "The map"],
                    ["/report", "Report a hazard"],
                    ["/wire", "News wire"],
                    ["/saved", "Watch list"],
                    ["/alerts", "Alerts"],
                  ].map(([href, label]) => (
                    <li key={href}>
                      <Link href={href} className="nb-textlink">
                        {label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </nav>
              <nav aria-label="NowBey">
                <p className="nb-eyebrow mb-3">NowBey</p>
                <ul className="grid gap-2 text-[13px] font-semibold">
                  {[
                    ["/open-now", "What is open now"],
                    ["/support", "Plans and pricing"],
                    ["/mobile", "Mobile app (developers)"],
                    ["/terms", "Terms"],
                    ["/privacy", "Privacy"],
                    ["/credits", "Photo credits"],
                  ].map(([href, label]) => (
                    <li key={href}>
                      <Link href={href} className="nb-textlink">
                        {label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </nav>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-default py-5">
              <span className="nb-label">Display options</span>
              <AccessibilityControls compact />
            </div>
          </footer>

          {/* Phone / tablet: the bottom nav. Desktop: the FAB. */}
          <PulseTabBar />
          <ReportFab />
        </>
      ) : null}

      {/* ⌘K is available on every route but the landing page's, which owns its
          own search-free marketing flow. */}
      <CommandPalette />
    </div>
  );
}

/**
 * Page intro for routes outside the rebuilt core (admin, legal, static).
 * It renders the Pulse section-intro grammar: eyebrow → display headline →
 * muted lede → pill actions, on an elevated surface.
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

export { LiveTicker };
