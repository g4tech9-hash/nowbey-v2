/* ============================================================================
 * Profile_Social_Web_Preview.tsx — PREVIEW ONLY. Not imported by any route.
 * ----------------------------------------------------------------------------
 * The 2026 "Island Record" — NowBey's social-first member profile, shown in
 * the remediated Light Mode. Drop-in candidate for src/app/u/[handle]/page.tsx
 * (and src/app/you/page.tsx with self=true) AFTER approval.
 *
 * Requires: nowbey-2026-tokens.css THEN Theme_LightMode_Fix.css (this preview
 * forces data-theme="light" on its root).
 *
 * Every social paradigm maps to real product data (see Profile_2026_Strategy.md):
 * impact stats → incidents, confirmations → react rows, islands covered →
 * alertSubscriptions, badges → badgeGrants, coverage → CATEGORIES. PROD:
 * comments mark the exact rewiring points.
 * ========================================================================== */
"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Search,
  ShieldCheck,
  MapPin,
  Calendar,
  Radio,
  CircleCheck,
  Clock,
  TriangleAlert,
  Waves,
  Wind,
  Zap,
  Droplets,
  ShieldAlert,
  Construction,
  Anchor,
  Flame,
  HeartPulse,
  Trash2,
  Star,
  Info,
  Car,
  Crown,
  Link2,
  Check,
  Lock,
  type LucideIcon,
} from "lucide-react";

/* -------------------------------------------------------------------------- */
/* Taxonomy — mirrors src/lib/geo.ts (unchanged product data)                 */
/* -------------------------------------------------------------------------- */
type CatKey = "flood" | "storm" | "power" | "water" | "crime" | "road" | "marine" | "fire" | "health" | "trash" | "event" | "notice" | "accident";

const CATS: Record<CatKey, { label: string; Icon: LucideIcon }> = {
  flood: { label: "Flooding", Icon: Waves },
  storm: { label: "Storm", Icon: Wind },
  power: { label: "Power", Icon: Zap },
  water: { label: "Water", Icon: Droplets },
  crime: { label: "Safety", Icon: ShieldAlert },
  road: { label: "Road", Icon: Construction },
  marine: { label: "Marine", Icon: Anchor },
  fire: { label: "Fire", Icon: Flame },
  health: { label: "Health", Icon: HeartPulse },
  trash: { label: "Sanitation", Icon: Trash2 },
  event: { label: "Community", Icon: Star },
  notice: { label: "Notice", Icon: Info },
  accident: { label: "Car Accident", Icon: Car },
};

/* -------------------------------------------------------------------------- */
/* Mock member record — PROD: src/lib/profile.ts (reportRecord, liveBadges,   */
/* alertIslandCount, reportsFor) + incidents.confirmations                    */
/* -------------------------------------------------------------------------- */
const MEMBER = {
  handle: "sasha.b",
  name: "Sasha Bethel",
  initials: "SB",
  island: "New Providence",
  since: "March 2024",
  tier: "Island Guardian",
  bio: "East St resident. I report what I see on my walk to work — flooding first, power second. Confirm what you can; that is how the map stays honest.",
  verified: true,
  verifiedReason: "Consistent, accurate reporting through the 2025 storm season.",
  verifiedBy: "NowBey desk",
  stats: { reports: 47, confirmations: 312, islands: 3, weeks: 96 },
  ratio: 6.6, // confirmations per report — trust, not popularity
  coverage: { flood: 14, power: 11, storm: 9, road: 6, marine: 4, accident: 3 } as Record<string, number>,
};

type TimelineEntry =
  | { kind: "report"; id: string; title: string; cat: CatKey; sev: 1 | 2 | 3 | 4 | 5; mins: number; status: "open" | "resolved"; confirms: number }
  | { kind: "confirm"; id: string; title: string; n: number; mins: number }
  | { kind: "badge"; id: string; badge: string; mins: number };

const TIMELINE: TimelineEntry[] = [
  { kind: "report", id: "t1", title: "Lines down after squall", cat: "power", sev: 5, mins: 128, status: "open", confirms: 41 },
  { kind: "confirm", id: "t2", title: "Knee-deep water on Bay Street", n: 12, mins: 372 },
  { kind: "report", id: "t3", title: "Boil notice — Blue Lagoon", cat: "water", sev: 3, mins: 1520, status: "resolved", confirms: 31 },
  { kind: "badge", id: "t4", badge: "Storm-season watcher", mins: 4300 },
  { kind: "report", id: "t5", title: "Junkanoo practice — expect crowds", cat: "event", sev: 1, mins: 5760, status: "resolved", confirms: 17 },
];

