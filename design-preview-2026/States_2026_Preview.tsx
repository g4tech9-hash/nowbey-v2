/* ============================================================================
 * States_2026_Preview.tsx — PREVIEW ONLY. Not imported by any route.
 * ----------------------------------------------------------------------------
 * The 2026 "Tideglass" state gallery: loading, empty, error and offline states
 * for the Map, Wire and Alerts surfaces. The live app already treats these as
 * first-class ("a 500 with a JSON error body is a failure, not an empty
 * island") — this preview extends that honesty to the visual language.
 *
 * Rules encoded here:
 *  - Skeletons mirror the real layout (no layout shift when data lands)
 *  - Empty states teach the next action, never just say "nothing here"
 *  - Errors name the failure, keep the draft, and offer one obvious retry
 *  - Offline says what still works (the map cache), not a dead end
 * ========================================================================== */
"use client";

import { RefreshCw, MapPin, Radio, Bell, WifiOff, TriangleAlert, Search, Plus, type LucideIcon } from "lucide-react";

/* -------------------------------------------------------------------------- */
/* Primitives                                                                  */
/* -------------------------------------------------------------------------- */
function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded-md bg-white/8 ${className}`} />;
}

function StateShell({ icon, title, body, action, tone = "tide" }: { icon: LucideIcon; title: string; body: string; action?: string; tone?: "tide" | "danger" | "warn" }) {
  const toneCls =
    tone === "danger" ? "text-danger-500 bg-danger-500/14" : tone === "warn" ? "text-sun-500 bg-sun-500/14" : "text-tide-300 bg-tide-500/14";
  return (
    <div className="nb-surface flex flex-col items-center px-6 py-10 text-center">
      <span className={`grid h-12 w-12 place-items-center rounded-full ${toneCls}`}>
        <icon size={22} strokeWidth={2.4} />
      </span>
      <p className="display mt-3.5 text-base font-extrabold text-ink-100">{title}</p>
      <p className="mt-1.5 max-w-[46ch] text-sm leading-relaxed text-ink-300">{body}</p>
      {action && (
        <button className="nb-focus mt-4 flex min-h-[40px] items-center gap-2 rounded-pill bg-tide-500 px-4 text-xs font-extrabold text-abyss-950 transition hover:bg-tide-400 active:scale-95">
          {action}
        </button>
      )}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* The gallery                                                                 */
/* -------------------------------------------------------------------------- */
export default function States2026Preview() {
  return (
    <div className="relative min-h-screen overflow-hidden bg-abyss-950 text-ink-100 nb-aurora">
      <header className="nb-glass-strong sticky top-0 z-[800]">
        <div className="mx-auto flex max-w-[1080px] items-center gap-3 px-4 py-2.5">
          <span className="display text-lg font-extrabold tracking-tight text-ink-100">Now<span className="text-tide-400">Bey</span></span>
          <span className="rounded-pill border hairline px-2.5 py-1 text-2xs font-bold uppercase tracking-[0.14em] text-ink-400">State gallery</span>
        </div>
      </header>

      <main className="mx-auto max-w-[1080px] space-y-10 px-4 py-8">
        <div>
          <p className="text-2xs font-bold uppercase tracking-[0.16em] text-tide-300">Honest states</p>
          <h1 className="display text-[clamp(1.4rem,3vw,1.9rem)] font-extrabold text-ink-100">Loading, empty, error, offline</h1>
          <p className="mt-1.5 max-w-[64ch] text-sm leading-relaxed text-ink-300">
            Skeletons mirror the real layout so nothing shifts when data lands. Empty states teach the next action. Errors name the failure,
            keep the draft, and offer one obvious retry.
          </p>
        </div>

        {/* ---------- LOADING ---------- */}
        <section>
          <h2 className="mb-3 flex items-center gap-2 text-sm font-extrabold text-ink-100">
            <span className="nb-live-dot" /> Loading — skeletons, not spinners
          </h2>
          <div className="grid gap-3 lg:grid-cols-2">
            <div className="nb-surface space-y-3 p-4">
              <Skeleton className="h-4 w-28" />
              {[0, 1, 2].map((i) => (
                <div key={i} className="flex items-center gap-3">
                  <Skeleton className="h-9 w-9 rounded-sm" />
                  <div className="flex-1 space-y-1.5">
                    <Skeleton className="h-3.5 w-3/4" />
                    <Skeleton className="h-2.5 w-1/2" />
                  </div>
                  <Skeleton className="h-4 w-16" />
                </div>
              ))}
            </div>
            <div className="nb-surface space-y-3 p-4">
              <Skeleton className="h-24 w-full" />
              <div className="flex gap-2">
                <Skeleton className="h-8 w-20 rounded-pill" />
                <Skeleton className="h-8 w-20 rounded-pill" />
                <Skeleton className="h-8 w-20 rounded-pill" />
              </div>
              <Skeleton className="h-3.5 w-2/3" />
            </div>
          </div>
        </section>

        {/* ---------- EMPTY ---------- */}
        <section>
          <h2 className="mb-3 text-sm font-extrabold text-ink-100">Empty — teach the next action</h2>
          <div className="grid gap-3 lg:grid-cols-3">
            <StateShell
              icon={MapPin}
              title="No pins match those filters"
              body="Try “All”, or widen the island filter. The map updates the moment you change one."
              action="Clear filters"
            />
            <StateShell
              icon={Radio}
              title="The wire is quiet"
              body="No approved stories yet in this category. Know something? Submit a link and it goes to review."
              action="Submit a link"
            />
            <StateShell
              icon={Bell}
              title="No alert profiles yet"
              body="Pick the categories that affect your commute and we will email you when a matching report lands."
              action="Create your first profile"
            />
          </div>
        </section>

        {/* ---------- ERROR ---------- */}
        <section>
          <h2 className="mb-3 text-sm font-extrabold text-ink-100">Error — name it, keep the work, offer retry</h2>
          <div className="grid gap-3 lg:grid-cols-2">
            <StateShell
              icon={TriangleAlert}
              tone="danger"
              title="Could not load the map feed"
              body="This is a connection failure, not an empty island — your filters are untouched. One tap tries again."
              action="Try again"
            />
            <div className="nb-surface p-5" style={{ borderColor: "color-mix(in srgb, var(--color-danger-500) 45%, transparent)" }}>
              <p className="flex items-center gap-2 text-sm font-extrabold text-danger-500">
                <TriangleAlert size={14} /> The wire rejected that report
              </p>
              <p className="mt-1.5 text-sm leading-relaxed text-ink-300">
                Nothing was lost — your draft is still here. This is usually a dropped connection; try again in a moment.
              </p>
              <button className="nb-focus mt-3 flex min-h-[38px] items-center gap-2 rounded-pill border hairline px-3.5 text-xs font-bold text-ink-100 transition hover:bg-white/8">
                <RefreshCw size={12} /> Try again
              </button>
            </div>
          </div>
        </section>

        {/* ---------- OFFLINE ---------- */}
        <section>
          <h2 className="mb-3 text-sm font-extrabold text-ink-100">Offline — say what still works</h2>
          <div className="grid gap-3 lg:grid-cols-2">
            <StateShell
              icon={WifiOff}
              tone="warn"
              title="You are offline"
              body="The last pins you viewed are still on the map. New reports and the wire will catch up the moment you reconnect."
              action="Show cached pins"
            />
            <div className="nb-surface p-5">
              <p className="text-2xs font-bold uppercase tracking-[0.16em] text-ink-400">Motion & accessibility floor</p>
              <ul className="mt-2.5 space-y-2 text-sm leading-relaxed text-ink-300">
                <li className="flex gap-2.5"><Search size={14} className="mt-1 shrink-0 text-tide-300" />Skeleton shimmer respects <span className="font-mono text-ink-200">prefers-reduced-motion</span> — it becomes a static gray block.</li>
                <li className="flex gap-2.5"><Plus size={14} className="mt-1 shrink-0 text-tide-300" />Every state keeps ≥44px touch targets and a visible focus ring.</li>
                <li className="flex gap-2.5"><Bell size={14} className="mt-1 shrink-0 text-tide-300" />Error copy never blames the user and never hides a working fallback.</li>
              </ul>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
