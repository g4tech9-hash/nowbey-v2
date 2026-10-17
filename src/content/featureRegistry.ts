/**
 * The feature registry.
 *
 * One entry per product capability, each pointing at the file in `src/lib` that implements
 * it. This is the page's source of truth and the documentation's source of truth:
 * `scripts/sync-docs.mjs` bundles this file with esbuild and writes `docs/FEATURES.md`, so
 * the docs can never describe a feature the code does not have (or hide one it does).
 *
 * Rules for anything added here:
 *   - `source` is a real path under `src/lib/`. The sync script fails the build when the
 *     file is missing, so a renamed module cannot leave a dead link behind.
 *   - `status` is honest. "planned" means a person cannot use it today. The page shows
 *     the status, so a promise the product cannot keep is visible to the reader.
 */

/** The groups the registry is sorted into on the page. */
export type FeatureCategory =
  | "map"
  | "alerts"
  | "wire"
  | "community"
  | "ai"
  | "trust"
  | "commerce"
  | "platform";

/**
 * How real a feature is.
 *   live     - a member uses it today
 *   beta     - built and running, but switched off for everybody or waiting on a device
 *   planned  - written and waiting for its launch stage
 *   internal - works, but nobody outside the team sees it
 */
export type FeatureStatus = "live" | "beta" | "planned" | "internal";

/** One registered feature. */
export interface Feature {
  /** Stable, kebab-case id. Used as a React key and as the anchor in the docs. */
  id: string;
  /** The name the feature is called in the product. */
  name: string;
  /** One sentence, written for a stranger holding a phone in the sun. */
  summary: string;
  /** Which group it belongs to. */
  category: FeatureCategory;
  /** How real it is. */
  status: FeatureStatus;
  /** The file under `src/lib/` that implements it. */
  source: string;
  /** What it actually does, in the reader's words. */
  capabilities: string[];
  /** One number worth showing on the card. */
  metric?: { label: string; value: string };
}

/** The category labels and blurbs, in the order the page shows them. */
export const FEATURE_CATEGORIES: Array<{ key: FeatureCategory; label: string; blurb: string }> = [
  { key: "map", label: "Safety map", blurb: "What is happening, where it is, and how sure we are." },
  { key: "alerts", label: "Alerts", blurb: "Warnings that reach you before the rumour does." },
  { key: "wire", label: "The wire", blurb: "The islands' news, read and summarised." },
  { key: "community", label: "Community", blurb: "The people, the places and the everyday round." },
  { key: "ai", label: "Assistance", blurb: "Machine help that a person checks before it counts." },
  { key: "trust", label: "Trust", blurb: "Privacy, moderation and the boring security work." },
  { key: "commerce", label: "Plans", blurb: "What the paid tiers actually add." },
  { key: "platform", label: "Platform", blurb: "The machinery under the product." },
];

/** The labels used for the status badge on every card. */
export const FEATURE_STATUS_LABELS: Record<FeatureStatus, string> = {
  live: "Live",
  beta: "Beta",
  planned: "Planned",
  internal: "Internal",
};

/**
 * Every feature of the product, mapped to the file that implements it.
 * The order here is the order on the page: what a member meets first comes first.
 */
