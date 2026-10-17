/**
 * The adoption funnel accepts only four named steps, so the endpoint cannot be used to store anything else.
 * Hermetic: pure functions.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { FUNNEL_STEPS, isFunnelStep } from "../src/lib/funnel.ts";

test("the funnel has the four steps from first visit to a working alert", () => {
  assert.deepEqual([...FUNNEL_STEPS], ["visit_map", "report_started", "report_published", "alert_set_up"]);
});

test("only known steps are accepted", () => {
  for (const s of FUNNEL_STEPS) assert.equal(isFunnelStep(s), true, s);
  for (const bad of ["", "visit", "__proto__", "constructor", "toString", null, undefined, 3, { step: "visit_map" }]) {
    assert.equal(isFunnelStep(bad), false, JSON.stringify(bad));
  }
});
