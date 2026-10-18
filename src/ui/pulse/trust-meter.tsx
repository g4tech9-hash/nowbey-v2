import Link from "next/link";
import { ShieldCheck, Sparkles } from "lucide-react";
import { TRUST_BLURB, TRUST_LABEL, TRUST_TOKEN, VERIFY_BEFORE_YOU_ACT, type TrustScore } from "@/lib/pulse/trust";
import { CatBadge, MetaChip } from "./badge";

/**
 * TrustMeter — how much of this is neighbour-verified.
 *
 * The fill animates with the entrance spring from a 0-width box, so the bar
 * draws itself rather than appearing already-full. `compact` is the stream
 * card's 4px rail; the full meter (with its reason list) belongs to the drawer.
 */
export function TrustMeter({
  value,
  compact = false,
  label = "Trust",
  tier,
}: {
  value: number;
  compact?: boolean;
  label?: string;
  /** Optional tier name, so the colour and the word agree. */
  tier?: keyof typeof TRUST_LABEL;
}) {
  const clamped = Math.max(0, Math.min(100, Math.round(value)));
  const tone = tier ? TRUST_TOKEN[tier] : clamped >= 75 ? "var(--success)" : clamped >= 50 ? "var(--info)" : clamped >= 25 ? "var(--warning)" : "var(--danger)";


  return (
    <div className="pulse-trust" data-compact={compact ? "true" : undefined}>
      <div
        className="pulse-trust-track"
        role="meter"
        aria-valuenow={clamped}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`${label}: ${clamped} of 100`}
        style={{
          ["--trust" as string]: String(clamped),
          ["--trust-color" as string]: tone,
        } as React.CSSProperties}
      >
        <span className="pulse-trust-fill" aria-hidden />
      </div>
      {!compact ? (
        <div className="pulse-trust-label">
          <span>{label}</span>
          <span style={{ color: tone }} className="font-mono font-bold">
            {clamped}
          </span>
        </div>
      ) : null}
    </div>
  );
}

/**
 * The drawer's trust card: the score, what it is made of, and the plain
 * sentence about what the score means. Verification is the product's whole
 * claim, so it gets a surface of its own rather than a caption.
 */
export function TrustCard({
  trust,
  sourceKind,
  sourceName,
  sourceUrl,
  href,
}: {
  trust: TrustScore;
  sourceKind: string;
  sourceName?: string | null;
  sourceUrl?: string | null;
  href?: string;
}) {
  const tone = TRUST_TOKEN[trust.tier];
  return (
    <CardLayeredSection label="Why you can believe this" icon={<ShieldCheck size={14} aria-hidden />}>
      <div className="flex flex-wrap items-center gap-2">
        <TrustMeter value={trust.value} tier={trust.tier} label={TRUST_LABEL[trust.tier]} />
        <MetaChip tone={trust.tier === "well" ? "success" : trust.tier === "partial" ? "info" : trust.tier === "recheck" ? "warning" : "danger"}>
          {TRUST_LABEL[trust.tier]}
        </MetaChip>
        {sourceKind === "official" ? <MetaChip tone="accent">Official source</MetaChip> : null}
        {sourceKind === "news" ? <MetaChip tone="info">From the wire</MetaChip> : null}
      </div>
      <p className="mt-2 text-[13px] leading-[1.7] text-secondary">
        <span className="font-bold text-primary">{trust.lead}.</span> {TRUST_BLURB[trust.tier]}
      </p>
      {trust.reasons.length ? (
        <ul className="mt-2.5 grid gap-1.5">
          {trust.reasons.map((r) => (
            <li key={r.label} className="flex items-center gap-2 text-[12.5px] text-tertiary">
              <span className="font-mono font-bold" style={{ color: tone, minWidth: "3ch" }}>
                {r.delta > 0 ? `+${r.delta}` : "—"}
              </span>
              <span>{r.label}</span>
            </li>
          ))}
        </ul>
      ) : null}
      <p className="mt-2.5 text-[12.5px] leading-[1.65] text-tertiary">
        {sourceKind === "official" ? (
          <>
            Imported from {sourceName ?? "a named public source"}.{" "}
            {sourceUrl ? (
              <a href={sourceUrl} target="_blank" rel="noreferrer" className="nb-link-arrow">
                Open the original <Sparkles size={12} aria-hidden />
              </a>
            ) : null}
          </>
        ) : (
          <>
            Community information can be incomplete or wrong. {VERIFY_BEFORE_YOU_ACT}{" "}
            {href ? (
              <Link href={href} className="nb-textlink">
                Read the whole thread
              </Link>
            ) : null}
          </>
        )}
      </p>
    </CardLayeredSection>
  );
}

