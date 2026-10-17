import Link from "next/link";
import { notFound } from "next/navigation";
import { asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { postPhotos, posts } from "@/db/schema";
import { BadgeMark } from "@/components/verified-badge";
import { MapPanel } from "@/components/map/map-panel";
import { AdSlot } from "@/components/ad-slot";
import { PostModActions } from "@/components/admin-community-actions";
import { Discussion } from "@/components/engage/discussion";
import { ReactionBar } from "@/components/engage/reaction-bar";
import { PostActions } from "@/components/life/post-actions";
import { Stars } from "@/components/life/stars";
import { badgesFor } from "@/lib/badges";
import { engagementFor } from "@/lib/engage";
import { NO_ENGAGEMENT } from "@/lib/engage-kinds";
import { formatCoord, timeAgo } from "@/lib/geo";
import { KINDS, listPosts, photoUrl, priceLabel, type KindKey } from "@/lib/life";
import { UUID_RE } from "@/lib/validate";
import { getViewer } from "@/lib/viewer";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!UUID_RE.test(id)) return { title: "Post not found" };
  const [row] = await db.select({ title: posts.title, status: posts.status }).from(posts).where(eq(posts.id, id)).limit(1);
  // A hidden post never leaks its title into the page title.
  return { title: row && row.status === "published" ? row.title : "Island Life" };
}

