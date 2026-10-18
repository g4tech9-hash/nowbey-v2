"use client";

/**
 * NowBey app shell — Master Build Section 5.
 * 6px Bahamian flag ribbon (always visible) + sticky 72px glass header with the
 * brand mark, gradient wordmark, version pill, pill nav, theme toggle and the
 * Gold "Post Incident" CTA. Phones get the floating bottom dock. Footer:
 * brand, quick links, "Stay Safe, Bahamas".
 */
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { ShieldAlert } from "lucide-react";
import { DesktopNav, MobileDock, SessionChip } from "./nav-links";
import { ThemeToggle } from "./now/theme-toggle";
import { ConfettiCanvas } from "./now/confetti";
import { AccessibilityControls } from "./accessibility-controls";
import { PageIntro } from "./ui";
import { LiveTicker } from "./live-ticker";
import { BRAND } from "@/lib/brand";

/** Brand tile: rounded-2xl, Deep Ocean → Aquamarine, ShieldAlert in Gold + live green dot. */
export function NowBeyMark({ size = 40 }: { size?: number }) {
  return (
    <span
      className="relative inline-flex shrink-0 items-center justify-center rounded-2xl"
      style={{
        width: size,
        height: size,
        backgroundImage: "linear-gradient(135deg, #002B49 0%, #00A3AD 100%)",
      }}
      aria-hidden
    >
      <ShieldAlert size={size * 0.52} color="#FFC72C" strokeWidth={2.2} />
      <span
        className="nbx-pulse-dot absolute -right-0.5 -top-0.5"
        style={{ background: "#10B981", color: "#10B981", width: 8, height: 8 }}
      />
    </span>
  );
}

/** The flag ribbon: Aquamarine → Gold → Deep Trench, 6px, always at the very top. */
export function FlagRibbon() {
  return <div className="nbx-grad-flag h-1.5 w-full" aria-hidden />;
}

export function AppShell({
  children,
  handle,
  defaultMode,
}: {
  children: ReactNode;
  handle: string | null;
  defaultMode?: "dark" | "light";
  kicker?: ReactNode;
}) {
  // The landing page carries its own frozen header/footer (Master prompt:
  // "keep my original landing page"). On "/" the shell renders bare chrome so
  // the marketing page never wears the app header on top of its own.
  const isLanding = usePathname() === "/";
  if (isLanding) {
    return (
      <div className="nbx-type relative min-h-screen bg-canvas text-ink">
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:absolute focus:left-3 focus:top-3 focus:z-[800] focus:rounded-full focus:bg-aqua focus:px-4 focus:py-2 focus:text-[13px] focus:font-extrabold focus:text-white"
        >
          Skip to content
        </a>
        {children}
      </div>
    );
  }

  return (
    <div className="nbx-type relative min-h-screen bg-canvas text-ink">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-3 focus:top-3 focus:z-[800] focus:rounded-full focus:bg-aqua focus:px-4 focus:py-2 focus:text-[13px] focus:font-extrabold focus:text-white"
      >
        Skip to content
      </a>

      {/* Sticky chrome: ribbon + header travel together. The <header> itself stays
          relatively positioned so its overlays stack above page controls. */}
      <div className="sticky top-0 z-[650]">
        <FlagRibbon />
        <header className="nbx-glass relative">
          <div className="mx-auto flex min-h-[72px] w-full max-w-[1280px] items-center gap-3 px-4 sm:px-6 lg:px-8">
            <Link href="/" className="flex min-h-[44px] flex-none items-center gap-2.5">
              <NowBeyMark size={40} />
              <span className="leading-none">
                <span className="flex items-center gap-2">
                  <span className="nbx-grad-text text-[22px] font-[900] tracking-[-0.02em]">NowBey</span>
                  <span className="nbx-label-xs rounded-full border border-edge px-2 py-0.5 text-ink-3">v2</span>
                </span>
                <span className="mt-1 hidden text-[11px] font-bold uppercase tracking-[0.08em] text-ink-2 sm:block">
                  {BRAND.tagline}
                </span>
              </span>
            </Link>

            <div className="mx-auto hidden lg:flex">
              <DesktopNav />
            </div>

            <div className="ml-auto flex items-center gap-2">
              <ThemeToggle defaultMode={defaultMode} />
              <SessionChip handle={handle} />
              <Link href="/report" className="nbx-btn nbx-btn-gold hidden px-4 text-[13px] sm:inline-flex">
                Post Incident
              </Link>
            </div>
          </div>
        </header>
      </div>

      <main id="main" className="nb-clear-nav mx-auto w-full max-w-[1280px] px-4 pb-10 pt-6 sm:px-6 lg:px-8">
        {children}
      </main>

      <footer className="nb-clear-nav border-t border-edge">
        <div className="mx-auto grid w-full max-w-[1280px] gap-8 px-4 py-10 sm:grid-cols-[1.5fr_1fr_1fr] sm:px-6 lg:px-8">
          <div>
            <p className="flex items-center gap-2.5">
              <NowBeyMark size={36} />
              <span className="nbx-grad-text text-[19px] font-[900] tracking-[-0.02em]">NowBey</span>
            </p>
            <p className="mt-3 max-w-[42ch] text-[13px] leading-relaxed text-ink-2">
              {BRAND.name} — community safety for The Bahamas. Neighbour reports, a live island radar,
              the Bahamian news wire, and island-by-island email alerts. Life-safety alerts are never paywalled.
            </p>
            <p className="mt-3 text-[13px] font-bold text-ink-3">
              Stay Safe, Bahamas
            </p>
          </div>
          <nav aria-label="Sections">
            <p className="nbx-label mb-3 text-ink-3">Sections</p>
            <ul className="space-y-2 text-[13px] font-semibold">
              {[
                ["/", "Home"],
                ["/map", "Live Hazard Radar"],
                ["/report", "File Report"],
                ["/wire", "Bahamas Wire"],
                ["/alerts", "Island Alerts"],
                ["/prompt", "Design system"],
              ].map(([href, label]) => (
                <li key={href}>
                  <Link href={href} className="text-ink-2 transition duration-200 ease-out hover:text-aqua">
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
          <nav aria-label="NowBey">
            <p className="nbx-label mb-3 text-ink-3">NowBey</p>
            <ul className="space-y-2 text-[13px] font-semibold">
              {[
                ["/open-now", "What is open now"],
                ["/support", "Plans and pricing"],
                ["/mobile", "Mobile app"],
                ["/terms", "Terms"],
                ["/privacy", "Privacy"],
              ].map(([href, label]) => (
                <li key={href}>
                  <Link href={href} className="text-ink-2 transition duration-200 ease-out hover:text-aqua">
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
            <div id="display-options" className="mt-5">
              <p className="nbx-label mb-2 text-ink-3">Display options</p>
              <AccessibilityControls compact />
            </div>
          </nav>
        </div>
      </footer>

      <MobileDock />
      <ConfettiCanvas />
    </div>
  );
}

/**
 * Page intro kept for routes outside the rebuilt core (admin, legal, static).
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
