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
import { timeAgo, type CategoryKey } from "@/lib/geo";
import { configuredFeeds, refreshIfStale } from "@/lib/ingest";
import { getViewer } from "@/lib/viewer";
import { EngagementSummary } from "@/components/engage/summary";
import { engagementFor } from "@/lib/engage";
import { NO_ENGAGEMENT } from "@/lib/engage-kinds";
import { sanitizeArticleContent } from "@/lib/sanitize";
import { EmptyState, PageIntro, Panel, SectionTitle, Chip } from "@/components/ui";
import { AvatarStack, CardLayered, CatBadge, LiveDot, MetaChip } from "@/ui/pulse";
import { pulseCategoryMeta } from "@/ui/pulse/glyph";
import { publishedTimeLine } from "@/lib/freshness";
import { isJunkHeadline } from "@/lib/news-filter";
import { NAME_WIRE, showingCount } from "@/lib/copy";

/**
 * THE WIRE — the desk side of the island.
 *
 * A feed of *articles* reads differently from a feed of *sightings*: it is a
 * chronology, and the thing you scan for is when and where, not who confirmed it.
 * So this page is a timeline — a rule down the left with a category dot per day —
 * and each story is a card on that spine, and the rail on the right is the desk:
 * the map of where the wire has landed, which outlets are actually being read, and
 * the one thing a reader can do (send a link worth mapping).
 *
 * WHAT CHANGED, AND WHY
 *
 * A story carries ONE time — when it was published. It used to carry a "Live"
 * badge and a "Nobody has checked it recently" tooltip, which is meaningless
 * for an article: nobody checks an article, and "Live" on a week-old headline
 * is a lie about a safety product.
 *
 * It also carries no severity. Severity is for hazards. A car accident in the
 * news is a different thing from a car accident on your street.
 *
 * And the page is honest about how much of the wire you are looking at: the
 * header says how many stories there are, and the list says how many of them
 * are on screen.
 *
 * Data fetching, the stale-refresh `after()` hook, sanitisation of imported HTML
 * and the engagement counts are untouched by the redesign.
 */

export const dynamic = "force-dynamic";
export const metadata = { title: NAME_WIRE };

/** How many stories the first screen shows. "?all=1" shows the whole window. */
const FIRST_PAGE = 20;

