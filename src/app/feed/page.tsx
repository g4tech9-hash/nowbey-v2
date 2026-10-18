import Link from "next/link";
import { and, count, desc, eq, gte, ilike, inArray, ne, notInArray, or, sql } from "drizzle-orm";
import { unstable_cache } from "next/cache";
import { db, hasDatabase } from "@/db";
import { DatabaseSetup } from "@/components/db-setup";
import { incidentUpdates, incidents, newsItems } from "@/db/schema";
import { AdSlot } from "@/components/ad-slot";
import { EmergencyNotice } from "@/components/emergency-notice";
import { OfficialSources } from "@/components/official-sources";
import { CATEGORIES, GAZETTEER, knownParish, nowMs, timeAgo, type CategoryKey } from "@/lib/geo";
import { HIDDEN_STATUSES } from "@/lib/command";
import { clampInt, likeEscape, param } from "@/lib/validate";
import { getViewer } from "@/lib/viewer";
import { badgesFor } from "@/lib/badges";
import { engagementFor } from "@/lib/engage";
import { NO_ENGAGEMENT, type Engagement } from "@/lib/engage-kinds";
import type { Badge } from "@/lib/badges";
import { PageHead } from "@/components/app-shell";
import { ButtonLink, Chip, Eyebrow, Panel, SectionTitle, TextLink } from "@/components/ui";
import { FeedControls } from "@/components/pulse/feed-controls";
import { FeedStream, type FeedRow } from "@/components/pulse/feed-stream";
import { FeedMap } from "@/components/pulse/feed-map";
import { IncidentRowMini } from "@/components/pulse/incident-card";
import { CardLayered, CategoryLegend, TrustMeter } from "@/ui/pulse";
import { trustFor } from "@/lib/pulse/trust";
import { pulseCategoryMeta } from "@/ui/pulse/glyph";

/**
 * THE FEED — Pulse's centre of gravity.
 *
 * Three panes at ≥1024 (nav rail from the shell · stream · inspector), two at
 * 640–1024 (stream, inspector folded below), one on a phone with a bottom nav.
 * The stream itself is `FeedStream`; this file only decides *what* is in it.
 *
 * Nothing about how the data is fetched changed in the redesign — same query,
 * same 30-second `unstable_cache`, same per-viewer work (reactions, ad-free)
 * computed per request, same guard for a deployment with no database. What
 * changed is the shape of the surface: a sticky filter island that writes query
 * params, a critical spotlight for the worst thing on the island right now, sort
 * and view switches that are shareable URLs, and cards you can drive with the
 * keyboard or your thumb.
 */

export const dynamic = "force-dynamic";
export const metadata = { title: "Community feed" };

type Search = { [k: string]: string | string[] | undefined };

function first(v: string | string[] | undefined) {
  return Array.isArray(v) ? v[0] : v;
}

type HomeQuery = { status: "active" | "resolved" | "all"; category?: string; parish?: string; q?: string; hours: number };

