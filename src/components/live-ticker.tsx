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

  return (
    <div className="border-t hairline bg-abyss-900/60">
      <div className="mx-auto flex max-w-[1180px] items-center gap-2.5 px-3.5 py-1.5 sm:gap-3 sm:px-5">
        <span className="flex shrink-0 items-center gap-1.5 rounded-full bg-conch-500/18 px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wide text-conch-400 sm:text-[10.5px]">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-conch-500" />
          {total}
        </span>
        <div className="relative flex-1 min-w-0 overflow-hidden [mask-image:linear-gradient(90deg,transparent,#000_5%,#000_92%,transparent)]">
          {strip.length ? (
            <div className="marquee-track flex w-max items-center gap-6 whitespace-nowrap text-[12.5px]">
              {[...strip, ...strip].map((r, i) => (
                <Link key={`${r.id}-${i}`} href={`/incident/${r.id}`} className="hover:underline">
                  <span className="font-bold" style={{ color: CATEGORIES[r.category]?.color }}>
                    {CATEGORIES[r.category]?.label ?? "Notice"}
                  </span>{" "}
                  <span className="text-[#cfeee9]">{r.title}</span>{" "}
                  <span className="text-[#6e97a0]">
                    {r.street ? `${r.street}, ` : ""}
                    {r.parish ?? "Bahamas"} · {timeAgo(r.createdAt)}
                  </span>
                </Link>
              ))}
            </div>
          ) : (
            <p className="text-[12.5px] text-[#6e97a0]">
              Quiet on the wire right now{at ? " " : ""}— drop the first pin of the day.
            </p>
          )}
        </div>
        <div className="hidden shrink-0 items-center gap-1.5 lg:flex">
          {counts
            .slice()
            .sort((a, b) => b.n - a.n)
            .slice(0, 4)
            .map((c) => (
              <span
                key={c.category}
                className="rounded-full px-2 py-0.5 text-[10.5px] font-bold"
                style={{ background: `${CATEGORIES[c.category as CategoryKey]?.color ?? "#94a3b8"}22`, color: CATEGORIES[c.category as CategoryKey]?.color }}
              >
                {CATEGORIES[c.category as CategoryKey]?.label ?? c.category} {c.n}
              </span>
            ))}
        </div>
      </div>
    </div>
  );
}
