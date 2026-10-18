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
export const PULSE_CATEGORIES: Record<CategoryKey, PulseCategoryMeta> = {
  flood: { label: "Flooding", icon: Droplets, token: "var(--cat-flooding)", signal: "flooding" },
  storm: { label: "Storm", icon: CloudLightning, token: "var(--cat-storm)", signal: "flooding" },
  power: { label: "Power", icon: Zap, token: "var(--cat-power)", signal: "power" },
  water: { label: "Water", icon: Waves, token: "var(--cat-water)", signal: "water" },
  crime: { label: "Safety", icon: ShieldAlert, token: "var(--cat-safety)", signal: "safety" },
  road: { label: "Road", icon: TrafficCone, token: "var(--cat-road)", signal: "road" },
  marine: { label: "Marine", icon: Anchor, token: "var(--cat-marine)", signal: "marine" },
  fire: { label: "Fire", icon: Flame, token: "var(--cat-fire)", signal: "safety" },
  health: { label: "Health", icon: Cross, token: "var(--cat-health)", signal: "health" },
  trash: { label: "Sanitation", icon: Trash2, token: "var(--cat-sanitation)", signal: "sanitation" },
  event: { label: "Community", icon: Star, token: "var(--cat-community)", signal: "safety" },
  notice: { label: "Notice", icon: Info, token: "var(--cat-notice)", signal: "safety" },
  accident: { label: "Car accident", icon: Car, token: "var(--cat-accident)", signal: "road" },
};

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