/**
 * Everything on the feed that does not depend on who is looking. Cached for 30
 * seconds, so a busy feed costs one set of queries per half-minute instead of
 * one per visitor. Per-viewer data (reactions, ad-free) is still computed per
 * request. The Pulse redesign added only the per-category counts the filter
 * island shows on its pills — one grouped query, same cache entry.
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
  const [rows, recent, wire, totals, wireTotal, categoryCounts] = await Promise.all([
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
    // Pill counts. Grouped, not one query per category — thirteen round-trips to
    // paint chips is not a fair price for a number nobody asked for.
    db
      .select({ category: incidents.category, n: sql<number>`count(*)::int` })
      .from(incidents)
      .where(eq(incidents.status, "active"))
      .groupBy(incidents.category),
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
  const latest: Record<string, { kind: string; note: string | null; createdAt: string } | null> = {};
  for (const u of updates) {
    if (!latest[u.incidentId]) latest[u.incidentId] = { kind: u.kind, note: u.note, createdAt: new Date(u.createdAt).toISOString() };
  }

  const counts: Record<string, number> = {};
  for (const c of categoryCounts) counts[c.category] = Number(c.n);
  counts.__active = Number(totals?.active ?? 0);

  return { rows, recent, wire, totals, wireTotal, latest, counts };
}

const loadHomeCached = unstable_cache(loadHomeData, ["home-feed-v2"], { revalidate: 30 });

/** The sort the island offers. Applied here, in one place, on the page's own slice. */
type SortKey = "recent" | "confirmed" | "trust" | "severe";
function sortRows<T extends { createdAt: Date | string; confirmations: number; severity: number; status: string; updatedAt: Date | string; sourceKind: string; sightings: number; category: string; photoNote: string | null }>(
  rows: T[],
  sort: SortKey,
) {
  const t = nowMs();
  const copy = [...rows];
  if (sort === "confirmed") copy.sort((a, b) => b.confirmations - a.confirmations || +new Date(b.createdAt) - +new Date(a.createdAt));
  else if (sort === "severe") copy.sort((a, b) => b.severity - a.severity || b.confirmations - a.confirmations);
  else if (sort === "trust")
    copy.sort(
      (a, b) =>
        trustFor({ confirmations: b.confirmations, sightings: b.sightings, sourceKind: b.sourceKind, severity: b.severity, status: b.status, updatedAt: b.updatedAt, createdAt: b.createdAt, hasPhotoNote: !!b.photoNote, category: b.category }, t).value -
          trustFor({ confirmations: a.confirmations, sightings: a.sightings, sourceKind: a.sourceKind, severity: a.severity, status: a.status, updatedAt: a.updatedAt, createdAt: a.createdAt, hasPhotoNote: !!a.photoNote, category: a.category }, t).value,
    );
  return copy;
}

