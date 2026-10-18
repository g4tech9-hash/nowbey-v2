/**
 * H1: the map workspace must fit the space that actually exists.
 *
 * The bug was arithmetic against constants that had drifted: the CSS believed the header was 58px when it
 * rendered at 76+1, and subtracted 12px of padding where the class said 20px. The result was 27px of a
 * full-height workspace hanging below the fold, with the last pin row under the fixed tab bar.
 *
 * These tests pin the arithmetic, not the pixels: the browser supplies the measurements, so if a component
 * grows a border or the nav gains a safe-area inset, the answer changes with it.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { fillHeight } from "../src/lib/fill-height.ts";

const base = { viewportHeight: 812, mainTop: 77, mainPaddingTop: 20, mainPaddingBottom: 24, navHeight: 70 };

test("iPhone X with the real chrome: 812 − 77 − 20 − 24 − 70 = 621", () => {
  assert.equal(fillHeight(base), 621);
});

test("the old constants were exactly 27px too tall — the regression this change exists to stop", () => {
  const correct = fillHeight(base);
  // 58 header + 12 padding is what the stylesheet used to subtract (with nav and 24 bottom padding):
  const oldSum = 58 + 12 + 24 + 70;
  assert.equal(base.viewportHeight - oldSum - correct, 27);
});

test("a taller header shrinks the workspace by the same amount", () => {
  assert.equal(fillHeight({ ...base, mainTop: 89 }), 609);
});

test("desktop has no bottom nav", () => {
  assert.equal(fillHeight({ ...base, mainTop: 77, mainPaddingTop: 28, mainPaddingBottom: 48, navHeight: 0 }), 659);
});

test("a short landscape window never yields a negative height", () => {
  assert.equal(fillHeight({ ...base, viewportHeight: 320, mainTop: 260 }), 0);
});

test("junk measurements do not produce NaN or Infinity", () => {
  assert.equal(fillHeight({ ...base, viewportHeight: Number.NaN }), 0);
  assert.equal(fillHeight({ ...base, navHeight: Number.POSITIVE_INFINITY }), 0);
});
