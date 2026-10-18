"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { MapPanel, type PickResult } from "@/components/map/map-panel";
import { EmergencyNotice } from "@/components/emergency-notice";
import { ReportAssist } from "@/components/report-assist";
import { CATEGORIES, PARISHES, type CategoryKey } from "@/lib/geo";
import { trackFunnel } from "@/lib/funnel-client";
import { humanError } from "@/lib/error-copy";

const STEPS = ["What is it?", "Where is it?", "Tell neighbours"] as const;
const SEVERITY_LABELS = ["Annoying", "Blocking a lane", "Blocking a road", "Dangerous"] as const;
const prefillAllowed = process.env.NEXT_PUBLIC_PREFILL_AREA !== "0";
/** A report in progress survives a refresh, a dropped signal or a trip to the map. Cleared once it is published. */
const DRAFT_KEY = "nb_report_draft_v1";
/** How long a draft survives. A hazard from yesterday is not a hazard now, so a stale draft is not restored. */
const DRAFT_TTL_MS = 24 * 60 * 60_000;
/** Outages and water problems are often at someone's home, so they default to posting without a name. */
const PRIVATE_BY_DEFAULT = new Set<CategoryKey>(["flood", "water", "power"]);

type Draft = {
  /** When the draft was last written (ms). Used to expire it; absent on drafts written by the old build. */
  savedAt?: number;
  step: number;
  category: CategoryKey;
  severity: number;
  pick: PickResult | null;
  area: string;
  island: string;
  title: string;
  details: string;
  photoNote: string;
  anonymous: boolean;
};

/**
 * Drafts live in localStorage, not sessionStorage.
 *
 * The landing page and /offline both promise that what you were writing is "saved on this device". A
 * sessionStorage value is destroyed when the tab closes — and a phone browser closes tabs without asking,
 * which is exactly the moment (a storm, a battery saver, the app being backgrounded) a half-written hazard
 * report matters most. There is also no timeout, so a draft from last month would reappear as if it were
 * today's. Both are fixed here: a 24-hour expiry and storage that survives the tab.
 *
 * Only the person's own words and their pin are stored, on their own device, and the draft is deleted the
 * moment the report is published.
 */
function readDraft(): Draft | null {
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    if (!raw) return null;
    const d = JSON.parse(raw) as Draft;
    // Old drafts have no savedAt. Treat them as expired rather than resurrecting a stale scene.
    if (!d.savedAt || Date.now() - d.savedAt > DRAFT_TTL_MS) {
      localStorage.removeItem(DRAFT_KEY);
      return null;
    }
    return d;
  } catch {
    return null;
  }
}

function writeDraft(d: Draft) {
  try {
    localStorage.setItem(DRAFT_KEY, JSON.stringify({ ...d, savedAt: Date.now() }));
  } catch {
    /* private mode or full storage: the report still works, it just is not remembered */
  }
}

function clearDraft() {
  try {
    localStorage.removeItem(DRAFT_KEY);
  } catch {
    /* nothing to clear */
  }
}

