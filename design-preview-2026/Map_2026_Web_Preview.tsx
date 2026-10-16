/* ============================================================================
 * Map_2026_Web_Preview.tsx — PREVIEW ONLY. Not imported by any route.
 * ----------------------------------------------------------------------------
 * The 2026 "Tideglass" redesign of NowBey's critical screen: the Safety Map
 * workspace. Drop-in candidate for src/app/map/page.tsx AFTER approval.
 *
 * Requires (both delivered alongside this file in design-preview-2026/):
 *   - nowbey-2026-tokens.css   → the Tailwind 4 @theme token set + materials
 *   - Sora / Manrope / IBM Plex Mono via next/font (same pattern as today)
 *
 * Everything here runs on mock data and local state — no API calls — so it can
 * be reviewed in isolation. Production wiring (MapPanel, /api/incidents,
 * /api/news, report submit) is marked with "PROD:" comments.
 * ========================================================================== */
"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Search,
  MapPin,
  Plus,
  Radio,
  ShieldCheck,
  Clock,
  ChevronRight,
  CornerDownLeft,
  X,
  Sun,
  Moon,
  Layers,
  LocateFixed,
  PersonStanding,
  Bell,
  TriangleAlert,
  CircleCheck,
  MessageSquare,
  ArrowUpRight,
  Activity,
  Wind,
  Droplets,
  Zap,
  Flame,
  Car,
  Trash2,
  Star,
  Info,
  Anchor,
  ShieldAlert,
  Construction,
  HeartPulse,
  Waves,
  type LucideIcon,
} from "lucide-react";

/* -------------------------------------------------------------------------- */
/* Taxonomy — mirrors src/lib/geo.ts (product-critical, preserved)            */
/* -------------------------------------------------------------------------- */
type CatKey =
  | "flood" | "storm" | "power" | "water" | "crime" | "road" | "marine"
  | "fire" | "health" | "trash" | "event" | "notice" | "accident";

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

const SEV_COLORS = ["var(--color-sev-1)", "var(--color-sev-2)", "var(--color-sev-3)", "var(--color-sev-4)", "var(--color-sev-5)"];

type Pin = {
  id: string;
  title: string;
  street: string;
  cat: CatKey;
  sev: 1 | 2 | 3 | 4 | 5;
  mins: number;
  confirms: number;
  verified: boolean;
  x: number; // % position on the stylised map
  y: number;
};

/* PROD: replace with /api/incidents?limit=160&status=all (+ /api/news for wire pins). */
const PINS: Pin[] = [
  { id: "p1", title: "Knee-deep water on Bay Street", street: "Bay St & Shirley Ct", cat: "flood", sev: 4, mins: 6, confirms: 23, verified: true, x: 24, y: 38 },
  { id: "p2", title: "Lines down after squall", street: "East St & Sandyport", cat: "power", sev: 5, mins: 12, confirms: 41, verified: true, x: 58, y: 24 },
  { id: "p3", title: "Road blocked — fallen tree", street: "Carmichael Rd", cat: "road", sev: 3, mins: 26, confirms: 12, verified: false, x: 71, y: 55 },
  { id: "p4", title: "Boil notice: Blue Lagoon", street: "Blue Lagoon", cat: "water", sev: 3, mins: 44, confirms: 31, verified: true, x: 40, y: 68 },
  { id: "p5", title: "Break-in attempt reported", street: "Cable Beach area", cat: "crime", sev: 2, mins: 58, confirms: 8, verified: false, x: 82, y: 34 },
  { id: "p6", title: "Debris in the channel", street: "Paradise Island harbour", cat: "marine", sev: 2, mins: 77, confirms: 5, verified: true, x: 47, y: 16 },
  { id: "p7", title: "Junkanoo practice — expect crowds", street: "Fox Hill", cat: "event", sev: 1, mins: 95, confirms: 17, verified: true, x: 15, y: 62 },
  { id: "p8", title: "Two-car crash, lane closed", street: "John F Kennedy Dr", cat: "accident", sev: 4, mins: 3, confirms: 9, verified: true, x: 63, y: 74 },
];

const WIRE = [
  { id: "w1", t: "NEMA: coastal flood watch in effect for New Providence until 8pm", src: "NEMA", mins: 18 },
  { id: "w2", t: "BPL: crews dispatched to East Street switching station", src: "BPL", mins: 34 },
  { id: "w3", t: "Water & Sewer: pressure restored in Blue Lagoon", src: "WSC", mins: 52 },
  { id: "w4", t: "ZNS: regatta qualifiers postponed to Sunday", src: "ZNS", mins: 64 },
];

