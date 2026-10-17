/**
 * The landing page's state, as pure functions.
 *
 * The page has three bits of state: which FAQ answer is open, which feature category is
 * selected, and whether the phone's navigation menu is open. All three live in one reducer
 * so a section component never keeps two sources of truth for the same question.
 *
 * Nothing here imports React. The components own the `useReducer`; this file owns the rules.
 */

/** The filter the feature registry is showing. */
export interface LandingFilter {
  /** `"all"` or a category key. */
  category: string;
  /** Free text over name, summary, capabilities and source path. */
  query: string;
}

/** Everything the landing page can be in. */
export interface LandingState {
  /** The id of the open FAQ answer, or null when all are closed. */
  openFaqId: string | null;
  filter: LandingFilter;
  /** The phone navigation drawer. */
  menuOpen: boolean;
}

/** The actions the reducer understands. */
export type LandingAction =
  | { type: "toggle-faq"; id: string }
  | { type: "close-faq" }
  | { type: "set-category"; category: string }
  | { type: "set-query"; query: string }
  | { type: "set-menu"; open: boolean }
  | { type: "reset" };

/** The state the page starts in. */
export const initialLandingState: LandingState = {
  openFaqId: null,
  filter: { category: "all", query: "" },
  menuOpen: false,
};

/** The one reducer. Every transition is here, so the behaviour is testable without a DOM. */
export function landingReducer(state: LandingState, action: LandingAction): LandingState {
  switch (action.type) {
    case "toggle-faq":
      return { ...state, openFaqId: state.openFaqId === action.id ? null : action.id };
    case "close-faq":
      return state.openFaqId === null ? state : { ...state, openFaqId: null };
    case "set-category":
      return { ...state, filter: { ...state.filter, category: action.category } };
    case "set-query":
      return { ...state, filter: { ...state.filter, query: action.query } };
    case "set-menu":
      return state.menuOpen === action.open ? state : { ...state, menuOpen: action.open };
    case "reset":
      return initialLandingState;
    default:
      return state;
  }
}

/** The smallest shape the filter needs. Keeps this file independent of the content layer. */
export interface FilterableFeature {
  id: string;
  name: string;
  summary: string;
  category: string;
  capabilities: string[];
  source: string;
}

/** Case-insensitive, whitespace tolerant. An empty query matches everything. */
export function matchesQuery(feature: FilterableFeature, query: string): boolean {
  const needle = query.trim().toLowerCase();
  if (needle === "") return true;
  const haystack = [feature.name, feature.summary, feature.source, ...feature.capabilities]
    .join(" ")
    .toLowerCase();
  return haystack.includes(needle);
}

/** Applies the category and the query together. */
export function filterFeatures<T extends FilterableFeature>(features: T[], filter: LandingFilter): T[] {
  return features.filter((feature) => {
    if (filter.category !== "all" && feature.category !== filter.category) return false;
    return matchesQuery(feature, filter.query);
  });
}

/** How many features sit in each category, plus the total under the key `"all"`. */
export function countByCategory(features: FilterableFeature[]): Record<string, number> {
  const counts: Record<string, number> = { all: features.length };
  for (const feature of features) {
    counts[feature.category] = (counts[feature.category] ?? 0) + 1;
  }
  return counts;
}
