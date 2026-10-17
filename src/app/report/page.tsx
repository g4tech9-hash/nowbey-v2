"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { MapPanel, type PickResult } from "@/components/map/map-panel";
import { EmergencyNotice } from "@/components/emergency-notice";
import { ReportAssist } from "@/components/report-assist";
import { CATEGORIES, PARISHES, type CategoryKey } from "@/lib/geo";

const STEPS = ["What is it?", "Where is it?", "Tell neighbours"] as const;
const SEVERITY_LABELS = ["Annoying", "Blocking a lane", "Blocking a road", "Dangerous"] as const;
const prefillAllowed = process.env.NEXT_PUBLIC_PREFILL_AREA !== "0";
/** A report in progress survives a refresh, a dropped signal or a trip to the map. Cleared once it is published. */
const DRAFT_KEY = "nb_report_draft_v1";

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
  // Set when the server says a nearby report already covers this event. Nothing was published, so the draft stays.
  const [duplicate, setDuplicate] = useState<{ id: string; message: string } | null>(null);
  const [restored, setRestored] = useState(false);

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
      <div className="mx-auto max-w-[640px] py-6">
        <div className="nb-surface rounded-xl2 p-6 text-center">
          <span className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-sun-500 text-[22px] font-black text-abyss-950">
            !
          </span>
          <h1 className="display mt-3 text-[24px] font-extrabold text-sand-100">Someone already reported this</h1>
          <p className="mx-auto mt-2 max-w-[48ch] text-[13.5px] leading-relaxed text-ink-300">{duplicate.message}</p>
          <p className="mx-auto mt-2 max-w-[48ch] text-[12.5px] leading-relaxed text-ink-400">
            Nothing new was published, so your text is still here. Open the existing report to confirm it or add to it, or go
            back and change what you wrote.
          </p>
          <div className="mt-4 flex flex-wrap justify-center gap-2">
            <Link href={`/incident/${duplicate.id}`} className="rounded-full bg-tide-500 px-4 py-2 text-[13px] font-extrabold text-abyss-950">
              Open the existing report
            </Link>
            <button
              type="button"
              onClick={() => {
                setDuplicate(null);
                setStep(2);
              }}
              className="rounded-full border hairline px-4 py-2 text-[13px] font-bold hover:bg-white/5"
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
      <div className="mx-auto max-w-[640px] py-6">
        <div className="nb-surface rounded-xl2 p-6 text-center">
          <span className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-tide-500 text-[22px] font-black text-abyss-950">
            ✓
          </span>
          <h1 className="display mt-3 text-[24px] font-extrabold text-sand-100">It is on the map</h1>
          <p className="mx-auto mt-2 max-w-[48ch] text-[13.5px] leading-relaxed text-ink-300">
            Your report is live for everyone in {pick?.parish ?? island}. Neighbours can confirm it, add “saw it too”, or mark
            it cleared. The pin is shown a short distance from the exact spot to protect homes.
          </p>
          <div className="mt-4 flex flex-wrap justify-center gap-2">
            <Link
              href={`/incident/${madeId}`}
              className="rounded-full bg-tide-500 px-4 py-2 text-[13px] font-extrabold text-abyss-950"
            >
              Watch this report
            </Link>
            <Link href="/map" className="rounded-full border hairline px-4 py-2 text-[13px] font-bold hover:bg-white/5">
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
              className="rounded-full border hairline px-4 py-2 text-[13px] font-bold hover:bg-white/5"
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
      <div className="mb-4"><EmergencyNotice /></div>
      <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-tide-400">Report a hazard</p>

      <h1 className="display mt-1 text-[clamp(1.6rem,4vw,2.2rem)] font-extrabold leading-tight text-sand-100">
        Three steps, twenty seconds
      </h1>

      <ol className="mt-4 flex flex-wrap gap-2">
        {STEPS.map((label, i) => (
          <li key={label}>
            <button
              type="button"
              onClick={() => setStep(i)}
              className={`rounded-full px-3 py-1.5 text-[12px] font-bold transition ${
                i === step ? "bg-sand-100 text-abyss-950" : "border hairline text-ink-300 hover:bg-white/5"
              } ${i > step && !pick && i > 0 ? "opacity-60" : ""}`}
            >
              <span className="mr-1.5 opacity-60">{i + 1}</span>
              {label}
              {i === 1 && pick ? <span className="ml-1.5 text-[10px] text-tide-500">pinned</span> : null}
            </button>
          </li>
        ))}
      </ol>

      {step === 0 ? (
        <div className="mt-4">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
            {(Object.keys(CATEGORIES) as CategoryKey[]).map((key) => {
              const c = CATEGORIES[key];
              const active = category === key;
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => setCategory(key)}
                  className="rounded-2xl border p-3 text-left transition"
                  style={{
                    borderColor: active ? c.color : "rgba(120,220,214,.16)",
                    background: active ? `${c.color}1f` : "rgba(255,255,255,.03)",
                  }}
                >
                  <span className="block h-2 w-8 rounded-full" style={{ background: c.color }} />
                  <span className="display mt-2 block text-[15px] font-extrabold" style={{ color: active ? c.color : "#f6ead8" }}>
                    {c.label}
                  </span>
                  <span className="mt-0.5 block text-[11.5px] leading-snug text-ink-400">{c.blurb}</span>
                </button>
              );
            })}
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <span className="text-[11px] font-bold uppercase tracking-wide text-ink-400">Severity</span>
            <div className="flex gap-1.5">
              {["Annoying", "Blocking a lane", "Blocking a road", "Dangerous"].map((label, i) => (
                <button
                  key={label}
                  type="button"
                  onClick={() => setSeverity(i + 1)}
                  className={`rounded-lg px-2.5 py-1.5 text-[11.5px] font-bold ${
                    severity === i + 1 ? "bg-conch-500 text-abyss-950" : "bg-white/6 text-ink-300 hover:bg-white/12"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={() => setStep(1)}
              className="ml-auto rounded-full bg-tide-500 px-4 py-2 text-[13px] font-extrabold text-abyss-950"
            >
              Next: put it on the map →
            </button>
          </div>
        </div>
      ) : null}

      {step === 1 ? (
        <div className="mt-4 grid gap-3 lg:grid-cols-[minmax(0,1fr)_280px]">
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
          <div className="space-y-3">
            <div className="nb-surface rounded-xl2 p-3.5">
              <p className="display text-[14.5px] font-bold text-sand-100">Where exactly?</p>
              <p className="mt-1 text-[12px] leading-relaxed text-ink-300">
                Tap the road, junction or spot, then drag the pin tip onto it. Pin the road, not a house: the published pin
                is moved a short distance from the exact spot, so a home cannot be pinpointed. The readout shows how wide
                the screen is in metres.
              </p>
              <div className="mt-2.5 space-y-1.5 rounded-xl bg-white/5 p-2.5 text-[12px]">
                {pick ? (
                  <>
                    <p className="font-mono text-[11.5px] text-tide-300">
                      {pick.lat.toFixed(6)}, {pick.lng.toFixed(6)}
                    </p>
                    <p className="font-semibold text-sand-100">{pick.street ?? "Finding the street…"}</p>
                    <p className="text-[11.5px] text-ink-400">{pick.address ?? "No matched address yet"}</p>
                    <p className="text-[11px] text-ink-400">
                      Parish {pick.parish ?? island} · accuracy estimate ± {pick.precisionM.toFixed(1)} m
                    </p>
                  </>
                ) : (
                  <p className="text-ink-400">Nothing pinned yet.</p>
                )}
              </div>
              <label className="mt-2.5 block">
                <span className="text-[11px] font-bold uppercase tracking-wide text-tide-400">Area (locals&apos; name)</span>
                <input
                  value={area}
                  onChange={(e) => setArea(e.target.value)}
                  placeholder={pick?.street ?? "e.g. Bay Street by the bus stand"}
                  className="mt-1 w-full rounded-lg border border-white/10 bg-abyss-950/70 px-2.5 py-2 text-[13px] outline-none focus:border-tide-400"
                />
              </label>
              <label className="mt-2 flex items-start gap-2 text-[11.5px] leading-snug text-ink-400">
                <input
                  type="checkbox"
                  checked={prefillOn}
                  disabled={!prefillAllowed}
                  onChange={(e) => {
                    setPrefillOn(e.target.checked);
                    const a = e.target.checked && pick ? areaFor(pick) : null;
                    if (a) setArea(a);
                  }}
                  className="mt-0.5 h-3.5 w-3.5 accent-[#00c9b7]"
                />
                <span>
                  Prefill from the pin
                  {!prefillAllowed ? " (currently turned off)" : ""}
                </span>
              </label>
              <select
                value={island}
                onChange={(e) => setIsland(e.target.value)}
                className="mt-2.5 w-full rounded-lg border border-white/10 bg-abyss-950/80 px-2 py-1.5 text-[12px] outline-none"
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
              className="w-full rounded-xl bg-tide-500 py-2.5 text-[13px] font-extrabold text-abyss-950 disabled:opacity-40"
            >
              Next: write it up →
            </button>
          </div>
        </div>
      ) : null}

      {step === 2 ? (
        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          <div className="rounded-2xl border border-tide-500/25 bg-tide-500/8 p-3 text-[12px] text-tide-300 lg:hidden">
            <p className="font-bold">Pinned at {pick ? `${pick.lat.toFixed(5)}, ${pick.lng.toFixed(5)}` : "nothing yet"}.</p>
            <p className="text-ink-200">Scroll for the form — a thumbnail of the pin is at the bottom.</p>
          </div>
          <div className="space-y-3">
            <label className="block">
              <span className="text-[11px] font-bold uppercase tracking-wide text-tide-400">Headline</span>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Knee-deep water across Bay Street at the bus stand"
                className="mt-1 w-full rounded-lg border border-white/10 bg-abyss-950/60 px-3 py-2.5 text-[14px] font-semibold outline-none focus:border-tide-400"
              />
            </label>
            <label className="block">
              <span className="text-[11px] font-bold uppercase tracking-wide text-tide-400">What neighbours should know</span>
              <textarea
                value={details}
                onChange={(e) => setDetails(e.target.value)}
                rows={5}
                placeholder="From the traffic light to the pharmacy. Small cars turning back; the bus is using the contraflow lane."
                className="mt-1 w-full resize-none rounded-lg border border-white/10 bg-abyss-950/60 px-3 py-2.5 text-[13.5px] leading-relaxed outline-none focus:border-tide-400"
              />
            </label>
            <label className="block">
              <span className="text-[11px] font-bold uppercase tracking-wide text-tide-400">Photo description (optional)</span>
              <input
                value={photoNote}
                onChange={(e) => setPhotoNote(e.target.value)}
                placeholder="Water up to the first step of the bus shelter, facing east"
                className="mt-1 w-full rounded-lg border border-white/10 bg-abyss-950/60 px-3 py-2 text-[13px] outline-none focus:border-tide-400"
              />
              <span className="mt-1 block text-[10.5px] text-ink-400">
                Photo uploads are not available yet. A line describing what you see helps neighbours who cannot view images.
              </span>
            </label>
            <label className="flex items-center gap-2 text-[12.5px] text-ink-300">
              <input type="checkbox" checked={anonymous} onChange={(e) => setAnonymous(e.target.checked)} className="h-3.5 w-3.5 accent-[#00c9b7]" />
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
              onCategory={setCategory}
              onSeverity={setSeverity}
              onHeadline={setTitle}
              onMovePin={handlePick}
            />
            {error ? <p className="rounded-lg bg-danger-500/15 px-3 py-2 text-[12.5px] text-danger-500">{error}</p> : null}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="rounded-xl border hairline px-3.5 py-2.5 text-[12.5px] font-bold hover:bg-white/5"
              >
                ← Move the pin
              </button>
              <button
                type="button"
                onClick={submit}
                disabled={saving || title.trim().length < 5 || !pick}
                aria-describedby={publishBlocker ? "publish-blocker" : undefined}
                className="flex-1 rounded-xl bg-tide-500 py-2.5 text-[13px] font-extrabold text-abyss-950 disabled:opacity-45"
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
            <div className="nb-surface rounded-xl2 p-3.5">
              <p className="text-[10.5px] font-bold uppercase tracking-[0.16em] text-ink-400">Preview</p>
              <p className="display mt-1 text-[16px] font-extrabold leading-snug text-sand-100">
                {title.trim() || "Your headline appears here"}
              </p>
              <p className="mt-1 text-[12.5px] leading-relaxed text-ink-300">
                {details.trim() || CATEGORIES[category].blurb}
              </p>
              <div className="mt-2 flex flex-wrap items-center gap-2 text-[11.5px] text-ink-400">
                <span className="rounded-full px-2 py-0.5 font-bold" style={{ background: `${CATEGORIES[category].color}26`, color: CATEGORIES[category].color }}>
                  {CATEGORIES[category].label}
                </span>
                <span>{area || pick?.street || "area pending"}</span>
                <span>· {SEVERITY_LABELS[Math.min(4, Math.max(1, severity)) - 1]}</span>
                {pick ? <span className="font-mono text-[10.5px]">{pick.lat.toFixed(5)}, {pick.lng.toFixed(5)}</span> : null}
              </div>
            </div>
            {pick ? (
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
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
