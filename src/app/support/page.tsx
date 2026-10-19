import Link from "next/link";
import { ENTERPRISE } from "@/lib/tiers";
import { PageHead } from "@/components/app-shell";
import { PlanGrid, PerkList } from "@/components/plan-grid";
import { AdSlot } from "@/components/ad-slot";
import { EnterpriseForm } from "@/components/enterprise-form";
import { getViewer } from "@/lib/viewer";
import { demoPlansAllowed, stripeConfigured } from "@/lib/billing";

export const dynamic = "force-dynamic";
export const metadata = { title: "Plans and pricing" };

const COSTS = [
  ["Maps and search", "Aerial imagery, street names and address lookup for every pin on the map."],
  ["The news wire", "Gathering Bahamian headlines and placing them on the map."],
  ["Hosting and backups", "Keeping NowBey fast and your reports safe."],
  ["Alerts", "Emails cost money to send, and text messages cost more, so texts stay optional."],
];

export default async function SupportPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  const checkout = Array.isArray(sp.checkout) ? sp.checkout[0] : sp.checkout;
  const viewer = await getViewer();
  const live = stripeConfigured();
  const demo = demoPlansAllowed();
  const purchasable = live || demo;

  return (
    <div className="space-y-8">
      <PageHead
        eyebrow="Plans and pricing"
        title="Free to use. Pay only to lose the ads."
        blurb="NowBey is free and paid for by ads. Reading the map, filing a report, confirming what neighbours see, the news wire and email alerts for your island cost nothing. A plan switches the ads off and adds extras."
      />

      {checkout === "success" ? (
        <p className="rounded-xl border border-tide-400/40 bg-tide-500/10 px-4 py-3 text-[13px] text-tide-300">
          Thank you! Your plan switches on within a few seconds. If you still see ads, refresh this page.
        </p>
      ) : null}
      {checkout === "cancelled" ? (
        <p className="rounded-xl border hairline bg-white/5 px-4 py-3 text-[13px] text-ink-200">
          Checkout was cancelled and you were not charged. Pick a plan whenever you are ready.
        </p>
      ) : null}

      <section aria-label="Plans" className="-mt-2">
        {/* Free live — always visible */}
        <div className="rounded-2xl border border-accent/30 bg-raised p-4">
          <p className="text-[11.5px] font-bold uppercase tracking-[0.14em] text-accent">Free — live now</p>
          <h2 className="mt-1 text-[18px] font-extrabold text-primary">Everything free stays free</h2>
          <p className="mt-1.5 text-[13px] leading-relaxed text-secondary">Reading the map, filing reports, confirming neighbours, the news wire and email alerts for your island cost nothing. Storm warnings are never paywalled.</p>
          {viewer.signedIn ? <p className="mt-2 text-[12px] text-tertiary">You are on the Free plan.</p> : null}
        </div>
        {/* Paid waitlist — replaces 4-tier grid when not live */}
        {!live ? (
          <div className="mt-3 rounded-2xl border border-default bg-raised p-4">
            <p className="text-[11.5px] font-bold uppercase tracking-[0.14em] text-tertiary">Paid plans — join the waitlist</p>
            <ul className="mt-2 grid gap-1.5 text-[12.5px] text-secondary">
              <li>• Ad-free browsing</li>
              <li>• Extra alert filters and early features</li>
              <li>• Support the map for everyone — storm warnings stay free</li>
            </ul>
            <p className="mt-2 text-[12px] text-tertiary">Leave your email and we will tell you when paid plans open. No charge today.</p>
            <a href="mailto:support@nowbey.com?subject=Waitlist%20for%20paid%20plans" className="mt-2 inline-flex min-h-[44px] items-center rounded-full border border-accent px-4 py-2 text-[13px] font-bold text-accent">Join the waitlist</a>
          </div>
        ) : (
          <>
            <div className="mt-3">
              <PlanGrid live={live} purchasable={purchasable} signedIn={viewer.signedIn} currentTier={viewer.tier} currentInterval={viewer.interval} complimentary={viewer.status === "comp"} />
            </div>
            <p className="mt-3 text-[12px] leading-snug text-ink-400">
              Payments are handled securely by Stripe. Cancel any time from your account page and your plan runs to the end of the period you paid for. Perks marked <span className="font-bold text-ink-200">Soon</span> are on the way.
            </p>
          </>
        )}
        <p className="mt-2 text-[11.5px] text-ink-400">Prices are in US dollars. The Bahamian dollar is pegged one to one, so $10 is B$10.</p>
      </section>

      <section id="enterprise" aria-label="Enterprise" className="scroll-mt-24">
        <div className="glass grid gap-6 rounded-2xl p-4 sm:p-6 lg:grid-cols-[1fr_minmax(0,430px)]">
          <div className="flex flex-col">
            <p className="text-[11.5px] font-bold uppercase tracking-[0.16em]" style={{ color: ENTERPRISE.tone }}>
              {ENTERPRISE.name}
            </p>
            <h2 className="display mt-1 text-[clamp(1.4rem,3.6vw,1.9rem)] font-extrabold leading-tight text-sand-100">
              NowBey for your whole team
            </h2>
            <p className="mt-1.5 max-w-[52ch] text-[13.5px] leading-relaxed text-ink-300">{ENTERPRISE.blurb}</p>
            <p className="mt-3 flex items-baseline gap-2">
              <span className="display text-[26px] font-extrabold text-sand-100">{ENTERPRISE.price}</span>
              <span className="text-[12px] text-ink-400">priced to fit your team</span>
            </p>
            <PerkList perks={ENTERPRISE.perks} tone={ENTERPRISE.tone} />
            <p className="mt-4 text-[12px] leading-relaxed text-ink-400">
              Tell us what you need and someone from NowBey will reply with a quote. No commitment to ask.
            </p>
          </div>
          <div className="rounded-2xl border hairline bg-abyss-900/60 p-4">
            <p className="display text-[15px] font-bold text-sand-100">Talk to us</p>
            <div className="relative mt-3">
              <EnterpriseForm />
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-3 sm:grid-cols-2">
        <div className="nb-surface rounded-xl2 p-4">
          <p className="display text-[15px] font-bold text-sand-100">Where the money goes</p>
          <ul className="mt-2 space-y-2 text-[12.5px] leading-relaxed text-ink-300">
            {COSTS.map(([k, v]) => (
              <li key={k}>
                <span className="font-bold text-ink-200">{k}.</span> {v}
              </li>
            ))}
          </ul>
        </div>
        <div className="nb-surface rounded-xl2 p-4">
          <p className="display text-[15px] font-bold text-sand-100">Ads, honestly</p>
          <p className="mt-2 text-[12.5px] leading-relaxed text-ink-300">
            NowBey shows a few ads from Bahamian businesses, with no trackers and nothing that follows you between pages.
            Ads never appear as reports, and every paid listing is marked “Promoted”.
          </p>
          <p className="mt-2 text-[12.5px] leading-relaxed text-ink-300">
            In the mobile app, plans are bought here on the website and follow your account to your phone.
          </p>
          <Link href="/feed" className="mt-3 inline-block text-[12.5px] font-bold text-tide-300 hover:underline">
            Back to the feed →
          </Link>
        </div>
      </section>

      <div className="mx-auto max-w-[640px]">
        <AdSlot index={0} adFree={viewer.adFree} />
      </div>
    </div>
  );
}
