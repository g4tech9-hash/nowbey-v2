import Link from "next/link";
import { notFound } from "next/navigation";
import { desc, sql } from "drizzle-orm";
import { db } from "@/db";
import { adminAudit } from "@/db/schema";
import { getViewer } from "@/lib/viewer";
import { timeAgo } from "@/lib/geo";
import { clampInt } from "@/lib/validate";
import { Pager } from "@/components/admin-ui";

export const dynamic = "force-dynamic";
export const metadata = { title: "Activity" };

const PAGE = 40;

export default async function ActivityPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const viewer = await getViewer();
  if (!viewer.isAdmin) notFound();
  const sp = await searchParams;
  const raw = Array.isArray(sp.page) ? sp.page[0] : sp.page;
  const page = clampInt(raw, 1, 1, 100000);

  const [{ n }] = await db.select({ n: sql<number>`count(*)::int` }).from(adminAudit);
  const pages = Math.max(1, Math.ceil(n / PAGE));
  const rows = await db
    .select()
    .from(adminAudit)
    .orderBy(desc(adminAudit.createdAt))
    .limit(PAGE)
    .offset((Math.min(page, pages) - 1) * PAGE);

  const target = (r: (typeof rows)[number]) => {
    const label = r.targetLabel ?? r.targetId ?? "";
    if (r.targetType === "user" && r.targetLabel) {
      return (
        <Link href={`/admin/users/${r.targetLabel}`} className="font-bold text-sand-100 hover:text-tide-300">
          @{label}
        </Link>
      );
    }
    if (r.targetType === "report" && r.targetId) {
      return (
        <Link href={`/incident/${r.targetId}`} className="font-bold text-sand-100 hover:text-tide-300">
          {label}
        </Link>
      );
    }
    return <span className="font-bold text-sand-100">{label}</span>;
  };

  return (
    <div>
      <p className="mb-3 text-[12px] text-ink-300">
        Everything staff change on someone else&apos;s account, a report or a story, newest first. {n} {n === 1 ? "entry" : "entries"} so far.
      </p>
      <div className="glass nb-scroll overflow-x-auto rounded-2xl">
        <table className="w-full min-w-[640px] text-left text-[12.5px]">
          <thead className="text-[11.5px] uppercase tracking-wide text-ink-400">
            <tr>
              <th className="px-3 py-2">When</th>
              <th className="px-2">Who</th>
              <th className="px-2">Did what</th>
              <th className="px-2">To</th>
              <th className="px-3">Detail</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-t hairline align-top">
                <td className="whitespace-nowrap px-3 py-2 text-ink-300">{timeAgo(r.createdAt)}</td>
                <td className="px-2 py-2 font-bold text-sand-100">@{r.actorHandle}</td>
                <td className="px-2 py-2">
                  <span className="font-mono text-[11.5px] text-tide-300">{r.action}</span>
                </td>
                <td className="max-w-[260px] truncate px-2 py-2">{target(r)}</td>
                <td className="px-3 py-2 text-ink-200">{r.detail ?? ""}</td>
              </tr>
            ))}
            {rows.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-3 py-6 text-center text-ink-300">
                  Nothing has been logged yet.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
      <Pager page={Math.min(page, pages)} pages={pages} path="/admin/activity" params={{}} />
    </div>
  );
}
