import Link from "next/link";
import { redirect } from "next/navigation";
import { and, desc, eq, ne, notInArray, or } from "drizzle-orm";
import { db } from "@/db";
import { alertSubscriptions, incidents } from "@/db/schema";
import { getViewer } from "@/lib/viewer";
import { ManageBillingButton, SignOut } from "@/components/client-actions";
import { ResendVerification } from "@/components/account-forms";
import { BadgeMark } from "@/components/verified-badge";
import { liveBadges } from "@/lib/profile";
import { CATEGORIES, type CategoryKey, timeAgo } from "@/lib/geo";
import { HIDDEN_STATUSES } from "@/lib/command";
import { TIERS } from "@/lib/tiers";
import { ButtonLink, Chip, EmptyState, Eyebrow, Panel, PanelHead, SectionTitle, StatTile, TextLink } from "@/components/ui";

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
          notInArray(incidents.status, HIDDEN_STATUSES),
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
    <div className="grid min-w-0 gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
      <div className="min-w-0 space-y-5">
        {/* Account hero — landing hero grammar, smaller. */}
        <div className="glass relative isolate overflow-hidden rounded-[24px] p-5 sm:p-6">
          <Eyebrow>@{viewer.handle}</Eyebrow>
          <h1 className="display mt-2.5 text-[clamp(1.7rem,4.4vw,2.45rem)] font-extrabold leading-[1.05] tracking-[-0.055em] text-sand-100">
            {viewer.displayName ?? viewer.handle}
          </h1>
          <p className="mt-2 text-[13px] leading-[1.75] text-ink-300">
            Home island {viewer.parish ?? "not set"} · {mine.length} report{mine.length === 1 ? "" : "s"} filed
          </p>
          {verifiedByPerson || viewer.isEditor ? (
            <p className="mt-3 flex flex-wrap gap-2">
              {verifiedByPerson ? <BadgeMark kind="verified" /> : null}
              {viewer.isEditor ? <BadgeMark kind="desk" /> : null}
            </p>
          ) : null}
          <div className="mt-4 flex flex-wrap gap-2">
            <ButtonLink href="/broadcast" variant="secondary" size="sm">
              Live broadcasts
            </ButtonLink>
            <ButtonLink href="/you/profile" variant="secondary" size="sm">
              Your profile
            </ButtonLink>
            <ButtonLink href="/you/settings" variant="secondary" size="sm">
              Account settings
            </ButtonLink>
          </div>
        </div>

        {/* Island Record: the numbers that say who you are on this island. */}
        <section aria-label="Your island record" className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
          <StatTile label="Reports" value={mine.length} />
          <StatTile
            label="Confirmed"
            value={mine.reduce((s, r) => s + r.confirmations, 0).toLocaleString("en-US")}
            tone="var(--color-ok-500)"
          />
          <StatTile label="Home island" value={viewer.parish ?? "Not set"} tone="var(--color-sand-100)" />
          <StatTile label="Plan" value={tier?.name ?? "Free"} tone={tier?.tone ?? "var(--color-ink-200)"} />
        </section>

        {welcome ? (
          <Panel className="rounded-[20px] border-tide-400/40 p-5">
            <SectionTitle>Welcome to NowBey, @{viewer.handle}</SectionTitle>
            <ol className="mt-2.5 space-y-2 text-[13px] text-ink-200">
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
          </Panel>
        ) : null}

        {!viewer.email ? (
          <Panel className="rounded-[20px] border-sun-500/35 p-4 text-[13px] leading-[1.75] text-ink-200">
            Your account has no email address, so we could not help you back in if you forgot your password.{" "}
            <Link href="/you/settings" className="font-bold text-sun-600 underline">
              Add one
            </Link>
            .
          </Panel>
        ) : !viewer.emailVerified ? (
          <Panel className="rounded-[20px] border-sun-500/35 p-4">
            <p className="text-[13px] leading-[1.75] text-ink-200">
              Confirm <strong className="text-sand-100">{viewer.email}</strong> so we can help if you forget your password.
            </p>
            <div className="mt-2.5">
              <ResendVerification />
            </div>
          </Panel>
        ) : null}

        <Panel className="rounded-[20px] p-4 sm:p-5">
          <PanelHead
            title="Your reports"
            actions={
              <>
                <Chip tone="tide">
                  <span className="num">{mine.reduce((s, r) => s + r.confirmations, 0)} confirmations collected</span>
                </Chip>
                <ButtonLink href="/report" variant="primary" size="sm">
                  + New report
                </ButtonLink>
              </>
            }
          />
          {mine.length ? (
            <ul className="mt-3.5 space-y-2">
              {mine.map((r) => {
                const c = CATEGORIES[r.category as CategoryKey] ?? CATEGORIES.notice;
                return (
                  <li key={r.id} className="nb-card-link rounded-[14px] border border-white/8 px-3.5 py-2.5">
                    <div className="flex items-start gap-2.5">
                      <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full" style={{ background: c.color, boxShadow: `0 0 8px ${c.color}80` }} />
                      <span className="min-w-0 flex-1">
                        <Link href={`/incident/${r.id}`} className="block text-[13.5px] font-bold tracking-[-0.02em] text-sand-100 transition duration-200 ease-standard hover:text-tide-300">
                          {r.title}
                        </Link>
                        <span className="num mt-0.5 block text-[11.5px] text-ink-400">
                          {r.street ?? "unmapped"} · {r.parish ?? "Bahamas"} · {timeAgo(r.createdAt)} · {r.status} · {r.confirmations} ✓
                        </span>
                      </span>
                    </div>
                  </li>
                );
              })}
            </ul>
          ) : (
            <EmptyState
              className="mt-3.5"
              title="Nothing filed yet"
              blurb="Reports you pin show up here with their confirmation counts."
              actions={
                <ButtonLink href="/report" variant="primary" size="sm">
                  Drop your first pin
                </ButtonLink>
              }
            />
          )}
        </Panel>
      </div>

      <aside className="min-w-0 space-y-4">
        <Panel className="rounded-[20px] p-4">
          <SectionTitle>Your plan</SectionTitle>
          {tier ? (
            <>
              <p className="num mt-1.5 text-[15px] font-extrabold" style={{ color: tier.tone }}>
                {tier.name}
                {viewer.status === "comp" ? "" : ` · ${viewer.interval === "year" ? "yearly" : "monthly"}`}
              </p>
              <p className="mt-1.5 text-[12px] leading-[1.75] text-ink-300">{planLine(viewer.status, viewer.renewsAt)}</p>
              <div className="mt-3.5 flex flex-wrap items-center gap-2">
                {viewer.status !== "comp" ? <ManageBillingButton demo={viewer.status === "sandbox"} /> : null}
                {viewer.tier === "admiral" ? (
                  // A file download, not a page, so a plain link is correct here.
                  // eslint-disable-next-line @next/next/no-html-link-for-pages
                  <a href="/api/export" className="nb-btn nb-btn-secondary nb-btn-sm">
                    Download my reports
                  </a>
                ) : null}
              </div>
            </>
          ) : (
            <>
              <p className="mt-1.5 text-[12px] leading-[1.75] text-ink-300">Free plan. House ads are showing.</p>
              <ButtonLink href="/support" variant="secondary" size="sm" className="mt-2.5">
                Choose a plan
              </ButtonLink>
            </>
          )}
        </Panel>

        <Panel className="rounded-[20px] p-4">
          <SectionTitle>Alert profiles</SectionTitle>
          {subs.length ? (
            <ul className="mt-2.5 space-y-1.5 text-[12px] text-ink-300">
              {subs.map((s) => (
                <li key={s.id} className="rounded-xl border border-white/8 bg-white/[.04] px-2.5 py-2">
                  <span className={`font-bold ${s.verified ? "text-ok-600" : "text-sun-600"}`}>
                    {s.verified ? "On" : "Unconfirmed"}
                  </span>{" "}
                  · {s.parishes.split(",").join(", ")}
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-2 text-[12px] leading-[1.75] text-ink-400">No alert profile yet.</p>
          )}
          <TextLink href="/alerts" className="mt-2.5">
            Set up alerts
          </TextLink>
        </Panel>

        {viewer.isEditor ? (
          <Link
            href="/admin"
            className="nb-surface nb-card-link block rounded-[20px] border-tide-400/30 px-4 py-3.5 text-[12.5px] font-bold text-tide-300"
          >
            Open {viewer.isAdmin ? "the admin area" : "the moderation area"} →
          </Link>
        ) : (
          <Link href="/admin-access" className="nb-surface nb-card-link block rounded-[20px] px-4 py-3.5 text-[12.5px] font-bold text-ink-300">
            Why can I not open the admin area?
          </Link>
        )}

        <div className="nb-surface flex items-center justify-between gap-2 rounded-[20px] px-3.5 py-2.5">
          <p className="num text-[11.5px] text-ink-400">Signed in as @{viewer.handle}</p>
          <SignOut />
        </div>
      </aside>
    </div>
  );
}
