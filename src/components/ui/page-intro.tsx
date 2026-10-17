import type { ReactNode } from "react";

/**
 * Page intro — the landing "section intro" grammar at app scale:
 * tide eyebrow, Sora display headline with tight tracking, muted lede,
 * pill actions on the right.
 */
export function PageIntro({
  eyebrow,
  title,
  blurb,
  actions,
  className,
}: {
  eyebrow: ReactNode;
  title: ReactNode;
  blurb?: ReactNode;
  actions?: ReactNode;
  className?: string;
}) {
  return (
    <div className={`flex flex-wrap items-end gap-x-4 gap-y-3${className ? ` ${className}` : ""}`}>
      <div className="min-w-[240px] flex-1">
        <p className="nb-eyebrow">{eyebrow}</p>
        <h1 className="display mt-2 text-[clamp(1.7rem,4.6vw,2.55rem)] font-extrabold leading-[1.04] tracking-[-0.055em] text-sand-100">
          {title}
        </h1>
        {blurb ? <p className="mt-2.5 max-w-[62ch] text-[13.5px] leading-[1.75] text-ink-300">{blurb}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  );
}

/** Small section title inside a panel or a rail. */
export function SectionTitle({
  children,
  className,
  as: Tag = "h2",
}: {
  children: ReactNode;
  className?: string;
  as?: "h2" | "h3" | "p";
}) {
  return (
    <Tag className={`display text-[15px] font-extrabold tracking-[-0.045em] text-sand-100${className ? ` ${className}` : ""}`}>
      {children}
    </Tag>
  );
}
