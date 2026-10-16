export type Perk = {
  text: string;
  /** true while the perk is announced but not built yet; shown with a "Soon" tag */
  soon?: boolean;
};

export type TierKey = "conch" | "rock" | "admiral";
export type Interval = "month" | "year";

/** Tier accent colours are Option B tokens (see src/index.css) so pricing cards, badges and the
 *  account page all share one palette. They are plain strings because they land in inline styles. */
export type Tier = {
  key: TierKey;
  name: string;
  /** US dollars, to the cent. Includes the 20% allowance for app-store and card fees. */
  monthly: number;
  /** US dollars; ten times the monthly price, so two months are free */
  yearly: number;
  blurb: string;
  perks: Perk[];
  tone: string;
};

/** Plan states that count as "paying" (or trialling a demo plan). */
/** "comp" is a complimentary plan granted by NowBey staff. It involves no payment. */
export const ENTITLED_STATUSES = ["active", "sandbox", "past_due", "canceling", "comp"];

export const FREE_PLAN = {
  name: "Free",
  tone: "var(--color-ink-200)",
  blurb: "Everything you need to read the map, report a problem and confirm what neighbours see. Paid for by ads.",
  perks: [
    { text: "Live map with aerial imagery and street names" },
    { text: "File reports and confirm other people's" },
    { text: "News wire from Bahamian outlets" },
    { text: "Email alerts for one island" },
    { text: "Storm warnings always reach you, whatever you filter" },
    { text: "Shows house ads" },
  ] satisfies Perk[],
};

export const TIERS: Record<TierKey, Tier> = {
  conch: {
    key: "conch",
    name: "Conch",
    monthly: 10.8,
    yearly: 108,
    blurb: "The same NowBey with the ads switched off.",
    tone: "var(--color-cyan)",
    perks: [
      { text: "Everything in Free" },
      { text: "No ads, anywhere" },
      { text: "Several email alert profiles, for home and family" },
      { text: "Alerts for as many islands as you like" },
      { text: "Push alerts in the Android app", soon: true },
    ],
  },
  rock: {
    key: "rock",
    name: "Rock Sound",
    monthly: 18,
    yearly: 180,
    blurb: "For households that ride out the storm season and want to hear first.",
    tone: "var(--color-amber)",
    perks: [
      { text: "Everything in Conch" },
      { text: "Text-message alerts", soon: true },
      { text: "Storm tracks and marine forecast cards", soon: true },
    ],
  },
  admiral: {
    key: "admiral",
    name: "Admiral",
    monthly: 24,
    yearly: 240,
    blurb: "For community pages, harbour clubs and people who report often.",
    tone: "var(--color-alert)",
    perks: [
      { text: "Everything in Rock Sound" },
      { text: "Verified-reporter badge on your reports" },
      { text: "Download your reports as a spreadsheet" },
      { text: "Priority review when you flag a wrong pin", soon: true },
    ],
  },
};

export const ENTERPRISE = {
  name: "Enterprise",
  price: "Custom",
  blurb:
    "For utilities, resorts, harbours, newsrooms, schools and government offices that need NowBey for a whole team.",
  tone: "var(--color-violet)",
  perks: [
    { text: "Team seats with shared alert profiles", soon: true },
    { text: "Data feed of reports for your own systems", soon: true },
    { text: "Branded sponsor placement on the map and wire", soon: true },
    { text: "Onboarding and a named contact" },
    { text: "Invoice billing" },
  ] satisfies Perk[],
};

/*
 * There is deliberately no "plans whose owners get storm alerts" list any more: storm alerts
 * ignore everyone's category filters, free plan included. Selling a warning that a household
 * needs in order to be safe is not a feature this product is willing to charge for.
 */

export function isTierKey(v: unknown): v is TierKey {
  return typeof v === "string" && Object.prototype.hasOwnProperty.call(TIERS, v);
}

export function isInterval(v: unknown): v is Interval {
  return v === "month" || v === "year";
}

export function priceCents(tier: TierKey, interval: Interval): number {
  return Math.round((interval === "year" ? TIERS[tier].yearly : TIERS[tier].monthly) * 100);
}

/** 10.8 -> "10.80", 18 -> "18": whole dollars stay clean, anything else shows cents. */
export function money(n: number): string {
  const cents = Math.round(n * 100);
  return cents % 100 === 0 ? String(cents / 100) : (cents / 100).toFixed(2);
}

export function yearlySaving(t: Tier): number {
  return Math.round((t.monthly * 12 - t.yearly) * 100) / 100;
}

/** The cheapest paid plan per month, for "plans from $X" wording. */
export const LOWEST_MONTHLY = Math.min(...Object.values(TIERS).map((t) => t.monthly));

/** The plan a user is currently entitled to, or null for the free plan. */
export function entitledTier(
  u: { adFreeTier: string | null; planStatus: string | null },
  demoAllowed = true,
): TierKey | null {
  if (!isTierKey(u.adFreeTier)) return null;
  // A demo plan is only a preview: once real payments are switched on it no longer unlocks anything.
  if (u.planStatus === "sandbox" && !demoAllowed) return null;
  if (u.planStatus && !ENTITLED_STATUSES.includes(u.planStatus)) return null;
  return u.adFreeTier;
}
