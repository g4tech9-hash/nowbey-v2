import Link from "next/link";
import { redirect } from "next/navigation";
import { and, desc, eq, ne, or } from "drizzle-orm";
import { db } from "@/db";
import { alertSubscriptions, incidents } from "@/db/schema";
import { getViewer } from "@/lib/viewer";
import { ManageBillingButton, SignOut } from "@/components/client-actions";
import { ResendVerification } from "@/components/account-forms";
import { PageHead } from "@/components/app-shell";
import { BadgeMark } from "@/components/verified-badge";
import { liveBadges } from "@/lib/profile";
import { CATEGORIES, type CategoryKey, timeAgo } from "@/lib/geo";
import { TIERS } from "@/lib/tiers";

export const dynamic = "force-dynamic";
export const metadata = { title: "Your account" };

const fmt = (d: Date | null) => (d ? d.toLocaleDateString("en-US", { day: "numeric", month: "long", year: "numeric" }) : null);

function planLine(status: string | null, renews: Date | null): string {
  if (status === "comp") return "A complimentary plan from NowBey. Nothing to pay.";
  if (status === "sandbox") return "Demo plan. You are not being charged.";
  if (status === "past_due") return "Your last payment failed. Update your card in Manage billing to keep your plan.";
  if (status === "canceling") return renews ? `Cancelled. Your plan runs until ${fmt(renews)}.` : "Cancelled. Your plan ends at the end of this period.";
  return renews ? `Renews on ${fmt(renews)}.` : "Active.";
}

