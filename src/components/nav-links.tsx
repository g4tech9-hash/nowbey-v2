"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

const LINKS = [
  { href: "/", label: "Feed", short: "Feed", icon: "feed" },
  { href: "/map", label: "Map", short: "Map", icon: "map" },
  { href: "/report", label: "Report", short: "Report", icon: "report" },
  ...(process.env.FEATURE_ISLAND_LIFE === "true" ? [{ href: "/life", label: "Island Life", short: "Life", icon: "life" }] : []),
  { href: "/wire", label: "News wire", short: "Wire", icon: "wire" },
  { href: "/alerts", label: "Alerts", short: "Alerts", icon: "bell" },
  {
    href: "/support",
    label: "Plans",
    short: "Plans",
    icon: "heart",
    children: [
      ...(process.env.FEATURE_GAS_TRACKER === "true" ? [{ href: "/gas", label: "Gas prices", short: "Gas", icon: "wire" }] : []),
    ]
  },
] as const;

function Glyph({ name, active }: { name: string; active: boolean }) {
  const stroke = active ? "#03121b" : "#bfe4e0";
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

export function NavLinks({ variant = "top" }: { variant?: "top" | "bar" }) {
  const pathname = usePathname();
  const [online, setOnline] = useState(true);

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

  if (variant === "bar") {
    return (
      <nav
        className="fixed inset-x-0 bottom-0 z-[700] border-t hairline bg-abyss-950/92 backdrop-blur-md nb-pad-bottom nb-pad-top lg:hidden"
        style={{ paddingTop: "calc(env(safe-area-inset-top, 0px) + 0.1rem)" }}
        aria-label="Primary"
      >
        <ul className="mx-auto flex max-w-lg items-stretch justify-between gap-1 px-1.5 pb-1.5 pt-1">
          {[...LINKS.filter((l) => l.href !== "/support"), ...(process.env.FEATURE_GAS_TRACKER === "true" ? [{ href: "/gas", label: "Gas", short: "Gas", icon: "wire" } as const] : [])].map((l) => {
            const active = l.href === "/" ? pathname === "/" : pathname.startsWith(l.href);
            return (
              <li key={l.href} className="flex-1">
                <Link
                  href={l.href}
                  aria-current={active ? "page" : undefined}
                  className={`flex min-h-[48px] flex-col items-center justify-center gap-0.5 rounded-xl px-1 text-[10.5px] font-bold active:scale-[0.97] ${
                    active ? "bg-tide-500 text-abyss-950" : "text-[#bfe4e0] hover:bg-white/8"
                  }`}
                >
                  <Glyph name={l.icon} active={active} />
                  {l.short}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    );
  }

  return (
    <div className="flex items-center gap-1">
      {LINKS.map((l) => {
        const active = l.href === "/" ? pathname === "/" : pathname.startsWith(l.href);
        const childActive = "children" in l && l.children ? l.children.some((c) => pathname.startsWith(c.href)) : false;
        if ("children" in l && l.children) {
          return (
            <div key={l.href} className="group relative">
              <Link
                href={l.href}
                aria-current={active || childActive ? "page" : undefined}
                className={`rounded-lg px-2.5 py-1.5 text-[13px] font-semibold transition ${
                  active || childActive ? "bg-tide-500/18 text-tide-300 ring-1 ring-tide-400/40" : "text-[#a9cdc9] hover:bg-white/5 hover:text-sand-100"
                }`}
              >
                {l.label}
              </Link>
              <div className="invisible absolute left-0 top-full z-[660] w-44 pt-1 opacity-0 transition group-hover:visible group-hover:opacity-100 group-focus-within:visible group-focus-within:opacity-100">
                <div className="glass overflow-hidden rounded-xl p-1">
                  {l.children.map((c) => (
                    <Link
                      key={c.href}
                      href={c.href}
                      aria-current={pathname.startsWith(c.href) ? "page" : undefined}
                      className={`block rounded-lg px-2.5 py-2 text-[13px] font-semibold ${
                        pathname.startsWith(c.href) ? "bg-tide-500/18 text-tide-300" : "text-[#a9cdc9] hover:bg-white/5 hover:text-sand-100"
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
        return (
          <Link
            key={l.href}
            href={l.href}
            aria-current={active ? "page" : undefined}
            className={`rounded-lg px-2.5 py-1.5 text-[13px] font-semibold transition ${
              active ? "bg-tide-500/18 text-tide-300 ring-1 ring-tide-400/40" : "text-[#a9cdc9] hover:bg-white/5 hover:text-sand-100"
            }`}
          >
            {l.label}
          </Link>
        );
      })}
      <span
        title={online ? "Browser is online" : "Browser is offline — showing the last cached feed"}
        className={`ml-1 hidden items-center gap-1 rounded-full px-2 py-1 text-[10.5px] font-bold lg:inline-flex ${
          online ? "bg-tide-500/15 text-tide-300" : "bg-conch-500/20 text-conch-400"
        }`}
      >
        <span className={`h-1.5 w-1.5 rounded-full ${online ? "bg-tide-400" : "bg-conch-500"}`} />
        {online ? "live" : "cached"}
      </span>
    </div>
  );
}

export function SessionChip({ handle }: { handle: string | null }) {
  return handle ? (
    <Link
      href="/you"
      className="flex items-center gap-2 rounded-full border hairline bg-white/5 px-2.5 py-1.5 text-[12.5px] font-bold text-sand-100 hover:bg-white/10"
    >
      <span className="grid h-5 w-5 place-items-center rounded-full bg-conch-500 text-[10px] text-abyss-950">
        {handle.charAt(0).toUpperCase()}
      </span>
      @{handle}
    </Link>
  ) : (
    <Link
      href="/login"
      className="rounded-full border hairline px-3 py-1.5 text-[12.5px] font-bold text-[#bfe4e0] hover:bg-white/5"
    >
      Sign in
    </Link>
  );
}
