"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { usePrefStore } from "@/lib/pulse/store";
import { Anchor, Bell, BookmarkPlus, Clock, Compass, Flame, LayoutList, Plus, Newspaper, Radio, Star, UserRound, WifiOff, X } from "lucide-react";
import { FEATURES } from "@/lib/features";
import { CatSwatch } from "@/ui/pulse/badge";

// Client bundles inline these NEXT_PUBLIC_ values at build time.
const SHOW_LIFE = FEATURES.islandLife;
const SHOW_GAS = FEATURES.gasTracker;

/* =============================================================================
   PULSE NAVIGATION
   One source of destination truth, three renderings, because the responsive
   contract is the layout — not the list:
     ≥1024  a sticky left rail (icons + labels)
     640–1024  a row of pills in the top bar
     <640   a bottom nav: 4 destinations, the centre slot is the Report FAB,
            and the fifth slot opens the "more" sheet
   ============================================================================= */

export type PulseNavEntry = { href: string; label: string; short: string; icon: ReactNode; hint?: string };

/** The four places a person actually goes during an event, plus Report. */
export const PRIMARY_NAV: PulseNavEntry[] = [
  { href: "/feed", label: "Community feed", short: "Feed", icon: <LayoutList size={19} aria-hidden />, hint: "What neighbours are reporting right now" },
  { href: "/map", label: "Map", short: "Map", icon: <Compass size={19} aria-hidden />, hint: "Every pin on the island" },
  { href: "/wire", label: "News wire", short: "Wire", icon: <Newspaper size={19} aria-hidden />, hint: "Verified notices and local news" },
  { href: "/alerts", label: "Alerts", short: "Alerts", icon: <Bell size={19} aria-hidden />, hint: "Email alerts for your island" },
];

export const SECONDARY_NAV: PulseNavEntry[] = [
  { href: "/saved", label: "Watch list", short: "Saved", icon: <BookmarkPlus size={19} aria-hidden />, hint: "Signals you are following" },
  ...(SHOW_LIFE ? [{ href: "/life", label: "Island Life", short: "Life", icon: <Star size={19} aria-hidden /> }] : []),
  { href: "/open-now", label: "What is open now", short: "Open", icon: <Clock size={19} aria-hidden /> },
  ...(SHOW_GAS ? [{ href: "/gas", label: "Gas prices", short: "Gas", icon: <Anchor size={19} aria-hidden /> }] : []),
  { href: "/support", label: "Plans", short: "Plans", icon: <Flame size={19} aria-hidden /> },
  { href: "/you", label: "Your account", short: "You", icon: <UserRound size={19} aria-hidden /> },
];

