"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export type AdminTab = { href: string; label: string; badge?: number };

export function AdminNav({ tabs }: { tabs: AdminTab[] }) {
  const pathname = usePathname();
  return (
    <nav aria-label="Admin sections" className="nb-scroll -mx-1 mb-5 flex gap-1 overflow-x-auto border-b hairline px-1 pb-2">
      {tabs.map((t) => {
        const active = t.href === "/admin" ? pathname === "/admin" : pathname.startsWith(t.href);
        return (
          <Link
            key={t.href}
            href={t.href}
            aria-current={active ? "page" : undefined}
            className={`flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-1.5 text-[13px] font-bold ${
              active ? "bg-tide-500/18 text-tide-300 ring-1 ring-tide-400/40" : "text-ink-300 hover:bg-white/6"
            }`}
          >
            {t.label}
            {t.badge ? <span className="rounded-full bg-conch-500 px-1.5 py-[1px] text-[11.5px] font-extrabold text-abyss-950">{t.badge}</span> : null}
          </Link>
        );
      })}
    </nav>
  );
}
