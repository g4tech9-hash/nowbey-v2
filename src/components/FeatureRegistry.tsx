"use client";

import { useMemo, useReducer } from "react";
import { Icon, type IconName } from "./Icon";
import {
  FEATURES,
  FEATURE_CATEGORIES,
  FEATURE_STATUS_LABELS,
  featureCensus,
  type FeatureCategory,
  type FeatureStatus,
} from "../content/featureRegistry";
import {
  countByCategory,
  filterFeatures,
  initialLandingState,
  landingReducer,
} from "../lib/landing-state";

/** The glyph that stands for each category. */
const CATEGORY_ICONS: Record<FeatureCategory, IconName> = {
  map: "map-pin",
  alerts: "bell",
  wire: "newspaper",
  community: "users",
  ai: "sparkles",
  trust: "shield-check",
  commerce: "credit-card",
  platform: "terminal",
};

/** How each status is coloured. Live is green, beta is amber, the rest are quiet. */
const STATUS_CLASSES: Record<FeatureStatus, string> = {
  live: "border-safe-400/30 bg-safe-400/10 text-safe-400",
  beta: "border-amber-400/30 bg-amber-400/10 text-amber-400",
  planned: "border-mist-700 bg-mist-900/80 text-mist-400",
  internal: "border-mist-800 bg-mist-900/60 text-mist-500",
};

/**
 * The feature registry.
 *
 * Every card on this page is read from `src/content/featureRegistry.ts` at render time -
 * there is no second list to keep in step. The same file feeds `docs/FEATURES.md`, so the
 * page, the documentation and the code cannot drift apart.
 *
 * The filter and the search box are the only state; both live in the shared landing
 * reducer, and the counts next to each category are computed from the same array the
 * cards are rendered from.
 */
export function FeatureRegistry() {
  const [state, dispatch] = useReducer(landingReducer, initialLandingState);

  const census = useMemo(() => featureCensus(), []);
  const counts = useMemo(() => countByCategory(FEATURES), []);
  const visible = useMemo(
    () => filterFeatures(FEATURES, state.filter),
    [state.filter],
  );

  return (
    <section id="features" className="relative scroll-mt-24 py-20 sm:py-24">
      <div className="shell">
        <div className="max-w-2xl">
          <p className="font-mono text-[0.65rem] uppercase tracking-wider text-brand-300">Feature registry</p>
          <h2 className="mt-3 font-display text-3xl text-mist-50 sm:text-4xl">Everything in the app, and the file that does it</h2>
          <p className="mt-4 text-base leading-relaxed text-mist-300">
            No marketing adjectives. Each card names a capability, says how real it is, and points at the
            module in <span className="font-mono text-mist-200">src/lib</span> that implements it - the same
            list that generates <span className="font-mono text-mist-200">docs/FEATURES.md</span> on every
            build.
          </p>
        </div>

        <div className="mt-10 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => dispatch({ type: "set-category", category: "all" })}
              aria-pressed={state.filter.category === "all"}
              className={`focus-ring rounded-full border px-3.5 py-1.5 font-mono text-[0.65rem] uppercase tracking-wider transition-colors ${
                state.filter.category === "all"
                  ? "border-brand-400/40 bg-brand-400/10 text-brand-200"
                  : "border-mist-800 bg-mist-900/40 text-mist-400 hover:border-mist-700 hover:text-mist-200"
              }`}
            >
              All <span className="ml-1 text-mist-500">{counts.all}</span>
            </button>
            {FEATURE_CATEGORIES.map((category) => (
              <button
                key={category.key}
                type="button"
                onClick={() => dispatch({ type: "set-category", category: category.key })}
                aria-pressed={state.filter.category === category.key}
                className={`focus-ring rounded-full border px-3.5 py-1.5 font-mono text-[0.65rem] uppercase tracking-wider transition-colors ${
                  state.filter.category === category.key
                    ? "border-brand-400/40 bg-brand-400/10 text-brand-200"
                    : "border-mist-800 bg-mist-900/40 text-mist-400 hover:border-mist-700 hover:text-mist-200"
                }`}
              >
                {category.label} <span className="ml-1 text-mist-500">{counts[category.key] ?? 0}</span>
              </button>
            ))}
          </div>

          <div className="relative w-full lg:w-72">
            <Icon
              name="search"
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-mist-500"
            />
            <input
              type="search"
              value={state.filter.query}
              onChange={(event) => dispatch({ type: "set-query", query: event.target.value })}
              placeholder="Search features"
              aria-label="Search features"
              className="focus-ring w-full rounded-xl border border-mist-800 bg-ink-900/70 py-2.5 pl-9 pr-3 text-sm text-mist-100 placeholder:text-mist-500"
            />
          </div>
        </div>

        <p className="mt-4 font-mono text-[0.65rem] uppercase tracking-wider text-mist-500">
          {visible.length} of {census.total} features - {census.live} live, {census.beta} beta,{" "}
          {census.planned} planned
        </p>

        {visible.length > 0 ? (
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {visible.map((feature) => (
              <article
                key={feature.id}
                className="flex flex-col rounded-2xl border border-mist-800 bg-mist-900/40 p-5 transition-colors hover:border-mist-700"
              >
                <div className="flex items-start justify-between gap-3">
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-mist-900 text-brand-300 ring-1 ring-mist-800">
                    <Icon name={CATEGORY_ICONS[feature.category]} className="h-4.5 w-4.5" />
                  </span>
                  <span
                    className={`rounded-full border px-2.5 py-1 font-mono text-[0.65rem] uppercase tracking-wider ${
                      STATUS_CLASSES[feature.status]
                    }`}
                  >
                    {FEATURE_STATUS_LABELS[feature.status]}
                  </span>
                </div>

                <h3 className="mt-4 font-display text-lg leading-snug text-mist-50">{feature.name}</h3>
                <p className="mt-2 text-sm leading-relaxed text-mist-400">{feature.summary}</p>

                <ul className="mt-4 grid gap-2">
                  {feature.capabilities.map((capability) => (
                    <li key={capability} className="flex gap-2 text-xs leading-relaxed text-mist-400">
                      <Icon name="check" className="mt-0.5 h-3.5 w-3.5 shrink-0 text-brand-300" strokeWidth={2} />
                      <span>{capability}</span>
                    </li>
                  ))}
                </ul>

                <div className="mt-5 flex items-end justify-between gap-3 border-t border-mist-800 pt-4">
                  {feature.metric ? (
                    <div>
                      <p className="font-mono text-[0.65rem] uppercase tracking-wider text-mist-500">
                        {feature.metric.label}
                      </p>
                      <p className="font-display text-xl text-mist-50">{feature.metric.value}</p>
                    </div>
                  ) : (
                    <span />
                  )}
                  <p className="truncate font-mono text-[0.65rem] text-mist-500" title={feature.source}>
                    {feature.source}
                  </p>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="mt-8 rounded-2xl border border-mist-800 bg-mist-900/40 px-6 py-12 text-center">
            <Icon name="search" className="mx-auto h-6 w-6 text-mist-500" />
            <p className="mt-3 text-sm text-mist-300">No feature matches that search.</p>
            <button
              type="button"
              onClick={() => dispatch({ type: "reset" })}
              className="focus-ring mt-4 rounded-xl border border-mist-800 px-4 py-2 text-sm text-mist-200 hover:border-mist-700"
            >
              Clear the filters
            </button>
          </div>
        )}
      </div>
    </section>
  );
}

export default FeatureRegistry;
