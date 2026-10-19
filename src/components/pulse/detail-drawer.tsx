"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Bookmark, ExternalLink, Radio, Undo2 } from "lucide-react";
import { CATEGORIES, formatCoord, timeAgo, type CategoryKey } from "@/lib/geo";
import {
  AccuracyCard,
  ActionPill,
  ConfirmButton,
  Drawer,
  FreshnessPill,
  TrustCard,
  TrustMeter,
  CatBadge,
  SeverityTag,
} from "@/ui/pulse";
import { trustFor } from "@/lib/pulse/trust";
import { useWatchList } from "@/lib/pulse/saved";
import { UPDATE_LABELS } from "@/components/incident-card";
import type { PulseCardRow } from "./incident-card";
import { useIncidentUpdate } from "./use-incident-update";

/**
 * The detail drawer — progressive disclosure in one gesture.
 *
 * Everything that makes a report believable (accuracy, who filed it, how the
 * timeline unfolded, what the island made of it) lives behind the card, and
 * nothing else is on the card. Opening the drawer marks the report as seen on
 * this device, traps focus, moves the URL to the permalink, and returns focus to
 * the card when it closes. The full page at `/incident/:id` stays the canonical
 * destination — the drawer is a preview of it, not a replacement, which is why
 * the footer's last action is "Open full report".
 */

type Update = { id: string; kind: string; note: string | null; authorHandle: string | null; createdAt: string };

