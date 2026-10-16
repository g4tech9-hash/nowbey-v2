/* ============================================================================
 * Wire_2026_Web_Preview.tsx — PREVIEW ONLY. Not imported by any route.
 * ----------------------------------------------------------------------------
 * The 2026 "Tideglass" redesign of the second core screen: the News Wire.
 * Drop-in candidate for src/app/wire/page.tsx AFTER approval.
 *
 * Same design language as Map_2026_Web_Preview.tsx: glass command bar,
 * category accent rails, tabular mono numerics, solid data surfaces, honest
 * pinned/unpinned states. Mock data; PROD: comments mark the rewiring.
 * ========================================================================== */
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Search,
  Radio,
  MapPin,
  MessageSquare,
  ThumbsUp,
  Eye,
  ArrowUpRight,
  Clock,
  Sparkles,
  Rss,
  Plus,
  Sun,
  Moon,
  Bell,
  type LucideIcon,
} from "lucide-react";

/* -------------------------------------------------------------------------- */
/* Taxonomy — mirrors src/lib/geo.ts                                          */
/* -------------------------------------------------------------------------- */
type CatKey = "flood" | "storm" | "power" | "water" | "crime" | "road" | "marine" | "fire" | "health" | "trash" | "event" | "notice" | "accident";

const CATS: Record<CatKey, { label: string; color: string }> = {
  flood: { label: "Flooding", color: "var(--color-cat-flood)" },
  storm: { label: "Storm", color: "var(--color-cat-storm)" },
  power: { label: "Power", color: "var(--color-cat-power)" },
  water: { label: "Water", color: "var(--color-cat-water)" },
  crime: { label: "Safety", color: "var(--color-cat-crime)" },
  road: { label: "Road", color: "var(--color-cat-road)" },
  marine: { label: "Marine", color: "var(--color-cat-marine)" },
  fire: { label: "Fire", color: "var(--color-cat-fire)" },
  health: { label: "Health", color: "var(--color-cat-health)" },
  trash: { label: "Sanitation", color: "var(--color-cat-trash)" },
  event: { label: "Community", color: "var(--color-cat-event)" },
  notice: { label: "Notice", color: "var(--color-cat-notice)" },
  accident: { label: "Car Accident", color: "var(--color-cat-accident)" },
};

/* -------------------------------------------------------------------------- */
/* Mock wire — PROD: db.select().from(newsItems).where(review=approved)       */
/* -------------------------------------------------------------------------- */
type News = {
  id: string;
  title: string;
  source: string;
  host: string;
  cat: CatKey;
  mins: number;
  parish: string | null;
  pinned: { lat: number; lng: number } | null;
  ai: string | null;
  summary: string | null;
  reacts: number;
  comments: number;
};

const NEWS: News[] = [
  {
    id: "n1",
    title: "Coastal flood watch issued for New Providence as squall lines stall offshore",
    source: "NEMA", host: "nema.gov.bs", cat: "storm", mins: 24, parish: "New Providence",
    pinned: { lat: 25.0629, lng: -77.3417 },
    ai: "NEMA raised a coastal flood watch for New Providence until 8pm. Expect washover on northern shore roads; NEMA advises moving vehicles off low-lying streets.",
    summary: null, reacts: 34, comments: 12,
  },
  {
    id: "n2",
    title: "BPL restores power to 4,000 homes in eastern district after substation fault",
    source: "BPL", host: "bpl.com.bs", cat: "power", mins: 58, parish: "New Providence",
    pinned: { lat: 25.0812, lng: -77.3185 },
    ai: null,
    summary: "Crews completed switching repairs at the East Street station; remaining outages are isolated to Cable Beach and Bain Town.",
    reacts: 21, comments: 8,
  },
  {
    id: "n3",
    title: "Ministry of Health: boil notice remains for Blue Lagoon until further testing",
    source: "ZNS", host: "znsbahamas.com", cat: "water", mins: 132, parish: "New Providence",
    pinned: { lat: 25.0489, lng: -77.3622 },
    ai: "A main break forced a precautionary boil notice for Blue Lagoon. Sampling continues; the notice lifts only after two clear tests.",
    summary: null, reacts: 17, comments: 5,
  },
  {
    id: "n4",
    title: "Regatta qualifiers postponed to Sunday as organizers monitor sea state",
    source: "The Tribune", host: "tribune242.com", cat: "event", mins: 205, parish: null,
    pinned: null,
    ai: null,
    summary: null, reacts: 9, comments: 3,
  },
  {
    id: "n5",
    title: "Traffic advisory: lane closures on JFK Drive through Friday for resurfacing",
    source: "BTC", host: "bahamas.gov.bs", cat: "road", mins: 320, parish: "New Providence",
    pinned: { lat: 25.0753, lng: -77.3441 },
    ai: null,
    summary: null, reacts: 6, comments: 2,
  },
];

