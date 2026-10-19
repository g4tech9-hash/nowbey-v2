"use client";

import { useState } from "react";
import Link from "next/link";
import { CATEGORIES, type CategoryKey } from "@/lib/geo";
import type { PickResult } from "@/components/map/map-panel";

export type AssistData = {
  ai: boolean;
  suggestion: {
    category: CategoryKey | null;
    severity: number | null;
    headline: string;
    missingInfo: string[];
    confidence: string;
  } | null;
  place: { lat: number; lng: number; parish: string; street: string } | null;
  duplicates: { id: string; title: string; category: string; confirmations: number; distanceM: number | null; strength: "exact" | "similar" }[];
};

const SEVERITY_LABELS = ["Annoying", "Blocking a lane", "Blocking a road", "Dangerous"];

/**
 * Intake copilot card (last wizard step). One tap checks the draft: AI category /
 * severity / headline suggestions, the place named in the words, and reports already
 * on the map nearby. Everything is a suggestion with its own accept button — the
 * reporter keeps every final say, and publishing never waits on this.
 */
export function ReportAssist({
  title,
  details,
  photoNote,
  category,
  severity,
  pick,
  parish,
  onCategory,
  onSeverity,
  onHeadline,
  onMovePin,
}: {
  title: string;
  details: string;
  photoNote: string;
  category: CategoryKey;
  severity: number;
  pick: PickResult | null;
  parish: string;
  onCategory: (c: CategoryKey) => void;
  onSeverity: (s: number) => void;
  onHeadline: (h: string) => void;
  onMovePin: (p: PickResult) => void;
}) {
  const [data, setData] = useState<AssistData | null>(null);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);

  async function check() {
    setBusy(true);
    setFailed(false);
    try {
      const res = await fetch("/api/reports/assist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, details, photoNote, category, severity, parish, lat: pick?.lat, lng: pick?.lng }),
      });
      if (!res.ok) throw new Error("assist failed");
      setData((await res.json()) as AssistData);
    } catch {
      setFailed(true);
    } finally {
      setBusy(false);
    }
  }

  const s = data?.suggestion;
  const categoryDiff = s?.category && s.category !== category ? s.category : null;
  const severityDiff = s?.severity && s.severity !== severity ? s.severity : null;
  const headlineDiff = s?.headline && s.headline.trim() && s.headline.trim() !== title.trim() ? s.headline : null;
  const placeDiff =
    data?.place && pick && Math.abs(data.place.lat - pick.lat) + Math.abs(data.place.lng - pick.lng) > 0.002 ? data.place : null;

  const applyBtn = "rounded-full bg-accent px-2.5 py-1 text-[11.5px] font-extrabold text-on-accent";

  return (
    <div className="rounded-2xl border border-violet/30 bg-violet/10 p-3.5">
      <div className="flex flex-wrap items-center gap-2">
        <p className="display text-[13.5px] font-bold text-primary">✨ Check my report</p>
        <span className="text-[11.5px] text-tertiary">optional — 5 seconds</span>
        <button
          type="button"
          onClick={check}
          disabled={busy || title.trim().length < 5}
          className="ml-auto rounded-full bg-violet px-3.5 py-1.5 text-[12px] font-extrabold text-on-accent disabled:opacity-45"
        >
          {busy ? "Checking…" : data ? "Check again" : "Check it"}
        </button>
      </div>
      <p className="mt-1 text-[11.5px] leading-relaxed text-tertiary">
        Looks for the best category, a clearer headline, the place in your words, and whether neighbours already reported this — you
        accept or ignore each idea.
      </p>

      {failed ? <p className="mt-2 text-[12px] font-semibold text-warn-600">The check could not run just now. Publishing works without it.</p> : null}

      {data && !data.ai && !data.duplicates.length && !data.place ? (
        <p className="mt-2 text-[12px] text-tertiary">Nothing to suggest — no similar reports nearby. (AI wording help is not switched on for this site yet.)</p>
      ) : null}

      {data ? (
        <div className="mt-2 space-y-2">
          {data.duplicates.map((d) => (
            <div key={d.id} className={`rounded-xl px-3 py-2 text-[12.5px] ${d.strength === "exact" ? "bg-danger-500/15" : "bg-white/5"}`}>
              <p className="font-bold text-primary">
                {d.strength === "exact" ? "This exact spot is already on the map:" : "Sounds like one already on the map:"}{" "}
                <Link href={`/incident/${d.id}`} className="text-text-accent underline" target="_blank">
                  {d.title}
                </Link>
              </p>
              <p className="mt-0.5 text-tertiary">
                {CATEGORIES[d.category as CategoryKey]?.label ?? d.category} · confirmed ×{d.confirmations}
                {d.distanceM !== null ? ` · ~${d.distanceM} m from your pin` : ""}. Same thing? Open it and tap “confirm” instead of filing a second
                pin — one strong pin alerts neighbours better than two weak ones.
              </p>
            </div>
          ))}

          {categoryDiff ? (
            <p className="flex flex-wrap items-center gap-2 text-[12.5px] text-tertiary">
              This reads as <strong className="text-primary">{CATEGORIES[categoryDiff].label}</strong> ({s?.confidence} confidence)
              <button type="button" className={applyBtn} onClick={() => onCategory(categoryDiff)}>
                Use {CATEGORIES[categoryDiff].label}
              </button>
            </p>
          ) : null}
          {severityDiff ? (
            <p className="flex flex-wrap items-center gap-2 text-[12.5px] text-tertiary">
              Severity looks more like <strong className="text-primary">{SEVERITY_LABELS[severityDiff - 1]} ({severityDiff}/4)</strong>
              <button type="button" className={applyBtn} onClick={() => onSeverity(severityDiff)}>
                Set {severityDiff}/4
              </button>
            </p>
          ) : null}
          {headlineDiff ? (
            <p className="flex flex-wrap items-center gap-2 text-[12.5px] text-tertiary">
              Clearer headline: <strong className="text-primary">“{headlineDiff}”</strong>
              <button type="button" className={applyBtn} onClick={() => onHeadline(headlineDiff)}>
                Use it
              </button>
            </p>
          ) : null}
          {placeDiff ? (
            <p className="flex flex-wrap items-center gap-2 text-[12.5px] text-tertiary">
              Your words name <strong className="text-primary">{placeDiff.street}, {placeDiff.parish}</strong> — not where the pin is.
              <button
                type="button"
                className={applyBtn}
                onClick={() => onMovePin({ lat: placeDiff.lat, lng: placeDiff.lng, street: placeDiff.street, parish: placeDiff.parish, precisionM: 250 })}
              >
                Move pin there
              </button>
            </p>
          ) : null}
          {s?.missingInfo.length ? (
            <div className="text-[12.5px] text-tertiary">
              <p className="font-bold text-primary">Neighbours would ask:</p>
              <ul className="mt-0.5 list-disc space-y-0.5 pl-5">
                {s.missingInfo.map((q) => (
                  <li key={q}>{q}</li>
                ))}
              </ul>
              <p className="mt-0.5 text-[11.5px] text-tertiary">Add what you know to “What neighbours should know” — or publish as is.</p>
            </div>
          ) : null}
          {data.ai && !categoryDiff && !severityDiff && !headlineDiff && !s?.missingInfo.length && !data.duplicates.length ? (
            <p className="text-[12.5px] font-semibold text-text-accent">✓ This reads clearly as-is. Good to publish.</p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
