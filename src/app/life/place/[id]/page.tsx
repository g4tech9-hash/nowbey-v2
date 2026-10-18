import Link from "next/link";
import { notFound } from "next/navigation";
import { eq, asc, sql } from "drizzle-orm";
import { db, hasDatabase } from "@/db";
import { DatabaseSetup } from "@/components/db-setup";
import { placePhotos, places } from "@/db/schema";
import { PageHead } from "@/components/app-shell";
import { PostCard } from "@/components/life/post-card";
import { PlaceEditor } from "@/components/life/place-editor";
import { Stars } from "@/components/life/stars";
import { badgesFor } from "@/lib/badges";
import { engagementFor } from "@/lib/engage";
import { NO_ENGAGEMENT } from "@/lib/engage-kinds";
import { KINDS, isKind, listPosts } from "@/lib/life";
import { DAYS, DAY_LABELS, hoursNote, parseHours } from "@/lib/places";
import { getViewer } from "@/lib/viewer";
import { UUID_RE } from "@/lib/validate";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  // No database configured → the page below renders the setup notice, so keep the title generic.
  if (!hasDatabase()) return { title: "Place · Island Life" };
  if (!UUID_RE.test(id)) return { title: "Place" };
  const [p] = await db.select({ name: places.name }).from(places).where(eq(places.id, id)).limit(1);
  return { title: p ? `${p.name} · Island Life` : "Place" };
}

