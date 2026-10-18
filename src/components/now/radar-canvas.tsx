"use client";

/**
 * Radar canvas (Master Build Section 7 — Screen 2): deep navy sea, topo grid,
 * two range rings, compass + coords readout, and settlement-level pins with
 * radar ping rings. Pins cluster by settlement label; CRITICAL outranks.
 */
import { useMemo } from "react";
import { Compass, Navigation, Radar as RadarIcon } from "lucide-react";
import { HAZARD_META, islandFor, radarXY, type HazardType } from "@/lib/bahamas";
import type { SafetyReport } from "@/lib/safety-store";
import { BahamasShape } from "./bahamas-shape";

interface Cluster {
  key: string;
  label: string;
  lat: number;
  lng: number;
  reports: SafetyReport[];
  top: SafetyReport;
  critical: boolean;
}

const SEV_RANK: Record<string, number> = { critical: 4, high: 3, medium: 2, low: 1 };

function clusterReports(reports: SafetyReport[]): Cluster[] {
  const map = new Map<string, Cluster>();
  for (const r of reports) {
    const key = (r.settlement || r.address || `${r.lat},${r.lng}`).trim().toLowerCase();
    const existing = map.get(key);
    if (!existing) {
      map.set(key, {
        key,
        label: r.settlement || r.address || r.island,
        lat: r.lat,
        lng: r.lng,
        reports: [r],
        top: r,
        critical: r.severity === "critical",
      });
    } else {
      existing.reports.push(r);
      existing.critical = existing.critical || r.severity === "critical";
      const better =
        (SEV_RANK[r.severity] ?? 0) > (SEV_RANK[existing.top.severity] ?? 0) ||
        ((SEV_RANK[r.severity] ?? 0) === (SEV_RANK[existing.top.severity] ?? 0) &&
          +new Date(r.createdAt) > +new Date(existing.top.createdAt));
      if (better) existing.top = r;
    }
  }
  return [...map.values()];
}

export function RadarCanvas({
  reports,
  selectedId,
  onSelect,
  island,
}: {
  reports: SafetyReport[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  island?: string;
}) {
  const clusters = useMemo(() => clusterReports(reports), [reports]);
  const coords = islandFor(island ?? "")?.coordsReadout ?? "LAT 25 04 N · LON 77 20 W";
  const sector = islandFor(island ?? "")?.code ?? "ALL SECTORS";

  return (
    <div className="nbx-radar relative h-[320px] w-full sm:h-[380px] lg:h-full lg:min-h-0">
      {/* radar header row */}
      <div className="absolute inset-x-0 top-0 z-[3] flex flex-wrap items-center gap-2 px-4 pt-3">
        <span className="nbx-pulse-dot" aria-hidden />
        <span className="inline-flex items-center gap-1.5 text-[12px] font-bold text-radar-ink">
          <RadarIcon size={14} aria-hidden />
          Bahamas Marine &amp; Coastal Radar 242
        </span>
        <span className="nbx-label-xs rounded-full border border-aqua/40 px-2 py-0.5 text-aqua">
          {sector === "ALL SECTORS" ? "ALL SECTORS" : `${sector} SECTOR`}
        </span>
      </div>

      {/* archipelago silhouette — pins share its projection */}
      <BahamasShape />

      {/* range rings */}
      <div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-1/2 aspect-square h-[86%] -translate-x-1/2 -translate-y-1/2 rounded-full border border-aqua/15"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-1/2 aspect-square h-[52%] -translate-x-1/2 -translate-y-1/2 rounded-full border border-aqua/10"
      />

      {/* compass */}
      <div className="absolute right-4 top-14 z-[3] flex flex-col items-center gap-1 text-radar-ink">
        <Navigation size={18} aria-hidden className="text-aqua-bright" />
        <span className="nbx-label-xs">N</span>
      </div>

      {/* coords readout */}
      <p className="nbx-num absolute bottom-3 left-4 z-[3] text-[12px] font-bold tracking-[0.08em] text-radar-ink">
        {coords}
      </p>

      {/* pins */}
      {clusters.map((c) => {
        const { x, y } = radarXY(c.lat, c.lng);
        const selected = c.reports.some((r) => r.id === selectedId);
        const meta = HAZARD_META[c.top.hazardType as HazardType] ?? HAZARD_META.safety;
        return (
          <button
            key={c.key}
            type="button"
            className="nbx-pin"
            aria-current={selected ? "true" : undefined}
            aria-label={`${c.label} — ${c.reports.length} incident${c.reports.length === 1 ? "" : "s"}`}
            style={{ left: `${x * 100}%`, top: `${y * 100}%`, "--nb-pin-color": `var(${meta.colorVar})` } as React.CSSProperties}
            onClick={() => onSelect(c.top.id)}
          >
            <span
              className="nbx-pin-dot"
              style={{ background: `var(${meta.colorVar})` }}
              aria-hidden
            />
            <span className="max-w-[110px] overflow-hidden text-ellipsis">{c.label}</span>
            {c.reports.length > 1 ? (
              <span className="nbx-num rounded-full border border-edge px-1.5 text-[10px] text-ink-2">
                {c.reports.length}
              </span>
            ) : null}
            {c.critical ? (
              <span className="rounded-full bg-hz-critical px-1.5 py-0.5 text-[9px] font-extrabold tracking-[0.06em] text-white">
                CRITICAL
              </span>
            ) : null}
          </button>
        );
      })}

      {clusters.length === 0 ? (
        <div className="absolute inset-0 grid place-items-center">
          <p className="flex items-center gap-2 rounded-full border border-edge bg-surface px-4 py-2 text-[13px] font-bold text-ink-2">
            <Compass size={16} aria-hidden />
            No incidents match
          </p>
        </div>
      ) : null}
    </div>
  );
}
