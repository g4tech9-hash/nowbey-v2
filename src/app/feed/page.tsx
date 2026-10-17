import Link from "next/link";
import { and, count, desc, eq, gte, ilike, inArray, ne, notInArray, or, sql } from "drizzle-orm";
import { unstable_cache } from "next/cache";
import { db, hasDatabase } from "@/db";
import { DatabaseSetup } from "@/components/db-setup";
import { incidentUpdates, incidents, newsItems } from "@/db/schema";
import { IncidentCard } from "@/components/incident-card";
import { AdSlot } from "@/components/ad-slot";
import { EmergencyNotice } from "@/components/emergency-notice";
import { OfficialSources } from "@/components/official-sources";
import { MapPanel, type MapPin } from "@/components/map/map-panel";
import { CATEGORIES, GAZETTEER, PARISHES, knownParish, nowMs, timeAgo, type CategoryKey } from "@/lib/geo";
import { HIDDEN_STATUSES } from "@/lib/command";
import { clampInt, likeEscape, param } from "@/lib/validate";
import { getViewer } from "@/lib/viewer";
import { badgesFor } from "@/lib/badges";
import { engagementFor } from "@/lib/engage";
import { NO_ENGAGEMENT } from "@/lib/engage-kinds";
import { BRAND } from "@/lib/brand";
import { PageScene } from "@/components/page-scene";
import { KINDS, listPosts, type KindKey } from "@/lib/life";
import { FEATURES } from "@/lib/features";
import { ButtonLink, Eyebrow, SectionTitle, TextLink, ArrowIcon, EmptyState } from "@/components/ui";

export const dynamic = "force-dynamic";
export const metadata = { title: "Community feed" };

type Search = { [k: string]: string | string[] | undefined };

function first(v: string | string[] | undefined) {
  return Array.isArray(v) ? v[0] : v;
}

type HomeQuery = { status: "active" | "resolved" | "all"; category?: string; parish?: string; q?: string; hours: number };

/**
 * Everything on the home page that does not depend on who is looking. Cached for 30 seconds, so a busy feed costs
 * one set of queries per half-minute instead of one per visitor. Per-viewer data (reactions, ad-free) is still
 * computed per request.
 */
async function loadHomeData(f: HomeQuery) {
  const filters = [];
  if (f.status === "all") filters.push(notInArray(incidents.status, HIDDEN_STATUSES));
  else filters.push(eq(incidents.status, f.status));
  if (f.category && Object.prototype.hasOwnProperty.call(CATEGORIES, f.category)) filters.push(eq(incidents.category, f.category));
  if (f.parish) filters.push(eq(incidents.parish, f.parish));
  if (f.q) {
    const needle = `%${likeEscape(f.q)}%`;
    filters.push(or(ilike(incidents.title, needle), ilike(incidents.details, needle), ilike(incidents.address, needle)));
  }
  if (f.hours > 0) filters.push(gte(incidents.createdAt, new Date(nowMs() - f.hours * 3600 * 1000)));
  const where = filters.length ? and(...filters) : undefined;

  const dayAgo = new Date(nowMs() - 864e5);
  const [rows, recent, wire, totals, wireTotal] = await Promise.all([
    db.select().from(incidents).where(where).orderBy(desc(incidents.createdAt)).limit(24),
    db.select().from(incidents).where(notInArray(incidents.status, HIDDEN_STATUSES)).orderBy(desc(incidents.createdAt)).limit(40),
    db.select().from(newsItems).where(eq(newsItems.review, "approved")).orderBy(desc(newsItems.publishedAt)).limit(6),
    // Home stats are counted in the database. Counting the 40-row feed slice made them lie once the feed was busy.
    db
      .select({
        reportsToday: sql<number>`count(*) filter (where ${incidents.createdAt} >= ${dayAgo})`,
        active: sql<number>`count(*) filter (where ${incidents.status} = 'active')`,
        activeSevere: sql<number>`count(*) filter (where ${incidents.status} = 'active' and ${incidents.severity} >= 3)`,
        parishes: sql<number>`count(distinct ${incidents.parish})`,
      })
      .from(incidents)
      .where(notInArray(incidents.status, HIDDEN_STATUSES))
      .then((r) => r[0]),
    db.select({ n: count() }).from(newsItems).where(eq(newsItems.review, "approved")).then((r) => r[0]),
  ]);

  // The newest timeline entry per report, for the card's "Latest" line. Flag entries are staff-only and are left out.
  const ids = rows.map((r) => r.id);
  const updates = ids.length
    ? await db
        .select({ incidentId: incidentUpdates.incidentId, kind: incidentUpdates.kind, note: incidentUpdates.note, createdAt: incidentUpdates.createdAt })
        .from(incidentUpdates)
        .where(and(inArray(incidentUpdates.incidentId, ids), ne(incidentUpdates.kind, "flag")))
        .orderBy(desc(incidentUpdates.createdAt))
        .limit(ids.length * 5)
    : [];
  const latest: Record<string, { kind: string; note: string | null; createdAt: string }> = {};
  for (const u of updates) {
    if (!latest[u.incidentId]) latest[u.incidentId] = { kind: u.kind, note: u.note, createdAt: new Date(u.createdAt).toISOString() };
  }

  return { rows, recent, wire, totals, wireTotal, latest };
}

