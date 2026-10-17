import Link from "next/link";
import { after } from "next/server";
import { desc, eq, sql } from "drizzle-orm";
import { db, hasDatabase } from "@/db";
import { DatabaseSetup } from "@/components/db-setup";
import { newsItems } from "@/db/schema";
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
import { FacebookFeedPanel } from "@/components/facebook-feed";
import { Chip, EmptyState, PageIntro, Panel, SectionTitle } from "@/components/ui";

export const dynamic = "force-dynamic";
export const metadata = { title: "News wire" };

export default async function WirePage() {
  // No database configured at all: show the setup notice instead of crashing on the first
  // query, and skip the background refresh — it would only throw behind the scenes.
  if (!hasDatabase()) {
    return (
      <DatabaseSetup
        eyebrow="News wire"
        title="The wire goes live once the database is connected"
        blurb="Headlines from Bahamian news outlets will be sorted into NowBey categories and placed on the map. This deployment just needs its DATABASE_URL first."
      />
    );
  }
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
      <PageIntro
        eyebrow="News wire"
        title="The news wire, on the map"
        blurb="Headlines from Bahamian news outlets, sorted into NowBey categories and placed on the map when a street or island is named in the story. Stories we cannot place stay in the list without a pin."
        actions={<IngestButton />}
        className="mb-7"
      />

      {/* Editorial grid: story column + map-and-desk rail. */}
      <div className="grid min-w-0 gap-6 lg:grid-cols-[minmax(0,1fr)_330px]">
        <div className="min-w-0 space-y-3.5">
          {rows.length ? (
            rows.map((n, i) => {
              const c = CATEGORIES[(n.category as CategoryKey) ?? "notice"] ?? CATEGORIES.notice;
              return (
                <article
                  key={n.id}
                  className="nb-surface nb-card-link rounded-[20px] p-4 sm:p-5"
                >
                  <div className="flex flex-wrap items-center gap-2 text-[11.5px] font-bold">
                    <span
                      className="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 uppercase tracking-[0.1em]"
                      style={{ color: c.color, borderColor: `${c.color}3d`, background: `${c.color}14` }}
                    >
                      <span className="h-2 w-2 rounded-full" style={{ background: c.color, boxShadow: `0 0 8px ${c.color}80` }} />
                      {c.label}
                    </span>
                    <span className="num text-ink-400">
                      {n.sourceName} · {timeAgo(n.publishedAt)}
                    </span>
                    {n.parish ? (
                      <Link
                        href={`/map?parish=${encodeURIComponent(n.parish)}`}
                        className="nb-chip min-h-[40px] px-3"
                      >
                        {n.parish}
                      </Link>
                    ) : null}
                    {i === 0 ? (
                      <span className="ml-auto inline-flex items-center gap-1.5 rounded-full border border-ok-500/35 bg-ok-500/12 px-2.5 py-1 text-[11.5px] font-bold text-ok-600">
                        <span className="nb-live-dot" aria-hidden />
                        newest
                      </span>
                    ) : null}
                  </div>
                  <h2 className="display mt-2.5 text-[18px] font-extrabold leading-[1.25] tracking-[-0.04em] text-sand-100">
                    <a href={n.url} target="_blank" rel="noreferrer" className="transition duration-200 ease-standard hover:text-tide-300">
                      {n.title}
                    </a>
                  </h2>
                  {n.aiSummary ? (
                    <p className="mt-2 text-[13px] leading-[1.75] text-ink-200">
                      <span className="mr-1.5 rounded-md border border-tide-500/30 bg-tide-500/12 px-1.5 py-0.5 align-middle text-[10px] font-extrabold uppercase tracking-[0.1em] text-tide-300">
                        AI brief
                      </span>
                      {n.aiSummary}
                    </p>
                  ) : n.summary ? (
                    <p
                      className="mt-2 text-[13px] leading-[1.75] text-ink-300"
                      dangerouslySetInnerHTML={{ __html: sanitizeArticleContent(n.summary) }}
                    />
                  ) : null}
                  <div className="mt-3 flex flex-wrap items-center gap-2 text-[11.5px]">
                    {n.lat != null && n.lng != null ? (
                      <Chip tone="neutral">
                        <span className="num">
                          Pinned · {(n.lat as number).toFixed(4)}, {(n.lng as number).toFixed(4)}
                        </span>
                      </Chip>
                    ) : (
                      <Chip tone="neutral">No place named in the text — unpinned</Chip>
                    )}
                    <a
                      href={n.url}
                      target="_blank"
                      rel="noreferrer"
                      className="nb-textlink ml-auto"
                    >
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
                  <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 border-t hairline pt-3">
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
            <EmptyState
              title="No stories on the wire yet"
              blurb={
                <>
                  Tap <span className="font-bold text-tide-300">Refresh stories</span> to bring in the latest headlines, or send
                  us a link to a story you think neighbours should see.
                </>
              }
            />
          )}
        </div>

        <aside className="space-y-4">
          <div className="overflow-hidden rounded-[20px] border border-tide-500/20 shadow-l2">
            <MapPanel pins={pins} mode="browse" center={[24.9, -77.6]} zoom={7} initialLayer="hybrid" className="h-[220px] w-full sm:h-[260px]" />
          </div>

          <FacebookFeedPanel username={process.env.FB_WIRE_PAGE ?? "mybpl242"} />

          <Panel className="rounded-[20px] p-4">
            <SectionTitle>Where stories come from</SectionTitle>
            <p className="num mt-1.5 text-[12px] leading-snug text-ink-400">
              {meta.n} {meta.n === 1 ? "story" : "stories"} on the wire
              {meta.at ? `, last updated ${timeAgo(meta.at)}` : ""}.
            </p>
            <ul className="mt-3 space-y-2 text-[12.5px]">
              {feeds.map((f) => (
                <li key={f.url} className="flex items-center gap-2">
                  <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-tide-500" />
                  <span className="min-w-0 truncate font-semibold text-ink-200">{f.name}</span>
                </li>
              ))}
            </ul>
            <p className="mt-3.5 border-t hairline pt-3 text-[12px] leading-[1.75] text-ink-400">
              Want another outlet covered, like the Tribune or the Nassau Guardian? Send us a story link below and we will
              add its island to the map.
            </p>
          </Panel>

          <Panel className="rounded-[20px] p-4">
            <SectionTitle>Got a link worth mapping?</SectionTitle>
            <p className="mt-1.5 mb-3 text-[12px] leading-[1.75] text-ink-400">Send the story and we will work out where it happened.</p>
            <SubmitLink />
          </Panel>

          <AdSlot index={3} adFree={adFree} variant="rail" />
        </aside>
      </div>
    </>
  );
}
