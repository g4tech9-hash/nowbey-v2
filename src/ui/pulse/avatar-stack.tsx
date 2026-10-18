/**
 * AvatarStack — the neighbours behind a report, without shipping photos.
 *
 * Identities are generated from a seed (the reporter's handle, usually) so the
 * same person looks the same on every card across the app, and nothing about
 * them leaves the device. Colours come from the Layer 2 category hues through
 * `color-mix`, which is why there is no palette in this file: the avatars are
 * already themed.
 */
const HUES = [
  "var(--cat-marine)",
  "var(--cat-flooding)",
  "var(--cat-power)",
  "var(--cat-safety)",
  "var(--cat-health)",
  "var(--cat-sanitation)",
  "var(--cat-road)",
  "var(--cat-water)",
] as const;

/** Deterministic 32-bit string hash — stable across reloads and devices. */
export function seedHash(seed: string): number {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h);
}

export function initialsOf(seed: string): string {
  const clean = seed.replace(/^@/, "").replace(/[^a-z0-9]/gi, " ").trim();
  if (!clean) return "NB";
  const parts = clean.split(/\s+/);
  if (parts.length > 1) return (parts[0][0] + parts[1][0]).toUpperCase();
  return clean.slice(0, 2).toUpperCase();
}

export function AvatarStack({
  seed,
  count = 1,
  max = 4,
  size = 26,
  label = "Neighbours",
}: {
  seed: string | null | undefined;
  /** How many people this stack stands for, including the ones not drawn. */
  count?: number;
  max?: number;
  size?: number;
  label?: string;
}) {
  const base = seedHash(seed ?? "nowbey");
  const shown = Math.max(1, Math.min(count, max));
  const extra = Math.max(0, count - shown);

  return (
    <span className="pulse-avatars" role="img" aria-label={`${label}: ${count} ${count === 1 ? "neighbour" : "neighbours"}`}>
      {Array.from({ length: shown }, (_, i) => {
        const hue = HUES[(base + i * 3) % HUES.length];
        return (
          <span
            key={i}
            className="pulse-avatar"
            style={{
              width: size,
              height: size,
              fontSize: Math.round(size * 0.42),
              background: `color-mix(in srgb, ${hue} 62%, var(--bg-active))`,
            }}
            aria-hidden
          >
            {initialsOf(`${seed ?? "nb"}-${i}`)}
          </span>
        );
      })}
      {extra > 0 ? (
        <span className="pulse-avatar" data-tone="muted" style={{ width: size, height: size, fontSize: Math.round(size * 0.4) }} aria-hidden>
          +{extra}
        </span>
      ) : null}
    </span>
  );
}

/** One avatar plus a handle — the "reported by" row on a card. */
export function Attribution({
  handle,
  anonymous,
  badge,
  size = 24,
  prefix = "reported by",
}: {
  handle?: string | null;
  anonymous?: boolean;
  badge?: React.ReactNode;
  size?: number;
  prefix?: string;
}) {
  const seed = anonymous || !handle ? "anon" : handle;
  return (
    <span className="inline-flex flex-wrap items-center gap-2 text-[12px] text-tertiary">
      <AvatarStack seed={seed} count={1} size={size} label={anonymous ? "Anonymous neighbour" : `@${handle}`} />
      <span>
        {prefix}{" "}
        <span className="font-semibold text-secondary">{anonymous || !handle ? "someone" : `@${handle}`}</span>
      </span>
      {badge}
    </span>
  );
}
