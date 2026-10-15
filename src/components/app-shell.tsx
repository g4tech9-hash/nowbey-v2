import Link from "next/link";
import type { ReactNode } from "react";
import { NavLinks, SessionChip } from "./nav-links";
import { ModeToggle } from "./mode-toggle";
import { LiveTicker } from "./live-ticker";
import { BRAND } from "@/lib/brand";
import type { ModeKey } from "@/lib/themes";
import { AccessibilityControls } from "./accessibility-controls";

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
  return (
    <div className="grain relative min-h-screen">
      <header className="nb-pad-top sticky top-0 z-[650] border-b hairline bg-abyss-950/88 backdrop-blur-lg">
        <div className="mx-auto flex max-w-[1180px] items-center gap-3 px-3.5 py-2.5 sm:px-5">
          <Link href="/" className="flex items-center gap-2.5">
            <NowBeyMark />
            <span className="leading-none">
              <span className="display block text-[19px] font-extrabold tracking-tight text-sand-100">
                Now<span className="text-tide-400">Bey</span>
              </span>
              <span className="nb-tagline mt-0.5 block text-[10.5px] font-semibold uppercase tracking-[0.14em] text-[#6e97a0]">
                {BRAND.tagline}
              </span>
            </span>
          </Link>

          <div className="ml-auto hidden items-center gap-1 lg:flex">
            <NavLinks />
          </div>
          <div className="ml-auto flex items-center gap-2 md:ml-3">
            <Link
              href="/report"
              className="hidden rounded-full bg-tide-500 px-3.5 py-2 text-[12.5px] font-extrabold text-abyss-950 shadow-[0_10px_26px_rgba(0,201,183,.28)] hover:bg-tide-400 sm:inline-block"
            >
              Report a spot
            </Link>
            <ModeToggle defaultMode={defaultMode} />
            <SessionChip handle={handle} />
          </div>
        </div>
        {kicker}
      </header>

      {/* main keeps a small gap above the footer; the footer itself clears the fixed nav (nb-clear-nav) */}
      <main className="mx-auto w-full max-w-[1180px] px-3.5 pb-6 pt-3 sm:px-5 sm:pt-4 lg:pb-10">{children}</main>

      <footer className="nb-clear-nav mx-auto max-w-[1180px] px-3.5 pt-2 text-[11.5px] text-[#6e97a0] sm:px-5 lg:pb-8">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2 border-t hairline pt-3">
          <span className="font-bold text-[#8fb9b6]">Display options</span>
          <AccessibilityControls compact />
        </div>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
          <span>
            {BRAND.name} · {BRAND.tagline}. Community safety, news and island life.
          </span>
          <span className="text-[#4f7a83]">Pins are placed by residents — verify before you travel.</span>
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
            <Link href="/mobile" className="text-tide-300 hover:underline">
              Get the app
            </Link>
            <Link href="/support" className="text-tide-300 hover:underline">
              Plans and pricing
            </Link>
          </span>
        </div>
      </footer>

      <div className="lg:hidden">
        <NavLinks variant="bar" />
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
        <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-tide-400">{eyebrow}</p>
        <h1 className="display mt-1 text-[clamp(1.6rem,4.4vw,2.35rem)] font-extrabold leading-[1.06] text-sand-100">{title}</h1>
        {blurb ? <p className="mt-1.5 max-w-[62ch] text-[13.5px] leading-relaxed text-[#a9cdc9]">{blurb}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  );
}

export { LiveTicker };
