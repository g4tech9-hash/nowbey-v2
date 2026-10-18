"use client";

/**
 * Master Build Section 5 — navigation.
 * Desktop: pill bar (icons + labels) with the Aquamarine gradient active pill.
 * Phones: floating bottom dock — Feed / Map / Report (centre, Gold, raised) /
 * Wire / Alerts. Report is always reachable.
 */
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BellRing,
  Compass,
  Map as MapIcon,
  PlusCircle,
  Radio,
  Sparkles,
} from "lucide-react";

/** Primary destinations — Master Build Section 5. */
export const PRIMARY_NAV = [
  { href: "/", label: "Executive Suite", icon: Sparkles },
  { href: "/map", label: "Live Hazard Radar", icon: Compass },
  { href: "/report", label: "File Report", icon: PlusCircle },
  { href: "/wire", label: "Bahamas Wire", icon: Radio },
  { href: "/alerts", label: "Island Alerts", icon: BellRing },
] as const;

const DOCK: { href: string; label: string; icon: typeof Compass; raised?: boolean }[] = [
  { href: "/", label: "Feed", icon: MapIcon },
  { href: "/map", label: "Map", icon: Compass },
  { href: "/report", label: "Report", icon: PlusCircle, raised: true },
  { href: "/wire", label: "Wire", icon: Radio },
  { href: "/alerts", label: "Alerts", icon: BellRing },
];

function isActive(pathname: string, href: string): boolean {
  return href === "/" ? pathname === "/" : pathname.startsWith(href);
}

export function DesktopNav() {
  const pathname = usePathname();
  return (
    <nav aria-label="Primary" className="hidden items-center gap-1 lg:flex">
      {PRIMARY_NAV.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          aria-current={isActive(pathname, item.href) ? "page" : undefined}
          className="nbx-navpill"
        >
          <item.icon size={16} aria-hidden />
          {item.label}
        </Link>
      ))}
    </nav>
  );
}

/** Floating phone dock. z-[700] + nb-pad-bottom keep page content clear of it (mobile audit W10). */
export function MobileDock() {
  const pathname = usePathname();
  return (
    <nav
      aria-label="Primary"
      className="nbx-glass nb-pad-bottom fixed inset-x-0 bottom-0 z-[700] border-t lg:hidden"
    >
      <ul className="mx-auto flex max-w-lg items-stretch justify-between gap-1 px-1.5 pb-1.5 pt-1.5">
        {DOCK.map((item) => {
          const active = isActive(pathname, item.href);
          if (item.raised) {
            return (
              <li key={item.href} className="flex flex-1 items-end justify-center">
                <Link
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className="nbx-btn nbx-btn-gold -mt-5 flex min-h-[56px] w-[64px] flex-col items-center justify-center gap-0.5 rounded-2xl px-1 text-[11px] font-extrabold"
                >
                  <item.icon size={20} aria-hidden />
                  {item.label}
                </Link>
              </li>
            );
          }
          return (
            <li key={item.href} className="flex-1">
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={`flex min-h-[48px] flex-col items-center justify-center gap-0.5 rounded-full px-1 text-[11px] font-bold transition duration-200 ease-out active:scale-[0.97] ${
                  active ? "nbx-grad-primary text-white shadow-nb-hover" : "text-ink-2 hover:text-ink"
                }`}
              >
                <item.icon size={19} aria-hidden />
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

export function SessionChip({ handle }: { handle: string | null }) {
  return handle ? (
    <Link
      href="/you"
      className="nbx-btn nbx-btn-ghost h-11 rounded-full px-3 text-[12px]"
    >
      <span className="grid h-6 w-6 place-items-center rounded-full bg-gold text-[12px] font-extrabold text-trench">
        {handle.charAt(0).toUpperCase()}
      </span>
      <span className="nbx-num">@{handle}</span>
    </Link>
  ) : (
    <Link href="/login?mode=signin" className="nbx-btn nbx-btn-ghost h-11 rounded-full px-3.5 text-[12px]">
      Sign in
    </Link>
  );
}
