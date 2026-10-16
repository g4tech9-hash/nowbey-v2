/* ============================================================================
 * Alerts_2026_Web_Preview.tsx — PREVIEW ONLY. Not imported by any route.
 * ----------------------------------------------------------------------------
 * The 2026 "Tideglass" Alerts inbox. Drop-in candidate for src/app/alerts/
 * page.tsx AFTER approval. Honesty rules preserved from the live app: push is
 * only claimed when configured, unverified profiles say so plainly, and storm
 * warnings are always sent (never gated behind a plan).
 * ========================================================================== */
"use client";

import { useState } from "react";
import {
  Bell,
  BellRing,
  Mail,
  ShieldCheck,
  TriangleAlert,
  RefreshCw,
  Trash2,
  Sun,
  Moon,
  Search,
  Check,
  Waves,
  Wind,
  Zap,
  Droplets,
  ShieldAlert,
  Flame,
  HeartPulse,
  Star,
  Info,
  Anchor,
  Construction,
  Car,
  type LucideIcon,
} from "lucide-react";

type CatKey = "flood" | "storm" | "power" | "water" | "crime" | "road" | "marine" | "fire" | "health" | "trash" | "event" | "notice" | "accident";

const CATS: Record<CatKey, { label: string; color: string; Icon: LucideIcon }> = {
  flood: { label: "Flooding", color: "var(--color-cat-flood)", Icon: Waves },
  storm: { label: "Storm", color: "var(--color-cat-storm)", Icon: Wind },
  power: { label: "Power", color: "var(--color-cat-power)", Icon: Zap },
  water: { label: "Water", color: "var(--color-cat-water)", Icon: Droplets },
  crime: { label: "Safety", color: "var(--color-cat-crime)", Icon: ShieldAlert },
  road: { label: "Road", color: "var(--color-cat-road)", Icon: Construction },
  marine: { label: "Marine", color: "var(--color-cat-marine)", Icon: Anchor },
  fire: { label: "Fire", color: "var(--color-cat-fire)", Icon: Flame },
  health: { label: "Health", color: "var(--color-cat-health)", Icon: HeartPulse },
  trash: { label: "Sanitation", color: "var(--color-cat-trash)", Icon: Trash2 },
  event: { label: "Community", color: "var(--color-cat-event)", Icon: Star },
  notice: { label: "Notice", color: "var(--color-cat-notice)", Icon: Info },
  accident: { label: "Car Accident", color: "var(--color-cat-accident)", Icon: Car },
};

const PARISHES = ["New Providence", "Grand Bahama", "Abaco", "Eleuthera", "Exuma"];

type Profile = { id: string; email: string; cats: CatKey[]; parishes: string[]; verified: boolean };

/* PROD: alertSubscriptions rows for the viewer */
const PROFILES: Profile[] = [
  { id: "a1", email: "s•••@gmail.com", cats: ["flood", "storm", "power"], parishes: ["New Providence"], verified: true },
  { id: "a2", email: "sasha.work@•••.bs", cats: ["road", "accident"], parishes: ["New Providence"], verified: false },
];

