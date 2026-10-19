/**
 * COPY CONSTANTS — one glossary, everywhere.
 * British spelling, consistent CTA labels, no ad-hoc strings.
 */

export const CTA = {
  reportHazard: "Report a hazard",
  exploreMap: "Explore the map",
  readNewsWire: "Read the news wire",
  setUpEmailAlerts: "Set up email alerts",
  viewOnMap: "View on map",
  openMap: "Open the map",
  confirm: "Confirm",
  sawItToo: "Saw it too",
  cleared: "Cleared",
  gettingWorse: "Getting worse",
  share: "Share",
  retry: "Try again",
} as const;

export const TERMS = {
  newsWire: "News wire",
  newsWireShort: "News",
  communityFeed: "Community feed",
  feed: "Feed",
  emailAlerts: "Email alerts",
  map: "Map",
  report: "Report a hazard",
} as const;

export const EMERGENCY_COPY = "Emergency: call 919 / 911 — this app is not an emergency service.";

export const COVERAGE_COPY = {
  badge: "Live alerts: New Providence — other islands soon",
  islandDisabledHint: "Tell me when it opens",
  notLiveForIsland: "Email alerts for this island are coming soon. Leave your email and we will let you know.",
} as const;

export const FRESHNESS_COPY = {
  live: "Live",
  recent: "Recent",
  aging: "Needs a recheck",
  stale: "Stale",
  liveBlurb: "Confirmed in the last few hours",
  recentBlurb: "Confirmed in the last day",
  agingBlurb: "Needs a fresh check",
  staleBlurb: "Nobody has checked it in days — verify before you act",
} as const;

export const TRUST_COPY = {
  tiers: {
    unverified: { label: "Unverified", blurb: "Nobody has confirmed this yet. Treat it as a tip, not a fact." },
    partly: { label: "Partly confirmed", blurb: "A few neighbours have confirmed it." },
    well: { label: "Well confirmed", blurb: "Several neighbours confirmed it recently." },
    recheck: { label: "Needs a recheck", blurb: "Confirmed before, but nobody has checked in a while." },
  },
  verifyBeforeAct: "Verify before you act — conditions may have changed.",
} as const;

export const LOADING_COPY = {
  map: "Loading the map…",
  feed: "Loading reports…",
  wire: "Loading the news wire…",
  incident: "Loading report…",
  generic: "Loading…",
  checking: "Checking…",
  couldNotLoad: "Could not load. Try again.",
  lastChecked: (time: string) => `Last checked ${time}`,
  noOpenReports: (time: string) => `No open reports on this island right now. Last checked ${time}.`,
  offline: "You are offline. Showing saved reports.",
} as const;

export const REPORT_STEPS = {
  count: 4,
  labels: ["What", "Where", "Details", "Check & send"] as const,
  headline: "Four steps, twenty seconds",
} as const;
