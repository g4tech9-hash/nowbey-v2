"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Pause, Play } from "lucide-react";

/**
 * Ticker — the live wire across the top.
 *
 * It is a marquee with three promises a marquee normally breaks:
 *   1. it pauses on hover, on focus and on demand, so a moving line of text is
 *      never unreadable (WCAG 2.2.2 — motion is controllable, not decorative);
 *   2. every item is a real link, tabbable, and tabbing into the strip stops it;
 *   3. the duplication that makes the loop seamless is `aria-hidden`, so a
 *      screen reader hears the wire once instead of twice.
 *
 * The track length is measured, and the duration is derived from it: 44px per
 * second, so 3 items or 30 items scroll at the same speed and nobody has to
 * retune a constant when the feed gets busy.
 */
export type TickerItem = {
  id: string;
  label: string;
  /** Optional colour for the leading dot: pass a token, not a hex. */
  tone?: string;
  href?: string;
  meta?: string;
};

export function Ticker({
  items,
  lead,
  className = "",
  speed = 44,
}: {
  items: TickerItem[];
  /** The label at the left edge, e.g. "LIVE". */
  lead?: string;
  className?: string;
  /** Pixels per second. */
  speed?: number;
}) {
  const [paused, setPaused] = useState(false);
  const [duration, setDuration] = useState(44);
  const trackRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const el = trackRef.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const measure = () => {
      const half = el.scrollWidth / 2;
      if (half > 0) setDuration(Math.max(18, Math.round(half / speed)));
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [items.length, speed]);

  const live = items.length > 0;
  const motionOff = typeof document !== "undefined" && document.documentElement.dataset.motion === "off";

  return (
    <div
      className={`pulse-ticker ${className}`.trim()}
      role="region"
      aria-roledescription="live wire"
      aria-label={lead ? `${lead} — scrolling headlines` : "Live wire — scrolling headlines"}
      data-paused={paused || motionOff ? "true" : undefined}
    >
      {lead ? (
        <span className="pulse-live-flag" style={{ marginLeft: "var(--pulse-space-3)" }}>
          <span className="pulse-live-dot" style={{ background: "currentColor" }} aria-hidden />
          {lead}
        </span>
      ) : null}

      <div className="pulse-ticker-viewport">
        {!live ? (
          <p className="px-1 py-2 text-[12.5px] text-tertiary">The wire is quiet. Nothing new in the last hour.</p>
        ) : (
          <div ref={trackRef} className="pulse-ticker-track" style={{ ["--ticker-duration" as string]: `${duration}s` } as React.CSSProperties}>
            {[0, 1].map((copy) => (
              <div key={copy} className="flex items-center gap-8" aria-hidden={copy === 1}>
                {items.map((item) => (
                  <span key={item.id} className="flex items-center gap-2 whitespace-nowrap text-[12.5px] font-semibold text-secondary">
                    <span
                      className="inline-block h-1.5 w-1.5 rounded-full"
                      style={{ background: item.tone ?? "var(--accent)", boxShadow: `0 0 8px ${item.tone ?? "var(--accent)"}` }}
                      aria-hidden
                    />
                    {item.href && copy === 0 ? (
                      <Link href={item.href} className="hover:text-primary">
                        {item.label}
                      </Link>
                    ) : (
                      <span>{item.label}</span>
                    )}
                    {item.meta ? <span className="font-mono text-[11.5px] text-tertiary tabular-nums">{item.meta}</span> : null}
                  </span>
                ))}
              </div>
            ))}
          </div>
        )}
      </div>

      {live ? (
        <button
          type="button"
          className="nb-btn nb-btn-ghost nb-btn-sm pulse-tight mr-2"
          aria-label={paused ? "Resume the live wire" : "Pause the live wire"}
          aria-pressed={paused}
          onClick={() => setPaused((p) => !p)}
        >
          {paused ? <Play size={13} aria-hidden /> : <Pause size={13} aria-hidden />}
          <span className="hidden sm:inline">{paused ? "Resume" : "Pause"}</span>
        </button>
      ) : null}
    </div>
  );
}
