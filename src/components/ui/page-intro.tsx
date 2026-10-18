import type { ReactNode } from "react";

/**
 * PageIntro — the first 5 seconds of every page.
 *
 * The rule it exists to enforce: one band, one promise, one primary action.
 * Landing grammar at app scale (accent eyebrow → display headline → muted lede
 * → pill actions), on an elevated surface with a radial glow behind the type, so
 * a page reads as a place rather than a list that starts mid-sentence.
 */
export function PageIntro({
  eyebrow,
  title,
  blurb,
  actions,
  className,
  kicker,
  as: Tag = "h1",
}: {
  eyebrow?: ReactNode;
  title: ReactNode;
  blurb?: ReactNode;
  actions?: ReactNode;
  className?: string;
  /** Anything that belongs above the headline: a live pill, a category badge. */
  kicker?: ReactNode;
  /** Downgrade to h2 when the page already has its own h1 (a detail view). */
  as?: "h1" | "h2";
}) {
  return (
    <header className={`pulse-intro pulse-enter${className ? ` ${className}` : ""}`}>
      <div className="pulse-intro-copy">
        {eyebrow ? <p className="nb-eyebrow">{eyebrow}</p> : null}
        {kicker ? <div className="mt-2.5 flex flex-wrap items-center gap-2">{kicker}</div> : null}
        <Tag className="mt-2.5">{title}</Tag>
        {blurb ? <p className="pulse-lede mt-2.5">{blurb}</p> : null}
      </div>
      {actions ? <div className="pulse-intro-actions">{actions}</div> : null}
    </header>
  );
}

/** Small section title inside a panel or a rail. */
export function SectionTitle({
  children,
  className,
  as: Tag = "h2",
  right,
}: {
  children: ReactNode;
  className?: string;
  as?: "h2" | "h3" | "p";
  right?: ReactNode;
}) {
  if (right) {
    return (
      <div className={`flex flex-wrap items-baseline justify-between gap-2${className ? ` ${className}` : ""}`}>
        <Tag className="text-[15px] font-extrabold tracking-[-0.035em] text-primary">{children}</Tag>
        {right}
      </div>
    );
  }
  return <Tag className={`text-[15px] font-extrabold tracking-[-0.035em] text-primary${className ? ` ${className}` : ""}`}>{children}</Tag>;
}
