import Link from "next/link";
import { CATEGORIES, type CategoryKey, formatCoord, nowMs, timeAgo } from "@/lib/geo";
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
}: {
  row: IncidentRow;
  handle?: string | null;
  showActions?: boolean;
  badge?: Badge | null;
  /** Reactions and comments, shown as a link into the conversation. */
  eng?: Engagement;
}) {
  const meta = CATEGORIES[row.category as CategoryKey] ?? CATEGORIES.notice;
  const stale = nowMs() - new Date(row.updatedAt).getTime() > 1000 * 60 * 60 * 18;

  return (
    <article
      className="glass relative overflow-hidden rounded-2xl p-3.5 transition hover:border-tide-400/35"
      style={{ boxShadow: `inset 3px 0 0 ${meta.color}` }}
    >
      <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[11px] font-bold uppercase tracking-wide">
        <span style={{ color: meta.color }}>{meta.label}</span>
        <SeverityMeter level={row.severity} tone={meta.color} />
        {row.status !== "active" ? (
          <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] text-ink-300">{row.status}</span>
        ) : stale ? (
          <span className="rounded-full bg-sun-500/15 px-2 py-0.5 text-[10px] text-sun-600">needs a re-check</span>
        ) : null}
        {row.sourceKind === "news" ? (
          <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] text-ink-300">from the wire</span>
        ) : null}
        <span className="ml-auto text-[10.5px] font-semibold normal-case tracking-normal text-ink-400">
          {timeAgo(row.createdAt)}
        </span>
      </div>

      <h3 className="display mt-1.5 text-[16.5px] font-extrabold leading-snug text-sand-100">
        <Link href={`/incident/${row.id}`} className="hover:text-tide-300">
          {row.title}
        </Link>
      </h3>

      {row.details ? <p className="mt-1 line-clamp-2 text-[13px] leading-relaxed text-ink-300">{row.details}</p> : null}

      <div className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-[11.5px] text-ink-400">
        <span className="font-semibold text-ink-200">{row.street ?? "Unmapped spot"}</span>
        {row.parish ? <span>· {row.parish}</span> : null}
        <span className="font-mono text-[10.5px] text-ink-400">
          {formatCoord(row.lat, "lat")} {formatCoord(row.lng, "lng")}
        </span>
        {row.accuracyMeters ? (
          <span className="rounded-md bg-white/8 px-1.5 py-0.5 text-[10.5px]">± {Math.round(row.accuracyMeters)} m</span>
        ) : null}
        <Link href={`/map?focus=${row.id}`} className="ml-auto font-bold text-tide-300 hover:underline">
          Open on map
        </Link>
      </div>

      {row.address && row.address !== row.street ? (
        <p className="mt-1 text-[11.5px] text-ink-400">{row.address}</p>
      ) : null}

      <div className="mt-2.5 flex flex-wrap items-center gap-2">
        <span className="rounded-full bg-white/8 px-2 py-0.5 text-[11px] font-semibold text-ink-200">
          {row.confirmations} confirm{row.confirmations === 1 ? "" : "s"}
        </span>
        {row.sightings > 0 ? (
          <span className="rounded-full bg-white/8 px-2 py-0.5 text-[11px] font-semibold text-ink-200">
            {row.sightings} “saw it too”
          </span>
        ) : null}
        <span className="text-[11.5px] text-ink-400">reported by @{row.authorHandle ?? "someone"}</span>
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
  if (!rows.length) return <p className="px-1 text-[12.5px] text-ink-400">{empty}</p>;
  return (
    <ul className="space-y-2">
      {rows.map((row) => {
        const meta = CATEGORIES[row.category as CategoryKey] ?? CATEGORIES.notice;
        return (
          <li key={row.id}>
            <Link href={`/incident/${row.id}`} className="group flex gap-2.5 rounded-xl px-2 py-1.5 hover:bg-white/5">
              <span className="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: meta.color }} />
              <span className="min-w-0">
                <span className="block truncate text-[13px] font-semibold text-sand-100 group-hover:text-tide-300">{row.title}</span>
                <span className="block truncate text-[11px] text-ink-400">
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