const isActive = (pathname: string, href: string) => (href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`));

/**
 * Live / offline status. Not decoration: during a storm it is the difference
 * between "nobody reported anything" and "my phone cannot reach the tower", and
 * it is stated in the accessible name so a screen reader gets it too.
 */
function readOnline(): boolean | null {
  return typeof navigator === "undefined" ? null : Boolean(navigator.onLine);
}

export function ConnectionFlag({ className = "" }: { className?: string }) {
  // `navigator.onLine` is browser state with events attached to it, which is
  // what useSyncExternalStore exists for: a phone in a tunnel renders "offline"
  // on the first frame instead of claiming to be live for a moment and correcting
  // itself in front of the reader. The fallback is "online" because that is the
  // claim the server render is allowed to make.
  const online = usePrefStore(readOnline, true, ["online", "offline"]);
  return (
    <span
      className={`inline-flex items-center gap-1.5 text-[11.5px] font-bold ${online ? "text-success" : "text-danger"} ${className}`.trim()}
      title={online ? "This device is online — the feed updates as neighbours file." : "This device is offline — you are reading the last saved feed."}
    >
      {online ? <Radio size={12} aria-hidden /> : <WifiOff size={12} aria-hidden />}
      <span className="sr-only">{online ? "Online" : "Offline"}</span>
      <span aria-hidden>{online ? "live" : "offline"}</span>
    </span>
  );
}

/** Desktop ≥1024: the sticky rail. */
export function PulseNavRail({ badge }: { badge?: Record<string, number> }) {
  const pathname = usePathname();
  return (
    <nav className="pulse-nav-rail" aria-label="Primary">
      <ul className="grid gap-1">
        {PRIMARY_NAV.map((item) => {
          const on = isActive(pathname, item.href);
          return (
            <li key={item.href}>
              <Link href={item.href} aria-current={on ? "page" : undefined} className="pulse-nav-item" title={item.hint}>
                <span className={on ? "text-accent" : "text-tertiary"} aria-hidden>
                  {item.icon}
                </span>
                <span className="min-w-0 flex-1 truncate">{item.label}</span>
                {badge?.[item.href] ? (
                  <span className="font-mono text-[11.5px] font-bold tabular-nums text-accent">{badge[item.href]}</span>
                ) : null}
              </Link>
            </li>
          );
        })}
      </ul>
      <hr className="nb-divider" />
      <ul className="grid gap-1">
        {SECONDARY_NAV.map((item) => (
          <li key={item.href}>
            <Link href={item.href} aria-current={isActive(pathname, item.href) ? "page" : undefined} className="pulse-nav-item">
              <span className="text-tertiary" aria-hidden>
                {item.icon}
              </span>
              <span className="min-w-0 flex-1 truncate">{item.label}</span>
            </Link>
          </li>
        ))}
      </ul>
      <hr className="nb-divider" />
      <div className="px-3 pb-1">
        <ConnectionFlag />
      </div>
    </nav>
  );
}

/** 640–1024: the same destinations as pills in the top bar. */
export function NavLinks({ variant = "top" }: { variant?: "top" | "bar" | "rail" }) {
  const pathname = usePathname();
  if (variant === "rail") return <PulseNavRail />;
  if (variant === "bar") return <PulseTabBar />;
  return (
    <div className="pulse-pill-row items-center">
      {PRIMARY_NAV.map((item) => {
        const on = isActive(pathname, item.href);
        return (
          <Link key={item.href} href={item.href} aria-current={on ? "page" : undefined} className="nb-chip" data-on={on ? "true" : undefined}>
            <span aria-hidden style={{ display: "inline-flex" }}>
              {item.icon}
            </span>
            {item.short}
          </Link>
        );
      })}
      <MoreSheetLink pathname={pathname} />
      <span className="ml-2 hidden xl:inline-flex">
        <ConnectionFlag />
      </span>
    </div>
  );
}

function MoreSheetLink({ pathname }: { pathname: string }) {
  const [open, setOpen] = useState(false);
  const btnRef = useRef<HTMLButtonElement | null>(null);
  const items = SECONDARY_NAV;
  return (
    <>
      <button
        ref={btnRef}
        type="button"
        className="nb-chip"
        aria-expanded={open}
        aria-controls="pulse-more-menu"
        onClick={() => setOpen((v) => !v)}
      >
        More
        <span aria-hidden>▾</span>
      </button>
      {open ? (
        <>
          <button type="button" aria-label="Close menu" className="fixed inset-0 z-[655] cursor-default" onClick={() => setOpen(false)} />
          <div id="pulse-more-menu" className="pulse-glass-strong absolute right-0 top-full z-[660] mt-2 w-[min(280px,calc(100vw-24px))] p-1.5">
            <ul className="grid gap-1">
              {items.map((c) => (
                <li key={c.href}>
                  <Link
                    href={c.href}
                    onClick={() => setOpen(false)}
                    aria-current={isActive(pathname, c.href) ? "page" : undefined}
                    className="pulse-nav-item"
                  >
                    <span className="text-tertiary" aria-hidden>
                      {c.icon}
                    </span>
                    <span className="min-w-0 flex-1 truncate">{c.label}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </>
      ) : null}
    </>
  );
}

/**
 * The Report action. On a phone it is the raised centre slot of the bottom nav;
 * from 1024px up it is the fixed bottom-right FAB. Same href, same label, so a
 * person switching devices finds it where they left it.
 */
export function ReportFab({ variant = "fab" }: { variant?: "fab" | "tab" }) {
  const pathname = usePathname();
  const on = isActive(pathname, "/report");
  if (variant === "tab") {
    return (
      <Link
        href="/report"
        aria-current={on ? "page" : undefined}
        aria-label="Report a hazard — the main action"
        className="pulse-navtab-fab"
      >
        <Plus size={22} strokeWidth={2.6} aria-hidden />
      </Link>
    );
  }
  return (
    <Link href="/report" className="pulse-fab" aria-label="Report a hazard" title="Report a hazard — about twenty seconds">
      <Plus size={24} strokeWidth={2.6} aria-hidden />
    </Link>
  );
}

/** Phone/tablet bottom nav: 4 destinations + the centre Report action + More. */
export function PulseTabBar() {
  const pathname = usePathname();
  const [sheet, setSheet] = useState(false);
  const slots = [...PRIMARY_NAV.slice(0, 2), null, ...PRIMARY_NAV.slice(2, 4)] as (PulseNavEntry | null)[];

  return (
    <>
      {sheet ? (
        <div className="fixed inset-0 z-[690] lg:hidden">
          <button type="button" aria-label="Close menu" className="pulse-sheet-scrim" onClick={() => setSheet(false)} />
          <div className="pulse-drawer" role="dialog" aria-modal="true" aria-label="More places">
            <div className="pulse-sheet-grab" aria-hidden />
            <header className="flex items-center justify-between gap-3 px-4 pb-2 pt-3">
              <p className="nb-eyebrow">Everything else</p>
              <button type="button" className="nb-btn nb-btn-ghost nb-btn-sm pulse-tight" onClick={() => setSheet(false)} aria-label="Close menu">
                <X size={14} aria-hidden /> Close
              </button>
            </header>
            <div className="pulse-drawer-body">
              <ul className="grid gap-1.5">
                {SECONDARY_NAV.map((c) => (
                  <li key={c.href}>
                    <Link href={c.href} onClick={() => setSheet(false)} className="pulse-nav-item">
                      <span className="text-tertiary" aria-hidden>
                        {c.icon}
                      </span>
                      <span className="min-w-0 flex-1">{c.label}</span>
                      {isActive(pathname, c.href) ? <CatSwatch category="notice" /> : null}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      ) : null}

      <nav className="pulse-bottom-nav" aria-label="Primary">
        {slots.map((item, i) =>
          item === null ? (
            <div key="fab" className="flex items-start justify-center">
              <ReportFab variant="tab" />
            </div>
          ) : (
            <Link
              key={item.href}
              href={item.href}
              aria-current={isActive(pathname, item.href) ? "page" : undefined}
              className="pulse-navtab"
            >
              <span aria-hidden>{item.icon}</span>
              {item.short}
            </Link>
          ),
        )}
        <button type="button" className="pulse-navtab" aria-expanded={sheet} aria-label="More places">
          <svg width="19" height="19" viewBox="0 0 24 24" aria-hidden fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round">
            <path d="M5 7h14M5 12h14M5 17h14" />
          </svg>
          More
        </button>
      </nav>
    </>
  );
}

/** Header account chip. Signed in: your handle. Not: one honest "Sign in". */
export function SessionChip({ handle }: { handle: string | null }) {
  if (!handle) {
    return (
      <Link href="/login?mode=signin" className="nb-btn nb-btn-primary nb-btn-sm">
        Sign in
      </Link>
    );
  }
  return (
    <Link href="/you" className="nb-btn nb-btn-ghost nb-btn-sm" aria-label={`Your account, @${handle}`}>
      <span
        className="grid place-items-center rounded-full font-extrabold"
        style={{ width: 22, height: 22, background: "var(--accent)", color: "var(--text-on-accent)", fontSize: 11 }}
        aria-hidden
      >
        {handle.charAt(0).toUpperCase()}
      </span>
      @{handle}
    </Link>
  );
}
