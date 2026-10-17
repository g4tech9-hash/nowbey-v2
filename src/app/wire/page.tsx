import Link from "next/link";
import { after } from "next/server";
import { desc, eq, sql } from "drizzle-orm";
import { db, hasDatabase } from "@/db";
import { DatabaseSetup } from "@/components/db-setup";
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
import { CatBadge, Dot, Pill } from "@/ui/kit";

export const dynamic = "force-dynamic";
export const metadata = { title: "News wire" };

/* =====================================================================
   News wire — rebuilt 2026-10-17 against reference 1002177499.
   New DOM: layered story cards (source tile · outlet label · REVIEWED
   pill · title · brief · “map context / open story ↗” footer row).
   Queries and ingest behavior preserved.
   ===================================================================== */

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
      <PageHead
        eyebrow="News wire"
        title="The news wire, on the map"
        blurb="Headlines from Bahamian news outlets, sorted into NowBey categories and placed on the map when a street or island is named in the story. Stories we cannot place stay in the list without a pin."
        actions={<IngestButton />}
      />

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_330px]">
        {/* ---- story cards ---- */}
        <div className="flex min-w-0 flex-col gap-3.5">
          {rows.length ? (
            rows.map((n) => {
              const c = CATEGORIES[(n.category as CategoryKey) ?? "notice"] ?? CATEGORIES.notice;
              const eng = engMap.get(n.id) ?? NO_ENGAGEMENT;
              let host = "source";
              try {
                host = new URL(n.url).host.replace(/^www\./, "");
              } catch {
                /* keep the fallback */
              }
              return (
                <article key={n.id} className="nb-card" style={{ padding: "20px 22px" }}>
                  <div className="nb-card-head">
                    <span
                      aria-hidden
                      style={{
                        width: 46,
                        height: 46,
                        borderRadius: 13,
                        display: "grid",
                        placeItems: "center",
                        background: "#143b42",
                        color: "var(--nb-mint)",
                        fontFamily: "var(--font-display)",
                        fontWeight: 800,
                        fontSize: 19,
                        flex: "none",
                      }}
                    >
                      {(n.sourceName || "N").charAt(0).toUpperCase()}
                    </span>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2.5">
                        <span className="nb-label truncate">{n.sourceName}</span>
                        <Pill tone="mint">Reviewed</Pill>
                      </div>
                      <p className="num mt-1 text-[11.5px]" style={{ color: "var(--nb-faint)" }}>
                        {timeAgo(n.publishedAt)}
                        {n.parish ? ` · ${n.parish}` : ""}
                      </p>
                    </div>
                  </div>

                  <h2 className="display mt-3.5 text-[18px] font-bold leading-snug">
                    <a href={n.url} target="_blank" rel="noreferrer" style={{ color: "var(--nb-cream)" }}>
                      {n.title}
                    </a>
                  </h2>

                  {n.aiSummary ? (
                    <p className="mt-2 text-[13.5px] leading-relaxed" style={{ color: "var(--nb-muted)" }}>
                      <span
                        className="mr-1.5 rounded px-1 py-px align-middle text-[9.5px] font-extrabold uppercase tracking-wide"
                        style={{ background: "rgba(67,224,203,.14)", color: "var(--nb-mint)" }}
                      >
                        AI brief
                      </span>
                      {n.aiSummary}
                    </p>
                  ) : n.summary ? (
                    <p
                      className="mt-2 text-[13.5px] leading-relaxed"
                      style={{ color: "var(--nb-muted)" }}
                      dangerouslySetInnerHTML={{ __html: sanitizeArticleContent(n.summary) }}
                    />
                  ) : null}

                  <div className="mt-3.5 flex flex-wrap items-center gap-2">
                    <CatBadge color={c.color}>{c.label}</CatBadge>
                    {n.lat != null && n.lng != null ? (
                      <span className="nb-chip num" style={{ fontSize: 11 }}>
                        Pinned · {(n.lat as number).toFixed(4)}, {(n.lng as number).toFixed(4)}
                      </span>
                    ) : (
                      <span className="nb-chip" style={{ fontSize: 11 }}>
                        No place named — unpinned
                      </span>
                    )}
                  </div>

                  <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t pt-3.5" style={{ borderColor: "var(--nb-stroke-soft)" }}>
                    <span className="nb-label" style={{ fontSize: 9.5 }}>
                      Map context
                    </span>
                    <div className="flex flex-wrap items-center gap-4">
                      {eng.total + eng.comments > 0 ? <EngagementSummary eng={eng} href={`/wire/${n.id}`} /> : null}
                      <Link href={`/wire/${n.id}#comments`} className="nb-link-arrow" style={{ fontSize: 13 }}>
                        Discuss
                      </Link>
                      <a href={n.url} target="_blank" rel="noreferrer" className="nb-link-arrow" style={{ fontSize: 13 }}>
                        Open story
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                          <path d="M7 17 17 7M9 7h8v8" />
                        </svg>
                        <span className="sr-only"> at {host}</span>
                      </a>
                    </div>
                  </div>
                </article>
              );
            })
          ) : (
            <div className="nb-card">
              <p className="display text-[18px] font-bold">No stories on the wire yet</p>
              <p className="mt-2 max-w-[60ch] text-[14px] leading-relaxed" style={{ color: "var(--nb-muted)" }}>
                Tap <span style={{ color: "var(--nb-mint)", fontWeight: 700 }}>Refresh stories</span> to bring in the latest headlines, or send
                us a link to a story you think neighbours should see.
              </p>
            </div>
          )}
        </div>

        {/* ---- rail ---- */}
        <aside className="flex min-w-0 flex-col gap-4">
          <div className="overflow-hidden rounded-2xl border" style={{ borderColor: "var(--nb-stroke)" }}>
            <MapPanel pins={pins} mode="browse" center={[24.9, -77.6]} zoom={7} initialLayer="hybrid" className="h-[220px] w-full sm:h-[260px]" />
          </div>

          <div className="nb-card nb-card-tight">
            <p className="display text-[15px] font-bold">Where stories come from</p>
            <p className="num mt-1.5 text-[12.5px]" style={{ color: "var(--nb-faint)" }}>
              {meta.n} {meta.n === 1 ? "story" : "stories"} on the wire
              {meta.at ? `, last updated ${timeAgo(meta.at)}` : ""}.
            </p>
            <ul className="mt-3 flex flex-col gap-2 text-[12.5px]">
              {feeds.map((f) => (
                <li key={f.url} className="flex items-center gap-2">
                  <Dot color="var(--nb-mint)" />
                  <span className="min-w-0 truncate font-semibold" style={{ color: "var(--nb-text)" }}>
                    {f.name}
                  </span>
                </li>
              ))}
            </ul>
            <p className="mt-3.5 border-t pt-3 text-[12.5px] leading-relaxed" style={{ borderColor: "var(--nb-stroke-soft)", color: "var(--nb-faint)" }}>
              Want another outlet covered, like the Tribune or the Nassau Guardian? Send us a story link below and we will
              add its island to the map.
            </p>
          </div>

          {/* reference: “Community-submitted links · Sent for review before appearing” */}
          <div className="nb-card nb-card-tight" style={{ display: "flex", gap: 12, alignItems: "flex-start", background: "var(--nb-surface-2)" }}>
            <Dot color="var(--nb-coral)" glow />
            <div>
              <p className="text-[13.5px] font-bold" style={{ color: "var(--nb-cream)" }}>
                Community-submitted links
              </p>
              <p className="mt-0.5 text-[12px]" style={{ color: "var(--nb-faint)" }}>
                Sent for review before appearing
              </p>
            </div>
          </div>

          <div className="nb-card nb-card-tight">
            <p className="display text-[15px] font-bold">Got a link worth mapping?</p>
            <p className="mt-1.5 mb-3.5 text-[12.5px]" style={{ color: "var(--nb-faint)" }}>
              Send the story and we will work out where it happened.
            </p>
            <SubmitLink />
          </div>

          <AdSlot index={3} adFree={adFree} variant="rail" />
        </aside>
      </div>
    </>
  );
}
