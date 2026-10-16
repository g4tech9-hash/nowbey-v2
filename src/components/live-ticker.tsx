"use client";

/**
 * In-flow ticker that lives inside the sticky header (AppShell passes it as the kicker), so it must
 * never be fixed - a fixed ticker would sit on top of the header. Option B: mono label chip, amber
 * signal dot, hairline rule, and the marquee animation that the reduced-motion kill-switch stops.
 */
export function LiveTicker() {
  return (
    <div className="w-full border-b hairline bg-panel/90 backdrop-blur-sm">
      <div className="mx-auto flex max-w-[1180px] items-center gap-2.5 px-3.5 py-1 sm:gap-3 sm:px-5">
        <span className="nb-meta flex shrink-0 items-center gap-1.5 rounded-full bg-amber/18 px-2 py-0.5 text-2xs font-extrabold uppercase text-amber">
          <span className="nb-live-dot h-1.5 w-1.5 rounded-full bg-amber" />
          Gas Updates
        </span>
        <div className="relative min-w-0 flex-1 overflow-hidden [mask-image:linear-gradient(90deg,transparent,#000_5%,#000_92%,transparent)]">
          <div className="marquee-track flex w-max items-center gap-8 whitespace-nowrap text-sm font-medium text-ink-200">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="flex items-center gap-6">
                <span>Shell <span className="font-bold text-amber">$7.08/gal</span></span>
                <span>Esso <span className="font-bold text-amber">$7.50/gal</span></span>
                <span>Rubis <span className="font-bold text-amber">$7.56/gal</span></span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
