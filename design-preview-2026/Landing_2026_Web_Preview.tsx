/* ============================================================================
 * Landing_2026_Web_Preview.tsx — PREVIEW ONLY. Not imported by any route.
 * ----------------------------------------------------------------------------
 * The 2026 "Tideglass" landing experience for NowBey — the public face.
 * Drop-in candidate for src/app/page.tsx (marketing sections) AFTER approval.
 *
 * Structure: immersive hero with live island pulse → bento capability grid →
 * trust/how-it-works → honest capability ledger → CTA. Responsive by design:
 * the bento grid re-stacks 3→2→1 and the hero map swaps for a stacked phone
 * mock at small widths.
 * ========================================================================== */
"use client";

import { useState } from "react";
import {
  MapPin,
  Radio,
  Bell,
  ShieldCheck,
  Users,
  TriangleAlert,
  ArrowUpRight,
  Play,
  Sun,
  Moon,
  Activity,
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
  type LucideIcon,
} from "lucide-react";

const CATS: { key: string; label: string; color: string; Icon: LucideIcon }[] = [
  { key: "flood", label: "Flooding", color: "var(--color-cat-flood)", Icon: Waves },
  { key: "storm", label: "Storm", color: "var(--color-cat-storm)", Icon: Wind },
  { key: "power", label: "Power", color: "var(--color-cat-power)", Icon: Zap },
  { key: "water", label: "Water", color: "var(--color-cat-water)", Icon: Droplets },
  { key: "crime", label: "Safety", color: "var(--color-cat-crime)", Icon: ShieldAlert },
  { key: "road", label: "Road", color: "var(--color-cat-road)", Icon: Construction },
  { key: "marine", label: "Marine", color: "var(--color-cat-marine)", Icon: Anchor },
  { key: "fire", label: "Fire", color: "var(--color-cat-fire)", Icon: Flame },
  { key: "health", label: "Health", color: "var(--color-cat-health)", Icon: HeartPulse },
  { key: "trash", label: "Sanitation", color: "var(--color-cat-trash)", Icon: Trash2 },
  { key: "event", label: "Community", color: "var(--color-cat-event)", Icon: Star },
  { key: "notice", label: "Notice", color: "var(--color-cat-notice)", Icon: Info },
  { key: "accident", label: "Car Accident", color: "var(--color-cat-accident)", Icon: Car },
];

const PULSE = [
  { label: "Flooding", n: 38, color: "var(--color-cat-flood)" },
  { label: "Power", n: 24, color: "var(--color-cat-power)" },
  { label: "Road", n: 19, color: "var(--color-cat-road)" },
  { label: "Safety", n: 12, color: "var(--color-cat-crime)" },
];

