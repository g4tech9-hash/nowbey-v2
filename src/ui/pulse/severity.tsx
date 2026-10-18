import { Flame } from "lucide-react";
import type { CategoryKey } from "@/lib/geo";
import { pulseCategoryMeta } from "./glyph";

/**
 * SeverityTag — Critical / High / nothing.
 *
 * Returning null for anything under "High" is the point: a feed where every
 * card shouts is a feed where nothing is urgent. Critical gets the flame and
 * the glow; High gets the meter only.
 */
export function SeverityTag({
  severity,
  category,
  showMeter = true,
}: {
  severity: number;
  category?: string;
  showMeter?: boolean;
}) {
  if (severity < 3) return null;
  const critical = severity >= 4;
  const color = critical ? "var(--danger)" : "var(--sev-3)";

  return (
    <span
      className="pulse-sev"
      style={{ ["--sev-color" as string]: color } as React.CSSProperties}
      aria-label={critical ? "Critical severity" : "High severity"}
    >
      {critical ? <Flame size={12} strokeWidth={2.4} aria-hidden /> : null}
      <span>{critical ? "Critical" : "High"}</span>
      {showMeter ? <SeverityMeter severity={severity} category={category} /> : null}
    </span>
  );
}

/** Four bars, filled to the level. Colours follow the category, not the theme. */
export function SeverityMeter({ severity, category }: { severity: number; category?: CategoryKey | string }) {
  const meta = category ? pulseCategoryMeta(category) : null;
  const color = severity >= 4 ? "var(--danger)" : meta?.token ?? "var(--sev-3)";
  return (
    <span
      className="pulse-sev-meter"
      style={{ ["--sev-color" as string]: color } as React.CSSProperties}
      role="img"
      aria-label={`Severity ${Math.max(1, Math.min(4, severity))} of 4`}
    >
      {[1, 2, 3, 4].map((i) => (
        <i key={i} data-on={i <= severity ? "true" : undefined} style={{ height: 5 + i * 2 }} />
      ))}
    </span>
  );
}
