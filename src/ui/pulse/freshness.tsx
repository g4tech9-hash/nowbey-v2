"use client";

import { useEffect, useState } from "react";
import { Eye, History, Radio } from "lucide-react";

/**
 * FreshnessPill — is this report still true?
 *
 * Three states, and only one of them pulses: `live` is a signal nobody has
 * disproved recently, `watching` means it needs a re-check, `stale` means an
 * old report that is labelled, never hidden (the product's promise).
 *
 * The age label arrives from the server so first paint is correct — a client
 * `timeAgo(now)` would disagree with the render and shift the layout. After
 * mount the pill refreshes it on its own clock, so an open feed does not go
 * quietly stale on the screen.
 */
export type PulseFreshness = "live" | "watching" | "stale";

const COPY: Record<PulseFreshness, { label: string; icon: typeof Radio; blurb: string }> = {
  live: { label: "Live", icon: Radio, blurb: "Confirmed in the last few hours" },
  watching: { label: "Watching", icon: Eye, blurb: "Nobody has checked it recently" },
  stale: { label: "Stale", icon: History, blurb: "Old enough to verify before you act on it" },
};

function hoursSince(iso: string, now: number): number {
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return 0;
  return Math.max(0, (now - t) / 3_600_000);
}

function ageText(iso: string, now: number): string {
  const h = hoursSince(iso, now);
  if (h < 1) return `${Math.max(1, Math.round(h * 60))} min ago`;
  if (h < 48) return `${Math.round(h)} h ago`;
  return `${Math.round(h / 24)} days ago`;
}

/** Maps the app's own freshness model (src/lib/freshness.ts) onto Pulse's three states. */
export function freshnessLevel(level: "current" | "aging" | "stale"): PulseFreshness {
  return level === "current" ? "live" : level === "aging" ? "watching" : "stale";
}

export function FreshnessPill({
  freshness,
  time,
  label,
  className = "",
}: {
  freshness: PulseFreshness | "current" | "aging" | "stale";
  /** ISO timestamp or Date — the last time anyone touched the report. */
  time: string | Date;
  /** Pre-rendered age text (server path). Omit it and the pill computes after mount. */
  label?: string;
  className?: string;
}) {
  const level: PulseFreshness = freshness === "current" || freshness === "aging" || freshness === "stale" ? freshnessLevel(freshness) : freshness;
  const iso = typeof time === "string" ? time : time.toISOString();
  const { icon: Icon, blurb } = COPY[level];
  const [text, setText] = useState(label ?? "");

  useEffect(() => {
    const tick = () => setText(ageText(iso, Date.now()));
    tick();
    // 60s is plenty for an hour-granularity label and costs nothing on battery.
    const id = setInterval(tick, 60_000);
    return () => clearInterval(id);
  }, [iso]);

  return (
    /* The tooltip used to call `ageText(iso, Date.now())` inline, which made every
       pill impure during render and guaranteed the server's string and the
       client's differed by however long the response took. `text` is the same
       sentence, produced by the minute-tick below, so the tip and the label can
       not disagree. */
    <span className={`pulse-fresh ${className}`} data-freshness={level} title={text ? `${blurb} · ${text}` : blurb}>
      {level === "live" ? <span className="pulse-live-dot" aria-hidden /> : <Icon size={12} strokeWidth={2.4} aria-hidden />}
      <span className="font-mono">{COPY[level].label}</span>
      {text ? <time dateTime={iso} className="font-mono opacity-80">
        {text}
      </time> : null}
      <span className="sr-only">
        {COPY[level].label}: {COPY[level].blurb}.
      </span>
    </span>
  );
}

/** The pulsing "N live now" dot used in headers and rails. */
export function LiveDot({ tone = "var(--success)", count }: { tone?: string; count?: number }) {
  return (
    <span className="inline-flex items-center gap-2" style={{ color: tone }}>
      <span className="pulse-live-dot" style={{ background: "currentColor" }} aria-hidden />
      {count !== undefined ? <span className="font-mono font-bold tabular-nums">{count}</span> : null}
    </span>
  );
}
