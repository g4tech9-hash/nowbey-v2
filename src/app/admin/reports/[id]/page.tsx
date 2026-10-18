import Link from "next/link";
import { notFound } from "next/navigation";
import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { incidentUpdates, incidents } from "@/db/schema";
import { getViewer } from "@/lib/viewer";
import { CATEGORIES, type CategoryKey, timeAgo } from "@/lib/geo";
import { UUID_RE } from "@/lib/validate";
import { ReportActions } from "@/components/admin-actions";
import { ReportEditor, ReportMerge } from "@/components/admin-report-detail";
import { Pill } from "@/components/admin-ui";

export const dynamic = "force-dynamic";
export const metadata = { title: "Report" };

/** Incident Command detail: one report, its status, its history, and the tools to fix it. */
export default async function ReportDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const viewer = await getViewer(); // the layout has already turned non-staff away
  const { id } = await params;
  if (!UUID_RE.test(id)) notFound();
  const [r] = await db.select().from(incidents).where(eq(incidents.id, id)).limit(1);
  if (!r) notFound();
  const updates = await db.select().from(incidentUpdates).where(eq(incidentUpdates.incidentId, id)).orderBy(desc(incidentUpdates.createdAt)).limit(30);
  const c = CATEGORIES[r.category as CategoryKey] ?? CATEGORIES.notice;

  return (
    <div className="space-y-4">
      <Link href="/admin/reports" className="text-[12px] font-bold text-tide-300 hover:underline">
        ← All reports
      </Link>

      <div className="glass space-y-2 rounded-2xl p-4">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[11.5px] font-extrabold uppercase tracking-wide" style={{ color: c.color }}>{c.label}</span>
          <Pill tone={r.status === "active" ? "sun" : r.status === "archived" ? "conch" : "slate"}>
            {r.status === "archived" ? "hidden" : r.status}
          </Pill>
          <span className="text-[11.5px] text-tertiary">{timeAgo(r.createdAt)} · {r.confirmations} confirmed · {r.sightings} sightings</span>
        </div>
        <h2 className="display text-[clamp(1.3rem,3.4vw,1.8rem)] font-extrabold text-sand-100">{r.title}</h2>
        <p className="text-[12.5px] text-secondary">
          {[r.street, r.address, r.parish].filter(Boolean).join(" · ") || "unmapped"} · by @{r.authorHandle ?? "someone"}
          {" "}· source: {r.sourceKind}
          {" "}· <Link href={`/incident/${r.id}`} className="font-bold text-tide-300 underline">public page</Link>
        </p>
        <p className="font-mono text-[11.5px] text-tertiary">id: {r.id}</p>
        <div className="pt-1">
          <ReportActions id={r.id} status={r.status} canDelete={viewer.isAdmin} />
        </div>
      </div>

      <div className="glass rounded-2xl p-4">
        <h3 className="mb-3 text-[13px] font-extrabold uppercase tracking-wide text-sand-100">Edit details</h3>
        <ReportEditor report={{ id: r.id, title: r.title, details: r.details, category: r.category, severity: r.severity, street: r.street, parish: r.parish }} />
      </div>

      <div className="glass rounded-2xl p-4">
        <h3 className="mb-1 text-[13px] font-extrabold uppercase tracking-wide text-sand-100">Merge a duplicate</h3>
        <p className="mb-3 text-[12px] text-secondary">
          Find the duplicate in the reports list, copy its id, and paste it here. This report survives.
        </p>
        <ReportMerge id={r.id} />
      </div>

      <div className="glass rounded-2xl p-4">
        <h3 className="mb-2 text-[13px] font-extrabold uppercase tracking-wide text-sand-100">History</h3>
        {updates.length === 0 ? (
          <p className="text-[12.5px] text-secondary">No updates yet.</p>
        ) : (
          <ul className="space-y-1.5">
            {updates.map((u) => (
              <li key={u.id} className="text-[12.5px] text-secondary">
                <span className="font-bold text-sand-100">[{u.kind}]</span> {u.note ?? "—"}{" "}
                <span className="text-tertiary">· {u.authorHandle ?? "someone"} · {timeAgo(u.createdAt)}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