export default async function PostPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!UUID_RE.test(id)) notFound();
  const [post] = await db.select().from(posts).where(eq(posts.id, id)).limit(1);
  if (!post) notFound();

  const viewer = await getViewer();
  const isOwner = Boolean(viewer.userId) && viewer.userId === post.userId;
  if (post.status !== "published" && !viewer.isEditor && !isOwner) notFound();

  const [photos, engMap, more, badges] = await Promise.all([
    db.select({ id: postPhotos.id, width: postPhotos.width, height: postPhotos.height }).from(postPhotos).where(eq(postPhotos.postId, id)).orderBy(asc(postPhotos.position)),
    engagementFor("post", [id], viewer.userId),
    listPosts({ kind: post.kind as KindKey, perPage: 4 }),
    badgesFor([post.authorHandle]),
  ]);
  const eng = engMap.get(id) ?? NO_ENGAGEMENT;
  const kind = KINDS[post.kind as KindKey] ?? KINDS.tip;
  const price = priceLabel(post.priceLevel);
  const others = more.rows.filter((r) => r.id !== post.id).slice(0, 3);
  const hidden = post.status !== "published";

  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
      <article className="min-w-0">
        <Link href="/life" className="text-[12px] font-bold text-tide-300 hover:underline">
          ← Island Life
        </Link>

        {hidden ? (
          <p className="mt-2 rounded-xl bg-conch-500/12 px-3.5 py-2.5 text-[12.5px] text-danger-500">
            This post is hidden from the public{viewer.isEditor ? ". Staff can restore it below." : ", and only you can see it. Our team may have taken it down."}
          </p>
        ) : null}

        <div className="mt-2 flex flex-wrap items-center gap-x-2.5 gap-y-1">
          <span className="rounded-full px-2 py-0.5 text-[11.5px] font-extrabold uppercase tracking-wide" style={{ background: `${kind.color}26`, color: kind.color }}>
            {kind.label}
          </span>
          {post.parish ? <span className="text-[12px] text-ink-400">{post.parish}</span> : null}
          <span className="text-[11.5px] text-ink-400">{timeAgo(post.createdAt)}</span>
        </div>

        {post.placeName ? (
          <p className="mt-2 flex flex-wrap items-center gap-x-2.5 text-[14px] font-bold text-sand-100">
            {post.placeName}
            <Stars value={post.rating} size={16} />
            {price ? <span className="text-[12.5px] font-semibold text-tide-300">{price}</span> : null}
          </p>
        ) : null}

        <h1 className="display mt-1 text-[clamp(1.5rem,4vw,2.15rem)] font-extrabold leading-[1.08] text-sand-100">{post.title}</h1>

        <div className="mt-2.5 flex flex-wrap items-center gap-2 text-[12.5px] text-ink-400">
          <span className="font-semibold text-sand-100">@{post.authorHandle}</span>
          <BadgeMark kind={badges.get(post.authorHandle) ?? null} />
        </div>

        {photos.length ? (
          <div className={`mt-4 grid gap-2.5 ${photos.length > 1 ? "sm:grid-cols-2" : ""}`}>
            {photos.map((p, i) => (
              <a
                key={p.id}
                href={photoUrl(p.id)}
                target="_blank"
                rel="noopener noreferrer"
                className={`block overflow-hidden rounded-2xl border hairline bg-abyss-800 ${i === 0 && photos.length === 3 ? "sm:col-span-2" : ""}`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element -- member photos are served by our own photo route */}
                <img
                  src={photoUrl(p.id)}
                  alt={`Photo ${i + 1} from ${post.placeName ?? post.title}`}
                  width={p.width}
                  height={p.height}
                  loading={i === 0 ? "eager" : "lazy"}
                  className="max-h-[520px] w-full object-cover"
                />
              </a>
            ))}
          </div>
        ) : null}

        <p className="mt-4 max-w-[68ch] whitespace-pre-line text-[15px] leading-relaxed text-ink-200">{post.body}</p>

        {!hidden ? (
          <div className="mt-4">
            <ReactionBar type="post" id={post.id} initial={eng} signedIn={viewer.signedIn} />
          </div>
        ) : null}
        <div className="mt-3">
          <PostActions id={post.id} title={post.title} isOwner={isOwner} canDelete={isOwner || viewer.isAdmin} />
        </div>

        {viewer.isEditor ? (
          <div className="mt-4 rounded-2xl border border-tide-400/25 bg-tide-500/[.06] p-3">
            <p className="text-[11.5px] font-bold uppercase tracking-wide text-tide-300">
              Staff tools · {post.flagCount} {post.flagCount === 1 ? "report" : "reports"}
            </p>
            <div className="mt-2">
              <PostModActions id={post.id} status={post.status} flagged={post.flagCount > 0} canDelete={viewer.isAdmin} />
            </div>
          </div>
        ) : null}

        {post.lat !== null && post.lng !== null ? (
          <section className="mt-6">
            <p className="display text-[15px] font-extrabold text-sand-100">On the map</p>
            <div className="mt-2 overflow-hidden rounded-2xl border border-tide-500/20">
              <MapPanel
                mode="browse"
                center={[post.lat, post.lng]}
                zoom={16}
                initialLayer="hybrid"
                className="h-[260px] w-full"
                pins={[{ id: post.id, lat: post.lat, lng: post.lng, category: "notice", color: kind.color, label: kind.label, title: post.title, meta: post.placeName ?? post.street ?? "" }]}
              />
            </div>
            <p className="mt-1.5 flex flex-wrap items-center gap-x-3 text-[12px] text-ink-400">
              <span className="font-mono text-[11.5px]">
                {formatCoord(post.lat, "lat")} {formatCoord(post.lng, "lng")}
              </span>
              <a className="font-bold text-tide-300 underline" href={`https://www.google.com/maps/dir/?api=1&destination=${post.lat},${post.lng}`} target="_blank" rel="noopener noreferrer">
                Directions
              </a>
            </p>
          </section>
        ) : null}

        <div className="mt-7">
          <Discussion type="post" id={post.id} viewer={viewer} open={!hidden} />
        </div>
      </article>

      <aside className="space-y-4">
        <div className="nb-surface rounded-xl2 p-3.5">
          <p className="display text-[14.5px] font-bold text-sand-100">More in {kind.label}</p>
          {others.length ? (
            <ul className="mt-2 space-y-2.5">
              {others.map((o) => (
                <li key={o.id}>
                  <Link href={`/life/${o.id}`} className="group block">
                    <span className="block text-[13px] font-semibold leading-snug text-ink-200 group-hover:text-tide-300">{o.title}</span>
                    <span className="block text-[11.5px] text-ink-400">
                      {o.placeName ?? o.parish} · {timeAgo(o.createdAt)}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-1.5 text-[12.5px] text-ink-400">This is the first one in this section.</p>
          )}
          <Link href="/life/new" className="mt-3 inline-block rounded-full bg-sun-500 px-3.5 py-1.5 text-[12.5px] font-extrabold text-abyss-950">
            Share your own
          </Link>
        </div>
        <AdSlot index={3} adFree={viewer.adFree} variant="rail" />
      </aside>
    </div>
  );
}
