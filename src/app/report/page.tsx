"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { MapPanel, type PickResult } from "@/components/map/map-panel";
import { EmergencyNotice } from "@/components/emergency-notice";
import { ReportAssist } from "@/components/report-assist";
import { CATEGORIES, PARISHES, type CategoryKey } from "@/lib/geo";
import { trackFunnel } from "@/lib/funnel-client";
import { AriaAnnouncer, CatBadge, MetaChip, SeverityTag } from "@/ui/pulse";
import { useAnnouncer } from "@/lib/pulse/motion";
import { pulseCategoryMeta } from "@/ui/pulse/glyph";

const STEPS = ["What", "Where", "Details", "Check & send"] as const; // one glossary — src/lib/copy.ts REPORT_STEPS
const SEVERITY_LABELS = ["Minor", "Lane blocked", "Road blocked", "Dangerous"] as const;
const prefillAllowed = process.env.NEXT_PUBLIC_PREFILL_AREA !== "0";
/** A report in progress survives a refresh, a dropped signal or a trip to the map. Cleared once it is published. */
const DRAFT_KEY = "nb_report_draft_v1";
/** Outages and water problems are often at someone's home, so they default to posting without a name. */
const PRIVATE_BY_DEFAULT = new Set<CategoryKey>(["flood", "water", "power"]);

