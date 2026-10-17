import { NowBeyMark } from "@/components/app-shell";
import { EmergencyNotice } from "@/components/emergency-notice";
import { PageScene } from "@/components/page-scene";
import { BRAND } from "@/lib/brand";
import { CATEGORIES, timeAgo, type CategoryKey } from "@/lib/geo";
import { landingSnapshot, type LandingSnapshot } from "@/lib/landing";

/** Small line drawings for the feature cards. Decorative, so they carry no accessible name. */
function Glyph({ name }: { name: "pin" | "check" | "wire" | "bell" }) {
  const common = {
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.8,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };
  switch (name) {
    case "pin":
      return (
        <svg width="19" height="19" viewBox="0 0 24 24" aria-hidden {...common}>
          <path d="M12 21s7-6.3 7-11a7 7 0 1 0-14 0c0 4.7 7 11 7 11Z" />
          <circle cx="12" cy="10" r="2.4" />
        </svg>
      );
    case "check":
      return (
        <svg width="19" height="19" viewBox="0 0 24 24" aria-hidden {...common}>
          <circle cx="12" cy="12" r="8.5" />
          <path d="m8.5 12 2.4 2.4 4.6-4.8" />
        </svg>
      );
    case "wire":
      return (
        <svg width="19" height="19" viewBox="0 0 24 24" aria-hidden {...common}>
          <path d="M4 5h12v14H4zM16 9h3l1 2v8h-4" />
          <path d="M7 9h6M7 12h6M7 15h4" />
        </svg>
      );
    default:
      return (
        <svg width="19" height="19" viewBox="0 0 24 24" aria-hidden {...common}>
          <path d="M6 16V10a6 6 0 1 1 12 0v6l2 3H4z" />
          <path d="M10 22h4" />
        </svg>
      );
  }
}

const PILLARS: { icon: "pin" | "check" | "wire" | "bell"; title: string; body: string }[] = [
  {
    icon: "pin",
    title: "Street-level, not vague",
    body: "Pin the road or junction on real aerial imagery. Published pins sit a short distance from the exact spot, so a report helps without pointing at a house.",
  },
  {
    icon: "check",
    title: "Confirmed by neighbours",
    body: "One tap says a report is still true. Confirmation counts sit on every card, so you can see what the street is saying before you set out.",
  },
  {
    icon: "wire",
    title: "The news, placed",
    body: "The NowBey Wire gathers Bahamian headlines and puts them on the parish they belong to, beside what residents are seeing on the ground.",
  },
  {
    icon: "bell",
    title: "Alerts for your island",
    body: "Choose the islands and categories you care about. Storm cover reaches everyone, free, and the rest waits until you ask for it.",
  },
];

const STEPS = [
  {
    title: "Open the map",
    body: "See what is happening right now. Reading the map never needs an account.",
  },
  {
    title: "Drop a pin",
    body: "Name it, place it, add a photo if you have one. About twenty seconds from start to published.",
  },
  {
    title: "Confirm what you see",
    body: "Tell your neighbours a report is still true, or that the road is clear again.",
  },
];

const ACCOUNT = [
  {
    title: "Your handle, your call",
    body: "File under your name or stay anonymous. Your handle links to a profile of what you have reported and confirmed.",
  },
  {
    title: "Alerts that follow you",
    body: "Choose islands and categories once. Email works today; the Android app has its own push switch.",
  },
  {
    title: "The same account on your phone",
    body: "Sign in on the Android app and your handle, alerts and plan come with you.",
  },
  {
    title: "Ad-free, when you want it",
    body: "A plan switches the ads off. Reading the map, reporting and confirming stay free for everyone.",
  },
];

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <dt className="text-[11.5px] font-bold uppercase leading-tight tracking-wide text-ink-400">{label}</dt>
      <dd className="display mt-0.5 text-[22px] font-extrabold leading-tight text-sand-100">{value}</dd>
    </div>
  );
}

/**
 * The front door for visitors who are not signed in. Members never see this: the home route hands
 * them the feed instead (see src/app/page.tsx).
 *
 * The page has one job — explain NowBey in a screenful and offer three honest ways in: create an
 * account, sign in, or keep browsing the map as a guest. Nothing here is gated behind an account,
 * and nothing claims a feature the site does not have today.
 */
