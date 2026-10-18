"use client";

/**
 * SCREEN 3 — REPORT A HAZARD (Master Build Section 7). Three steps, one
 * decision per step. Draft values survive tab blur, step changes and dropped
 * signal (localStorage); the headline is required; anonymous posts store a
 * null reporter name; success confettis, then lands on the radar with the new
 * report selected.
 */
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  CheckCircle2,
  Flame,
  Send,
  ShieldAlert,
  Waves,
  Wind,
  Zap,
} from "lucide-react";
import {
  HAZARD_META,
  ISLANDS,
  islandFor,
  settlementsFor,
  type HazardType,
  type Severity,
} from "@/lib/bahamas";
import { useConfetti } from "./confetti";
import { ReportStepper } from "./report-stepper";
import { Btn, ErrorState } from "./ui";

const DRAFT_KEY = "nb_report_draft";

interface Draft {
  step: 1 | 2 | 3;
  hazardType: HazardType | "";
  severity: Severity;
  island: string;
  settlement: string;
  address: string;
  headline: string;
  description: string;
  isAnonymous: boolean;
  reporterName: string;
}

const EMPTY: Draft = {
  step: 1,
  hazardType: "",
  severity: "medium",
  island: "",
  settlement: "",
  address: "",
  headline: "",
  description: "",
  isAnonymous: true,
  reporterName: "",
};

function loadDraft(): Draft {
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    if (raw) return { ...EMPTY, ...(JSON.parse(raw) as Partial<Draft>) };
  } catch {
    /* corrupt draft — start clean */
  }
  return EMPTY;
}

const TILE_ICONS: Record<HazardType, typeof Waves> = {
  flooding: Waves,
  power_outage: Zap,
  road_hazard: AlertTriangle,
  weather: Wind,
  fire: Flame,
  safety: ShieldAlert,
};

