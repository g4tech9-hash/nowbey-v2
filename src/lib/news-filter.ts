/**
 * THE NEWS FILTER — the wire only carries stories.
 *
 * The wire pulls from RSS feeds and, when a feed is down, from a Google News
 * search. That search is where the junk came from: a `site:` query can land on
 * an SEO profile page, a gambling page or a directory, and the resulting
 * headline — "Profile : taixiushopnet" — was published on the wire as if it
 * were a Bahamian news story.
 *
 * So every item is screened before it is stored, in this order:
 *
 *   1. Is the headline a junk pattern?      (profile pages, "search results for")
 *   2. Is the headline long enough to be a headline?
 *   3. Does it carry a gambling or casino token?
 *   4. Is it an "e-Edition" cutout page?
 *   5. Can we resolve a real publisher, and is that publisher one we know?
 *   6. Have we already published this story in the last 48 hours?
 *
 * A story that fails any of these is NOT deleted. It goes to the quarantine
 * queue with a reason, so a human can look at it and decide. That matters:
 * "we threw your story away" is a claim we cannot make honestly, but "we are
 * holding your story until a human looks at it" is true.
 */

/** Why a story was held back. Shown to the admin, and counted on the wire. */
export type QuarantineReason =
  | "junk-title"
  | "too-short"
  | "gambling"
  | "cutout"
  | "no-publisher"
  | "publisher-unknown"
  | "duplicate";

export const QUARANTINE_LABEL: Record<QuarantineReason, string> = {
  "junk-title": "Directory or profile page, not a story",
  "too-short": "Too short to be a headline",
  gambling: "Gambling or casino promotion",
  cutout: "E-Edition cutout page",
  "no-publisher": "Redirect with no resolvable publisher",
  "publisher-unknown": "Publisher is not on the allowlist",
  duplicate: "Already published in the last 48 hours",
};

/**
 * The publishers we will put on the wire. A story from anywhere else is held
 * for a human, not published. This is the single biggest spam filter: the
 * junk pages above are all on sites that are not newsrooms.
 */
export const PUBLISHER_ALLOWLIST: string[] = [
  "Our News",
  "Eyewitness News",
  "The Nassau Guardian",
  "Tribune 242",
  "Bahamas Press",
  "Bahamas Weekly",
  "Loop Bahamas",
  "ZNS Bahamas",
  "Bahamas Information Services",
  "Bahamas Investor",
  "Bahamas Local",
  "Bahamas Power and Light",
  "The Bahamas Times",
  "242 In The Know",
  "Daily News",
  "The Bahamas Guardian",
  "The Voice",
  "W Nassau News",
  "Tribune 242 News",
  "Press Release",
];

/**
 * The domains behind those publishers, for resolving a link that names no
 * source. Explicit on purpose: several of these domains start with the same
 * word ("bahamaspress", "bahamasinvestor", "bahamaslocal"), and a prefix
 * match swapped the names between them.
 */
export const PUBLISHER_DOMAINS: Record<string, string> = {
  "ournews.bs": "Our News",
  "ewnews.com": "Eyewitness News",
  "thenassauguardian.com": "The Nassau Guardian",
  "tribune242.com": "Tribune 242",
  "bahamaspress.com": "Bahamas Press",
  "thebahamasweekly.com": "Bahamas Weekly",
  "loopnews.com": "Loop Bahamas",
  "znsbahamas.com": "ZNS Bahamas",
  "bahamas.gov.bs": "Bahamas Information Services",
  "bahamasinvestor.com": "Bahamas Investor",
  "bahamaslocal.com": "Bahamas Local",
  "bplco.com": "Bahamas Power and Light",
  "thebahamastimes.com": "The Bahamas Times",
  "dailynewsbahamas.com": "Daily News",
};

/**
 * "Profile : taixiushopnet", "Search results for : low cost" — a directory page
 * that a Google News search returned as if it were a headline.
 */
export const JUNK_TITLE =
  /^\s*(?:(?:profile|search results for|search results|results for)\s*:|log\s?in\b|sign\s?in\b|register\b|subscribe\b|advertis\w*\b|classified\b|sponsored\b|404\b|page not found\b|menu\b|home\b|contact us\b|site map\b)/i;

/** "Segment 7 cutout | e-Edition" — a printing artefact, not a story. */
export const CUTOUT_TITLE = /\bcutout\b|\be-?edition\b/i;

/**
 * Gambling and casino tokens. These appear in the junk profile pages and in
 * the spam headlines that follow them.
 */
/**
 * Gambling and casino promotions.
 *
 * Two groups, because they behave differently. The SEO names ("taixiu",
 * "iwin88poker", "sc88wwwcom") are FRAGMENTS of a longer domain or title, so
 * they are matched inside a word. The ordinary words ("slot", "casino") are
 * matched whole, so a story that happens to mention a casino is not thrown away.
 */
export const GAMBLING_FRAGMENTS =
  /taixiu|iwin|sc88|mm99|bl555|nohu|llwin|judi|casinoonline|sportbet|nudepoker|ถาสิโน|สล็อต|บาคาร่า|คาสิโน|ไฮไล/i;
export const GAMBLING_WORDS = /\b(?:slot|slots|casino|casinos|jackpot|roulette|baccarat|gambling|sportsbook|bookmaker)\b/i;

