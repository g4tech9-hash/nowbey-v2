"use client";

/**
 * NowBey component kit (Master Build Section 6) — job-named primitives.
 * Every interactive element carries hover, active, disabled and focus states
 * through .nbx-btn / .nbx-tile / .nbx-field (see globals.css tokens).
 */
import Link from "next/link";
import type { ButtonHTMLAttributes, ComponentProps, ReactNode } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Info,
  Loader2,
  MapPin,
  RefreshCw,
  ShieldAlert,
  Waves,
  Wind,
  Zap,
  Flame,
  ThumbsUp,
} from "lucide-react";
import { HAZARD_META, type HazardType, type Severity } from "@/lib/bahamas";
import { timeAgo } from "./format";

/* ------------------------------------------------------------------ */
/* Buttons (6.1)                                                        */
/* ------------------------------------------------------------------ */

type Variant = "primary" | "gold" | "ghost" | "danger";

const VARIANT_CLASS: Record<Variant, string> = {
  primary: "nbx-btn nbx-btn-primary",
  gold: "nbx-btn nbx-btn-gold",
  ghost: "nbx-btn nbx-btn-ghost",
  danger: "nbx-btn nbx-btn-danger",
};

export function Btn({
  variant = "primary",
  loading = false,
  icon,
  children,
  className = "",
  disabled,
  ...rest
}: {
  variant?: Variant;
  loading?: boolean;
  icon?: ReactNode;
} & ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      className={`${VARIANT_CLASS[variant]} ${className}`}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...rest}
    >
      {loading ? <Loader2 className="nbx-spinner-svg h-4 w-4 animate-spin" aria-hidden /> : icon}
      {children}
    </button>
  );
}

export function LinkBtn({
  variant = "primary",
  href,
  icon,
  children,
  className = "",
  ...rest
}: {
  variant?: Variant;
  href: string;
  icon?: ReactNode;
  className?: string;
} & Omit<ComponentProps<typeof Link>, "href" | "className">) {
  return (
    <Link href={href} className={`${VARIANT_CLASS[variant]} ${className}`} {...rest}>
      {icon}
      {children}
    </Link>
  );
}

/* ------------------------------------------------------------------ */
/* Hazard + severity chips (6.2) — icon + label, never colour alone     */
/* ------------------------------------------------------------------ */

export function hazardIcon(type: string, size = 14): ReactNode {
  const cls = { size, "aria-hidden": true } as const;
  switch (type as HazardType) {
    case "flooding":
      return <Waves {...cls} />;
    case "power_outage":
      return <Zap {...cls} />;
    case "road_hazard":
      return <AlertTriangle {...cls} />;
    case "weather":
      return <Wind {...cls} />;
    case "fire":
      return <Flame {...cls} />;
    default:
      return <ShieldAlert {...cls} />;
  }
}

export function HazardChip({ type, className = "" }: { type: string; className?: string }) {
  const meta = HAZARD_META[type as HazardType] ?? HAZARD_META.safety;
  return (
    <span
      className={`nbx-chip nbx-chip-hz ${className}`}
      style={
        {
          "--nb-chip-color": `var(${meta.colorVar})`,
          "--nb-chip-text": `var(${meta.textVar})`,
        } as React.CSSProperties
      }
    >
      {hazardIcon(type, 13)}
      {meta.short}
    </span>
  );
}

export function SeverityChip({ severity, className = "" }: { severity: Severity | string; className?: string }) {
  const label = severity === "critical" ? "Critical" : severity === "high" ? "High" : severity === "medium" ? "Medium" : "Low";
  if (severity === "critical") {
    return (
      <span className={`nbx-chip border-transparent bg-hz-critical text-white ${className}`}>
        <AlertTriangle size={13} aria-hidden />
        CRITICAL
      </span>
    );
  }
  if (severity === "high") {
    return (
      <span className={`nbx-chip border-transparent bg-gold text-trench ${className}`}>
        <AlertTriangle size={13} aria-hidden />
        High
      </span>
    );
  }
  const isLow = severity === "low";
  return (
    <span
      className={`nbx-chip nbx-chip-hz ${className}`}
      style={
        {
          "--nb-chip-color": isLow ? "var(--nb-ok)" : "var(--nb-aqua)",
          "--nb-chip-text": isLow ? "var(--nb-ok-text)" : "var(--nb-aqua)",
        } as React.CSSProperties
      }
    >
      <CheckCircle2 size={13} aria-hidden />
      {label}
    </span>
  );
}

export function StatusChip({ status, className = "" }: { status: string; className?: string }) {
  const map: Record<string, { label: string; color: string; text: string }> = {
    active: { label: "Active", color: "var(--nb-road)", text: "var(--nb-road-text)" },
    verified: { label: "Verified", color: "var(--nb-ok)", text: "var(--nb-ok-text)" },
    resolved: { label: "Resolved", color: "var(--nb-ink-3)", text: "var(--nb-ink-2)" },
  };
  const s = map[status] ?? map.active;
  return (
    <span
      className={`nbx-chip nbx-chip-hz ${className}`}
      style={{ "--nb-chip-color": s.color, "--nb-chip-text": s.text } as React.CSSProperties}
    >
      {status === "verified" ? <CheckCircle2 size={13} aria-hidden /> : status === "active" ? <ShieldAlert size={13} aria-hidden /> : <CheckCircle2 size={13} aria-hidden />}
      {s.label}
    </span>
  );
}