export default async function PlacePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!hasDatabase()) {
    return (
      <DatabaseSetup
        eyebrow="Island Life"
        title="This place opens once the database is connected"
        blurb="Places and their reviews live in the database, so this deployment needs its DATABASE_URL before anything here can load."
      />
    );
  }
  if (!UUID_RE.test(id)) notFound();
  const [place] = await db.select().from(places).where(eq(places.id, id)).limit(1);
  if (!place) notFound();

  const viewer = await getViewer();
  const [photos, reviews, stats] = await Promise.all([
    db
      .select({ id: placePhotos.id, kind: placePhotos.kind })
      .from(placePhotos)
      .where(eq(placePhotos.placeId, id))
      .orderBy(asc(placePhotos.position), asc(placePhotos.createdAt)),
    listPosts({ placeId: id, perPage: 20 }),
    db.execute(sql`
      with latest as (
        select distinct on (user_id) user_id, rating from posts
        where place_id = ${id} and status = 'published'
        order by user_id, created_at desc)
      select count(rating)::int as ratings, round(avg(rating)::numeric, 1)::float as avg from latest`),
  ]);
  const s = (stats.rows[0] ?? { ratings: 0, avg: null }) as { ratings: number; avg: number | null };
  const [engMap, badges] = await Promise.all([
    engagementFor("post", reviews.rows.map((r) => r.id), viewer.userId),
    badgesFor(reviews.rows.map((r) => r.authorHandle)),
  ]);

  const kind = isKind(place.kind) ? KINDS[place.kind] : KINDS.tip;
  const hours = parseHours(place.hours);
  const note = hoursNote(place.hours);
  let website: string | null = null;
  try {
    const links = JSON.parse(place.socialLinks ?? "null") as { website?: unknown } | null;
    if (links && typeof links.website === "string" && links.website.trim()) website = links.website.trim();
  } catch {
    website = null;
  }
  const menuPhotos = photos.filter((p) => p.kind === "menu");
  const generalPhotos = photos.filter((p) => p.kind === "photo");
  const menuLines = (place.menuText ?? "").split("\n").map((l) => l.trim()).filter(Boolean);
  const hasMenu = menuPhotos.length > 0 || menuLines.length > 0;
  const showMenu = hasMenu || place.kind === "food" || place.kind === "night";
  const directions = place.lat !== null && place.lng !== null
    ? `https://www.google.com/maps/dir/?api=1&destination=${place.lat},${place.lng}`
    : `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(`${place.name}, ${place.parish}, The Bahamas`)}`;

  return (
    <div>
      <PageHead eyebrow={`${kind.label} · ${place.parish}`} title={place.name} blurb={place.address ?? undefined} />

      <div className="mb-5 flex flex-wrap items-center gap-3">
        {s.avg ? (
          <span className="flex items-center gap-2 text-[13px] text-sand-100">
            <Stars value={Math.round(s.avg)} size={14} />
            {s.avg.toFixed(1)} from {s.ratings} {s.ratings === 1 ? "rating" : "ratings"}
          </span>
        ) : (
          <span className="text-[13px] text-ink-400">Not rated yet</span>
        )}
        <a href={directions} target="_blank" rel="noopener noreferrer" className="rounded-full bg-tide-500 px-4 py-2 text-[13px] font-extrabold text-on-accent">
          Directions
        </a>
        <Link href="/life/new" className="rounded-full bg-white/10 px-4 py-2 text-[13px] font-bold text-sand-100 hover:bg-white/15">
          Review this place
        </Link>
      </div>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="min-w-0 space-y-5">
          {generalPhotos.length ? (
            <section className="nb-surface rounded-xl2 p-4">
              <h2 className="display text-[15px] font-bold text-sand-100">Photos</h2>
              <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">
                {generalPhotos.map((p) => (
                  // eslint-disable-next-line @next/next/no-img-element -- place photos are served by our own route
                  <img key={p.id} src={`/api/life/place-photo/${p.id}`} alt={`${place.name}`} loading="lazy" className="aspect-[4/3] w-full rounded-xl object-cover" />
                ))}
              </div>
            </section>
          ) : null}

          {showMenu ? (
            <section className="nb-surface rounded-xl2 p-4">
              <h2 className="display text-[15px] font-bold text-sand-100">Menu</h2>
              {menuPhotos.length ? (
                <div className="mt-2 grid gap-2 sm:grid-cols-2">
                  {menuPhotos.map((p) => (
                    // eslint-disable-next-line @next/next/no-img-element -- place photos are served by our own route
                    <img key={p.id} src={`/api/life/place-photo/${p.id}`} alt={`Menu at ${place.name}`} loading="lazy" className="w-full rounded-xl object-contain" />
                  ))}
                </div>
              ) : null}
              {menuLines.length ? (
                <ul className="mt-3 divide-y divide-white/5">
                  {menuLines.map((l, i) => (
                    <li key={i} className="py-1.5 text-[13.5px] text-ink-200">
                      {l}
                    </li>
                  ))}
                </ul>
              ) : null}
              {!hasMenu ? <p className="mt-2 text-[13px] text-ink-400">No menu added yet. Add a photo or the popular items below.</p> : null}
            </section>
          ) : null}

          <section className="space-y-3">
            <h2 className="display text-[15px] font-bold text-sand-100">Reviews</h2>
            {reviews.rows.length ? (
              <div className="grid gap-4 sm:grid-cols-2">
                {reviews.rows.map((p) => (
                  <PostCard key={p.id} post={p} eng={engMap.get(p.id) ?? NO_ENGAGEMENT} signedIn={viewer.signedIn} badge={badges.get(p.authorHandle) ?? null} />
                ))}
              </div>
            ) : (
              <p className="text-[13px] text-ink-400">No reviews yet. Be the first to review {place.name}.</p>
            )}
          </section>
        </div>

        <aside className="space-y-4">
          <div className="nb-surface rounded-xl2 p-4">
            <h2 className="display text-[15px] font-bold text-sand-100">Opening hours</h2>
            {note && Object.keys(hours).length === 0 ? (
              <p className="mt-2 text-[13px] font-bold text-sun-600">{note}</p>
            ) : null}
            <ul className="mt-2 space-y-1 text-[13px]">
              {DAYS.map((d) => (
                <li key={d} className="flex justify-between gap-3">
                  <span className="text-sand-200">{DAY_LABELS[d]}</span>
                  <span className="text-right text-ink-200">{hours[d] ?? "Not added"}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="nb-surface rounded-xl2 p-4 text-[13px]">
            <h2 className="display text-[15px] font-bold text-sand-100">Address</h2>
            <p className="mt-2 text-ink-200">{place.address ?? "Not added yet."}</p>
            {place.contactNumber ? (
              <p className="mt-1.5">
                <a href={`tel:${place.contactNumber.replace(/[^+\d]/g, "")}`} className="font-bold text-tide-300 underline">
                  {place.contactNumber}
                </a>
              </p>
            ) : null}
            {website ? (
              <p className="mt-1.5">
                <a href={website} target="_blank" rel="noopener noreferrer" className="font-bold text-tide-300 underline">
                  Website
                </a>
              </p>
            ) : null}
            <a href={directions} target="_blank" rel="noopener noreferrer" className="mt-2 inline-block font-bold text-tide-300 underline">
              Get directions
            </a>
          </div>

          <div className="nb-surface rounded-xl2 p-4">
            <h2 className="display text-[15px] font-bold text-sand-100">Add details</h2>
            <p className="mt-1 text-[12px] text-ink-400">Anyone signed in can add or correct hours, the address, the menu and photos.</p>
            <div className="mt-3">
              <PlaceEditor
                placeId={place.id}
                kind={place.kind}
                signedIn={viewer.signedIn}
                initial={{ address: place.address, hours, menuText: place.menuText }}
              />
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
