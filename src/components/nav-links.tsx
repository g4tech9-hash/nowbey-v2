"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { FEATURES } from "@/lib/features";

/* =====================================================================
   Navigation — rebuilt 2026-10-17.
   Desktop: muted text links. Session: the exact “Sign in” outline pill +
   “Sign up” mint pill from the reference header. The phone tab bar is
   the fixed bottom navigation from the reference mockups.
   ===================================================================== */

const TABS = [
  { href: "/feed", label: "Feed", icon: "M4 6h16M4 12h11M4 18h7" },
  {
    href: "/map",
    label: "Map",
    icon: "M12 21s7-6.3 7-11a7 7 0 1 0-14 0c0 4.7 7 11 7 11Zm0-8.6a2.4 2.4 0 1 0 0-4.8 2.4 2.4 0 0 0 0 4.8Z",
  },
  { href: "/report", label: "Report", icon: "M12 5v14M5 12h14" },
  { href: "/wire", label: "Wire", icon: "M4 5h16v14H4zM4 9.5h16M8 13.5h8M8 16.5h5" },
  {
    href: "/alerts",
    label: "Alerts",
    icon: "M6 9a6 6 0 1 1 12 0c0 5 2 6 2 6H4s2-1 2-6Zm4 10a2.2 2.2 0 0 0 4 0",
  },
] as const;

/** Feed · Map · Report · Wire · Alerts — fixed bottom navigation, always one tap away. */
export function BottomTabBar() {
  const path = usePathname();
  return (
    <nav className="nb-tabbar nb-pad-bottom fixed inset-x-0 bottom-0 z-[700]" aria-label="Main sections">
      {TABS.map((t) => {
        const active = path === t.href || path.startsWith(`${t.href}/`);
        return (
          <Link key={t.href} href={t.href} className="nb-tab" aria-current={active ? "page" : undefined}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d={t.icon} />
            </svg>
            <span>{t.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}

const LINKS = [
  { href: "/feed", label: "Feed" },
  { href: "/map", label: "Map" },
  { href: "/report", label: "Report" },
  ...(FEATURES.islandLife ? [{ href: "/life", label: "Island Life" }] : []),
  { href: "/wire", label: "News wire" },
  { href: "/alerts", label: "Alerts" },
  { href: "/open-now", label: "Open now" },
  ...(FEATURES.gasTracker ? [{ href: "/gas", label: "Gas" }] : []),
  { href: "/support", label: "Plans" },
] as const;

export function NavLinks() {
  const pathname = usePathname();
  return (
    <nav aria-label="Sections">
      <ul className="flex items-center gap-1">
        {LINKS.map((l) => {
          const active = pathname === l.href || pathname.startsWith(`${l.href}/`);
          return (
            <li key={l.href}>
              <Link
                href={l.href}
                aria-current={active ? "page" : undefined}
                className="inline-flex min-h-[40px] items-center rounded-full px-3.5 text-[13.5px] font-bold transition-colors"
                style={
                  active
                    ? { color: "var(--nb-mint)", background: "rgba(67,224,203,.09)" }
                    : { color: "var(--nb-muted)" }
                }
              >
                {l.label}
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
      className="flex min-h-[40px] items-center gap-2 rounded-full border px-3.5 py-1.5 text-[13px] font-bold transition-colors hover:border-[rgba(67,224,203,.45)]"
      style={{ borderColor: "var(--nb-stroke-btn)", background: "rgba(12,34,45,.6)", color: "var(--nb-cream)" }}
    >
      <span
        className="grid h-6 w-6 place-items-center rounded-full text-[12px] font-extrabold"
        style={{ background: "var(--nb-coral)", color: "#241408" }}
      >
        {handle.charAt(0).toUpperCase()}
      </span>
      @{handle}
    </Link>
  ) : (
    <span className="flex items-center gap-2">
      <Link
        href="/login?mode=signin"
        className="nb-btn nb-btn-outline nb-btn-sm"
        style={{ background: "rgba(3,12,19,.4)" }}
      >
        Sign in
      </Link>
      <Link href="/login?mode=signup" className="nb-btn nb-btn-primary nb-btn-sm">
        Sign up
      </Link>
    </span>
  );
}
