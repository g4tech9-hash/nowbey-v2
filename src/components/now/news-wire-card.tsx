"use client";

/**
 * News wire card (Master Build Section 6.10) — source pill, island (mono),
 * headline, 2-line summary, "Verified Editorial Link" + Open Source.
 * Community-submitted links say "Sent for review before appearing".
 */
import { CheckCircle2, ExternalLink, ShieldQuestion } from "lucide-react";
import type { WireStory } from "@/lib/safety-store";
import { timeAgo } from "./format";

export function NewsWireCard({ story }: { story: WireStory }) {
  return (
    <article className="nbx-card nbx-card-interactive flex flex-col gap-2.5 p-5">
      <div className="flex flex-wrap items-center gap-2">
        <span className="nbx-label-xs rounded-full border border-aqua/40 bg-aqua/10 px-2.5 py-1 text-aqua">
          {story.sourceName}
        </span>
        <span className="nbx-num text-[12px] font-bold uppercase tracking-[0.08em] text-ink-3">
          {story.island}
        </span>
        <span className="nbx-num ml-auto text-[11px] font-bold text-ink-3">{timeAgo(story.publishedAt)}</span>
      </div>

      <h3 className="nbx-h3 text-ink">{story.headline}</h3>
      <p className="nbx-body line-clamp-2 text-[14px] text-ink-2">{story.summary}</p>

      <div className="mt-auto flex flex-wrap items-center gap-2 pt-2">
        {story.isVerified ? (
          <span className="inline-flex items-center gap-1.5 text-[12px] font-bold text-hz-ok">
            <CheckCircle2 size={14} aria-hidden />
            Verified Editorial Link
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5 text-[12px] font-bold text-ink-2">
            <ShieldQuestion size={14} aria-hidden />
            Sent for review before appearing
          </span>
        )}
        <a
          href={story.sourceUrl}
          target="_blank"
          rel="noreferrer"
          className="nbx-btn nbx-btn-ghost ml-auto min-h-[44px] px-3.5 text-[12px]"
        >
          Open Source
          <ExternalLink size={14} aria-hidden />
        </a>
      </div>
    </article>
  );
}
