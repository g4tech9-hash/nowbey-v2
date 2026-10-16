import { notFound } from "next/navigation";
import { desc } from "drizzle-orm";
import { db } from "@/db";
import { emailLog, enterpriseInquiries } from "@/db/schema";
import { getViewer } from "@/lib/viewer";
import { timeAgo } from "@/lib/geo";
import { EnquiryStatus } from "@/components/admin-actions";
import { Pill } from "@/components/admin-ui";

export const dynamic = "force-dynamic";
export const metadata = { title: "Inbox" };

export default async function InboxPage() {
  const viewer = await getViewer();
  if (!viewer.isAdmin) notFound();

  const [inquiries, mails] = await Promise.all([
    db.select().from(enterpriseInquiries).orderBy(desc(enterpriseInquiries.createdAt)).limit(100),
    db.select().from(emailLog).orderBy(desc(emailLog.createdAt)).limit(40),
  ]);
  const failed = mails.filter((m) => m.status === "failed").length;

  return (
    <div className="space-y-6">
      <section className="glass rounded-2xl p-4">
        <p className="display text-[15px] font-bold text-sand-100">Enterprise enquiries</p>
        <p className="mt-0.5 text-[12px] text-[var(--color-ink-200)]">Mark each one as you deal with it, so you can see at a glance what is still waiting.</p>
        {inquiries.length ? (
          <ul className="mt-2 divide-y divide-white/5">
            {inquiries.map((q) => (
              <li key={q.id} className="flex flex-wrap items-start justify-between gap-3 py-3">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-[14px] font-bold text-sand-100">{q.organisation}</span>
                    <Pill tone={q.status === "new" ? "sun" : q.status === "contacted" ? "tide" : "slate"}>{q.status}</Pill>
                    {q.teamSize ? <span className="text-[11.5px] text-[var(--color-ink-200)]">{q.teamSize} people</span> : null}
                    <span className="text-[11.5px] text-[var(--color-ink-dim)]">{timeAgo(q.createdAt)}</span>
                  </div>
                  <p className="mt-0.5 text-[12.5px] text-[var(--color-ink-200)]">
                    {q.contactName} ·{" "}
                    <a href={`mailto:${q.email}`} className="text-tide-300 underline">
                      {q.email}
                    </a>
                    {q.phone ? ` · ${q.phone}` : ""}
                  </p>
                  {q.message ? <p className="mt-1 max-w-[70ch] text-[12.5px] leading-relaxed text-[var(--color-ink-200)]">{q.message}</p> : null}
                  {!q.notifiedAt && q.notifyError ? <p className="mt-1 text-[11.5px] text-sun-400">We were not emailed about this one: {q.notifyError}</p> : null}
                </div>
                <EnquiryStatus id={q.id} status={q.status} />
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-2 text-[12.5px] text-[var(--color-ink-dim)]">No enquiries yet.</p>
        )}
      </section>

      <section className="glass rounded-2xl p-4">
        <p className="display text-[15px] font-bold text-sand-100">Recent emails</p>
        <p className="mt-0.5 text-[12px] text-[var(--color-ink-200)]">
          {failed ? `${failed} of the last ${mails.length} failed. ` : ""}Every confirmation, password reset and alert email is listed here, including ones that could not be sent.
        </p>
        {mails.length ? (
          <ul className="mt-2 divide-y divide-white/5 text-[12.5px]">
            {mails.map((m) => (
              <li key={m.id} className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5 py-2">
                <Pill tone={m.status === "sent" ? "tide" : m.status === "failed" ? "conch" : "sun"}>{m.status}</Pill>
                <span className="text-[var(--color-ink-200)]">{m.subject}</span>
                <span className="font-mono text-[11px] text-[var(--color-ink-200)]">{m.toAddr}</span>
                <span className="text-[11px] text-[var(--color-ink-dim)]">
                  {m.kind} · {timeAgo(m.createdAt)}
                </span>
                {m.error ? <span className="w-full text-[11.5px] text-[var(--color-ink-200)]">{m.error}</span> : null}
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-2 text-[12.5px] text-[var(--color-ink-dim)]">No emails have been attempted yet.</p>
        )}
      </section>
    </div>
  );
}
