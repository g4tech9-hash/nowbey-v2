/* Plain constants shared by the server and the browser forms. No database code in here. */

/**
 * The kinds of post in Island Life. Each one changes what the share form asks for,
 * so a restaurant tip gets a price and a rating while a local tip does not.
 */
export const KINDS = {
  food: {
    label: "Eats & drinks",
    color: "#ffb454",
    blurb: "Restaurants, fish fry, bakeries and bars",
    placeLabel: "Restaurant, bar or stall",
    placeHint: "Arawak Cay Fish Fry",
    titleHint: "Best cracked conch on the island",
    bodyHint: "What did you eat? How were the service, the wait and the price? Would you go back?",
    rating: true,
    price: true,
    placeRequired: true,
  },
  event: {
    label: "Events",
    color: "#f472b6",
    blurb: "Junkanoo, regattas, festivals and concerts",
    placeLabel: "Event name",
    placeHint: "Junkanoo Boxing Day parade",
    titleHint: "Boxing Day was unreal this year",
    bodyHint: "How was the crowd, the parking and the music? Any tips for next time?",
    rating: true,
    price: false,
    placeRequired: true,
  },
  beach: {
    label: "Beaches & sights",
    color: "#2ee6d0",
    blurb: "Beaches, cays, trails and things to see",
    placeLabel: "Beach or place",
    placeHint: "Cabbage Beach",
    titleHint: "Calm water and almost empty on a Sunday",
    bodyHint: "How was the water, the sand and the crowd? Is there shade, parking or food nearby?",
    rating: true,
    price: false,
    placeRequired: true,
  },
  night: {
    label: "Nightlife",
    color: "#a78bfa",
    blurb: "Bars, lounges, live music and late nights",
    placeLabel: "Venue name",
    placeHint: "Sunset Bar & Grill",
    titleHint: "Live band, cold drinks, great crowd",
    bodyHint: "What was the music like? Cover charge, dress code, how safe did the walk home feel?",
    rating: true,
    price: true,
    placeRequired: true,
  },
  tip: {
    label: "Local tips",
    color: "#ffd766",
    blurb: "Insider advice for visitors and neighbours",
    placeLabel: "About (optional)",
    placeHint: "Getting around Nassau",
    titleHint: "Take the jitney, skip the parking stress",
    bodyHint: "Share what you wish someone had told you.",
    rating: false,
    price: false,
    placeRequired: false,
  },
} as const;

export type KindKey = keyof typeof KINDS;
export const KIND_KEYS = Object.keys(KINDS) as KindKey[];

export function isKind(v: unknown): v is KindKey {
  return typeof v === "string" && Object.prototype.hasOwnProperty.call(KINDS, v);
}

export const LIMITS = { title: 120, body: 2000, minBody: 10, place: 80, comment: 500, photos: 3 } as const;

export const FLAG_REASONS = {
  spam: "Spam or an advert",
  offensive: "Rude or offensive",
  unsafe: "Unsafe or misleading advice",
  wrong: "Wrong place or details",
  other: "Something else",
} as const;
export type FlagReason = keyof typeof FLAG_REASONS;
export function isFlagReason(v: unknown): v is FlagReason {
  return typeof v === "string" && Object.prototype.hasOwnProperty.call(FLAG_REASONS, v);
}

export const photoUrl = (id: string, size: "full" | "thumb" = "full") =>
  size === "thumb" ? `/api/photos/${id}?size=thumb` : `/api/photos/${id}`;

export const priceLabel = (n: number | null | undefined) => (n && n >= 1 && n <= 4 ? "$".repeat(n) : null);
