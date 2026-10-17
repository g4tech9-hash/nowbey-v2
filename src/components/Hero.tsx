import { Icon, type IconName } from "./Icon";
import { SITE } from "../content/site";
import { seedFeed, seedMetrics } from "../lib/landing-seed";
import {
  CATEGORY_LABELS,
  formatCount,
  summariseFeed,
  timeAgoLabel,
  type FeedCategory,
  type SignalLevel,
} from "../lib/landing-model";

/** The glyph that stands for each hazard category. */
const CATEGORY_ICONS: Record<FeedCategory, IconName> = {
  flood: "waves",
  storm: "cloud-lightning",
  power: "bolt",
  water: "droplet",
  crime: "shield-check",
  road: "car",
  marine: "anchor",
  fire: "flame",
  health: "heart",
  trash: "trash",
  event: "star",
  notice: "info",
  accident: "car",
};

/** The colour a signal level is drawn in. */
const LEVEL_CLASSES: Record<SignalLevel, string> = {
  calm: "text-safe-400",
  watch: "text-brand-300",
  urgent: "text-amber-400",
  critical: "text-alert-500",
};

/**
 * The hero: what NowBey is, in one sentence and one screen, with a panel showing the
 * shape of the live feed next to it.
 *
 * The panel is seeded, not live, and it says so. A marketing page that shows invented
 * numbers as if they were real is the fastest way to lose the trust the product is
 * trying to earn.
 */
export function Hero() {
  const metrics = seedMetrics();
  const feed = seedFeed();

  return (
    <section id="top" className="relative overflow-hidden pt-14 pb-20 sm:pt-20">
      <div className="grid-veil pointer-events-none absolute inset-0 -z-10" aria-hidden="true" />
      <div
        className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[38rem]"
        style={{
          background:
            "radial-gradient(52rem 34rem at 76% -12%, color-mix(in srgb, var(--color-brand-400) 15%, transparent), transparent 62%), radial-gradient(38rem 26rem at 4% 0%, color-mix(in srgb, var(--color-alert-500) 8%, transparent), transparent 58%)",
        }}
        aria-hidden="true"
      />

      <div className="shell">
        <div className="grid items-start gap-12 lg:grid-cols-[1.05fr_0.95fr] lg:gap-16">
          {/* ---- The pitch ---------------------------------------------------- */}
          <div>
            <p className="inline-flex items-center gap-2 rounded-full border border-mist-800 bg-mist-900/60 px-3 py-1.5 font-mono text-[0.65rem] uppercase tracking-wider text-mist-300">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-safe-400 opacity-70" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-safe-400" />
              </span>
              {SITE.hero.eyebrow}
            </p>

            <h1 className="mt-6 font-display text-4xl leading-[1.05] text-mist-50 sm:text-5xl lg:text-6xl">
              {SITE.hero.title}
            </h1>

            <p className="mt-6 max-w-xl text-base leading-relaxed text-mist-300 sm:text-lg">
              {SITE.hero.lead}
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-3">
              <a
                href={SITE.hero.primary.href}
                className="focus-ring inline-flex items-center gap-2 rounded-xl bg-brand-500 px-5 py-3 text-sm font-semibold text-ink-950 transition-colors hover:bg-brand-400"
              >
                <Icon name="map-pin" className="h-4 w-4" />
                {SITE.hero.primary.label}
              </a>
              <a
                href={SITE.hero.secondary.href}
                className="focus-ring inline-flex items-center gap-2 rounded-xl border border-mist-800 bg-mist-900/50 px-5 py-3 text-sm font-semibold text-mist-100 transition-colors hover:border-mist-700 hover:bg-mist-900"
              >
                <Icon name="newspaper" className="h-4 w-4" />
                {SITE.hero.secondary.label}
              </a>
            </div>

            <ul className="mt-8 grid gap-2.5">
              {SITE.hero.notes.map((note) => (
                <li key={note} className="flex items-start gap-2.5 text-sm text-mist-400">
                  <Icon name="check" className="mt-0.5 h-4 w-4 shrink-0 text-safe-400" strokeWidth={2} />
                  <span>{note}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* ---- The panel ---------------------------------------------------- */}
          <div className="rounded-2xl border border-mist-800 bg-mist-900/40 p-2 shadow-lift">
            <div className="overflow-hidden rounded-2xl border border-mist-800 bg-ink-950">
              <div className="flex items-center justify-between gap-3 border-b border-mist-800 px-4 py-3">
                <div>
                  <p className="font-display text-sm text-mist-50">{SITE.hero.panel.title}</p>
                  <p className="mt-0.5 font-mono text-[0.65rem] uppercase tracking-wider text-mist-500">
                    {summariseFeed(feed)}
                  </p>
                </div>
                <span className="rounded-full border border-brand-400/30 bg-brand-400/10 px-2.5 py-1 font-mono text-[0.65rem] uppercase tracking-wider text-brand-300">
                  Demo
                </span>
              </div>

              <ul className="divide-y divide-mist-800/70">
                {feed.slice(0, 6).map((item) => (
                  <li key={item.id} className="flex items-start gap-3 px-4 py-3">
                    <span
                      className={`mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-mist-900 ${LEVEL_CLASSES[item.level]}`}
                    >
                      <Icon name={CATEGORY_ICONS[item.category]} className="h-4 w-4" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm text-mist-100">{item.title}</p>
                      <p className="mt-1 flex flex-wrap items-center gap-x-2 font-mono text-[0.65rem] uppercase tracking-wider text-mist-500">
                        <span>{CATEGORY_LABELS[item.category]}</span>
                        <span aria-hidden="true">/</span>
                        <span>{item.area}</span>
                        <span aria-hidden="true">/</span>
                        <span>{timeAgoLabel(item.minutesAgo)}</span>
                      </p>
                    </div>
                    <span className="shrink-0 rounded-md bg-mist-900 px-2 py-1 font-mono text-[0.65rem] tracking-wider text-mist-400">
                      {item.confirmations}
                    </span>
                  </li>
                ))}
              </ul>

              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-mist-800 px-4 py-3">
                <p className="max-w-[16rem] font-mono text-[0.65rem] uppercase tracking-wider text-mist-500">
                  {SITE.hero.panel.note}
                </p>
                <a
                  href="/map"
                  className="focus-ring inline-flex items-center gap-1.5 text-sm font-medium text-brand-300 hover:text-brand-200"
                >
                  Open the map
                  <Icon name="arrow-right" className="h-4 w-4" />
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* ---- The numbers --------------------------------------------------- */}
        <dl className="mt-16 grid gap-px overflow-hidden rounded-2xl border border-mist-800 bg-mist-800 sm:grid-cols-2 lg:grid-cols-4">
          {SITE.stats.map((stat) => (
            <div key={stat.id} className="bg-ink-900/80 px-5 py-5">
              <dt className="font-mono text-[0.65rem] uppercase tracking-wider text-mist-500">
                {stat.label}
              </dt>
              <dd className="mt-2 font-display text-3xl text-mist-50">{formatCount(metrics[stat.metric])}</dd>
              <p className="mt-1.5 text-xs leading-relaxed text-mist-400">{stat.note}</p>
            </div>
          ))}
        </dl>
        <p className="mt-3 font-mono text-[0.65rem] uppercase tracking-wider text-mist-500">
          Representative figures from a seeded demonstration - the live counts are on the map page
        </p>
      </div>
    </section>
  );
}

export default Hero;
