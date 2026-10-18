import type { ReactNode } from "react";
import { CardLayered } from "@/ui/pulse/card";

/**
 * Panels are `CardLayered` under another name. Two APIs stayed because ~30 pages
 * import these, and the redesign is not allowed to break them; underneath, they
 * are one component reading `--card-bg` / `--card-border` / `--card-radius` /
 * `--card-shadow`.
 */
export function Panel({
  className,
  children,
  as: Tag = "section",
  spine,
  ...rest
}: {
  className?: string;
  children: ReactNode;
  as?: "section" | "div" | "article" | "aside" | "li";
  /** Paint the left spine rail (pass a category key to colour it by signal). */
  spine?: boolean | string;
} & React.HTMLAttributes<HTMLElement>) {
  return (
    <CardLayered
      as={Tag}
      className={className}
      spine={spine === true || typeof spine === "string"}
      category={typeof spine === "string" ? spine : null}
      {...rest}
    >
      {/* No padding here on purpose: every call site supplies its own, and a
          redesign that moved the padding into the component would double it. */}
      {children}
    </CardLayered>
  );
}

/** Card with the hover lift (edge warms to the accent, the card rises 3px). */
export function CardLink({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <div className={`pulse-card pulse-lift${className ? ` ${className}` : ""}`}>{children}</div>
  );
}

/** Panel with a title row: eyebrow, display title, optional right-hand actions. */
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
        <h2 className="mt-0.5 text-[16px] font-extrabold leading-snug tracking-[-0.035em] text-primary">{title}</h2>
        {blurb ? <p className="mt-1 max-w-[62ch] text-[13px] leading-[1.7] text-tertiary">{blurb}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  );
}

/** Numbered step row — the wizard and "how it works" grammar. */
export function StepRow({ n, title, children }: { n: number | string; title: string; children: ReactNode }) {
  return (
    <p className="mt-2.5 flex gap-2.5">
      <span className="nb-num mt-0.5" aria-hidden>
        {n}
      </span>
      <span className="text-[13px] leading-[1.7] text-secondary">
        <span className="font-bold text-primary">{title}. </span>
        {children}
      </span>
    </p>
  );
}
