"use client";

/**
 * SCREEN 4 — BAHAMAS NEWS WIRE (Master Build Section 7). Real Bahamian
 * outlets only (Section 14), every card links out safely (target _blank,
 * rel noreferrer). Community-submitted links are labelled "Sent for review
 * before appearing".
 */
import { RefreshCw } from "lucide-react";
import { NewsWireCard } from "@/components/now/news-wire-card";
import { useWire } from "@/components/now/use-safety";
import { Btn, EmptyState, ErrorState, LoadingState } from "@/components/now/ui";

export default function WirePage() {
  const { stories, state, error, reload } = useWire();

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="nbx-label text-aqua">Bahamas wire</p>
          <h1 className="nbx-h2 mt-2 text-ink">Bahamian news, with context</h1>
          <p className="nbx-body mt-2 max-w-[52ch] text-ink-2">
            Curated feeds from real local outlets and agencies — linked to the map, never rewritten.
            Community-submitted links are sent for review before appearing.
          </p>
        </div>
        <Btn
          variant="ghost"
          onClick={reload}
          loading={state === "loading"}
          icon={<RefreshCw size={16} aria-hidden className={state === "loading" ? "animate-spin" : ""} />}
          className="px-4"
        >
          Update Wire
        </Btn>
      </div>

      {state === "loading" && stories.length === 0 ? <LoadingState label="Updating the wire" rows={3} /> : null}
      {state === "error" ? <ErrorState message={error} onRetry={reload} /> : null}
      {state === "ready" && stories.length === 0 ? (
        <EmptyState title="The wire is quiet right now. Local outlets will appear here as stories land." />
      ) : null}

      {stories.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2">
          {stories.map((story) => (
            <NewsWireCard key={story.id} story={story} />
          ))}
        </div>
      ) : null}
    </div>
  );
}
