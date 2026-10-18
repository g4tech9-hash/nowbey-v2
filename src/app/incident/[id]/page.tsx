import Link from "next/link";
import { notFound } from "next/navigation";
import { and, desc, eq, ne, notInArray } from "drizzle-orm";
import { db, hasDatabase } from "@/db";
import { DatabaseSetup } from "@/components/db-setup";
import { incidentUpdates, incidents, newsItems } from "@/db/schema";
import { MapPanel } from "@/components/map/map-panel";
import { CATEGORIES, formatCoord, haversineMeters, nowMs, timeAgo, type CategoryKey } from "@/lib/geo";
import { HIDDEN_STATUSES, isHiddenStatus } from "@/lib/command";
import { UUID_RE } from "@/lib/validate";
import { getViewer } from "@/lib/viewer";
import { badgesFor } from "@/lib/badges";
import { Discussion } from "@/components/engage/discussion";
import { ReactionBar } from "@/components/engage/reaction-bar";
import { engagementFor } from "@/lib/engage";
import { NO_ENGAGEMENT } from "@/lib/engage-kinds";
import { ReadAloud } from "@/components/read-aloud";
import { UPDATE_LABELS } from "@/components/incident-card";
import { ReportActions } from "@/components/pulse/report-actions";
import {
  AccuracyCard,
  AvatarStack,
  CardLayered,
  CatBadge,
  FreshnessPill,
  SeverityTag,
  TrustCard,
  TrustMeter,
} from "@/ui/pulse";
import { pulseCategoryMeta } from "@/ui/pulse/glyph";
import { trustFor } from "@/lib/pulse/trust";
import { Chip, Eyebrow } from "@/components/ui";

/**
 * ONE REPORT — the full page behind the feed card and the drawer.
 *
 * The drawer answers "is this real and where exactly"; this answers "what should
 * I do about it". So the order is deliberate: what happened → where it is (map +
 * accuracy + how to get there) → how the island has been treating it (timeline) →
 * how much to believe it (trust, out loud, with its arithmetic shown) → the
 * conversation. The action bar is sticky on a phone because that is the one
 * thing a reader is most likely to do next, and it is the same four actions the
 * card offers — same endpoint, same payload.
 *
 * Every query, permission check and hidden-status rule is unchanged from the
 * previous version of this page; only the presentation moved.
 */

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  // No database configured → the page below renders the setup notice, so keep the title generic.
  if (!hasDatabase()) return { title: "Report" };
  if (!UUID_RE.test(id)) return { title: "Report not found" };
  const [row] = await db.select({ title: incidents.title, status: incidents.status }).from(incidents).where(eq(incidents.id, id)).limit(1);
  // A hidden or unfounded report never leaks its title into the page title.
  return { title: row && !isHiddenStatus(row.status) ? row.title : "Report" };
}