type Draft = {
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

function readDraft(): Draft | null {
  try {
    const raw = sessionStorage.getItem(DRAFT_KEY);
    return raw ? (JSON.parse(raw) as Draft) : null;
  } catch {
    return null;
  }
}

function writeDraft(d: Draft) {
  try {
    sessionStorage.setItem(DRAFT_KEY, JSON.stringify(d));
  } catch {
    /* private mode or full storage: the report still works, it just is not remembered */
  }
}

function clearDraft() {
  try {
    sessionStorage.removeItem(DRAFT_KEY);
  } catch {
    /* nothing to clear */
  }
}

export default function ReportWizard() {
  const router = useRouter();
  const { announce, message } = useAnnouncer();
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
  // Once the person touches the anonymous box, their choice wins over the category default.
  const [anonTouched, setAnonTouched] = useState(false);
  const startedRef = useRef(false);

  // Restore a draft once, after mount (sessionStorage is not available during server rendering).
  useEffect(() => {
    const d = readDraft();
    if (d) {
      /* eslint-disable react-hooks/set-state-in-effect -- one-time restore from sessionStorage after mount */
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
        announce("A nearby report already covers this event. Nothing new was published.");
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
      // The success screen is a new document for a screen-reader user who tapped
      // a button at the bottom of a form: say what happened, do not rely on them
      // noticing the swap.
      announce(`Published. Your report “${title.trim()}” is live for ${pick?.parish ?? island}.`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not publish that.");
    } finally {
      setSaving(false);
    }
  }

  if (duplicate) {
    return (
      <div className="mx-auto max-w-[640px] py-8">
        <AriaAnnouncer message={message} />
        <div className="nb-surface pulse-enter rounded-[24px] p-6 text-center sm:p-8">
          <span className="pulse-success-ring" data-tone="warning" aria-hidden>
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
        <AriaAnnouncer message={message} />
        <div className="nb-surface pulse-success pulse-enter rounded-[24px] p-6 text-center sm:p-8">
          <span className="pulse-success-ring" aria-hidden>
            ✓
          </span>
          <h1 className="display mt-4 text-[24px] font-extrabold tracking-[-0.05em] text-sand-100">It is on the map</h1>
          <p className="mx-auto mt-2.5 max-w-[48ch] text-[13.5px] leading-[1.75] text-ink-300">
            Your report is live for everyone in {pick?.parish ?? island}. Neighbours can confirm it, add “saw it too”, or mark
            it cleared. The pin is shown a short distance from the exact spot to protect homes.
          </p>
          <div className="mt-5 flex flex-wrap justify-center gap-2">
            <Link href={`/map?focus=${madeId}`} className="nb-btn nb-btn-primary">
              View on map
            </Link>
            <button
              type="button"
              onClick={() => {
                const url = `${window.location.origin}/incident/${madeId}`;
                if (navigator.share) void navigator.share({ title: title.trim() || "NowBey report", url }).catch(() => {});
                else void navigator.clipboard?.writeText(url).catch(() => {});
              }}
              className="nb-btn nb-btn-secondary"
            >
              Share
            </button>
            <Link href={`/incident/${madeId}`} className="nb-btn nb-btn-secondary">
              Watch this report
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
              Report another hazard
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
      <h1 className="pulse-intro-heading mt-2.5">
        Four steps, <em>twenty seconds</em>
      </h1>
      <p className="nb-hint mt-2 max-w-[62ch]">
        Nothing is published until you press send on the last screen, and everything you type is kept on this device while
        you write — a dropped signal, a refresh or a trip back to the map will not cost you the report.
      </p>

      {/* The step rail is a progress bar you can click: the number is the state
          (done / here / not yet), and a step only unlocks when the one before it
          has what it needs. */}
      <ol className="pulse-steps mt-5" data-step={step + 1}>
        {STEPS.map((label, i) => {
          const done = i < step;
          const locked = i > 0 && !pick && i > step;
          return (
            <li key={label}>
              <button
                type="button"
                onClick={() => setStep(i)}
                aria-current={i === step ? "step" : undefined}
                data-on={i === step ? "true" : undefined}
                data-done={done ? "true" : undefined}
                disabled={locked}
                className="pulse-chip pulse-step"
              >
                <span className="nb-num" aria-hidden>
                  {done ? "✓" : i + 1}
                </span>
                {label}
                {i === 1 && pick ? <MetaChip tone="success">pinned</MetaChip> : null}
              </button>
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
                  aria-pressed={active}
                  className="pulse-pick"
                  data-on={active ? "true" : undefined}
                  style={{ ["--pick-hue" as string]: pulseCategoryMeta(key).token } as React.CSSProperties}
                >
                  <span className="pulse-pick-rail" aria-hidden />
                  <span className="pulse-pick-label">{c.label}</span>
                  <span className="pulse-pick-blurb">{c.blurb}</span>
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
            <span className="nb-label" id="severity-label">Severity</span>
            <div className="flex flex-wrap gap-1.5">
              {["Minor", "Lane blocked", "Road blocked", "Dangerous"].map((label, i) => (
                <button
                  key={label}
                  type="button"
                  onClick={() => setSeverity(i + 1)}
                  aria-pressed={severity === i + 1}
                  data-on={severity === i + 1 ? "true" : undefined}
                  className="nb-chip"
                >
                  {label}
                </button>
              ))}
            </div>
            <span className="ml-auto flex items-center gap-2">
              <SeverityTag severity={severity} category={category} />
              <button type="button" onClick={() => setStep(1)} className="nb-btn nb-btn-primary">
                Next: put it on the map →
              </button>
            </span>
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
                    {pick.precisionM >= 100 ? (
                      <p className="rounded-xl border border-amber-500/40 bg-amber-500/10 px-2.5 py-1.5 text-[11.5px] font-bold text-amber-700">
                        Pin is about {Math.round(pick.precisionM)} m from where you are — move it closer with the arrows or drag the pin tip.
                      </p>
                    ) : null}
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
                  className="mt-0.5 h-4 w-4 accent-tide-500"
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
              aria-describedby={pick ? undefined : "need-a-pin"}
            >
              Next: write it up →
            </button>
            {pick ? null : (
              <p id="need-a-pin" className="nb-hint text-center">
                Tap the map once to drop the pin — that is all this step needs.
              </p>
            )}
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
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Knee-deep water across Bay Street at the bus stand"
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
              <p className="pulse-inline-warn" role="alert">
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
                onClick={() => setStep(3)}
                disabled={title.trim().length < 5 || !pick}
                aria-describedby={publishBlocker ? "publish-blocker" : undefined}
                className="nb-btn nb-btn-primary flex-1"
              >
                Check and send →
              </button>
            </div>
            {publishBlocker ? (
              <p id="publish-blocker" className="text-[12px] font-semibold text-[color:var(--warning)]">
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

      {/* Step 4 — the review. Nothing has been sent yet; this is the one screen
          that says plainly what neighbours will see, where the pin will sit and
          whether your name is on it. The publish action is the only primary on
          the page at this point (Hick's law: one decision per screen). */}
      {step === 3 ? (
        <div className="mt-5 grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
          <div className="space-y-3.5">
            <div className="nb-surface rounded-[20px] p-4 sm:p-5">
              <p className="nb-eyebrow">
                <span className="nb-eyebrow-dot" aria-hidden />
                Going out now
              </p>
              <h2 className="display mt-2 text-[20px] font-extrabold leading-snug tracking-[-0.05em] text-sand-100">
                {title.trim() || "Your headline appears here"}
              </h2>
              <p className="mt-2 text-[13px] leading-[1.75] text-ink-200">
                {details.trim() || "No extra detail — neighbours will see the headline and the pin only."}
              </p>
              {photoNote.trim() ? <p className="nb-hint mt-2">Photo description: {photoNote.trim()}</p> : null}
              <dl className="mt-3.5 grid gap-x-4 gap-y-2 border-t hairline pt-3 sm:grid-cols-2">
                <div>
                  <dt className="nb-label">Category</dt>
                  <dd className="mt-1">
                    <CatBadge category={category} size="sm" />
                  </dd>
                </div>
                <div>
                  <dt className="nb-label">Severity</dt>
                  <dd className="mt-1 text-[13px] font-bold text-sand-100">
                    {SEVERITY_LABELS[Math.min(4, Math.max(1, severity)) - 1]} · {severity}/4
                  </dd>
                </div>
                <div>
                  <dt className="nb-label">Pin</dt>
                  <dd className="mt-1 font-mono text-[12px] text-ink-300 tabular-nums">
                    {pick ? `${pick.lat.toFixed(5)}, ${pick.lng.toFixed(5)}` : "not pinned"} · ± {pick ? pick.precisionM.toFixed(1) : "0"} m
                  </dd>
                </div>
                <div>
                  <dt className="nb-label">Island</dt>
                  <dd className="mt-1 text-[13px] font-bold text-sand-100">{pick?.parish ?? island}</dd>
                </div>
                <div>
                  <dt className="nb-label">Area</dt>
                  <dd className="mt-1 text-[13px] text-ink-200">{area || pick?.street || "read from the pin"}</dd>
                </div>
                <div>
                  <dt className="nb-label">Filed by</dt>
                  <dd className="mt-1 text-[13px] text-ink-200">
                    {anonymous ? "someone (anonymous)" : handle !== "neighbour" ? `@${handle}` : "@neighbour"}
                  </dd>
                </div>
              </dl>
              <label className="mt-3.5 flex items-start gap-2 text-[12.5px] leading-snug text-ink-300">
                <input
                  type="checkbox"
                  checked={anonymous}
                  onChange={(e) => {
                    setAnonymous(e.target.checked);
                    setAnonTouched(true);
                  }}
                  className="mt-0.5 h-4 w-4 accent-tide-500"
                />
                {handle !== "neighbour"
                  ? "Post anonymously instead of as @" + handle
                  : "Post anonymously"}
                <span className="nb-hint block">
                  Anonymous reports still count confirmations; they just do not carry your handle.
                </span>
              </label>
            </div>

            {error ? (
              <p className="pulse-inline-warn" role="alert">
                {error}
              </p>
            ) : null}

            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={() => setStep(2)} className="nb-btn nb-btn-secondary">
                ← Edit the write-up
              </button>
              <button
                type="button"
                onClick={() => {
                  submit();
                  announce("Publishing your report to the island.");
                }}
                disabled={saving || title.trim().length < 5 || !pick}
                className="nb-btn nb-btn-primary flex-1"
              >
                {saving ? "Publishing…" : "Publish to NowBey"}
              </button>
            </div>
            <p className="nb-hint">
              Published pins sit a short distance from the exact spot, so a home cannot be pinpointed from the map.
            </p>
          </div>

          <div className="space-y-3">
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
            <p className="nb-hint">
              That is the spot neighbours will see. If it is wrong, go back a step and drag the pin.
            </p>
          </div>
        </div>
      ) : null}
    </div>
  );
}