/** A bare "88" or "99" on its own. The token boundary keeps "Route 99" safe. */
const BARE_NUMBER_TOKEN = /(?:^|[^\w])(88|99)(?:[^\w]|$)/;

/** A headline needs at least this many words to be a headline. */
export const MIN_TITLE_WORDS = 4;

export function titleWords(title: string): string[] {
  return title.replace(/[^a-z0-9]+/gi, " ").trim().split(/\s+/).filter(Boolean);
}

/**
 * A key that says "the same story" even when the headline is punctuated
 * differently or carries the outlet's name at the end.
 */
export function normaliseTitle(title: string): string {
  return titleWords(title.toLowerCase()).join(" ");
}

/** The key used to spot the same story twice: the headline plus the publisher. */
export function storyKey(title: string, publisher: string): string {
  return `${normaliseTitle(title)}|${publisher.trim().toLowerCase()}`;
}

/**
 * Clean a snippet: drop the literal word "Advertisement" that some feeds push
 * into the description, and the trailing "[...]" that means "there was more".
 */
export function cleanSnippet(raw: string | null | undefined): string {
  if (!raw) return "";
  return raw
    .replace(/\s*\[?\s*(?:\.{2,}|…)\s*\]?\s*$/g, "")
    .replace(/\[\s*\.\.\.\s*\]/gi, "")
    .replace(/\bAdvertisement\b\s*/gi, "")
    .replace(/\s*Advertisement\b/gi, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}

export function isGamblingTitle(title: string): boolean {
  return GAMBLING_FRAGMENTS.test(title) || GAMBLING_WORDS.test(title) || BARE_NUMBER_TOKEN.test(title);
}

export function isJunkHeadline(title: string): boolean {
  if (JUNK_TITLE.test(title)) return true;
  if (CUTOUT_TITLE.test(title)) return true;
  return titleWords(title).length < MIN_TITLE_WORDS;
}

function hostOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "").toLowerCase();
  } catch {
    return "";
  }
}

/** True for the Google News redirect wrapper, which is not a publisher link. */
export function isGoogleNewsUrl(url: string): boolean {
  return /(^|\.)news\.google\./.test(hostOf(url));
}

/** The publisher named by a link, if the link names one. */
export function publisherFromUrl(url: string): string | null {
  const host = hostOf(url);
  if (!host || isGoogleNewsUrl(url)) return null;
  return publisherForHost(host);
}

export function publisherAllowed(publisher: string | null | undefined): boolean {
  if (!publisher) return false;
  const needle = publisher.trim().toLowerCase();
  if (!needle) return false;
  return PUBLISHER_ALLOWLIST.some((p) => {
    const name = p.trim().toLowerCase();
    return needle === name || needle.includes(name) || name.includes(needle);
  });
}

/**
 * The publisher behind a domain, for a feed that named a domain but not a
 * source (Google News puts the domain on <source url="…">).
 */
export function publisherForHost(host: string | null | undefined): string | null {
  if (!host) return null;
  const needle = host.trim().toLowerCase().replace(/^www\./, "");
  if (!needle) return null;
  for (const [domain, name] of Object.entries(PUBLISHER_DOMAINS)) {
    if (needle === domain || needle.endsWith(`.${domain}`)) return name;
  }
  return null;
}

export type NewsCandidate = {
  title: string;
  url: string;
  /** The outlet the feed says this came from. */
  sourceName: string;
  /** The publisher's domain, when the feed named one. */
  publisherHost?: string | null;
  summary?: string | null;
  publishedAt: Date;
};

export type NewsVerdict =
  | { ok: true; title: string; url: string; publisher: string; summary: string }
  | { ok: false; reason: QuarantineReason; detail: string };

/**
 * Screen one candidate. `seen` holds the story keys already published in the
 * last 48 hours, so the same headline from the same outlet is held the second
 * time it arrives.
 */
export function screenNewsItem(candidate: NewsCandidate, seen: Set<string>): NewsVerdict {
  const title = candidate.title.trim();
  const publisher =
    candidate.sourceName?.trim() || publisherForHost(candidate.publisherHost) || publisherFromUrl(candidate.url) || "";

  if (JUNK_TITLE.test(title)) {
    return { ok: false, reason: "junk-title", detail: title };
  }
  if (CUTOUT_TITLE.test(title)) {
    return { ok: false, reason: "cutout", detail: title };
  }
  if (titleWords(title).length < MIN_TITLE_WORDS) {
    return { ok: false, reason: "too-short", detail: title };
  }
  if (isGamblingTitle(title)) {
    return { ok: false, reason: "gambling", detail: title };
  }
  if (isGoogleNewsUrl(candidate.url) && !publisher) {
    // A Google News redirect we cannot resolve to a newsroom is, by definition,
    // a page somebody chose to be findable by a search engine.
    return { ok: false, reason: "no-publisher", detail: title };
  }
  if (!publisherAllowed(publisher)) {
    return { ok: false, reason: "publisher-unknown", detail: publisher || title };
  }
  if (seen.has(storyKey(title, publisher))) {
    return { ok: false, reason: "duplicate", detail: title };
  }

  return { ok: true, title, url: candidate.url, publisher, summary: cleanSnippet(candidate.summary) };
}