export default async function WirePage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  const showAll = sp.all === "1";

  // No database configured at all: show the setup notice instead of crashing on the first
  // query, and skip the background refresh — it would only throw behind the scenes.
  if (!hasDatabase()) {
    return (
      <DatabaseSetup
        eyebrow={NAME_WIRE}
        title="The wire goes live once the database is connected"
        blurb="Headlines from Bahamian news outlets will be sorted into NowBey categories and placed on the map. This deployment just needs its DATABASE_URL first."
      />
    );
  }
  after(() => refreshIfStale());
  const [all, total, viewer] = await Promise.all([
    db
      .select()
      .from(newsItems)
      .where(eq(newsItems.review, "approved"))
      .orderBy(desc(newsItems.publishedAt))
      .limit(showAll ? 200 : FIRST_PAGE * 2),
    db.select({ n: sql<number>`count(*)::int` }).from(newsItems).where(eq(newsItems.review, "approved")).then((r) => r[0]),
    getViewer(),
  ]);
  const adFree = viewer.adFree;

  /**
   * THE SAFETY NET. The ingest filter (src/lib/news-filter.ts) holds junk before
   * it is stored, but rows that were stored before that filter existed are
   * still in the table. A story that reads like a directory page is not shown
   * on the wire, whatever is in the database.
   */
  const clean = all.filter((n) => !isJunkHeadline(n.title));
  const rows = showAll ? clean : clean.slice(0, FIRST_PAGE);
  const engMap = await engagementFor("news", rows.map((n) => n.id), viewer.userId);
  const feeds = configuredFeeds();
  const onTheWire = Number(total?.n ?? 0);

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
      // A pin that is only the middle of an island is not a street. It is drawn
      // hollow and says so.
      approximate: n.placement === "island",
    }));

  // Day buckets drive the timeline rule. Grouping is presentational: the rows
  // stay in the order the query returned them, newest first.
  const days: { key: string; label: string; items: typeof rows }[] = [];
  for (const n of rows) {
    const key = new Date(n.publishedAt).toDateString();
    const last = days[days.length - 1];
    if (last && last.key === key) last.items.push(n);
    else days.push({ key, label: dayLabel(n.publishedAt), items: [n] });
  }

  return (
    <>
      <PageIntro
        eyebrow={<span className="flex items-center gap-2"><LiveDot /> {NAME_WIRE}</span>}
        title="The news wire, on the map"
        blurb="Headlines from Bahamian news outlets, sorted into NowBey categories and placed on the map when a street or island is named in the story. Stories we cannot place stay in the list without a pin."
        actions={<IngestButton />}
        className="mb-6"
      />

      <div className="pulse-grid-3">
        <div className="pulse-wire min-w-0">
          {/* The honest count: how many are on the wire, how many you can see. */}
          <p className="mb-3 flex flex-wrap items-center gap-x-2 gap-y-1 font-mono text-[12px] tabular-nums text-tertiary">
            <span className="font-bold text-secondary">{showingCount(rows.length, onTheWire)}</span>
            {rows.length < onTheWire ? (
              <Link href="/wire?all=1" className="pulse-mini-link">
                Show more stories
              </Link>
            ) : null}
            {showAll && onTheWire > rows.length ? (
              <Link href="/wire" className="pulse-mini-link">
                Back to the first {FIRST_PAGE}
              </Link>
            ) : null}
          </p>

          {rows.length ? (
            days.map((day) => (
              <section key={day.key} aria-label={day.label} className="pulse-wire-day">
                <h2 className="pulse-section-title">{day.label}</h2>
                <ul className="pulse-timeline pulse-wire-list">
                  {day.items.map((n) => {
                    const eng = engMap.get(n.id) ?? NO_ENGAGEMENT;
                    return (
                      <li
                        key={n.id}
                        className="pulse-timeline-item pulse-wire-item"
                        style={{ ["--spine" as string]: pulseCategoryMeta(n.category ?? "notice").token } as React.CSSProperties}
                      >
                        <CardLayered as="article" category={n.category ?? "notice"} spine interactive className="pulse-card-pad">
                          <div className="flex flex-wrap items-center gap-2">
                            <CatBadge category={n.category ?? "notice"} size="sm" />
                            <span className="text-[12.5px] font-semibold text-secondary">{n.sourceName}</span>
                            <span className="font-mono text-[12px] text-tertiary tabular-nums">
                              {publishedTimeLine(n.publishedAt)}
                            </span>
                            {n.parish ? (
                              <Link href={`/map?parish=${encodeURIComponent(n.parish)}`} className="pulse-chip">
                                {n.parish}
                              </Link>
                            ) : null}
                          </div>

                          <h3 className="pulse-card-title">
                            <a href={n.url} target="_blank" rel="noreferrer" className="pulse-story-link">
                              {n.title}
                              <span className="pulse-external" aria-hidden>
                                ↗
                              </span>
                              <span className="sr-only">(opens the publisher&rsquo;s site)</span>
                            </a>
                          </h3>

                          {n.aiSummary ? (
                            <p className="pulse-card-body">
                              <span className="pulse-ai-brief">AI brief</span>
                              {n.aiSummary}
                            </p>
                          ) : n.summary ? (
                            <p
                              className="pulse-card-body line-clamp-3"
                              dangerouslySetInnerHTML={{ __html: sanitizeArticleContent(n.summary) }}
                            />
                          ) : null}

                          <div className="mt-3 flex flex-wrap items-center gap-2">
                            {n.placement === "street" && n.parish ? (
                              <Chip tone="neutral">Pinned: {n.parish}</Chip>
                            ) : n.placement === "island" ? (
                              <Chip tone="neutral">Island-level — approximate</Chip>
                            ) : (
                              <Chip tone="neutral">No place named in the text</Chip>
                            )}
                            <a href={n.url} target="_blank" rel="noreferrer" className="nb-textlink ml-auto">
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

                          <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 border-t border-default pt-3">
                            <AvatarStack seed={n.sourceName} size={22} label={n.sourceName} />
                            {eng.total + eng.comments > 0 ? (
                              <EngagementSummary eng={eng} href={`/wire/${n.id}`} />
                            ) : null}
                            <Link href={`/wire/${n.id}#comments`} className="pulse-mini-link ml-auto">
                              React and comment
                            </Link>
                          </div>
                        </CardLayered>
                      </li>
                    );
                  })}
                </ul>
              </section>
            ))
          ) : (
            <EmptyState
              title="No stories on the wire yet"
              blurb={
                <>
                  Tap <span className="font-bold text-[color:var(--text-accent)]">Refresh stories</span> to bring in the
                  latest headlines, or send us a link to a story you think neighbours should see.
                </>
              }
            />
          )}
        </div>

        <aside className="pulse-inspector">
          <div className="pulse-map-frame">
            <MapPanel pins={pins} mode="browse" center={[24.9, -77.6]} zoom={7} initialLayer="hybrid" className="h-full w-full" />
          </div>

          <Panel className="pulse-card-pad">
            <SectionTitle>Where stories come from</SectionTitle>
            <p className="mt-1.5 font-mono text-[12px] leading-snug text-tertiary tabular-nums">
              {onTheWire} {onTheWire === 1 ? "story" : "stories"} on the wire
              {all.length ? `, ${showingCount(rows.length, onTheWire).toLowerCase()} below` : ""}.
            </p>
            <ul className="mt-3 grid gap-2 text-[12.5px]">
              {feeds.map((f) => (
                <li key={f.url} className="flex items-center gap-2">
                  <span className="pulse-catdot" aria-hidden />
                  <span className="min-w-0 truncate font-semibold text-secondary">{f.name}</span>
                </li>
              ))}
            </ul>
            <p className="mt-3.5 border-t border-default pt-3 text-[12px] leading-[1.75] text-tertiary">
              Want another outlet covered, like the Tribune or the Nassau Guardian? Send us a story link below and we will
              add its island to the map.
            </p>
          </Panel>

          <Panel className="pulse-card-pad">
            <SectionTitle>Got a link worth mapping?</SectionTitle>
            <p className="mt-1.5 mb-3 text-[12px] leading-[1.75] text-tertiary">
              Send the story and we will work out where it happened.
            </p>
            <SubmitLink />
          </Panel>

          <AdSlot index={3} adFree={adFree} variant="rail" />
        </aside>
      </div>
    </>
  );
}

function dayLabel(iso: string | Date) {
  const d = new Date(iso);
  const today = new Date();
  if (d.toDateString() === today.toDateString()) return "Today";
  const y = new Date(today.getTime() - 864e5);
  if (d.toDateString() === y.toDateString()) return "Yesterday";
  return d.toLocaleDateString("en-BS", { weekday: "long", day: "numeric", month: "long" });
}
