import type { ReactNode } from "react";
import { pulseCategoryMeta, CategoryGlyph } from "./glyph";

/**
 * CatBadge — icon + coloured pill, one per category signal.
 *
 * The colour is a `var()` reference to a Layer 2 category hue, applied through
 * a custom property so `color-mix()` in CSS does the tinting. A badge can
 * therefore never disagree with the map marker, the ticker or the admin queue
 * for the same signal, in either theme.
 */
export function CatBadge({
  category,
  size = "md",
  label,
  title,
  children,
}: {
  /** Any CATEGORIES key. Unknown keys fall back to Notice, never to nothing. */
  category: string | null | undefined;
  size?: "sm" | "md" | "lg";
  /** Overrides the canonical label (used where the copy is editorial). */
  label?: ReactNode;
  title?: string;
  children?: ReactNode;
}) {
  const meta = pulseCategoryMeta(category);
  return (
    <span
      className="pulse-catbadge"
      data-size={size}
      style={{ ["--cat" as string]: meta.token } as React.CSSProperties}
      title={title ?? meta.label}
    >
      <CategoryGlyph category={category} size={size === "lg" ? 15 : 13} />
      <span>{label ?? meta.label}</span>
      {children}
    </span>
  );
}

/** The hue only, for a legend swatch or a map marker. */
export function CatSwatch({ category, size = 10 }: { category: string | null | undefined; size?: number }) {
  const meta = pulseCategoryMeta(category);
  return (
    <span
      aria-hidden
      className="inline-block shrink-0 rounded-full"
      style={{
        width: size,
        height: size,
        background: meta.token,
        boxShadow: `0 0 ${Math.round(size * 1.2)}px color-mix(in srgb, ${meta.token} 60%, transparent)`,
      }}
    />
  );
}

/** A quiet outline chip for metadata that is not a signal (source, status). */
export function MetaChip({ children, tone = "neutral" }: { children: ReactNode; tone?: "neutral" | "accent" | "warning" | "danger" | "info" | "success" }) {
  const map: Record<string, string> = {
    neutral: "var(--text-tertiary)",
    accent: "var(--text-accent)",
    warning: "var(--warning)",
    danger: "var(--danger)",
    info: "var(--info)",
    success: "var(--success)",
  };
  const color = map[tone] ?? map.neutral;
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full border px-2 py-1 text-[11.5px] font-bold leading-none"
      style={{ color, borderColor: `color-mix(in srgb, ${color} 40%, transparent)`, background: `color-mix(in srgb, ${color} 12%, transparent)` }}
    >
      {children}
    </span>
  );
}
