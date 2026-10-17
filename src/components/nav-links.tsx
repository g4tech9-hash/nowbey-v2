"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";

import { FEATURES } from "@/lib/features";

// Client bundles inline these NEXT_PUBLIC_ values at build time.
const SHOW_LIFE = FEATURES.islandLife;
const SHOW_GAS = FEATURES.gasTracker;

/** Primary destinations live in the header and the phone tab bar. */
const PRIMARY = [
  { href: "/feed", label: "Feed", short: "Feed", icon: "feed" },
  { href: "/map", label: "Map", short: "Map", icon: "map" },
  { href: "/wire", label: "News wire", short: "Wire", icon: "wire" },
  { href: "/alerts", label: "Alerts", short: "Alerts", icon: "bell" },
] as const;

/** Everything else gathers under one honest label instead of cramming the bar. */
const SECONDARY = [
  ...(SHOW_LIFE ? [{ href: "/life", label: "Island Life", short: "Life", icon: "life" }] : []),
  { href: "/open-now", label: "What is open now", short: "Open", icon: "clock" },
  ...(SHOW_GAS ? [{ href: "/gas", label: "Gas prices", short: "Gas", icon: "wire" }] : []),
  { href: "/support", label: "Plans", short: "Plans", icon: "heart" },
  { href: "/you", label: "Your account", short: "You", icon: "heart" },
] as const;

function Glyph({ name, active }: { name: string; active: boolean }) {
  const stroke = active ? "#04202a" : "#c8d7d4";
  const common = { fill: "none", stroke, strokeWidth: 1.9, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  switch (name) {
    case "feed":
      return (
        <svg width="19" height="19" viewBox="0 0 24 24" aria-hidden {...common}>
          <path d="M4 6h16M4 12h11M4 18h7" />
        </svg>
      );
    case "map":
      return (
        <svg width="19" height="19" viewBox="0 0 24 24" aria-hidden {...common}>
          <path d="M12 21s7-6.3 7-11a7 7 0 1 0-14 0c0 4.7 7 11 7 11Z" />
          <circle cx="12" cy="10" r="2.4" />
        </svg>
      );
    case "report":
      return (
        <svg width="19" height="19" viewBox="0 0 24 24" aria-hidden {...common}>
          <path d="M12 5v14M5 12h14" />
        </svg>
      );
    case "wire":
      return (
        <svg width="19" height="19" viewBox="0 0 24 24" aria-hidden {...common}>
          <path d="M3 8h11v9H3zM14 11h4l3 3v3h-7z" />
          <path d="M6 19v2M18 19v2" />
        </svg>
      );
    case "bell":
      return (
        <svg width="19" height="19" viewBox="0 0 24 24" aria-hidden {...common}>
          <path d="M6 16V10a6 6 0 1 1 12 0v6l2 3H4z" />
          <path d="M10 22h4" />
        </svg>
      );
    case "clock":
      return (
        <svg width="19" height="19" viewBox="0 0 24 24" aria-hidden {...common}>
          <circle cx="12" cy="12" r="8.5" />
          <path d="M12 7.5V12l3 2" />
        </svg>
      );
    case "life":
      return (
        <svg width="19" height="19" viewBox="0 0 24 24" aria-hidden {...common}>
          <path d="M12 3l2.2 4.8 5.2.6-3.9 3.5 1.1 5.1-4.6-2.6-4.6 2.6 1.1-5.1-3.9-3.5 5.2-.6z" />
        </svg>
      );
    default:
      return (
        <svg width="19" height="19" viewBox="0 0 24 24" aria-hidden {...common}>
          <path d="M12 20s-7-4.4-7-9.3A4.1 4.1 0 0 1 12 8a4.1 4.1 0 0 1 7 2.7C19 15.6 12 20 12 20Z" />
        </svg>
      );
  }
}

/** Landing nav DNA: quiet 13px/700 links that warm to tide in 180ms. */
function TopLink({ href, label, active }: { href: string; label: string; active: boolean }) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={`rounded-full px-3 py-2 text-[13px] font-bold transition duration-200 ease-standard ${
        active ? "bg-tide-500/12 text-tide-300" : "text-[#b5c9ca] hover:text-tide-300"
      }`}
    >
      {label}
    </Link>
  );
}

