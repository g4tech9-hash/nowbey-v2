import type { ReactNode } from "react";

/** Landing card material: gradient panel, hairline edge, 20px radius, soft ambient shadow. */
export function Panel({
  className,
  children,
  as: Tag = "section",
  ...rest
}: {
  className?: string;
  children: ReactNode;
  as?: "section" | "div" | "article" | "aside" | "li";
} & React.HTMLAttributes<HTMLElement>) {
  return (
    <Tag className={`nb-surface${className ? ` ${className}` : ""}`} {...rest}>
      {children}
    </Tag>
  );
}

/** Card with the landing hover lift (border warms to tide, -2px rise). */
export function CardLink({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={`nb-surface nb-card-link${className ? ` ${className}` : ""}`}>{children}</div>;
}

/**
 * Panel with a title row — the standard app block:
 * optional eyebrow, display title, optional right-hand actions.
 */
export function PanelHead({
  title,
  eyebrow,
  actions,
  blurb,
  className,
}: {
  title: ReactNode;
  eyebrow?: ReactNode;
  actions?: ReactNode;
  blurb?: ReactNode;
  className?: string;
}) {
  return (
    <div className={`flex flex-wrap items-start gap-x-3 gap-y-2${className ? ` ${className}` : ""}`}>
      <div className="min-w-0 flex-1">
        {eyebrow ? <p className="nb-eyebrow mb-1">{eyebrow}</p> : null}
        <h2 className="display text-[16px] font-extrabold leading-snug tracking-[-0.04em] text-sand-100">{title}</h2>
        {blurb ? <p className="mt-1 max-w-[62ch] text-[12.5px] leading-relaxed text-ink-300">{blurb}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  );
}

/** Numbered step row — landing "how it works" DNA at app scale. */
export function StepRow({ n, title, children }: { n: number | string; title: string; children: ReactNode }) {
  return (
    <p className="mt-2.5 flex gap-2.5">
      <span className="num mt-0.5 grid h-[26px] w-[26px] shrink-0 place-items-center rounded-full bg-tide-500/15 text-[12px] font-extrabold text-tide-300">
        {n}
      </span>
      <span className="text-[12.5px] leading-relaxed text-ink-300">
        <span className="font-bold text-sand-100">{title}. </span>
        {children}
      </span>
    </p>
  );
}
