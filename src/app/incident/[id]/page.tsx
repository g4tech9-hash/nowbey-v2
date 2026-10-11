import Link from "next/link";
import { notFound } from "next/navigation";
import { and, desc, eq, ne } from "drizzle-orm";
import { db } from "@/db";
import { incidentUpdates, incidents, newsItems, users } from "@/db/schema";
import { MapPanel } from "@/components/map/map-panel";
import { IncidentActions } from "@/components/incident-actions";
import { AdSlot } from "@/components/ad-slot";
import { CATEGORIES, type CategoryKey, formatCoord, haversineMeters, timeAgo } from "@/lib/geo";
import { UUID_RE } from "@/lib/validate";
import { getViewer } from "@/lib/viewer";
import { badgesFor } from "@/lib/badges";
import { BadgeMark } from "@/components/verified-badge";
import { Discussion } from "@/components/engage/discussion";
import { ReactionBar } from "@/components/engage/reaction-bar";
import { engagementFor } from "@/lib/engage";
import { NO_ENGAGEMENT } from "@/lib/engage-kinds";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!UUID_RE.test(id)) return { title: "Report not found" };
  const [row] = await db.select({ title: incidents.title, status: incidents.status }).from(incidents).where(eq(incidents.id, id)).limit(1);
  // A hidden report never leaks its title into the page title.
  return { title: row && row.status !== "archived" ? row.title : "Report" };
}