const ACHIEVEMENTS: { name: string; desc: string; earned: boolean; progress?: string; Icon: LucideIcon }[] = [
  { name: "First report", desc: "Filed your first pin on the map", earned: true, Icon: MapPin },
  { name: "Storm-season watcher", desc: "10 storm or flood reports in one season", earned: true, Icon: Wind },
  { name: "Island guardian", desc: "Alerts live on 3 islands", earned: true, Icon: Radio },
  { name: "Verified reporter", desc: "Checked by a person at NowBey", earned: true, Icon: ShieldCheck },
  { name: "Century reporter", desc: "100 reports filed", earned: false, progress: "47 / 100", Icon: Crown },
  { name: "Neighbour anchor", desc: "500 confirmations received", earned: false, progress: "312 / 500", Icon: CircleCheck },
];

const NEIGHBOURS = [
  { initials: "DK", name: "@dana.k", n: 34 },
  { initials: "RM", name: "@rex.m", n: 27 },
  { initials: "TB", name: "@tia.b", n: 21 },
  { initials: "AJ", name: "@aj_", n: 18 },
  { initials: "MP", name: "@m.p", n: 12 },
];

function ago(mins: number) {
  if (mins < 60) return `${mins}m`;
  const h = Math.floor(mins / 60);
  if (h < 24) return `${h}h`;
  const d = Math.floor(h / 24);
  return d < 30 ? `${d}d` : `${Math.floor(d / 30)}mo`;
}

function SeverityMeter({ sev }: { sev: number }) {
  const c = `var(--color-sev-${sev})`;
  return (
    <span className="flex items-center gap-1" role="img" aria-label={`Severity ${sev} of 5`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <span key={i} className="nb-sev" data-on={i <= sev} style={{ ["--sev-color" as string]: c }} />
      ))}
    </span>
  );
}