const loadHomeCached = unstable_cache(loadHomeData, ["home-feed-v1"], { revalidate: 30 });

export default async function Home({ searchParams }: { searchParams: Promise<Search> }) {
  const sp = await searchParams;
  // Only a known category can reach the cache key; arbitrary strings would fill it.
  const categoryIn = first(sp.category);
  const category = categoryIn && Object.prototype.hasOwnProperty.call(CATEGORIES, categoryIn) ? categoryIn : undefined;
  const parish = knownParish(first(sp.parish)) ?? undefined;
  const q = param(first(sp.q), 100);
  const statusIn = first(sp.status);
  const status = statusIn === "all" || statusIn === "resolved" ? statusIn : "active";
  const hours = clampInt(first(sp.hours), 0, 0, 24 * 365);

  // A deployment without DATABASE_URL gets the setup notice rather than an error boundary.
  if (!hasDatabase()) {
    return (
      <DatabaseSetup
        eyebrow="Community feed"
        title="The feed goes live once the database is connected"
        blurb="Neighbours' pins — floods, outages, road damage and safety hazards — will appear here and on the map. This deployment just needs its DATABASE_URL first."
      />
    );
  }

  const query: HomeQuery = { status, category, parish, q, hours };
  // Search text is not cached: free text would make an unbounded number of cache entries.
  const loadHome = q ? loadHomeData : loadHomeCached;
  const [home, viewer] = await Promise.all([loadHome(query), getViewer()]);
  const { rows, recent, wire, totals, wireTotal, latest } = home;
  const emergencyUp = Number(totals?.activeSevere ?? 0) > 0;
  const life = FEATURES.islandLife ? await listPosts({ perPage: 3 }) : null;
  const adFree = viewer.adFree;
  const handle = viewer.handle;
  const badges = await badgesFor(rows.map((r) => (r.anonymous ? null : r.authorHandle)));
  const engMap = await engagementFor("incident", rows.map((r) => r.id), viewer.userId);

  const pins: MapPin[] = recent.slice(0, 30).map((r) => ({
    id: r.id,
    lat: r.lat,
    lng: r.lng,
    category: r.category as CategoryKey,
    title: r.title,
    meta: `${r.confirmations} confirm${r.confirmations === 1 ? "" : "s"} · ${timeAgo(r.createdAt)}`,
    status: r.status,
    href: `/incident/${r.id}`,
    live: r.status === "active" && r.severity >= 3,
  }));

  const anchor = parish ? GAZETTEER.find((g) => g.parish === parish) : undefined;
  const center: [number, number] = anchor ? [anchor.lat, anchor.lng] : [24.9, -77.6];
  const zoom = anchor ? 14 : 8;

  const activeCount = Number(totals?.active ?? 0);

  return (
    <>
      <div className="mb-5 space-y-3">
        <EmergencyNotice />
        <OfficialSources />
      </div>

      {/* Hero band — landing hero grammar: asymmetric grid, display headline, one loud CTA. */}
      <section className="mb-8 grid min-w-0 gap-5 lg:grid-cols-[minmax(0,1.05fr)_minmax(420px,0.95fr)]">
        <div className="glass relative isolate overflow-hidden rounded-[24px] p-5 sm:p-7">
          <PageScene name="aerial" />
          <Eyebrow>{BRAND.tagline}</Eyebrow>
          <h1 className="display mt-3 text-[clamp(1.75rem,5.4vw,2.9rem)] font-extrabold leading-[1.02] tracking-[-0.06em] text-sand-100">
            What is actually happening, <em className="text-tide-500 not-italic">street by street.</em>
          </h1>
          <p className="mt-3 max-w-[54ch] text-[13.5px] leading-[1.75] text-ink-300">
            Residents pin floods, outages, road damage and safety hazards on real aerial imagery. Pin the road or junction,
            not a house: published pins sit a short distance from the exact spot, and neighbours confirm them. No accounts
            are required to read the map.
          </p>
          <div className="mt-5 flex flex-wrap items-center gap-2.5">
            <ButtonLink href="/report" variant="primary">
              Drop a pin
              <ArrowIcon />
            </ButtonLink>
            <ButtonLink href="/map" variant="secondary">
              Open the map · {activeCount} live
            </ButtonLink>
            <ButtonLink href="/wire" variant="ghost">
              Read the news wire
            </ButtonLink>
            <ButtonLink href="/open-now" variant="ghost">
              What is open now
            </ButtonLink>
          </div>
          <dl className="mt-6 grid grid-cols-3 gap-2.5 border-t hairline pt-4 text-left">
            {[
              ["Reports, last 24h", String(Number(totals?.reportsToday ?? 0))],
              ["Parishes reporting", String(Number(totals?.parishes ?? 0))],
              ["Wire stories", String(Number(wireTotal?.n ?? 0))],
            ].map(([k, v]) => (
              <div key={k}>
                <dt className="text-[11.5px] font-bold uppercase tracking-[0.14em] text-ink-400">{k}</dt>
                <dd className="num display mt-1 text-[21px] font-extrabold tracking-[-0.045em] text-sand-100">{v}</dd>
              </div>
            ))}
          </dl>
        </div>

        <div className="overflow-hidden rounded-[24px] border border-tide-500/20 shadow-l2">
          <MapPanel pins={pins} center={center} zoom={zoom} initialLayer="hybrid" className="h-[260px] w-full sm:h-[380px]" mode="browse" />
        </div>
      </section>

      {/* Feed + rail — asymmetric two-column grid, mobile-first. */}
      <div className="grid min-w-0 gap-6 lg:grid-cols-[minmax(0,1fr)_318px]">
        <div className="min-w-0">
          <div className="flex flex-wrap items-end gap-x-4 gap-y-3">
            <div className="min-w-[200px] flex-1">
              <Eyebrow dot={status !== "resolved"}>{status === "all" ? "Everything" : status === "active" ? "Live now" : "Cleared"}</Eyebrow>
              <h2 className="display mt-2 text-[clamp(1.5rem,3.6vw,2rem)] font-extrabold leading-[1.06] tracking-[-0.055em] text-sand-100">
                The feed
              </h2>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {(["active", "all", "resolved"] as const).map((s) => (
                <Link
                  key={s}
                  href={{ pathname: "/feed", query: { ...(category ? { category } : {}), ...(parish ? { parish } : {}), status: s } }}
                  aria-current={status === s ? "true" : undefined}
                  className={`nb-chip${status === s ? " nb-chip" : ""}`}
                  data-on={status === s ? "true" : undefined}
                >
                  {s === "all" ? "All" : s === "active" ? "Open" : "Resolved"}
                </Link>
              ))}
            </div>
          </div>

          <div className="nb-no-scrollbar -mx-4 mt-4 flex gap-1.5 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0">
            <Link
              href="/feed"
              className="nb-chip shrink-0"
              aria-current={!category ? "true" : undefined}
            >
              Everything
            </Link>
            {(Object.keys(CATEGORIES) as CategoryKey[]).map((key) => (
              <Link
                key={key}
                href={{ pathname: "/feed", query: { category: key, ...(parish ? { parish } : {}), ...(status ? { status } : {}) } }}
                aria-current={category === key ? "true" : undefined}
                className="nb-category-chip shrink-0 rounded-full border px-2.5 py-1 text-[11.5px] font-bold transition hover:brightness-125"
                style={{
                  borderColor: category === key ? CATEGORIES[key].color : "rgba(120,220,214,.18)",
                  background: category === key ? `${CATEGORIES[key].color}26` : "transparent",
                  color: category === key ? CATEGORIES[key].color : "var(--color-ink-300)",
                  ["--category-text" as string]: `var(--color-cat-${key}-t)`,
                }}
              >
                {CATEGORIES[key].label}
              </Link>
            ))}
          </div>

          {rows.length ? (
            <div className="mt-4 space-y-3">
              {rows.map((row) => (
                <IncidentCard
                  key={row.id}
                  row={{ ...row, category: row.category as CategoryKey }}
                  handle={handle}
                  badge={badges.get(row.authorHandle ?? "") ?? null}
                  eng={engMap.get(row.id) ?? NO_ENGAGEMENT}
                  latest={latest[row.id] ?? null}
                />
              ))}
            </div>
          ) : (
            <EmptyState
              className="mt-4"
              title="Nothing filed under that yet"
              blurb="Clear the filters, or be the first to report it — the pin takes about twenty seconds and neighbours see it immediately."
              actions={
                <>
                  <ButtonLink href="/report" variant="primary" size="sm">
                    Report a spot
                  </ButtonLink>
                  <ButtonLink href="/feed" variant="secondary" size="sm">
                    Clear filters
                  </ButtonLink>
                </>
              }
            />
          )}
        </div>

        <aside className="min-w-0 space-y-4">
          <div className="nb-surface rounded-[20px] p-4">
            <SectionTitle>Jump to an island</SectionTitle>
            <div className="nb-no-scrollbar -mx-1 mt-2.5 flex gap-1.5 overflow-x-auto px-1 pb-1 sm:flex-wrap sm:overflow-visible">
              {PARISHES.slice(0, 12).map((p) => (
                <Link
                  key={p}
                  href={{ pathname: "/feed", query: { parish: p, ...(category ? { category } : {}) } }}
                  className="nb-chip shrink-0"
                  data-on={parish === p ? "true" : undefined}
                >
                  {p}
                </Link>
              ))}
            </div>
          </div>

          {/* No ads beside an active severe hazard: the space is for the warning. */}
          {!adFree && !emergencyUp ? <AdSlot index={1} variant="rail" /> : null}

          <div className="nb-surface rounded-[20px] p-4">
            <div className="flex items-baseline justify-between gap-2">
              <SectionTitle>From the wire</SectionTitle>
              <TextLink href="/wire">All stories</TextLink>
            </div>
            <ul className="mt-2.5 space-y-2.5">
              {wire.length ? (
                wire.map((n) => (
                  <li key={n.id}>
                    <a href={n.url} target="_blank" rel="noreferrer" className="group block">
                      <p className="text-[13px] font-semibold leading-snug text-ink-200 transition duration-200 ease-standard group-hover:text-tide-300">
                        {n.title}
                      </p>
                      <p className="mt-1 text-[11.5px] text-ink-400">
                        {n.sourceName} · {timeAgo(n.publishedAt)}
                        {n.parish ? ` · ${n.parish}` : ""}
                      </p>
                    </a>
                  </li>
                ))
              ) : (
                <li className="text-[12.5px] text-ink-400">
                  No stories on the wire yet.{" "}
                  <Link href="/wire" className="font-bold text-tide-300 hover:underline">
                    Refresh the wire
                  </Link>
                  .
                </li>
              )}
            </ul>
          </div>

          {life ? (
            <div className="nb-surface rounded-[20px] p-4">
              <div className="flex items-baseline justify-between gap-2">
                <SectionTitle>Island Life</SectionTitle>
                <TextLink href="/life">See all</TextLink>
              </div>
              <ul className="mt-2.5 space-y-2.5">
                {life.rows.map((p) => (
                  <li key={p.id}>
                    <Link href={`/life/${p.id}`} className="group block">
                      <p className="text-[13px] font-semibold leading-snug text-ink-200 transition duration-200 ease-standard group-hover:text-tide-300">
                        {p.title}
                      </p>
                      <p className="mt-1 text-[11.5px] text-ink-400">
                        {(KINDS[p.kind as KindKey] ?? KINDS.tip).label} · {p.placeName ?? p.parish} · {timeAgo(p.createdAt)}
                      </p>
                    </Link>
                  </li>
                ))}
                {life.rows.length === 0 ? (
                  <li className="text-[12.5px] text-ink-400">Be the first to share a favourite spot or how an event went.</li>
                ) : null}
              </ul>
              <ButtonLink href="/life/new" variant="secondary" size="sm" className="mt-3">
                Share an experience
              </ButtonLink>
            </div>
          ) : null}

          <div className="nb-surface rounded-[20px] border-conch-500/35 p-4">
            <SectionTitle>Get pinged for your parish</SectionTitle>
            <p className="mt-1.5 text-[12.5px] leading-[1.75] text-ink-300">
              Choose the islands and categories you care about — floods and power for a Family Island home, safety and roads
              for Nassau.
            </p>
            <ButtonLink href="/alerts" variant="secondary" size="sm" className="mt-3">
              Set up alerts
            </ButtonLink>
          </div>
        </aside>
      </div>
    </>
  );
}
