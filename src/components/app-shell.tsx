import Link from "next/link";
import type { ReactNode } from "react";
import { NavLinks, SessionChip } from "./nav-links";
import { ModeToggle } from "./mode-toggle";
import { LiveTicker } from "./live-ticker";
import { BRAND } from "@/lib/brand";
import type { ModeKey } from "@/lib/themes";
import { AccessibilityControls } from "./accessibility-controls";
import { SimpleViewToggle } from "./simple-view-toggle";
import { DisplayTip } from "./display-tip";

export function NowBeyMark({ size = 30 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" aria-hidden className="shrink-0">
      <defs>
        <linearGradient id="nbmark" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#2ee6d0" />
          <stop offset="55%" stopColor="#00c9b7" />
          <stop offset="100%" stopColor="#ff7a6b" />
        </linearGradient>
      </defs>
      <rect x="1.5" y="1.5" width="37" height="37" rx="12" fill="#062434" stroke="url(#nbmark)" strokeWidth="2" />
      <path d="M8 25.5c3.6-3.4 6.2 2.2 9.9 0 3.7-2.2 5.6 2.6 9.4 0" stroke="#2ee6d0" strokeWidth="2" fill="none" strokeLinecap="round" />
      <path
        d="M20 8.5c-3.9 0-7 3-7 6.8 0 4.9 7 11.2 7 11.2s7-6.3 7-11.2c0-3.8-3.1-6.8-7-6.8Z"
        fill="none"
        stroke="url(#nbmark)"
        strokeWidth="2.2"
      />
      <circle cx="20" cy="15.2" r="2.4" fill="#ffc531" />
    </svg>
  );
}

/** The logo and wordmark. Shared by the member link and the guest full-page anchor above. */
function BrandLockup() {
  return (
    <>
      <NowBeyMark />
      <span className="leading-none">
        <span className="display block text-[19px] font-extrabold tracking-tight text-sand-100">
          Now<span className="text-tide-400">Bey</span>
        </span>
        <span className="nb-tagline mt-0.5 block text-[11.5px] font-semibold uppercase tracking-[0.14em] text-ink-400">
          {BRAND.tagline}
        </span>
      </span>
    </>
  );
}

export function AppShell({
  children,
  handle,
  signedIn,
  bare,
  defaultMode,
  kicker,
}: {
  children: ReactNode;
  handle: string | null;
  /**
   * Signed-out visitors have no feed at "/" (they get the landing page), so the Feed link is left
   * out of their navigation. The map, wire, report and alerts pages stay public.
   */
  signedIn: boolean;
  /**
   * The landing page brings its own header and footer, so it is rendered without the app's
   * navigation, display controls and phone bar. Never set this for an application page.
   */
  bare?: boolean;
  defaultMode: ModeKey;
  kicker?: ReactNode;
}) {
  if (bare) {
    return (
      <div className="grain relative min-h-screen">
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:absolute focus:left-3 focus:top-3 focus:z-[800] focus:rounded-full focus:bg-tide-500 focus:px-4 focus:py-2 focus:text-[13px] focus:font-extrabold focus:text-abyss-950"
        >
          Skip to content
        </a>
        <main id="main">{children}</main>
      </div>
    );
  }

  return (
    <div className="grain relative min-h-screen">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-3 focus:top-3 focus:z-[800] focus:rounded-full focus:bg-tide-500 focus:px-4 focus:py-2 focus:text-[13px] focus:font-extrabold focus:text-abyss-950"
      >
        Skip to content
      </a>
      <header className="glass-strong nb-pad-top relative z-[650] border-b hairline">
        <div className="mx-auto flex max-w-[1180px] items-center gap-3 px-3.5 py-2.5 sm:px-5">
          {/* A guest who taps the logo must get a full page load: that is what rebuilds the bare
              landing shell. A member stays inside the client router. */}
          {signedIn ? (
            <Link href="/" className="flex items-center gap-2.5">
              <BrandLockup />
            </Link>
          ) : (
            // eslint-disable-next-line @next/next/no-html-link-for-pages -- a full document load is required to rebuild the landing page shell
            <a href="/" className="flex items-center gap-2.5">
              <BrandLockup />
            </a>
          )}

          <div className="ml-auto hidden items-center gap-1 lg:flex">
            <NavLinks showFeed={signedIn} />
          </div>
          <div className="ml-auto flex items-center gap-2 md:ml-3">
            <Link
              href="/report"
              className="hidden rounded-full bg-tide-500 px-3.5 py-2 text-[12.5px] font-extrabold text-abyss-950 shadow-[0_10px_26px_rgba(0,201,183,.28)] transition duration-200 ease-standard hover:bg-tide-400 hover:shadow-glow-tide active:scale-95 sm:inline-block"
            >
              Report a spot
            </Link>
            <SimpleViewToggle />
            <ModeToggle defaultMode={defaultMode} />
            <SessionChip handle={handle} />
          </div>
        </div>
        {kicker}
      </header>

      <DisplayTip />

      {/* main keeps a small gap above the footer; the footer itself clears the fixed nav (nb-clear-nav) */}
      <main id="main" className="mx-auto min-w-0 w-full max-w-[1180px] overflow-x-clip px-3.5 pb-6 pt-3 sm:px-5 sm:pt-4 lg:pb-10">{children}</main>

      <footer id="display-options" className="nb-clear-nav mx-auto min-w-0 w-full max-w-[1180px] overflow-x-clip px-3.5 pt-2 text-xs text-ink-400 sm:px-5 lg:pb-8">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2 border-t hairline pt-3">
          <span className="font-bold text-ink-300">Display options</span>
          <AccessibilityControls compact />
        </div>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
          <span>
            {BRAND.name} · {BRAND.tagline}. Community safety, news and island life.
          </span>
          <span className="text-ink-400">Pins are placed by residents — verify before you travel.</span>
          <span className="ml-auto flex gap-4">
            <Link href="/terms" className="text-tide-300 hover:underline">
              Terms
            </Link>
            <Link href="/privacy" className="text-tide-300 hover:underline">
              Privacy
            </Link>
            <Link href="/credits" className="text-tide-300 hover:underline">
              Photo credits
            </Link>
            <Link href="/open-now" className="text-tide-300 hover:underline">
              What is open now
            </Link>
            <Link href="/mobile" className="text-tide-300 hover:underline">
              Mobile app (developers)
            </Link>
            <Link href="/support" className="text-tide-300 hover:underline">
              Plans and pricing
            </Link>
          </span>
        </div>
      </footer>

      <div className="lg:hidden">
        <NavLinks variant="bar" showFeed={signedIn} />
      </div>
    </div>
  );
}

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
  return (
    <div className="mb-4 flex flex-wrap items-end gap-3">
      <div className="min-w-[240px] flex-1">
        <p className="text-xs font-bold uppercase tracking-[0.16em] text-tide-400">{eyebrow}</p>
        <h1 className="display mt-1 text-3xl font-extrabold leading-[1.06] tracking-tight text-sand-100">{title}</h1>
        {blurb ? <p className="mt-1.5 max-w-[62ch] text-base leading-relaxed text-ink-300">{blurb}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  );
}

export { LiveTicker };
