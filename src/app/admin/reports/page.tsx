import Link from "next/link";
import { and, desc, eq, ilike, or, sql, type SQL } from "drizzle-orm";
import { db } from "@/db";
import { incidentUpdates, incidents } from "@/db/schema";
import { getViewer } from "@/lib/viewer";
import { CATEGORIES, type CategoryKey, timeAgo } from "@/lib/geo";
import { clampInt, likeEscape, param } from "@/lib/validate";
import { ReportActions } from "@/components/admin-actions";
import { FilterChips, Pager, Pill, SearchBox } from "@/components/admin-ui";

export const dynamic = "force-dynamic";
export const metadata = { title: "Reports" };

const PAGE = 20;
const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

export default async function ReportsAdmin({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const viewer = await getViewer(); // the layout has already turned non-staff away
  const sp = await searchParams;
  const q = param(first(sp.q), 80);
  const status = ["active", "resolved", "archived", "flagged", "all"].includes(first(sp.status) ?? "") ? (first(sp.status) as string) : "active";
  const page = clampInt(first(sp.page), 1, 1, 100000);

  const conds: SQL[] = [];
  if (status === "flagged") {
    conds.push(sql`exists (select 1 from ${incidentUpdates} u where u.incident_id = ${incidents.id} and u.kind = 'flag')`);
    conds.push(sql`${incidents.status} <> 'archived'`);
  } else if (status !== "all") conds.push(eq(incidents.status, status));
  if (q) {
    const n = `%${likeEscape(q)}%`;
    const match = or(ilike(incidents.title, n), ilike(incidents.details, n), ilike(incidents.street, n), ilike(incidents.authorHandle, n));
    if (match) conds.push(match);
  }
  const where = conds.length ? and(...conds) : undefined;

  const [{ n }] = await db.select({ n: sql<number>`count(*)::int` }).from(incidents).where(where);
  const pages = Math.max(1, Math.ceil(n / PAGE));
  const rows = await db
    .select()
    .from(incidents)
    .where(where)
    .orderBy(desc(incidents.createdAt))
    .limit(PAGE)
    .offset((Math.min(page, pages) - 1) * PAGE);
  const params = { q: q || undefined, status: status === "active" ? undefined : status };

  return (
    <div className="space-y-4">
      <div className="glass space-y-3 rounded-2xl p-3.5">
        <SearchBox path="/admin/reports" q={q} placeholder="Search headline, street or author" keep={{ status: params.status }} />
        <FilterChips
          label="Show"
          name="status"
          value={status === "active" ? "" : status}
          path="/admin/reports"
          params={params}
          options={[
            { value: "", label: "Open" },
            { value: "flagged", label: "Reported by readers" },
            { value: "resolved", label: "Resolved" },
            { value: "unfounded", label: "Unfounded" },
            { value: "archived", label: "Hidden" },
            { value: "all", label: "Everything" },
          ]}
        />
      </div>
      <p className="text-[12px] text-secondary">
        {n} {n === 1 ? "report" : "reports"}. Hiding removes a report from every public page and the map, and you can restore it.
      </p>

      <ul className="space-y-2">
        {rows.map((r) => {
          const c = CATEGORIES[r.category as CategoryKey] ?? CATEGORIES.notice;
          return (
            <li key={r.id} className="glass flex flex-wrap items-start justify-between gap-3 rounded-2xl p-3.5" style={{ boxShadow: `inset 3px 0 0 ${c.color}` }}>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[11.5px] font-extrabold uppercase tracking-wide" style={{ color: c.color }}>
                    {c.label}
                  </span>
                  <Pill tone={r.status === "active" ? "sun" : r.status === "archived" ? "conch" : "slate"}>{r.status === "archived" ? "hidden" : r.status}</Pill>
                  <span className="text-[11.5px] text-tertiary">{timeAgo(r.createdAt)}</span>
                </div>
                <Link href={`/incident/${r.id}`} className="mt-1 block text-[14.5px] font-bold text-primary hover:text-text-accent">
                  {r.title}
                </Link>
                <p className="mt-0.5 text-[12px] text-secondary">
                  {r.street ?? "unmapped"} · {r.parish ?? "Bahamas"} · by @{r.authorHandle ?? "someone"}
                  {r.userId ? "" : " (no account)"} · {r.confirmations} confirmed
                </p>
              </div>
              <ReportActions id={r.id} status={r.status} canDelete={viewer.isAdmin} />
            </li>
          );
        })}
        {rows.length === 0 ? <li className="glass rounded-2xl p-5 text-center text-[13px] text-secondary">Nothing here.</li> : null}
      </ul>
      <Pager page={Math.min(page, pages)} pages={pages} path="/admin/reports" params={params} />
    </div>
  );
}