export default async function Home({ searchParams }: { searchParams: Promise<Search> }) {
  const sp = await searchParams;
  // Only a known category can reach the cache key; arbitrary strings would fill it.
  const categoryIn = first(sp.category);
  const category = categoryIn && Object.prototype.hasOwnProperty.call(CATEGORIES, categoryIn) ? categoryIn : undefined;
  const parish = knownParish(first(sp.island) ?? first(sp.parish)) ?? undefined;
  const q = param(first(sp.q), 100);
  const statusIn = first(sp.status);
  const status = statusIn === "all" || statusIn === "resolved" ? statusIn : "active";
  const hours = clampInt(first(sp.hours), 0, 0, 24 * 365);
  const sortIn = first(sp.sort);
  const sort: SortKey = sortIn === "confirmed" || sortIn === "trust" || sortIn === "severe" ? sortIn : "recent";
  const view = first(sp.view) === "map" ? "map" : "list";

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
  const { rows, recent, wire, totals, wireTotal, latest, counts } = home;
  const emergencyUp = Number(totals?.activeSevere ?? 0) > 0;
  const adFree = viewer.adFree;
  const handle = viewer.handle;
  const badgeMap = await badgesFor(rows.map((r) => (r.anonymous ? null : r.authorHandle)));
  const engMap = await engagementFor("incident", rows.map((r) => r.id), viewer.userId);

  const sorted = sort === "recent" ? rows : sortRows(rows, sort);
  const stream: FeedRow[] = sorted.map((r) => ({
    id: r.id,
    title: r.title,
    details: r.details,
    category: r.category,
    severity: r.severity,
    lat: r.lat,
    lng: r.lng,
    accuracyMeters: r.accuracyMeters,
    address: r.address,
    street: r.street,
    parish: r.parish,
    status: r.status,
    confirmations: r.confirmations,
    sightings: r.sightings,
    sourceKind: r.sourceKind,
    sourceName: r.sourceName,
    sourceUrl: r.sourceUrl,
    photoNote: r.photoNote,
    authorHandle: r.anonymous ? null : r.authorHandle,
    anonymous: r.anonymous,
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
  }));
  // The card components want plain objects keyed by id / handle — a Map cannot
  // cross the server → client boundary.
  const badges: Record<string, Badge | null> = {};
  const engs: Record<string, Engagement> = {};
  for (const r of sorted) {
    const key = r.anonymous ? "" : (r.authorHandle ?? "");
    badges[key] = badgeMap.get(key) ?? null;
    engs[r.id] = engMap.get(r.id) ?? NO_ENGAGEMENT;
  }

  const anchor = parish ? GAZETTEER.find((g) => g.parish === parish) : undefined;
  const activeCount = Number(totals?.active ?? 0);
  const feedHref = (patch: Record<string, string>) => {
    const p = new URLSearchParams();
    if (status !== "active") p.set("status", status);
    if (category) p.set("category", category);
    if (parish) p.set("island", parish);
    if (q) p.set("q", q);
    if (sort !== "recent") p.set("sort", sort);
    for (const [k, v] of Object.entries(patch)) {
      if (v) p.set(k, v);
      else p.delete(k);
    }
    const qs = p.toString();
    return `/feed${qs ? `?${qs}` : ""}`;
  };

  return (
    <>
      <PageHead
        eyebrow={status === "all" ? "Everything" : status === "active" ? "Live now" : "Cleared"}
        title="The feed"
        blurb={
          parish
            ? `What neighbours are filing on ${parish} right now — pin the road or junction, not a house.`
            : "Floods, outages, road damage and safety hazards, pinned by residents and confirmed by neighbours."
        }
        actions={
          <>
            <span className="nb-num" aria-hidden>
              {activeCount}
            </span>
            <span className="text-[12.5px] font-bold uppercase tracking-[0.14em] text-tertiary">
              live report{activeCount === 1 ? "" : "s"} · {Number(wireTotal?.n ?? 0)} on the wire
            </span>
            <ButtonLink href="/report" variant="primary" size="sm">
              Drop a pin
            </ButtonLink>
          </>
        }
      />

      <div className="mb-4 space-y-3">
        <EmergencyNotice />
        <OfficialSources />
      </div>

      <FeedControls counts={counts} total={stream.length} view={view} />

      <div className="mt-5 pulse-grid-3">
        <div className="pulse-stream-col">
          {view === "map" ? (
            <FeedMap rows={stream} parish={parish ?? null} query={feedHref({ view: "list" })} />
          ) : null}
          <FeedStream
            rows={stream}
            total={stream.length}
            handle={handle}
            badges={badges}
            engs={engs}
            latest={latest}
            spotlight={view === "list" && sort === "recent" && !category}
            emptyTitle={q ? `Nothing matches “${q}”` : "Nothing filed under that yet"}
            emptyBlurb={
              q
                ? "Try a street name, a parish, or a single word. Reports are short — most are one sentence."
                : "Clear the filters, or be the first to report it — the pin takes about twenty seconds and neighbours see it immediately."
            }
            emptyActions={
              <>
                <ButtonLink href="/report" variant="primary" size="sm">
                  Report a spot
                </ButtonLink>
                <Link href={feedHref({ category: "", island: "", q: "", status: "" })} className="nb-btn nb-btn-secondary nb-btn-sm">
                  Clear filters
                </Link>
              </>
            }
          />
        </div>

        <aside className="pulse-inspector">
          <CardLayered className="pulse-card-pad">
            <SectionTitle>What is being filed</SectionTitle>
            <ul className="mt-2.5 grid gap-1.5">
              {(Object.keys(CATEGORIES) as CategoryKey[]).map((key) => {
                const n = counts[key] ?? 0;
                if (!n) return null;
                return (
                  <li key={key}>
                    <Link href={feedHref({ category: key })} className="flex items-center gap-2 rounded-[10px] px-1.5 py-1.5 hover:bg-hover">
                      <span className="pulse-catdot" style={{ ["--spine" as string]: pulseCategoryMeta(key).token }} aria-hidden />
                      <span className="flex-1 text-[12.5px] font-semibold text-secondary">{CATEGORIES[key].label}</span>
                      <span className="font-mono text-[12px] font-bold tabular-nums text-primary">{n}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
            <div className="mt-3 flex items-center gap-1.5">
              <CategoryLegend categories={["flood", "power", "road", "water", "crime", "marine", "health", "trash"]} />
            </div>
          </CardLayered>

          {view === "list" ? (
            <CardLayered className="pulse-card-pad">
              <div className="flex items-baseline justify-between gap-2">
                <SectionTitle>Also on the island</SectionTitle>
                <TextLink href="/map">Open map</TextLink>
              </div>
              <ul className="mt-2 grid gap-1">
                {recent
                  .filter((r) => !stream.some((s) => s.id === r.id))
                  .slice(0, 6)
                  .map((r) => (
                    <li key={r.id}>
                      <IncidentRowMini
                        row={{
                          id: r.id,
                          title: r.title,
                          category: r.category,
                          street: r.street,
                          parish: r.parish,
                          createdAt: r.createdAt,
                        }}
                      />
                    </li>
                  ))}
              </ul>
              {!stream.length ? <p className="mt-1.5 text-[12.5px] text-tertiary">Nothing else recent on this filter.</p> : null}
            </CardLayered>
          ) : null}

          {/* No ads beside an active severe hazard: the space is for the warning. */}
          {!adFree && !emergencyUp ? <AdSlot index={1} variant="rail" /> : null}

          <Panel className="pulse-card-pad">
            <div className="flex items-baseline justify-between gap-2">
              <SectionTitle>From the wire</SectionTitle>
              <TextLink href="/wire">All stories</TextLink>
            </div>
            <ul className="mt-2.5 grid gap-2.5">
              {wire.length ? (
                wire.map((n) => (
                  <li key={n.id}>
                    <a href={n.url} target="_blank" rel="noreferrer" className="group block">
                      <p className="text-[13px] font-semibold leading-snug text-secondary transition-colors group-hover:text-[color:var(--text-accent)]">
                        {n.title}
                      </p>
                      <p className="mt-1 font-mono text-[11.5px] text-tertiary">
                        {n.sourceName} · {timeAgo(n.publishedAt)}
                        {n.parish ? ` · ${n.parish}` : ""}
                      </p>
                    </a>
                  </li>
                ))
              ) : (
                <li className="text-[12.5px] text-tertiary">
                  No stories on the wire yet.{" "}
                  <Link href="/wire" className="font-bold text-[color:var(--text-accent)] hover:underline">
                    Refresh the wire
                  </Link>
                  .
                </li>
              )}
            </ul>
          </Panel>

          <Panel className="pulse-card-pad">
            <SectionTitle>Trust, out loud</SectionTitle>
            <p className="mt-1.5 text-[12.5px] leading-[1.7] text-tertiary">
              Every card carries a number. It weighs who filed it, how many neighbours confirmed it and how long ago — and
              it is deliberately allowed to be low.
            </p>
            <div className="mt-2.5 grid gap-2">
              {[
                { label: "One word, no neighbours", value: 22 },
                { label: "Three confirmations, today", value: 68 },
                { label: "Official bulletin, current", value: 91 },
              ].map((x) => (
                <div key={x.label} className="flex items-center gap-2.5">
                  <span className="flex-1 text-[12px] text-secondary">{x.label}</span>
                  <TrustMeter value={x.value} compact label={`${x.label}: ${x.value} of 100`} />
                </div>
              ))}
            </div>
          </Panel>

          <div className="pulse-card pulse-card-pad" style={{ borderColor: "color-mix(in srgb, var(--warning) 35%, transparent)" }}>
            <SectionTitle>Get pinged for your parish</SectionTitle>
            <p className="mt-1.5 text-[12.5px] leading-[1.7] text-tertiary">
              Choose the islands and categories you care about — floods and power for a Family Island home, safety and
              roads for Nassau.
            </p>
            <ButtonLink href="/alerts" variant="secondary" size="sm" className="mt-3">
              Set up alerts
            </ButtonLink>
          </div>

          {q || category || parish || status !== "active" || sort !== "recent" ? (
            <div className="flex flex-wrap items-center gap-2">
              <Chip tone="tide">filtered</Chip>
              <TextLink href="/feed">See the whole island</TextLink>
              <Eyebrow dot={false}>
                <Link href={feedHref({ view: "map" })}>as pins</Link>
              </Eyebrow>
            </div>
          ) : null}
        </aside>
      </div>
    </>
  );
}
