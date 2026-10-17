/**
 * Four counts a day, with no visitor identifiers: the adoption funnel from first visit to a working alert.
 * Only these names are accepted, so the endpoint cannot be used to store anything else.
 */
export const FUNNEL_STEPS = ["visit_map", "report_started", "report_published", "alert_set_up"] as const;
export type FunnelStep = (typeof FUNNEL_STEPS)[number];

export function isFunnelStep(v: unknown): v is FunnelStep {
  return typeof v === "string" && (FUNNEL_STEPS as readonly string[]).includes(v);
}
