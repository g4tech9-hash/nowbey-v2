/**
 * PULSE GLYPHS
 * One icon per category signal, and the token that colours it. Kept apart from
 * CatBadge so the map, the ticker and the admin queues can draw the same glyph
 * without importing a pill component.
 */
import {
  Anchor,
  Car,
  CloudLightning,
  Cross,
  Droplets,
  Flame,
  Info,
  ShieldAlert,
  Star,
  Trash2,
  TrafficCone,
  Waves,
  Zap,
  type LucideIcon,
} from "lucide-react";
import type { CategoryKey } from "@/lib/geo";
import { CATEGORY_DEFS, CATEGORY_KEYS } from "@/lib/categories";

export type PulseCategoryMeta = {
  label: string;
  icon: LucideIcon;
  /** The Layer 2 category hue this signal paints with. */
  token: string;
  /** The Layer 1 signal family, for grouping in filters and legends. */
  signal: string;
};

/**
 * `token` is a var() reference, never a hex: a component that painted the old
 * `CATEGORIES[key].color` had to duplicate the light-mode fix, and several
 * places forgot to. Reading the semantic token makes the theme a given.
 */
/** The icon for each category. The icon is the only thing that lives here: the
 *  label, the token and the description all come from src/lib/categories.ts. */
const ICONS: Record<CategoryKey, LucideIcon> = {
  flood: Droplets,
  storm: CloudLightning,
  power: Zap,
  water: Waves,
  crime: ShieldAlert,
  road: TrafficCone,
  marine: Anchor,
  fire: Flame,
  health: Cross,
  trash: Trash2,
  event: Star,
  notice: Info,
  accident: Car,
};

/** The Layer 1 signal family each category belongs to, for the legends. */
const SIGNALS: Record<CategoryKey, string> = {
  flood: "flooding",
  storm: "flooding",
  power: "power",
  water: "water",
  crime: "safety",
  road: "road",
  marine: "marine",
  fire: "safety",
  health: "health",
  trash: "sanitation",
  event: "safety",
  notice: "safety",
  accident: "road",
};

export const PULSE_CATEGORIES: Record<CategoryKey, PulseCategoryMeta> = Object.fromEntries(
  CATEGORY_KEYS.map((k) => [
    k,
    {
      label: CATEGORY_DEFS[k].label,
      icon: ICONS[k],
      token: CATEGORY_DEFS[k].token,
      signal: SIGNALS[k],
    },
  ]),
) as Record<CategoryKey, PulseCategoryMeta>;

export const PULSE_CATEGORY_KEYS = Object.keys(PULSE_CATEGORIES) as CategoryKey[];

/** Unknown categories fall back to Notice rather than painting nothing. */
export function pulseCategoryMeta(category: string | null | undefined): PulseCategoryMeta {
  return PULSE_CATEGORIES[(category ?? "notice") as CategoryKey] ?? PULSE_CATEGORIES.notice;
}

/**
 * The eight signal families the design language names, with the token that
 * colours each. Used by legends, the map key and the admin filter rail.
 */
export const PULSE_SIGNAL_LEGEND = [
  { key: "flooding", label: "Flooding", token: "var(--cat-flooding)" },
  { key: "power", label: "Power", token: "var(--cat-power)" },
  { key: "road", label: "Road", token: "var(--cat-road)" },
  { key: "water", label: "Water", token: "var(--cat-water)" },
  { key: "safety", label: "Safety", token: "var(--cat-safety)" },
  { key: "marine", label: "Marine", token: "var(--cat-marine)" },
  { key: "health", label: "Health", token: "var(--cat-health)" },
  { key: "sanitation", label: "Sanitation", token: "var(--cat-sanitation)" },
] as const;

export function CategoryGlyph({ category, size = 14 }: { category: string | null | undefined; size?: number }) {
  const { icon: Icon } = pulseCategoryMeta(category);
  return <Icon size={size} strokeWidth={2.2} aria-hidden />;
}