export function ReportForm() {
  const router = useRouter();
  const fire = useConfetti();
  const [draft, setDraft] = useState<Draft>(EMPTY);
  const [hydrated, setHydrated] = useState(false);
  const [busy, setBusy] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [doneId, setDoneId] = useState<string | null>(null);

  // Restore the half-written report after mount (never wipe it on step change).
  // rAF callback keeps the hydration out of the effect body (repo pattern).
  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      setDraft(loadDraft());
      setHydrated(true);
    });
    return () => cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
    } catch {
      /* storage full or private mode — the form still works for this visit */
    }
  }, [draft, hydrated]);

  const set = <K extends keyof Draft>(key: K, value: Draft[K]) => setDraft((d) => ({ ...d, [key]: value }));

  const settlements = settlementsFor(draft.island);
  const canStep1 = Boolean(draft.hazardType);
  const canStep2 = Boolean(draft.island && draft.settlement);
  const canSubmit = Boolean(draft.headline.trim()) && canStep1 && canStep2;

  const submit = async () => {
    if (!canSubmit || busy) return;
    setBusy(true);
    setSubmitError(null);
    try {
      const res = await fetch("/api/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: draft.headline.trim(),
          description: draft.description.trim(),
          hazardType: draft.hazardType,
          severity: draft.severity,
          island: draft.island,
          settlement: draft.settlement,
          address: draft.address.trim(),
          isAnonymous: draft.isAnonymous,
          reporterName: draft.isAnonymous ? null : draft.reporterName.trim() || null,
        }),
      });
      const data = await res.json();
      if (!res.ok || data.success === false) throw new Error(data.error ?? "Could not broadcast that report.");
      setDoneId(data.report.id);
      fire();
      try {
        localStorage.removeItem(DRAFT_KEY);
      } catch {
        /* ignore */
      }
      window.setTimeout(() => {
        router.push(`/map?report=${encodeURIComponent(data.report.id)}`);
      }, 1600);
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Could not broadcast that report.");
    } finally {
      setBusy(false);
    }
  };

  /* ------------------------------------------------ success panel */
  if (doneId) {
    return (
      <div
        role="status"
        className="nbx-card flex flex-col items-center gap-3 border-hz-ok/40 bg-hz-ok/10 p-8 text-center"
      >
        <span className="text-hz-ok">
          <CheckCircle2 size={40} aria-hidden />
        </span>
        <h2 className="nbx-h2 text-ink">Broadcast to the map</h2>
        <p className="nbx-body max-w-[42ch] text-ink-2">
          Your incident is live on the radar for {islandFor(draft.island)?.name ?? "your island"}. Neighbours can
          confirm what they see. Taking you there now…
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <ReportStepper current={draft.step} />

      {/* ------------------------------------------------ STEP 1 — WHAT */}
      {draft.step === 1 ? (
        <section aria-label="What happened" className="flex flex-col gap-5">
          <div>
            <h2 className="nbx-h3 text-ink">What is happening?</h2>
            <p className="nbx-body text-ink-2">Pick the hazard that fits best — you can add detail in step 3.</p>
          </div>

          <div role="radiogroup" aria-label="Hazard type" className="grid grid-cols-2 gap-3 lg:grid-cols-3">
            {(Object.keys(HAZARD_META) as HazardType[]).map((k) => {
              const meta = HAZARD_META[k];
              const Icon = TILE_ICONS[k];
              const on = draft.hazardType === k;
              return (
                <button
                  key={k}
                  type="button"
                  role="radio"
                  aria-checked={on}
                  className="nbx-tile"
                  data-on={on}
                  onClick={() => set("hazardType", k)}
                >
                  <span
                    className="grid h-10 w-10 shrink-0 place-items-center rounded-[12px]"
                    style={{
                      background: `color-mix(in srgb, var(${meta.colorVar}) 15%, transparent)`,
                      color: `var(${meta.textVar})`,
                    }}
                  >
                    <Icon size={20} aria-hidden />
                  </span>
                  <span>
                    <span className="block text-ink">{meta.label}</span>
                    <span className="mt-0.5 block text-[12px] font-semibold text-ink-3">{meta.blurb}</span>
                  </span>
                </button>
              );
            })}
          </div>

          <fieldset className="flex flex-col gap-2">
            <legend className="nbx-label text-ink-3">How bad is it?</legend>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {(["low", "medium", "high", "critical"] as Severity[]).map((s) => (
                <button
                  key={s}
                  type="button"
                  className="nbx-seg"
                  aria-pressed={draft.severity === s}
                  onClick={() => set("severity", s)}
                >
                  {s === "critical" ? "Critical" : s === "high" ? "High" : s === "medium" ? "Medium" : "Low"}
                </button>
              ))}
            </div>
            <p className="text-[12px] font-semibold text-ink-3">
              Save &quot;Critical&quot; for immediate danger to people or property.
            </p>
          </fieldset>

          <Btn
            variant="primary"
            className="w-full"
            disabled={!canStep1}
            onClick={() => set("step", 2)}
          >
            Continue
          </Btn>
        </section>
      ) : null}

      {/* ------------------------------------------------ STEP 2 — WHERE */}
      {draft.step === 2 ? (
        <section aria-label="Where is it" className="flex flex-col gap-5">
          <div>
            <h2 className="nbx-h3 text-ink">Where is it?</h2>
            <p className="nbx-body text-ink-2">Island first, then the settlement — a street or landmark helps neighbours find it.</p>
          </div>

          <label className="flex flex-col gap-1.5">
            <span className="nbx-label text-ink-3">Island</span>
            <select
              className="nbx-field"
              value={draft.island}
              onChange={(e) => {
                const code = e.target.value;
                const first = settlementsFor(code)[0]?.name ?? "";
                setDraft((d) => ({ ...d, island: code, settlement: first }));
              }}
            >
              <option value="">Choose your island</option>
              {ISLANDS.map((i) => (
                <option key={i.code} value={i.code}>
                  {i.name}
                </option>
              ))}
            </select>
          </label>

          {draft.island ? (
            <fieldset className="flex flex-col gap-2">
              <legend className="nbx-label text-ink-3">Settlement</legend>
              <div className="flex flex-wrap gap-2">
                {settlements.map((s) => (
                  <button
                    key={s.name}
                    type="button"
                    className="nbx-tile min-h-[44px] rounded-full px-4 py-2 text-[13px]"
                    aria-pressed={draft.settlement === s.name}
                    data-on={draft.settlement === s.name}
                    onClick={() => set("settlement", s.name)}
                  >
                    {s.name}
                  </button>
                ))}
              </div>
            </fieldset>
          ) : null}

          <label className="flex flex-col gap-1.5">
            <span className="nbx-label text-ink-3">Street or landmark (optional)</span>
            <input
              type="text"
              className="nbx-field"
              placeholder="Bay Street, Gladstone Road, Glass Window Bridge…"
              value={draft.address}
              onChange={(e) => set("address", e.target.value)}
              maxLength={160}
            />
          </label>

          <div className="flex gap-3">
            <Btn variant="ghost" className="flex-1" onClick={() => set("step", 1)}>
              Back (1/3)
            </Btn>
            <Btn variant="primary" className="flex-[2]" disabled={!canStep2} onClick={() => set("step", 3)}>
              Continue (2/3)
            </Btn>
          </div>
        </section>
      ) : null}

      {/* ------------------------------------------------ STEP 3 — DETAILS */}
      {draft.step === 3 ? (
        <section aria-label="Details" className="flex flex-col gap-5">
          <div>
            <h2 className="nbx-h3 text-ink">Tell neighbours what matters</h2>
            <p className="nbx-body text-ink-2">WHAT, WHERE, HOW BAD, HOW SURE — in that order.</p>
          </div>

          <label className="flex flex-col gap-1.5">
            <span className="nbx-label text-ink-3">Headline (required)</span>
            <input
              type="text"
              className="nbx-field"
              placeholder="Water across the lane after heavy squall — Bay Street"
              value={draft.headline}
              onChange={(e) => set("headline", e.target.value)}
              maxLength={140}
              required
            />
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="nbx-label text-ink-3">Details (optional)</span>
            <textarea
              className="nbx-field min-h-[120px]"
              placeholder="Road condition, safe bypass, help needed…"
              value={draft.description}
              onChange={(e) => set("description", e.target.value)}
              maxLength={2000}
            />
          </label>

          <div className="rounded-[16px] border border-edge p-4">
            <div className="flex items-center gap-3">
              <button
                type="button"
                role="switch"
                aria-checked={draft.isAnonymous}
                className="nbx-switch"
                onClick={() => set("isAnonymous", !draft.isAnonymous)}
              >
                <span className="nbx-switch-knob" aria-hidden />
              </button>
              <span className="text-[14px] font-bold text-ink">Post anonymously</span>
            </div>
            <p className="mt-2 text-[12px] leading-relaxed text-ink-2">
              Your name is never shown when this is on. Neighbours still see the incident and can confirm it —
              anonymous posting is respected.
            </p>
            {!draft.isAnonymous ? (
              <label className="mt-3 flex flex-col gap-1.5">
                <span className="nbx-label text-ink-3">Name or call sign</span>
                <input
                  type="text"
                  className="nbx-field"
                  placeholder="Marcus B."
                  value={draft.reporterName}
                  onChange={(e) => set("reporterName", e.target.value)}
                  maxLength={60}
                />
              </label>
            ) : null}
          </div>

          {submitError ? <ErrorState message={submitError} /> : null}

          <div className="flex gap-3">
            <Btn variant="ghost" className="flex-1" onClick={() => set("step", 2)}>
              Back (2/3)
            </Btn>
            <Btn
              variant="gold"
              className="flex-[2]"
              disabled={!canSubmit}
              loading={busy}
              icon={<Send size={16} aria-hidden />}
              onClick={submit}
            >
              Broadcast Incident to Map
            </Btn>
          </div>
          {!canSubmit ? (
            <p className="text-[12px] font-semibold text-ink-3">
              Add a headline before broadcasting — one line is enough.
            </p>
          ) : null}
        </section>
      ) : null}
    </div>
  );
}