const SOURCES = [
  { name: "NEMA", n: 12, live: true },
  { name: "BPL", n: 8, live: true },
  { name: "ZNS", host: "", n: 7, live: false },
  { name: "The Tribune", n: 6, live: false },
  { name: "The Nassau Guardian", n: 5, live: false },
];

function ago(mins: number) {
  if (mins < 60) return `${mins}m`;
  const h = Math.floor(mins / 60);
  if (h < 24) return `${h}h`;
  return `${Math.floor(h / 24)}d`;
}

/* -------------------------------------------------------------------------- */
/* News card                                                                   */
/* -------------------------------------------------------------------------- */
function NewsCard({ n, newest }: { n: News; newest: boolean }) {
  const c = CATS[n.cat];
  const [reacted, setReacted] = useState(false);
  return (
    <article className="nb-surface group p-4 transition-all duration-200 ease-standard hover:-translate-y-0.5 hover:shadow-l3" style={{ borderLeft: `3px solid ${c.color}` }}>
      <div className="flex flex-wrap items-center gap-2 text-2xs font-bold uppercase tracking-[0.12em]">
        <span className="flex items-center gap-1.5" style={{ color: c.color }}>
          <span className="h-2 w-2 rounded-full" style={{ background: c.color }} />
          {c.label}
        </span>
        <span className="font-mono normal-case tracking-normal text-ink-400">
          {n.source} · {ago(n.mins)} ago
        </span>
        {n.parish && (
          <button className="nb-focus rounded-pill bg-white/8 px-2 py-0.5 text-2xs font-bold normal-case tracking-normal text-ink-200 transition hover:bg-white/16">
            <MapPin size={9} className="mr-0.5 inline align-[-1px]" />
            {n.parish}
          </button>
        )}
        {newest && (
          <span className="ml-auto rounded-pill bg-tide-500/18 px-2 py-0.5 text-2xs font-extrabold normal-case tracking-normal text-tide-300">newest</span>
        )}
      </div>
      <h2 className="display mt-2 text-base font-extrabold leading-snug text-ink-100">
        <a href={`https://${n.host}`} target="_blank" rel="noreferrer" className="transition hover:text-tide-300">
          {n.title}
        </a>
      </h2>
      {n.ai ? (
        <p className="mt-2 rounded-md border border-tide-400/25 bg-tide-500/8 p-2.5 text-sm leading-relaxed text-ink-200">
          <span className="mr-1.5 inline-flex items-center gap-1 rounded-xs bg-tide-500/20 px-1.5 py-0.5 align-middle text-2xs font-extrabold uppercase tracking-wide text-tide-300">
            <Sparkles size={9} /> AI brief
          </span>
          {n.ai}
        </p>
      ) : n.summary ? (
        <p className="mt-2 text-sm leading-relaxed text-ink-300">{n.summary}</p>
      ) : null}
      <div className="mt-2.5 flex flex-wrap items-center gap-2 text-2xs">
        {n.pinned ? (
          <span className="rounded-pill bg-white/8 px-2 py-1 font-mono font-semibold text-ink-200">
            Pinned · {n.pinned.lat.toFixed(4)}, {n.pinned.lng.toFixed(4)}
          </span>
        ) : (
          <span className="rounded-pill bg-white/6 px-2 py-1 text-ink-400">No place named in the text — unpinned</span>
        )}
        <a href={`https://${n.host}`} target="_blank" rel="noreferrer" className="nb-focus ml-auto flex items-center gap-1 rounded-pill px-2 py-1 font-bold text-tide-300 transition hover:bg-white/8">
          Read at {n.host} <ArrowUpRight size={11} />
        </a>
      </div>
      <div className="mt-3 flex items-center gap-4 border-t hairline pt-2.5">
        <button
          onClick={() => setReacted((v) => !v)}
          className={`nb-focus flex items-center gap-1.5 rounded-pill px-2 py-1 text-xs font-bold transition ${
            reacted ? "bg-tide-500/20 text-tide-300" : "text-ink-300 hover:bg-white/8 hover:text-ink-100"
          }`}
        >
          <ThumbsUp size={13} />
          <span className="num">{n.reacts + (reacted ? 1 : 0)}</span>
        </button>
        <button className="nb-focus flex items-center gap-1.5 rounded-pill px-2 py-1 text-xs font-bold text-ink-300 transition hover:bg-white/8 hover:text-ink-100">
          <MessageSquare size={13} />
          <span className="num">{n.comments}</span>
        </button>
        <span className="ml-auto flex items-center gap-1 font-mono text-2xs text-ink-400">
          <Clock size={10} /> {ago(n.mins)}
        </span>
      </div>
    </article>
  );
}

