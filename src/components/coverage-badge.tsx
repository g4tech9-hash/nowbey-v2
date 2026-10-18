import { Radio, Timer } from "lucide-react";

/**
 * COVERAGE BADGE — what is actually live, stated once, everywhere.
 *
 * The map and the feed cover Grand Bahama, Exuma and the rest of the islands,
 * because a neighbour can file a report from anywhere. EMAIL ALERTS are
 * New Providence only. That difference was invisible, so a resident on Exuma
 * could reasonably expect an email and never receive one.
 *
 * This badge says which is which, in one line, in the same words everywhere.
 */

/** The island email alerts cover today. */
export const ALERT_COVERAGE_ISLAND = "New Providence";

export function CoverageBadge({
  className = "",
  tone = "quiet",
}: {
  className?: string;
  /** "quiet" for a rail, "strong" for the alerts page itself. */
  tone?: "quiet" | "strong";
}) {
  const strong = tone === "strong";
  return (
    <p
      className={`flex flex-wrap items-center gap-x-2 gap-y-1 rounded-full border px-3 py-1.5 text-[12px] ${
        strong ? "border-tide-400/40 bg-tide-500/10 text-tide-300" : "border-default bg-white/5 text-tertiary"
      } ${className}`}
    >
      <Radio size={13} strokeWidth={2.4} aria-hidden />
      <span className="font-bold">Live alerts: {ALERT_COVERAGE_ISLAND}</span>
      <span aria-hidden>·</span>
      <Timer size={13} strokeWidth={2.4} aria-hidden />
      <span>other islands soon</span>
      <span className="sr-only">
        The map and the feed cover every island, but email alerts are sent for {ALERT_COVERAGE_ISLAND} only so far.
      </span>
    </p>
  );
}
