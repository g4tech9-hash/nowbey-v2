import { test } from "node:test";
import assert from "node:assert/strict";
import { aiConfigured, aiDailyLimit, aiKillSwitchOn, estimateCostUsd, isOverDailyLimit } from "../src/lib/ai.ts";

function withEnv(vars, fn) {
  const saved = {};
  for (const [k, v] of Object.entries(vars)) {
    saved[k] = process.env[k];
    if (v === undefined) delete process.env[k];
    else process.env[k] = v;
  }
  try {
    fn();
  } finally {
    for (const [k, v] of Object.entries(saved)) {
      if (v === undefined) delete process.env[k];
      else process.env[k] = v;
    }
  }
}

test("kill switch: AI_ENABLED=false/0/off stops AI even with a key set", () => {
  for (const v of ["false", "0", "off", " FALSE "]) {
    withEnv({ AI_ENABLED: v, GEMINI_API_KEY: "test-key" }, () => {
      assert.equal(aiKillSwitchOn(), true, v);
      assert.equal(aiConfigured(), false, v);
    });
  }
  withEnv({ AI_ENABLED: "true", GEMINI_API_KEY: "test-key" }, () => {
    assert.equal(aiKillSwitchOn(), false);
    assert.equal(aiConfigured(), true);
  });
  withEnv({ AI_ENABLED: undefined, GEMINI_API_KEY: undefined }, () => assert.equal(aiConfigured(), false));
});

test("daily limit defaults to 500 and is clamped to 1..100000", () => {
  withEnv({ AI_DAILY_CALL_LIMIT: undefined }, () => assert.equal(aiDailyLimit(), 500));
  withEnv({ AI_DAILY_CALL_LIMIT: "50" }, () => assert.equal(aiDailyLimit(), 50));
  withEnv({ AI_DAILY_CALL_LIMIT: "0" }, () => assert.equal(aiDailyLimit(), 1));
  withEnv({ AI_DAILY_CALL_LIMIT: "999999" }, () => assert.equal(aiDailyLimit(), 100_000));
  withEnv({ AI_DAILY_CALL_LIMIT: "banana" }, () => assert.equal(aiDailyLimit(), 500));
});

test("over-limit is a hard >= comparison", () => {
  assert.equal(isOverDailyLimit(499, 500), false);
  assert.equal(isOverDailyLimit(500, 500), true);
  assert.equal(isOverDailyLimit(900, 500), true);
});

test("cost estimate uses Flash text pricing (estimate, not a bill)", () => {
  assert.ok(Math.abs(estimateCostUsd(1_000_000, 0) - 0.1) < 1e-9);
  assert.ok(Math.abs(estimateCostUsd(0, 1_000_000) - 0.4) < 1e-9);
  assert.equal(estimateCostUsd(0, 0), 0);
});