/* -------------------------------------------------------------------------- */
/* The page                                                                    */
/* -------------------------------------------------------------------------- */
export default function Wire2026WebPreview() {
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [filter, setFilter] = useState<CatKey | "all">("all");

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") { e.preventDefault(); setPaletteOpen((v) => !v); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const visible = filter === "all" ? NEWS : NEWS.filter((n) => n.cat === filter);
  const pinned = useMemo(() => NEWS.filter((n) => n.pinned), []);

  return (
    <div data-theme={theme} className="nb-aurora relative min-h-screen overflow-hidden bg-abyss-950 text-ink-100">
      {/* ============ Command bar ============ */}
      <header className="nb-glass-strong sticky top-0 z-[800]">
        <div className="mx-auto flex max-w-[1200px] items-center gap-3 px-4 py-2.5">
          <a href="#" className="flex items-center gap-2.5">
            <svg width="30" height="30" viewBox="0 0 40 40" aria-hidden>
              <defs>
                <linearGradient id="nbwire" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stopColor="var(--color-tide-400)" />
                  <stop offset="55%" stopColor="var(--color-tide-500)" />
                  <stop offset="100%" stopColor="var(--color-conch-500)" />
                </linearGradient>
              </defs>
              <rect x="1.5" y="1.5" width="37" height="37" rx="12" fill="var(--color-abyss-800)" stroke="url(#nbwire)" strokeWidth="2" />
              <path d="M8 25.5c3.6-3.4 6.2 2.2 9.9 0 3.7-2.2 5.6 2.6 9.4 0" stroke="var(--color-tide-400)" strokeWidth="2" fill="none" strokeLinecap="round" />
              <path d="M20 8.5c-3.9 0-7 3-7 6.8 0 4.9 7 11.2 7 11.2s7-6.3 7-11.2c0-3.8-3.1-6.8-7-6.8Z" fill="none" stroke="url(#nbwire)" strokeWidth="2.2" />
              <circle cx="20" cy="15.2" r="2.4" fill="var(--color-sun-500)" />
            </svg>
            <span className="leading-none">
              <span className="display block text-lg font-extrabold tracking-tight text-ink-100">Now<span className="text-tide-400">Bey</span></span>
              <span className="mt-0.5 block text-2xs font-semibold uppercase tracking-[0.16em] text-ink-400">Stay safe, Bahamas</span>
            </span>
          </a>
          <button
            onClick={() => setPaletteOpen(true)}
            className="nb-focus ml-4 hidden min-w-[240px] flex-1 items-center gap-2.5 rounded-pill border hairline bg-abyss-950/60 px-3.5 py-2 text-left text-sm text-ink-400 transition hover:border-tide-400/40 md:flex md:max-w-[420px]"
          >
            <Search size={15} />
            Search the wire…
            <kbd className="ml-auto rounded-xs border hairline px-1.5 py-0.5 font-mono text-2xs">⌘K</kbd>
          </button>
          <div className="ml-auto flex items-center gap-2">
            <span className="hidden items-center gap-2 rounded-pill border hairline bg-abyss-950/60 px-3 py-1.5 text-xs font-bold text-ink-200 sm:flex">
              <span className="nb-live-dot" />
              INGESTING · 38 stories
            </span>
            <button onClick={() => setTheme(theme === "dark" ? "light" : "dark")} className="nb-focus rounded-pill border hairline bg-abyss-950/60 p-2 text-ink-300 hover:text-tide-300" aria-label="Toggle theme">
              {theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
            </button>
            <button className="nb-focus relative rounded-pill border hairline bg-abyss-950/60 p-2 text-ink-300 hover:text-tide-300" aria-label="Alerts">
              <Bell size={16} />
              <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-conch-500" />
            </button>
            <span className="grid h-9 w-9 place-items-center rounded-pill border hairline bg-gradient-to-br from-tide-500 to-conch-500 text-xs font-extrabold text-abyss-950">SB</span>
          </div>
        </div>
      </header>

      <main className="mx-auto grid max-w-[1200px] grid-cols-1 items-start gap-4 p-4 lg:grid-cols-[minmax(0,1fr)_330px]">
        {/* ============ Feed ============ */}
        <section className="min-w-0">
          <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
            <div>
              <p className="text-2xs font-bold uppercase tracking-[0.16em] text-tide-300">News wire</p>
              <h1 className="display text-[clamp(1.4rem,3vw,1.9rem)] font-extrabold leading-tight text-ink-100">The news wire, on the map</h1>
            </div>
            <button className="nb-focus flex min-h-[40px] items-center gap-1.5 rounded-pill bg-tide-500 px-4 text-xs font-extrabold text-abyss-950 transition hover:bg-tide-400 active:scale-95">
              <Plus size={14} strokeWidth={3} /> Submit a link
            </button>
          </div>

          {/* category filter rail */}
          <div className="nb-no-scrollbar mb-3 flex gap-1.5 overflow-x-auto pb-0.5">
            <button
              onClick={() => setFilter("all")}
              className={`nb-focus shrink-0 rounded-pill px-3 py-1.5 text-xs font-bold transition ${filter === "all" ? "bg-tide-500 text-abyss-950" : "border hairline text-ink-300 hover:bg-white/8"}`}
            >
              All · {NEWS.length}
            </button>
            {(Object.keys(CATS) as CatKey[]).map((k) => (
              <button
                key={k}
                onClick={() => setFilter(k)}
                className={`nb-focus flex shrink-0 items-center gap-1.5 rounded-pill px-3 py-1.5 text-xs font-bold transition ${filter === k ? "bg-tide-500 text-abyss-950" : "border hairline text-ink-300 hover:bg-white/8"}`}
              >
                <span className="h-2 w-2 rounded-full" style={{ background: CATS[k].color }} />
                {CATS[k].label}
              </button>
            ))}
          </div>

          <div className="space-y-3">
            {visible.map((n, i) => <NewsCard key={n.id} n={n} newest={i === 0 && filter === "all"} />)}
          </div>
        </section>

        {/* ============ Sidebar: wire map + sources ============ */}
        <aside className="flex flex-col gap-3 lg:sticky lg:top-[76px]">
          <div className="nb-surface overflow-hidden">
            <div className="flex items-center gap-2 border-b hairline px-3.5 py-2.5">
              <Radio size={13} className="text-tide-300" />
              <h2 className="text-2xs font-bold uppercase tracking-[0.16em] text-ink-300">Where the stories are</h2>
              <span className="nb-live-dot ml-auto" />
            </div>
            <div className="relative h-52 bg-abyss-975">
              <div className="absolute inset-0" style={{ background: "radial-gradient(70% 70% at 55% 42%, var(--color-abyss-800), var(--color-abyss-975))" }} />
              <div className="absolute inset-0 opacity-30" style={{ background: "radial-gradient(34% 40% at 86% 78%, color-mix(in srgb, var(--color-cat-water) 30%, transparent), transparent 70%)" }} />
              {pinned.map((n, i) => (
                <button
                  key={n.id}
                  className="absolute -translate-x-1/2 -translate-y-full transition-transform hover:scale-110"
                  style={{ left: `${20 + i * 16}%`, top: `${30 + (i % 3) * 18}%` }}
                  aria-label={n.title}
                >
                  <span className="grid h-6 w-6 place-items-center rounded-full border-2 border-white/60 text-abyss-950" style={{ background: CATS[n.cat].color, boxShadow: `0 2px 10px ${CATS[n.cat].color}77` }}>
                    <MapPin size={10} strokeWidth={3} />
                  </span>
                </button>
              ))}
              <p className="absolute inset-x-0 bottom-2 text-center font-mono text-2xs text-ink-400">{pinned.length} of {NEWS.length} stories placed</p>
            </div>
          </div>

          <div className="nb-surface p-3.5">
            <div className="mb-2 flex items-center gap-2">
              <Rss size={13} className="text-tide-300" />
              <h2 className="text-2xs font-bold uppercase tracking-[0.16em] text-ink-300">Sources</h2>
            </div>
            <ul className="space-y-1.5">
              {SOURCES.map((s) => (
                <li key={s.name} className="flex items-center gap-2.5 rounded-md px-2 py-1.5 transition hover:bg-white/6">
                  <span className="grid h-7 w-7 place-items-center rounded-sm border hairline bg-abyss-850 font-mono text-2xs font-extrabold text-tide-300">
                    {s.name.slice(0, 2)}
                  </span>
                  <span className="flex-1 text-xs font-bold text-ink-200">{s.name}</span>
                  {s.live && <span className="nb-live-dot" />}
                  <span className="num font-mono text-2xs text-ink-400">{s.n}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="nb-surface p-3.5">
            <h2 className="mb-1.5 text-2xs font-bold uppercase tracking-[0.16em] text-ink-400">Honest ingest</h2>
            <p className="text-xs leading-relaxed text-ink-300">
              Stories we cannot place stay in the list without a pin — we never guess a location. AI briefs summarize; they never invent.
            </p>
          </div>
        </aside>
      </main>

      {/* palette (compact, same interaction contract as the map preview) */}
      {paletteOpen && (
        <div className="fixed inset-0 z-[900] flex items-start justify-center bg-abyss-975/60 pt-[12vh] backdrop-blur-sm" onClick={() => setPaletteOpen(false)}>
          <div className="nb-glass-strong w-[min(520px,92vw)] animate-rise overflow-hidden rounded-xl2" onClick={(e) => e.stopPropagation()} role="dialog" aria-label="Command palette">
            <div className="flex items-center gap-2.5 border-b hairline px-4 py-3">
              <Search size={16} className="text-ink-300" />
              <input autoFocus placeholder="Search the wire…" className="w-full bg-transparent text-base text-ink-100 outline-none placeholder:text-ink-400" />
              <kbd className="rounded-xs border hairline px-1.5 py-0.5 font-mono text-2xs text-ink-400">esc</kbd>
            </div>
            <div className="p-2">
              {[
                { l: "Jump to — Safety map", i: MapPin },
                { l: "Jump to — Alerts inbox", i: Bell },
                { l: "Action — Submit a link", i: Plus },
                { l: "Action — Pin a spot", i: MapPin },
              ].map((r, i) => (
                <button key={r.l} className={`nb-focus flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-left text-sm transition ${i === 0 ? "bg-tide-500/18 text-ink-100" : "text-ink-200 hover:bg-white/8"}`}>
                  <r.i size={15} className={i === 0 ? "text-tide-300" : "text-ink-400"} />
                  {r.l}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      <div className="nb-glass fixed bottom-4 right-4 z-[960] rounded-lg p-2 text-2xs">
        <p className="px-1 font-bold uppercase tracking-[0.14em] text-ink-400">2026 preview</p>
        <p className="num px-1 font-mono text-ink-400">wire · mock data</p>
      </div>
    </div>
  );
}
