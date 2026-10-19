import { and, desc, eq, inArray, isNull } from "drizzle-orm";
import { db } from "@/db";
import { newsItems } from "@/db/schema";
import { timeAgo } from "@/lib/geo";
import { RemoveStoryButton, ReviewButtons, SendAlertButton } from "@/components/admin-actions";
import { FacebookPagesAdmin } from "@/components/admin-facebook-pages";
import { Pill } from "@/components/admin-ui";
import { getAuxSetting } from "@/lib/settings";
import { fbBridgesFromValue, fbPagesFromValue } from "@/lib/facebook";
import { parseFbIngestStatus } from "@/lib/facebook-ingest-core";

export const dynamic = "force-dynamic";
export const metadata = { title: "Wire" };

export default async function WireAdmin() {
  const [pending, live, candidates, fbPagesRaw, fbBridgesRaw, fbStatusRaw] = await Promise.all([
    db.select().from(newsItems).where(eq(newsItems.review, "pending")).orderBy(desc(newsItems.publishedAt)).limit(50),
    db.select().from(newsItems).where(eq(newsItems.review, "approved")).orderBy(desc(newsItems.publishedAt)).limit(30),
    db
      .select()
      .from(newsItems)
      .where(and(eq(newsItems.review, "approved"), isNull(newsItems.alertedAt), inArray(newsItems.alertLevel, ["high", "watch"])))
      .orderBy(desc(newsItems.publishedAt))
      .limit(20),
    getAuxSetting("fb_pages"),
    getAuxSetting("fb_bridges"),
    getAuxSetting("fb_ingest_status"),
  ]);
  // "high" first, then "watch", newest first within each.
  candidates.sort((a, b) => (a.alertLevel === b.alertLevel ? 0 : a.alertLevel === "high" ? -1 : 1));

  return (
    <div className="space-y-6">
      <FacebookPagesAdmin
        pages={fbPagesFromValue(fbPagesRaw)}
        bridges={fbBridgesFromValue(fbBridgesRaw)}
        status={parseFbIngestStatus(fbStatusRaw)}
      />

      <section className="glass rounded-2xl p-4">
        <p className="display text-[15px] font-bold text-primary">Possible alerts{candidates.length ? ` (${candidates.length})` : ""}</p>
        <p className="mt-0.5 text-[12px] text-secondary">
          Stories the scanner thinks people should hear about. <b>High</b> means a warning, evacuation or emergency. <b>Watch</b> means it affects people but may not need an alert. Open the story, then send only if it is accurate and current.
        </p>
        {candidates.length ? (
          <ul className="mt-2 divide-y divide-white/5">
            {candidates.map((n) => (
              <li key={n.id} className="flex flex-wrap items-start justify-between gap-3 py-2.5">
                <div className="min-w-0 flex-1">
                  <p className="text-[13px] font-semibold text-primary">
                    <Pill tone={n.alertLevel === "high" ? "violet" : "slate"}>{n.alertLevel === "high" ? "High" : "Watch"}</Pill> {n.title}
                  </p>
                  <a href={n.url} target="_blank" rel="noopener noreferrer nofollow" className="block truncate text-[11.5px] text-text-accent underline">
                    {n.url}
                  </a>
                  <p className="text-[11.5px] text-tertiary">
                    {n.sourceName} · {n.parish ?? "no island set"} · {timeAgo(n.publishedAt)}
                  </p>
                </div>
                <SendAlertButton id={n.id} />
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-2 text-[12.5px] text-tertiary">Nothing needs an alert right now.</p>
        )}
      </section>

      <section className="glass rounded-2xl p-4">
        <p className="display text-[15px] font-bold text-primary">Links waiting for review{pending.length ? ` (${pending.length})` : ""}</p>
        <p className="mt-0.5 text-[12px] text-secondary">Readers send these in. Nothing shows publicly until you approve it. Open the link and check it before you do.</p>
        {pending.length ? (
          <ul className="mt-2 divide-y divide-white/5">
            {pending.map((n) => (
              <li key={n.id} className="flex flex-wrap items-start justify-between gap-3 py-2.5">
                <div className="min-w-0 flex-1">
                  <p className="text-[13px] font-semibold text-primary">{n.title}</p>
                  {n.summary && n.summary !== n.title ? <p className="mt-0.5 text-[12px] text-secondary">{n.summary}</p> : null}
                  <a href={n.url} target="_blank" rel="noopener noreferrer nofollow" className="block truncate text-[11.5px] text-text-accent underline">
                    {n.url}
                  </a>
                  <p className="text-[11.5px] text-tertiary">
                    {n.parish ?? "no island"} · {timeAgo(n.publishedAt)}
                  </p>
                </div>
                <ReviewButtons id={n.id} />
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-2 text-[12.5px] text-tertiary">Nothing waiting.</p>
        )}
      </section>

      <section className="glass rounded-2xl p-4">
        <p className="display text-[15px] font-bold text-primary">On the wire now</p>
        <p className="mt-0.5 text-[12px] text-secondary">The 30 newest public stories. Remove anything that should not be there.</p>
        <ul className="mt-2 divide-y divide-white/5">
          {live.map((n) => (
            <li key={n.id} className="flex flex-wrap items-start justify-between gap-3 py-2.5">
              <div className="min-w-0 flex-1">
                <p className="text-[13px] font-semibold text-primary">{n.title}</p>
                <p className="mt-0.5 text-[11.5px] text-secondary">
                  <Pill tone={n.sourceName === "Reader tip" ? "violet" : "slate"}>{n.sourceName}</Pill> {n.parish ?? "no island"} · {timeAgo(n.publishedAt)}
                </p>
              </div>
              <RemoveStoryButton id={n.id} />
            </li>
          ))}
          {live.length === 0 ? <li className="py-2 text-[12.5px] text-tertiary">The wire is empty.</li> : null}
        </ul>
      </section>
    </div>
  );
}