const PULSE: { cat: CatKey; n: number }[] = [
  { cat: "flood", n: 38 },
  { cat: "power", n: 24 },
  { cat: "road", n: 19 },
  { cat: "crime", n: 12 },
  { cat: "marine", n: 9 },
];

function ago(mins: number) {
  if (mins < 60) return `${mins}m`;
  const h = Math.floor(mins / 60);
  return `${h}h ${mins % 60}m`;
}

/* -------------------------------------------------------------------------- */
/* Brand mark (mirrors the live NowBeyMark, restated on the 2026 grid)        */
/* -------------------------------------------------------------------------- */
function Mark({ size = 34 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" aria-hidden className="shrink-0">
      <defs>
        <linearGradient id="nb26" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="var(--color-tide-400)" />
          <stop offset="55%" stopColor="var(--color-tide-500)" />
          <stop offset="100%" stopColor="var(--color-conch-500)" />
        </linearGradient>
      </defs>
      <rect x="1.5" y="1.5" width="37" height="37" rx="12" fill="var(--color-abyss-800)" stroke="url(#nb26)" strokeWidth="2" />
      <path d="M8 25.5c3.6-3.4 6.2 2.2 9.9 0 3.7-2.2 5.6 2.6 9.4 0" stroke="var(--color-tide-400)" strokeWidth="2" fill="none" strokeLinecap="round" />
      <path d="M20 8.5c-3.9 0-7 3-7 6.8 0 4.9 7 11.2 7 11.2s7-6.3 7-11.2c0-3.8-3.1-6.8-7-6.8Z" fill="none" stroke="url(#nb26)" strokeWidth="2.2" />
      <circle cx="20" cy="15.2" r="2.4" fill="var(--color-sun-500)" />
    </svg>
  );
}

/* -------------------------------------------------------------------------- */
/* Severity meter — 5 segments, glow on the filled ones                        */
/* -------------------------------------------------------------------------- */
function SeverityMeter({ sev }: { sev: number }) {
  const c = SEV_COLORS[sev - 1];
  return (
    <span className="flex items-center gap-1" role="img" aria-label={`Severity ${sev} of 5`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <span key={i} className="nb-sev" data-on={i <= sev} style={{ ["--sev-color" as string]: c }} />
      ))}
    </span>
  );
}

/* -------------------------------------------------------------------------- */
/* Pin card                                                                    */
/* -------------------------------------------------------------------------- */
function PinCard({ pin, selected, onSelect }: { pin: Pin; selected: boolean; onSelect: () => void }) {
  const cat = CATS[pin.cat];
  const [bump, setBump] = useState(false);
  return (
    <article
      onClick={onSelect}
      className={`group nb-surface cursor-pointer p-3 transition-all duration-200 ease-standard hover:-translate-y-0.5 hover:shadow-l3 ${
        selected ? "ring-1 ring-tide-400/60 shadow-glow-tide" : ""
      }`}
    >
      <div className="flex items-start gap-2.5">
        <span
          className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-sm border border-white/25 text-abyss-950"
          style={{ background: cat.color, boxShadow: `0 0 14px ${cat.color}55` }}
          aria-hidden
        >
          <cat.Icon size={15} strokeWidth={2.6} />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <h3 className="truncate text-sm font-bold text-ink-100">{pin.title}</h3>
            {pin.verified && <ShieldCheck size={13} className="shrink-0 text-tide-300" aria-label="Verified" />}
          </div>
          <p className="mt-0.5 flex items-center gap-1 truncate text-xs text-ink-300">
            <MapPin size={11} className="shrink-0" />
            {pin.street}
          </p>
          <div className="mt-2 flex items-center gap-2.5">
            <SeverityMeter sev={pin.sev} />
            <span className="font-mono text-2xs text-ink-400">
              <Clock size={10} className="mr-0.5 inline align-[-1px]" />
              {ago(pin.mins)} ago
            </span>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setBump(true);
                setTimeout(() => setBump(false), 220);
              }}
              className={`nb-focus ml-auto flex items-center gap-1 rounded-pill px-2 py-1 text-2xs font-bold transition ${
                bump ? "scale-110 bg-ok-500/25 text-ok-400" : "bg-white/8 text-ink-200 hover:bg-white/14"
              }`}
            >
              <CircleCheck size={11} />
              <span className="num">{pin.confirms + (bump ? 1 : 0)}</span>
            </button>
          </div>
        </div>
      </div>
    </article>
  );
}

