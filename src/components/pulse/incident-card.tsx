"use client";

import Link from "next/link";
import { Bookmark, Eye, MapPin, MessageSquare } from "lucide-react";
import type { Badge } from "@/lib/badges";
import type { Engagement } from "@/lib/engage-kinds";
import { UPDATE_LABELS } from "@/components/incident-card";
import { timeAgo, type CategoryKey } from "@/lib/geo";
import { getFreshness, primaryTimeLine } from "@/lib/freshness";
import { isCannedPhotoNote, shouldCollapseTitleBody, isIslandLevelApproximate } from "@/lib/report-utils";
import { useSwipe } from "@/lib/pulse/motion";
import {
  ActionBar,
  ActionPill,
  AvatarStack,
  CardLayered,
  CatBadge,
  ConfirmButton,
  FreshnessPill,
  SeverityTag,
  TrustMeter,
} from "@/ui/pulse";
import { useWatchList } from "@/lib/pulse/saved";
import { trustFor, TRUST_LABEL } from "@/lib/pulse/trust";
import { useIncidentUpdate } from "./use-incident-update";

/**
 * The feed card, Pulse edition.
 *
 * Three layers, read in order: *what* (category chip + severity) → *where and
 * when* (street, coordinates, freshness) → *should I believe it* (trust meter,
 * confirmations, who). Everything a resident needs before they decide to open it
 * or route around it lives in those three lines, which is why the card is the
 * navigation surface as much as the detail page is.
 *
 * Two input models are served at once. On a phone the card is a swipe surface —
 * right to confirm, left for "saw it too" — and the same two actions are real
 * buttons, because a gesture nobody can see is not a feature. On a keyboard the
 * whole card takes focus (the stream owns ↑/↓); Enter opens the drawer.
 */

export type PulseCardRow = {
  id: string;
  title: string;
  details: string | null;
  category: string;
  severity: number;
  lat: number;
  lng: number;
  accuracyMeters: number | null;
  address: string | null;
  street: string | null;
  parish: string | null;
  status: string;
  confirmations: number;
  sightings: number;
  sourceKind: string;
  sourceName: string | null;
  sourceUrl: string | null;
  photoNote: string | null;
  authorHandle: string | null;
  anonymous?: boolean;
  createdAt: string | Date;
  updatedAt: string | Date;
  /** How many neighbours filed the same thing nearby (clustered upstream). */
  clusterCount?: number;
};

