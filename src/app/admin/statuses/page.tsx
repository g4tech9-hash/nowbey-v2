import { desc } from "drizzle-orm";
import { db } from "@/db";
import { serviceStatuses } from "@/db/schema";
import { ServiceStatusForm, DeleteServiceStatus } from "@/components/admin-service-status";
import { timeAgo } from "@/lib/geo";

export const dynamic = "force-dynamic";
export const metadata = { title: "Essential-service status" };

export default async function StatusAdminPage() {
  let rows: (typeof serviceStatuses.$inferSelect)[] = [];
  let migrated = true;
  try { rows = await db.select().from(serviceStatuses).orderBy(desc(serviceStatuses.updatedAt)).limit(100); } catch { migrated = false; }
  return <div className="space-y-5">
    <div><p className="text-[11.5px] font-bold uppercase tracking-wide text-tide-400">Operations</p><h1 className="display text-2xl font-extrabold text-sand-100">What is open now</h1><p className="mt-1 text-[13px] text-[#a9cdc9]">Publish short-lived, sourced operating updates during outages and storms. Entries expire automatically.</p></div>
    {!migrated ? <div className="rounded-xl border border-sun-500/40 bg-sun-500/10 p-3 text-[13px] text-sun-400">Run <code>src/db/add-community-utility.sql</code> before publishing statuses.</div> : <section className="glass rounded-2xl p-4"><ServiceStatusForm /></section>}
    <section><h2 className="display text-[15px] font-extrabold text-sand-100">Current and previous entries</h2>{rows.length ? <ul className="mt-2 space-y-2">{rows.map((r) => <li key={r.id} className="glass flex flex-wrap items-center gap-2 rounded-xl px-3 py-2 text-[12px]"><strong className="text-sand-100">{r.name}</strong><span className="rounded-full bg-white/8 px-2 py-0.5">{r.status}</span><span>{r.parish}</span><span className="text-[#6e97a0]">{timeAgo(r.updatedAt)}</span><span className="ml-auto"><DeleteServiceStatus id={r.id} /></span></li>)}</ul> : <p className="mt-2 text-[12.5px] text-[#6e97a0]">No statuses published.</p>}</section>
  </div>;
}
