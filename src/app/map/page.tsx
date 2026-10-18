"use client";

/**
 * SCREEN 2 — LIVE HAZARD RADAR (Master Build Section 7).
 *
 * 12-column workspace: radar canvas (7) + inspector & report rail (5),
 * stacking on phones with the inspector directly under the canvas. Filters
 * (island + category + search) combine; pin click and inspector stay in sync
 * both ways. The rail is windowed (listLimit) with its own scroll owner.
 */
import { Suspense, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Compass, PlusCircle, RefreshCw, Search, Waves, Wind, Zap } from "lucide-react";
import { HAZARD_META, ISLANDS, islandFor, type HazardType } from "@/lib/bahamas";
import type { SafetyReport } from "@/lib/safety-store";
import { RadarCanvas } from "@/components/now/radar-canvas";
import { InspectorPanel } from "@/components/now/inspector-panel";
import { filterBySearch, useReports } from "@/components/now/use-safety";
import { Btn, ErrorState, HazardChip, LoadingState } from "@/components/now/ui";
import { timeAgo } from "@/components/now/format";

export default function MapPage() {
  return (
    <Suspense fallback={<LoadingState label="Opening the radar" />}>
      <RadarScreen />
    </Suspense>
  );
}

function RadarScreen() {
  const searchParams = useSearchParams();
  const paramIsland = searchParams.get("island") ?? "";
  const paramReport = searchParams.get("report") ?? "";

  const [island, setIsland] = useState(paramIsland);
  const [type, setType] = useState("");
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(paramReport || null);
  const [listLimit, setListLimit] = useState(40);

  const { reports, state, error, reload } = useReports(island || undefined, type || undefined);
  const visible = useMemo(() => filterBySearch(reports, search), [reports, search]);

  // Deep link (?report=) wins; otherwise the selection falls back to the first
  // row in view so pin, list and inspector stay in sync — derived, not stored.
  const effectiveSelectedId = useMemo(() => {
    if (paramReport && reports.some((r) => r.id === paramReport)) return paramReport;
    if (visible.length === 0) return null;
    if (selectedId && visible.some((r) => r.id === selectedId)) return selectedId;
    return visible[0].id;
  }, [paramReport, reports, visible, selectedId]);

  const selected: SafetyReport | null = visible.find((r) => r.id === effectiveSelectedId) ?? null;

  return (
    <div className="flex flex-col gap-4">
      {/* ------------------------------------------------ toolbar */}
      <div aria-label="Radar filters" className="flex flex-wrap items-end gap-3">
        <label className="flex min-w-[160px] flex-1 flex-col gap-1.5">
          <span className="nbx-label text-ink-3">Island</span>
          <select
            className="nbx-field"
            value={island}
            onChange={(e) => {
              setIsland(e.target.value);
              setListLimit(40);
            }}
          >
            <option value="">All Islands</option>
            {ISLANDS.map((i) => (
              <option key={i.code} value={i.code}>
                {i.name}
              </option>
            ))}
          </select>
        </label>
        <label className="flex min-w-[170px] flex-1 flex-col gap-1.5">
          <span className="nbx-label text-ink-3">Hazard category</span>
          <select
            className="nbx-field"
            value={type}
            onChange={(e) => {
              setType(e.target.value);
              setListLimit(40);
            }}
          >
            <option value="">All hazards</option>
            {(Object.keys(HAZARD_META) as HazardType[]).map((k) => (
              <option key={k} value={k}>
                {HAZARD_META[k].label}
              </option>
            ))}
          </select>
        </label>
        <label className="flex min-w-[200px] flex-1 flex-col gap-1.5">
          <span className="nbx-label text-ink-3">Search settlement / street</span>
          <span className="relative flex">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-3">
              <Search size={16} aria-hidden />
            </span>
            <input
              type="search"
              className="nbx-field pl-9"
              placeholder="Fox Hill, Bay Street…"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setListLimit(40);
              }}
            />
          </span>
        </label>
        <Btn
          variant="ghost"
          onClick={reload}
          loading={state === "loading"}
          icon={<RefreshCw size={16} aria-hidden className={state === "loading" ? "animate-spin" : ""} />}
          className="px-4"
        >
          Refresh
        </Btn>
      </div>

      {/* ------------------------------------------------ workspace */}
      <div className="nb-map-workspace gap-4 lg:grid lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] lg:items-stretch">
        {/* radar column (7 cols) */}
        <section aria-label="Radar canvas" className="flex min-h-0 flex-col gap-3 lg:h-full">
          <RadarCanvas
            reports={visible}
            selectedId={effectiveSelectedId}
            onSelect={setSelectedId}
            island={island}
          />
          {/* footer legend */}
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
            <p className="nbx-label text-ink-3">What the pins mean</p>
            <span className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-ink-2">
              <span className="h-2.5 w-2.5 rounded-full" style={{ background: "var(--nb-flood)" }} aria-hidden />
              Flooding
            </span>
            <span className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-ink-2">
              <span className="h-2.5 w-2.5 rounded-full" style={{ background: "var(--nb-power)" }} aria-hidden />
              Power
            </span>
            <span className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-ink-2">
              <span className="h-2.5 w-2.5 rounded-full" style={{ background: "var(--nb-road)" }} aria-hidden />
              Roads
            </span>
            <span className="nbx-num ml-auto text-[12px] font-bold text-ink-3">
              Showing {visible.length} of {reports.length} incidents
            </span>
          </div>
        </section>

        {/* inspector + list rail (5 cols) */}
        <section aria-label="Inspector and reports" className="flex min-h-0 flex-col gap-3 lg:h-full">
          <InspectorPanel key={selected?.id ?? "none"} report={selected} />

          {/* Row A — the count */}
          <div className="flex items-center gap-3">
            <p className="nbx-num text-[13px] font-bold text-ink-2">
              {state === "loading" ? "Loading pins…" : `${visible.length} report${visible.length === 1 ? "" : "s"} in view`}
            </p>
            <Link href="/report" className="nbx-btn nbx-btn-gold ml-auto px-3.5 text-[12px]">
              <PlusCircle size={14} aria-hidden />
              Post Incident
            </Link>
          </div>

          <div
            className="nb-pin-rail-scroll nb-scroll mt-1 min-h-0 flex-1 overflow-y-auto overscroll-contain rounded-[16px] border border-edge pb-4 lg:max-h-[380px]"
            tabIndex={0}
            aria-label="Reports in view"
          >
            <details className="px-3 lg:px-0">
              <summary className="cursor-pointer list-none rounded-[12px] px-3 py-2.5 text-[12px] font-bold text-ink-2 hover:text-ink">
                Island activity · {reports.filter((r) => r.status !== "resolved").length} open now
              </summary>
              <ul className="grid grid-cols-2 gap-1.5 px-3 pb-2">
                {ISLANDS.map((i) => (
                  <li key={i.code} className="flex items-center justify-between rounded-[8px] px-2 py-1.5 text-[12px]">
                    <span className="font-semibold text-ink-2">{i.name}</span>
                    <span className="nbx-num font-bold text-ink">
                      {reports.filter((r) => r.island === i.name && r.status !== "resolved").length}
                    </span>
                  </li>
                ))}
              </ul>
            </details>

            {/* Row B — category filters */}
            <div className="flex flex-wrap gap-2 px-3 pt-2 lg:px-0">
              <button
                type="button"
                className="nbx-chip nbx-chip-hz min-h-[44px]"
                style={{ "--nb-chip-color": "var(--nb-aqua)", "--nb-chip-text": "var(--nb-aqua)" } as React.CSSProperties}
                aria-pressed={type === ""}
                data-on={type === ""}
                onClick={() => setType("")}
              >
                <Compass size={13} aria-hidden />
                All hazards
              </button>
              {(Object.keys(HAZARD_META) as HazardType[]).map((k) => (
                <button
                  key={k}
                  type="button"
                  className="nbx-chip nbx-chip-hz min-h-[44px]"
                  style={
                    {
                      "--nb-chip-color": `var(${HAZARD_META[k].colorVar})`,
                      "--nb-chip-text": `var(${HAZARD_META[k].textVar})`,
                    } as React.CSSProperties
                  }
                  aria-pressed={type === k}
                  data-on={type === k}
                  onClick={() => setType(type === k ? "" : k)}
                >
                  {k === "flooding" ? <Waves size={13} aria-hidden /> : k === "power_outage" ? <Zap size={13} aria-hidden /> : k === "weather" ? <Wind size={13} aria-hidden /> : null}
                  {HAZARD_META[k].short}
                </button>
              ))}
            </div>

            {/* report rows */}
            <div className="flex flex-col gap-1.5 px-3 pt-2">
              {state === "loading" && reports.length === 0 ? <LoadingState label="Loading reports" rows={4} /> : null}
              {state === "error" ? <ErrorState message={error} onRetry={reload} /> : null}
              {state === "ready" && visible.length === 0 ? (
                <p className="rounded-[12px] border border-edge p-4 text-center text-[13px] font-semibold text-ink-2">
                  No incidents match this filter. Clear the search or pick another island.
                </p>
              ) : null}
              {state === "ready" && visible.length ? (
                visible.slice(0, listLimit).map((r) => (
                  <button
                    key={r.id}
                    type="button"
                    aria-current={r.id === effectiveSelectedId ? "true" : undefined}
                    onClick={() => setSelectedId(r.id)}
                    className={`flex min-h-[44px] w-full flex-col gap-1 rounded-[12px] border p-3 text-left transition duration-200 ease-out ${
                      r.id === effectiveSelectedId ? "border-aqua bg-aqua/10 shadow-nb-hover" : "border-edge hover:border-aqua/50"
                    }`}
                  >
                    <span className="flex flex-wrap items-center gap-2">
                      <HazardChip type={r.hazardType} />
                      <span className="nbx-label-xs text-ink-3">{r.island}</span>
                      <span className="nbx-num ml-auto text-[11px] font-bold text-ink-3">{timeAgo(r.createdAt)}</span>
                    </span>
                    <span className="line-clamp-1 text-[13px] font-bold text-ink">{r.title}</span>
                    <span className="nbx-num text-[12px] font-semibold text-ink-2">
                      {r.settlement} · {r.confirmedCount} confirmed
                    </span>
                  </button>
                ))
              ) : null}
              {visible.length > listLimit ? (
                <button
                  type="button"
                  className="nbx-btn nbx-btn-ghost w-full"
                  onClick={() => setListLimit((n) => n + 40)}
                >
                  Show more pins ({visible.length - listLimit} left)
                </button>
              ) : null}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