export function PulseIncidentCard({
  row,
  index = 0,
  active = false,
  spotlight = false,
  handle = null,
  badge = null,
  eng,
  latest = null,
  onOpen,
  onFocusIndex,
  id,
  stub = false,
}: {
  row: PulseCardRow;
  index?: number;
  /** Keyboard focus ring, owned by the stream so ↑/↓ can paint it. */
  active?: boolean;
  /** The first critical card on an unfiltered feed: bigger, raised, cinematic. */
  spotlight?: boolean;
  handle?: string | null;
  badge?: Badge | null;
  eng?: Engagement;
  latest?: { kind: string; note: string | null; createdAt: string | Date } | null;
  onOpen?: (row: PulseCardRow) => void;
  onFocusIndex?: (index: number) => void;
  id?: string;
  stub?: boolean;
}) {
  const { send, pending } = useIncidentUpdate(row.id, handle, stub);
  const watch = useWatchList();
  const swipe = useSwipe({
    onConfirm: () => void doConfirm(),
    onSawItToo: () => void send("photo", "I saw it too."),
    disabled: spotlight,
  });
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
  const open = () => {
    if (onOpen) {
      onOpen(row);
      return;
    }
    window.location.href = `/incident/${row.id}`;
  };

  async function doConfirm() {
    const out = await send("confirm");
    if (!out.ok) throw new Error(out.message);
  }

  const drag = swipe.swiping ? Math.min(1, Math.abs(swipe.dx) / 88) : 0;

  return (
    <li
      id={id}
      className={`pulse-card-incident${spotlight ? " pulse-spotlight" : ""}`}
      data-focus={active ? "true" : undefined}
      data-swiping={swipe.swiping && !spotlight ? "true" : undefined}
    >
      {/* What the gesture is about to do, stated before you let go. The opacity
          is driven by the drag itself, so the promise grows as you pull. */}
      {spotlight ? null : (
        <>
          <span className="pulse-swipe-hint" data-side="right" style={{ opacity: swipe.dx > 0 ? drag : 0 }} aria-hidden>
            {swipe.intent === "confirm" ? "Release to confirm" : "Swipe to confirm"}
          </span>
          <span className="pulse-swipe-hint" data-side="left" style={{ opacity: swipe.dx < 0 ? drag : 0 }} aria-hidden>
            {swipe.intent === "saw" ? "Release: saw it too" : "Swipe back: saw it too"}
          </span>
        </>
      )}

      <div style={swipe.style} {...swipe.handlers}>
        <CardLayered
          category={row.category}
          spine
          interactive
          raised={spotlight}
          id={id ? `${id}-card` : undefined}
          tabIndex={0}
          role="listitem"
          ariaLabelledby={id ? `${id}-title` : undefined}
          data-focus={active}
          onFocus={() => onFocusIndex?.(index)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              open();
            }
          }}
        >
          <div className="pulse-card-pad">
            <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1.5">
              <CatBadge category={row.category} />
              <SeverityTag severity={row.severity} category={row.category} />
              {/* Band from the one freshness function. The clock lives behind the module
                  default (same convention as timeAgo); the pill re-derives it on its own
                  clock after mount so an open feed never keeps a stale band. */}
              <FreshnessPill freshness={getFreshness(row.updatedAt, "report").band} time={row.updatedAt} label={timeAgo(row.updatedAt)} />
              {row.status !== "active" ? (
                <span className="pulse-chip" data-tone="neutral">
                  {row.status === "resolved" ? "cleared" : row.status}
                </span>
              ) : null}
              {row.sourceKind === "official" ? (
                <span className="pulse-chip" data-tone="info">
                  official bulletin
                </span>
              ) : row.sourceKind === "news" ? (
                <span className="pulse-chip" data-tone="neutral">from the wire</span>
              ) : null}
              {row.clusterCount && row.clusterCount > 1 ? (
                <span className="pulse-chip" data-tone="accent">x{row.clusterCount} neighbours reported this</span>
              ) : null}
            </div>
            <p className="mt-1 font-mono text-[11.5px] text-tertiary tabular-nums">{primaryTimeLine(row.createdAt, row.updatedAt, "report")}</p>

            <h3
              id={id ? `${id}-title` : undefined}
              className={spotlight ? "pulse-spotlight-title" : "pulse-card-title"}
            >
              <Link href={`/incident/${row.id}`} onClick={(e) => (onOpen ? (e.preventDefault(), open()) : undefined)}>
                {row.title}
              </Link>
            </h3>

            {row.details && !shouldCollapseTitleBody(row.title, row.details) ? <p className={`pulse-card-body${spotlight ? "" : " line-clamp-2"}`}>{row.details}</p> : null}

            {row.photoNote && !isCannedPhotoNote(row.photoNote) ? (
              <p className="mt-2.5 flex items-start gap-2 text-[12.5px] text-secondary">
                <Eye size={14} strokeWidth={2.2} aria-hidden style={{ color: "var(--text-accent)", marginTop: 3 }} />
                <span>
                  <span className="font-bold text-primary">Photo note</span> — {row.photoNote}
                </span>
              </p>
            ) : null}

            <p className="mt-2.5 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[12px] text-tertiary">
              <span className="inline-flex items-center gap-1.5 font-bold text-secondary">
                <MapPin size={13} strokeWidth={2.4} aria-hidden style={{ color: "var(--spine, var(--accent))" }} />
                {row.street ?? row.parish ?? "The Bahamas"}
                {isIslandLevelApproximate(row.lat, row.lng) ? <span className="rounded-full border border-amber-400/40 bg-amber-400/10 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-600">Island-level — approximate</span> : null}
              </span>
              {row.parish ? <span>· {row.parish}</span> : null}
              <Link href={`/map?focus=${row.id}`} className="pulse-mini-link ml-auto" onClick={(e) => e.stopPropagation()}>
                On map
              </Link>
            </p>

            {latest ? (
              <p className="mt-2.5 text-[12.5px] text-secondary">
                <span className="pulse-kicker-strong">Latest</span> {UPDATE_LABELS[latest.kind] ?? latest.kind}
                {latest.note ? <span className="text-tertiary"> — {latest.note}</span> : null}
                <span className="text-tertiary"> · {timeAgo(latest.createdAt)}</span>
              </p>
            ) : null}

            <ActionBar>
              <ConfirmButton
                count={row.confirmations}
                active={false}
                small={!spotlight}
                busyLabel={pending === "confirm" ? "Saving…" : "Saving…"}
                onToggle={doConfirm}
              />
              <ActionPill
                tone="neutral"
                ariaLabel="Mark that you saw it too"
                disabled={pending !== null}
                onClick={() => void send("photo", "I saw it too.")}
              >
                <Eye size={14} strokeWidth={2.4} aria-hidden />
                {pending === "photo" ? "Saving…" : `Saw it too${row.sightings ? ` · ${row.sightings}` : ""}`}
              </ActionPill>
              <ActionPill
                tone="accent"
                active={saved}
                ariaLabel={saved ? "Remove from your watch list" : "Watch this report"}
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
              {eng ? (
                <Link href={`/incident/${row.id}#discussion`} className="pulse-mini-link" onClick={(e) => e.stopPropagation()}>
                  <MessageSquare size={13} strokeWidth={2.4} aria-hidden />
                  <span className="font-mono tabular-nums">{eng.total + eng.comments}</span>
                </Link>
              ) : null}
              <span className="ml-auto flex items-center gap-2.5">
                <AvatarStack seed={row.authorHandle ?? row.id} count={1 + Math.min(3, row.confirmations)} size={spotlight ? 28 : 24} />
                <TrustMeter value={trust.value} tier={trust.tier} compact label={`Trust ${trust.value} of 100 — ${TRUST_LABEL[trust.tier] ?? trust.tier}`} />
              </span>
            </ActionBar>
          </div>
        </CardLayered>
      </div>
    </li>
  );
}

/** A single line in a rail — the same grammar as the card, shrunk to 44px. */
export function IncidentRowMini({
  row,
  href,
}: {
  row: { id: string; title: string; category: string; street?: string | null; parish?: string | null; createdAt: string | Date };
  href?: string;
}) {
  const to = href ?? `/incident/${row.id}`;
  return (
    <Link href={to} className="pulse-navtab pulse-navtab-static flex items-center gap-2.5">
      <span className="pulse-catdot" style={{ ["--spine" as string]: `var(--cat-${row.category}, var(--accent))` }} aria-hidden />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[13px] font-bold text-primary">{row.title}</span>
        <span className="block truncate font-mono text-[11px] text-tertiary">
          {row.street ?? row.parish ?? "The Bahamas"} · {timeAgo(row.createdAt)}
        </span>
      </span>
    </Link>
  );
}
