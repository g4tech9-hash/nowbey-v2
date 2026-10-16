/* ============================================================================
 * Report_2026_Web_Preview.tsx — PREVIEW ONLY. Not imported by any route.
 * ----------------------------------------------------------------------------
 * The 2026 "Tideglass" report flow, deep-dive: the two-step "Pin a spot"
 * experience with every state designed — pick mode, validation, saving,
 * success, and the honest failure state. Drop-in candidate for the report
 * sheet inside src/app/map/page.tsx AFTER approval.
 *
 * The preview dock (bottom-right) jumps between states so each can be judged
 * in isolation. PROD: submit posts to /api/reports exactly like the live form.
 * ========================================================================== */
"use client";

import { useState } from "react";
import {
  MapPin,
  Plus,
  Crosshair,
  Check,
  TriangleAlert,
  RefreshCw,
  ShieldCheck,
  Eye,
  EyeOff,
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

type CatKey = "flood" | "storm" | "power" | "water" | "crime" | "road" | "marine" | "fire" | "health" | "trash" | "event" | "notice" | "accident";

const CATS: Record<CatKey, { label: string; color: string; Icon: LucideIcon; blurb: string }> = {
  flood: { label: "Flooding", color: "var(--color-cat-flood)", Icon: Waves, blurb: "Standing water, washover, flash flood" },
  storm: { label: "Storm", color: "var(--color-cat-storm)", Icon: Wind, blurb: "Squall, surge, hurricane watch" },
  power: { label: "Power", color: "var(--color-cat-power)", Icon: Zap, blurb: "Outage, lines down, generator" },
  water: { label: "Water", color: "var(--color-cat-water)", Icon: Droplets, blurb: "No water, main break, boil notice" },
  crime: { label: "Safety", color: "var(--color-cat-crime)", Icon: ShieldAlert, blurb: "Theft, break-in, suspicious" },
  road: { label: "Road", color: "var(--color-cat-road)", Icon: Construction, blurb: "Pothole, blockage, closure" },
  marine: { label: "Marine", color: "var(--color-cat-marine)", Icon: Anchor, blurb: "Debris, grounding, sea state" },
  fire: { label: "Fire", color: "var(--color-cat-fire)", Icon: Flame, blurb: "Brush or structure fire, smoke" },
  health: { label: "Health", color: "var(--color-cat-health)", Icon: HeartPulse, blurb: "Assistance, medical, rescue" },
  trash: { label: "Sanitation", color: "var(--color-cat-trash)", Icon: Trash2, blurb: "Missed pickup, dumping" },
  event: { label: "Community", color: "var(--color-cat-event)", Icon: Star, blurb: "Junkanoo, regatta, fundraiser" },
  notice: { label: "Notice", color: "var(--color-cat-notice)", Icon: Info, blurb: "General heads-up" },
  accident: { label: "Car Accident", color: "var(--color-cat-accident)", Icon: Car, blurb: "Traffic accident or vehicle hazard" },
};

const SEV = [
  { n: 1, label: "Minor", hint: "Worth knowing" },
  { n: 2, label: "Moderate", hint: "Plan around it" },
  { n: 3, label: "Elevated", hint: "Affects the area" },
  { n: 4, label: "High", hint: "Avoid if you can" },
  { n: 5, label: "Critical", hint: "Danger — stay clear" },
] as const;

type Stage = "spot" | "details" | "saving" | "done" | "error";

export default function Report2026WebPreview() {
  const [stage, setStage] = useState<Stage>("spot");
  const [cat, setCat] = useState<CatKey>("flood");
  const [sev, setSev] = useState(3);
  const [title, setTitle] = useState("");
  const [details, setDetails] = useState("");
  const [anon, setAnon] = useState(false);
  const [touched, setTouched] = useState(false);

  const titleOk = title.trim().length >= 4;
  const showErr = touched && !titleOk;

  const submit = () => {
    setTouched(true);
    if (!titleOk) return;
    setStage("saving");
    // PROD: POST /api/reports — here we simulate both outcomes from the dock.
    setTimeout(() => setStage((s) => (s === "saving" ? "done" : s)), 900);
  };

  const jump = (s2: Stage) => {
    setStage(s2);
    setTouched(false);
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-abyss-975 text-ink-100">
      {/* map behind the sheet — pick mode crosshair */}
      <div className="absolute inset-0">
        <div className="absolute inset-0" style={{ background: "radial-gradient(75% 65% at 55% 40%, var(--color-abyss-800), var(--color-abyss-975))" }} />
        <div className="absolute inset-0 opacity-90" style={{ background: "radial-gradient(36% 44% at 84% 76%, color-mix(in srgb, var(--color-cat-water) 26%, transparent), transparent 70%)" }} />
        <svg className="absolute inset-0 h-full w-full opacity-[0.35]" aria-hidden>
          {[20, 38, 56, 74].map((y) => <line key={y} x1="0" y1={`${y}%`} x2="100%" y2={`${y}%`} stroke="var(--color-abyss-600)" strokeWidth="1" />)}
          {[14, 32, 50, 68, 86].map((x) => <line key={x} x1={`${x}%`} y1="0" x2={`${x}%`} y2="100%" stroke="var(--color-abyss-600)" strokeWidth="1" />)}
          <path d="M0 82 C 28 74, 46 58, 70 52 S 92 38, 100 28" stroke="var(--color-abyss-600)" strokeWidth="3" fill="none" />
        </svg>
        {/* existing pins, dimmed behind the sheet */}
        {[
          { x: 22, y: 40, c: "var(--color-cat-power)" },
          { x: 61, y: 26, c: "var(--color-cat-flood)" },
          { x: 78, y: 58, c: "var(--color-cat-road)" },
        ].map((p, i) => (
          <span key={i} className="absolute -translate-x-1/2 -translate-y-full opacity-40" style={{ left: `${p.x}%`, top: `${p.y}%` }}>
            <span className="grid h-7 w-7 place-items-center rounded-full border-2 border-white/50" style={{ background: p.c }} />
          </span>
        ))}
        {stage === "spot" && (
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
            <Crosshair size={44} strokeWidth={1.5} className="animate-pulse text-tide-400" />
            <span className="absolute -inset-6 animate-pulse-ring rounded-full border border-tide-400/50" />
          </div>
        )}
      </div>

      {/* the sheet */}
      <div className="relative z-10 flex min-h-screen items-end justify-center p-0 sm:items-center sm:p-6">
        <div className="nb-glass-strong w-full max-w-[540px] animate-rise overflow-hidden rounded-t-2xl2 sm:rounded-2xl2" role="dialog" aria-label="Pin a spot">
          {/* header */}
          <div className="flex items-center gap-3 border-b hairline px-5 py-4">
            <span className="grid h-9 w-9 place-items-center rounded-sm bg-tide-500 text-abyss-950"><Plus size={18} strokeWidth={3} /></span>
            <div className="flex-1">
              <p className="text-2xs font-bold uppercase tracking-[0.16em] text-tide-300">
                {stage === "spot" ? "Step 1 of 2" : stage === "done" ? "Sent" : "Step 2 of 2"}
              </p>
              <h1 className="display text-lg font-extrabold text-ink-100">
                {stage === "spot" ? "Pick the exact spot" : stage === "done" ? "Your pin is live" : "Add details"}
              </h1>
            </div>
            {/* step dots */}
            <div className="flex items-center gap-1.5" aria-hidden>
              <span className={`h-1.5 w-6 rounded-pill ${stage === "spot" ? "bg-tide-400" : "bg-tide-500"}`} />
              <span className={`h-1.5 w-6 rounded-pill ${stage === "spot" ? "bg-white/15" : "bg-tide-500"}`} />
            </div>
          </div>

          <div className="max-h-[70vh] overflow-y-auto p-5">
            {/* ---------- STEP 1 ---------- */}
            {stage === "spot" && (
              <>
                <p className="text-sm leading-relaxed text-ink-200">
                  Drag the map so the crosshair sits on the spot. Precision here is what makes a report useful — neighbours confirm what they recognise.
                </p>
                <div className="mt-4 flex items-center gap-2.5 rounded-md border hairline bg-abyss-950/70 px-3 py-2.5 font-mono text-xs text-ink-300">
                  <MapPin size={13} className="text-tide-300" />
                  25.0629° N, 77.3417° W
                  <span className="ml-auto text-ink-400">±8 m</span>
                </div>
                <button
                  onClick={() => jump("details")}
                  className="nb-focus mt-4 w-full rounded-pill bg-tide-500 py-3 text-sm font-extrabold text-abyss-950 shadow-glow-tide transition hover:bg-tide-400 active:scale-[0.98]"
                >
                  Use this spot
                </button>
              </>
            )}

            {/* ---------- STEP 2 ---------- */}
            {(stage === "details" || stage === "saving" || stage === "error") && (
              <div className="space-y-4">
                <div>
                  <p className="mb-1.5 text-2xs font-bold uppercase tracking-[0.14em] text-ink-400">Category</p>
                  <div className="flex flex-wrap gap-1.5">
                    {(Object.keys(CATS) as CatKey[]).map((k) => (
                      <button
                        key={k}
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
                  <p className="mt-1.5 text-2xs text-ink-400">{CATS[cat].blurb}</p>
                </div>

                <div>
                  <p className="mb-1.5 text-2xs font-bold uppercase tracking-[0.14em] text-ink-400">Severity</p>
                  <div className="flex items-center gap-2">
                    {SEV.map((s2) => (
                      <button
                        key={s2.n}
                        onClick={() => setSev(s2.n)}
                        title={`${s2.label} — ${s2.hint}`}
                        className={`nb-focus h-10 flex-1 rounded-sm border transition ${
                          sev >= s2.n ? "border-transparent" : "hairline hover:bg-white/8"
                        }`}
                        style={sev >= s2.n ? { background: `var(--color-sev-${s2.n})`, boxShadow: `0 0 14px var(--color-sev-${s2.n})66` } : undefined}
                      />
                    ))}
                  </div>
                  <p className="mt-1.5 text-2xs font-bold" style={{ color: `var(--color-sev-${sev})` }}>
                    {SEV[sev - 1].label} — {SEV[sev - 1].hint}
                  </p>
                </div>

                <label className="block">
                  <span className="mb-1.5 block text-2xs font-bold uppercase tracking-[0.14em] text-ink-400">What is happening?</span>
                  <input
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Short headline — e.g. “Water knee-deep on Bay St”"
                    className={`nb-focus w-full rounded-md border bg-abyss-950/70 px-3 py-2.5 text-sm text-ink-100 outline-none placeholder:text-ink-400 ${
                      showErr ? "border-danger-500" : "hairline focus:border-tide-400/60"
                    }`}
                  />
                  {showErr && (
                    <p className="mt-1.5 flex items-center gap-1.5 text-2xs font-bold text-danger-500">
                      <TriangleAlert size={11} /> A headline of at least 4 characters helps neighbours recognise the spot.
                    </p>
                  )}
                </label>

                <label className="block">
                  <span className="mb-1.5 block text-2xs font-bold uppercase tracking-[0.14em] text-ink-400">Details <span className="font-semibold normal-case text-ink-400">(optional)</span></span>
                  <textarea
                    value={details}
                    onChange={(e) => setDetails(e.target.value)}
                    rows={3}
                    placeholder="Which lane, how deep, since when?"
                    className="nb-focus w-full resize-none rounded-md border hairline bg-abyss-950/70 px-3 py-2.5 text-sm text-ink-100 outline-none placeholder:text-ink-400 focus:border-tide-400/60"
                  />
                </label>

                <div className="flex flex-wrap items-center gap-4">
                  <label className="flex items-center gap-2.5 text-sm text-ink-200">
                    <input type="checkbox" checked={anon} onChange={(e) => setAnon(e.target.checked)} className="h-4 w-4 accent-[var(--color-tide-500)]" />
                    {anon ? <EyeOff size={14} className="text-ink-400" /> : <Eye size={14} className="text-ink-400" />}
                    Post anonymously
                  </label>
                  <span className="flex items-center gap-1.5 text-2xs text-ink-400">
                    <ShieldCheck size={12} className="text-tide-300" /> Your pin is public immediately — that is how the map stays fast.
                  </span>
                </div>

                {stage === "error" && (
                  <div className="rounded-md border border-danger-500/45 bg-danger-500/10 p-3.5">
                    <p className="flex items-center gap-2 text-sm font-extrabold text-danger-500">
                      <TriangleAlert size={14} /> The wire rejected that report
                    </p>
                    <p className="mt-1 text-xs leading-relaxed text-ink-200">
                      Nothing was lost — your draft is still here. This is usually a dropped connection; try again in a moment.
                    </p>
                    <button onClick={() => jump("details")} className="nb-focus mt-2.5 flex items-center gap-1.5 rounded-pill border hairline px-3 py-1.5 text-2xs font-bold text-ink-100 hover:bg-white/8">
                      <RefreshCw size={11} /> Try again
                    </button>
                  </div>
                )}

                <button
                  onClick={submit}
                  disabled={stage === "saving"}
                  className="nb-focus w-full rounded-pill bg-tide-500 py-3 text-sm font-extrabold text-abyss-950 shadow-glow-tide transition hover:bg-tide-400 active:scale-[0.98] disabled:opacity-60"
                >
                  {stage === "saving" ? (
                    <span className="flex items-center justify-center gap-2">
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-abyss-950 border-t-transparent" />
                      Sending to the wire…
                    </span>
                  ) : (
                    "Send to the wire"
                  )}
                </button>
              </div>
            )}

            {/* ---------- SUCCESS ---------- */}
            {stage === "done" && (
              <div className="py-2 text-center">
                <span className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-ok-500/18 text-ok-500">
                  <Check size={26} strokeWidth={3} />
                </span>
                <p className="display mt-3 text-lg font-extrabold text-ink-100">Your pin is live</p>
                <p className="mx-auto mt-1.5 max-w-[42ch] text-sm leading-relaxed text-ink-300">
                  Neighbours can confirm it now — confirmations are what move a pin up the island’s attention. You earned the{" "}
                  <span className="font-bold text-tide-300">First report</span> badge.
                </p>
                <div className="mt-4 flex justify-center gap-2">
                  <button onClick={() => { setTitle(""); setDetails(""); jump("spot"); }} className="nb-focus rounded-pill border hairline px-4 py-2 text-xs font-bold text-ink-200 hover:bg-white/8">
                    Pin another spot
                  </button>
                  <button className="nb-focus rounded-pill bg-tide-500 px-4 py-2 text-xs font-extrabold text-abyss-950 hover:bg-tide-400">
                    See it on the map
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* preview dock — jump between states */}
      <div className="nb-glass fixed bottom-4 right-4 z-[960] rounded-lg p-2.5 text-2xs">
        <p className="px-1 pb-1.5 font-bold uppercase tracking-[0.14em] text-ink-400">report flow · states</p>
        <div className="flex flex-wrap gap-1.5">
          {(["spot", "details", "saving", "done", "error"] as Stage[]).map((s2) => (
            <button
              key={s2}
              onClick={() => jump(s2)}
              className={`nb-focus rounded-sm border px-2 py-1 font-bold capitalize transition ${
                stage === s2 ? "border-tide-400/70 bg-tide-500/20 text-tide-200" : "hairline text-ink-300 hover:bg-white/10"
              }`}
            >
              {s2}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
