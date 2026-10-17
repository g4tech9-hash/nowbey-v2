import Link from "next/link";
import { NowBeyMark } from "@/components/app-shell";
import { BRAND } from "@/lib/brand";

const PILLARS = [
  {
    kicker: "Live map",
    title: "Street-level pins, not rumours",
    body: "Residents drop floods, outages and hazards on real aerial imagery. Neighbours confirm them. You see what is actually happening.",
  },
  {
    kicker: "News wire",
    title: "Official stories, island by island",
    body: "The wire pulls approved local coverage so you are not hunting ten Facebook groups when the weather turns.",
  },
  {
    kicker: "Alerts",
    title: "Pinged for the parishes you care about",
    body: "Floods and power for a Family Island home. Safety and roads for Nassau. You choose the categories.",
  },
];

export function LandingPage() {
  return (
    <div className="relative isolate overflow-hidden">
      <header className="mx-auto flex max-w-[1180px] items-center gap-3 px-4 py-4 sm:px-6">
        <Link href="/" className="flex items-center gap-2.5">
          <NowBeyMark />
          <span className="leading-none">
            <span className="display block text-[19px] font-extrabold tracking-tight text-sand-100">
              Now<span className="text-tide-400">Bey</span>
            </span>
            <span className="mt-0.5 block text-[11.5px] font-semibold uppercase tracking-[0.14em] text-ink-400">
              {BRAND.tagline}
            </span>
          </span>
        </Link>
        <div className="ml-auto flex items-center gap-2">
          <Link href="/map" className="hidden rounded-full border hairline px-3.5 py-2 text-[12.5px] font-bold text-sand-100 hover:bg-white/10 sm:inline-block">
            Open the map
          </Link>
          <Link href="/login" className="rounded-full bg-tide-500 px-4 py-2 text-[12.5px] font-extrabold text-abyss-950 shadow-[0_12px_28px_rgba(0,201,183,.3)] hover:bg-tide-400">
            Sign in
          </Link>
        </div>
      </header>

      <section className="mx-auto grid max-w-[1180px] gap-8 px-4 pb-16 pt-6 sm:px-6 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)] lg:items-center lg:pt-10">
        <div>
          <p className="text-[11.5px] font-bold uppercase tracking-[0.18em] text-tide-400">{BRAND.tagline}</p>
          <h1 className="display mt-2 text-[clamp(2rem,7vw,3.4rem)] font-extrabold leading-[1.04] text-sand-100">
            Know what is happening, <span className="text-tide-400">island by island.</span>
          </h1>
          <p className="mt-4 max-w-[54ch] text-[15px] leading-relaxed text-ink-300">{BRAND.description}</p>
          <div className="mt-6 flex flex-wrap gap-2">
            <Link
              href="/login"
              className="rounded-full bg-tide-500 px-5 py-2.5 text-center text-[13.5px] font-extrabold text-abyss-950 shadow-[0_12px_28px_rgba(0,201,183,.3)] hover:bg-tide-400"
            >
              Create a free account
            </Link>
            <Link href="/map" className="rounded-full border hairline bg-white/5 px-5 py-2.5 text-center text-[13.5px] font-bold text-sand-100 hover:bg-white/10">
              Browse the map
            </Link>
          </div>
        </div>
        <div className="glass relative overflow-hidden rounded-2xl p-5">
          <p className="display text-[15px] font-bold text-sand-100">{BRAND.promise}</p>
          <p className="mt-2 text-[13px] leading-relaxed text-ink-300">
            No account is required to read the map. Sign in to report, confirm, and get parish alerts.
          </p>
          <dl className="mt-5 grid grid-cols-3 gap-2 border-t hairline pt-4">
            {[
              ["Pins", "Live"],
              ["Parishes", "All islands"],
              ["Access", "Free to read"],
            ].map(([k, v]) => (
              <div key={k}>
                <dt className="text-[11px] font-bold uppercase tracking-wide text-ink-400">{k}</dt>
                <dd className="display mt-0.5 text-[15px] font-extrabold text-sand-100">{v}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      <section className="mx-auto grid max-w-[1180px] gap-3 px-4 pb-16 sm:grid-cols-3 sm:px-6">
        {PILLARS.map((p) => (
          <article key={p.title} className="nb-surface rounded-xl2 p-4">
            <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-tide-400">{p.kicker}</p>
            <h2 className="display mt-1.5 text-[17px] font-extrabold text-sand-100">{p.title}</h2>
            <p className="mt-2 text-[13px] leading-relaxed text-ink-300">{p.body}</p>
          </article>
        ))}
      </section>

      <footer className="mx-auto flex max-w-[1180px] flex-wrap gap-4 px-4 pb-10 text-[12px] text-ink-400 sm:px-6">
        <span>
          {BRAND.name} · {BRAND.tagline}
        </span>
        <Link href="/terms" className="text-tide-300 hover:underline">
          Terms
        </Link>
        <Link href="/privacy" className="text-tide-300 hover:underline">
          Privacy
        </Link>
        <Link href="/support" className="text-tide-300 hover:underline">
          Plans
        </Link>
      </footer>
    </div>
  );
}
