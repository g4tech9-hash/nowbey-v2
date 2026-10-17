import { Icon } from "./Icon";
import { SITE } from "../content/site";

/**
 * The footer: where the product goes next, and the small print underneath.
 */
export function Footer() {
  return (
    <footer className="border-t border-mist-800/70 bg-ink-900/50">
      <div className="shell py-14">
        <div className="grid gap-10 lg:grid-cols-[1.3fr_2fr]">
          <div>
            <a href="#top" className="focus-ring inline-flex items-center gap-3">
              <span className="grid h-9 w-9 place-items-center rounded-xl bg-brand-500/15 text-brand-300 ring-1 ring-brand-400/30">
                <Icon name="map-pin" className="h-5 w-5" />
              </span>
              <span className="leading-tight">
                <span className="block font-display text-[0.95rem] text-mist-50">{SITE.brand.name}</span>
                <span className="block font-mono text-[0.65rem] uppercase tracking-wider text-mist-500">
                  {SITE.brand.tagline}
                </span>
              </span>
            </a>
            <p className="mt-4 max-w-sm text-sm leading-relaxed text-mist-400">{SITE.footer.tagline}</p>
            <p className="mt-4 font-mono text-[0.65rem] uppercase tracking-wider text-mist-500">
              {SITE.footer.note}
            </p>
          </div>

          <div className="grid gap-8 sm:grid-cols-3">
            {SITE.footer.columns.map((column) => (
              <div key={column.title}>
                <h3 className="font-mono text-[0.65rem] uppercase tracking-wider text-mist-500">
                  {column.title}
                </h3>
                <ul className="mt-4 grid gap-2.5">
                  {column.links.map((link) => (
                    <li key={link.label}>
                      <a
                        href={link.href}
                        className="focus-ring rounded text-sm text-mist-300 transition-colors hover:text-mist-50"
                      >
                        {link.label}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-12 flex flex-col gap-4 border-t border-mist-800/70 pt-6 sm:flex-row sm:items-center sm:justify-between">
          <p className="font-mono text-[0.65rem] uppercase tracking-wider text-mist-500">
            {SITE.brand.promise}
          </p>
          <ul className="flex flex-wrap gap-5">
            {SITE.footer.legal.map((link) => (
              <li key={link.label}>
                <a
                  href={link.href}
                  className="focus-ring rounded font-mono text-[0.65rem] uppercase tracking-wider text-mist-500 transition-colors hover:text-mist-200"
                >
                  {link.label}
                </a>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </footer>
  );
}

export default Footer;
