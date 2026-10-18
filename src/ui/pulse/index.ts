/**
 * NOWBEY PULSE — COMPONENT LIBRARY
 * ---------------------------------------------------------------------------
 * The atoms and molecules every page is required to compose from. Rules for
 * using them, in priority order:
 *
 *   1. Take a Layer 3 component token (`--card-bg`, `--chip-bg`, …) or a Layer 2
 *      semantic (`var(--danger)`). Never a hex, never a raw spacing number.
 *   2. If the thing you need is here, use it. If it is nearly here, extend its
 *      props rather than forking it.
 *   3. Data surfaces are `.pulse-card`, never glass: a person reading a flood
 *      report on a bright porch needs contrast, not translucency.
 *
 * Server-safe modules (badge, severity, card, skeleton, avatar-stack, glyph,
 * trust-meter) can be rendered straight from a Server Component. Anything with
 * behaviour is a client module and marked as such at the top of its own file.
 */

/* atoms */
export { CatBadge, CatSwatch, MetaChip } from "./badge";
export { FreshnessPill, LiveDot, freshnessLevel, type PulseFreshness } from "./freshness";
export { SeverityTag, SeverityMeter } from "./severity";
export { TrustMeter, TrustCard, CardLayeredSection, AccuracyCard, IncidentStrip } from "./trust-meter";
export { AvatarStack, Attribution, initialsOf, seedHash } from "./avatar-stack";
export { CardLayered, CardLayeredHeader, ActionBar } from "./card";
export { Skeleton, SkeletonIncidentCard, SkeletonStream, SkeletonRail, SkeletonSpotlight } from "./skeleton";
export { Pressable, Lift, FocusRing, Segmented, Switch } from "./pressable";

/* molecules */
export { ConfirmButton, ActionPill } from "./confirm-button";
export { Ticker, type TickerItem } from "./ticker";
export { FilterPillRow, PillRow, type PillOption } from "./pill-row";
export { CommandPalette, CommandPaletteTrigger } from "./command-palette";
export { Drawer } from "./drawer";
export { EmptyState, ErrorState, EndOfStream, AriaAnnouncer, ErrorBoundary, PulseTokensGuard, useTokensGuard } from "./states";
export { ThemeToggle, ThemePicker, AccessibilityPicker, LiveModeToggle, useLiveMode, usePulseTheme, CategoryLegend } from "./theme";

/* the category glyph layer */
export {
  PULSE_CATEGORIES,
  PULSE_CATEGORY_KEYS,
  PULSE_SIGNAL_LEGEND,
  CategoryGlyph,
  pulseCategoryMeta,
  type PulseCategoryMeta,
} from "./glyph";
