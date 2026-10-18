/**
 * THE COPY GLOSSARY — one place for the words we use.
 *
 * The app said "Drop a pin" on the feed, "Report a spot" in the empty state,
 * "Report" in the tab bar and "File a report" in the report form. It said
 * "Wire" in one place, "News wire" in another and "the news wire" in a third.
 * It called the alerts page "Alerts" on one screen and "Set up email alerts"
 * on the next.
 *
 * A resident should not have to wonder whether two different buttons do the
 * same thing. So the words live here, and the pages read them.
 *
 * Rules this file keeps:
 *   - The primary action is ALWAYS "Report a hazard", everywhere except the
 *     five-tab bar, where it is "Report".
 *   - "News wire" in full. The tab bar shortens it to "News". Never "Wire".
 *   - "Community feed" for the page, "Feed" for the short label.
 *   - "Email alerts" for the page. Never bare "Alerts".
 *   - British spelling throughout: neighbour, colour, metre.
 */

/** The one primary action. */
export const CTA_REPORT = "Report a hazard";
/** The same action in the bottom tab bar, where the label has to be short. */
export const CTA_REPORT_TAB = "Report";
export const CTA_OPEN_MAP = "Open the map";
export const CTA_VIEW_ALL = "View all";
export const CTA_SHOW_OLDER = "Show older reports";
export const CTA_LOAD_MORE = "Load more";
export const CTA_RETRY = "Try again";

/** The product's own names, used in navigation and titles. */
export const NAME_FEED = "Community feed";
export const NAME_FEED_SHORT = "Feed";
export const NAME_WIRE = "News wire";
export const NAME_WIRE_TAB = "News";
export const NAME_ALERTS = "Email alerts";
export const NAME_MAP = "Map";

/**
 * The emergency line. It appears on the map, the report form, the incident
 * page, the terms and in the footer — one sentence, everywhere, because it is
 * the sentence that keeps somebody from treating the app as a 911 service.
 */
export const EMERGENCY_TEXT = "Emergency: call 919 or 911. This app is not an emergency service.";

/**
 * "Showing 24 of 388" — the honest count. A page that shows 24 rows and says
 * "388 on the wire" is making two claims at once, and only one of them is
 * about what is on the screen.
 */
export function showingCount(shown: number, total: number): string {
  if (total <= 0) return "Nothing to show";
  if (shown >= total) return `Showing all ${total}`;
  return `Showing ${shown} of ${total}`;
}

/** The short form, for a page that already shows the number in big type. */
export function showingCountInline(shown: number, total: number): string {
  if (total <= 0) return "nothing on this filter";
  if (shown >= total) return `all ${total} on this filter`;
  return `of ${total} on this filter`;
}

/** A news card's place, in the words a reader can act on. */
export type NewsPlacement = "island" | "street" | "none";

export function newsPlacementLabel(placement: NewsPlacement, place?: string | null): string {
  if (placement === "street" && place) return `Pinned: ${place}`;
  if (placement === "island" && place) return `Island-level: ${place}`;
  return "Island-wide";
}

/**
 * A pin that could only be placed at the centre of an island is approximate,
 * and says so. The words live here so the map, the card and the detail page
 * all say the same thing.
 */
export const APPROXIMATE_PLACE_NOTE = "Island-level — approximate";