export default async function IncidentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!hasDatabase()) {
    return (
      <DatabaseSetup
        eyebrow="Report"
        title="This report opens once the database is connected"
        blurb="Reports live in the database, so this deployment needs its DATABASE_URL before any pin can be shown."
      />
    );
  }
  if (!UUID_RE.test(id)) notFound();
  const [row] = await db.select().from(incidents).where(eq(incidents.id, id)).limit(1);
  if (!row) notFound();

  const [updates, nearby, wire, viewer] = await Promise.all([
    db.select().from(incidentUpdates).where(and(eq(incidentUpdates.incidentId, id), ne(incidentUpdates.kind, "flag"))).orderBy(desc(incidentUpdates.createdAt)),
    db.select().from(incidents).where(notInArray(incidents.status, HIDDEN_STATUSES)).orderBy(desc(incidents.createdAt)).limit(120),
    db
      .select()
      .from(newsItems)
      .where(and(eq(newsItems.review, "approved"), row.parish ? eq(newsItems.parish, row.parish) : undefined))
      .orderBy(desc(newsItems.publishedAt))
      .limit(4),
    getViewer(),
  ]);

  if (isHiddenStatus(row.status) && !viewer.isEditor) notFound();
  const badges = await badgesFor([row.anonymous ? null : row.authorHandle]);
  const meta = CATEGORIES[row.category as CategoryKey] ?? CATEGORIES.notice;
  const hue = pulseCategoryMeta(row.category).token;
  const neighbours = nearby
    .filter((n) => n.id !== row.id)
    .map((n) => ({ row: n, d: haversineMeters([row.lat, row.lng], [n.lat, n.lng]) }))
    .filter((n) => n.d < 1200)
    .sort((a, b) => a.d - b.d)
    .slice(0, 5);
  const handle = viewer.handle;
  const eng = (await engagementFor("incident", [row.id], viewer.userId)).get(row.id) ?? NO_ENGAGEMENT;
  const trust = trustFor(
    {
      confirmations: row.confirmations,
      sightings: row.sightings,
      sourceKind: row.sourceKind,
      severity: row.severity,
      status: row.status,
      updatedAt: row.updatedAt,
      createdAt: row.createdAt,
      hasPhotoNote: !!row.photoNote,
      category: row.category,
    },
    nowMs(),
  );
  const readAloud = `${meta.label}. ${row.title}. ${row.details ?? ""}. Location: ${row.address ?? row.street ?? row.parish ?? "The Bahamas"}. Status: ${row.status}. ${row.confirmations} neighbours confirmed this report.`;

  return (
    <div className="pulse-grid-3">
      <article className="pulse-detail min-w-0">
        <p className="flex flex-wrap items-center gap-2">
          <Link href="/map" className="nb-btn nb-btn-ghost nb-btn-sm">
            <span aria-hidden>←</span>
            Back to the map
          </Link>
          <Link href="/feed" className="pulse-mini-link">
            All reports
          </Link>
        </p>

        <header className="pulse-intro mt-3">
          <div className="flex flex-wrap items-center gap-2">
            <CatBadge category={row.category} />
            <SeverityTag severity={row.severity} category={row.category} />
            <FreshnessPill
              freshness={row.status === "resolved" ? "stale" : "live"}
              time={row.updatedAt}
              label={timeAgo(row.updatedAt)}
            />
            {row.status !== "active" ? <Chip tone="neutral">{row.status}</Chip> : null}
            {row.sourceKind === "official" ? <Chip tone="info">Official bulletin — auto-imported</Chip> : null}
          </div>
          <h1 className="pulse-detail-title mt-3">{row.title}</h1>
          {row.details ? <p className="pulse-lede mt-3">{row.details}</p> : null}
          {row.photoNote ? (
            <p className="pulse-callout mt-3">
              <span className="pulse-callout-label">Photo note</span>
              {row.photoNote}
            </p>
          ) : null}
          <div className="mt-3.5 flex flex-wrap items-center gap-x-3 gap-y-2">
            <span className="flex items-center gap-2">
              <AvatarStack seed={row.anonymous ? row.id : (row.authorHandle ?? row.id)} count={1 + Math.min(3, row.confirmations)} size={26} />
              <span className="text-[12.5px] text-tertiary">
                reported by <span className="font-bold text-primary">@{row.anonymous ? "someone" : (row.authorHandle ?? "someone")}</span>
                {row.authorHandle && badges.get(row.authorHandle) ? (
                  <span className="ml-1.5 align-middle">
                    <Chip tone="tide">verified neighbour</Chip>
                  </span>
                ) : null}
              </span>
            </span>
            <span className="font-mono text-[12px] text-tertiary tabular-nums">
              filed {timeAgo(row.createdAt)} · updated {timeAgo(row.updatedAt)}
            </span>
            <span className="ml-auto">
              <ReadAloud text={readAloud} />
            </span>
          </div>
          <div className="mt-4">
            <ReportActions id={row.id} confirmations={row.confirmations} status={row.status} handle={handle} />
          </div>
        </header>

        <div className="pulse-map-frame mt-4" style={{ ["--spine" as string]: hue }}>
          <MapPanel
            mode="browse"
            center={[row.lat, row.lng]}
            zoom={18}
            initialLayer="hybrid"
            className="h-full w-full"
            pins={[
              {
                id: row.id,
                lat: row.lat,
                lng: row.lng,
                category: row.category as CategoryKey,
                title: row.title,
                meta: `${row.street ?? row.parish ?? "The Bahamas"} · ${timeAgo(row.createdAt)}`,
                live: row.status === "active",
              },
            ]}
          />
        </div>

        <section className="mt-5">
          <h2 className="pulse-section-title">Timeline</h2>
          {updates.length ? (
            <ol className="pulse-timeline">
              {updates.map((u) => (
                <li key={u.id} className="pulse-timeline-item">
                  <p className="text-[13px] text-secondary">
                    <span className="font-bold text-primary">{UPDATE_LABELS[u.kind] ?? u.kind}</span>
                    {u.note ? <span className="text-tertiary"> — {u.note}</span> : null}
                  </p>
                  <p className="mt-0.5 font-mono text-[11.5px] text-tertiary tabular-nums">
                    @{u.authorHandle ?? "someone"} · {timeAgo(u.createdAt)}
                  </p>
                </li>
              ))}
              <li className="pulse-timeline-item">
                <p className="text-[13px] text-secondary">
                  <span className="font-bold text-primary">Report filed</span>
                </p>
                <p className="mt-0.5 font-mono text-[11.5px] text-tertiary tabular-nums">
                  @{row.authorHandle ?? "someone"} · {timeAgo(row.createdAt)}
                </p>
              </li>
            </ol>
          ) : (
            <p className="text-[13px] text-tertiary">
              No follow-ups yet — the first “still there” is what tells the island this is still worth routing around.
            </p>
          )}
        </section>

        <section className="mt-5" id="discussion">
          <h2 className="pulse-section-title">What do you think?</h2>
          <ReactionBar type="incident" id={row.id} initial={eng} signedIn={viewer.signedIn} />
          <div className="mt-3">
            <Discussion type="incident" id={row.id} viewer={viewer} open={!isHiddenStatus(row.status)} />
          </div>
        </section>

        {/* Phones get the action bar again at the bottom edge: nobody should have to
            scroll back up the timeline to confirm what they just read. */}
        <div className="pulse-action-bar-sticky lg:hidden">
          <ReportActions id={row.id} confirmations={row.confirmations} status={row.status} handle={handle} />
        </div>
      </article>

      <aside className="pulse-inspector">
        <CardLayered className="pulse-card-pad">
          <Eyebrow dot={false}>Should you believe it</Eyebrow>
          <div className="mt-2 flex items-center gap-3">
            <TrustMeter value={trust.value} tier={trust.tier} label={`Trust ${trust.value} of 100`} />
          </div>
          <div className="mt-3">
            <TrustCard
              trust={trust}
              sourceKind={row.sourceKind}
              sourceName={row.sourceName}
              sourceUrl={row.sourceUrl}
              href={`/incident/${row.id}`}
            />
          </div>
        </CardLayered>

        <CardLayered className="pulse-card-pad">
          <Eyebrow dot={false}>Where exactly</Eyebrow>
          <div className="mt-2">
            <AccuracyCard
              lat={row.lat}
              lng={row.lng}
              accuracyMeters={row.accuracyMeters}
              address={row.address}
              street={row.street}
              parish={row.parish}
              pinApproximated={!row.accuracyMeters}
              mapHref={`/map?focus=${row.id}`}
            />
          </div>
          <p className="mt-2.5 font-mono text-[11.5px] text-tertiary tabular-nums">
            {formatCoord(row.lat, "lat")} {formatCoord(row.lng, "lng")}
          </p>
          <div className="mt-3 grid gap-1.5">
            {[
              {
                label: "Directions",
                href: `https://www.google.com/maps/dir/?api=1&destination=${row.lat},${row.lng}`,
                external: true,
              },
              {
                label: "Street level",
                href: `https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=${row.lat},${row.lng}`,
                external: true,
              },
              {
                label: "OpenStreetMap",
                href: `https://www.openstreetmap.org/?mlat=${row.lat}&mlon=${row.lng}#map=19/${row.lat}/${row.lng}`,
                external: true,
              },
            ].map((a) => (
              <a
                key={a.label}
                href={a.href}
                target="_blank"
                rel="noreferrer"
                className="flex items-center justify-between gap-2 rounded-[10px] px-2 py-2 text-[12.5px] font-bold text-secondary hover:bg-hover hover:text-primary"
              >
                {a.label}
                <span aria-hidden>↗</span>
              </a>
            ))}
            <Link
              href={`/report?fix=${row.id}`}
              className="flex items-center justify-between gap-2 rounded-[10px] px-2 py-2 text-[12.5px] font-bold text-secondary hover:bg-hover hover:text-primary"
            >
              Pin is wrong — fix it
              <span aria-hidden>→</span>
            </Link>
          </div>
          {row.sourceUrl ? (
            <p className="nb-hint mt-2">
              {row.sourceKind === "official" ? "Official bulletin: " : "From the wire: "}
              <a href={row.sourceUrl} target="_blank" rel="noreferrer" className="nb-link-arrow">
                {row.sourceName ?? "source"}
              </a>
            </p>
          ) : null}
        </CardLayered>

        <CardLayered className="pulse-card-pad">
          <div className="flex items-baseline justify-between gap-2">
            <Eyebrow dot={false}>Within 1.2 km</Eyebrow>
            <Link href={`/map?focus=${row.id}`} className="pulse-mini-link">
              See on map
            </Link>
          </div>
          {neighbours.length ? (
            <ul className="mt-2 grid gap-1">
              {neighbours.map(({ row: n, d }) => (
                <li key={n.id}>
                  <Link href={`/incident/${n.id}`} className="pulse-navtab pulse-navtab-static flex items-start gap-2.5">
                    <span className="pulse-catdot mt-2" style={{ ["--spine" as string]: pulseCategoryMeta(n.category).token }} aria-hidden />
                    <span className="min-w-0">
                      <span className="block text-[12.5px] font-semibold text-primary">{n.title}</span>
                      <span className="block font-mono text-[11px] text-tertiary tabular-nums">
                        {Math.round(d)} m away · {timeAgo(n.createdAt)}
                      </span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-1.5 text-[12.5px] text-tertiary">Nothing else pinned within a short walk.</p>
          )}
        </CardLayered>

        <CardLayered className="pulse-card-pad">
          <div className="flex items-baseline justify-between gap-2">
            <Eyebrow dot={false}>{row.parish ?? "The Bahamas"} on the wire</Eyebrow>
            <Link href="/wire" className="pulse-mini-link">
              All stories
            </Link>
          </div>
          <ul className="mt-2 grid gap-2.5">
            {wire.length ? (
              wire.map((n) => (
                <li key={n.id}>
                  <a href={n.url} target="_blank" rel="noreferrer" className="group block">
                    <span className="block text-[13px] font-semibold leading-snug text-secondary group-hover:text-[color:var(--text-accent)]">
                      {n.title}
                    </span>
                    <span className="block font-mono text-[11px] text-tertiary">
                      {n.sourceName} · {timeAgo(n.publishedAt)}
                    </span>
                  </a>
                </li>
              ))
            ) : (
              <li className="text-[12.5px] text-tertiary">No wire stories matched this island yet.</li>
            )}
          </ul>
        </CardLayered>
      </aside>
    </div>
  );
}
