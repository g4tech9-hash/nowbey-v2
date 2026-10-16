/**
 * Incident Command -- the staff view of every report on the island.
 *
 * The public map is what residents see; this is the same table with the levers
 * attached: edit the details, move it through its lifecycle, or fold a duplicate
 * into the report it duplicates.
 *
 * Server component: it fetches, filters and paginates. Everything interactive
 * lives in IncidentCommand.tsx, which PATCHes /api/admin/incidents. Keeping the
 * split here matters -- the table re-renders from the URL, so a filtered view
 * survives a refresh and can be linked to.
 */

import { notFound } from "next/navigation";
import { and, desc, eq, type SQL } from "drizzle-orm";
import { sql } from "drizzle-orm";
import { db } from "@/db";
import { incidents } from "@/db/schema";
import { getViewer } from "@/lib/viewer";
import { timeAgo } from "@/lib/geo";
import { clampInt, likeEscape, param } from "@/lib/validate";
import { FilterChips, Pager, SearchBox, StatCard } from "@/components/admin-ui";
import { IncidentCommand } from "@/components/incident-command";

export const dynamic = "force-dynamic";
export const metadata = { title: "Incident Command" };

const PAGE = 25;

/** The lifecycle, in the order a human thinks about it. */
const STATUSES = ["active", "resolved", "unfounded"] as const;

/** Pill tones, from the shared admin-ui palette: tide | sun | conch | slate | violet. */
const STATUS_TONE: Record<string, "sun" | "tide" | "slate"> = {
  active: "sun",
  resolved: "tide",
  unfounded: "slate",
};

/** Where a report came from, as the dashboard shows it. */
function sourceLabel(kind: string): { label: string; tone: "violet" | "slate" } {
  // The scanner is the automated police/fire feed; everything else is a person.
  return kind === "scanner" ? { label: "Scanner", tone: "violet" } : { label: "User", tone: "slate" };
}

export default async function IncidentCommandPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const viewer = await getViewer();
  if (!viewer.isAdmin) notFound();

  const sp = await searchParams;
  const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);
  const q = param(first(sp.q), 80);
  const status = STATUSES.includes(first(sp.status) as (typeof STATUSES)[number]) ? (first(sp.status) as string) : "";
  const source = ["scanner", "resident"].includes(first(sp.source) ?? "") ? (first(sp.source) as string) : "";
  const page = clampInt(first(sp.page), 1, 1, 100000);

  const conds: SQL[] = [];
  if (q) {
    const n = `%${likeEscape(q)}%`;
    // Search the title, the address and the reporter: "Bay Street" and
    // "mario242" are both reasonable things to type into this box.
    const match = sql`(${incidents.title} ilike ${n} or ${incidents.address} ilike ${n} or ${incidents.authorHandle} ilike ${n})`;
    conds.push(match);
  }
  if (status) conds.push(eq(incidents.status, status));
  if (source) conds.push(eq(incidents.sourceKind, source));
  const where = conds.length ? and(...conds) : undefined;

  const [{ n }] = await db.select({ n: sql<number>`count(*)::int` }).from(incidents).where(where);
  const pages = Math.max(1, Math.ceil(n / PAGE));

  const rows = await db
    .select({
      id: incidents.id,
      title: incidents.title,
      details: incidents.details,
      category: incidents.category,
      severity: incidents.severity,
      status: incidents.status,
      sourceKind: incidents.sourceKind,
      sourceName: incidents.sourceName,
      address: incidents.address,
      parish: incidents.parish,
      lat: incidents.lat,
      lng: incidents.lng,
      authorHandle: incidents.authorHandle,
      confirmations: incidents.confirmations,
      sightings: incidents.sightings,
      createdAt: incidents.createdAt,
      resolvedAt: incidents.resolvedAt,
    })
    .from(incidents)
    .where(where)
    .orderBy(desc(incidents.createdAt))
    .limit(PAGE)
    .offset((page - 1) * PAGE);

  // Counts for the tiles above the table. Three small queries in parallel is
  // cheaper than one GROUP BY over the whole table on every page load.
  const [byStatus, bySource] = await Promise.all([
    db.select({ status: incidents.status, n: sql<number>`count(*)::int` }).from(incidents).groupBy(incidents.status),
    db.select({ kind: incidents.sourceKind, n: sql<number>`count(*)::int` }).from(incidents).groupBy(incidents.sourceKind),
  ]);
  const statusCount = Object.fromEntries(byStatus.map((r) => [r.status, r.n]));
  const sourceCount = Object.fromEntries(bySource.map((r) => [r.kind, r.n]));

  return (
    <div className="mx-auto max-w-[1200px] py-6">
      <header className="mb-5">
        <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#6e97a0]">Command</p>
        <h1 className="display mt-1 text-[26px] font-extrabold text-sand-100">Incident Command</h1>
        <p className="mt-1 max-w-[70ch] text-[13px] text-[#a9cdc9]">
          Every report on the island. Edit the details, move it through its lifecycle, or merge a duplicate into the report it
          duplicates.
        </p>
      </header>

      <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="Active" value={statusCount.active ?? 0} tone={(statusCount.active ?? 0) > 0 ? "warn" : undefined} />
        <StatCard label="Resolved" value={statusCount.resolved ?? 0} />
        <StatCard label="Unfounded" value={statusCount.unfounded ?? 0} />
        <StatCard
          label="Scanner vs user"
          value={`${sourceCount.scanner ?? 0} / ${sourceCount.resident ?? 0}`}
          sub="automated feed / filed by a person"
        />
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <SearchBox path="/admin/incidents" q={q} placeholder="Title, address or reporter…" keep={{ status, source }} />
        <FilterChips
          label="Status"
          name="status"
          value={status}
          path="/admin/incidents"
          params={{ q, source }}
          options={STATUSES.map((s) => ({ value: s, label: s[0].toUpperCase() + s.slice(1) }))}
        />
        <FilterChips
          label="Source"
          name="source"
          value={source}
          path="/admin/incidents"
          params={{ q, status }}
          options={[
            { value: "scanner", label: "Scanner" },
            { value: "resident", label: "User" },
          ]}
        />
      </div>

      <IncidentCommand
        rows={rows.map((r) => ({
          ...r,
          createdAt: r.createdAt.toISOString(),
          resolvedAt: r.resolvedAt ? r.resolvedAt.toISOString() : null,
          // Dates cross the server/client boundary as ISO strings; the client
          // formats them with the same helper the server uses.
          ago: timeAgo(r.createdAt),
          source: sourceLabel(r.sourceKind),
        }))}
        statusTone={STATUS_TONE}
      />

      {pages > 1 ? (
        <div className="mt-5">
          <Pager page={page} pages={pages} path="/admin/incidents" params={{ q, status, source }} />
        </div>
      ) : null}

      {!rows.length ? (
        <p className="glass mt-4 rounded-2xl px-4 py-10 text-center text-[13px] text-[#a9cdc9]">
          {q || status || source ? "Nothing matches those filters." : "No incidents yet."}
        </p>
      ) : null}
    </div>
  );
}
