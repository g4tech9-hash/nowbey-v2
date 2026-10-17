import type { InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from "react";

/**
 * Form fields on the landing DNA: panel-dark fill, hairline border that warms
 * to tide on focus with a soft glow, uppercase tide labels.
 * Sizes follow the phone rules: fields render 16px below `sm` (globals.css).
 */

export function Field({
  label,
  hint,
  error,
  htmlFor,
  children,
  className,
}: {
  label: ReactNode;
  hint?: ReactNode;
  error?: ReactNode;
  htmlFor?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <label className={`block${className ? ` ${className}` : ""}`} htmlFor={htmlFor}>
      <span className="nb-field-label">{label}</span>
      {children}
      {error ? (
        <span className="mt-1 block text-[12px] font-semibold text-danger-500">{error}</span>
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

/** Tide eyebrow row with the landing pulsing dot. */
export function Eyebrow({ children, dot = true, className }: { children: ReactNode; dot?: boolean; className?: string }) {
  return (
    <p className={`nb-eyebrow${className ? ` ${className}` : ""}`}>
      {dot ? <span className="nb-eyebrow-dot" aria-hidden /> : null}
      {children}
    </p>
  );
}

/** Small pill status chip. `tone` follows the semantic ramp. */
export function Chip({
  children,
  tone = "neutral",
  className,
}: {
  children: ReactNode;
  tone?: "neutral" | "tide" | "ok" | "warn" | "danger" | "gold";
  className?: string;
}) {
  const tones: Record<string, string> = {
    neutral: "border-white/12 bg-white/5 text-ink-200",
    tide: "border-tide-500/35 bg-tide-500/12 text-tide-300",
    ok: "border-ok-500/35 bg-ok-500/12 text-ok-600",
    warn: "border-sun-500/35 bg-sun-500/12 text-sun-600",
    danger: "border-conch-500/40 bg-conch-500/12 text-conch-500",
    gold: "border-sun-500/30 bg-sun-500/8 text-sun-500",
  };
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[12px] font-bold leading-none ${tones[tone]}${className ? ` ${className}` : ""}`}
    >
      {children}
    </span>
  );
}

/** Stat tile — the landing "proof strip" block at app scale. */
export function StatTile({
  label,
  value,
  tone,
  className,
}: {
  label: string;
  value: ReactNode;
  tone?: string;
  className?: string;
}) {
  return (
    <div className={`nb-surface px-3.5 py-3${className ? ` ${className}` : ""}`}>
      <p className="text-[11.5px] font-bold uppercase tracking-[0.14em] text-ink-400">{label}</p>
      <p className="num display mt-1 text-[22px] font-extrabold leading-tight tracking-[-0.04em]" style={tone ? { color: tone } : { color: "var(--color-tide-300)" }}>
        {value}
      </p>
    </div>
  );
}

/** Empty state — calm, direct, one loud action. */
export function EmptyState({
  title,
  blurb,
  actions,
  className,
}: {
  title: string;
  blurb?: ReactNode;
  actions?: ReactNode;
  className?: string;
}) {
  return (
    <div className={`nb-surface px-5 py-6 text-center${className ? ` ${className}` : ""}`}>
      <p className="display text-[17px] font-extrabold tracking-[-0.04em] text-sand-100">{title}</p>
      {blurb ? <p className="mx-auto mt-1.5 max-w-[52ch] text-[12.5px] leading-relaxed text-ink-300">{blurb}</p> : null}
      {actions ? <div className="mt-3.5 flex flex-wrap justify-center gap-2">{actions}</div> : null}
    </div>
  );
}
