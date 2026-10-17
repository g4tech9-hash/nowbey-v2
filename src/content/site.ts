/**
 * Every word on the landing page, kept out of the components.
 *
 * Copy changes far more often than layout does, and a copy change should never mean
 * opening a JSX file. Everything a reader can read - the hero, the headline numbers, the
 * spotlight, the questions, the footer - lives here, and the components only arrange it.
 *
 * The wording is deliberately plain and deliberately honest. A reader deciding whether to
 * trust an app that tells them where a flood is going to notice the difference between
 * "alerts reach you before the storm" and "alerts reach you before the storm, on the plans
 * that have them".
 */

import type { IconName } from "../components/Icon";
import type { LandingMetrics } from "../lib/landing-model";

/** A link inside the page. */
export interface SiteLink {
  label: string;
  href: string;
  /** Opens in a new tab. */
  external?: boolean;
}

export const SITE = {
  brand: {
    name: "NowBey",
    tagline: "Stay Safe, Bahamas",
    promise: "Know what is happening, island by island.",
  },

  nav: {
    links: [
      { label: "Map", href: "#features" },
      { label: "Features", href: "#features" },
      { label: "How it works", href: "#spotlight" },
      { label: "Questions", href: "#faq" },
    ] satisfies SiteLink[],
    action: { label: "Open the live map", href: "/map" } satisfies SiteLink,
  },

  hero: {
    eyebrow: "Live in New Providence",
    title: "Know what is happening, island by island.",
    lead:
      "NowBey puts every flood, outage, blocked road and official bulletin on one map, then tells the people who live there - and nobody else - when it matters.",
    primary: { label: "Open the live map", href: "/map" } satisfies SiteLink,
    secondary: { label: "Read the wire", href: "/wire" } satisfies SiteLink,
    notes: [
      "Reading the map needs no account",
      "Your reports are published with an approximate position",
      "Storm warnings are sent on every plan",
    ],
    panel: {
      title: "The feed",
      note: "A seeded demonstration of the live panel. The real one is on the map page.",
    },
  },

  /** The headline numbers. The values come from the seeded metrics, the words from here. */
  stats: [
    {
      id: "reports",
      label: "Reports filed today",
      note: "Neighbours telling the map what they can see",
      metric: "reportsToday" as keyof LandingMetrics,
    },
    {
      id: "hazards",
      label: "Hazards on the map",
      note: "Active pins across the covered islands",
      metric: "activeHazards" as keyof LandingMetrics,
    },
    {
      id: "parishes",
      label: "Parishes covered",
      note: "Growing one island at a time",
      metric: "parishesCovered" as keyof LandingMetrics,
    },
    {
      id: "wire",
      label: "Stories on the wire",
      note: "Read, cleaned and summarised overnight",
      metric: "wireStories" as keyof LandingMetrics,
    },
  ] satisfies Array<{
    id: string;
    label: string;
    note: string;
    metric: keyof LandingMetrics;
  }>,

  /** The deep dives. One shape for every spotlight, so the section can loop them. */
  highlights: [
    {
      id: "report",
      icon: "map-pin" as IconName,
      eyebrow: "Reporting",
      title: "Four taps and the street knows",
      body:
        "Pick the spot on the map, choose what is wrong, say how bad it is and add a photo if you took one. That is the whole form. Everything after - confirmations, freshness labels, resolving a report - happens without you.",
      points: [
        "The pin lands on the exact spot you tapped, not on a rounded-off address",
        "Your position is published approximately, so a report cannot become an address",
        "When it is fixed, tap resolve and the pin fades to a resolved state",
      ],
      link: { label: "See the map", href: "/map" } satisfies SiteLink,
    },
    {
      id: "alerts",
      icon: "bell" as IconName,
      eyebrow: "Alerts",
      title: "Warnings that know where you are",
      body:
        "Alerts are matched by distance and by island, not blasted at everybody. A power cut on Exuma does not wake up Nassau, and a storm warning reaches every island whether or not anybody paid for it.",
      points: [
        "Email works everywhere, on every plan, for the one island you pick",
        "Push is built and switched off until the Firebase keys are in place - the page says so",
        "A three minute cooldown stops one storm emailing you four times",
      ],
      link: { label: "Manage alerts", href: "/alerts" } satisfies SiteLink,
    },
    {
      id: "wire",
      icon: "newspaper" as IconName,
      eyebrow: "The wire",
      title: "The islands' news, read again by you",
      body:
        "Bahamian outlets are pulled in overnight, the junk is thrown out, and each story gets one plain-English line. Nothing is invented: if the feed does not say it, the summary does not either.",
      points: [
        "Nine outlets tracked, each with a fallback when its own feed is down",
        "A one-line brief on every story, plus the place it belongs on the map",
        "A story waits for a human before it is published",
      ],
      link: { label: "Open the wire", href: "/wire" } satisfies SiteLink,
    },
    {
      id: "ai",
      icon: "sparkles" as IconName,
      eyebrow: "Assistance",
      title: "The machine suggests. A person decides.",
      body:
        "AI is used where a draft saves minutes, and nowhere it could publish on its own. It can suggest a category, spot a duplicate, summarise a story or diagnose a crash - and every one of those ends in a human pressing a button.",
      points: [
        "No AI output is published, hidden, sent or deployed without a person",
        "A daily call cap and a kill switch, so the meter can always be stopped",
        "Without an API key the plain fallback still works, and says that is what happened",
      ],
      link: { label: "Read the feature registry", href: "#features" } satisfies SiteLink,
    },
  ] satisfies Array<{
    id: string;
    icon: IconName;
    eyebrow: string;
    title: string;
    body: string;
    points: string[];
    link: SiteLink;
  }>,

  faqs: [
    {
      id: "account",
      question: "Do I need an account to see the map?",
      answer:
        "No. The map, the pin list, the wire and every hazard report are readable by anyone. An account is only needed to report something, to get alerts sent to you, and to keep a profile.",
    },
    {
      id: "privacy",
      question: "If I report a flood outside my house, can anyone find my address?",
      answer:
        "Not from the report. A resident report is stored a short, random distance from the spot you chose, so a flooded junction is still that junction while a home address is not. The offset is configurable, and a report you make on the map keeps the exact spot.",
    },
    {
      id: "alerts",
      question: "What is actually switched on today?",
      answer:
        "Email alerts, the live map, the wire and every hazard report are live. Website and app push are built but switched off until the Firebase keys are set, so the alerts page says so instead of pretending. Text message alerts are not built and are labelled Soon.",
    },
    {
      id: "ai",
      question: "Does an AI write the news?",
      answer:
        "It writes one line of summary for a story that a human has already approved for publication, and it helps staff read a group of crashes faster. It never publishes a story, never hides a comment, never sends an alert and never deploys anything.",
    },
    {
      id: "coverage",
      question: "Where does NowBey actually cover?",
      answer:
        "New Providence is live today, with the surrounding islands and the rest of the archipelago rolling out as each launch stage opens. The coverage map on the site always shows the current truth rather than the plan.",
    },
    {
      id: "money",
      question: "What does a paid plan add?",
      answer:
        "More alert islands, more alert profiles, no advertising and the partner export. The paid tiers never hold back a storm warning, and any perk that is announced but not built yet is labelled Soon on the plan itself.",
    },
  ] satisfies Array<{ id: string; question: string; answer: string }>,

  cta: {
    eyebrow: "Start here",
    title: "Open the map. It is the fastest way to understand the rest.",
    body:
      "No account, no download, no sales call. Open the map, look at your own street, and decide from there.",
    actions: [
      { label: "Open the live map", href: "/map" },
      { label: "Read the wire", href: "/wire" },
    ] satisfies SiteLink[],
    notes: ["Free to read", "Your reports are yours", "Leave whenever you like"],
  },

  footer: {
    tagline: "A community safety map and news wire for The Bahamas.",
    columns: [
      {
        title: "Product",
        links: [
          { label: "Safety map", href: "/map" },
          { label: "The wire", href: "/wire" },
          { label: "Report a hazard", href: "/report" },
          { label: "Alerts", href: "/alerts" },
          { label: "Open now", href: "/open-now" },
        ] satisfies SiteLink[],
      },
      {
        title: "Island life",
        links: [
          { label: "Life", href: "/life" },
          { label: "Places", href: "/life/places" },
          { label: "Gas prices", href: "/gas" },
          { label: "Broadcast", href: "/broadcast" },
        ] satisfies SiteLink[],
      },
      {
        title: "NowBey",
        links: [
          { label: "Your account", href: "/you" },
          { label: "Support", href: "/support" },
          { label: "Credits", href: "/credits" },
          { label: "Admin", href: "/admin" },
        ] satisfies SiteLink[],
      },
    ] satisfies Array<{ title: string; links: SiteLink[] }>,
    legal: [
      { label: "Privacy", href: "/privacy" },
      { label: "Terms", href: "/terms" },
    ] satisfies SiteLink[],
    note: "Built in The Bahamas.",
  },
} as const;

/** The category of each spotlight, in the order the page shows them. */
export const SPOTLIGHT_IDS = SITE.highlights.map((highlight) => highlight.id);
