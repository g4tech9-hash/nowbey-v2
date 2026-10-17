"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { MapPanel, type PickResult } from "@/components/map/map-panel";
import { EmergencyNotice } from "@/components/emergency-notice";
import { ReportAssist } from "@/components/report-assist";
import { CATEGORIES, PARISHES, type CategoryKey } from "@/lib/geo";
import { trackFunnel } from "@/lib/funnel-client";
import { CatBadge, NumBadge } from "@/ui/kit";

/* =====================================================================
   Report a hazard — rebuilt 2026-10-17 against reference 1002177491.
   New DOM: stepper card (1 What · 2 Where · 3 Details), map card, and
   the layered form card with category badge + full-width mint Continue.
   Draft persistence, pick logic and submit flow unchanged.
   ===================================================================== */

const STEPS = ["What", "Where", "Details"] as const;
const SEVERITY_LABELS = ["Annoying", "Blocking a lane", "Blocking a road", "Dangerous"] as const;
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

  const [duplicate, setDuplicate] = useState<{ id: string; message: string } | null>(null);
  const [restored, setRestored] = useState(false);

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
      setError(e instanceof Error ? e.message : "Could not publish that.");
    } finally {
      setSaving(false);
    }
  }

  if (duplicate) {
    return (
      <div className="mx-auto w-full max-w-[640px] py-8">
        <div className="nb-card text-center">
          <span
            className="mx-auto grid h-12 w-12 place-items-center rounded-full text-[22px] font-black"
            style={{ background: "var(--nb-gold)", color: "#241a04" }}
          >
            !
          </span>
          <h1 className="display mt-4 text-[24px] font-extrabold">Someone already reported this</h1>
          <p className="mx-auto mt-2.5 max-w-[48ch] text-[13.5px] leading-relaxed" style={{ color: "var(--nb-muted)" }}>
            {duplicate.message}
          </p>
          <p className="mx-auto mt-2 max-w-[48ch] text-[12.5px] leading-relaxed" style={{ color: "var(--nb-faint)" }}>
            Nothing new was published, so your text is still here. Open the existing report to confirm it or add to it, or go
            back and change what you wrote.
          </p>
          <div className="mt-5 flex flex-wrap justify-center gap-2.5">
            <Link href={`/incident/${duplicate.id}`} className="nb-btn nb-btn-primary nb-btn-sm">
              Open the existing report
            </Link>
            <button
              type="button"
              onClick={() => {
                setDuplicate(null);
                setStep(2);
              }}
              className="nb-btn nb-btn-outline nb-btn-sm"
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
      <div className="mx-auto w-full max-w-[640px] py-8">
        <div className="nb-card text-center">
          <span
            className="mx-auto grid h-12 w-12 place-items-center rounded-full text-[22px] font-black"
            style={{ background: "var(--nb-mint)", color: "var(--nb-mint-ink)" }}
          >
            ✓
          </span>
          <h1 className="display mt-4 text-[24px] font-extrabold">It is on the map</h1>
          <p className="mx-auto mt-2.5 max-w-[48ch] text-[13.5px] leading-relaxed" style={{ color: "var(--nb-muted)" }}>
            Your report is live for everyone in {pick?.parish ?? island}. Neighbours can confirm it, add “saw it too”, or mark
            it cleared. The pin is shown a short distance from the exact spot to protect homes.
          </p>
          <div className="mt-5 flex flex-wrap justify-center gap-2.5">
            <Link href={`/incident/${madeId}`} className="nb-btn nb-btn-primary nb-btn-sm">
              Watch this report
            </Link>
            <Link href="/map" className="nb-btn nb-btn-outline nb-btn-sm">
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
              className="nb-btn nb-btn-outline nb-btn-sm"
            >
              Report another spot
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-[860px]">
      <EmergencyNotice />

      <p className="nb-label nb-label-mint">Report a hazard</p>
      <h1 className="display mt-2 text-[clamp(1.75rem,4.5vw,2.4rem)] font-extrabold leading-tight">Three steps, twenty seconds</h1>
      <p className="mt-2.5 max-w-[56ch] text-[15px] leading-relaxed" style={{ color: "var(--nb-muted)" }}>
        Choose a clear spot. Add what neighbours need to know. Your draft stays if you lose the signal.
      </p>

      {/* ---- stepper (reference: 1 What · 2 Where · 3 Details) ---- */}
      <ol className="mt-6 flex items-stretch overflow-hidden rounded-2xl border" style={{ borderColor: "var(--nb-stroke-soft)", background: "rgba(12,34,45,.6)" }}>
        {STEPS.map((label, i) => (
          <li key={label} className="flex flex-[1]">
            {i > 0 ? <span className="my-3 w-px" style={{ background: "var(--nb-stroke-soft)" }} aria-hidden /> : null}
            <button
              type="button"
              onClick={() => setStep(i)}
              className="flex flex-1 items-center justify-center gap-2.5 py-4"
              style={{ opacity: i > step && !pick && i > 0 ? 0.55 : 1 }}
            >
              <NumBadge n={i + 1} off={i !== step} />
              <span className="text-[13.5px] font-bold" style={{ color: i === step ? "var(--nb-mint)" : "var(--nb-faint)" }}>
                {label}
              </span>
              {i === 1 && pick ? (
                <span className="text-[10.5px] font-bold uppercase tracking-wide" style={{ color: "var(--nb-mint)" }}>
                  pinned
                </span>
              ) : null}
            </button>
          </li>
        ))}
      </ol>

      {/* ---- step 0 · WHAT ---- */}
      {step === 0 ? (
        <section className="nb-card mt-5">
          <div className="flex items-center gap-3">
            <CatBadge color={CATEGORIES[category].color}>{CATEGORIES[category].label}</CatBadge>
            <span className="nb-label">What is it?</span>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-4">
            {(Object.keys(CATEGORIES) as CategoryKey[]).map((key) => {
              const c = CATEGORIES[key];
              const active = category === key;
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => chooseCategory(key)}
                  className="rounded-2xl border p-3.5 text-left transition"
                  style={{
                    borderColor: active ? c.color : "var(--nb-stroke)",
                    background: active ? `${c.color}1f` : "var(--nb-surface-2)",
                  }}
                >
                  <span className="block h-2 w-8 rounded-full" style={{ background: c.color }} />
                  <span className="display mt-2.5 block text-[15px] font-extrabold" style={{ color: active ? c.color : "var(--nb-cream)" }}>
                    {c.label}
                  </span>
                  <span className="mt-1 block text-[11.5px] leading-snug" style={{ color: "var(--nb-faint)" }}>
                    {c.blurb}
                  </span>
                </button>
              );
            })}
          </div>
          {category === "power" ? (
            <p className="nb-card-inner mt-4 text-[12.5px] leading-relaxed" style={{ color: "var(--nb-muted)" }}>
              Power out? NowBey shows what neighbours see, but only the utility can restore supply. Report the outage to Bahamas
              Power and Light as well:{ " " }
              <a href="https://bplco.com/services/outages" className="font-bold underline-offset-2 hover:underline" style={{ color: "var(--nb-mint)" }}>
                bplco.com/services/outages
              </a>
              .
            </p>
          ) : null}
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <span className="nb-label">Severity</span>
            <div className="flex flex-wrap gap-1.5">
              {SEVERITY_LABELS.map((label, i) => (
                <button
                  key={label}
                  type="button"
                  onClick={() => setSeverity(i + 1)}
                  className="nb-chip"
                  style={
                    severity === i + 1
                      ? { background: "var(--nb-coral)", borderColor: "var(--nb-coral)", color: "#241408", cursor: "pointer" }
                      : { cursor: "pointer" }
                  }
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
          <button type="button" onClick={() => setStep(1)} className="nb-btn nb-btn-primary nb-btn-block mt-5">
            Continue
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="M4 12h15M13 5.5 19.5 12 13 18.5" />
            </svg>
          </button>
        </section>
      ) : null}

      {/* ---- step 1 · WHERE ---- */}
      {step === 1 ? (
        <div className="mt-5 grid gap-3.5 lg:grid-cols-[minmax(0,1fr)_300px]">
          <section className="overflow-hidden rounded-2xl border" style={{ borderColor: "var(--nb-stroke)" }}>
            <MapPanel
              mode="pick"
              value={pick ? { lat: pick.lat, lng: pick.lng } : null}
              onChange={handlePick}
              pins={[]}
              center={[25.0629, -77.3417]}
              zoom={15}
              initialLayer="hybrid"
              className="h-[58dvh] min-h-[340px] w-full lg:h-[clamp(400px,64vh,620px)]"
            />
            <div className="flex items-center justify-between gap-3 px-4 py-2.5" style={{ background: "var(--nb-surface-1)" }}>
              <span className="nb-label" style={{ fontSize: 9.5 }}>
                Sample map view
              </span>
              <span className="num text-[11px]" style={{ color: "var(--nb-faint)" }}>
                {pick ? `${pick.lat.toFixed(5)}, ${pick.lng.toFixed(5)}` : "tap the map to place the pin"}
              </span>
            </div>
          </section>
          <div className="flex flex-col gap-3.5">
            <div className="nb-card nb-card-tight">
              <p className="display text-[15.5px] font-bold">Where exactly?</p>
              <p className="mt-1.5 text-[12px] leading-relaxed" style={{ color: "var(--nb-muted)" }}>
                Tap the road, junction or spot, then drag the pin tip onto it. Pin the road, not a house: the published pin
                is moved a short distance from the exact spot, so a home cannot be pinpointed. The readout shows how wide
                the screen is in metres.
              </p>
              <div className="nb-card-inner mt-3 text-[12px]" style={{ padding: 12 }}>
                {pick ? (
                  <>
                    <p className="num font-mono text-[11.5px]" style={{ color: "var(--nb-mint)" }}>
                      {pick.lat.toFixed(6)}, {pick.lng.toFixed(6)}
                    </p>
                    <p className="mt-1 font-semibold" style={{ color: "var(--nb-cream)" }}>
                      {pick.street ?? "Finding the street…"}
                    </p>
                    <p className="mt-0.5 text-[11.5px]" style={{ color: "var(--nb-faint)" }}>
                      {pick.address ?? "No matched address yet"}
                    </p>
                    <p className="mt-0.5 text-[11.5px]" style={{ color: "var(--nb-faint)" }}>
                      Parish {pick.parish ?? island} · accuracy estimate ± {pick.precisionM.toFixed(1)} m
                    </p>
                  </>
                ) : (
                  <p style={{ color: "var(--nb-faint)" }}>Nothing pinned yet.</p>
                )}
              </div>
              <label className="nb-field mt-3">
                <span className="nb-field-label nb-label nb-label-mint">Area (locals&apos; name)</span>
                <input
                  value={area}
                  onChange={(e) => setArea(e.target.value)}
                  placeholder={pick?.street ?? "e.g. Bay Street by the bus stand"}
                  className="nb-input"
                  style={{ fontSize: 14, padding: "11px 14px" }}
                />
              </label>
              <label className="mt-2.5 flex items-start gap-2 text-[11.5px] leading-snug" style={{ color: "var(--nb-faint)" }}>
                <input
                  type="checkbox"
                  checked={prefillOn}
                  disabled={!prefillAllowed}
                  onChange={(e) => {
                    setPrefillOn(e.target.checked);
                    const a = e.target.checked && pick ? areaFor(pick) : null;
                    if (a) setArea(a);
                  }}
                  className="mt-0.5 h-3.5 w-3.5 accent-[#43e0cb]"
                />
                <span>
                  Prefill from the pin
                  {!prefillAllowed ? " (currently turned off)" : ""}
                </span>
              </label>
              <select value={island} onChange={(e) => setIsland(e.target.value)} className="nb-select mt-3" style={{ fontSize: 14, padding: "11px 14px" }}>
                {PARISHES.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </div>
            <button type="button" disabled={!pick} onClick={() => setStep(2)} className="nb-btn nb-btn-primary nb-btn-block">
              Continue
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <path d="M4 12h15M13 5.5 19.5 12 13 18.5" />
              </svg>
            </button>
          </div>
        </div>
      ) : null}

      {/* ---- step 2 · DETAILS (reference form card) ---- */}
      {step === 2 ? (
        <div className="mt-5 grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
          <section className="nb-card">
            <CatBadge color={CATEGORIES[category].color}>{CATEGORIES[category].label}</CatBadge>
            <label className="nb-field mt-4">
              <span className="sr-only">Headline</span>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Water across the lane"
                className="nb-input"
                style={{ fontFamily: "var(--font-display)", fontSize: 20, fontWeight: 700, letterSpacing: "-0.01em" }}
              />
            </label>
            <p className="mt-2 text-[13px]" style={{ color: "var(--nb-muted)" }}>
              {area ? `${area.split(",")[0].trim()} · ${area.split(",").slice(1).join(",").trim() || island}` : `${pick?.street ?? "Pinned spot"} · ${pick?.parish ?? island}`}
            </p>
            <label className="nb-field mt-4">
              <span className="nb-field-label nb-label nb-label-mint">What neighbours should know</span>
              <textarea
                value={details}
                onChange={(e) => setDetails(e.target.value)}
                rows={5}
                placeholder="From the traffic light to the pharmacy. Small cars turning back; the bus is using the contraflow lane."
                className="nb-textarea"
              />
            </label>
            <label className="nb-field mt-4">
              <span className="nb-field-label nb-label nb-label-mint">Photo description (optional)</span>
              <input
                value={photoNote}
                onChange={(e) => setPhotoNote(e.target.value)}
                placeholder="Water up to the first step of the bus shelter, facing east"
                className="nb-input"
              />
              <span className="nb-hint">
                Photo uploads are not available yet. A line describing what you see helps neighbours who cannot view images.
              </span>
            </label>
            <div className="mt-4 flex flex-wrap items-center gap-2.5">
              <button
                type="button"
                role="switch"
                aria-checked={anonymous}
                aria-label="Post anonymously"
                onClick={() => {
                  setAnonymous(!anonymous);
                  setAnonTouched(true);
                }}
                className="nb-toggle"
              />
              <span className="text-[13px]" style={{ color: "var(--nb-text)" }}>
                {handle !== "neighbour" ? `Post anonymously instead of as @${handle}` : "Post anonymously"}
              </span>
            </div>
            <div className="mt-4">
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
            </div>
            {error ? (
              <p className="mt-4 rounded-xl px-3.5 py-2.5 text-[12.5px]" style={{ background: "rgba(255,122,107,.12)", color: "#ff7a6b" }}>
                {error}
              </p>
            ) : null}
            <button
              type="button"
              onClick={submit}
              disabled={saving || title.trim().length < 5 || !pick}
              aria-describedby={publishBlocker ? "publish-blocker" : undefined}
              className="nb-btn nb-btn-primary nb-btn-block mt-5"
            >
              {saving ? "Publishing…" : "Publish to NowBey"}
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <path d="M4 12h15M13 5.5 19.5 12 13 18.5" />
              </svg>
            </button>
            {publishBlocker ? (
              <p id="publish-blocker" className="mt-2 text-[12px] font-semibold" style={{ color: "var(--nb-gold)" }}>
                {publishBlocker}
              </p>
            ) : null}
            <button type="button" onClick={() => setStep(1)} className="nb-chip mt-3" style={{ cursor: "pointer", color: "var(--nb-cream)" }}>
              ← Move the pin
            </button>
          </section>

          <aside className="flex flex-col gap-3.5">
            <div className="nb-card nb-card-tight">
              <p className="nb-label">Preview</p>
              <p className="display mt-2 text-[16px] font-extrabold leading-snug">{title.trim() || "Your headline appears here"}</p>
              <p className="mt-1.5 text-[12.5px] leading-relaxed" style={{ color: "var(--nb-muted)" }}>
                {details.trim() || CATEGORIES[category].blurb}
              </p>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <CatBadge color={CATEGORIES[category].color}>{CATEGORIES[category].label}</CatBadge>
                <span className="nb-chip" style={{ fontSize: 11 }}>
                  {area || pick?.street || "area pending"}
                </span>
                <span className="nb-chip" style={{ fontSize: 11 }}>
                  · {SEVERITY_LABELS[Math.min(4, Math.max(1, severity)) - 1]}
                </span>
                {pick ? (
                  <span className="num font-mono text-[11px]" style={{ color: "var(--nb-faint)" }}>
                    {pick.lat.toFixed(5)}, {pick.lng.toFixed(5)}
                  </span>
                ) : null}
              </div>
            </div>
            {pick ? (
              <div className="overflow-hidden rounded-2xl border" style={{ borderColor: "var(--nb-stroke)" }}>
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
          </aside>
        </div>
      ) : null}
    </div>
  );
}
