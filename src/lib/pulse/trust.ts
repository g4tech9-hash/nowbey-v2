/**
 * PULSE TRUST MODEL
 * ---------------------------------------------------------------------------
 * NowBey has no trust column — the fact is `confirmations`, `sightings`,
 * `sourceKind` and how recently anyone touched the report. TrustMeter renders a
 * score, so the score has to be *derived*, in the open, from those fields.
 *
 * This is presentation maths, not business logic: it never changes what a
 * report says, only how confidently it says it. It is pure and synchronous so
 * the server and the client compute the same number (no hydration mismatch),
 * and it is covered by tests/pulse-trust.test.mjs.
 *
 * THE WORDING CHANGED, AND THE WORDING WAS THE BUG.
 *
 * A report with 14 neighbours behind it read "Trust 40 of 100 — Shaky",
 * because it had not been touched in a week and the score was doing something
 * a score should not do: judging a report that a dozen people had already
 * vouched for. "Shaky" is a word about the *reporter*. It read as an insult
 * to somebody who had done the right thing.
 *
 * So the tiers now say what is true about the *evidence*:
 *
 *   Unverified       nobody has confirmed it
 *   Partly confirmed some neighbours have seen it
 *   Well confirmed   several people confirmed it, recently
 *   Needs a recheck  people confirmed it, but nobody has checked since
 *
 * And the card leads with the reason, not the number:
 *
 *   "14 neighbours confirmed, but nobody has checked in 7 days"
 *
 * The "Verify before you act" line stays, because it is the product's promise.
 */
import { ageLabel, getFreshness, hoursSince, type FreshnessBand } from "@/lib/freshness";

export type TrustSignals = {
  confirmations: number;
  sightings?: number;
  sourceKind?: string;
  severity?: number;
  status?: string;
  updatedAt?: string | Date | null;
  createdAt?: string | Date;
  hasPhotoNote?: boolean;
  category?: string;
};

export type TrustTier = "unverified" | "partial" | "well" | "recheck";

export type TrustScore = {
  /** 0–100, for the meter. */
  value: number;
  tier: TrustTier;
  /** The plain sentence that leads the card: what is true, in words. */
  lead: string;
  /** The reasons, in the order they were added, for the drawer's trust card. */
  reasons: { label: string; delta: number }[];
};

/** A neighbour's word counts for a while, then it stops counting for much. */
function confirmationCredit(n: number): number {
  return Math.min(30, Math.round(12 * Math.log2(1 + Math.max(0, n)) + Math.max(0, n) * 1.6));
}

/**
 * The sentence that leads the card. It says how many people said so, and when
 * it was last said. That is the whole story, and it is true either way.
 */
function leadFor(confirmations: number, sightings: number, band: FreshnessBand, hoursAgo: number, sourceKind?: string): string {
  const n = confirmations + sightings;
  if (sourceKind === "official") return "From an official bulletin, checked recently";
  if (n === 0) return "Nobody has confirmed this yet";
  const people = `${confirmations || sightings} ${confirmations === 1 && sightings === 0 ? "neighbour has" : "neighbours have"} confirmed`;
  if (band === "stale") {
    const days = Math.max(1, Math.round(hoursAgo / 24));
    return `${people}, but nobody has checked in ${days} ${days === 1 ? "day" : "days"}`;
  }
  return `${people}, last ${ageLabel(hoursAgo).replace(" ago", "")} ago`;
}

export function trustFor(signals: TrustSignals, now: number = Date.now()): TrustScore {
  const reasons: { label: string; delta: number }[] = [];
  let value = 0;

  const n = Math.max(0, signals.confirmations ?? 0);
  const confirmCredit = confirmationCredit(n);
  if (confirmCredit > 0) {
    value += confirmCredit;
    reasons.push({ label: `${n} neighbour${n === 1 ? "" : "s"} confirmed`, delta: confirmCredit });
  }

  const s = Math.max(0, signals.sightings ?? 0);
  if (s > 0) {
    const credit = Math.min(10, s * 3);
    value += credit;
    reasons.push({ label: `${s} “saw it too”`, delta: credit });
  }

  if (signals.sourceKind === "official") {
    value += 34;
    reasons.push({ label: "Official source", delta: 34 });
  } else if (signals.sourceKind === "news") {
    value += 18;
    reasons.push({ label: "From a named newsroom", delta: 18 });
  }

  const stamp = signals.updatedAt ?? signals.createdAt;
  const fresh = getFreshness(stamp, "report", now);
  if (fresh.band === "live") {
    value += 20;
    reasons.push({ label: "Confirmed in the last two hours", delta: 20 });
  } else if (fresh.band === "recent") {
    value += 16;
    reasons.push({ label: "Confirmed within the last day", delta: 16 });
  } else if (fresh.band === "aging") {
    value += 8;
    reasons.push({ label: "Needs a fresh look", delta: 8 });
  } else {
    reasons.push({ label: "Nobody has checked it lately", delta: 0 });
  }

  if (signals.hasPhotoNote) {
    value += 6;
    reasons.push({ label: "Photo note attached", delta: 6 });
  }

  if (signals.status && signals.status !== "active") {
    value += 12;
    reasons.push({ label: "Closed out by the community", delta: 12 });
  }

  // Nobody has backed it yet: keep a floor so the meter is never read as "0% true".
  if (value === 0) value = 12;

  value = Math.max(5, Math.min(99, value));

  const backed = n + s > 0 || signals.sourceKind === "official" || signals.sourceKind === "news";
  const tier: TrustTier = !backed
    ? "unverified"
    : fresh.band === "stale"
      ? "recheck"
      : value >= 65
        ? "well"
        : "partial";

  return {
    value,
    tier,
    lead: leadFor(n, s, fresh.band, hoursSince(stamp, now), signals.sourceKind),
    reasons,
  };
}

/** One token per tier, so CSS owns the colour and the component owns the maths. */
export const TRUST_TOKEN: Record<TrustTier, string> = {
  unverified: "var(--danger)",
  partial: "var(--info)",
  well: "var(--success)",
  recheck: "var(--warning)",
};

export const TRUST_LABEL: Record<TrustTier, string> = {
  unverified: "Unverified",
  partial: "Partly confirmed",
  well: "Well confirmed",
  recheck: "Needs a recheck",
};

export const TRUST_BLURB: Record<TrustTier, string> = {
  unverified: "Nobody has confirmed this yet. Treat it as a tip, not a fact.",
  partial: "Some neighbours have seen it. Verify before you act on it.",
  well: "Several people confirmed it, and it was checked recently.",
  recheck: "People confirmed this, but nobody has checked in a while. Verify before you act on it.",
};

/** The line that never goes away. */
export const VERIFY_BEFORE_YOU_ACT = "Verify before you act.";
