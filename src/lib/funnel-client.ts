import type { FunnelStep } from "./funnel";

/**
 * Fire-and-forget adoption event. Failures are ignored on purpose: a counter must never block a
 * report, a sign-up or a map.
 */
export function trackFunnel(step: FunnelStep): void {
  try {
    void fetch("/api/funnel", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ step }),
      keepalive: true,
    }).catch(() => {});
  } catch {
    /* ignore */
  }
}
