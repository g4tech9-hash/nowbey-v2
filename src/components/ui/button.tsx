import Link from "next/link";
import type { AnchorHTMLAttributes, ButtonHTMLAttributes, ReactNode } from "react";

/**
 * The button half of the shared kit, rebuilt on Pulse component tokens.
 *
 * The API is unchanged — every page that writes `<Button variant="primary">`
 * keeps working — but the styles are now Layer 3 (`--btn-primary-bg`,
 * `--btn-primary-text`, `--btn-primary-hover`) instead of a lit-up tide hex in
 * five places. `pulse-press` adds the spring: scale 0.92 on press, 1.03 on
 * hover for a fine pointer only, and nothing at all under reduced motion.
 */

export type BtnVariant = "primary" | "secondary" | "ghost" | "danger" | "outline";

const VARIANTS: Record<BtnVariant, string> = {
  primary: "nb-btn nb-btn-primary",
  secondary: "nb-btn nb-btn-secondary",
  ghost: "nb-btn nb-btn-ghost",
  danger: "nb-btn nb-btn-danger",
  outline: "nb-btn nb-btn-outline",
};

function classes(variant: BtnVariant, size: "sm" | "md", className?: string, extra?: string) {
  return `${VARIANTS[variant]}${size === "sm" ? " nb-btn-sm" : ""}${extra ? ` ${extra}` : ""}${className ? ` ${className}` : ""}`;
}

type Common = {
  variant?: BtnVariant;
  size?: "sm" | "md";
  className?: string;
  children: ReactNode;
  /** Full-width: for the one action at the bottom of a sheet or a form step. */
  block?: boolean;
};

export function Button({
  variant = "secondary",
  size = "md",
  className,
  children,
  type = "button",
  block,
  ...rest
}: Common & ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button type={type} className={classes(variant, size, className, block ? "nb-btn-block" : "pulse-press")} {...rest}>
      {children}
    </button>
  );
}

export function ButtonLink({
  variant = "secondary",
  size = "md",
  className,
  children,
  href,
  block,
  ...rest
}: Common & { href: string } & Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "href">) {
  return (
    <Link href={href} className={classes(variant, size, className, block ? "nb-btn-block" : "pulse-press")} {...rest}>
      {children}
    </Link>
  );
}

/** A pill that only carries an icon. The name is mandatory: W5 in the mobile audit. */
export function IconButton({
  label,
  children,
  className,
  variant = "ghost",
  ...rest
}: { label: string; children: ReactNode; className?: string; variant?: BtnVariant } & ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button type="button" aria-label={label} title={label} className={`${VARIANTS[variant]} nb-btn-icon pulse-press${className ? ` ${className}` : ""}`} {...rest}>
      {children}
    </button>
  );
}

/** Inline text link whose gap widens on hover — the landing's link DNA. */
export function TextLink({
  href,
  className,
  children,
  ...rest
}: { href: string; className?: string; children: ReactNode } & Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "href">) {
  return (
    <Link href={href} className={`nb-textlink${className ? ` ${className}` : ""}`} {...rest}>
      {children}
    </Link>
  );
}

/** Arrow used by primary CTAs. */
export function ArrowIcon() {
  return (
    <svg className="arrowIcon" width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden style={{ transition: "transform var(--pulse-duration-state) var(--pulse-ease-spring)" }}>
      <path d="M5 12h14M13 6l6 6-6 6" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
