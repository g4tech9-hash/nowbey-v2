import Link from "next/link";
import { after } from "next/server";
import { desc, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { newsItems } from "@/db/schema";
import { PageHead } from "@/components/app-shell";
import { AdSlot } from "@/components/ad-slot";
import { IngestButton } from "@/components/client-actions";
import { SubmitLink } from "@/components/wire-forms";
import { MapPanel, type MapPin } from "@/components/map/map-panel";
import { CATEGORIES, timeAgo, type CategoryKey } from "@/lib/geo";
import { configuredFeeds, refreshIfStale } from "@/lib/ingest";
import { getViewer } from "@/lib/viewer";
import { EngagementSummary } from "@/components/engage/summary";
import { engagementFor } from "@/lib/engage";
import { NO_ENGAGEMENT } from "@/lib/engage-kinds";
import { sanitizeArticleContent } from "@/lib/sanitize";

export const dynamic = "force-dynamic";
export const metadata = { title: "News wire" };

export default async function WirePage() {
  after(() => refreshIfStale());
  const [rows, lastRun, viewer] = await Promise.all([
    db.select().from(newsItems).where(eq(newsItems.review, "approved")).orderBy(desc(newsItems.publishedAt)).limit(40),
    db.execute(sql`select max(ingested_at) as at, count(*)::int as n from news_items where review = 'approved'`),
    getViewer(),
  ]);
  const adFree = viewer.adFree;
  const engMap = await engagementFor("news", rows.map((n) => n.id), viewer.userId);
  const meta = (lastRun.rows?.[0] ?? { at: null, n: rows.length }) as { at: string | null; n: number };
  const feeds = configuredFeeds();

  const pins: MapPin[] = rows
    .filter((n) => n.lat != null && n.lng != null)
    .map((n) => ({
      id: `wire-${n.id}`,
      lat: n.lat as number,
      lng: n.lng as number,
      category: (n.category as CategoryKey) ?? "notice",
      title: n.title,
      meta: `${n.sourceName} · ${timeAgo(n.publishedAt)}`,
      href: `/wire/${n.id}`,
      hrefLabel: "Read and discuss",
    }));

  return (
    <>
      <PageHead
        eyebrow="News wire"
        title="The news wire, on the map"
        blurb="Headlines from Bahamian news outlets, sorted into NowBey categories and placed on the map when a street or island is named in the story. Stories we cannot place stay in the list without a pin."
        actions={<IngestButton />}
      />

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_330px]">
        <div className="space-y-3">
          {rows.length ? (
            rows.map((n, i) => {
              const c = CATEGORIES[(n.category as CategoryKey) ?? "notice"] ?? CATEGORIES.notice;
              return (
                <article key={n.id} className="glass rounded-2xl p-3.5" style={{ boxShadow: `inset 3px 0 0 ${c.color}` }}>
                  <div className="flex flex-wrap items-center gap-2 text-[11px] font-bold uppercase tracking-wide">
                    <span style={{ color: c.color }}>{c.label}</span>
                    <span className="text-[#6e97a0] normal-case tracking-normal">
                      {n.sourceName} · {timeAgo(n.publishedAt)}
                    </span>
                    {n.parish ? (
                      <Link
                        href={`/map?parish=${encodeURIComponent(n.parish)}`}
                        className="rounded-full bg-white/8 px-2 py-0.5 text-[10.5px] text-[#cfeee9] normal-case tracking-normal hover:bg-white/16"
                      >
                        {n.parish}
                      </Link>
                    ) : null}
                    {i === 0 ? (
                      <span className="ml-auto rounded-full bg-tide-500/18 px-2 py-0.5 text-[10px] text-tide-300 normal-case tracking-normal">
                        newest
                      </span>
                    ) : null}
                  </div>
                  <h2 className="display mt-1.5 text-[17px] font-extrabold leading-snug text-sand-100">
                    <a href={n.url} target="_blank" rel="noreferrer" className="hover:text-tide-300">
                      {n.title}
                    </a>
                  </h2>
                  {n.aiSummary ? (
                    <p className="mt-1.5 text-[13px] leading-relaxed text-[#cfeee9]">
                      <span className="mr-1.5 rounded bg-tide-500/15 px-1 py-px align-middle text-[9.5px] font-extrabold uppercase tracking-wide text-tide-300">AI brief</span>
                      {n.aiSummary}
                    </p>
                  ) : n.summary ? (
                    <p
                      className="mt-1.5 text-[13px] leading-relaxed text-[#a9cdc9]"
                      dangerouslySetInnerHTML={{ __html: sanitizeArticleContent(n.summary) }}
                    />
                  ) : null}
                  <div className="mt-2 flex flex-wrap items-center gap-2 text-[11.5px]">
                    {n.lat != null && n.lng != null ? (
                      <span className="rounded-full bg-white/8 px-2 py-0.5 font-semibold text-[#cfeee9]">
                        Pinned · {(n.lat as number).toFixed(4)}, {(n.lng as number).toFixed(4)}
                      </span>
                    ) : (
                      <span className="rounded-full bg-white/8 px-2 py-0.5 text-[#8fb9b6]">No place named in the text — unpinned</span>
                    )}
                    <a href={n.url} target="_blank" rel="noreferrer" className="font-bold text-tide-300 hover:underline">
                      Read at {(() => {
                        try {
                          return new URL(n.url).host.replace(/^www\./, "");
                        } catch {
                          return "source";
                        }
                      })()}
                      {" ↗"}
                    </a>
                  </div>
                  <div className="mt-2.5 flex flex-wrap items-center gap-x-4 gap-y-1.5 border-t hairline pt-2.5">
                    {(engMap.get(n.id) ?? NO_ENGAGEMENT).total + (engMap.get(n.id) ?? NO_ENGAGEMENT).comments > 0 ? (
                      <EngagementSummary eng={engMap.get(n.id) ?? NO_ENGAGEMENT} href={`/wire/${n.id}`} />
                    ) : null}
                    <Link href={`/wire/${n.id}#comments`} className="text-[12px] font-bold text-tide-300 hover:underline">
                      React and comment
                    </Link>
                  </div>
                </article>
              );
            })
          ) : (
            <div className="glass rounded-2xl p-6">
              <p className="display text-[17px] font-bold text-sand-100">No stories on the wire yet</p>
              <p className="mt-1.5 max-w-[60ch] text-[13px] leading-relaxed text-[#a9cdc9]">
                Tap <span className="font-bold text-tide-300">Refresh stories</span> to bring in the latest headlines, or send
                us a link to a story you think neighbours should see.
              </p>
            </div>
          )}
        </div>

        <aside className="space-y-4">
          <div className="overflow-hidden rounded-2xl border border-tide-500/20">
            <MapPanel pins={pins} mode="browse" center={[24.9, -77.6]} zoom={7} initialLayer="hybrid" className="h-[220px] w-full sm:h-[260px]" />
          </div>

          <div className="glass rounded-2xl p-3.5">
            <p className="display text-[14.5px] font-bold text-sand-100">Where stories come from</p>
            <p className="mt-1 text-[12px] leading-snug text-[#8fb9b6]">
              {meta.n} {meta.n === 1 ? "story" : "stories"} on the wire
              {meta.at ? `, last updated ${timeAgo(meta.at)}` : ""}.
            </p>
            <ul className="mt-2.5 space-y-1.5 text-[12.5px]">
              {feeds.map((f) => (
                <li key={f.url} className="flex items-center gap-2">
                  <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-tide-400" />
                  <span className="min-w-0 truncate font-semibold text-[#dff3f0]">{f.name}</span>
                </li>
              ))}
            </ul>
            <p className="mt-3 border-t hairline pt-2.5 text-[12px] leading-relaxed text-[#8fb9b6]">
              Want another outlet covered, like the Tribune or the Nassau Guardian? Send us a story link below and we will
              add its island to the map.
            </p>
          </div>

          <div className="glass rounded-2xl p-3.5">
            <p className="display text-[14.5px] font-bold text-sand-100">Got a link worth mapping?</p>
            <p className="mt-1 mb-2.5 text-[12px] text-[#a9cdc9]">Send the story and we will work out where it happened.</p>
            <SubmitLink />
          </div>

          <AdSlot index={3} adFree={adFree} variant="rail" />
        </aside>
      </div>
    </>
  );
}
