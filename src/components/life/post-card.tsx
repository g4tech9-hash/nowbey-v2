import Link from "next/link";
import { BadgeMark } from "@/components/verified-badge";
import { ReactionBar } from "@/components/engage/reaction-bar";
import { timeAgo } from "@/lib/geo";
import type { Badge } from "@/lib/badges";
import type { Engagement } from "@/lib/engage-kinds";
import { KINDS, photoUrl, priceLabel, type KindKey } from "@/lib/life-kinds";
import type { PostRow } from "@/lib/life";
import { Stars } from "./stars";

export function PostCard({ post, eng, signedIn, badge }: { post: PostRow; eng: Engagement; signedIn: boolean; badge: Badge | null }) {
  const kind = KINDS[post.kind as KindKey] ?? KINDS.tip;
  const price = priceLabel(post.priceLevel);

  return (
    <article className="glass flex flex-col overflow-hidden rounded-2xl">
      {post.firstPhotoId ? (
        <Link href={`/life/${post.id}`} className="relative block aspect-[16/10] bg-hover">
          {/* eslint-disable-next-line @next/next/no-img-element -- member photos are served by our own photo route */}
          <img src={photoUrl(post.firstPhotoId, "thumb")} alt={`Photo from ${post.placeName ?? post.title}`} loading="lazy" className="h-full w-full object-cover" />
          {post.photoCount > 1 ? (
            <span className="absolute right-2 top-2 rounded-full bg-base/75 px-2 py-0.5 text-[11.5px] font-bold text-primary">+{post.photoCount - 1} more</span>
          ) : null}
        </Link>
      ) : null}

      <div className="flex flex-1 flex-col p-3.5">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <span className="rounded-full px-2 py-0.5 text-[11.5px] font-extrabold uppercase tracking-wide" style={{ background: `${kind.color}26`, color: kind.color }}>
            {kind.label}
          </span>
          {post.parish ? <span className="text-[11.5px] text-tertiary">{post.parish}</span> : null}
          <span className="ml-auto text-[11.5px] text-tertiary">{timeAgo(post.createdAt)}</span>
        </div>

        {post.placeName ? (
          <p className="mt-2 flex flex-wrap items-center gap-x-2 text-[12.5px] font-bold text-primary">
            {post.placeName}
            <Stars value={post.rating} size={13} />
            {price ? <span className="text-[11.5px] font-semibold text-text-accent">{price}</span> : null}
          </p>
        ) : null}

        <h3 className="display mt-1 text-[16px] font-extrabold leading-snug text-primary">
          <Link href={`/life/${post.id}`} className="hover:text-text-accent">
            {post.title}
          </Link>
        </h3>
        <p className="mt-1 line-clamp-3 text-[13px] leading-relaxed text-tertiary">{post.body}</p>

        <div className="mt-auto pt-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[12px] text-tertiary">@{post.authorHandle}</span>
            <BadgeMark kind={badge} />
          </div>
          <div className="mt-2 flex flex-wrap items-start justify-between gap-x-3 gap-y-2">
            <ReactionBar type="post" id={post.id} initial={eng} signedIn={signedIn} variant="compact" />
            <Link
              href={`/life/${post.id}#comments`}
              className="inline-flex min-h-[36px] items-center rounded-full bg-white/8 px-3 text-[12.5px] font-bold text-secondary hover:bg-white/14"
              aria-label={`${eng.comments} comments`}
            >
              {eng.comments} {eng.comments === 1 ? "comment" : "comments"}
            </Link>
          </div>
        </div>
      </div>
    </article>
  );
}
