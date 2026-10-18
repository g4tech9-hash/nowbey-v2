import { Ban, Flame, Info, TrafficCone, type LucideIcon } from "lucide-react";
import { SEVERITY_LEVELS, severityLabel, severityOrUnrated, severityToken } from "@/lib/severity";
import type { CategoryKey } from "@/lib/geo";
import { pulseCategoryMeta } from "./glyph";

/**
 * SeverityTag — the one scale, said in words.
 *
 * Before this file the tag said "Critical" or "High" and stayed silent for
 * anything below, so most cards carried no severity at all and a reader could
 * not tell a quiet report from an unrated one. Now the badge always says the
 * level in the words the report form used — Minor, Lane blocked, Road blocked,
 * Dangerous — and a report that was never rated says "Not rated" rather than
 * being drawn as a quiet one.
 *
 * The word, an icon AND a colour: never colour alone.
 */
const ICONS: LucideIcon[] = [Info, TrafficCone, Ban, Flame];

/** The token that paints a level, with the level's own hue rather than the category's. */
function tokenFor(level: number): string {
  return severityToken(level);
}

export function SeverityTag({
  severity,
  category,
  showMeter = true,
}: {
  severity: number | null | undefined;
  category?: string;
  showMeter?: boolean;
}) {
  const { level, rated } = severityOrUnrated(severity);

  if (!rated) {
    return (
      <span className="pulse-sev" data-unrated="true" aria-label="Severity not rated">
        <Info size={12} strokeWidth={2.4} aria-hidden />
        <span>Not rated</span>
      </span>
    );
  }

  const Icon = ICONS[level - 1] ?? Info;
  const color = tokenFor(level);

  return (
    <span
      className="pulse-sev"
      style={{ ["--sev-color" as string]: color } as React.CSSProperties}
      aria-label={`Severity: ${severityLabel(level)}`}
    >
      <Icon size={12} strokeWidth={2.4} aria-hidden />
      <span>{severityLabel(level)}</span>
      {showMeter ? <SeverityMeter severity={level} category={category} /> : null}
    </span>
  );
}

/** Four bars, filled to the level. The word beside it carries the meaning. */
export function SeverityMeter({ severity, category }: { severity: number; category?: CategoryKey | string }) {
  const { level } = severityOrUnrated(severity);
  const meta = category ? pulseCategoryMeta(category) : null;
  // The level's own colour wins; the category hue is only a fallback so a bare
  // meter still belongs to the card it sits in.
  const color = severityToken(level);
  return (
    <span
      className="pulse-sev-meter"
      style={{ ["--sev-color" as string]: color } as React.CSSProperties}
      role="img"
      aria-label={`Severity ${level} of 4: ${severityLabel(level)}`}
    >
      {[1, 2, 3, 4].map((i) => (
        <i key={i} data-on={i <= level ? "true" : undefined} style={{ height: 5 + i * 2 }} />
      ))}
    </span>
  );
}

/** The four levels, for a legend or the report form. */
export const SEVERITY_CHOICES = SEVERITY_LEVELS;
