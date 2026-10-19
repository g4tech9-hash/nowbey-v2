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
 */
import { freshnessFor } from "@/lib/freshness";
import type { CategoryKey } from "@/lib/geo";

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

export type TrustTier = "unverified" | "partly" | "well" | "recheck";

export type TrustScore = {
  /** 0–100, for the meter. */
  value: number;
  tier: TrustTier;
  /** The reasons, in the order they were added, for the drawer's trust card. */
  reasons: { label: string; delta: number }[];
  /** Human-readable reason leading the card, e.g. "14 confirmed, but nobody has checked in 7 days" */
  leadReason: string;
};

const TIER_FOR = (value: number): TrustTier => (value >= 75 ? "well" : value >= 50 ? "partly" : value >= 25 ? "recheck" : "unverified");

/** A neighbour's word counts for a while, then it stops counting for much. */
function confirmationCredit(n: number): number {
  return Math.min(30, Math.round(12 * Math.log2(1 + Math.max(0, n)) + Math.max(0, n) * 1.6));
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
  if (stamp) {
    const fresh = freshnessFor((signals.category ?? "notice") as CategoryKey, stamp, now);
    if (fresh.level === "current") {
      value += 20;
      reasons.push({ label: "Confirmed recently", delta: 20 });
    } else if (fresh.level === "aging") {
      value += 8;
      reasons.push({ label: "Needs a fresh look", delta: 8 });
    } else {
      reasons.push({ label: "Nobody has checked it lately", delta: 0 });
    }
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
  const tier = TIER_FOR(value);
  // Lead with reason: combine confirmation count + staleness
  const stale = !stamp ? false : (() => {
    const fresh = freshnessFor((signals.category ?? "notice") as CategoryKey, stamp, now);
    return fresh.level === "stale";
  })();
  const daysAgo = stamp ? Math.round(Math.max(0, (now - new Date(stamp).getTime()) / 86400000)) : 0;
  let leadReason = "";
  if (n > 0 && stale) leadReason = `${n} confirmed, but nobody has checked in ${daysAgo} days`;
  else if (n > 0) leadReason = `${n} neighbour${n === 1 ? "" : "s"} confirmed`;
  else if (stale) leadReason = `Nobody has checked in ${daysAgo} days`;
  else leadReason = "Awaiting confirmation";

  return { value, tier, reasons, leadReason };
}

/** One token per tier, so CSS owns the colour and the component owns the maths. */
export const TRUST_TOKEN: Record<TrustTier, string> = {
  unverified: "var(--danger)",
  partly: "var(--warning)",
  recheck: "var(--warning)",
  well: "var(--success)",
} as Record<string, string>;
// Legacy aliases for components still reading old tier names
(TRUST_TOKEN as any).shaky = TRUST_TOKEN.partly;
(TRUST_TOKEN as any).solid = TRUST_TOKEN.partly;
(TRUST_TOKEN as any).verified = TRUST_TOKEN.well;

export const TRUST_LABEL: Record<TrustTier, string> = {
  unverified: "Unverified",
  partly: "Partly confirmed",
  recheck: "Needs a recheck",
  well: "Well confirmed",
};

// Legacy labels for old meter values
(TRUST_LABEL as any).shaky = "Partly confirmed";
(TRUST_LABEL as any).solid = "Partly confirmed";
(TRUST_LABEL as any).verified = "Well confirmed";

export const TRUST_BLURB: Record<TrustTier, string> = {
  unverified: "Nobody has confirmed this yet. Treat it as a tip, not a fact.",
  partly: "A few neighbours have confirmed it. Verify before you act on it.",
  recheck: "Confirmed before, but nobody has checked in a while — verify before you act.",
  well: "Several neighbours confirmed it recently, or from a named official source.",
};

// Back-compat aliases for older code expecting shaky/solid/verified
export const TRUST_LABEL_LEGACY: Record<string, string> = {
  shaky: TRUST_LABEL.partly,
  solid: TRUST_LABEL.partly,
  verified: TRUST_LABEL.well,
};
