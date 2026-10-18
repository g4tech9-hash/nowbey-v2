"use client";

import Link from "next/link";
import { usePillIndicator } from "@/lib/pulse/motion";

/**
 * FilterPillRow — the morphing active state.
 *
 * The active pill does not change colour in place: a single highlight element
 * travels from the old pill to the new one and stretches to its width, which is
 * what "layout animation" means here. It is measured (one `transform`, one
 * `width`) rather than animated by a library, so the row costs nothing until it
 * mounts and the browser keeps it on the compositor.
 *
 * Two modes, because a filter rail is sometimes navigation (a shareable URL —
 * the category rail on /feed) and sometimes local state (the island filter on
 * the map). Pass `href` for the first, `onSelect` for the second.
 */
export type PillOption<T extends string = string> = {
  value: T;
  label: string;
  href?: string;
  /** A token reference, e.g. `var(--cat-power)`, for the category hue. */
  hue?: string;
  count?: number;
  title?: string;
};

export function FilterPillRow<T extends string>({
  options,
  value,
  onSelect,
  basePath,
  queryKey,
  ariaLabel,
  size = "md",
  className = "",
}: {
  options: PillOption<T>[];
  value: T | undefined;
  onSelect?: (next: T) => void;
  /** When set, pills render as Links carrying the current other filters. */
  basePath?: string;
  queryKey?: string;
  ariaLabel: string;
  size?: "sm" | "md";
  className?: string;
}) {
  const { rowRef, style, ready } = usePillIndicator<HTMLDivElement>(value ?? "");

  return (
    <div
      ref={rowRef}
      className={`pulse-pill-row pulse-no-scrollbar ${className}`.trim()}
      role="group"
      aria-label={ariaLabel}
    >
      <span className="pulse-pill-indicator" data-ready={ready ? "true" : undefined} style={style} aria-hidden />
      {options.map((o) => {
        const on = o.value === value;
        const shared = {
          "data-on": on ? "true" : undefined,
          "aria-current": on ? ("true" as const) : undefined,
          className: `nb-chip shrink-0 ${size === "sm" ? "nb-chip-sm" : ""}`.trim(),
          style: {
            fontSize: size === "sm" ? "var(--pulse-text-2xs)" : "var(--pulse-text-xs)",
            ...(o.hue ? { ["--category-text" as string]: o.hue } : null),
          } as React.CSSProperties,
          title: o.title,
        };
        const inner = (
          <>
            {o.hue ? (
              <span
                className="inline-block h-2 w-2 rounded-full"
                style={{ background: on ? "currentColor" : o.hue, boxShadow: on ? "none" : `0 0 8px ${o.hue}` }}
                aria-hidden
              />
            ) : null}
            {o.label}
            {o.count !== undefined ? (
              <span className="font-mono tabular-nums opacity-75">{o.count}</span>
            ) : null}
          </>
        );

        if (basePath && queryKey) {
          return (
            <Link key={o.value} href={on ? basePath : `${basePath}?${queryKey}=${o.value}`} {...shared}>
              {inner}
            </Link>
          );
        }
        return (
          <button key={o.value} type="button" onClick={() => onSelect?.(o.value)} {...shared}>
            {inner}
          </button>
        );
      })}
    </div>
  );
}

/**
 * The same morph for a horizontal rail where each pill is a link built by the
 * caller (so it can carry several filters at once). Server-renderable: the
 * highlight is painted by the client after layout, so a no-JS reader still
 * sees the active pill, just without the travel.
 */
export function PillRow({ children, ariaLabel, className = "" }: { children: React.ReactNode; ariaLabel: string; className?: string }) {
  return (
    <div className={`pulse-pill-row pulse-no-scrollbar ${className}`.trim()} role="group" aria-label={ariaLabel}>
      {children}
    </div>
  );
}
