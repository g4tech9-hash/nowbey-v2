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
export type PulseFreshness = "live" | "recent" | "aging" | "stale" | "watching";

const COPY: Record<PulseFreshness, { label: string; icon: typeof Radio; blurb: string }> = {
  live: { label: "Live", icon: Radio, blurb: "Confirmed in the last few hours" },
  recent: { label: "Recent", icon: Radio, blurb: "Confirmed in the last day" },
  aging: { label: "Needs a recheck", icon: Eye, blurb: "Needs a fresh check" },
  watching: { label: "Needs a recheck", icon: Eye, blurb: "Needs a fresh check" },
  stale: { label: "Stale", icon: History, blurb: "Nobody has checked it in days — verify before you act" },
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

/** Maps the app's own freshness model onto Pulse states — now 4 bands. */
export function freshnessLevel(level: "current" | "aging" | "stale"): PulseFreshness {
  return level === "current" ? "live" : level === "aging" ? "aging" : "stale";
}

/** New unified mapping from getFreshness band */
export function bandToPulse(band: "live" | "recent" | "aging" | "stale"): PulseFreshness {
  return band as PulseFreshness;
}

function bandFrom(iso: string, now: number): PulseFreshness {
  const h = hoursSince(iso, now);
  if (h < 2) return "live";
  if (h < 24) return "recent";
  if (h < 72) return "aging";
  return "stale";
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
  // `freshness` is the server-side fallback (computed at request time by the caller);
  // after mount the pill re-derives the band from `time` on its own clock so an open
  // feed never keeps a stale band on screen. No Date.now() during render (purity).
  const fallback: PulseFreshness = freshness === "current" || freshness === "aging" || freshness === "stale" ? freshnessLevel(freshness) : freshness === "watching" ? "aging" : freshness;
  const iso = typeof time === "string" ? time : time.toISOString();
  const [level, setLevel] = useState<PulseFreshness>(fallback);
  const { icon: Icon, blurb } = COPY[level];
  const [text, setText] = useState(label ?? "");

  useEffect(() => {
    const tick = () => {
      const now = Date.now();
      setText(ageText(iso, now));
      setLevel(bandFrom(iso, now));
    };
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
    /* suppressHydrationWarning on the two places the clock is printed: the age
       is derived from Date.now() (server request time vs the client's first
       frame), so a minute boundary crossed during hydration is expected and is
       not a markup bug. The pill corrects itself on the next tick either way. */
    <span className={`pulse-fresh ${className}`} data-freshness={level} title={text ? `${blurb} · ${text}` : blurb} suppressHydrationWarning>
      {level === "live" ? <span className="pulse-live-dot" aria-hidden /> : <Icon size={12} strokeWidth={2.4} aria-hidden />}
      <span className="font-mono">{COPY[level].label}</span>
      {text ? <time dateTime={iso} className="font-mono opacity-80" suppressHydrationWarning>
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
