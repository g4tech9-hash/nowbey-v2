import type { InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from "react";

/**
 * Fields on Pulse Layer 3 tokens (`--input-bg`, `--input-border`) with the
 * focus ring from the same primitive every other control uses. Sizes follow the
 * phone rules: 16px below `sm` so iOS never zooms, from the breakpoint up the
 * type scale returns to `--pulse-text-sm`.
 */

export function Field({
  label,
  hint,
  error,
  htmlFor,
  children,
  className,
  required,
}: {
  label: ReactNode;
  hint?: ReactNode;
  error?: ReactNode;
  htmlFor?: string;
  children: ReactNode;
  className?: string;
  required?: boolean;
}) {
  return (
    <label className={`block${className ? ` ${className}` : ""}`} htmlFor={htmlFor}>
      <span className="nb-field-label">
        {label}
        {required ? (
          <>
            <span aria-hidden> *</span> <span className="pulse-sr-only">required</span>
          </>
        ) : null}
      </span>
      {children}
      {error ? (
        <span className="pulse-field-error" role="alert">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" aria-hidden>
            <path d="M12 8.5v5M12 16.8v.4" />
            <circle cx="12" cy="12" r="9.2" />
          </svg>
          {error}
        </span>
      ) : hint ? (
        <span className="nb-field-hint">{hint}</span>
      ) : null}
    </label>
  );
}

export function Input({ className, ...rest }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={`nb-field${className ? ` ${className}` : ""}`} {...rest} />;
}

export function Textarea({ className, ...rest }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={`nb-field resize-y${className ? ` ${className}` : ""}`} {...rest} />;
}

export function Select({ className, children, ...rest }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select className={`nb-field${className ? ` ${className}` : ""}`} {...rest}>
      {children}
    </select>
  );
}

/** Accent eyebrow row with the pulsing dot. `dot={false}` when the copy is not live. */
export function Eyebrow({ children, dot = true, className }: { children: ReactNode; dot?: boolean; className?: string }) {
  return (
    <p className={`nb-eyebrow${className ? ` ${className}` : ""}`}>
      {dot ? <span className="pulse-live-dot" style={{ background: "currentColor" }} aria-hidden /> : null}
      {children}
    </p>
  );
}

/** Small pill status chip. `tone` is a semantic, never a hex. */
export function Chip({
  children,
  tone = "neutral",
  className,
}: {
  children: ReactNode;
  tone?: "neutral" | "tide" | "ok" | "warn" | "danger" | "gold" | "info";
  className?: string;
}) {
  const token: Record<string, string> = {
    neutral: "var(--text-tertiary)",
    tide: "var(--text-accent)",
    accent: "var(--text-accent)",
    ok: "var(--success)",
    success: "var(--success)",
    warn: "var(--warning)",
    danger: "var(--danger)",
    gold: "var(--warning)",
    info: "var(--info)",
  };
  const color = token[tone] ?? token.neutral;
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-1 text-[12px] font-bold leading-none${className ? ` ${className}` : ""}`}
      style={{ color, borderColor: `color-mix(in srgb, ${color} 40%, transparent)`, background: `color-mix(in srgb, ${color} 12%, transparent)` }}
    >
      {children}
    </span>
  );
}

/** Stat tile — the proof strip at app scale. Numbers are tabular by contract. */
export function StatTile({
  label,
  value,
  tone,
  className,
  hint,
}: {
  label: string;
  value: ReactNode;
  tone?: string;
  className?: string;
  hint?: ReactNode;
}) {
  return (
    <div className={`pulse-card pulse-card-pad${className ? ` ${className}` : ""}`}>
      <p className="nb-label">{label}</p>
      <p
        className="mt-1 text-[22px] font-extrabold leading-tight tracking-[-0.04em] tabular-nums"
        style={{ fontFamily: "var(--font-display)", color: tone ?? "var(--text-accent)" }}
      >
        {value}
      </p>
      {hint ? <p className="mt-1 text-[12px] text-tertiary">{hint}</p> : null}
    </div>
  );
}

/**
 * Empty state — calm, direct, one loud action (Hick's law). Delegates to the
 * Pulse state so a page and a drawer cannot drift apart; `actions` is kept for
 * the twenty-odd call sites that pass a button row.
 */
export function EmptyState({
  title,
  blurb,
  actions,
  className,
  icon,
}: {
  title: string;
  blurb?: ReactNode;
  actions?: ReactNode;
  className?: string;
  icon?: ReactNode;
}) {
  return (
    <div className={`pulse-state${className ? ` ${className}` : ""}`}>
      <span className="grid h-10 w-10 place-items-center rounded-full border border-default bg-hover text-tertiary" aria-hidden>
        {icon ?? (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round">
            <path d="M3 14h4l2 3h6l2-3h4M4.5 14 6 6h12l1.5 8" />
          </svg>
        )}
      </span>
      <h3 className="text-primary">{title}</h3>
      {blurb ? <p>{blurb}</p> : null}
      {actions ? <div className="mt-1 flex flex-wrap justify-center gap-2">{actions}</div> : null}
    </div>
  );
}
