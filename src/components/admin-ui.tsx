import Link from "next/link";
import type { ReactNode } from "react";

const TONES: Record<string, string> = {
  tide: "bg-tide-500/18 text-tide-300",
  sun: "bg-sun-500/15 text-sun-600",
  conch: "bg-danger-500/15 text-danger-500",
  slate: "bg-white/10 text-ink-200",
  violet: "bg-[#a78bfa]/18 text-[#c4b5fd]",
};

export function Pill({ tone = "slate", children }: { tone?: keyof typeof TONES; children: ReactNode }) {
  return (
    <span className={`inline-block whitespace-nowrap rounded-full px-2 py-0.5 text-[10.5px] font-extrabold uppercase tracking-wide ${TONES[tone]}`}>{children}</span>
  );
}

export function StatCard({ label, value, sub, tone }: { label: string; value: ReactNode; sub?: string; tone?: "warn" }) {
  return (
    <div className={`glass rounded-2xl p-3.5 ${tone === "warn" ? "ring-1 ring-sun-500/40" : ""}`}>
      <p className="text-[10.5px] font-bold uppercase tracking-wide text-ink-400">{label}</p>
      <p className="display text-[26px] font-extrabold leading-tight text-sand-100">{value}</p>
      {sub ? <p className="text-[11.5px] text-ink-400">{sub}</p> : null}
    </div>
  );
}

/** A small bar chart without any chart library: one bar per day. */
export function MiniBars({ data, title }: { data: { label: string; n: number }[]; title: string }) {
  const max = Math.max(1, ...data.map((d) => d.n));
  const total = data.reduce((s, d) => s + d.n, 0);
  return (
    <div className="nb-surface rounded-xl2 p-3.5">
      <div className="flex items-baseline justify-between">
        <p className="display text-[14px] font-bold text-sand-100">{title}</p>
        <p className="text-[11.5px] text-ink-400">{total} in 14 days</p>
      </div>
      <div className="mt-3 flex h-24 items-end gap-1" role="img" aria-label={`${title}: ${total} in the last 14 days`}>
        {data.map((d) => (
          <div key={d.label} className="flex h-full flex-1 flex-col justify-end" title={`${d.label}: ${d.n}`}>
            <div className="rounded-t bg-tide-500/70" style={{ height: `${Math.max(d.n ? 6 : 2, (d.n / max) * 100)}%`, opacity: d.n ? 1 : 0.25 }} />
          </div>
        ))}
      </div>
      <div className="mt-1 flex justify-between text-[10px] text-ink-400">
        <span>{data[0]?.label}</span>
        <span>{data[data.length - 1]?.label}</span>
      </div>
    </div>
  );
}

export function adminHref(path: string, params: Record<string, string | undefined>, overrides: Record<string, string | undefined> = {}) {
  const merged = { ...params, ...overrides };
  const q = new URLSearchParams();
  for (const [k, v] of Object.entries(merged)) if (v) q.set(k, v);
  const s = q.toString();
  return s ? `${path}?${s}` : path;
}

export function FilterChips({
  label,
  name,
  options,
  value,
  path,
  params,
  scroll = false,
}: {
  label: string;
  name: string;
  options: { value: string; label: string }[];
  value: string;
  path: string;
  params: Record<string, string | undefined>;
  /** swipe sideways instead of wrapping: for long lists (islands) on narrow screens */
  scroll?: boolean;
}) {
  return (
    <div
      className={scroll ? "-mx-1 flex items-center gap-1.5 overflow-x-auto px-1 pb-1" : "flex flex-wrap items-center gap-1.5"}
      style={scroll ? { scrollbarWidth: "none" } : undefined}
    >
      <span className="shrink-0 text-[10.5px] font-bold uppercase tracking-wide text-ink-400">{label}</span>
      {options.map((o) => (
        <Link
          key={o.value}
          href={adminHref(path, params, { [name]: o.value || undefined, page: undefined })}
          className={`${scroll ? "shrink-0" : ""} rounded-full px-2.5 py-1 text-[11.5px] font-bold ${value === o.value ? "bg-tide-500 text-abyss-950" : "bg-white/6 text-ink-300 hover:bg-white/12"}`}
        >
          {o.label}
        </Link>
      ))}
    </div>
  );
}

export function Pager({ page, pages, path, params }: { page: number; pages: number; path: string; params: Record<string, string | undefined> }) {
  if (pages <= 1) return null;
  const link = "rounded-lg border hairline px-3 py-1.5 text-[12px] font-bold text-sand-100 hover:bg-white/8";
  return (
    <nav className="mt-3 flex items-center justify-between gap-2" aria-label="Pages">
      {page > 1 ? (
        <Link href={adminHref(path, params, { page: page > 2 ? String(page - 1) : undefined })} className={link}>
          ← Newer
        </Link>
      ) : (
        <span />
      )}
      <span className="text-[11.5px] text-ink-400">
        Page {page} of {pages}
      </span>
      {page < pages ? (
        <Link href={adminHref(path, params, { page: String(page + 1) })} className={link}>
          Older →
        </Link>
      ) : (
        <span />
      )}
    </nav>
  );
}

export function SearchBox({ path, q, placeholder, keep }: { path: string; q: string; placeholder: string; keep: Record<string, string | undefined> }) {
  return (
    <form action={path} method="get" className="flex gap-2">
      {Object.entries(keep).map(([k, v]) => (v ? <input key={k} type="hidden" name={k} value={v} /> : null))}
      <input
        name="q"
        defaultValue={q}
        placeholder={placeholder}
        className="min-w-0 flex-1 rounded-lg border border-white/10 bg-abyss-950/70 px-3 py-2 text-[13px] outline-none focus:border-tide-400"
      />
      <button type="submit" className="rounded-lg bg-white/10 px-3.5 py-2 text-[12.5px] font-bold text-sand-100 hover:bg-white/16">
        Search
      </button>
    </form>
  );
}
