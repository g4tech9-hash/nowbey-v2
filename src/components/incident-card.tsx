import Link from "next/link";
import { CATEGORIES, type CategoryKey, formatCoord, nowMs, timeAgo } from "@/lib/geo";
import { ageLabel, freshnessFor } from "@/lib/freshness";
import { IncidentActions } from "./incident-actions";
import { BadgeMark } from "./verified-badge";
import { EngagementSummary } from "@/components/engage/summary";
import type { Engagement } from "@/lib/engage-kinds";
import type { Badge } from "@/lib/badges";

export type IncidentRow = {
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
  createdAt: string | Date;
  updatedAt: string | Date;
  resolvedAt?: string | Date | null;
};

/** Words for the timeline entries, as residents see them (the detail page uses the same words). */
export const UPDATE_LABELS: Record<string, string> = {
  confirm: "Confirmed still there",
  photo: "Saw it too",
  note: "Left a note",
  clear: "Marked cleared",
  escalate: "Escalated severity",
};

function SeverityMeter({ level, tone }: { level: number; tone: string }) {
  return (
    <span className="inline-flex items-center gap-[3px]" title={`Severity ${level} of 4`}>
      {[1, 2, 3, 4].map((i) => (
        <span
          key={i}
          className="h-3 w-[5px] rounded-full"
          style={{ background: i <= level ? tone : "rgba(255,255,255,.14)" }}
        />
      ))}
    </span>
  );
}

export function IncidentCard({
  row,
  handle,
  showActions = true,
  badge = null,
  eng,
  latest = null,
}: {
  row: IncidentRow;
  handle?: string | null;
  showActions?: boolean;
  badge?: Badge | null;
  /** Reactions and comments, shown as a link into the conversation. */
  eng?: Engagement;
  /** The newest timeline entry, so a card says what happened last without opening it. */
  latest?: { kind: string; note: string | null; createdAt: string | Date } | null;
}) {
  const meta = CATEGORIES[row.category as CategoryKey] ?? CATEGORIES.notice;
  // Freshness is per category (see src/lib/freshness.ts). Old reports are labelled, never hidden.
  const fresh = freshnessFor(row.category, row.updatedAt, nowMs());
  const stale = fresh.level !== "current";

  return (
    <article
      className="nb-surface nb-card-link relative overflow-hidden rounded-[20px] p-4"
      style={{ boxShadow: `0 10px 22px rgba(0,0,0,0.14), inset 3px 0 0 ${meta.color}` }}
    >
      <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1.5 text-[11.5px] font-bold">
        <span
          className="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 uppercase tracking-[0.1em]"
          style={{ color: meta.color, borderColor: `${meta.color}3d`, background: `${meta.color}14` }}
        >
          <span className="h-2 w-2 rounded-full" style={{ background: meta.color, boxShadow: `0 0 8px ${meta.color}80` }} />
          {meta.label}
        </span>
        <SeverityMeter level={row.severity} tone={meta.color} />
        {row.status !== "active" ? (
          <span className="rounded-full border border-white/12 bg-white/5 px-2.5 py-1 text-[11.5px] text-tertiary">{row.status}</span>
        ) : stale ? (
          <span className="rounded-full border border-warn-500/30 bg-warn-500/12 px-2.5 py-1 text-[11.5px] text-warn-600">
            {fresh.level === "stale" ? "may be out of date" : "needs a re-check"} · {ageLabel(fresh.hoursAgo)}
          </span>
        ) : null}
        {row.sourceKind === "news" ? (
          <span className="rounded-full border border-white/12 bg-white/5 px-2.5 py-1 text-[11.5px] text-tertiary">from the wire</span>
        ) : null}
        <span className="ml-auto text-[11.5px] font-semibold text-tertiary">
          {timeAgo(row.createdAt)}
        </span>
      </div>

      <h3 className="display mt-2.5 text-[17px] font-extrabold leading-snug tracking-[-0.04em] text-primary">
        <Link href={`/incident/${row.id}`} className="transition duration-200 ease-standard hover:text-text-accent">
          {row.title}
        </Link>
      </h3>

      {row.details ? <p className="mt-1.5 line-clamp-2 text-[13px] leading-[1.75] text-tertiary">{row.details}</p> : null}

      <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-[11.5px] text-tertiary">
        <span className="font-bold text-secondary">{row.street ?? "Unmapped spot"}</span>
        {row.parish ? <span>· {row.parish}</span> : null}
        <span className="num font-mono text-[11.5px] text-tertiary">
          {formatCoord(row.lat, "lat")} {formatCoord(row.lng, "lng")}
        </span>
        {row.accuracyMeters ? (
          <span className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[11.5px]">± {Math.round(row.accuracyMeters)} m</span>
        ) : null}
        <Link href={`/map?focus=${row.id}`} className="ml-auto font-bold text-text-accent hover:underline">
          Open on map
        </Link>
      </div>

      {row.address && row.address !== row.street ? (
        <p className="mt-1.5 text-[11.5px] text-tertiary">{row.address}</p>
      ) : null}

      {latest ? (
        <p className="mt-2 text-[12.5px] leading-[1.75] text-secondary">
          <span className="font-bold text-primary">Latest: {UPDATE_LABELS[latest.kind] ?? latest.kind}</span>
          {latest.note ? <span> — {latest.note}</span> : null}
          <span className="text-tertiary"> · {timeAgo(latest.createdAt)}</span>
        </p>
      ) : null}

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[11.5px] font-bold text-secondary">
          {row.confirmations} confirm{row.confirmations === 1 ? "" : "s"}
        </span>
        {row.sightings > 0 ? (
          <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[11.5px] font-bold text-secondary">
            {row.sightings} “saw it too”
          </span>
        ) : null}
        <span className="text-[11.5px] text-tertiary">reported by @{row.authorHandle ?? "someone"}</span>
        <BadgeMark kind={badge} />
      </div>

      {eng ? (
        <div className="mt-2.5">
          <EngagementSummary eng={eng} href={`/incident/${row.id}`} />
        </div>
      ) : null}

      {showActions ? (
        <div className="mt-2.5 border-t hairline pt-2.5">
          <IncidentActions id={row.id} confirmations={row.confirmations} status={row.status} handle={handle} />
        </div>
      ) : null}
    </article>
  );
}

export function IncidentRail({ rows, empty }: { rows: IncidentRow[]; empty: string }) {
  if (!rows.length) return <p className="px-1 text-[12.5px] text-tertiary">{empty}</p>;
  return (
    <ul className="space-y-2">
      {rows.map((row) => {
        const meta = CATEGORIES[row.category as CategoryKey] ?? CATEGORIES.notice;
        return (
          <li key={row.id}>
            <Link href={`/incident/${row.id}`} className="group flex gap-2.5 rounded-xl px-2 py-1.5 hover:bg-white/5">
              <span className="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: meta.color }} />
              <span className="min-w-0">
                <span className="block truncate text-[13px] font-semibold text-primary group-hover:text-text-accent">{row.title}</span>
                <span className="block truncate text-[11.5px] text-tertiary">
                  {row.street ?? row.parish ?? "The Bahamas"} · {timeAgo(row.createdAt)}
                </span>
              </span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
