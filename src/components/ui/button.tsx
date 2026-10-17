import Link from "next/link";
import type { AnchorHTMLAttributes, ButtonHTMLAttributes, ReactNode } from "react";

/**
 * Landing-DNA buttons: pill shape, 180ms lift, gold focus ring.
 * Variants map 1:1 to the landing page's primary / secondary / nav pills.
 */

export type BtnVariant = "primary" | "secondary" | "ghost" | "danger";

const VARIANTS: Record<BtnVariant, string> = {
  primary: "nb-btn nb-btn-primary",
  secondary: "nb-btn nb-btn-secondary",
  ghost: "nb-btn nb-btn-ghost",
  danger: "nb-btn nb-btn-danger",
};

function classes(variant: BtnVariant, size: "sm" | "md", className?: string) {
  return `${VARIANTS[variant]}${size === "sm" ? " nb-btn-sm" : ""}${className ? ` ${className}` : ""}`;
}

type Common = {
  variant?: BtnVariant;
  size?: "sm" | "md";
  className?: string;
  children: ReactNode;
};

export function Button({
  variant = "secondary",
  size = "md",
  className,
  children,
  type = "button",
  ...rest
}: Common & ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button type={type} className={classes(variant, size, className)} {...rest}>
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
  ...rest
}: Common & { href: string } & Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "href">) {
  return (
    <Link href={href} className={classes(variant, size, className)} {...rest}>
      {children}
    </Link>
  );
}

/** Inline tide link whose gap widens on hover — the landing "text link" DNA. */
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

/** Arrow used by primary CTAs on the landing page. */
export function ArrowIcon() {
  return (
    <svg className="arrowIcon" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M5 12h14M13 6l6 6-6 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
