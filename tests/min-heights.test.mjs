/**
 * H2: the mobile audit must see sizes declared in CSS, not only inline `min-h-[…]` utilities.
 *
 * The gate reported "0 findings" while `.nb-chip` rendered at 32px on every phone: the audit only read the
 * class attribute and the style attribute, and these components set their height in globals.css. A green gate
 * that cannot see the fault is worse than no gate, because it is believed.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { classMinHeights } from "../scripts/lib/min-heights.mjs";

const css = `
  @layer components {
    .nb-chip { display:inline-flex; min-height: 32px; }
    .nb-btn { min-height: 42px; }
  }
  @media (max-width: 1023.98px) {
    .nb-chip { min-height: 44px; }
    .nb-btn { min-height: 46px; }
  }
  @media (min-width: 1024px) {
    .nb-btn-sm { min-height: 58px; }
  }
  @keyframes nb-x { from { min-height: 1px } to { min-height: 2px } }
`;

test("it reads rules nested inside @layer", () => {
  const map = classMinHeights(`@layer components { .nb-chip { min-height: 32px } }`);
  assert.equal(map.get("nb-chip"), 32);
});

test("a phone-scoped override wins, because that is the size the phone actually renders", () => {
  const map = classMinHeights(css);
  assert.equal(map.get("nb-chip"), 44);
  assert.equal(map.get("nb-btn"), 46);
});

test("a desktop-only rule does not excuse a small phone control", () => {
  const map = classMinHeights(css);
  assert.equal(map.get("nb-btn-sm"), undefined, "min-width:1024px never applies at 320–412px");
});

test("keyframes are not selectors", () => {
  const map = classMinHeights(css);
  assert.equal(map.get("nb-x"), undefined);
});

test("it still resolves a component that only has a base rule", () => {
  const map = classMinHeights(`.nb-tag { min-height: 24px }`);
  assert.equal(map.get("nb-tag"), 24);
});