export function IncidentDetailDrawer({
  row,
  handle,
  onClose,
  onPrev,
  onNext,
  stub = false,
}: {
  row: PulseCardRow | null;
  handle: string | null;
  onClose: () => void;
  onPrev?: () => void;
  onNext?: () => void;
  stub?: boolean;
}) {
  const [updates, setUpdates] = useState<Update[] | null>(null);
  const [failed, setFailed] = useState(false);
  const rowId = row?.id ?? null;
  const { send, pending } = useIncidentUpdate(row?.id ?? "", handle, stub);
  const watch = useWatchList();

  // The timeline is the one thing a card cannot carry, so it is fetched on open
  // from the endpoint that already exists — /api/incidents/:id. Keyed on the id
  // (not the row object) so re-renders of the same open report never refetch.
  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect -- Opening a different report must not show the previous report's timeline for a frame, so the reset is
    synchronous with the key change. Deriving it instead would mean caching per-row content in a component
    that deliberately owns none. */
    if (!rowId || stub) {
      setUpdates(null);
      return;
    }
    let live = true;
    setUpdates(null);
    setFailed(false);
    fetch(`/api/incidents/${rowId}`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error("gone"))))
      .then((d) => live && setUpdates(Array.isArray(d?.updates) ? (d.updates as Update[]) : []))
      .catch(() => live && setFailed(true));
    return () => {
      live = false;
    };
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [rowId, stub]);

  // ← / → move through the stream without closing the sheet.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowDown" || e.key === "ArrowRight") {
        e.preventDefault();
        onNext?.();
      } else if (e.key === "ArrowUp" || e.key === "ArrowLeft") {
        e.preventDefault();
        onPrev?.();
      }
    };
    if (row) window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [row, onNext, onPrev]);

  if (!row) return null;

  const trust = trustFor({
    confirmations: row.confirmations,
    sightings: row.sightings,
    sourceKind: row.sourceKind,
    severity: row.severity,
    status: row.status,
    updatedAt: row.updatedAt,
    createdAt: row.createdAt,
    hasPhotoNote: !!row.photoNote,
    category: row.category,
  });
  const saved = watch.ids.has(row.id);
  const meta = CATEGORIES[row.category as CategoryKey] ?? CATEGORIES.notice;
  const seen = updates ?? [];

  return (
    <Drawer
      open
      onClose={onClose}
      remember={{ id: row.id, title: row.title }}
      labelledBy="pulse-drawer-title"
      eyebrow={
        <div className="flex flex-wrap items-center gap-2">
          <CatBadge category={row.category} size="sm" />
          <SeverityTag severity={row.severity} category={row.category} />
          <FreshnessPill freshness={row.status === "resolved" ? "stale" : "live"} time={row.updatedAt} label={timeAgo(row.updatedAt)} />
        </div>
      }
      title={row.title}
      footer={
        <>
          <ConfirmButton
            count={row.confirmations}
            active={false}
            label="Still there"
            busyLabel={pending === "confirm" ? "Saving…" : "Saving…"}
            onToggle={async () => {
              const out = await send("confirm");
              if (!out.ok) throw new Error(out.message);
            }}
          />
          <ActionPill tone="neutral" ariaLabel="Mark that you saw it too" disabled={pending !== null} onClick={() => void send("photo", "I saw it too.")}>
            <Undo2 size={14} strokeWidth={2.4} aria-hidden />
            {pending === "photo" ? "Saving…" : "Saw it too"}
          </ActionPill>
          <ActionPill
            tone="accent"
            active={saved}
            ariaLabel={saved ? "Remove from watch list" : "Watch this report on this device"}
            onClick={() =>
              watch.toggle({
                id: row.id,
                title: row.title,
                category: row.category as CategoryKey,
                parish: row.parish ?? null,
                street: row.street ?? null,
                severity: row.severity,
                confirmations: row.confirmations,
                createdAt: String(row.createdAt),
              })
            }
          >
            <Bookmark size={14} strokeWidth={2.4} aria-hidden />
            {saved ? "Watching" : "Watch"}
          </ActionPill>
          <Link href={`/incident/${row.id}`} className="nb-btn nb-btn-primary nb-btn-sm ml-auto">
            Open full report
            <ExternalLink size={14} strokeWidth={2.4} aria-hidden />
          </Link>
        </>
      }
    >
      {row.details ? <p className="text-[14px] leading-[1.78] text-secondary">{row.details}</p> : null}

      {row.photoNote ? (
        <p className="pulse-callout mt-3">
          <span className="pulse-callout-label">Photo note</span>
          {row.photoNote}
        </p>
      ) : null}

      {row.sourceKind === "official" ? (
        <p className="pulse-callout mt-3" data-tone="info">
          <span className="pulse-callout-label">
            <Radio size={13} strokeWidth={2.4} aria-hidden /> Official bulletin
          </span>
          Imported from {row.sourceName ?? "an official source"} — the department’s own words, not a resident’s.
        </p>
      ) : null}

      <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2">
        <TrustMeter value={trust.value} tier={trust.tier} label="How much to believe this" />
        <span className="text-[12px] text-tertiary">
          reported by @{row.anonymous ? "someone" : (row.authorHandle ?? "someone")} · {row.confirmations} confirm
          {row.confirmations === 1 ? "" : "s"} · {row.sightings} saw it too
        </span>
      </div>

      <section className="mt-5">
        <h3 className="pulse-section-title">Where exactly</h3>
        <AccuracyCard
          lat={row.lat}
          lng={row.lng}
          accuracyMeters={row.accuracyMeters}
          address={row.address}
          street={row.street}
          parish={row.parish}
          pinApproximated={!row.accuracyMeters}
          mapHref={`/map?focus=${row.id}`}
        />
        <p className="mt-2 font-mono text-[11.5px] text-tertiary">
          {formatCoord(row.lat, "lat")} {formatCoord(row.lng, "lng")} · {meta.label}
        </p>
      </section>

      <section className="mt-5">
        <h3 className="pulse-section-title">Timeline</h3>
        {stub ? (
          <p className="text-[12.5px] text-tertiary">This walkthrough is not connected to the wire, so the timeline is not live.</p>
        ) : failed ? (
          <p className="pulse-inline-warn" role="status">
            The timeline did not load. The report above is still real — it came with the feed.
          </p>
        ) : updates === null ? (
          <ul className="pulse-timeline" aria-label="Loading timeline">
            {[0, 1, 2].map((i) => (
              <li key={i} className="pulse-timeline-item">
                <span className="pulse-skeleton" style={{ height: 34, width: "100%" }} aria-hidden />
              </li>
            ))}
          </ul>
        ) : (
          <ol className="pulse-timeline">
            {seen.map((u) => (
              <li key={u.id} className="pulse-timeline-item">
                <p className="text-[12.5px] text-secondary">
                  <span className="font-bold text-primary">{UPDATE_LABELS[u.kind] ?? u.kind}</span>
                  {u.note ? <span className="text-tertiary"> — {u.note}</span> : null}
                </p>
                <p className="font-mono text-[11px] text-tertiary">
                  @{u.authorHandle ?? "someone"} · {timeAgo(u.createdAt)}
                </p>
              </li>
            ))}
            <li className="pulse-timeline-item">
              <p className="text-[12.5px] text-secondary">
                <span className="font-bold text-primary">Report filed</span>
              </p>
              <p className="font-mono text-[11px] text-tertiary">
                @{row.authorHandle ?? "someone"} · {timeAgo(row.createdAt)}
              </p>
            </li>
          </ol>
        )}
      </section>

      <section className="mt-5">
        <h3 className="pulse-section-title">Should you believe it</h3>
        <TrustCard
          trust={trust}
          sourceKind={row.sourceKind}
          sourceName={row.sourceName}
          sourceUrl={row.sourceUrl}
          href={`/incident/${row.id}`}
        />
      </section>

      <p className="mt-5 flex flex-wrap gap-2">
        <Link href={`/report?fix=${row.id}`} className="pulse-mini-link">
          The pin is wrong — fix it
        </Link>
        <Link href={`/incident/${row.id}#discussion`} className="pulse-mini-link">
          Read the discussion
        </Link>
        <Link href={`/incident/${row.id}`} className="pulse-mini-link">
          Share this report
        </Link>
      </p>
    </Drawer>
  );
}
