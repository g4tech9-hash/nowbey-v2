"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { NavLinks, SessionChip, BottomTabBar } from "./nav-links";
import { NowBeyMark, Wordmark } from "@/ui/kit";
import { BRAND } from "@/lib/brand";

/** Re-exported for pages that show the brand mark (not-found, error screens). */
export { NowBeyMark, Wordmark };
export { BottomTabBar };

/* =====================================================================
   Global shell — rebuilt 2026-10-17.
   New DOM: pill top bar (mark + wordmark + auth pills) and the fixed
   bottom tab bar (Feed · Map · Report · Wire · Alerts) exactly as the
   reference mockups show it. Legacy grid chrome removed.
   ===================================================================== */

export function AppShell({
  children,
  handle,
  defaultMode,
  kicker,
}: {
  children: ReactNode;
  handle: string | null;
  defaultMode: string;
  kicker?: ReactNode;
}) {
  const isLanding = usePathname() === "/";
  void defaultMode;

  return (
    <div className="relative min-h-screen">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-3 focus:top-3 focus:z-[800] focus:rounded-full focus:bg-[#43e0cb] focus:px-4 focus:py-2 focus:text-[13px] focus:font-extrabold focus:text-[#06242c]"
      >
        Skip to content
      </a>

      {!isLanding ? (
        <>
          <header className="nb-topbar relative z-[650]">
            <div className="mx-auto flex w-full max-w-[1180px] items-center gap-3 px-4 py-2.5 sm:px-6" style={{ minHeight: 58 }}>
              <Link href="/" className="flex items-center gap-2.5">
                <NowBeyMark size={34} />
                <span className="leading-none">
                  <Wordmark size={20} />
                  <span className="nb-tagline mt-1 block text-[10px] font-bold uppercase tracking-[0.16em]" style={{ color: "var(--nb-faint)" }}>
                    {BRAND.tagline}
                  </span>
                </span>
              </Link>

              <div className="ml-auto hidden items-center gap-1 lg:flex">
                <NavLinks />
              </div>
              <div className="ml-auto flex items-center gap-2 lg:ml-4">
                {kicker}
                <SessionChip handle={handle} />
              </div>
            </div>
          </header>

          <main id="main" className="relative z-[2] mx-auto w-full max-w-[1180px] px-4 pb-24 pt-7 sm:px-6 lg:pb-12">
            {children}
          </main>

          <BottomTabBar />
        </>
      ) : (
        <main id="main" className="relative z-[2]">
          {children}
        </main>
      )}
    </div>
  );
}

/** Shared page header for inner screens: micro-label eyebrow + display title + muted blurb. */
export function PageHead({
  eyebrow,
  title,
  blurb,
  actions,
}: {
  eyebrow?: string;
  title: string;
  blurb?: string;
  actions?: ReactNode;
}) {
  return (
    <header className="mb-6">
      {eyebrow ? <p className="nb-label">{eyebrow}</p> : null}
      <div className="mt-2 flex flex-wrap items-start gap-4">
        <h1 className="display max-w-[34ch] text-[26px] font-extrabold leading-[1.12] sm:text-[32px]">{title}</h1>
        {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
      </div>
      {blurb ? (
        <p className="mt-3 max-w-[68ch] text-[15px] leading-relaxed" style={{ color: "var(--nb-muted)" }}>
          {blurb}
        </p>
      ) : null}
    </header>
  );
}

/** Slim live marquee used by the landing ticker rail. */
export function LiveTicker({ items }: { items?: string[] }) {
  const list = items ?? ["Stay Safe, Bahamas"];
  return (
    <div className="nb-no-scrollbar overflow-hidden border-y" style={{ borderColor: "var(--nb-stroke)" }}>
      <div className="marquee-track flex w-max items-center gap-10 py-2.5">
        {[...list, ...list].map((t, i) => (
          <span key={i} className="flex items-center gap-3 text-[12px] font-bold uppercase tracking-[0.18em]" style={{ color: "var(--nb-faint)" }}>
            <span className="nb-dot" style={{ background: "var(--nb-mint)" }} />
            {t}
          </span>
        ))}
      </div>
    </div>
  );
}