function StatTile({ label, value, sub, accent }: { label: string; value: string; sub: string; accent?: boolean }) {
  return (
    <div className={`nb-surface flex flex-col justify-between p-4 transition-all duration-200 ease-standard hover:-translate-y-0.5 hover:shadow-l3 ${accent ? "shadow-glow-tide" : ""}`}>
      <p className="text-2xs font-bold uppercase tracking-[0.14em] text-ink-400">{label}</p>
      <p className={`num display mt-2 text-3xl font-extrabold ${accent ? "text-tide-650" : "text-ink-100"}`}>{value}</p>
      <p className="mt-1 text-2xs text-ink-300">{sub}</p>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* The page                                                                    */
/* -------------------------------------------------------------------------- */
export default function ProfileSocial2026Preview({ self = false }: { self?: boolean }) {
  const [tab, setTab] = useState<"record" | "reports" | "badges">("record");
  const [copied, setCopied] = useState(false);
  const m = MEMBER;

  useEffect(() => {
    if (!copied) return;
    const t = setTimeout(() => setCopied(false), 2200);
    return () => clearTimeout(t);
  }, [copied]);

  const maxCoverage = Math.max(...Object.values(m.coverage));

  return (
    <div data-theme="light" className="nb-aurora relative min-h-screen bg-abyss-950 text-ink-100">
      {/* ============ Command bar (glass control layer, light recipe) ============ */}
      <header className="nb-glass-strong sticky top-0 z-[800]">
        <div className="mx-auto flex max-w-[1080px] items-center gap-3 px-4 py-2.5">
          <a href="#" className="flex items-center gap-2.5">
            <svg width="30" height="30" viewBox="0 0 40 40" aria-hidden>
              <defs>
                <linearGradient id="nbmark26" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stopColor="#00897B" />
                  <stop offset="55%" stopColor="#00635A" />
                  <stop offset="100%" stopColor="#D64550" />
                </linearGradient>
              </defs>
              <rect x="1.5" y="1.5" width="37" height="37" rx="12" fill="#FFFFFF" stroke="url(#nbmark26)" strokeWidth="2" />
              <path d="M8 25.5c3.6-3.4 6.2 2.2 9.9 0 3.7-2.2 5.6 2.6 9.4 0" stroke="#00897B" strokeWidth="2" fill="none" strokeLinecap="round" />
              <path d="M20 8.5c-3.9 0-7 3-7 6.8 0 4.9 7 11.2 7 11.2s7-6.3 7-11.2c0-3.8-3.1-6.8-7-6.8Z" fill="none" stroke="url(#nbmark26)" strokeWidth="2.2" />
              <circle cx="20" cy="15.2" r="2.4" fill="#A87C00" />
            </svg>
            <span className="leading-none">
              <span className="display block text-lg font-extrabold tracking-tight text-ink-100">Now<span className="text-tide-650">Bey</span></span>
              <span className="mt-0.5 block text-2xs font-semibold uppercase tracking-[0.16em] text-ink-400">Stay safe, Bahamas</span>
            </span>
          </a>
          <button className="nb-focus ml-4 hidden min-w-[220px] flex-1 items-center gap-2.5 rounded-pill border hairline bg-abyss-900 px-3.5 py-2 text-left text-sm text-ink-300 transition hover:border-tide-500/40 md:flex md:max-w-[380px]">
            <Search size={15} />
            Search pins, places, people…
            <kbd className="ml-auto rounded-xs border hairline px-1.5 py-0.5 font-mono text-2xs text-ink-400">⌘K</kbd>
          </button>
          <div className="ml-auto flex items-center gap-2">
            <span className="hidden items-center gap-2 rounded-pill border hairline bg-abyss-900 px-3 py-1.5 text-xs font-bold text-ink-200 sm:flex">
              <span className="nb-live-dot" />
              LIVE · New Providence
            </span>
            <span className="grid h-9 w-9 place-items-center rounded-pill bg-tide-650 text-xs font-extrabold text-white">YOU</span>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[1080px] px-4 pb-16 pt-5">
        {/* ============ Identity header ============ */}
        <section className="nb-surface overflow-hidden">
          {/* cool aurora cover */}
          <div className="relative h-28" style={{ background: "linear-gradient(120deg, #E9F0F3 0%, #DCE7EC 45%, #EDF2F5 100%)" }}>
            <div className="absolute inset-0" style={{ background: "radial-gradient(30rem 9rem at 78% -20%, rgba(0,137,123,.14), transparent 62%), radial-gradient(22rem 8rem at 8% 130%, rgba(214,69,80,.08), transparent 60%)" }} />
            <div className="absolute -bottom-8 left-6 flex items-end gap-4">
              <div className="grid h-20 w-20 place-items-center rounded-2xl border-[3px] border-white bg-gradient-to-br from-tide-500 to-conch-500 text-2xl font-extrabold text-white shadow-l3">
                {m.initials}
              </div>
            </div>
            <div className="absolute bottom-3 right-4 flex gap-2">
              {self ? (
                <>
                  <button className="nb-focus min-h-[40px] rounded-pill bg-tide-650 px-4 text-xs font-extrabold text-white transition hover:bg-tide-600 active:scale-95">Edit profile</button>
                  <button
                    onClick={() => setCopied(true)}
                    className="nb-focus flex min-h-[40px] items-center gap-1.5 rounded-pill border hairline bg-abyss-900 px-4 text-xs font-bold text-ink-200 transition hover:bg-abyss-800"
                  >
                    {copied ? <Check size={13} className="text-ok-600" /> : <Link2 size={13} />}
                    {copied ? "Link copied" : "Share"}
                  </button>
                </>
              ) : (
                <button className="nb-focus min-h-[40px] rounded-pill bg-tide-650 px-4 text-xs font-extrabold text-white transition hover:bg-tide-600 active:scale-95">See on the map</button>
              )}
            </div>
          </div>

          <div className="px-6 pb-5 pt-11">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="display text-2xl font-extrabold tracking-tight text-ink-100">{m.name}</h1>
              {m.verified && (
                <span className="inline-flex items-center gap-1 rounded-pill bg-conch-500/12 px-2 py-1 text-2xs font-extrabold uppercase tracking-wide text-conch-600">
                  <ShieldCheck size={11} strokeWidth={3} /> Verified reporter
                </span>
              )}
              <span className="inline-flex items-center gap-1 rounded-pill bg-tide-500/12 px-2 py-1 text-2xs font-extrabold uppercase tracking-wide text-tide-650">
                <Crown size={11} strokeWidth={3} /> {m.tier}
              </span>
            </div>
            <p className="mt-1 font-mono text-sm text-tide-650">@{m.handle}</p>
            <p className="mt-3 max-w-[68ch] text-sm leading-relaxed text-ink-200">{m.bio}</p>
            <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs font-semibold text-ink-300">
              <span className="flex items-center gap-1.5"><MapPin size={12} className="text-tide-500" /> Home island · {m.island}</span>
              <span className="flex items-center gap-1.5"><Calendar size={12} className="text-tide-500" /> Member since {m.since}</span>
              <span className="flex items-center gap-1.5"><Radio size={12} className="text-tide-500" /> Alerts live on {m.islands} islands</span>
            </div>
          </div>
        </section>

        {/* ============ Bento impact rail ============ */}
        <section className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
          <StatTile label="Reports filed" value={String(m.stats.reports)} sub="all time, on the map" />
          <StatTile label="Confirmations received" value={String(m.stats.confirmations)} sub="neighbours said “me too”" accent />
          <StatTile label="Islands on alert" value={String(m.stats.islands)} sub="verified alert profiles" />
          <StatTile label="Weeks active" value={String(m.stats.weeks)} sub="reporting or confirming" />
        </section>

        {/* ============ Trust panel + coverage fingerprint ============ */}
        <section className="mt-4 grid gap-3 lg:grid-cols-2">
          <div className="nb-surface p-5">
            <h2 className="text-2xs font-bold uppercase tracking-[0.16em] text-ink-400">Trust</h2>
            <div className="mt-3 flex items-center gap-3 rounded-md border hairline bg-abyss-850 p-3.5">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-md bg-conch-500/14 text-conch-600"><ShieldCheck size={19} strokeWidth={2.6} /></span>
              <div className="min-w-0">
                <p className="text-sm font-extrabold text-ink-100">Verified reporter</p>
                <p className="text-xs leading-snug text-ink-200">“{m.verifiedReason}”</p>
                <p className="mt-0.5 font-mono text-2xs text-ink-400">granted by {m.verifiedBy}</p>
              </div>
            </div>
            <div className="mt-3">
              <div className="flex items-baseline justify-between">
                <p className="text-xs font-bold text-ink-200">Trust ratio</p>
                <p className="num font-mono text-sm font-extrabold text-tide-650">{m.ratio} <span className="text-2xs font-semibold text-ink-400">confirms / report</span></p>
              </div>
              <div className="mt-1.5 h-2 overflow-hidden rounded-pill bg-abyss-700">
                <div className="h-full rounded-pill bg-tide-500 shadow-glow-tide" style={{ width: `${Math.min((m.ratio / 10) * 100, 100)}%` }} />
              </div>
              <p className="mt-1.5 text-2xs leading-snug text-ink-300">Measures accuracy, not popularity — every report here was checked by neighbours.</p>
            </div>
          </div>

          <div className="nb-surface p-5">
            <h2 className="text-2xs font-bold uppercase tracking-[0.16em] text-ink-400">Coverage fingerprint</h2>
            <p className="mt-1 text-2xs text-ink-300">Where this member reports — their beat on the island.</p>
            <ul className="mt-3 space-y-2">
              {Object.entries(m.coverage).map(([k, n]) => (
                <li key={k} className="flex items-center gap-2.5">
                  <span className="flex w-24 shrink-0 items-center gap-1.5 text-xs font-bold text-ink-200">
                    <span className="h-2.5 w-2.5 rounded-full bg-cat-${k}-t" />
                    {CATS[k as CatKey].label}
                  </span>
                  <span className="h-2 flex-1 overflow-hidden rounded-pill bg-abyss-700">
                    <span className="block h-full rounded-pill" style={{ width: `${(n / maxCoverage) * 100}%`, background: `var(--color-cat-${k}-t)` }} />
                  </span>
                  <span className="num w-6 text-right font-mono text-xs text-ink-300">{n}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* ============ Tabs ============ */}
        <div className="mt-6 flex gap-1.5 border-b hairline pb-px" role="tablist">
          {([
            { k: "record", l: "Record" },
            { k: "reports", l: "Reports" },
            { k: "badges", l: "Badges" },
          ] as const).map((t) => (
            <button
              key={t.k}
              role="tab"
              aria-selected={tab === t.k}
              onClick={() => setTab(t.k)}
              className={`nb-focus -mb-px rounded-t-md border-b-2 px-4 py-2.5 text-sm font-extrabold transition ${
                tab === t.k ? "border-tide-650 text-tide-650" : "border-transparent text-ink-300 hover:text-ink-100"
              }`}
            >
              {t.l}
            </button>
          ))}
        </div>

        {/* ============ Record tab: timeline + neighbour graph ============ */}
        {tab === "record" && (
          <section className="mt-5 grid gap-4 lg:grid-cols-[minmax(0,1fr)_300px]">
            <div className="nb-surface p-5">
              <h2 className="text-2xs font-bold uppercase tracking-[0.16em] text-ink-400">Activity</h2>
              <ol className="relative mt-4 space-y-5 before:absolute before:bottom-2 before:left-[15px] before:top-2 before:w-px before:bg-abyss-600">
                {TIMELINE.map((e) => (
                  <li key={e.id} className="relative flex gap-3.5 pl-0">
                    <span className="relative z-10 mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-full border hairline bg-abyss-900">
                      {e.kind === "report" && <span className={`h-2.5 w-2.5 rounded-full bg-cat-${e.cat}-t`} />}
                      {e.kind === "confirm" && <CircleCheck size={13} className="text-ok-600" />}
                      {e.kind === "badge" && <ShieldCheck size={13} className="text-conch-600" />}
                    </span>
                    <div className="min-w-0 flex-1">
                      {e.kind === "report" && (
                        <>
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="text-sm font-extrabold text-ink-100">Filed a report</p>
                            <span className={`rounded-pill px-2 py-0.5 text-2xs font-bold ${e.status === "open" ? "bg-warn-500/14 text-warn-600" : "bg-ok-500/14 text-ok-600"}`}>
                              {e.status === "open" ? "open" : "resolved"}
                            </span>
                          </div>
                          <p className="mt-0.5 text-sm font-bold text-ink-200">{e.title}</p>
                          <div className="mt-1.5 flex items-center gap-3">
                            <SeverityMeter sev={e.sev} />
                            <span className="flex items-center gap-1 font-mono text-2xs text-ink-400"><Clock size={10} /> {ago(e.mins)} ago</span>
                            <span className="flex items-center gap-1 font-mono text-2xs text-ok-600"><CircleCheck size={10} /> {e.confirms} confirms</span>
                          </div>
                        </>
                      )}
                      {e.kind === "confirm" && (
                        <>
                          <p className="text-sm font-extrabold text-ink-100">Received {e.n} confirmations</p>
                          <p className="mt-0.5 text-xs text-ink-200">on “{e.title}”</p>
                          <span className="mt-1 flex items-center gap-1 font-mono text-2xs text-ink-400"><Clock size={10} /> {ago(e.mins)} ago</span>
                        </>
                      )}
                      {e.kind === "badge" && (
                        <>
                          <p className="text-sm font-extrabold text-ink-100">Earned “{e.badge}”</p>
                          <span className="mt-1 flex items-center gap-1 font-mono text-2xs text-ink-400"><Clock size={10} /> {ago(e.mins)} ago</span>
                        </>
                      )}
                    </div>
                  </li>
                ))}
              </ol>
            </div>

            <div className="space-y-3">
              <div className="nb-surface p-5">
                <h2 className="text-2xs font-bold uppercase tracking-[0.16em] text-ink-400">Neighbour graph</h2>
                <p className="num mt-2 font-mono text-2xl font-extrabold text-ink-100">{m.stats.confirmations}</p>
                <p className="text-2xs text-ink-300">confirmations from 89 neighbours</p>
                <div className="mt-3 flex -space-x-2">
                  {NEIGHBOURS.map((n) => (
                    <span key={n.name} title={n.name} className="grid h-9 w-9 place-items-center rounded-full border-2 border-abyss-900 bg-abyss-800 text-2xs font-extrabold text-tide-650">
                      {n.initials}
                    </span>
                  ))}
                  <span className="grid h-9 w-9 place-items-center rounded-full border-2 border-abyss-900 bg-abyss-700 font-mono text-2xs font-bold text-ink-200">+84</span>
                </div>
                <ul className="mt-3 space-y-1.5">
                  {NEIGHBOURS.slice(0, 3).map((n) => (
                    <li key={n.name} className="flex items-center justify-between text-xs">
                      <span className="font-bold text-ink-200">{n.name}</span>
                      <span className="num font-mono text-ink-400">{n.n} confirms</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="nb-surface flex items-start gap-2.5 p-4">
                <TriangleAlert size={15} className="mt-0.5 shrink-0 text-warn-600" />
                <p className="text-2xs leading-snug text-ink-200">
                  Anonymous reports are never listed by name — not even here. Counts still include them, so the record stays honest.
                </p>
              </div>
            </div>
          </section>
        )}

        {/* ============ Reports tab ============ */}
        {tab === "reports" && (
          <section className="mt-5 nb-surface p-5">
            <h2 className="text-2xs font-bold uppercase tracking-[0.16em] text-ink-400">Reports · {m.stats.reports}</h2>
            <div className="mt-4 space-y-2.5">
              {TIMELINE.filter((e): e is Extract<TimelineEntry, { kind: "report" }> => e.kind === "report").map((e) => {
                const c = CATS[e.cat];
                return (
                  <article key={e.id} className="flex items-center gap-3 rounded-md border hairline bg-abyss-850 p-3.5 transition hover:-translate-y-0.5 hover:shadow-l2">
                    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-sm text-abyss-950" style={{ background: `var(--color-cat-${e.cat})` }}>
                      <c.Icon size={17} strokeWidth={2.6} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-extrabold text-ink-100">{e.title}</p>
                      <p className="text-xs text-ink-300">{c.label} · {ago(e.mins)} ago</p>
                    </div>
                    <SeverityMeter sev={e.sev} />
                    <span className={`rounded-pill px-2.5 py-1 text-2xs font-bold ${e.status === "open" ? "bg-warn-500/14 text-warn-600" : "bg-ok-500/14 text-ok-600"}`}>
                      {e.status === "open" ? "open" : "resolved"}
                    </span>
                    <span className="num hidden font-mono text-xs font-bold text-ok-600 sm:block">✓ {e.confirms}</span>
                  </article>
                );
              })}
              <p className="pt-1 text-center text-2xs text-ink-400">Showing the 5 most recent · PROD: reportsFor(userId) with pagination</p>
            </div>
          </section>
        )}

        {/* ============ Badges tab: achievement shelf ============ */}
        {tab === "badges" && (
          <section className="mt-5 nb-surface p-5">
            <h2 className="text-2xs font-bold uppercase tracking-[0.16em] text-ink-400">Achievements</h2>
            <p className="mt-1 text-2xs text-ink-300">Earned by contributing — never bought.</p>
            <div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-3">
              {ACHIEVEMENTS.map((a) => (
                <div
                  key={a.name}
                  className={`rounded-md border p-4 transition ${
                    a.earned ? "border-tide-500/45 bg-tide-500/8 hover:-translate-y-0.5 hover:shadow-l2" : "border-dashed hairline bg-abyss-850 opacity-80"
                  }`}
                >
                  <span className={`grid h-10 w-10 place-items-center rounded-md ${a.earned ? "bg-tide-500/16 text-tide-650" : "bg-abyss-700 text-ink-400"}`}>
                    {a.earned ? <a.Icon size={18} strokeWidth={2.5} /> : <Lock size={16} />}
                  </span>
                  <p className="mt-2.5 text-sm font-extrabold text-ink-100">{a.name}</p>
                  <p className="mt-0.5 text-2xs leading-snug text-ink-300">{a.desc}</p>
                  {a.progress && <p className="num mt-1.5 font-mono text-2xs font-bold text-tide-650">{a.progress}</p>}
                </div>
              ))}
            </div>
          </section>
        )}
      </main>

      {copied && (
        <div className="nb-glass-strong fixed bottom-6 left-1/2 flex -translate-x-1/2 animate-rise items-center gap-2.5 rounded-pill px-4 py-2.5 text-sm font-bold text-ink-100">
          <Check size={16} className="text-ok-600" />
          Profile link copied
        </div>
      )}
    </div>
  );
}
