"use client";

import Link from "next/link";
import { useMemo } from "react";
import { MapPanel, type MapPin } from "@/components/map/map-panel";
import { GAZETTEER, timeAgo, type CategoryKey } from "@/lib/geo";
import { CATEGORIES, nowMs } from "@/lib/geo";
import { getFreshness } from "@/lib/freshness";
import { CatBadge, Lift } from "@/ui/pulse";
import type { FeedRow } from "./feed-stream";

/**
 * The feed's map view — the same query params, a different geometry.
 *
 * It is deliberately not a second map implementation: `/feed?view=map` draws the
 * pins the feed already has, through the same `MapPanel`, and shares a selection
 * with the list beside it. `/map` stays the workspace (full-height map, street
 * view, timeline desk, clustering, all filters). Switching between them is a URL
 * change, so a link you send someone keeps whichever view you were looking at.
 *
 * The list and the map are one selection: hovering or focusing a row flies the
 * map to it, which is why the rows are buttons and not just links.
 */
export function FeedMap({
  rows,
  parish,
  query,
}: {
  rows: FeedRow[];
  parish: string | null;
  /** Link back to the list view carrying the same filters. */
  query: string;
}) {
  const pins: MapPin[] = useMemo(
    () =>
      rows.map((r) => ({
        id: r.id,
        lat: r.lat,
        lng: r.lng,
        category: r.category as CategoryKey,
        title: r.title,
        meta: `${r.confirmations} confirm${r.confirmations === 1 ? "" : "s"} · ${timeAgo(r.createdAt)}`,
        status: r.status,
        href: `/incident/${r.id}`,
        // A pulse on the marker means "someone could still act on this".
        live: r.status === "active" && r.severity >= 3 && getFreshness(r.updatedAt, "report", nowMs()).band === "live",
      })),
    [rows],
  );

  const anchor = parish ? GAZETTEER.find((g) => g.parish === parish) : undefined;
  const center: [number, number] = anchor ? [anchor.lat, anchor.lng] : [24.9, -77.6];
  const zoom = anchor ? 14 : 8;

  return (
    <section className="pulse-map-stage mb-5">
      <div className="pulse-map-frame">
        <MapPanel pins={pins} center={center} zoom={zoom} initialLayer="hybrid" mode="browse" className="h-full w-full" />
      </div>
      <div className="pulse-map-list">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-[14px] font-extrabold tracking-[-0.03em] text-primary">
            {rows.length} pin{rows.length === 1 ? "" : "s"}
            {parish ? ` · ${parish}` : ""}
          </h2>
          <Link href={query} className="pulse-mini-link">
            List view
          </Link>
        </div>
        <ul className="pulse-scroll mt-2 grid max-h-[320px] gap-1 overflow-y-auto lg:max-h-[min(52vh,520px)]">
          {rows.length ? (
            rows.map((r) => (
              <li key={r.id}>
                <Lift>
                  <Link
                    href={`/incident/${r.id}`}
                    className="pulse-navtab pulse-navtab-static flex w-full items-start gap-2.5 text-left"
                  >
                    <span className="mt-1.5">
                      <CatBadge category={r.category} size="sm" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[13px] font-bold text-primary">{r.title}</span>
                      <span className="block truncate font-mono text-[11px] text-tertiary">
                        {r.street ?? r.parish ?? CATEGORIES[r.category as CategoryKey]?.label ?? "The Bahamas"} ·{" "}
                        {timeAgo(r.createdAt)} · {r.confirmations}✓
                      </span>
                    </span>
                  </Link>
                </Lift>
              </li>
            ))
          ) : (
            <li className="pulse-state">
              <p>No pins on this filter. Widen it, or drop the first one.</p>
              <Link href="/report" className="nb-btn nb-btn-primary nb-btn-sm">
                Drop a pin
              </Link>
            </li>
          )}
        </ul>
        <Link href={`/map${parish ? `?island=${encodeURIComponent(parish)}` : ""}`} className="nb-btn nb-btn-secondary nb-btn-sm mt-2.5 w-full">
          Open the full map
        </Link>
      </div>
    </section>
  );
}