/** A titled sub-block inside a card — used by the drawer and the detail page. */
export function CardLayeredSection({
  label,
  icon,
  children,
  action,
}: {
  label: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <section className="pulse-card-inner">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="nb-label flex items-center gap-2 text-accent">
          {icon}
          {label}
        </h3>
        {action}
      </div>
      <div className="mt-2">{children}</div>
    </section>
  );
}

/** The GPS accuracy card: what the pin means, in metres, on the ground. */
export function AccuracyCard({
  lat,
  lng,
  accuracyMeters,
  address,
  street,
  parish,
  pinApproximated,
  mapHref,
}: {
  lat: number;
  lng: number;
  accuracyMeters?: number | null;
  address?: string | null;
  street?: string | null;
  parish?: string | null;
  pinApproximated?: boolean;
  mapHref?: string;
}) {
  const fmt = (v: number, axis: "lat" | "lng") =>
    `${Math.abs(v).toFixed(4)}° ${axis === "lat" ? (v >= 0 ? "N" : "S") : v >= 0 ? "E" : "W"}`;
  const meters = accuracyMeters ? Math.round(accuracyMeters) : null;
  return (
    <CardLayeredSection
      label="Location and accuracy"
      icon={
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
          <path d="M12 21s7-6.3 7-11a7 7 0 1 0-14 0c0 4.7 7 11 7 11Z" />
          <circle cx="12" cy="10" r="2.4" />
        </svg>
      }
      action={mapHref ? <Link href={mapHref} className="nb-textlink">Open on map</Link> : null}
    >
      <dl className="grid gap-2 sm:grid-cols-2">
        <div>
          <dt className="nb-label">Coordinates</dt>
          <dd className="font-mono text-[13px] font-semibold text-primary tabular-nums">
            {fmt(lat, "lat")} · {fmt(lng, "lng")}
          </dd>
        </div>
        <div>
          <dt className="nb-label">Accuracy</dt>
          <dd className="font-mono text-[13px] font-semibold text-primary tabular-nums">
            {meters ? `± ${meters} m` : "not stated"}
          </dd>
        </div>
        {street || parish ? (
          <div>
            <dt className="nb-label">Nearest</dt>
            <dd className="text-[13px] font-semibold text-primary">
              {[street, parish].filter(Boolean).join(" · ")}
            </dd>
          </div>
        ) : null}
        {address ? (
          <div>
            <dt className="nb-label">Address on file</dt>
            <dd className="text-[13px] text-secondary">{address}</dd>
          </div>
        ) : null}
      </dl>
      {pinApproximated ? (
        <p className="mt-2 text-[12.5px] text-tertiary">
          This pin sits a short distance from the spot the reporter chose, so a home address is never published.
        </p>
      ) : null}
    </CardLayeredSection>
  );
}

/** The category + status strip that heads every incident surface. */
export function IncidentStrip({
  category,
  status,
  sourceKind,
  age,
  right,
}: {
  category: string;
  status: string;
  sourceKind?: string;
  age?: React.ReactNode;
  right?: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1.5">
      <CatBadge category={category} />
      {status !== "active" ? <MetaChip>{status}</MetaChip> : null}
      {sourceKind === "news" ? <MetaChip tone="info">from the wire</MetaChip> : null}
      {sourceKind === "official" ? <MetaChip tone="accent">official</MetaChip> : null}
      <span className="ml-auto flex items-center gap-2">{age}</span>
      {right}
    </div>
  );
}
