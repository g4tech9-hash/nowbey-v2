"use client";

import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from "react";

/**
 * Pressable / Lift — the shared interaction states.
 *
 * Two components instead of every page inventing its own `hover:scale-105
 * active:scale-95`, because the moment a design system has three press
 * timings it has none. `Pressable` is a button (or any element) that answers a
 * tap; `Lift` is a surface that answers a cursor. Both are inert on a touch
 * screen — hover on a phone is a lie that sticks — and both are honest about
 * their accessible name.
 */

type PressableProps = {
  children: ReactNode;
  /** Render as something else (Link, div) while keeping the state machinery. */
  as?: "button" | "div";
  className?: string;
  disabled?: boolean;
  /** Lift on hover as well as compress on press — for whole cards. */
  lift?: boolean;
} & ButtonHTMLAttributes<HTMLButtonElement>;

export const Pressable = forwardRef<HTMLButtonElement, PressableProps>(function Pressable(
  { children, className = "", disabled, lift, as: Tag = "button", type, ...rest },
  ref,
) {
  const classes = `${lift ? "pulse-lift" : "pulse-press"} ${className}`.trim();
  if (Tag === "div") {
    return (
      <div
        ref={ref as React.Ref<HTMLDivElement>}
        className={classes}
        role="button"
        tabIndex={disabled ? -1 : 0}
        aria-disabled={disabled || undefined}
        {...(rest as React.HTMLAttributes<HTMLDivElement>)}
      >
        {children}
      </div>
    );
  }
  return (
    <button ref={ref} type={type ?? "button"} className={classes} disabled={disabled} {...rest}>
      {children}
    </button>
  );
});

/** A surface that rises toward the cursor. Use for anything you can open. */
export function Lift({
  children,
  className = "",
  as: Tag = "div",
  ...rest
}: { children: ReactNode; className?: string; as?: "div" | "li" | "article" } & React.HTMLAttributes<HTMLElement>) {
  return (
    <Tag className={`pulse-lift ${className}`.trim()} {...rest}>
      {children}
    </Tag>
  );
}

/**
 * The focus-visible ring primitive. Anything custom-built (a draggable marker,
 * a canvas overlay button) wraps itself in this instead of shipping no ring.
 */
export function FocusRing({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <span className={`pulse-focus-ring inline-flex ${className}`.trim()}>{children}</span>;
}

/** Segmented control: one exclusive choice, pressed state exposed properly. */
export function Segmented<T extends string>({
  value,
  options,
  onChange,
  label,
  size = "md",
}: {
  value: T;
  options: { value: T; label: string; icon?: ReactNode; title?: string }[];
  onChange: (next: T) => void;
  label: string;
  size?: "sm" | "md";
}) {
  return (
    <div className="pulse-seg" role="group" aria-label={label}>
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          aria-pressed={value === o.value}
          title={o.title ?? o.label}
          onClick={() => onChange(o.value)}
          style={{ fontSize: size === "sm" ? "var(--pulse-text-2xs)" : "var(--pulse-text-xs)" }}
        >
          {o.icon}
          {o.label}
        </button>
      ))}
    </div>
  );
}

/** A switch that is a real switch to assistive tech, not a styled checkbox. */
export function Switch({
  on,
  onChange,
  label,
  detail,
  disabled,
}: {
  on: boolean;
  onChange: (next: boolean) => void;
  label: string;
  detail?: string;
  disabled?: boolean;
}) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <button
        type="button"
        role="switch"
        aria-checked={on}
        aria-label={detail ? `${label} — ${detail}` : label}
        className="nb-toggle"
        onClick={() => onChange(!on)}
        disabled={disabled}
      />
      <span className="min-w-0">
        <span className="block text-[13.5px] font-bold text-primary">{label}</span>
        {detail ? <span className="mt-0.5 block text-[12.5px] leading-snug text-tertiary">{detail}</span> : null}
      </span>
    </div>
  );
}
