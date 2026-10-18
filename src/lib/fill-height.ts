/**
 * The arithmetic behind "a full-height workspace that actually fits".
 *
 * The map's `--nb-fill-h` used to be a hand-maintained sum of every piece of chrome: header 58, gap 12,
 * padding 24, safe areas, bottom nav 70. Every one of those numbers had drifted from the markup — the header
 * renders at 76px + 1px border (not 58), and the page padding is 20px (not 12) — so the map and its pin list
 * hung 27px below the fold and the last row sat under the fixed tab bar.
 *
 * Rather than hunt for the one right constant (which drifts again the next time a border is added), the
 * browser measures the real elements and this pure function does the subtraction. Pure so it can be tested
 * without a DOM; see src/lib/use-fill-height.ts for the measuring side.
 */
export type FillHeightInput = {
  /** The visual viewport height — the part of the window not covered by browser chrome or a keyboard. */
  viewportHeight: number;
  /** Distance from the top of the viewport to the top of `<main>`. */
  mainTop: number;
  /** `<main>`'s own top padding, which is above the workspace. */
  mainPaddingTop: number;
  /** `<main>`'s own bottom padding, which is below the workspace. */
  mainPaddingBottom: number;
  /** The fixed bottom tab bar's height, or 0 on desktop where it is not rendered. */
  navHeight: number;
};

/** What is left for the workspace, never negative and never NaN. */
export function fillHeight({ viewportHeight, mainTop, mainPaddingTop, mainPaddingBottom, navHeight }: FillHeightInput): number {
  const usable = viewportHeight - mainTop - mainPaddingTop - mainPaddingBottom - navHeight;
  if (!Number.isFinite(usable)) return 0;
  return Math.max(0, Math.round(usable));
}