/* ------------------------------------------------------------------ */
/* Incident card (6.4)                                                  */
/* ------------------------------------------------------------------ */

export function IncidentCard({
  report,
  selected = false,
  onSelect,
  href,
}: {
  report: {
    id: string;
    title: string;
    description: string;
    hazardType: string;
    severity: Severity | string;
    island: string;
    settlement: string;
    confirmedCount: number;
    createdAt: string;
  };
  selected?: boolean;
  onSelect?: () => void;
  href?: string;
}) {
  const inner = (
    <>
      <div className="flex flex-wrap items-center gap-2">
        <HazardChip type={report.hazardType} />
        <span className="nbx-label-xs text-ink-3">{report.island}</span>
        <span className="nbx-label-xs ml-auto nbx-num text-ink-3">{timeAgo(report.createdAt)}</span>
      </div>
      <p className="nbx-h3 line-clamp-1 text-ink">{report.title}</p>
      <p className="nbx-body line-clamp-2 text-ink-2">{report.description || "No extra detail shared yet."}</p>
      <div className="mt-auto flex flex-wrap items-center gap-x-4 gap-y-1 pt-1">
        {report.settlement ? (
          <span className="inline-flex items-center gap-1 text-[12px] font-semibold text-ink-2">
            <MapPin size={14} aria-hidden />
            {report.settlement}
          </span>
        ) : null}
        <span className="inline-flex items-center gap-1 text-[12px] font-bold text-hz-ok">
          <ThumbsUp size={14} aria-hidden />
          <span className="nbx-num">{report.confirmedCount}</span>
          <span className="text-ink-2">confirmed</span>
        </span>
      </div>
    </>
  );
  const cls = `nbx-card nbx-card-interactive flex min-h-[44px] cursor-pointer flex-col gap-2 p-4 ${
    selected ? "border-aqua shadow-nb-hover" : ""
  }`;
  if (href) {
    return (
      <a href={href} className={cls} onClick={onSelect} aria-current={selected ? "true" : undefined}>
        {inner}
      </a>
    );
  }
  return (
    <button type="button" className={`${cls} w-full text-left`} onClick={onSelect} aria-current={selected ? "true" : undefined}>
      {inner}
    </button>
  );
}

/* ------------------------------------------------------------------ */
/* Stat block (6.12)                                                    */
/* ------------------------------------------------------------------ */

export function StatBlock({ value, label, accent = false }: { value: ReactNode; label: string; accent?: boolean }) {
  return (
    <div className="flex min-w-[92px] flex-col gap-0.5">
      <span className={`nbx-num text-[24px] font-[900] leading-none ${accent ? "text-gold" : "text-ink"}`}>{value}</span>
      <span className="nbx-label-xs text-ink-2">{label}</span>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Loading / empty / error (6.13) — never a blank screen                */
/* ------------------------------------------------------------------ */

export function LoadingState({ label = "Loading", rows = 3 }: { label?: string; rows?: number }) {
  return (
    <div className="flex flex-col gap-3 p-4" role="status" aria-live="polite">
      <div className="flex items-center gap-2 text-ink-2">
        <Loader2 size={16} className="animate-spin" aria-hidden />
        <span className="text-[13px] font-semibold">{label}…</span>
      </div>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="nbx-skeleton h-16 w-full" aria-hidden />
      ))}
    </div>
  );
}

export function EmptyState({
  icon,
  title,
  action,
}: {
  icon?: ReactNode;
  title: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center gap-3 px-6 py-10 text-center">
      <span className="text-ink-3 opacity-40">{icon ?? <ShieldAlert size={40} aria-hidden />}</span>
      <p className="nbx-body max-w-[36ch] text-ink-2">{title}</p>
      {action}
    </div>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="flex flex-col items-center gap-3 px-6 py-10 text-center" role="alert">
      <span className="text-hz-critical">
        <AlertTriangle size={32} aria-hidden />
      </span>
      <p className="nbx-body max-w-[38ch] text-ink-2">{message}</p>
      {onRetry ? (
        <Btn variant="ghost" icon={<RefreshCw size={16} aria-hidden />} onClick={onRetry}>
          Retry
        </Btn>
      ) : null}
    </div>
  );
}

export function InfoNote({ children }: { children: ReactNode }) {
  return (
    <p className="flex items-start gap-2 rounded-[12px] border border-edge bg-gold/10 p-3 text-[13px] font-semibold leading-relaxed text-ink">
      <span className="mt-0.5 text-gold-pressed">
        <Info size={16} aria-hidden />
      </span>
      <span>{children}</span>
    </p>
  );
}
