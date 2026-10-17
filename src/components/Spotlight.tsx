import { Icon } from "./Icon";
import { SITE } from "../content/site";
import { seedFeed } from "../lib/landing-seed";
import { timeAgoLabel } from "../lib/landing-model";

/**
 * The spotlight: four deep dives, each with a picture of the thing it describes.
 *
 * The pictures are mock-ups drawn from the seeded feed, not screenshots. A screenshot
 * goes stale the day the layout moves; a mock-up built from the same data as the rest of
 * the page cannot.
 */
export function Spotlight() {
  const feed = seedFeed();

  return (
    <section id="spotlight" className="relative scroll-mt-24 border-y border-mist-800/70 bg-ink-900/40 py-20 sm:py-24">
      <div className="shell">
        <div className="max-w-2xl">
          <p className="font-mono text-[0.65rem] uppercase tracking-wider text-brand-300">How it works</p>
          <h2 className="mt-3 font-display text-3xl text-mist-50 sm:text-4xl">Four things worth showing properly</h2>
          <p className="mt-4 text-base leading-relaxed text-mist-300">
            The rest of the registry is a list. These four are the parts people ask about, so they get a
            picture each.
          </p>
        </div>

        <div className="mt-14 grid gap-14">
          {SITE.highlights.map((highlight, index) => (
            <div
              key={highlight.id}
              className="grid items-center gap-8 lg:grid-cols-2 lg:gap-14"
            >
              <div className={index % 2 === 1 ? "lg:order-2" : undefined}>
                <p className="flex items-center gap-2 font-mono text-[0.65rem] uppercase tracking-wider text-brand-300">
                  <Icon name={highlight.icon} className="h-4 w-4" />
                  {highlight.eyebrow}
                </p>
                <h3 className="mt-3 font-display text-2xl text-mist-50 sm:text-3xl">{highlight.title}</h3>
                <p className="mt-4 text-base leading-relaxed text-mist-300">{highlight.body}</p>
                <ul className="mt-6 grid gap-3">
                  {highlight.points.map((point) => (
                    <li key={point} className="flex gap-3 text-sm leading-relaxed text-mist-400">
                      <Icon name="check-circle" className="mt-0.5 h-4 w-4 shrink-0 text-safe-400" />
                      <span>{point}</span>
                    </li>
                  ))}
                </ul>
                <a
                  href={highlight.link.href}
                  className="focus-ring mt-6 inline-flex items-center gap-2 text-sm font-medium text-brand-300 hover:text-brand-200"
                >
                  {highlight.link.label}
                  <Icon name="arrow-right" className="h-4 w-4" />
                </a>
              </div>

              <div className={index % 2 === 1 ? "lg:order-1" : undefined}>
                <SpotlightVisual id={highlight.id} feed={feed} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/** The mock-up that goes with a spotlight. */
function SpotlightVisual({ id, feed }: { id: string; feed: ReturnType<typeof seedFeed> }) {
  const frame = "rounded-2xl border border-mist-800 bg-mist-900/40 p-2";

  if (id === "report") {
    return (
      <div className={frame}>
        <div className="overflow-hidden rounded-2xl border border-mist-800 bg-ink-950">
          <div className="relative h-56 bg-ink-900">
            <div className="grid-veil absolute inset-0 opacity-70" aria-hidden="true" />
            {[
              { left: "22%", top: "38%", tone: "bg-alert-500", label: "3" },
              { left: "58%", top: "26%", tone: "bg-amber-400", label: "8" },
              { left: "70%", top: "62%", tone: "bg-brand-400", label: "12" },
              { left: "38%", top: "70%", tone: "bg-safe-400", label: "1" },
            ].map((pin) => (
              <span
                key={pin.label}
                className={`absolute grid h-8 w-8 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full font-mono text-[0.65rem] font-bold text-ink-950 shadow-lg ${pin.tone}`}
                style={{ left: pin.left, top: pin.top }}
              >
                {pin.label}
              </span>
            ))}
            <span className="absolute bottom-3 left-3 rounded-md bg-ink-950/85 px-2 py-1 font-mono text-[0.65rem] uppercase tracking-wider text-mist-400">
              New Providence - 12 pins
            </span>
          </div>
          <div className="flex items-center justify-between gap-3 px-4 py-3">
            <div>
              <p className="text-sm text-mist-100">{feed[0].title}</p>
              <p className="mt-1 font-mono text-[0.65rem] uppercase tracking-wider text-mist-500">
                {feed[0].area} - {timeAgoLabel(feed[0].minutesAgo)}
              </p>
            </div>
            <span className="shrink-0 rounded-full border border-safe-400/30 bg-safe-400/10 px-2.5 py-1 font-mono text-[0.65rem] uppercase tracking-wider text-safe-400">
              {feed[0].confirmations} confirmed
            </span>
          </div>
        </div>
      </div>
    );
  }

  if (id === "alerts") {
    return (
      <div className={frame}>
        <div className="overflow-hidden rounded-2xl border border-mist-800 bg-ink-950 p-4">
          <div className="rounded-xl border border-alert-500/30 bg-alert-500/10 p-4">
            <p className="flex items-center gap-2 font-mono text-[0.65rem] uppercase tracking-wider text-alert-500">
              <Icon name="triangle-alert" className="h-4 w-4" />
              Storm warning - New Providence
            </p>
            <p className="mt-2 text-sm leading-relaxed text-mist-100">
              A tropical storm advisory is in effect. Shelters are open until 10pm.
            </p>
            <p className="mt-3 font-mono text-[0.65rem] uppercase tracking-wider text-mist-500">
              Sent 14 minutes ago - 3 islands matched
            </p>
          </div>
          <div className="mt-3 flex items-center justify-between gap-3 rounded-2xl border border-mist-800 bg-mist-900/40 px-4 py-3">
            <p className="text-sm text-mist-300">Your alerts</p>
            <div className="flex gap-2">
              <span className="rounded-md bg-mist-800 px-2 py-1 font-mono text-[0.65rem] text-mist-200">
                Nassau
              </span>
              <span className="rounded-md border border-dashed border-mist-700 px-2 py-1 font-mono text-[0.65rem] text-mist-500">
                + add island
              </span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (id === "wire") {
    return (
      <div className={frame}>
        <div className="overflow-hidden rounded-2xl border border-mist-800 bg-ink-950">
          <div className="flex items-center justify-between gap-3 border-b border-mist-800 px-4 py-3">
            <p className="font-display text-sm text-mist-50">The wire</p>
            <p className="font-mono text-[0.65rem] uppercase tracking-wider text-mist-500">8 stories</p>
          </div>
          <ul className="divide-y divide-mist-800/70">
            {feed
              .filter((item) => item.kind === "wire")
              .concat(feed.filter((item) => item.kind === "official"))
              .slice(0, 3)
              .map((item) => (
                <li key={item.id} className="px-4 py-3">
                  <p className="text-sm text-mist-100">{item.title}</p>
                  <p className="mt-1 font-mono text-[0.65rem] uppercase tracking-wider text-mist-500">
                    {item.source} - {timeAgoLabel(item.minutesAgo)}
                  </p>
                </li>
              ))}
          </ul>
        </div>
      </div>
    );
  }

  return (
    <div className={frame}>
      <div className="overflow-hidden rounded-2xl border border-mist-800 bg-ink-950">
        <div className="border-b border-mist-800 px-4 py-3">
          <p className="flex items-center gap-2 font-mono text-[0.65rem] uppercase tracking-wider text-brand-300">
            <Icon name="sparkles" className="h-4 w-4" />
            Intake copilot - a suggestion, not a decision
          </p>
        </div>
        <div className="grid gap-3 p-4">
          {[
            { label: "Category", from: "notice", to: "power" },
            { label: "Severity", from: "unknown", to: "2 - blocking a lane" },
            { label: "Headline", from: "lights out on the east", to: "Power outage on the east side of the island" },
          ].map((row) => (
            <div key={row.label} className="rounded-2xl border border-mist-800 bg-mist-900/40 px-3 py-2.5">
              <p className="font-mono text-[0.65rem] uppercase tracking-wider text-mist-500">{row.label}</p>
              <p className="mt-1.5 text-sm text-mist-400 line-through decoration-mist-600">{row.from}</p>
              <p className="mt-1 flex items-center gap-2 text-sm text-mist-100">
                <Icon name="arrow-right" className="h-3.5 w-3.5 text-brand-300" />
                {row.to}
              </p>
            </div>
          ))}
          <p className="font-mono text-[0.65rem] uppercase tracking-wider text-mist-500">
            The reporter keeps every final say - nothing here can publish on its own
          </p>
        </div>
      </div>
    </div>
  );
}

export default Spotlight;
