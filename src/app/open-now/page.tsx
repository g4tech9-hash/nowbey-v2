import { desc, gt, isNull, or } from "drizzle-orm";
import { db } from "@/db";
import { serviceStatuses } from "@/db/schema";
import { PageHead } from "@/components/app-shell";
import { timeAgo } from "@/lib/geo";

export const dynamic = "force-dynamic";
export const metadata = { title: "Open now after a disruption" };

const LABELS: Record<string, string> = { pharmacy: "Pharmacy", food: "Food store", fuel: "Fuel", hardware: "Hardware", water: "Drinking water", charging: "Phone charging", clinic: "Clinic", shelter: "Shelter", other: "Other service" };
const STATUS: Record<string, { label: string; cls: string }> = {
  open: { label: "Open", cls: "bg-tide-500/18 text-tide-300" },
  limited: { label: "Limited service", cls: "bg-sun-500/18 text-sun-600" },
  closed: { label: "Closed", cls: "bg-danger-500/15 text-danger-500" },
  unknown: { label: "Needs a new check", cls: "bg-white/10 text-ink-300" },
};

export default async function OpenNowPage() {
  let rows: (typeof serviceStatuses.$inferSelect)[] = [];
  try {
    rows = await db.select().from(serviceStatuses).where(or(isNull(serviceStatuses.expiresAt), gt(serviceStatuses.expiresAt, new Date()))).orderBy(desc(serviceStatuses.verified), desc(serviceStatuses.updatedAt)).limit(100);
  } catch {
    // Safe during rollout before the additive migration is applied.
  }

  return (
    <div className="mx-auto max-w-[900px]">
      <PageHead eyebrow="Community utility" title="What is open right now?" blurb="Verified operating updates for essential services during outages, storms and other disruptions. Always call ahead when you can." />
      <div className="mb-4 rounded-xl border border-sun-500/35 bg-sun-500/10 p-3 text-[12.5px] text-ink-200">
        Status can change quickly. “Verified” means NowBey staff checked the source—it is not a government guarantee or an emergency service.
      </div>
      {rows.length ? (
        <ul className="grid gap-3 sm:grid-cols-2">
          {rows.map((row) => {
            const state = STATUS[row.status] ?? STATUS.unknown;
            return (
              <li key={row.id} className="nb-surface rounded-xl2 p-4">
                <div className="flex flex-wrap items-start gap-2">
                  <div className="min-w-0 flex-1"><p className="text-[11.5px] font-bold uppercase tracking-wide text-tide-400">{LABELS[row.kind] ?? row.kind}</p><h2 className="display text-[16px] font-extrabold text-sand-100">{row.name}</h2></div>
                  <span className={`rounded-full px-2.5 py-1 text-[11.5px] font-extrabold ${state.cls}`}>{state.label}</span>
                </div>
                <p className="mt-1 text-[12.5px] text-ink-300">{row.address ? `${row.address} · ` : ""}{row.parish}</p>
                {row.note ? <p className="mt-2 text-[13px] leading-relaxed text-ink-200">{row.note}</p> : null}
                <p className="mt-2 text-[11.5px] text-ink-400">Updated {timeAgo(row.updatedAt)}{row.verified ? " · ✓ checked by NowBey" : " · community information"}</p>
                {row.sourceUrl ? <a href={row.sourceUrl} target="_blank" rel="noreferrer" className="mt-1 inline-block text-[11.5px] font-bold text-tide-300 underline">Open source</a> : null}
              </li>
            );
          })}
        </ul>
      ) : (
        <div className="nb-surface rounded-xl2 p-6 text-center"><p className="font-bold text-sand-100">No disruption status board is active.</p><p className="mt-1 text-[12.5px] text-ink-400">That is normal on an ordinary day. Essential-service updates will appear here when staff activate them.</p></div>
      )}
    </div>
  );
}
