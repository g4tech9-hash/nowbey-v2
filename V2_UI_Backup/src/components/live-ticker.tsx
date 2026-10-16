"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { CATEGORIES, type CategoryKey, timeAgo } from "@/lib/geo";

type Row = {
  id: string;
  title: string;
  category: CategoryKey;
  street: string | null;
  parish: string | null;
  createdAt: string;
};

export function LiveTicker() {
  const [rows, setRows] = useState<Row[]>([]);
  const [counts, setCounts] = useState<{ category: string; n: number }[]>([]);
  const [at, setAt] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    const load = async () => {
      try {
        const res = await fetch("/api/incidents?limit=14&status=active", { cache: "no-store" });
        const data = await res.json();
        if (!alive) return;
        setRows((data.incidents ?? []) as Row[]);
        setCounts((data.counts ?? []) as { category: string; n: number }[]);
        setAt(new Date().toISOString());
      } catch {
        /* keep the last snapshot on a flaky connection */
      }
    };
    void load();
    const t = setInterval(load, 45_000);
    return () => {
      alive = false;
      clearInterval(t);
    };
  }, []);

  const total = counts.reduce((sum, c) => sum + c.n, 0);
  const strip = rows.length ? rows : [];

  // In-flow banner: rendered inside the sticky header via AppShell's kicker prop,
  // so it must never be fixed - a fixed ticker would sit on top of the header.
  return (
    <div className="w-full border-b hairline bg-abyss-900/90 backdrop-blur-sm">
      <div className="mx-auto flex max-w-[1180px] items-center gap-2.5 px-3.5 py-1 sm:gap-3 sm:px-5">
        <span className="flex shrink-0 items-center gap-1.5 rounded-full bg-sun-500/18 px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wide text-sun-400 sm:text-[10.5px]">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-sun-500" />
          Gas Updates
        </span>
        <div className="relative flex-1 min-w-0 overflow-hidden [mask-image:linear-gradient(90deg,transparent,#000_5%,#000_92%,transparent)]">
          <div className="marquee-track flex w-max items-center gap-8 whitespace-nowrap text-[12.5px] font-medium text-sand-100">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="flex items-center gap-6">
                <span>Shell <span className="text-sun-400">$7.08/gal</span></span>
                <span>Esso <span className="text-sun-400">$7.50/gal</span></span>
                <span>Rubis <span className="text-sun-400">$7.56/gal</span></span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
