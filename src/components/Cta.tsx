import { Icon } from "./Icon";
import { SITE } from "../content/site";

/**
 * The last thing on the page: one instruction, two buttons, no sales pitch.
 */
export function Cta() {
  return (
    <section className="pb-24 pt-4">
      <div className="shell">
        <div className="relative overflow-hidden rounded-2xl border border-mist-800 bg-mist-900/40">
          <div
            className="pointer-events-none absolute inset-0"
            style={{
              background:
                "radial-gradient(38rem 22rem at 18% 0%, color-mix(in srgb, var(--color-brand-400) 14%, transparent), transparent 64%), radial-gradient(30rem 20rem at 88% 100%, color-mix(in srgb, var(--color-safe-400) 8%, transparent), transparent 62%)",
            }}
            aria-hidden="true"
          />

          <div className="relative grid gap-8 px-6 py-12 sm:px-12 sm:py-16 lg:grid-cols-[1.2fr_0.8fr] lg:items-center">
            <div>
              <p className="font-mono text-[0.65rem] uppercase tracking-wider text-brand-300">
                {SITE.cta.eyebrow}
              </p>
              <h2 className="mt-3 font-display text-3xl leading-tight text-mist-50 sm:text-4xl">{SITE.cta.title}</h2>
              <p className="mt-4 max-w-xl text-base leading-relaxed text-mist-300">{SITE.cta.body}</p>

              <div className="mt-8 flex flex-wrap items-center gap-3">
                {SITE.cta.actions.map((action, index) => (
                  <a
                    key={action.label}
                    href={action.href}
                    className={`focus-ring inline-flex items-center gap-2 rounded-xl px-5 py-3 text-sm font-semibold transition-colors ${
                      index === 0
                        ? "bg-brand-500 text-ink-950 hover:bg-brand-400"
                        : "border border-mist-800 bg-mist-900/60 text-mist-100 hover:border-mist-700"
                    }`}
                  >
                    {index === 0 ? <Icon name="map-pin" className="h-4 w-4" /> : null}
                    {action.label}
                    {index === 0 ? <Icon name="arrow-up-right" className="h-4 w-4" strokeWidth={2} /> : null}
                  </a>
                ))}
              </div>
            </div>

            <ul className="grid gap-3 rounded-2xl border border-mist-800 bg-ink-950/60 p-5">
              {SITE.cta.notes.map((note) => (
                <li key={note} className="flex items-center gap-3 text-sm text-mist-300">
                  <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-safe-400/10 text-safe-400">
                    <Icon name="check" className="h-4 w-4" strokeWidth={2} />
                  </span>
                  {note}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}

export default Cta;