export async function Landing() {
  let snapshot: LandingSnapshot | null = null;
  try {
    snapshot = await landingSnapshot();
  } catch {
    // The database being briefly unreachable must not turn the front door into an error page.
    // The numbers show as dashes and the newest list falls back to a plain invitation.
  }

  return (
    <>
      {/* The landing page carries its own header and footer: the root layout renders it without
          the app navigation (see AppShell's bare mode in src/components/app-shell.tsx). */}
      <header className="glass-strong border-b hairline">
        <div className="mx-auto flex w-full max-w-[1180px] items-center gap-3 px-3.5 py-2.5 sm:px-5">
          {/* eslint-disable-next-line @next/next/no-html-link-for-pages -- a full document load is required to rebuild the landing page shell */}
          <a href="/" className="flex min-w-0 items-center gap-2.5">
            <NowBeyMark />
            <span className="leading-none">
              <span className="display block text-[19px] font-extrabold tracking-tight text-sand-100">
                Now<span className="text-tide-400">Bey</span>
              </span>
              <span className="mt-0.5 block text-[11.5px] font-semibold uppercase tracking-[0.14em] text-ink-400">
                {BRAND.tagline}
              </span>
            </span>
          </a>
          <div className="ml-auto flex shrink-0 items-center gap-2">
            <a
              href="/map"
              className="hidden min-h-[40px] items-center rounded-full border hairline px-3.5 py-2 text-[12.5px] font-bold text-sand-100 hover:bg-white/10 sm:inline-flex"
            >
              Open the map
            </a>
            <a
              href="/login?mode=signin"
              className="inline-flex min-h-[40px] items-center rounded-full border hairline px-3.5 py-2 text-[12.5px] font-bold text-ink-200 hover:bg-white/5"
            >
              Sign in
            </a>
            <a
              href="/login?mode=signup"
              className="hidden min-h-[40px] items-center rounded-full bg-tide-500 px-3.5 py-2 text-[12.5px] font-extrabold text-abyss-950 shadow-[0_10px_26px_rgba(0,201,183,.28)] hover:bg-tide-400 sm:inline-flex"
            >
              Create account
            </a>
          </div>
        </div>
      </header>

      <div className="mx-auto w-full max-w-[1180px] px-3.5 pb-8 pt-4 sm:px-5 sm:pt-6">
        <div className="space-y-5 sm:space-y-7">
        <section aria-labelledby="welcome" className="glass relative isolate overflow-hidden rounded-2xl p-4 sm:p-6 lg:p-8">
          <PageScene name="nassau" />
          <div className="relative grid min-w-0 gap-6 lg:grid-cols-[minmax(0,1.12fr)_minmax(0,0.88fr)] lg:items-center">
            <div className="min-w-0">
              <p className="text-[11.5px] font-bold uppercase tracking-[0.18em] text-tide-400">{BRAND.tagline}</p>
              <h1 id="welcome" className="display mt-2 text-[clamp(1.9rem,7vw,3.1rem)] font-extrabold leading-[1.03] text-sand-100">
                Know what is happening, <span className="text-tide-400">island by island.</span>
              </h1>
              <p className="mt-3 max-w-[56ch] text-[14px] leading-relaxed text-ink-300">
                Floods, outages, road damage and safety hazards — pinned by the people who live there, on real aerial
                imagery. NowBey turns what neighbours see into one live map of The Bahamas.
              </p>

              <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
                <a
                  href="/login?mode=signup"
                  className="inline-flex min-h-[44px] items-center justify-center rounded-full bg-tide-500 px-5 py-2.5 text-center text-[13.5px] font-extrabold text-abyss-950 shadow-[0_12px_28px_rgba(0,201,183,.3)] transition duration-200 ease-standard hover:bg-tide-400 active:scale-[0.98]"
                >
                  Create your account
                </a>
                <a
                  href="/login?mode=signin"
                  className="inline-flex min-h-[44px] items-center justify-center rounded-full border hairline bg-white/5 px-5 py-2.5 text-center text-[13.5px] font-bold text-sand-100 transition duration-200 ease-standard hover:bg-white/10 active:scale-[0.98]"
                >
                  Sign in
                </a>
              </div>

              <a
                href="/map"
                className="mt-3 inline-flex min-h-[40px] items-center text-[13px] font-bold text-tide-300 underline-offset-2 hover:underline"
              >
                Browse the map without an account →
              </a>
              <p className="mt-2 max-w-[52ch] text-[12px] leading-relaxed text-ink-400">
                Free to read and free to report. An account puts your handle on what you file and keeps your alerts with you.
              </p>
            </div>

            <div className="nb-surface min-w-0 rounded-2xl p-3.5 sm:p-4">
              <div className="flex items-center gap-2">
                <span className="nb-live-dot" aria-hidden />
                <p className="text-[12px] font-bold uppercase tracking-[0.12em] text-ink-300">Live across The Bahamas</p>
              </div>
              <dl className="mt-3 grid grid-cols-3 gap-2">
                <Stat label="On the map now" value={snapshot ? String(snapshot.active) : "—"} />
                <Stat label="Reports, last 24h" value={snapshot ? String(snapshot.reportsToday) : "—"} />
                <Stat label="Parishes reporting" value={snapshot ? String(snapshot.parishes) : "—"} />
              </dl>

              <div className="mt-3 border-t hairline pt-3">
                <div className="flex items-baseline justify-between gap-2">
                  <p className="text-[12.5px] font-bold text-sand-100">Newest on the map</p>
                  <a href="/map" className="shrink-0 text-[12px] font-bold text-tide-300 hover:underline">
                    Open map
                  </a>
                </div>
                {snapshot && snapshot.latest.length > 0 ? (
                  <ul className="mt-2 space-y-2">
                    {snapshot.latest.map((row) => {
                      const category = Object.prototype.hasOwnProperty.call(CATEGORIES, row.category)
                        ? CATEGORIES[row.category as CategoryKey]
                        : null;
                      return (
                        <li key={row.id} className="min-w-0">
                          <a href={`/incident/${row.id}`} className="group block min-w-0">
                            <p className="truncate text-[13px] font-semibold leading-snug text-ink-200 group-hover:text-tide-300">
                              {row.title}
                            </p>
                            <p className="mt-0.5 text-[11.5px] text-ink-400">
                              {category?.label ?? "Report"} · {row.parish ?? "The Bahamas"} · {timeAgo(row.createdAt)}
                            </p>
                          </a>
                        </li>
                      );
                    })}
                  </ul>
                ) : (
                  <p className="mt-2 text-[12.5px] leading-relaxed text-ink-400">
                    The map is quiet right now.{" "}
                    {snapshot ? (
                      <a href="/report" className="font-bold text-tide-300 hover:underline">
                        Be the first to pin something.
                      </a>
                    ) : (
                      <a href="/map" className="font-bold text-tide-300 hover:underline">
                        Open the map to see what neighbours have reported.
                      </a>
                    )}
                  </p>
                )}
              </div>

              <p className="mt-3 text-[11.5px] leading-relaxed text-ink-400">
                Pins are placed by residents and sit a short distance from the exact spot. Verify before you travel.
              </p>
            </div>
          </div>
        </section>

        <section aria-labelledby="what-nowbey-does">
          <div className="mb-3">
            <p className="text-[11.5px] font-bold uppercase tracking-[0.16em] text-tide-400">Built for the islands</p>
            <h2 id="what-nowbey-does" className="display mt-1 text-[clamp(1.35rem,4vw,1.9rem)] font-extrabold leading-tight text-sand-100">
              What NowBey does
            </h2>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {PILLARS.map((pillar) => (
              <div key={pillar.title} className="nb-surface min-w-0 rounded-xl2 p-4">
                <span className="inline-grid h-9 w-9 place-items-center rounded-xl bg-tide-500/15 text-tide-300">
                  <Glyph name={pillar.icon} />
                </span>
                <p className="display mt-2.5 text-[15.5px] font-bold text-sand-100">{pillar.title}</p>
                <p className="mt-1 text-[13px] leading-relaxed text-ink-300">{pillar.body}</p>
              </div>
            ))}
          </div>
        </section>

        <section aria-labelledby="how-it-works" className="nb-surface rounded-2xl p-4 sm:p-5">
          <h2 id="how-it-works" className="display text-[clamp(1.3rem,3.6vw,1.7rem)] font-extrabold leading-tight text-sand-100">
            From one pin to the whole picture
          </h2>
          <p className="mt-1.5 max-w-[62ch] text-[13px] leading-relaxed text-ink-300">
            NowBey works because neighbours do the watching. No dispatch desk, no waiting for a press release.
          </p>
          <ol className="mt-3 grid gap-2.5 md:grid-cols-3">
            {STEPS.map((step, i) => (
              <li key={step.title} className="min-w-0 rounded-xl border hairline bg-white/4 p-3.5">
                <span className="display grid h-8 w-8 place-items-center rounded-full bg-tide-500 text-[13px] font-extrabold text-abyss-950">
                  {i + 1}
                </span>
                <p className="display mt-2 text-[14.5px] font-bold text-sand-100">{step.title}</p>
                <p className="mt-1 text-[12.5px] leading-relaxed text-ink-300">{step.body}</p>
              </li>
            ))}
          </ol>
        </section>

        <section aria-labelledby="account-adds" className="grid gap-4 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
          <div className="glass flex flex-col justify-center rounded-2xl p-4 sm:p-5">
            <p className="text-[11.5px] font-bold uppercase tracking-[0.16em] text-tide-400">Your account</p>
            <h2 id="account-adds" className="display mt-1 text-[clamp(1.35rem,4vw,1.85rem)] font-extrabold leading-tight text-sand-100">
              What an account adds
            </h2>
            <p className="mt-2 max-w-[48ch] text-[13px] leading-relaxed text-ink-300">
              Reading, reporting and confirming are free and need no account. Signing in keeps your name on your work,
              your alerts in one place and your plan on every device.
            </p>
            <div className="mt-3.5 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
              <a
                href="/login?mode=signup"
                className="inline-flex min-h-[44px] items-center justify-center rounded-full bg-tide-500 px-4 py-2 text-center text-[13px] font-extrabold text-abyss-950 hover:bg-tide-400"
              >
                Join your neighbours
              </a>
              <a
                href="/login?mode=signin"
                className="inline-flex min-h-[44px] items-center justify-center rounded-full border hairline px-4 py-2 text-center text-[13px] font-bold text-ink-200 hover:bg-white/5"
              >
                Already have an account?
              </a>
            </div>
          </div>

          <ul className="grid gap-2.5 sm:grid-cols-2">
            {ACCOUNT.map((item) => (
              <li key={item.title} className="nb-surface min-w-0 rounded-xl2 p-3.5">
                <p className="display text-[14px] font-bold leading-snug text-sand-100">{item.title}</p>
                <p className="mt-1 text-[12.5px] leading-relaxed text-ink-300">{item.body}</p>
              </li>
            ))}
          </ul>
        </section>

        <section aria-labelledby="ready" className="rounded-2xl border border-tide-500/30 bg-tide-500/10 p-4 text-center sm:p-6">
          <h2 id="ready" className="display text-[clamp(1.4rem,4.4vw,2rem)] font-extrabold leading-tight text-sand-100">
            Ready when you are.
          </h2>
          <p className="mx-auto mt-1.5 max-w-[52ch] text-[13px] leading-relaxed text-ink-300">
            Join the neighbours keeping each other informed — or take a look around first. The map is open either way.
          </p>
          <div className="mt-3 flex flex-col justify-center gap-2 sm:flex-row">
            <a
              href="/login?mode=signup"
              className="inline-flex min-h-[44px] items-center justify-center rounded-full bg-tide-500 px-5 py-2 text-[13.5px] font-extrabold text-abyss-950 hover:bg-tide-400"
            >
              Create your account
            </a>
            <a
              href="/map"
              className="inline-flex min-h-[44px] items-center justify-center rounded-full border hairline bg-white/5 px-5 py-2 text-[13.5px] font-bold text-sand-100 hover:bg-white/10"
            >
              Browse the live map
            </a>
          </div>
        </section>

          <EmergencyNotice compact />
        </div>
      </div>

      <footer className="border-t hairline">
        <div className="mx-auto flex w-full max-w-[1180px] flex-wrap items-center gap-x-4 gap-y-1.5 px-3.5 py-4 text-[12px] text-ink-400 sm:px-5">
          <span>
            {BRAND.name} · {BRAND.tagline}
          </span>
          <span className="hidden sm:inline">Community safety, news and island life.</span>
          <span className="ml-auto flex flex-wrap gap-4">
            <a href="/terms" className="text-tide-300 hover:underline">
              Terms
            </a>
            <a href="/privacy" className="text-tide-300 hover:underline">
              Privacy
            </a>
            <a href="/support" className="text-tide-300 hover:underline">
              Plans
            </a>
            <a href="/mobile" className="text-tide-300 hover:underline">
              Mobile app
            </a>
          </span>
        </div>
      </footer>
    </>
  );
}