export function NavLinks({ variant = "top" }: { variant?: "top" | "bar" }) {
  const pathname = usePathname();
  const [online, setOnline] = useState(true);
  const [sheet, setSheet] = useState(false);

  useEffect(() => {
    const up = () => setOnline(true);
    const down = () => setOnline(false);
    window.addEventListener("online", up);
    window.addEventListener("offline", down);
    return () => {
      window.removeEventListener("online", up);
      window.removeEventListener("offline", down);
    };
  }, []);

  const isActive = (href: string) => (href === "/" ? pathname === "/" : pathname.startsWith(href));

  if (variant === "bar") {
    return (
      <>
        {sheet ? (
          <div className="fixed inset-0 z-[690] lg:hidden">
            <button
              type="button"
              aria-label="Close menu"
              onClick={() => setSheet(false)}
              className="absolute inset-0 h-full w-full bg-[rgba(4,14,21,0.72)] backdrop-blur-sm"
            />
            <div className="glass-strong nb-pad-bottom absolute inset-x-0 bottom-0 rounded-t-[24px] p-4 pb-5 shadow-l4">
              <p className="nb-eyebrow">More</p>
              <ul className="mt-3 grid grid-cols-2 gap-2">
                {SECONDARY.map((l) => (
                  <li key={l.href}>
                    <Link
                      href={l.href}
                      onClick={() => setSheet(false)}
                      className="nb-surface nb-card-link flex min-h-[48px] items-center gap-2.5 rounded-2xl px-3 text-[13px] font-bold text-ink-200"
                    >
                      <Glyph name={l.icon} active={false} />
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
              <ButtonishClose onClick={() => setSheet(false)} />
            </div>
          </div>
        ) : null}
        <nav className="glass-strong nb-pad-bottom fixed inset-x-0 bottom-0 z-[700] border-t hairline lg:hidden" aria-label="Primary">
          <ul className="mx-auto flex max-w-lg items-stretch justify-between gap-1 px-1.5 pb-1.5 pt-1">
            {PRIMARY.map((l) => {
              const active = isActive(l.href);
              return (
                <li key={l.href} className="flex-1">
                  <Link
                    href={l.href}
                    aria-current={active ? "page" : undefined}
                    className={`flex min-h-[48px] flex-col items-center justify-center gap-0.5 rounded-full px-1 text-[11.5px] font-bold transition duration-200 ease-standard active:scale-[0.97] ${
                      active ? "bg-tide-500 text-[#04202a] shadow-glow-tide" : "text-ink-300 hover:bg-white/8"
                    }`}
                  >
                    <Glyph name={l.icon} active={active} />
                    {l.short}
                  </Link>
                </li>
              );
            })}
            <li className="flex-1">
              {/* Report is the one loud action — a tide pill in the middle of the thumb zone. */}
              <Link
                href="/report"
                aria-current={isActive("/report") ? "page" : undefined}
                className={`flex min-h-[48px] flex-col items-center justify-center gap-0.5 rounded-full px-1 text-[11.5px] font-extrabold transition duration-200 ease-standard active:scale-[0.97] ${
                  isActive("/report") ? "bg-tide-400 text-[#04202a] shadow-glow-tide" : "bg-tide-500/18 text-tide-300 ring-1 ring-tide-400/40"
                }`}
              >
                <Glyph name="report" active={isActive("/report")} />
                Report
              </Link>
            </li>
            <li className="flex-1">
              <button
                type="button"
                onClick={() => setSheet(true)}
                aria-expanded={sheet}
                className="flex min-h-[48px] w-full flex-col items-center justify-center gap-0.5 rounded-full px-1 text-[11.5px] font-bold text-ink-300 transition duration-200 ease-standard hover:bg-white/8 active:scale-[0.97]"
              >
                <svg width="19" height="19" viewBox="0 0 24 24" aria-hidden fill="none" stroke="#c8d7d4" strokeWidth="1.9" strokeLinecap="round">
                  <path d="M5 7h14M5 12h14M5 17h14" />
                </svg>
                More
              </button>
            </li>
          </ul>
        </nav>
      </>
    );
  }

  return (
    <div className="flex items-center gap-1">
      {PRIMARY.map((l) => (
        <TopLink key={l.href} href={l.href} label={l.label} active={isActive(l.href)} />
      ))}
      {SHOW_LIFE ? <TopLink href="/life" label="Island Life" active={isActive("/life")} /> : null}
      <MoreMenu active={isActive("/support") || isActive("/open-now") || (SHOW_GAS && isActive("/gas"))} pathname={pathname} />
      <span
        title={
          online
            ? "Browser is online"
            : "Browser is offline — you can still read the last saved feed; new reports wait until you are back online"
        }
        className={`ml-2 hidden items-center gap-1.5 rounded-full px-2.5 py-1 text-[11.5px] font-bold lg:inline-flex ${
          online ? "bg-ok-500/15 text-ok-600" : "bg-danger-500/15 text-danger-500"
        }`}
      >
        {online ? <span className="nb-live-dot" aria-hidden /> : <span className="h-1.5 w-1.5 rounded-full bg-danger-500" aria-hidden />}
        {online ? "live" : "offline"}
      </span>
    </div>
  );
}

function ButtonishClose({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="nb-btn nb-btn-secondary mt-3 w-full"
    >
      Close
    </button>
  );
}

/** Plans + extras open on hover and on tap/keyboard, Escape closes. */
function MoreMenu({ active, pathname }: { active: boolean; pathname: string }) {
  const [open, setOpen] = useState(false);
  const items = [{ href: "/support", label: "Plans" }, ...SECONDARY.filter((s) => s.href !== "/support" && s.href !== "/you")];
  const menuId = "more-menu";
  return (
    <div
      className="group relative"
      onKeyDown={(e) => {
        if (e.key === "Escape") setOpen(false);
      }}
    >
      <button
        type="button"
        aria-expanded={open}
        aria-controls={menuId}
        onClick={() => setOpen((v) => !v)}
        className={`flex items-center gap-1 rounded-full px-3 py-2 text-[13px] font-bold transition duration-200 ease-standard ${
          active ? "bg-tide-500/12 text-tide-300" : "text-[#b5c9ca] hover:text-tide-300"
        }`}
      >
        Plans
        <span aria-hidden className="text-[10px] opacity-70">
          ▾
        </span>
      </button>
      <div
        id={menuId}
        className={`absolute right-0 top-full z-[660] w-52 pt-2 transition group-hover:visible group-hover:opacity-100 group-focus-within:visible group-focus-within:opacity-100 ${
          open ? "visible opacity-100" : "invisible opacity-0"
        }`}
      >
        <div className="glass overflow-hidden rounded-2xl p-1.5">
          {items.map((c) => (
            <Link
              key={c.href}
              href={c.href}
              aria-current={pathname.startsWith(c.href) ? "page" : undefined}
              className={`block rounded-xl px-3 py-2.5 text-[13px] font-bold transition duration-200 ease-standard ${
                pathname.startsWith(c.href) ? "bg-tide-500/14 text-tide-300" : "text-ink-200 hover:bg-white/6 hover:text-sand-100"
              }`}
            >
              {c.label}
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}

export function SessionChip({ handle }: { handle: string | null }) {
  return handle ? (
    <Link
      href="/you"
      className="flex min-h-[42px] items-center gap-2 rounded-full border border-[rgba(185,226,220,0.2)] px-3 py-1.5 text-[12.5px] font-bold text-sand-100 transition duration-200 ease-standard hover:border-[rgba(185,226,220,0.38)] hover:bg-white/6"
    >
      <span className="grid h-6 w-6 place-items-center rounded-full bg-conch-500 text-[12px] font-extrabold text-[#04202a]">
        {handle.charAt(0).toUpperCase()}
      </span>
      @{handle}
    </Link>
  ) : (
    <Link
      href="/login?mode=signin"
      className="flex min-h-[42px] items-center rounded-full border border-[rgba(185,226,220,0.2)] px-3.5 text-[12px] font-bold text-[#d4e6e5] transition duration-200 ease-standard hover:border-[rgba(185,226,220,0.38)] hover:bg-white/6 hover:text-white"
    >
      Sign in
    </Link>
  );
}