export const FEATURES: Feature[] = [
  {
    id: "live-safety-map",
    name: "Live safety map",
    summary:
      "A real map of the islands with every hazard on it, drawn on aerial imagery you can actually read.",
    category: "map",
    status: "live",
    source: "src/lib/geo.ts",
    capabilities: [
      "Aerial, street and hybrid layers from one picker",
      "Thirteen hazard categories, each with its own colour",
      "Every pin carries the number of people who confirmed it",
    ],
    metric: { label: "Map layers", value: "4" },
  },
  {
    id: "pin-clustering",
    name: "Pin clustering",
    summary:
      "When twenty reports land on one junction, the map shows one badge instead of twenty overlapping dots.",
    category: "map",
    status: "live",
    source: "src/lib/cluster.ts",
    capabilities: [
      "Pins are grouped by the screen cell they fall in",
      "One count badge replaces the stack, and tapping it zooms in",
      "Plain Web Mercator maths, so a cell is the same size at any latitude",
    ],
    metric: { label: "Cell size", value: "48px" },
  },
  {
    id: "hazard-reports",
    name: "Community hazard reports",
    summary:
      "Pin a flood, an outage or a pothole in under a minute, and mark it resolved when it is fixed.",
    category: "map",
    status: "live",
    source: "src/lib/command.ts",
    capabilities: [
      "A short report flow: what, where, how bad, and a photo if you have one",
      "Resolve, merge, archive and unfound, kept apart on purpose",
      "Staff moves are recorded, so a report cannot vanish quietly",
    ],
    metric: { label: "Report steps", value: "4" },
  },
  {
    id: "report-freshness",
    name: "Report freshness",
    summary:
      "A road report goes stale in hours; a notice stays useful for days. The label says which.",
    category: "map",
    status: "live",
    source: "src/lib/freshness.ts",
    capabilities: [
      "Per-category staleness thresholds, judged rather than measured",
      "Old reports are labelled, never hidden and never deleted",
    ],
  },
  {
    id: "approximate-pins",
    name: "Approximate resident pins",
    summary:
      "A pin dropped on a house is also a pin on a person, so resident reports are published a short distance away.",
    category: "trust",
    status: "live",
    source: "src/lib/location-privacy.ts",
    capabilities: [
      "A short, random offset applied to new resident reports only",
      "Street-level safety information survives the offset",
      "The distance is configurable, and the rule can be switched off",
    ],
    metric: { label: "Default offset", value: "150m" },
  },
  {
    id: "email-alerts",
    name: "Email alerts",
    summary:
      "One address, one island, and the warnings that matter to that island land in your inbox.",
    category: "alerts",
    status: "live",
    source: "src/lib/alerts.ts",
    capabilities: [
      "Matched by distance, so a warning reaches the people it concerns",
      "A cooldown stops one storm emailing an island four times",
      "Storm warnings are always sent, on every plan",
    ],
  },
  {
    id: "push-alerts",
    name: "Web and app push",
    summary:
      "Firebase Cloud Messaging without an SDK: the token is signed here and the message is one request.",
    category: "alerts",
    status: "beta",
    source: "src/lib/push.ts",
    capabilities: [
      "HTTP v1 API, signed in-process with node:crypto",
      "Banned devices can be dropped without touching the rest",
      "A no-op until the Firebase keys are set, and it says so",
    ],
  },
  {
    id: "official-bulletins",
    name: "Official government bulletins",
    summary:
      "The National Hurricane Center publishes free bulletins; the ones about us become map pins.",
    category: "alerts",
    status: "live",
    source: "src/lib/official.ts",
    capabilities: [
      "Advisories are deduplicated on their URL, so the map shows current status only",
      "Watches and warnings fire an alert the moment they are imported",
      "Extra official feeds can be added with one environment variable",
    ],
  },
  {
    id: "news-wire",
    name: "The wire",
    summary:
      "Bahamian outlets, pulled in overnight and read again each morning, with the junk thrown out.",
    category: "wire",
    status: "live",
    source: "src/lib/ingest.ts",
    capabilities: [
      "Each outlet is tried through its own feed, then through Google News",
      "One broken feed cannot silence a newspaper",
      "A feed that fails is listed in the stats, never hidden",
    ],
    metric: { label: "Outlets tracked", value: "9" },
  },
  {
    id: "ai-briefs",
    name: "One-line briefs on every story",
    summary:
      "A short, plain-English summary of each story, plus a better category and a place name the map can use.",
    category: "ai",
    status: "live",
    source: "src/lib/news-ai.ts",
    capabilities: [
      "A brief per story, written for a phone screen",
      "A place name that the offline gazetteer can pin to the map",
      "A no-op without an API key, and the plain fallback still reads",
    ],
  },
  {
    id: "gemini-client",
    name: "The Gemini client",
    summary:
      "One small HTTP client, no SDK, with a cost kill switch that actually stops the meter.",
    category: "ai",
    status: "live",
    source: "src/lib/ai.ts",
    capabilities: [
      "Every call returns null instead of throwing, so pages never break on a quota error",
      "A daily call cap and a ledger of what each call cost",
      "AI_ENABLED=false stops every call on the next deploy",
    ],
  },
  {
    id: "report-copilot",
    name: "Report intake copilot",
    summary:
      "Before a report is published, one call suggests the category, the severity and a clearer headline.",
    category: "ai",
    status: "beta",
    source: "src/lib/report-ai.ts",
    capabilities: [
      "The reporter accepts, edits or ignores every suggestion",
      "The duplicate and place checks still run when there is no API key",
      "Submitting works exactly as before if the copilot is never called",
    ],
  },
  {
    id: "duplicate-detection",
    name: "Near-duplicate detection",
    summary:
      "The same road, the same morning, in three different words: caught before it reaches the map.",
    category: "ai",
    status: "live",
    source: "src/lib/report-ai-core.ts",
    capabilities: [
      "A strict same-spot rule and a wider wording-similarity scan",
      "The model's suggestions are validated before anybody sees them",
    ],
  },
  {
    id: "moderation-triage",
    name: "AI moderation triage",
    summary:
      "The model never hides anything. It only jumps the queue so a person reads the flagged item first.",
    category: "ai",
    status: "beta",
    source: "src/lib/moderation.ts",
    capabilities: [
      "Flagged items land in the same staff queue a reader report would use",
      "Dialect, utility complaints and strong opinions are explicitly not problems",
      "A human makes every call",
    ],
  },
  {
    id: "log-analysis",
    name: "AI crash analysis with a human gate",
    summary:
      "Gemini diagnoses a group of crashes, an admin approves the diagnosis, and only then does an issue get filed.",
    category: "ai",
    status: "live",
    source: "src/lib/error-ai.ts",
    capabilities: [
      "The diagnosis, the evidence and a checklist end up in one GitHub issue",
      "The AI never edits code, opens a pull request or deploys",
      "Without a token, an approval is recorded and waits instead of faking an issue",
    ],
  },
  {
    id: "error-tracking",
    name: "Self-hosted error tracking",
    summary:
      "Browser errors, boundary hits, app crashes and server errors, grouped and kept inside our own database.",
    category: "platform",
    status: "live",
    source: "src/lib/errortracking.ts",
    capabilities: [
      "Sanitised breadcrumbs: pages visited and calls that failed",
      "Grouped by digest, with platform and app version",
      "Recording an error can never throw, because the reporter for a crash must not be crashy",
    ],
  },
  {
    id: "island-life",
    name: "Island Life posts",
    summary:
      "The food, the events and the tips that do not fit on a hazard map, written by neighbours.",
    category: "community",
    status: "planned",
    source: "src/lib/life.ts",
    capabilities: [
      "Posts are typed, so a restaurant tip asks for a price and a local tip does not",
      "Waiting for the expanded launch stage, behind one flag",
    ],
  },
  {
    id: "place-guides",
    name: "Opening hours and place guides",
    summary:
      "Opening hours per island, kept honest by the people who work there.",
    category: "community",
    status: "planned",
    source: "src/lib/places.ts",
    capabilities: [
      "A place carries its hours and a note for the odd week",
      "Behind the expanded launch stage",
    ],
  },
  {
    id: "engagement",
    name: "Reactions and comments",
    summary:
      "A thumb, a thank you and a question, on a report, a story or a post.",
    category: "community",
    status: "live",
    source: "src/lib/engage.ts",
    capabilities: [
      "One reaction per person per item, and it can be changed",
      "The same tables serve reports, wire stories and posts",
      "Badges travel with the comment, so a desk account reads as a desk account",
    ],
  },
  {
    id: "gas-tracker",
    name: "Gas price tracker",
    summary:
      "What a gallon costs today, reported from the pump and checked against the outliers.",
    category: "community",
    status: "planned",
    source: "src/lib/gas.ts",
    capabilities: [
      "Regular, premium and diesel, with the impossible prices rejected",
      "A fourteen-day window so one typo does not become the headline",
      "Behind the expanded launch stage",
    ],
  },
  {
    id: "broadcast-studio",
    name: "Broadcast studio",
    summary:
      "A live voice channel for the desk, with a token that expires in a minute.",
    category: "community",
    status: "beta",
    source: "src/lib/broadcast.ts",
    capabilities: [
      "A room per stream, named for the story it covers",
      "Short-lived tokens, and a publisher flag that is not the same as listening",
      "It refuses to start without a wss endpoint",
    ],
  },
  {
    id: "partner-digest",
    name: "Community digest for partners",
    summary:
      "The week's reports and stories, written as one email an organisation or an HOA can send out.",
    category: "commerce",
    status: "beta",
    source: "src/lib/digest/generate.ts",
    capabilities: [
      "The model writes the subject and the one-liners; a template fills in without it",
      "Nothing is sent until an admin reads the draft and presses Send",
    ],
  },
  {
    id: "accounts",
    name: "Accounts and sessions",
    summary:
      "Email and password, with one-time links that are stored hashed and expire on their own.",
    category: "platform",
    status: "live",
    source: "src/lib/account.ts",
    capabilities: [
      "Only the hash of a one-time token is ever stored",
      "A new token of the same kind replaces the old one",
      "Sessions are cookie or bearer, for the website and the app",
    ],
  },
  {
    id: "google-sign-in",
    name: "Sign in with Google",
    summary:
      "Authorization code with PKCE, no framework, and one button that covers both signing up and signing in.",
    category: "platform",
    status: "live",
    source: "src/lib/google.ts",
    capabilities: [
      "An existing password account is linked to the verified Google address",
      "The redirect URI is checked on the way back",
    ],
  },
  {
    id: "badges",
    name: "Verified and staff badges",
    summary:
      "A badge is a badge because somebody checked, and it disappears the moment the grant does.",
    category: "trust",
    status: "live",
    source: "src/lib/badges.ts",
    capabilities: [
      "Staff, broadcaster and verified grants are separate things",
      "Read at request time, so a revoked grant vanishes with no job to run",
      "A badge is never tied to a paid plan",
    ],
  },
  {
    id: "member-profiles",
    name: "Member profiles",
    summary:
      "A handle, a place and a history of reports - and the promise that a missing row means the defaults.",
    category: "community",
    status: "live",
    source: "src/lib/profile.ts",
    capabilities: [
      "A report hidden by its author stays on the map and stops being listed by name",
      "Counts include the hidden report; the author keeps their privacy",
    ],
  },
  {
    id: "plans",
    name: "Plans and perks",
    summary:
      "Three tiers and a plain list of what each one adds - including the perks that are not built yet.",
    category: "commerce",
    status: "live",
    source: "src/lib/tiers.ts",
    capabilities: [
      "A perk that is not built yet is labelled Soon, on the plan and in the code",
      "The tier a member is entitled to is decided in one place",
    ],
  },
  {
    id: "billing",
    name: "Stripe billing",
    summary:
      "Checkout, the customer portal, and a webhook that refuses a payload it cannot verify.",
    category: "commerce",
    status: "live",
    source: "src/lib/billing.ts",
    capabilities: [
      "The product never pretends to charge when Stripe is not configured",
      "A demo plan is a preview tool and is labelled as one",
    ],
  },
  {
    id: "admin-tools",
    name: "Admin tools and audit trail",
    summary:
      "Two doors into the admin side, and a written record of what staff did once they are inside.",
    category: "platform",
    status: "live",
    source: "src/lib/staff.ts",
    capabilities: [
      "Editors run the wire and the reports; admins run the members and the settings",
      "Every admin action is written to the audit log",
    ],
  },
  {
    id: "rate-limiting",
    name: "Rate limiting",
    summary:
      "Limits sized for a person, keyed by account or by a one-way hash of the address.",
    category: "trust",
    status: "live",
    source: "src/lib/ratelimit-core.ts",
    capabilities: [
      "Signed-in members are limited by account, visitors by a hash",
      "The address is never stored, only the digest of it",
    ],
  },
  {
    id: "security-headers",
    name: "Content Security Policy",
    summary:
      "A per-request nonce on every script, shipped report-only until the console is clean.",
    category: "trust",
    status: "live",
    source: "src/lib/csp.ts",
    capabilities: [
      "A fresh nonce for every response",
      "Report-only first: the browser reports what it would block and nothing breaks",
    ],
  },
  {
    id: "theming",
    name: "Themes and appearance",
    summary:
      "The island look, the plain look, and a light mode that does not turn the map into a whiteboard.",
    category: "platform",
    status: "live",
    source: "src/lib/themes.ts",
    capabilities: [
      "Classic is one click away, for ever",
      "Light mode repoints the category colours to keep the contrast",
    ],
  },
  {
    id: "adoption-funnel",
    name: "Adoption funnel",
    summary:
      "Which step people stop at, counted without ever blocking the step they stopped at.",
    category: "platform",
    status: "live",
    source: "src/lib/funnel.ts",
    capabilities: [
      "Fire and forget: a counter must never break a report or a sign-up",
      "No personal data in the event itself",
    ],
  },
  {
    id: "place-search",
    name: "Place search and geocoding",
    summary:
      "Type a place name, get a pin, and let the report form fill in the address.",
    category: "map",
    status: "live",
    source: "src/lib/geocode.ts",
    capabilities: [
      "An offline gazetteer first, the network second",
      "The island's own place names are the ones that matter",
    ],
  },
  {
    id: "feature-flags",
    name: "Launch-stage flags",
    summary:
      "A deferred product needs both the launch stage and its own switch, so a stale variable cannot switch it back on.",
    category: "platform",
    status: "live",
    source: "src/lib/features.ts",
    capabilities: [
      "Two switches, not one",
      "The flags are read in one file, so there is one answer to what is on",
    ],
  },
  {
    id: "transactional-email",
    name: "Transactional email",
    summary:
      "Verification, password resets and alerts, sent over SMTP with a plain layout that reads on a phone.",
    category: "platform",
    status: "live",
    source: "src/lib/mail.ts",
    capabilities: [
      "One layout and one button style for every message",
      "The mailer reports whether it actually sent",
    ],
  },
  {
    id: "feed-cleaning",
    name: "Feed cleaning",
    summary:
      "Repeated records dropped, junk lines removed, and the useful text kept.",
    category: "wire",
    status: "live",
    source: "src/lib/collect.ts",
    capabilities: [
      "Duplicate records are removed by id, keeping the first",
      "Junk patterns are stripped before an article is stored",
    ],
  },
  {
    id: "article-sanitising",
    name: "Article sanitising",
    summary:
      "Feed HTML is cleaned before it is rendered, because a feed is somebody else's website.",
    category: "trust",
    status: "live",
    source: "src/lib/sanitize/index.ts",
    capabilities: [
      "Event handlers, javascript: URLs and style expressions are removed",
      "The raw embed pattern some feeds carry is stripped first",
    ],
  },
];

/** The features in one category, in registry order. */
export function featuresByCategory(category: FeatureCategory): Feature[] {
  return FEATURES.filter((feature) => feature.category === category);
}

/** A quick census: how many features, and how many of each status. */
export function featureCensus(features: Feature[] = FEATURES): {
  total: number;
  live: number;
  beta: number;
  planned: number;
  internal: number;
  byCategory: Record<FeatureCategory, number>;
} {
  const byCategory = {} as Record<FeatureCategory, number>;
  for (const category of FEATURE_CATEGORIES) byCategory[category.key] = 0;
  let live = 0;
  let beta = 0;
  let planned = 0;
  let internal = 0;
  for (const feature of features) {
    byCategory[feature.category] += 1;
    if (feature.status === "live") live += 1;
    else if (feature.status === "beta") beta += 1;
    else if (feature.status === "planned") planned += 1;
    else internal += 1;
  }
  return { total: features.length, live, beta, planned, internal, byCategory };
}

/** Every `source` path the registry points at. The sync script checks that each one exists. */
export const FEATURE_SOURCE_FILES: string[] = FEATURES.map((feature) => feature.source);
