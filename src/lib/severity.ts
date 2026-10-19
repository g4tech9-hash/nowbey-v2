/**
 * ONE SEVERITY SCALE — 4 levels, everywhere.
 * Replaces the scattered Annoying/Blocking/etc, High+dots, sev-1..5 confusion.
 */

export type SeverityLevel = 1 | 2 | 3 | 4;

export type SeverityDef = {
  level: SeverityLevel;
  label: string;
  shortLabel: string;
  description: string;
  token: string; // CSS var for colour
  icon: string;
};

export const SEVERITY: Record<SeverityLevel, SeverityDef> = {
  1: {
    level: 1,
    label: "Minor",
    shortLabel: "Minor",
    description: "Annoying but passable",
    token: "var(--sev-1)",
    icon: "minus",
  },
  2: {
    level: 2,
    label: "Lane blocked",
    shortLabel: "Lane",
    description: "Blocking a lane or sidewalk",
    token: "var(--sev-2)",
    icon: "minus",
  },
  3: {
    level: 3,
    label: "Road blocked",
    shortLabel: "Road",
    description: "Blocking a road or service",
    token: "var(--sev-3)",
    icon: "alert-triangle",
  },
  4: {
    level: 4,
    label: "Dangerous",
    shortLabel: "Danger",
    description: "Dangerous to people",
    token: "var(--sev-4)",
    icon: "flame",
  },
};

export const SEVERITY_LABELS: string[] = [SEVERITY[1].label, SEVERITY[2].label, SEVERITY[3].label, SEVERITY[4].label];

export function severityFor(level: unknown): SeverityDef | null {
  const n = typeof level === "string" ? parseInt(level, 10) : typeof level === "number" ? level : 0;
  if (n >= 1 && n <= 4) return SEVERITY[n as SeverityLevel];
  return null;
}

export function severityLabel(level: unknown): string {
  return severityFor(level)?.label ?? "Not rated";
}

export function normalizeSeverity(level: unknown): SeverityLevel | null {
  const n = typeof level === "string" ? parseInt(level, 10) : typeof level === "number" ? level : NaN;
  if (n >= 1 && n <= 4) return n as SeverityLevel;
  return null;
}