export default function Landing2026WebPreview() {
  const [theme, setTheme] = useState<"dark" | "light">("dark");

  return (
    <div data-theme={theme} className="nb-aurora relative min-h-screen overflow-hidden bg-abyss-950 text-ink-100">
      {/* ==================== Nav ==================== */}
      <header className="nb-glass-strong sticky top-0 z-[800]">
        <div className="mx-auto flex max-w-[1200px] items-center gap-3 px-4 py-3">
          <a href="#" className="flex items-center gap-2.5">
            <svg width="34" height="34" viewBox="0 0 40 40" aria-hidden>
              <defs>
                <linearGradient id="nbl" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stopColor="var(--color-tide-400)" />
                  <stop offset="55%" stopColor="var(--color-tide-500)" />
                  <stop offset="100%" stopColor="var(--color-conch-500)" />
                </linearGradient>
              </defs>
              <rect x="1.5" y="1.5" width="37" height="37" rx="12" fill="var(--color-abyss-800)" stroke="url(#nbl)" strokeWidth="2" />
              <path d="M8 25.5c3.6-3.4 6.2 2.2 9.9 0 3.7-2.2 5.6 2.6 9.4 0" stroke="var(--color-tide-400)" strokeWidth="2" fill="none" strokeLinecap="round" />
              <path d="M20 8.5c-3.9 0-7 3-7 6.8 0 4.9 7 11.2 7 11.2s7-6.3 7-11.2c0-3.8-3.1-6.8-7-6.8Z" fill="none" stroke="url(#nbl)" strokeWidth="2.2" />
              <circle cx="20" cy="15.2" r="2.4" fill="var(--color-sun-500)" />
            </svg>
            <span className="display text-xl font-extrabold tracking-tight">Now<span className="text-tide-400">Bey</span></span>
          </a>
          <nav className="ml-6 hidden items-center gap-1 md:flex">
            {["The map", "The wire", "Alerts", "Island Life"].map((l) => (
              <a key={l} href="#" className="rounded-pill px-3 py-2 text-sm font-bold text-ink-300 transition hover:bg-white/8 hover:text-ink-100">{l}</a>
            ))}
          </nav>
          <div className="ml-auto flex items-center gap-2">
            <button onClick={() => setTheme(theme === "dark" ? "light" : "dark")} className="nb-focus rounded-pill border hairline bg-abyss-950/60 p-2 text-ink-300 hover:text-tide-300" aria-label="Toggle theme">
              {theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
            </button>
            <a href="#" className="nb-focus hidden rounded-pill border hairline px-4 py-2 text-xs font-bold text-ink-100 transition hover:bg-white/8 sm:block">Sign in</a>
            <a href="#" className="nb-focus rounded-pill bg-tide-500 px-4 py-2 text-xs font-extrabold text-abyss-950 shadow-glow-tide transition hover:bg-tide-400">Open the map</a>
          </div>
        </div>
      </header>

      {/* ==================== Hero ==================== */}
      <section className="mx-auto grid max-w-[1200px] items-center gap-8 px-4 pb-8 pt-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:pt-16">
        <div>
          <span className="inline-flex items-center gap-2 rounded-pill border hairline bg-abyss-950/60 px-3 py-1.5 text-2xs font-bold uppercase tracking-[0.14em] text-ink-200">
            <span className="nb-live-dot" /> Live in Nassau · New Providence
          </span>
          <h1 className="display mt-4 text-[clamp(2.4rem,1.4rem+4vw,4rem)] font-extrabold leading-[1.02] tracking-tight">
            Know what is happening,{" "}
            <span style={{ background: "linear-gradient(100deg, var(--color-tide-400), var(--color-conch-500))", WebkitBackgroundClip: "text", backgroundClip: "text", color: "transparent" }}>
              street by street.
            </span>
          </h1>
          <p className="mt-5 max-w-[56ch] text-lg leading-relaxed text-ink-300">
            NowBey turns neighbour reports and official wires into one living map of the islands — pinned, confirmed and current.
            Flooding, power, safety: see it, report it, confirm it.
          </p>
          <div className="mt-7 flex flex-wrap items-center gap-3">
            <a href="#" className="nb-focus flex min-h-[48px] items-center gap-2 rounded-pill bg-tide-500 px-6 text-sm font-extrabold text-abyss-950 shadow-glow-tide transition hover:bg-tide-400 active:scale-95">
              <MapPin size={16} /> Open the safety map
            </a>
            <a href="#" className="nb-focus flex min-h-[48px] items-center gap-2 rounded-pill border hairline px-5 text-sm font-bold text-ink-100 transition hover:bg-white/8">
              <Play size={14} /> How confirmation works
            </a>
          </div>
          <div className="mt-7 flex flex-wrap items-center gap-x-6 gap-y-2 text-xs font-bold text-ink-300">
            <span className="flex items-center gap-1.5"><ShieldCheck size={13} className="text-tide-300" /> Storm warnings always sent</span>
            <span className="flex items-center gap-1.5"><Users size={13} className="text-tide-300" /> 12,400 neighbours</span>
            <span className="flex items-center gap-1.5"><Bell size={13} className="text-tide-300" /> Free email alerts</span>
          </div>
        </div>

        {/* hero map mock */}
        <div className="relative">
          <div className="nb-surface overflow-hidden rounded-xl2 p-0">
            <div className="relative h-[340px] bg-abyss-975 lg:h-[400px]">
              <div className="absolute inset-0" style={{ background: "radial-gradient(75% 65% at 55% 40%, var(--color-abyss-800), var(--color-abyss-975))" }} />
              <div className="absolute inset-0 opacity-90" style={{ background: "radial-gradient(38% 44% at 86% 76%, color-mix(in srgb, var(--color-cat-water) 24%, transparent), transparent 70%), radial-gradient(26% 30% at 6% 10%, color-mix(in srgb, var(--color-cat-marine) 16%, transparent), transparent 70%)" }} />
              <svg className="absolute inset-0 h-full w-full opacity-[0.35]" aria-hidden>
                {[18, 36, 54, 72, 90].map((y) => <line key={y} x1="0" y1={`${y}%`} x2="100%" y2={`${y}%`} stroke="var(--color-abyss-600)" strokeWidth="1" />)}
                {[12, 30, 48, 66, 84].map((x) => <line key={x} x1={`${x}%`} y1="0" x2={`${x}%`} y2="100%" stroke="var(--color-abyss-600)" strokeWidth="1" />)}
                <path d="M0 86 C 30 78, 48 58, 72 52 S 94 40, 100 30" stroke="var(--color-abyss-600)" strokeWidth="3" fill="none" />
              </svg>
              {[
                { x: 24, y: 40, c: "var(--color-cat-flood)", sev: 4 },
                { x: 56, y: 26, c: "var(--color-cat-power)", sev: 5 },
                { x: 72, y: 56, c: "var(--color-cat-road)", sev: 3 },
                { x: 44, y: 68, c: "var(--color-cat-water)", sev: 3 },
                { x: 84, y: 36, c: "var(--color-cat-crime)", sev: 2 },
              ].map((p, i) => (
                <span key={i} className="absolute -translate-x-1/2 -translate-y-full" style={{ left: `${p.x}%`, top: `${p.y}%` }}>
                  {p.sev >= 4 && <span className="absolute left-1/2 top-1/2 -z-10 h-9 w-9 -translate-x-1/2 -translate-y-1/2 animate-pulse-ring rounded-full" style={{ background: "rgba(244,63,94,0.35)" }} />}
                  <span className="grid h-8 w-8 place-items-center rounded-full border-2 border-white/60 text-abyss-950" style={{ background: p.c, boxShadow: `0 4px 14px ${p.c}77` }}>
                    <MapPin size={12} strokeWidth={3} />
                  </span>
                </span>
              ))}
              <span className="absolute left-[36%] top-[48%] grid h-11 w-11 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border-2 border-tide-300/70 bg-abyss-950/80 font-mono text-sm font-extrabold text-tide-200 shadow-glow-tide">12</span>
              <div className="nb-glass absolute inset-x-3 bottom-3 flex items-center gap-2.5 rounded-lg px-3 py-2">
                <TriangleAlert size={15} className="shrink-0 text-sun-500" />
                <p className="text-2xs font-bold text-ink-100">Coastal flood watch · NEMA · until 8pm</p>
                <span className="nb-live-dot ml-auto" />
              </div>
            </div>
          </div>
          {/* pulse card floating over the map */}
          <div className="nb-glass-strong absolute -bottom-6 left-6 hidden w-56 animate-rise rounded-lg p-3.5 lg:block">
            <p className="mb-2 flex items-center gap-1.5 text-2xs font-bold uppercase tracking-[0.14em] text-ink-400"><Activity /> Island pulse</p>
            {PULSE.map((p) => (
              <div key={p.label} className="mb-1.5 flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full" style={{ background: p.color }} />
                <span className="w-14 text-2xs font-bold text-ink-200">{p.label}</span>
                <span className="h-1 flex-1 rounded-pill bg-white/10">
                  <span className="block h-full rounded-pill" style={{ width: `${(p.n / 38) * 100}%`, background: p.color }} />
                </span>
                <span className="num font-mono text-2xs text-ink-300">{p.n}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ==================== Category rail ==================== */}
      <section className="mx-auto max-w-[1200px] px-4 py-10">
        <p className="mb-3 text-center text-2xs font-bold uppercase tracking-[0.18em] text-ink-400">Thirteen kinds of now</p>
        <div className="nb-no-scrollbar flex justify-start gap-2 overflow-x-auto pb-2 lg:flex-wrap lg:justify-center lg:overflow-visible">
          {CATS.map((c) => (
            <span key={c.key} className="flex shrink-0 items-center gap-2 rounded-pill border hairline bg-abyss-900/70 px-3.5 py-2 text-xs font-bold text-ink-200">
              <span className="grid h-6 w-6 place-items-center rounded-full text-abyss-950" style={{ background: c.color }}>
                <c.Icon size={11} strokeWidth={2.8} />
              </span>
              {c.label}
            </span>
          ))}
        </div>
      </section>

      {/* ==================== Bento capability grid ==================== */}
      <section className="mx-auto max-w-[1200px] px-4 pb-10">
        <div className="grid gap-3 lg:grid-cols-3">
          <article className="nb-surface hoverlift col-span-1 p-6 lg:row-span-2">
            <span className="grid h-11 w-11 place-items-center rounded-md bg-tide-500/16 text-tide-300"><MapPin size={20} /></span>
            <h3 className="display mt-4 text-xl font-extrabold text-ink-100">A map that answers “what is happening near me?”</h3>
            <p className="mt-2.5 text-sm leading-relaxed text-ink-300">
              Every pin is a neighbour’s report, placed to ±8 metres and confirmed by other neighbours. Severity is colour, glow and a five-step
              meter — readable at a glance, honest about uncertainty.
            </p>
            <div className="mt-4 space-y-2">
              {PULSE.slice(0, 3).map((p) => (
                <div key={p.label} className="flex items-center gap-2.5">
                  <span className="h-2 w-2 rounded-full" style={{ background: p.color }} />
                  <span className="w-16 text-xs font-bold text-ink-200">{p.label}</span>
                  <span className="h-1.5 flex-1 rounded-pill bg-white/8">
                    <span className="block h-full rounded-pill" style={{ width: `${(p.n / 38) * 100}%`, background: p.color, boxShadow: `0 0 8px ${p.color}88` }} />
                  </span>
                  <span className="num font-mono text-xs text-ink-300">{p.n}</span>
                </div>
              ))}
            </div>
          </article>

          <article className="nb-surface hoverlift p-6">
            <span className="grid h-11 w-11 place-items-center rounded-md bg-conch-500/14 text-conch-500"><Radio size={20} /></span>
            <h3 className="display mt-4 text-lg font-extrabold text-ink-100">The wire, placed</h3>
            <p className="mt-2 text-sm leading-relaxed text-ink-300">Bahamian headlines sorted into NowBey categories and pinned when a street or island is named. Stories we cannot place stay unpinned — we never guess.</p>
          </article>

          <article className="nb-surface hoverlift p-6">
            <span className="grid h-11 w-11 place-items-center rounded-md bg-sun-500/14 text-sun-500"><Bell size={20} /></span>
            <h3 className="display mt-4 text-lg font-extrabold text-ink-100">Alerts that respect your shore</h3>
            <p className="mt-2 text-sm leading-relaxed text-ink-300">Pick categories, confirm by email, get a link straight to the pin. Storm warnings always reach every confirmed address — free plan included.</p>
          </article>

          <article className="nb-surface hoverlift p-6">
            <span className="grid h-11 w-11 place-items-center rounded-md bg-ok-500/14 text-ok-500"><Users size={20} /></span>
            <h3 className="display mt-4 text-lg font-extrabold text-ink-100">Confirmation is the engine</h3>
            <p className="mt-2 text-sm leading-relaxed text-ink-300">A pin is only as good as the neighbours who stand behind it. Your Island Record shows the reports, confirmations and badges you earned.</p>
          </article>

          <article className="nb-surface hoverlift p-6" style={{ borderColor: "color-mix(in srgb, var(--color-tide-400) 35%, transparent)", background: "linear-gradient(140deg, color-mix(in srgb, var(--color-tide-500) 10%, transparent), transparent 60%), var(--color-abyss-900)" }}>
            <span className="grid h-11 w-11 place-items-center rounded-md bg-tide-500/16 text-tide-300"><ShieldCheck size={20} /></span>
            <h3 className="display mt-4 text-lg font-extrabold text-ink-100">Built for the storm, not the demo</h3>
            <p className="mt-2 text-sm leading-relaxed text-ink-300">Free email alerts today, push on the way — and we only ever claim what a real device has actually received.</p>
          </article>
        </div>
      </section>

      {/* ==================== How it works ==================== */}
      <section className="mx-auto max-w-[1200px] px-4 pb-10">
        <h2 className="display text-center text-2xl font-extrabold text-ink-100">Three taps to a safer commute</h2>
        <div className="mt-6 grid gap-3 md:grid-cols-3">
          {[
            { n: "1", t: "See", d: "Open the map. Pins near you, newest first, severity at a glance." },
            { n: "2", t: "Report", d: "Pin the exact spot in two steps. Anonymous if you need it to be." },
            { n: "3", t: "Confirm", d: "One tap on a pin you can vouch for. That is how truth floats up." },
          ].map((s2) => (
            <div key={s2.n} className="nb-surface p-6 text-center">
              <span className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-tide-500/16 font-mono text-lg font-extrabold text-tide-300">{s2.n}</span>
              <h3 className="display mt-3.5 text-lg font-extrabold text-ink-100">{s2.t}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-ink-300">{s2.d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ==================== CTA ==================== */}
      <section className="mx-auto max-w-[1200px] px-4 pb-14">
        <div className="nb-glass-strong relative overflow-hidden rounded-2xl2 px-6 py-12 text-center">
          <div className="pointer-events-none absolute inset-0" style={{ background: "radial-gradient(30rem 14rem at 50% -20%, color-mix(in srgb, var(--color-tide-500) 18%, transparent), transparent 70%)" }} />
          <h2 className="display relative text-[clamp(1.6rem,1.2rem+1.8vw,2.4rem)] font-extrabold text-ink-100">Your island is talking. Listen in.</h2>
          <p className="relative mx-auto mt-3 max-w-[52ch] text-sm leading-relaxed text-ink-300">Free forever for neighbours who report and confirm. Open the map, set your alerts, and know before you go.</p>
          <div className="relative mt-6 flex flex-wrap justify-center gap-3">
            <a href="#" className="nb-focus flex min-h-[48px] items-center gap-2 rounded-pill bg-tide-500 px-6 text-sm font-extrabold text-abyss-950 shadow-glow-tide transition hover:bg-tide-400">Open the map</a>
            <a href="#" className="nb-focus flex min-h-[48px] items-center gap-2 rounded-pill border hairline px-5 text-sm font-bold text-ink-100 transition hover:bg-white/8">Get the Android app <ArrowUpRight size={14} /></a>
          </div>
        </div>
      </section>

      {/* ==================== Footer ==================== */}
      <footer className="border-t hairline">
        <div className="mx-auto flex max-w-[1200px] flex-wrap items-center gap-x-6 gap-y-2 px-4 py-6 text-xs font-semibold text-ink-400">
          <span className="display text-sm font-extrabold text-ink-200">NowBey</span>
          <span>Stay safe, Bahamas.</span>
          <a href="#" className="hover:text-ink-200">Privacy</a>
          <a href="#" className="hover:text-ink-200">Terms</a>
          <a href="#" className="hover:text-ink-200">Support</a>
          <span className="ml-auto font-mono">2026 preview · mock data</span>
        </div>
      </footer>
    </div>
  );
}
