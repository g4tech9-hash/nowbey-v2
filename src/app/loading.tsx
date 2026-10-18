/**
 * The page-level fallback while a route's server data is on its way.
 *
 * There was no loading.tsx anywhere in the app, so a slow query looked like a dead tap: the old page stayed
 * on screen, the tab did not change, and nothing said "working". On a 3G connection in a storm that is
 * indistinguishable from the app being broken — and the natural response is to tap again.
 *
 * The skeleton matches the shape of a real page (eyebrow, heading, two panels) so the layout does not jump
 * when the content lands. It is `aria-busy` with a single polite status message, not a screenful of elements
 * for a screen reader to read out.
 */
export default function Loading() {
  return (
    <div className="mx-auto w-full max-w-[1160px]" aria-busy="true" aria-live="polite">
      <span className="sr-only">Loading this page…</span>
      <div className="h-3 w-24 animate-pulse rounded-full bg-white/10" aria-hidden />
      <div className="mt-3 h-8 w-2/3 animate-pulse rounded-xl bg-white/10" aria-hidden />
      <div className="mt-6 grid gap-3 sm:grid-cols-2" aria-hidden>
        <div className="nb-surface h-32 animate-pulse rounded-[20px]" />
        <div className="nb-surface h-32 animate-pulse rounded-[20px]" />
        <div className="nb-surface h-24 animate-pulse rounded-[20px] sm:col-span-2" />
      </div>
      <noscript>
        <p className="mt-6 text-[13px] text-ink-300">This page needs JavaScript to finish loading. The map and the report form both work without an account.</p>
      </noscript>
    </div>
  );
}