export default function ReportWizard() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [category, setCategory] = useState<CategoryKey>("flood");
  const [severity, setSeverity] = useState(2);
  const [pick, setPick] = useState<PickResult | null>(null);
  const [area, setArea] = useState("");
  const [prefillOn, setPrefillOn] = useState(prefillAllowed);
  const [title, setTitle] = useState("");
  const [details, setDetails] = useState("");
  const [photoNote, setPhotoNote] = useState("");
  const [island, setIsland] = useState("New Providence");
  const [anonymous, setAnonymous] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [madeId, setMadeId] = useState<string | null>(null);
  const [handle, setHandle] = useState<string>("neighbour");
  // Set when the server says a nearby report already covers this event. Nothing was published, so the draft stays.
  const [duplicate, setDuplicate] = useState<{ id: string; message: string } | null>(null);
  const [restored, setRestored] = useState(false);
  /** True when a saved draft was found on arrival. Drives the "we kept your words" card. */
  const [resumed, setResumed] = useState(false);
  // Once the person touches the anonymous box, their choice wins over the category default.
  const [anonTouched, setAnonTouched] = useState(false);
  const startedRef = useRef(false);

  // Restore a draft once, after mount (localStorage is not available during server rendering).
  // The render that follows is told *whether* something was restored, so the promise the landing page makes
  // ("your draft is saved") is answered on screen instead of leaving a silently re-filled form.
  useEffect(() => {
    const d = readDraft();
    if (d) {
      /*
       * One-time restore from localStorage. This is the "subscribe to an external system" case the rule
       * describes: the server cannot read device storage, so the fields can only be filled after mount.
       * It runs once and is guarded by `restored`, so it cannot cascade.
       */
      /* eslint-disable react-hooks/set-state-in-effect -- one-time read of localStorage after mount */
      setResumed(true);
      setStep(d.step ?? 0);
      setCategory(d.category ?? "flood");
      setSeverity(d.severity ?? 2);
      setPick(d.pick ?? null);
      setArea(d.area ?? "");
      setIsland(d.island ?? "New Providence");
      setTitle(d.title ?? "");
      setDetails(d.details ?? "");
      setPhotoNote(d.photoNote ?? "");
      setAnonymous(Boolean(d.anonymous));
      /* eslint-enable react-hooks/set-state-in-effect */
    }
    setRestored(true);
  }, []);

  // Save on every change, but only after the restore has run, so an empty first render never overwrites a draft.
  useEffect(() => {
    if (!restored || madeId) return;
    writeDraft({ step, category, severity, pick, area, island, title, details, photoNote, anonymous });
  }, [restored, madeId, step, category, severity, pick, area, island, title, details, photoNote, anonymous]);

  /** The area name that goes with a pin: the street the map matched, or failing that the island. */
  function chooseCategory(k: CategoryKey) {
    setCategory(k);
    if (!anonTouched && PRIVATE_BY_DEFAULT.has(k)) setAnonymous(true);
  }

  // Why Publish is off. Shown as text so a disabled button is never a mystery.
  const publishBlocker = !pick
    ? "Drop the pin on the map first: the report needs a spot."
    : title.trim().length < 5
      ? "Add a headline of at least 5 characters to publish."
      : null;

  function areaFor(p: PickResult): string | null {
    if (p.street) return `${p.street}${p.parish ? `, ${p.parish}` : ""}`;
    return p.parish ?? null;
  }

  // The map calls this whenever the pin moves, and again when the street lookup comes back.
  function handlePick(p: PickResult) {
    if (!startedRef.current) {
      startedRef.current = true;
      trackFunnel("report_started");
    }
    setPick(p);
    if (p.parish) setIsland(p.parish);
    const a = prefillOn ? areaFor(p) : null;
    if (a) setArea(a);
  }

  useEffect(() => {
    void fetch("/api/session", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => setHandle(d?.user?.handle ?? "neighbour"))
      .catch(() => {});
  }, []);

  useEffect(() => {
    const el = document.body;
    const onVis = () => {
      el.style.paddingBottom = window.visualViewport ? `${Math.max(0, window.innerHeight - window.visualViewport.height - 12)}px` : "";
    };
    window.visualViewport?.addEventListener("resize", onVis);
    return () => window.visualViewport?.removeEventListener("resize", onVis);
  }, []);

  async function submit() {
    if (!pick) {
      setError("Drop the pin first — the map needs an exact spot.");
      setStep(1);
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/incidents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          details: details.trim(),
          category,
          severity,
          lat: pick.lat,
          lng: pick.lng,
          accuracyMeters: pick.precisionM,
          street: area.split(",")[0]?.trim() || pick.street || null,
          address: pick.address || area,
          parish: pick.parish || island,
          photoNote: photoNote.trim(),
          anonymous,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not publish that.");
      if (data.duplicate) {
        // The server did not create a report. Say so, and keep what the person wrote.
        setDuplicate({
          id: data.incident.id,
          message: data.message ?? "A nearby report already covers this event.",
        });
        return;
      }
      clearDraft();
      trackFunnel("report_published");
      setMadeId(data.incident.id);
      router.refresh();
    } catch (e) {
      setError(humanError(e, "Could not publish that. Your text is still here — try again."));
    } finally {
      setSaving(false);
    }
  }

  if (duplicate) {
    return (
      <div className="mx-auto max-w-[640px] py-8">
        <div className="nb-surface rounded-[24px] p-6 text-center sm:p-8">
          <span className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-sun-500 text-[22px] font-black text-[#04202a]">
            !
          </span>
          <h1 className="display mt-4 text-[24px] font-extrabold tracking-[-0.05em] text-sand-100">Someone already reported this</h1>
          <p className="mx-auto mt-2.5 max-w-[48ch] text-[13.5px] leading-[1.75] text-ink-300">{duplicate.message}</p>
          <p className="mx-auto mt-2 max-w-[48ch] text-[12.5px] leading-[1.75] text-ink-400">
            Nothing new was published, so your text is still here. Open the existing report to confirm it or add to it, or go
            back and change what you wrote.
          </p>
          <div className="mt-5 flex flex-wrap justify-center gap-2">
            <Link href={`/incident/${duplicate.id}`} className="nb-btn nb-btn-primary">
              Open the existing report
            </Link>
            <button
              type="button"
              onClick={() => {
                setDuplicate(null);
                setStep(2);
              }}
              className="nb-btn nb-btn-secondary"
            >
              Back to my report
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (madeId) {
    return (
      <div className="mx-auto max-w-[640px] py-8">
        <div className="nb-surface rounded-[24px] p-6 text-center sm:p-8">
          <span className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-tide-500 text-[22px] font-black text-[#04202a]">
            ✓
          </span>
          <h1 className="display mt-4 text-[24px] font-extrabold tracking-[-0.05em] text-sand-100">It is on the map</h1>
          <p className="mx-auto mt-2.5 max-w-[48ch] text-[13.5px] leading-[1.75] text-ink-300">
            Your report is live for everyone in {pick?.parish ?? island}. Neighbours can confirm it, add “saw it too”, or mark
            it cleared. The pin is shown a short distance from the exact spot to protect homes.
          </p>
          <div className="mt-5 flex flex-wrap justify-center gap-2">
            <Link href={`/incident/${madeId}`} className="nb-btn nb-btn-primary">
              Watch this report
            </Link>
            <Link href="/map" className="nb-btn nb-btn-secondary">
              Back to the map
            </Link>
            <button
              type="button"
              onClick={() => {
                setMadeId(null);
                setStep(0);
                setPick(null);
                setTitle("");
                setDetails("");
                setPhotoNote("");
                setArea("");
              }}
              className="nb-btn nb-btn-secondary"
            >
              Report another spot
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[1000px]">
      <div className="mb-5">
        <EmergencyNotice />
      </div>

      {/* Landing hero grammar: eyebrow, display headline, then the step rail. */}
      <p className="nb-eyebrow">
        <span className="nb-eyebrow-dot" aria-hidden />
        Report a hazard
      </p>
      <h1 className="display mt-2.5 text-[clamp(1.75rem,4.6vw,2.55rem)] font-extrabold leading-[1.04] tracking-[-0.055em] text-sand-100">
        Three steps, <em className="text-tide-500 not-italic">twenty seconds</em>
      </h1>

      {resumed ? (
        <div className="mt-4 flex flex-wrap items-center gap-3 rounded-2xl border border-tide-500/30 bg-tide-500/[.08] px-3.5 py-3">
          <p className="min-w-0 flex-1 text-[12.5px] leading-relaxed text-ink-200">
            <span className="font-bold text-tide-300">We kept your words.</span> This report was saved on this device, so
            it is back where you left it. It is deleted the moment you publish, and forgotten after 24 hours.
          </p>
          <button
            type="button"
            onClick={() => {
              clearDraft();
              setResumed(false);
              setStep(0);
              setCategory("flood");
              setSeverity(2);
              setPick(null);
              setArea("");
              setTitle("");
              setDetails("");
              setPhotoNote("");
              setAnonymous(false);
              setAnonTouched(false);
            }}
            className="nb-btn nb-btn-secondary nb-btn-sm"
          >
            Start fresh
          </button>
        </div>
      ) : null}

      <ol className="mt-5 flex flex-wrap gap-2">
        {STEPS.map((label, i) => {
          // Audit U6: the rail looked like a progress bar but behaved as free navigation, so "Tell neighbours"
          // opened a publish screen with a disabled button and a blocker — having skipped the pin that made
          // publishing possible. A step is now only a button when going there can actually succeed.
          const reachable = i <= 1 || Boolean(pick);
          const inner = (
            <>
              <span className="grid h-[22px] w-[22px] place-items-center rounded-full bg-white/10 text-[11.5px] font-extrabold">
                {i + 1}
              </span>
              {label}
              {i === 1 && pick ? <span className="text-[11.5px] font-extrabold text-tide-500">pinned</span> : null}
            </>
          );
          return (
            <li key={label}>
              {reachable ? (
                <button
                  type="button"
                  onClick={() => setStep(i)}
                  aria-current={i === step ? "step" : undefined}
                  data-on={i === step ? "true" : undefined}
                  className="nb-chip min-h-[40px] px-3.5"
                >
                  {inner}
                </button>
              ) : (
                <span
                  aria-disabled="true"
                  title="Pin the place first"
                  className="nb-chip min-h-[40px] px-3.5 opacity-60"
                >
                  {inner}
                </span>
              )}
            </li>
          );
        })}
      </ol>

      {step === 0 ? (
        <div className="mt-5">
          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-4">
            {(Object.keys(CATEGORIES) as CategoryKey[]).map((key) => {
              const c = CATEGORIES[key];
              const active = category === key;
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => chooseCategory(key)}
                  className="rounded-[16px] border p-3.5 text-left transition duration-200 ease-standard hover:-translate-y-0.5"
                  style={{
                    borderColor: active ? c.color : "rgba(189,223,217,0.14)",
                    background: active ? `${c.color}1f` : "linear-gradient(135deg, rgba(17,42,53,0.97), rgba(8,26,36,0.97))",
                    boxShadow: active ? `0 12px 36px -10px ${c.color}40` : "0 10px 22px rgba(0,0,0,0.14)",
                  }}
                >
                  <span className="block h-2 w-8 rounded-full" style={{ background: c.color }} />
                  <span className="display mt-2.5 block text-[15px] font-extrabold tracking-[-0.04em]" style={{ color: active ? c.color : "#f7f1e7" }}>
                    {c.label}
                  </span>
                  <span className="mt-1 block text-[11.5px] leading-snug text-ink-400">{c.blurb}</span>
                </button>
              );
            })}
          </div>
          {category === "power" ? (
            <p className="mt-3 rounded-xl border hairline p-3 text-[12.5px] leading-relaxed text-ink-300">
              Power out? NowBey shows what neighbours see, but only the utility can restore supply. Report the outage to Bahamas
              Power and Light as well:{" "}
              <a href="https://bplco.com/services/outages" className="font-bold text-tide-300 underline-offset-2 hover:underline">
                bplco.com/services/outages
              </a>
              .
            </p>
          ) : null}
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <span className="text-[11.5px] font-bold uppercase tracking-[0.14em] text-ink-400">Severity</span>
            <div className="flex flex-wrap gap-1.5">
              {["Annoying", "Blocking a lane", "Blocking a road", "Dangerous"].map((label, i) => (
                <button
                  key={label}
                  type="button"
                  onClick={() => setSeverity(i + 1)}
                  data-on={severity === i + 1 ? "true" : undefined}
                  className="nb-chip"
                >
                  {label}
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={() => setStep(1)}
              className="nb-btn nb-btn-primary ml-auto"
            >
              Next: put it on the map →
            </button>
          </div>
        </div>
      ) : null}

      {step === 1 ? (
        <div className="mt-5 grid gap-3.5 lg:grid-cols-[minmax(0,1fr)_300px]">
          <MapPanel
            mode="pick"
            value={pick ? { lat: pick.lat, lng: pick.lng } : null}
            onChange={handlePick}
            pins={[]}
            center={[25.0629, -77.3417]}
            zoom={15}
            initialLayer="hybrid"
            className="h-[58dvh] min-h-[340px] w-full overflow-hidden rounded-[20px] border border-tide-500/20 lg:h-[clamp(400px,64vh,620px)]"
          />
          <div className="space-y-3">
            <div className="nb-surface rounded-[20px] p-4">
              <p className="display text-[15px] font-extrabold tracking-[-0.045em] text-sand-100">Where exactly?</p>
              <p className="mt-1.5 text-[12px] leading-[1.75] text-ink-300">
                Tap the road, junction or spot, then drag the pin tip onto it. Pin the road, not a house: the published pin
                is moved a short distance from the exact spot, so a home cannot be pinpointed. The readout shows how wide
                the screen is in metres.
              </p>
              <div className="mt-3 space-y-1.5 rounded-[14px] border border-white/8 bg-white/[.04] p-3 text-[12px]">
                {pick ? (
                  <>
                    <p className="num font-mono text-[11.5px] text-tide-300">
                      {pick.lat.toFixed(6)}, {pick.lng.toFixed(6)}
                    </p>
                    <p className="font-bold text-sand-100">{pick.street ?? "Finding the street…"}</p>
                    <p className="text-[11.5px] text-ink-400">{pick.address ?? "No matched address yet"}</p>
                    <p className="text-[11.5px] text-ink-400">
                      Parish {pick.parish ?? island} · accuracy estimate ± {pick.precisionM.toFixed(1)} m
                    </p>
                  </>
                ) : (
                  <p className="text-ink-400">Nothing pinned yet.</p>
                )}
              </div>
              <label className="mt-3 block">
                <span className="nb-field-label">Area (locals&apos; name)</span>
                <input
                  value={area}
                  onChange={(e) => setArea(e.target.value)}
                  placeholder={pick?.street ?? "e.g. Bay Street by the bus stand"}
                  className="nb-field"
                />
              </label>
              <label className="mt-2.5 flex items-start gap-2 text-[11.5px] leading-snug text-ink-400">
                <input
                  type="checkbox"
                  checked={prefillOn}
                  disabled={!prefillAllowed}
                  onChange={(e) => {
                    setPrefillOn(e.target.checked);
                    const a = e.target.checked && pick ? areaFor(pick) : null;
                    if (a) setArea(a);
                  }}
                  className="mt-0.5 h-4 w-4 accent-[#43e0cc]"
                />
                <span>
                  Prefill from the pin
                  {!prefillAllowed ? " (currently turned off)" : ""}
                </span>
              </label>
              <select
                value={island}
                onChange={(e) => setIsland(e.target.value)}
                className="nb-field mt-3"
              >
                {PARISHES.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </div>
            <button
              type="button"
              disabled={!pick}
              onClick={() => setStep(2)}
              className="nb-btn nb-btn-primary w-full"
            >
              Next: write it up →
            </button>
          </div>
        </div>
      ) : null}

      {step === 2 ? (
        <div className="mt-5 grid gap-4 lg:grid-cols-2">
          <div className="rounded-[16px] border border-tide-500/25 bg-tide-500/8 p-3.5 text-[12px] leading-[1.75] text-tide-300 lg:hidden">
            <p className="font-bold">Pinned at {pick ? `${pick.lat.toFixed(5)}, ${pick.lng.toFixed(5)}` : "nothing yet"}.</p>
            <p className="text-ink-200">Scroll for the form — a thumbnail of the pin is at the bottom.</p>
          </div>
          <div className="space-y-3.5">
            <label className="block">
              <span className="nb-field-label">Headline</span>
              <input
                id="report-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Knee-deep water across Bay Street at the bus stand"
                aria-invalid={title.trim().length > 0 && title.trim().length < 5 ? true : undefined}
                aria-describedby={publishBlocker ? "publish-blocker" : undefined}
                className="nb-field font-semibold"
              />
            </label>
            <label className="block">
              <span className="nb-field-label">What neighbours should know</span>
              <textarea
                value={details}
                onChange={(e) => setDetails(e.target.value)}
                rows={5}
                placeholder="From the traffic light to the pharmacy. Small cars turning back; the bus is using the contraflow lane."
                className="nb-field resize-y leading-relaxed"
              />
            </label>
            <label className="block">
              <span className="nb-field-label">Photo description (optional)</span>
              <input
                value={photoNote}
                onChange={(e) => setPhotoNote(e.target.value)}
                placeholder="Water up to the first step of the bus shelter, facing east"
                className="nb-field"
              />
              <span className="nb-field-hint">
                Photo uploads are not available yet. A line describing what you see helps neighbours who cannot view images.
              </span>
            </label>
            <label className="flex items-center gap-2 text-[12.5px] text-ink-300">
              <input type="checkbox" checked={anonymous} onChange={(e) => { setAnonymous(e.target.checked); setAnonTouched(true); }} className="h-4 w-4 accent-[#43e0cc]" />
              {handle !== "neighbour" ? `Post anonymously instead of as @${handle}` : "Post anonymously"}
            </label>
            <ReportAssist
              title={title}
              details={details}
              photoNote={photoNote}
              category={category}
              severity={severity}
              pick={pick}
              parish={island}
              onCategory={chooseCategory}
              onSeverity={setSeverity}
              onHeadline={setTitle}
              onMovePin={handlePick}
            />
            {error ? (
              <p
                id="report-error"
                role="alert"
                tabIndex={-1}
                className="rounded-[12px] border border-conch-500/40 bg-conch-500/12 px-3.5 py-2.5 text-[12.5px] text-conch-500"
              >
                {error}
              </p>
            ) : null}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="nb-btn nb-btn-secondary"
              >
                ← Move the pin
              </button>
              <button
                type="button"
                onClick={submit}
                disabled={saving || title.trim().length < 5 || !pick}
                aria-describedby={publishBlocker ? "publish-blocker" : undefined}
                className="nb-btn nb-btn-primary flex-1"
              >
                {saving ? "Publishing…" : "Publish to NowBey"}
              </button>
            </div>
            {publishBlocker ? (
              <p id="publish-blocker" className="text-[12px] font-semibold text-sun-500">
                {publishBlocker}
              </p>
            ) : null}
          </div>

          <div className="space-y-3">
            <div className="nb-surface rounded-[20px] p-4">
              <p className="nb-eyebrow">Preview</p>
              <p className="display mt-2 text-[17px] font-extrabold leading-snug tracking-[-0.045em] text-sand-100">
                {title.trim() || "Your headline appears here"}
              </p>
              <p className="mt-1.5 text-[12.5px] leading-[1.75] text-ink-300">
                {details.trim() || CATEGORIES[category].blurb}
              </p>
              <div className="mt-2.5 flex flex-wrap items-center gap-2 text-[11.5px] text-ink-400">
                <span className="rounded-full px-2.5 py-1 font-bold" style={{ background: `${CATEGORIES[category].color}26`, color: CATEGORIES[category].color }}>
                  {CATEGORIES[category].label}
                </span>
                <span>{area || pick?.street || "area pending"}</span>
                <span>· {SEVERITY_LABELS[Math.min(4, Math.max(1, severity)) - 1]}</span>
                {pick ? <span className="num font-mono text-[11.5px]">{pick.lat.toFixed(5)}, {pick.lng.toFixed(5)}</span> : null}
              </div>
            </div>
            {pick ? (
              <div className="overflow-hidden rounded-[20px] border border-tide-500/20 shadow-l2">
                <MapPanel
                  mode="browse"
                  pins={[
                    {
                      id: "preview",
                      lat: pick.lat,
                      lng: pick.lng,
                      category,
                      title: title.trim() || "Your new pin",
                      meta: area || pick.street || "",
                      live: true,
                    },
                  ]}
                  center={[pick.lat, pick.lng]}
                  zoom={18}
                  initialLayer="hybrid"
                  className="h-[220px] w-full"
                  compact
                />
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
