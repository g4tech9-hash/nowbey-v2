/**
 * Skeleton — the loading state, shaped like the thing that is coming.
 *
 * A spinner says "wait"; a skeleton says "here is where it lands", which is the
 * difference between a feed that feels broken and one that feels fast. The
 * shimmer is a `--pulse-shimmer-period` (1.4s) sweep over a token-derived
 * gradient, and it stops entirely under reduced motion, leaving a still block.
 * Heights are reserved by the shape, so CLS stays near zero.
 */
export function Skeleton({
  shape = "line",
  width,
  height,
  radius,
  className = "",
  style,
}: {
  shape?: "line" | "title" | "pill" | "block" | "avatar";
  width?: number | string;
  height?: number | string;
  radius?: number | string;
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <span
      className={`pulse-skeleton ${className}`.trim()}
      data-shape={shape}
      aria-hidden
      style={{ width, height, borderRadius: radius, ...style }}
    />
  );
}

/** The exact shape of an incident card, so the stream does not jump. */
export function SkeletonIncidentCard() {
  return (
    <div className="pulse-card pulse-card-pad" aria-hidden>
      <div className="flex items-center gap-2">
        <Skeleton shape="pill" />
        <Skeleton shape="pill" width={64} />
        <Skeleton shape="line" width={92} className="ml-auto" />
      </div>
      <div className="mt-3 space-y-2">
        <Skeleton shape="title" width="72%" />
        <Skeleton shape="line" width="96%" />
        <Skeleton shape="line" width="84%" />
      </div>
      <div className="mt-3.5 flex items-center gap-2">
        <Skeleton shape="avatar" />
        <Skeleton shape="line" width={120} />
        <Skeleton shape="pill" width={78} className="ml-auto" />
      </div>
      <div className="mt-3 flex gap-2 border-t border-default pt-3">
        <Skeleton shape="pill" width={112} />
        <Skeleton shape="pill" width={96} />
        <Skeleton shape="pill" width={80} />
      </div>
    </div>
  );
}

export function SkeletonStream({ count = 5 }: { count?: number }) {
  return (
    <div className="pulse-stream" role="status" aria-live="polite" aria-busy="true">
      <span className="sr-only">Loading signals from your neighbours…</span>
      {Array.from({ length: count }, (_, i) => (
        <SkeletonIncidentCard key={i} />
      ))}
    </div>
  );
}

export function SkeletonRail({ rows = 4, label = "Loading" }: { rows?: number; label?: string }) {
  return (
    <div className="pulse-card pulse-card-pad" role="status" aria-live="polite" aria-busy="true">
      <span className="sr-only">{label}</span>
      <Skeleton shape="line" width={110} />
      <div className="mt-3 space-y-2.5">
        {Array.from({ length: rows }, (_, i) => (
          <div key={i} className="flex items-center gap-2">
            <Skeleton shape="avatar" />
            <div className="flex-1 space-y-1.5">
              <Skeleton shape="line" width={`${70 + ((i * 13) % 26)}%`} />
              <Skeleton shape="line" width={`${40 + ((i * 21) % 30)}%`} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function SkeletonSpotlight() {
  return (
    <div className="pulse-card pulse-card-pad" style={{ borderRadius: "var(--pulse-shape-lg)" }} role="status" aria-busy="true">
      <span className="sr-only">Loading the critical signal</span>
      <div className="flex items-center gap-2">
        <Skeleton shape="pill" width={104} />
        <Skeleton shape="pill" width={72} />
      </div>
      <div className="mt-4 space-y-2.5">
        <Skeleton shape="title" width="86%" height={30} />
        <Skeleton shape="title" width="62%" height={30} />
        <Skeleton shape="line" width="92%" />
      </div>
      <div className="mt-4 flex gap-2">
        <Skeleton shape="block" width={140} height={44} radius="var(--pulse-shape-pill)" />
        <Skeleton shape="block" width={110} height={44} radius="var(--pulse-shape-pill)" />
      </div>
    </div>
  );
}