export default function Alerts2026WebPreview() {
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  const [email, setEmail] = useState("");
  const [picked, setPicked] = useState<CatKey[]>(["flood", "storm"]);
  const [island, setIsland] = useState("New Providence");
  const [saved, setSaved] = useState(false);

  const toggle = (k: CatKey) => setPicked((p) => (p.includes(k) ? p.filter((x) => x !== k) : [...p, k]));

  return (
    <div data-theme={theme} className="nb-aurora relative min-h-screen overflow-hidden bg-abyss-950 text-ink-100">
      {/* command bar */}
      <header className="nb-glass-strong sticky top-0 z-[800]">
        <div className="mx-auto flex max-w-[1080px] items-center gap-3 px-4 py-2.5">
          <a href="#" className="flex items-center gap-2.5">
            <svg width="30" height="30" viewBox="0 0 40 40" aria-hidden>
              <defs>
                <linearGradient id="nbalert" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stopColor="var(--color-tide-400)" />
                  <stop offset="55%" stopColor="var(--color-tide-500)" />
                  <stop offset="100%" stopColor="var(--color-conch-500)" />
                </linearGradient>
              </defs>
              <rect x="1.5" y="1.5" width="37" height="37" rx="12" fill="var(--color-abyss-800)" stroke="url(#nbalert)" strokeWidth="2" />
              <path d="M8 25.5c3.6-3.4 6.2 2.2 9.9 0 3.7-2.2 5.6 2.6 9.4 0" stroke="var(--color-tide-400)" strokeWidth="2" fill="none" strokeLinecap="round" />
              <path d="M20 8.5c-3.9 0-7 3-7 6.8 0 4.9 7 11.2 7 11.2s7-6.3 7-11.2c0-3.8-3.1-6.8-7-6.8Z" fill="none" stroke="url(#nbalert)" strokeWidth="2.2" />
              <circle cx="20" cy="15.2" r="2.4" fill="var(--color-sun-500)" />
            </svg>
            <span className="leading-none">
              <span className="display block text-lg font-extrabold tracking-tight text-ink-100">Now<span className="text-tide-400">Bey</span></span>
              <span className="mt-0.5 block text-2xs font-semibold uppercase tracking-[0.16em] text-ink-400">Stay safe, Bahamas</span>
            </span>
          </a>
          <button className="nb-focus ml-4 hidden min-w-[220px] flex-1 items-center gap-2.5 rounded-pill border hairline bg-abyss-950/60 px-3.5 py-2 text-left text-sm text-ink-400 md:flex md:max-w-[380px]">
            <Search size={15} />
            Search pins, places, actions…
            <kbd className="ml-auto rounded-xs border hairline px-1.5 py-0.5 font-mono text-2xs">⌘K</kbd>
          </button>
          <div className="ml-auto flex items-center gap-2">
            <button onClick={() => setTheme(theme === "dark" ? "light" : "dark")} className="nb-focus rounded-pill border hairline bg-abyss-950/60 p-2 text-ink-300 hover:text-tide-300" aria-label="Toggle theme">
              {theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
            </button>
            <span className="grid h-9 w-9 place-items-center rounded-pill border hairline bg-gradient-to-br from-tide-500 to-conch-500 text-xs font-extrabold text-abyss-950">SB</span>
          </div>
        </div>
      </header>

      <main className="mx-auto grid max-w-[1080px] grid-cols-1 items-start gap-4 p-4 lg:grid-cols-[minmax(0,1fr)_320px]">
        <section className="min-w-0 space-y-4">
          <div>
            <p className="text-2xs font-bold uppercase tracking-[0.16em] text-tide-300">Alerts</p>
            <h1 className="display text-[clamp(1.4rem,3vw,1.9rem)] font-extrabold leading-tight text-ink-100">Only the ones that affect your shore</h1>
            <p className="mt-1.5 max-w-[64ch] text-sm leading-relaxed text-ink-300">
              Nassau first: alerts cover New Providence at launch. When a neighbour files a matching report, we email you a link straight to it.
            </p>
          </div>

          {/* storm promise — always sent, never gated */}
          <div className="nb-surface flex items-start gap-3 p-4" style={{ borderColor: "color-mix(in srgb, var(--color-sun-500) 40%, transparent)" }}>
            <TriangleAlert size={18} className="mt-0.5 shrink-0 text-sun-500" />
            <div>
              <p className="text-sm font-extrabold text-ink-100">Storm warnings are always sent</p>
              <p className="mt-0.5 text-xs leading-relaxed text-ink-300">Official storm warnings reach every confirmed address on the island — free plan included, no exceptions.</p>
            </div>
          </div>

          {/* the form */}
          <div className="nb-surface p-5">
            <h2 className="display text-base font-extrabold text-ink-100">Start a free alert profile</h2>
            <p className="mt-1 text-xs text-ink-300">Two fields decide everything — your email and the kinds of report you care about.</p>

            <label className="mt-4 block">
              <span className="mb-1.5 block text-2xs font-bold uppercase tracking-[0.14em] text-ink-400">Email address</span>
              <div className="flex items-center gap-2.5 rounded-md border hairline bg-abyss-950/70 px-3 transition focus-within:border-tide-400/60">
                <Mail size={15} className="text-ink-400" />
                <input
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  type="email"
                  placeholder="you@example.com"
                  className="w-full bg-transparent py-2.5 text-sm text-ink-100 outline-none placeholder:text-ink-400"
                />
              </div>
            </label>

            <div className="mt-4">
              <span className="mb-1.5 block text-2xs font-bold uppercase tracking-[0.14em] text-ink-400">What should reach you?</span>
              <div className="flex flex-wrap gap-1.5">
                {(Object.keys(CATS) as CatKey[]).map((k) => {
                  const Icon = CATS[k].Icon;
                  return (
                    <button
                      key={k}
                      onClick={() => toggle(k)}
                      className={`nb-focus flex items-center gap-1.5 rounded-pill px-3 py-1.5 text-xs font-bold transition ${
                        picked.includes(k) ? "bg-tide-500 text-abyss-950" : "border hairline text-ink-300 hover:bg-white/8"
                      }`}
                    >
                      <Icon size={12} />
                      {CATS[k].label}
                    </button>
                  );
                })}
              </div>
            </div>

            <label className="mt-4 block">
              <span className="mb-1.5 block text-2xs font-bold uppercase tracking-[0.14em] text-ink-400">Island</span>
              <select
                value={island}
                onChange={(e) => setIsland(e.target.value)}
                className="nb-focus w-full max-w-[280px] rounded-md border hairline bg-abyss-950/70 px-3 py-2.5 text-sm text-ink-100 outline-none"
              >
                {PARISHES.map((p) => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </label>

            <button
              onClick={() => setSaved(true)}
              className="nb-focus mt-5 flex min-h-[44px] items-center gap-2 rounded-pill bg-tide-500 px-5 text-sm font-extrabold text-abyss-950 shadow-glow-tide transition hover:bg-tide-400 active:scale-95"
            >
              <BellRing size={15} />
              Send my confirmation email
            </button>
            {saved && (
              <p className="mt-2.5 flex items-center gap-1.5 text-xs font-bold text-ok-500">
                <Check size={13} /> Sent — check {email || "your inbox"} for the confirmation link.
              </p>
            )}
          </div>

          {/* profiles */}
          <div>
            <h2 className="display text-base font-extrabold text-ink-100">Your alert profiles</h2>
            <ul className="mt-2.5 space-y-2.5">
              {PROFILES.map((p) => (
                <li key={p.id} className="nb-surface flex flex-wrap items-center gap-x-3 gap-y-2 p-3.5">
                  <span className={`rounded-pill px-2.5 py-1 text-2xs font-extrabold uppercase tracking-wide ${p.verified ? "bg-ok-500/18 text-ok-500" : "bg-sun-500/15 text-sun-500"}`}>
                    {p.verified ? "On" : "Waiting for confirmation"}
                  </span>
                  <span className="font-mono text-xs text-ink-200">{p.email}</span>
                  <span className="flex flex-wrap gap-1">
                    {p.cats.map((c) => (
                      <span key={c} className="rounded-pill bg-white/8 px-2 py-0.5 text-2xs font-bold text-ink-200">{CATS[c].label}</span>
                    ))}
                  </span>
                  <span className="text-2xs text-ink-400">{p.parishes.join(", ")}</span>
                  <div className="ml-auto flex items-center gap-1.5">
                    {!p.verified && (
                      <button className="nb-focus flex items-center gap-1 rounded-pill border hairline px-2.5 py-1.5 text-2xs font-bold text-ink-200 hover:bg-white/8">
                        <RefreshCw size={11} /> Resend
                      </button>
                    )}
                    <button className="nb-focus rounded-pill border hairline p-1.5 text-ink-400 hover:bg-danger-500/15 hover:text-danger-500" aria-label="Stop alerts">
                      <Trash2 size={12} />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          </div>

          {/* honest push state */}
          <div className="nb-surface p-4">
            <div className="flex items-center gap-2">
              <Bell size={15} className="text-ink-300" />
              <h2 className="text-sm font-extrabold text-ink-100">Push alerts on this device</h2>
              <span className="ml-auto rounded-pill bg-white/8 px-2 py-0.5 text-2xs font-bold text-ink-400">Not switched on</span>
            </div>
            <p className="mt-1.5 text-xs leading-relaxed text-ink-300">
              Not switched on for this site yet — and we will not pretend otherwise. Email is the channel that works today; the Android app has a push
              switch of its own once it is installed.
            </p>
          </div>
        </section>

        {/* sidebar */}
        <aside className="flex flex-col gap-3 lg:sticky lg:top-[76px]">
          <div className="nb-surface p-4">
            <h2 className="mb-2.5 text-2xs font-bold uppercase tracking-[0.16em] text-ink-400">How alerts work</h2>
            <ol className="space-y-3">
              {[
                { t: "Pick your categories", d: "Flooding, power, safety — whatever affects your commute." },
                { t: "Confirm by email", d: "One click. No password to remember." },
                { t: "Get the link, not the noise", d: "A matching report emails you a link straight to the pin." },
              ].map((step, i) => (
                <li key={step.t} className="flex gap-3">
                  <span className="grid h-7 w-7 shrink-0 place-items-center rounded-pill bg-tide-500/18 font-mono text-xs font-extrabold text-tide-300">{i + 1}</span>
                  <div>
                    <p className="text-xs font-extrabold text-ink-100">{step.t}</p>
                    <p className="text-2xs leading-snug text-ink-300">{step.d}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
          <div className="nb-surface p-4">
            <h2 className="mb-2 text-2xs font-bold uppercase tracking-[0.16em] text-ink-400">Your plan</h2>
            <p className="display text-lg font-extrabold text-ink-100">Free</p>
            <p className="mt-1 text-2xs leading-snug text-ink-300">One profile per address, one island, storm warnings always sent. Paid plans add islands and instant channels.</p>
            <button className="nb-focus mt-3 w-full rounded-pill border hairline py-2 text-xs font-bold text-ink-200 transition hover:bg-white/8">See plans</button>
          </div>
          <div className="nb-surface flex items-start gap-2.5 p-4">
            <ShieldCheck size={15} className="mt-0.5 shrink-0 text-tide-300" />
            <p className="text-2xs leading-snug text-ink-300">We store your email to send alerts and nothing else. Unsubscribe links are in every message.</p>
          </div>
        </aside>
      </main>
    </div>
  );
}