/* -------------------------------------------------------------------------- */
/* Command palette (⌘K) — augments visible nav, never replaces it              */
/* -------------------------------------------------------------------------- */
type PaletteItem = { group: string; label: string; hint?: string; icon: LucideIcon; keys?: string[] };

const PALETTE: PaletteItem[] = [
  { group: "Navigate", label: "Safety map", icon: MapPin, keys: ["G", "M"] },
  { group: "Navigate", label: "News wire", icon: Radio, keys: ["G", "W"] },
  { group: "Navigate", label: "Alerts inbox", icon: Bell, keys: ["G", "A"] },
  { group: "Actions", label: "Pin a spot…", icon: Plus, keys: ["P"] },
  { group: "Actions", label: "Toggle wire pins", icon: Radio },
  { group: "Actions", label: "Switch island — Grand Bahama", icon: MapPin },
  { group: "Actions", label: "Toggle light / dark", icon: Sun },
  { group: "Recent", label: "Lines down after squall — East St", icon: Zap },
  { group: "Recent", label: "Knee-deep water on Bay Street", icon: Waves },
];

function CommandPalette({ onClose, onAction }: { onClose: () => void; onAction: (label: string) => void }) {
  const [q, setQ] = useState("");
  const [cursor, setCursor] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => inputRef.current?.focus(), []);

  const results = useMemo(() => {
    const s = q.trim().toLowerCase();
    const list = s ? PALETTE.filter((i) => i.label.toLowerCase().includes(s)) : PALETTE;
    return list.slice(0, 8);
  }, [q]);

  useEffect(() => setCursor(0), [q]);

  const onKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "ArrowDown") { e.preventDefault(); setCursor((c) => Math.min(c + 1, results.length - 1)); }
      else if (e.key === "ArrowUp") { e.preventDefault(); setCursor((c) => Math.max(c - 1, 0)); }
      else if (e.key === "Enter") { e.preventDefault(); const r = results[cursor]; if (r) { onAction(r.label); onClose(); } }
      else if (e.key === "Escape") { e.preventDefault(); onClose(); }
    },
    [results, cursor, onAction, onClose],
  );

  const groups = results.reduce<Record<string, PaletteItem[]>>((acc, r) => {
    (acc[r.group] ??= []).push(r);
    return acc;
  }, {});

  return (
    <div className="fixed inset-0 z-[900] flex items-start justify-center bg-abyss-975/60 pt-[12vh] backdrop-blur-sm" onClick={onClose}>
      <div
        className="nb-glass-strong w-[min(560px,92vw)] animate-rise overflow-hidden rounded-xl2"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-label="Command palette"
      >
        <div className="flex items-center gap-2.5 border-b hairline px-4 py-3">
          <Search size={16} className="text-ink-300" />
          <input
            ref={inputRef}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Search pins, places, actions…"
            className="w-full bg-transparent text-base text-ink-100 outline-none placeholder:text-ink-400"
          />
          <kbd className="rounded-xs border hairline px-1.5 py-0.5 font-mono text-2xs text-ink-400">esc</kbd>
        </div>
        <div className="max-h-[46vh] overflow-y-auto p-2">
          {results.length === 0 && <p className="px-3 py-6 text-center text-sm text-ink-400">No matches — try “flood”, “wire”, “island”…</p>}
          {Object.entries(groups).map(([g, items]) => (
            <div key={g} className="mb-1">
              <p className="px-2.5 pb-1 pt-2 text-2xs font-bold uppercase tracking-[0.16em] text-ink-400">{g}</p>
              {items.map((item) => {
                const idx = results.indexOf(item);
                const active = idx === cursor;
                return (
                  <button
                    key={item.label}
                    type="button"
                    onMouseEnter={() => setCursor(idx)}
                    onClick={() => { onAction(item.label); onClose(); }}
                    className={`nb-focus flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-left text-sm transition ${
                      active ? "bg-tide-500/18 text-ink-100" : "text-ink-200"
                    }`}
                  >
                    <item.icon size={15} className={active ? "text-tide-300" : "text-ink-400"} />
                    <span className="flex-1 truncate font-semibold">{item.label}</span>
                    {item.keys?.map((k) => (
                      <kbd key={k} className="rounded-xs border hairline px-1.5 py-0.5 font-mono text-2xs text-ink-400">{k}</kbd>
                    ))}
                    {active && <CornerDownLeft size={13} className="text-tide-300" />}
                  </button>
                );
              })}
            </div>
          ))}
        </div>
        <div className="flex items-center gap-3 border-t hairline px-4 py-2 text-2xs text-ink-400">
          <span><kbd className="font-mono">↑↓</kbd> navigate</span>
          <span><kbd className="font-mono">↵</kbd> select</span>
          <span className="ml-auto flex items-center gap-1"><Search size={10} /> by NowBey Signal</span>
        </div>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Report sheet — glass modal (control layer), solid data inside               */
/* -------------------------------------------------------------------------- */
function ReportSheet({ onClose, onSubmit }: { onClose: () => void; onSubmit: () => void }) {
  const [step, setStep] = useState<1 | 2>(2);
  const [cat, setCat] = useState<CatKey>("flood");
  const [sev, setSev] = useState(3);
  const [title, setTitle] = useState("");
  const [anon, setAnon] = useState(false);

  return (
    <div className="fixed inset-0 z-[850] flex items-end justify-center bg-abyss-975/55 p-0 backdrop-blur-sm sm:items-center sm:p-6" onClick={onClose}>
      <div
        className="nb-glass-strong max-h-[92vh] w-full max-w-[520px] animate-rise overflow-y-auto rounded-t-2xl2 sm:rounded-2xl2"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-label="Pin a spot"
      >
        <div className="sticky top-0 z-10 nb-glass-strong flex items-center gap-3 rounded-t-2xl2 border-b hairline px-4 py-3">
          <span className="grid h-8 w-8 place-items-center rounded-sm bg-tide-500 text-abyss-950"><Plus size={17} strokeWidth={3} /></span>
          <div className="flex-1">
            <p className="text-2xs font-bold uppercase tracking-[0.16em] text-tide-300">Step {step} of 2</p>
            <h2 className="display text-lg font-extrabold text-ink-100">{step === 1 ? "Pick the exact spot" : "Add details"}</h2>
          </div>
          <button type="button" onClick={onClose} className="nb-focus rounded-pill p-2 text-ink-300 hover:bg-white/10 hover:text-ink-100" aria-label="Close">
            <X size={16} />
          </button>
        </div>

        {step === 1 ? (
          <div className="p-4">
            <div className="relative h-56 overflow-hidden rounded-lg border hairline bg-abyss-950">
              <div className="absolute inset-0 opacity-70" style={{ background: "radial-gradient(60% 80% at 50% 50%, var(--color-abyss-700), var(--color-abyss-950))" }} />
              <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-tide-400">
                <MapPin size={30} strokeWidth={2.5} className="animate-bounce" />
              </div>
              <p className="absolute inset-x-0 bottom-3 text-center text-xs font-semibold text-ink-200">Drag the map — the crosshair is the spot</p>
            </div>
            <button type="button" onClick={() => setStep(2)} className="mt-4 w-full rounded-pill bg-tide-500 py-3 text-sm font-extrabold text-abyss-950 transition hover:bg-tide-400 active:scale-[0.98]">
              Use this spot
            </button>
          </div>
        ) : (
          <div className="space-y-4 p-4">
            <div>
              <p className="mb-1.5 text-2xs font-bold uppercase tracking-[0.16em] text-ink-400">Category</p>
              <div className="flex flex-wrap gap-1.5">
                {(Object.keys(CATS) as CatKey[]).map((k) => (
                  <button
                    key={k}
                    type="button"
                    onClick={() => setCat(k)}
                    className={`nb-focus flex items-center gap-1.5 rounded-pill border px-2.5 py-1.5 text-xs font-bold transition ${
                      cat === k ? "border-tide-400/70 bg-tide-500/18 text-tide-200" : "hairline text-ink-300 hover:bg-white/8"
                    }`}
                  >
                    <span className="h-2 w-2 rounded-full" style={{ background: CATS[k].color }} />
                    {CATS[k].label}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <p className="mb-1.5 text-2xs font-bold uppercase tracking-[0.16em] text-ink-400">Severity</p>
              <div className="flex items-center gap-3">
                {[1, 2, 3, 4, 5].map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setSev(n)}
                    aria-label={`Severity ${n}`}
                    className={`nb-focus h-9 flex-1 rounded-sm border transition ${
                      sev >= n ? "border-transparent" : "hairline"
                    }`}
                    style={sev >= n ? { background: SEV_COLORS[n - 1], boxShadow: `0 0 14px ${SEV_COLORS[n - 1]}66` } : undefined}
                  />
                ))}
              </div>
            </div>
            <label className="block">
              <span className="mb-1.5 block text-2xs font-bold uppercase tracking-[0.16em] text-ink-400">What is happening?</span>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Short headline — e.g. “Water knee-deep on Bay St”"
                className="nb-focus w-full rounded-md border hairline bg-abyss-950/70 px-3 py-2.5 text-sm text-ink-100 outline-none placeholder:text-ink-400"
              />
            </label>
            <label className="flex items-center gap-2.5 text-sm text-ink-200">
              <input type="checkbox" checked={anon} onChange={(e) => setAnon(e.target.checked)} className="h-4 w-4 accent-[var(--color-tide-500)]" />
              Post anonymously
            </label>
            <button
              type="button"
              onClick={onSubmit}
              className="w-full rounded-pill bg-tide-500 py-3 text-sm font-extrabold text-abyss-950 transition hover:bg-tide-400 active:scale-[0.98]"
            >
              Send to the wire
            </button>
            <p className="text-center text-2xs text-ink-400">Your report is public and immediately visible. Honest reports keep the island safe.</p>
          </div>
        )}
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Toast                                                                       */
/* -------------------------------------------------------------------------- */
function Toast({ msg, onDone }: { msg: string; onDone: () => void }) {
  useEffect(() => {
    const t = setTimeout(onDone, 2600);
    return () => clearTimeout(t);
  }, [onDone]);
  return (
    <div className="nb-glass-strong fixed bottom-6 left-1/2 z-[950] flex -translate-x-1/2 animate-rise items-center gap-2.5 rounded-pill px-4 py-2.5 text-sm font-bold text-ink-100">
      <CircleCheck size={16} className="text-ok-500" />
      {msg}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* The workspace                                                               */
/* -------------------------------------------------------------------------- */
export default function MapWorkspace2026Preview() {
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [sheet, setSheet] = useState(false);
  const [filter, setFilter] = useState<CatKey | "all">("all");
  const [selected, setSelected] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [layer, setLayer] = useState<"hybrid" | "satellite" | "road" | "streets">("hybrid");

  /* ⌘K / Ctrl+K — the palette is augmentation, the search button stays visible. */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setPaletteOpen((v) => !v);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const visible = filter === "all" ? PINS : PINS.filter((p) => p.cat === filter);

  return (
    <div data-theme={theme} className="nb-aurora relative min-h-screen overflow-hidden bg-abyss-950 text-ink-100">
      {/* ================= Command bar (glass control layer) ================= */}
      <header className="nb-glass-strong sticky top-0 z-[800] border-b-0">
        <div className="mx-auto flex max-w-[1440px] items-center gap-3 px-4 py-2.5">
          <a href="#" className="flex items-center gap-2.5">
            <Mark />
            <span className="leading-none">
              <span className="display block text-lg font-extrabold tracking-tight text-ink-100">Now<span className="text-tide-400">Bey</span></span>
              <span className="mt-0.5 block text-2xs font-semibold uppercase tracking-[0.16em] text-ink-400">Stay safe, Bahamas</span>
            </span>
          </a>

          <button
            type="button"
            onClick={() => setPaletteOpen(true)}
            className="nb-focus ml-4 hidden min-w-[240px] flex-1 items-center gap-2.5 rounded-pill border hairline bg-abyss-950/60 px-3.5 py-2 text-left text-sm text-ink-400 transition hover:border-tide-400/40 hover:text-ink-200 md:flex md:max-w-[420px]"
          >
            <Search size={15} />
            Search pins, places, actions…
            <kbd className="ml-auto rounded-xs border hairline px-1.5 py-0.5 font-mono text-2xs">⌘K</kbd>
          </button>

          <div className="ml-auto flex items-center gap-2">
            <span className="hidden items-center gap-2 rounded-pill border hairline bg-abyss-950/60 px-3 py-1.5 text-xs font-bold text-ink-200 sm:flex">
              <span className="nb-live-dot" />
              LIVE · New Providence
              <span className="num font-mono text-ink-400">142 open</span>
            </span>
            <button
              type="button"
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              className="nb-focus rounded-pill border hairline bg-abyss-950/60 p-2 text-ink-300 transition hover:text-tide-300"
              aria-label="Toggle theme"
            >
              {theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
            </button>
            <button type="button" className="nb-focus relative rounded-pill border hairline bg-abyss-950/60 p-2 text-ink-300 transition hover:text-tide-300" aria-label="Alerts">
              <Bell size={16} />
              <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-conch-500 shadow-glow-danger" />
            </button>
            <span className="grid h-9 w-9 place-items-center rounded-pill border hairline bg-gradient-to-br from-tide-500 to-conch-500 text-xs font-extrabold text-abyss-950">MJ</span>
          </div>
        </div>
      </header>

      {/* ================= Workspace: bento rail + map stage ================= */}
      <main className="mx-auto grid max-w-[1440px] grid-cols-1 items-stretch gap-4 p-4 lg:grid-cols-[380px_minmax(0,1fr)]">
        {/* ---------------- Bento rail ---------------- */}
        <aside className="flex min-h-0 flex-col gap-3">
          {/* Bento row 1 — island pulse (2/3) + stats (1/3 stack) */}
          <div className="grid grid-cols-3 gap-3">
            <section className="nb-surface col-span-2 p-3.5">
              <div className="mb-2.5 flex items-center gap-2">
                <Activity size={14} className="text-tide-300" />
                <h2 className="text-2xs font-bold uppercase tracking-[0.16em] text-ink-300">Island pulse</h2>
                <span className="nb-live-dot ml-auto" />
              </div>
              <ul className="space-y-2">
                {PULSE.map(({ cat, n }) => (
                  <li key={cat} className="flex items-center gap-2.5">
                    <span className="flex w-20 shrink-0 items-center gap-1.5 text-xs font-semibold text-ink-200">
                      <span className="h-2 w-2 rounded-full" style={{ background: CATS[cat].color }} />
                      {CATS[cat].label}
                    </span>
                    <span className="h-1.5 flex-1 overflow-hidden rounded-pill bg-white/8">
                      <span
                        className="block h-full rounded-pill transition-[width] duration-500 ease-standard"
                        style={{ width: `${(n / 38) * 100}%`, background: CATS[cat].color, boxShadow: `0 0 10px ${CATS[cat].color}88` }}
                      />
                    </span>
                    <span className="num w-6 text-right font-mono text-xs text-ink-300">{n}</span>
                  </li>
                ))}
              </ul>
            </section>
            <div className="flex flex-col gap-3">
              <div className="nb-surface flex flex-1 flex-col justify-center p-3.5">
                <p className="text-2xs font-bold uppercase tracking-[0.16em] text-ink-400">Open pins</p>
                <p className="num display mt-1 text-2xl font-extrabold text-tide-300">142</p>
                <p className="text-2xs text-ok-400">▼ 12% vs yesterday</p>
              </div>
              <div className="nb-surface flex flex-1 flex-col justify-center p-3.5">
                <p className="text-2xs font-bold uppercase tracking-[0.16em] text-ink-400">Confirmed today</p>
                <p className="num display mt-1 text-2xl font-extrabold text-sand-100">1,204</p>
                <p className="text-2xs text-ink-400">by 318 neighbours</p>
              </div>
            </div>
          </div>

          {/* Filters */}
          <div className="nb-no-scrollbar flex gap-1.5 overflow-x-auto pb-0.5">
            <button
              type="button"
              onClick={() => setFilter("all")}
              className={`nb-focus shrink-0 rounded-pill px-3 py-1.5 text-xs font-bold transition ${
                filter === "all" ? "bg-tide-500 text-abyss-950" : "border hairline text-ink-300 hover:bg-white/8"
              }`}
            >
              All · {PINS.length}
            </button>
            {(Object.keys(CATS) as CatKey[]).map((k) => (
              <button
                key={k}
                type="button"
                onClick={() => setFilter(k)}
                className={`nb-focus flex shrink-0 items-center gap-1.5 rounded-pill px-3 py-1.5 text-xs font-bold transition ${
                  filter === k ? "bg-tide-500 text-abyss-950" : "border hairline text-ink-300 hover:bg-white/8"
                }`}
              >
                <span className="h-2 w-2 rounded-full" style={{ background: CATS[k].color }} />
                {CATS[k].label}
              </button>
            ))}
          </div>

          {/* Pin list */}
          <div className="flex min-h-0 flex-1 flex-col gap-2.5 overflow-y-auto pr-0.5">
            {visible.map((pin) => (
              <PinCard key={pin.id} pin={pin} selected={selected === pin.id} onSelect={() => setSelected(selected === pin.id ? null : pin.id)} />
            ))}
            <button type="button" className="nb-focus rounded-lg border hairline py-2.5 text-xs font-bold text-ink-300 transition hover:bg-white/8 hover:text-ink-100">
              Show more pins
            </button>
          </div>
        </aside>

        {/* ---------------- Map stage ---------------- */}
        <section className="relative flex min-h-[560px] flex-col overflow-hidden rounded-xl2 border hairline lg:h-[calc(100vh-116px)]">
          {/* PROD: <MapPanel mode="browse" …/> with the Tideglass skin. The stylised
              stand-in below exists so this preview runs with zero dependencies. */}
          <div className="absolute inset-0 bg-abyss-975">
            <div className="absolute inset-0" style={{ background: "radial-gradient(75% 65% at 58% 38%, var(--color-abyss-800), var(--color-abyss-975))" }} />
            {/* water */}
            <div className="absolute inset-0 opacity-90" style={{
              background:
                "radial-gradient(38% 46% at 86% 78%, color-mix(in srgb, var(--color-cat-water) 26%, transparent), transparent 70%), radial-gradient(30% 34% at 8% 12%, color-mix(in srgb, var(--color-cat-marine) 16%, transparent), transparent 70%)",
            }} />
            {/* street grid */}
            <svg className="absolute inset-0 h-full w-full opacity-[0.35]" aria-hidden>
              {[18, 34, 50, 66, 82].map((y) => <line key={y} x1="0" y1={`${y}%`} x2="100%" y2={`${y}%`} stroke="var(--color-abyss-600)" strokeWidth="1" />)}
              {[12, 28, 44, 60, 76, 92].map((x) => <line key={x} x1={`${x}%`} y1="0" x2={`${x}%`} y2="100%" stroke="var(--color-abyss-600)" strokeWidth="1" />)}
              <path d="M0 88 C 30 80, 45 60, 72 55 S 95 40, 100 30" stroke="var(--color-abyss-600)" strokeWidth="3" fill="none" />
            </svg>
            {/* pins */}
            {PINS.map((pin) => {
              const cat = CATS[pin.cat];
              const active = selected === pin.id;
              return (
                <button
                  key={pin.id}
                  type="button"
                  onClick={() => setSelected(active ? null : pin.id)}
                  className="group absolute -translate-x-1/2 -translate-y-full transition-transform duration-200 ease-spring hover:scale-110"
                  style={{ left: `${pin.x}%`, top: `${pin.y}%`, zIndex: active ? 30 : 10 }}
                  aria-label={pin.title}
                >
                  {pin.sev >= 4 && (
                    <span className="absolute left-1/2 top-1/2 -z-10 h-8 w-8 -translate-x-1/2 -translate-y-1/2 animate-pulse-ring rounded-full" style={{ background: `${SEV_COLORS[pin.sev - 1]}66` }} />
                  )}
                  <span
                    className={`grid h-8 w-8 place-items-center rounded-full border-2 text-abyss-950 transition ${active ? "scale-125" : ""}`}
                    style={{ background: cat.color, borderColor: active ? "var(--color-sand-50)" : "rgba(255,255,255,0.65)", boxShadow: `0 4px 16px ${cat.color}77` }}
                  >
                    <cat.Icon size={14} strokeWidth={2.8} />
                  </span>
                </button>
              );
            })}
            {/* cluster */}
            <button type="button" className="absolute -translate-x-1/2 -translate-y-1/2" style={{ left: "34%", top: "47%" }} aria-label="Cluster of 12 reports">
              <span className="grid h-11 w-11 place-items-center rounded-full border-2 border-tide-300/70 bg-abyss-950/80 font-mono text-sm font-extrabold text-tide-200 shadow-glow-tide backdrop-blur-md">12</span>
            </button>
            {/* crosshair in pick mode (hidden in browse) */}
          </div>

          {/* floating map controls — glass */}
          <div className="absolute right-3 top-3 flex flex-col gap-2">
            <div className="nb-glass flex rounded-pill p-1">
              {(["hybrid", "satellite", "road", "streets"] as const).map((l) => (
                <button
                  key={l}
                  type="button"
                  onClick={() => setLayer(l)}
                  className={`nb-focus rounded-pill px-3 py-1.5 text-2xs font-bold capitalize transition ${
                    layer === l ? "bg-tide-500 text-abyss-950" : "text-ink-200 hover:bg-white/10"
                  }`}
                >
                  {l === "hybrid" ? "Hybrid" : l === "satellite" ? "Sat" : l === "road" ? "Road" : "Dark"}
                </button>
              ))}
            </div>
            <div className="nb-glass flex flex-col rounded-lg p-1">
              <button type="button" className="nb-focus rounded-sm p-2 text-ink-200 hover:bg-white/10 hover:text-tide-300" aria-label="Recenter"><LocateFixed size={16} /></button>
              <button type="button" className="nb-focus rounded-sm p-2 text-ink-200 hover:bg-white/10 hover:text-tide-300" aria-label="Street level"><PersonStanding size={16} /></button>
              <button type="button" className="nb-focus rounded-sm p-2 text-ink-200 hover:bg-white/10 hover:text-tide-300" aria-label="Layers"><Layers size={16} /></button>
            </div>
          </div>

          {/* storm banner — safety info is never behind glass or motion */}
          <div className="nb-glass absolute left-3 top-3 flex max-w-[300px] items-center gap-2.5 rounded-lg px-3 py-2.5">
            <TriangleAlert size={18} className="shrink-0 text-sun-500" />
            <div>
              <p className="text-xs font-extrabold text-ink-100">Coastal flood watch</p>
              <p className="text-2xs text-ink-300">NEMA · until 8:00pm · New Providence</p>
            </div>
            <button className="nb-focus ml-1 shrink-0 rounded-pill bg-white/10 p-1 text-ink-200 hover:bg-white/20" aria-label="Details"><ChevronRight size={14} /></button>
          </div>

          {/* pin a spot */}
          <button
            type="button"
            onClick={() => setSheet(true)}
            className="nb-focus absolute bottom-20 left-1/2 flex -translate-x-1/2 items-center gap-2 rounded-pill bg-tide-500 px-5 py-3 text-sm font-extrabold text-abyss-950 shadow-glow-tide transition hover:bg-tide-400 active:scale-95"
          >
            <Plus size={16} strokeWidth={3} /> Pin a spot
          </button>

          {/* live wire ticker — pauses on hover; static under reduced motion */}
          <div className="nb-glass absolute inset-x-0 bottom-0 flex items-center gap-3 overflow-hidden rounded-b-xl2 px-3 py-2">
            <span className="flex shrink-0 items-center gap-1.5 rounded-pill bg-conch-500/20 px-2 py-1 text-2xs font-extrabold uppercase tracking-[0.14em] text-conch-400">
              <Radio size={11} /> Wire
            </span>
            <div className="group relative flex-1 overflow-hidden">
              <div className="flex w-max gap-8 whitespace-nowrap animate-[nb-marquee_36s_linear_infinite] group-hover:[animation-play-state:paused]">
                {[...WIRE, ...WIRE].map((w, i) => (
                  <span key={i} className="flex items-center gap-2 text-xs text-ink-200">
                    <span className="font-mono text-2xs font-bold text-tide-300">{w.src}</span>
                    {w.t}
                    <span className="font-mono text-2xs text-ink-400">{ago(w.mins)}</span>
                  </span>
                ))}
              </div>
            </div>
            <a href="#" className="hidden shrink-0 items-center gap-1 text-2xs font-bold text-tide-300 hover:text-tide-200 sm:flex">
              All news <ArrowUpRight size={12} />
            </a>
          </div>
        </section>
      </main>

      {/* ================= Overlays ================= */}
      {sheet && (
        <ReportSheet
          onClose={() => setSheet(false)}
          onSubmit={() => { setSheet(false); setToast("Pin sent — neighbours can confirm it now"); }}
        />
      )}
      {paletteOpen && <CommandPalette onClose={() => setPaletteOpen(false)} onAction={(l) => setToast(`${l} — preview only`)} />}
      {toast && <Toast msg={toast} onDone={() => setToast(null)} />}

      {/* ================= Preview dock (remove on migration) ================= */}
      <div className="nb-glass fixed bottom-4 right-4 z-[960] flex flex-col gap-1.5 rounded-lg p-2 text-2xs">
        <p className="px-1 font-bold uppercase tracking-[0.14em] text-ink-400">2026 preview</p>
        <div className="flex gap-1.5">
          <button type="button" onClick={() => setPaletteOpen(true)} className="nb-focus rounded-sm border hairline px-2 py-1 font-bold text-ink-200 hover:bg-white/10">⌘K</button>
          <button type="button" onClick={() => setSheet(true)} className="nb-focus rounded-sm border hairline px-2 py-1 font-bold text-ink-200 hover:bg-white/10">Report</button>
          <button type="button" onClick={() => setTheme(theme === "dark" ? "light" : "dark")} className="nb-focus rounded-sm border hairline px-2 py-1 font-bold text-ink-200 hover:bg-white/10">{theme === "dark" ? "Light" : "Dark"}</button>
        </div>
        <p className="num px-1 font-mono text-ink-400">v2026.10 · mock data</p>
      </div>
    </div>
  );
}