export default async function IncidentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!UUID_RE.test(id)) notFound();
  const [row] = await db.select().from(incidents).where(eq(incidents.id, id)).limit(1);
  if (!row) notFound();

  const [updates, nearby, wire, viewer] = await Promise.all([
    db.select().from(incidentUpdates).where(and(eq(incidentUpdates.incidentId, id), ne(incidentUpdates.kind, "flag"))).orderBy(desc(incidentUpdates.createdAt)),
    db.select().from(incidents).where(ne(incidents.status, "archived")).orderBy(desc(incidents.createdAt)).limit(120),
    db
      .select()
      .from(newsItems)
      .where(and(eq(newsItems.review, "approved"), row.parish ? eq(newsItems.parish, row.parish) : undefined))
      .orderBy(desc(newsItems.publishedAt))
      .limit(4),
    getViewer(),
  ]);

  if (row.status === "archived" && !viewer.isEditor) notFound();
  const badges = await badgesFor([row.anonymous ? null : row.authorHandle]);
  const meta = CATEGORIES[row.category as CategoryKey] ?? CATEGORIES.notice;
  const neighbours = nearby
    .filter((n) => n.id !== row.id)
    .map((n) => ({ row: n, d: haversineMeters([row.lat, row.lng], [n.lat, n.lng]) }))
    .filter((n) => n.d < 1200)
    .sort((a, b) => a.d - b.d)
    .slice(0, 5);
  const handle = viewer.handle;
  const adFree = viewer.adFree;
  const eng = (await engagementFor("incident", [row.id], viewer.userId)).get(row.id) ?? NO_ENGAGEMENT;

  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_330px]">
      <article>
        <Link href="/map" className="text-[12px] font-bold text-tide-300 hover:underline">
          ← Back
        </Link>

        <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] font-bold uppercase tracking-wide">
          <span className="rounded-full px-2 py-0.5" style={{ background: `${meta.color}26`, color: meta.color }}>
            {meta.label}
          </span>
          <span className="text-[#8fb9b6]">severity {row.severity}/4</span>
          <span
            className={`rounded-full px-2 py-0.5 ${
              row.status === "active" ? "bg-conch-500/18 text-conch-400" : "bg-white/10 text-[#a9cdc9]"
            }`}
          >
            {row.status === "active" ? "open" : row.status}
          </span>
          <span className="text-[#6e97a0] normal-case tracking-normal">
            filed {timeAgo(row.createdAt)} · updated {timeAgo(row.updatedAt)}
          </span>
        </div>

        <h1 className="display mt-2 text-[clamp(1.5rem,4vw,2.15rem)] font-extrabold leading-[1.08] text-sand-100">{row.title}</h1>
        {row.details ? (
          <p className="mt-2.5 max-w-[70ch] text-[14.5px] leading-relaxed text-[#cfeee9]">{row.details}</p>
        ) : null}
        {row.photoNote ? (
          <p className="mt-2 max-w-[70ch] rounded-xl border-l-[3px] border-white/15 bg-white/[.04] px-3 py-2 text-[12.5px] text-[#a9cdc9]">
            Photo note: {row.photoNote}
          </p>
        ) : null}

        <div className="mt-3.5 flex flex-wrap items-center gap-2 text-[12px] text-[#8fb9b6]">
          <span className="font-semibold text-sand-100">@{row.authorHandle ?? "someone"}</span>
          <BadgeMark kind={badges.get(row.authorHandle ?? "")} />
          <span>· {row.confirmations} neighbours confirm it is still there</span>
        </div>

        <div className="mt-4 overflow-hidden rounded-2xl border border-tide-500/20">
          <MapPanel
            mode="browse"
            center={[row.lat, row.lng]}
            zoom={18}
            initialLayer="hybrid"
            className="h-[260px] w-full sm:h-[340px]"
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

        <div className="mt-3 grid gap-2 sm:grid-cols-2 [&_a]:min-h-[40px] [&_a]:inline-flex [&_a]:items-center">
          <div className="glass rounded-xl p-3">
            <p className="text-[10.5px] font-bold uppercase tracking-[0.16em] text-[#6e97a0]">Pinned location</p>
            <p className="mt-1 font-mono text-[12.5px] text-tide-300">
              {formatCoord(row.lat, "lat")} {formatCoord(row.lng, "lng")}
            </p>
            <p className="mt-1 text-[12px] text-[#a9cdc9]">
              {row.address ?? row.street ?? "No matched address"}
              {row.parish ? ` · ${row.parish}` : ""}
            </p>
            <p className="mt-1 text-[11.5px] text-[#6e97a0]">
              {row.accuracyMeters
                ? `Placed to about ± ${Math.round(row.accuracyMeters)} m by the reporter.`
                : "Reporter did not zoom in close — treat the street, not the dot, as the truth."}
            </p>
          </div>
          <div className="glass rounded-xl p-3">
            <p className="text-[10.5px] font-bold uppercase tracking-[0.16em] text-[#6e97a0]">Get there / see it</p>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              <a
                className="rounded-full bg-white/8 px-2.5 py-1.5 text-[11.5px] font-bold hover:bg-white/16"
                href={`https://www.google.com/maps/dir/?api=1&destination=${row.lat},${row.lng}`}
                target="_blank"
                rel="noreferrer"
              >
                Directions
              </a>
              <a
                className="rounded-full bg-white/8 px-2.5 py-1.5 text-[11.5px] font-bold hover:bg-white/16"
                href={`https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=${row.lat},${row.lng}`}
                target="_blank"
                rel="noreferrer"
              >
                Street level
              </a>
              <a
                className="rounded-full bg-white/8 px-2.5 py-1.5 text-[11.5px] font-bold hover:bg-white/16"
                href={`https://www.openstreetmap.org/?mlat=${row.lat}&mlon=${row.lng}#map=19/${row.lat}/${row.lng}`}
                target="_blank"
                rel="noreferrer"
              >
                OpenStreetMap
              </a>
              <Link href={`/report`} className="rounded-full bg-white/8 px-2.5 py-1.5 text-[11.5px] font-bold hover:bg-white/16">
                Pin is wrong — fix it
              </Link>
            </div>
            {row.sourceUrl ? (
              <p className="mt-2 text-[11.5px] text-[#8fb9b6]">
                From the wire:{" "}
                <a href={row.sourceUrl} target="_blank" rel="noreferrer" className="font-bold text-tide-300 hover:underline">
                  {row.sourceName ?? "source"}
                </a>
              </p>
            ) : null}
          </div>
        </div>

        <div className="mt-4">
          <p className="display text-[15px] font-extrabold text-sand-100">Is it still going on?</p>
          <div className="mt-2">
            <IncidentActions id={row.id} confirmations={row.confirmations} status={row.status} handle={handle} />
          </div>
        </div>

        <section className="mt-5">
          <p className="display text-[15px] font-extrabold text-sand-100">Timeline</p>
          <ol className="mt-2 space-y-2">
            {updates.length ? (
              updates.map((u) => (
                <li key={u.id} className="flex gap-2.5 rounded-xl bg-white/[.04] px-3 py-2 text-[12.5px]">
                  <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full" style={{ background: meta.color }} />
                  <span>
                    <span className="font-bold text-sand-100">{LABELS[u.kind] ?? u.kind}</span>
                    {u.note ? <span className="text-[#cfeee9]"> — {u.note}</span> : null}
                    <span className="block text-[11px] text-[#6e97a0]">
                      @{u.authorHandle ?? "someone"} · {timeAgo(u.createdAt)}
                    </span>
                  </span>
                </li>
              ))
            ) : (
              <li className="text-[12.5px] text-[#6e97a0]">No follow-ups yet.</li>
            )}
            <li className="flex gap-2.5 rounded-xl bg-white/[.04] px-3 py-2 text-[12.5px]">
              <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-white/30" />
              <span>
                <span className="font-bold text-sand-100">Report filed</span>
                <span className="block text-[11px] text-[#6e97a0]">
                  @{row.authorHandle ?? "someone"} · {timeAgo(row.createdAt)}
                </span>
              </span>
            </li>
          </ol>
        </section>

        <div className="mt-6">
          <p className="mb-1.5 text-[11px] font-bold uppercase tracking-wide text-tide-400">What do you think?</p>
          <ReactionBar type="incident" id={row.id} initial={eng} signedIn={viewer.signedIn} />
        </div>

        <div className="mt-6">
          <Discussion type="incident" id={row.id} viewer={viewer} open={row.status !== "archived"} />
        </div>
      </article>

      <aside className="space-y-4">
        <div className="glass rounded-2xl p-3.5">
          <p className="display text-[14.5px] font-bold text-sand-100">Within 1.2 km</p>
          {neighbours.length ? (
            <ul className="mt-2 space-y-2">
              {neighbours.map(({ row: n, d }) => (
                <li key={n.id}>
                  <Link href={`/incident/${n.id}`} className="group flex items-start gap-2">
                    <span className="mt-1 h-2 w-2 shrink-0 rounded-full" style={{ background: CATEGORIES[n.category as CategoryKey]?.color }} />
                    <span>
                      <span className="block text-[12.5px] font-semibold group-hover:text-tide-300">{n.title}</span>
                      <span className="block text-[11px] text-[#6e97a0]">
                        {Math.round(d)} m away · {timeAgo(n.createdAt)}
                      </span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-1.5 text-[12.5px] text-[#6e97a0]">Nothing else pinned within a short walk.</p>
          )}
        </div>

        <AdSlot index={2} adFree={adFree} variant="rail" />

        <div className="glass rounded-2xl p-3.5">
          <p className="display text-[14.5px] font-bold text-sand-100">{row.parish ?? "The Bahamas"} on the wire</p>
          <ul className="mt-2 space-y-2">
            {wire.length ? (
              wire.map((n) => (
                <li key={n.id}>
                  <a href={n.url} target="_blank" rel="noreferrer" className="group block">
                    <span className="block text-[12.5px] font-semibold leading-snug text-[#dff3f0] group-hover:text-tide-300">{n.title}</span>
                    <span className="block text-[11px] text-[#6e97a0]">
                      {n.sourceName} · {timeAgo(n.publishedAt)}
                    </span>
                  </a>
                </li>
              ))
            ) : (
              <li className="text-[12.5px] text-[#6e97a0]">No wire stories matched this island yet.</li>
            )}
          </ul>
        </div>
      </aside>
    </div>
  );
}

const LABELS: Record<string, string> = {
  confirm: "Confirmed still there",
  photo: "Saw it too",
  note: "Left a note",
  clear: "Marked cleared",
  escalate: "Escalated severity",
};
