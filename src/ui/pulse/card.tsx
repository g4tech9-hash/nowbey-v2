import type { ElementType, ReactNode } from "react";
import { pulseCategoryMeta } from "./glyph";

/**
 * CardLayered — the elevated surface every data block sits on.
 *
 * Three layers, hence the name: a tinted base gradient, a hairline border with
 * a 1px inner top highlight, and a shadow that gets stronger when the card is
 * the thing you are pointing at. The `spine` prop paints the category rail
 * down the left edge and lights it, which is how a scanned stream resolves
 * into groups without reading a single label.
 */
export function CardLayered({
  children,
  as: Tag = "article",
  category,
  spine,
  raised = false,
  interactive = false,
  className = "",
  id,
  tabIndex,
  role,
  ariaLabelledby,
  onKeyDown,
  onFocus,
  "data-focus": dataFocus,
}: {
  children: ReactNode;
  as?: ElementType;
  /** Paints the spine from the category hue. Pass a key, or `true` for accent. */
  category?: string | null;
  spine?: boolean;
  /** Elevate one step: for the card that is open, pinned or first in the stream. */
  raised?: boolean;
  interactive?: boolean;
  className?: string;
  id?: string;
  tabIndex?: number;
  role?: string;
  ariaLabelledby?: string;
  onKeyDown?: React.KeyboardEventHandler<HTMLElement>;
  onFocus?: React.FocusEventHandler<HTMLElement>;
  "data-focus"?: boolean;
}) {
  const hue = spine || category ? (category ? pulseCategoryMeta(category).token : "var(--accent)") : undefined;
  const classes = [
    "pulse-card",
    "relative",
    spine || category ? "pulse-card-spine" : "",
    interactive ? "pulse-lift" : "",
    raised ? "shadow-l3" : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <Tag
      id={id}
      className={classes}
      role={role}
      tabIndex={tabIndex}
      aria-labelledby={ariaLabelledby}
      onKeyDown={onKeyDown}
      onFocus={onFocus}
      data-focus={dataFocus ? "true" : undefined}
      style={
        {
          ...(hue ? { ["--spine" as string]: hue } : null),
          ...(raised ? { boxShadow: "var(--pulse-elev-3)" } : null),
        } as React.CSSProperties
      }
    >
      {children}
    </Tag>
  );
}

/** A card whose whole body is clickable but whose title is still a real link. */
export function CardLayeredHeader({ title, kicker, right }: { title: ReactNode; kicker?: ReactNode; right?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-start gap-x-3 gap-y-2">
      <div className="min-w-0 flex-1">
        {kicker}
        <h3 className="mt-1.5 text-[17px] font-extrabold leading-snug tracking-[-0.035em] text-primary">{title}</h3>
      </div>
      {right}
    </div>
  );
}

/** Sticky footer row inside a card or drawer: the actions, always in reach. */
export function ActionBar({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div className={`mt-3.5 flex flex-wrap items-center gap-2 border-t border-default pt-3 ${className}`.trim()}>{children}</div>
  );
}