export default async function YouPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const viewer = await getViewer();
  if (!viewer.signedIn || !viewer.userId || !viewer.handle) redirect("/login?mode=signin&next=/you");
  const sp = await searchParams;
  const welcome = (Array.isArray(sp.welcome) ? sp.welcome[0] : sp.welcome) === "1";

  const [mine, subs, badges] = await Promise.all([
    db
      .select()
      .from(incidents)
      .where(
        and(
          ne(incidents.status, "archived"),
          or(eq(incidents.userId, viewer.userId), and(eq(incidents.authorHandle, viewer.handle), eq(incidents.anonymous, false))),
        ),
      )
      .orderBy(desc(incidents.createdAt))
      .limit(20),
    db.select().from(alertSubscriptions).where(eq(alertSubscriptions.userId, viewer.userId)).orderBy(desc(alertSubscriptions.createdAt)).limit(3),
    liveBadges(viewer.userId),
  ]);
  const verifiedByPerson = badges.some((b) => b.badge === "verified");
  const tier = viewer.tier ? TIERS[viewer.tier] : null;

  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
      <div className="min-w-0 space-y-4">
        <PageHead
          eyebrow={`@${viewer.handle}`}
          title={viewer.displayName ?? viewer.handle}
          blurb={`Home island ${viewer.parish ?? "not set"} · ${mine.length} report${mine.length === 1 ? "" : "s"} filed`}
          actions={
            <>
              <Link href="/you/profile" className="rounded-full border hairline px-3.5 py-2 text-[12.5px] font-bold text-sand-100 hover:bg-white/8">
                Your profile
              </Link>
              <Link href="/you/settings" className="rounded-full border hairline px-3.5 py-2 text-[12.5px] font-bold text-sand-100 hover:bg-white/8">
                Account settings
              </Link>
            </>
          }
        />
        {verifiedByPerson || viewer.isEditor ? (
          <p className="-mt-2 flex flex-wrap gap-2">
            {verifiedByPerson ? <BadgeMark kind="verified" /> : null}
            {viewer.isEditor ? <BadgeMark kind="desk" /> : null}
          </p>
        ) : null}

        {/* Island Record: the numbers that say who you are on this island. */}
        <section className="grid grid-cols-2 gap-2 sm:grid-cols-4" aria-label="Your island record">
          <div className="nb-surface p-3">
            <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-ink-400">Reports</p>
            <p className="num display mt-1 text-2xl font-extrabold text-tide-300">{mine.length}</p>
          </div>
          <div className="nb-surface p-3">
            <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-ink-400">Confirmed</p>
            <p className="num display mt-1 text-2xl font-extrabold text-ok-500">
              {mine.reduce((s, r) => s + r.confirmations, 0).toLocaleString("en-US")}
            </p>
          </div>
          <div className="nb-surface p-3">
            <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-ink-400">Home island</p>
            <p className="display mt-1 truncate text-[15px] font-extrabold text-sand-100">{viewer.parish ?? "Not set"}</p>
          </div>
          <div className="nb-surface p-3">
            <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-ink-400">Plan</p>
            <p className="display mt-1 truncate text-[15px] font-extrabold" style={{ color: tier?.tone ?? "var(--color-ink-200)" }}>
              {tier?.name ?? "Free"}
            </p>
          </div>
        </section>

        {welcome ? (
          <section className="nb-surface rounded-xl2 border-tide-400/40 bg-tide-500/10 p-4">
            <p className="display text-lg font-extrabold tracking-tight text-sand-100">Welcome to NowBey, @{viewer.handle}</p>
            <ol className="mt-2 space-y-1.5 text-base text-ink-200">
              <li>
                <span className="font-bold text-tide-300">1.</span> Confirm your email{viewer.emailVerified ? " (done)" : " using the link we just sent you"}.
              </li>
              <li>
                <span className="font-bold text-tide-300">2.</span>{" "}
                <Link href="/alerts" className="font-bold underline">
                  Set up alerts
                </Link>{" "}
                for your island.
              </li>
              <li>
                <span className="font-bold text-tide-300">3.</span>{" "}
                <Link href="/report" className="font-bold underline">
                  File your first report
                </Link>{" "}
                or confirm one you can see from where you are.
              </li>
            </ol>
          </section>
        ) : null}

        {!viewer.email ? (
          <section className="nb-surface rounded-xl2 border-sun-500/35 bg-sun-500/10 p-3.5 text-base text-ink-200">
            Your account has no email address, so we could not help you back in if you forgot your password.{" "}
            <Link href="/you/settings" className="font-bold text-sun-600 underline">
              Add one
            </Link>
            .
          </section>
        ) : !viewer.emailVerified ? (
          <section className="nb-surface rounded-xl2 border-sun-500/35 bg-sun-500/10 p-3.5">
            <p className="text-base text-ink-200">
              Confirm <strong className="text-sand-100">{viewer.email}</strong> so we can help if you forget your password.
            </p>
            <div className="mt-2">
              <ResendVerification />
            </div>
          </section>
        ) : null}

        <section className="nb-surface rounded-xl2 p-4">
          <div className="flex flex-wrap items-center gap-2">
            <p className="display text-base font-extrabold tracking-tight text-sand-100">Your reports</p>
            <span className="num rounded-full bg-white/8 px-2 py-0.5 text-[11px] text-ink-300">
              {mine.reduce((s, r) => s + r.confirmations, 0)} confirmations collected
            </span>
            <Link href="/report" className="ml-auto rounded-full bg-tide-500 px-3 py-1.5 text-[12px] font-extrabold text-abyss-950">
              + New report
            </Link>
          </div>
          {mine.length ? (
            <ul className="mt-3 space-y-2">
              {mine.map((r) => {
                const c = CATEGORIES[r.category as CategoryKey] ?? CATEGORIES.notice;
                return (
                  <li key={r.id} className="flex items-start gap-2.5 rounded-xl border border-white/8 px-3 py-2 transition duration-200 ease-standard hover:border-tide-400/25">
                    <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full" style={{ background: c.color, boxShadow: `0 0 8px ${c.color}80` }} />
                    <span className="min-w-0 flex-1">
                      <Link href={`/incident/${r.id}`} className="block text-base font-semibold tracking-tight text-sand-100 hover:text-tide-300">
                        {r.title}
                      </Link>
                      <span className="num block text-xs text-ink-400">
                        {r.street ?? "unmapped"} · {r.parish ?? "Bahamas"} · {timeAgo(r.createdAt)} · {r.status} · {r.confirmations} ✓
                      </span>
                    </span>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="mt-2 text-sm text-ink-400">Nothing filed yet. Reports you pin show up here with their confirmation counts.</p>
          )}
        </section>
      </div>

      <aside className="space-y-4">
        <div className="nb-surface rounded-xl2 p-3.5">
          <p className="display text-base font-bold tracking-tight text-sand-100">Your plan</p>
          {tier ? (
            <>
              <p className="num mt-1 text-base font-extrabold" style={{ color: tier.tone }}>
                {tier.name}
                {viewer.status === "comp" ? "" : ` · ${viewer.interval === "year" ? "yearly" : "monthly"}`}
              </p>
              <p className="mt-1 text-sm leading-snug text-ink-300">{planLine(viewer.status, viewer.renewsAt)}</p>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                {viewer.status !== "comp" ? <ManageBillingButton demo={viewer.status === "sandbox"} /> : null}
                {viewer.tier === "admiral" ? (
                  // A file download, not a page, so a plain link is correct here.
                  // eslint-disable-next-line @next/next/no-html-link-for-pages
                  <a href="/api/export" className="rounded-full border hairline px-3.5 py-2 text-[12.5px] font-bold text-sand-100 hover:bg-white/8">
                    Download my reports
                  </a>
                ) : null}
              </div>
            </>
          ) : (
            <>
              <p className="mt-1 text-sm text-ink-300">Free plan. House ads are showing.</p>
              <Link href="/support" className="mt-2 inline-block rounded-full bg-sand-100 px-3 py-1.5 text-[12px] font-extrabold text-abyss-950">
                Choose a plan
              </Link>
            </>
          )}
        </div>

        <div className="nb-surface rounded-xl2 p-3.5">
          <p className="display text-base font-bold tracking-tight text-sand-100">Alert profiles</p>
          {subs.length ? (
            <ul className="mt-2 space-y-1.5 text-sm text-ink-300">
              {subs.map((s) => (
                <li key={s.id} className="rounded-lg bg-white/[.05] px-2 py-1.5">
                  <span className="font-bold text-ok-600">{s.verified ? "On" : "Unconfirmed"}</span> · {s.parishes.split(",").join(", ")}
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-1.5 text-sm text-ink-400">No alert profile yet.</p>
          )}
          <Link href="/alerts" className="mt-2 inline-block text-[12px] font-bold text-tide-300 hover:underline">
            Set up alerts →
          </Link>
        </div>

        {viewer.isEditor ? (
          <Link href="/admin" className="nb-surface block rounded-xl2 border-tide-400/30 bg-tide-500/10 px-3.5 py-3 text-[12.5px] font-bold text-tide-300 hover:bg-tide-500/16">
            Open {viewer.isAdmin ? "the admin area" : "the moderation area"} →
          </Link>
        ) : null}

        <div className="nb-surface flex items-center justify-between gap-2 rounded-xl2 px-3 py-2.5">
          <p className="num text-xs text-ink-400">Signed in as @{viewer.handle}</p>
          <SignOut />
        </div>
      </aside>
    </div>
  );
}
