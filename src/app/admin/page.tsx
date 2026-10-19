import Link from "next/link";
import { desc, eq, gte, ne, sql } from "drizzle-orm";
import { db } from "@/db";
import { clientErrors, enterpriseInquiries, incidents, newsItems, users } from "@/db/schema";
import { getViewer } from "@/lib/viewer";
import { stripeConfigured, webhookConfigured } from "@/lib/billing";
import { aiBudgetStatus, aiConfigured } from "@/lib/ai";
import { githubConfigured } from "@/lib/error-ai";
import { googleConfigured } from "@/lib/geocode";
import { timeAgo } from "@/lib/geo";
import { mailConfigured } from "@/lib/mail";
import { moderationOn } from "@/lib/moderation";
import { pushConfigured } from "@/lib/push";
import { CrashDismissButton } from "@/components/admin-errors";
import { MiniBars, StatCard } from "@/components/admin-ui";
import { PlaceImportButton } from "@/components/admin-place-import";

export const dynamic = "force-dynamic";
export const metadata = { title: "Overview" };

type Point = { label: string; n: number };

export default async function AdminOverview() {
  const viewer = await getViewer();

  const [[rep], [wire]] = await Promise.all([
    db
      .select({
        open: sql<number>`count(*) filter (where status = 'active')::int`,
        hidden: sql<number>`count(*) filter (where status = 'archived')::int`,
        today: sql<number>`count(*) filter (where created_at > now() - interval '24 hours' and status <> 'archived')::int`,
      })
      .from(incidents),
    db.select({ pending: sql<number>`count(*) filter (where review = 'pending')::int`, total: sql<number>`count(*) filter (where review = 'approved')::int` }).from(newsItems),
  ]);

  if (!viewer.isAdmin) {
    return (
      <div className="space-y-4">
        <section className="grid gap-3 sm:grid-cols-3">
          <StatCard label="Open reports" value={rep.open} sub={`${rep.today} filed in the last day`} />
          <StatCard label="Links waiting" value={wire.pending} sub="from readers" tone={wire.pending ? "warn" : undefined} />
          <StatCard label="Hidden reports" value={rep.hidden} sub="removed from public view" />
        </section>
        <p className="text-[13px] text-secondary">
          As an editor you can resolve, hide or restore reports and decide which reader links go on the wire. Open{" "}
          <Link href="/admin/reports" className="font-bold text-text-accent underline">
            Reports
          </Link>{" "}
          or{" "}
          <Link href="/admin/wire" className="font-bold text-text-accent underline">
            Wire
          </Link>{" "}
          to start.
        </p>
      </div>
    );
  }

  const [[people], [inq], signups, filed] = await Promise.all([
    db
      .select({
        total: sql<number>`count(*)::int`,
        week: sql<number>`count(*) filter (where created_at > now() - interval '7 days')::int`,
        paid: sql<number>`count(*) filter (where ad_free_tier is not null)::int`,
        suspended: sql<number>`count(*) filter (where status = 'suspended')::int`,
        unverified: sql<number>`count(*) filter (where email is not null and email_verified_at is null)::int`,
        noEmail: sql<number>`count(*) filter (where email is null)::int`,
      })
      .from(users),
    db.select({ fresh: sql<number>`count(*)::int` }).from(enterpriseInquiries).where(eq(enterpriseInquiries.status, "new")),
    db.execute(
      sql`select to_char(d, 'Mon DD') as label, (select count(*)::int from users u where u.created_at::date = d::date) as n from generate_series(current_date - 13, current_date, interval '1 day') as d order by d`,
    ),
    db.execute(
      sql`select to_char(d, 'Mon DD') as label, (select count(*)::int from incidents i where i.created_at::date = d::date and i.status <> 'archived') as n from generate_series(current_date - 13, current_date, interval '1 day') as d order by d`,
    ),
  ]);
  void ne;

  // Crash records may not exist yet if add-client-errors.sql has not been run — never break the overview over that.
  let crashWeek = 0;
  let crashes: (typeof clientErrors.$inferSelect)[] = [];
  try {
    const [countRows, rows] = await Promise.all([
      db
        .select({ n: sql<number>`count(*)::int` })
        .from(clientErrors)
        .where(gte(clientErrors.lastSeenAt, new Date(Date.now() - 7 * 86_400_000))),
      db.select().from(clientErrors).orderBy(desc(clientErrors.lastSeenAt)).limit(10),
    ]);
    crashWeek = countRows[0]?.n ?? 0;
    crashes = rows;
  } catch {
    /* table not migrated yet */
  }

  const budget = await aiBudgetStatus();

  // The optional flag marks a row as not needed for the site to work. It shows neutral, not as a warning.
  const checks: [string, boolean, string, boolean?][] = [
    ["Payments (Stripe key)", stripeConfigured(), "Add STRIPE_SECRET_KEY. Until then plans are disabled."],
    ["Payment webhook", webhookConfigured(), "Add STRIPE_WEBHOOK_SECRET so paid plans switch on and off by themselves."],
    ["Email sending", mailConfigured(), "Add SMTP_HOST, SMTP_USER and SMTP_PASS (for example a Gmail app password), or RESEND_API_KEY. Without one, confirmation, password-reset and alert emails cannot be sent."],
    ["Enterprise notifications", Boolean(process.env.ENTERPRISE_NOTIFY_TO), "Add ENTERPRISE_NOTIFY_TO to be emailed when an enquiry arrives."],
    ["AI story briefs & digest writer (Gemini)", aiConfigured(), "Add GEMINI_API_KEY (aistudio.google.com, free tier). Wire stories get plain-English briefs and missing pins; the Community Digest writes its own first draft."],
    ["AI first-pass moderation", moderationOn(), "Uses GEMINI_API_KEY as well: new reports, comments, Island Life posts and uploaded photos get screened, and confident matches are queued for staff as flags. It never hides anything itself."],
    ["AI log diagnosis → GitHub fixes", githubConfigured(), "Uses GEMINI_API_KEY too: crash groups in Admin > Logs get an AI diagnosis you approve or dismiss. Add GITHUB_TOKEN (Issues read/write) + GITHUB_REPO=owner/repo so an approval becomes a GitHub issue for a human/Arena session to implement — the AI never edits code itself. Run add-error-ai.sql and schedule /api/cron/error-analysis first."],
    [
      `AI cost cap — ${budget.callsToday}/${budget.limit} calls today (~$${budget.estUsd.toFixed(2)})`,
      !budget.killSwitch && !budget.overLimit && budget.ledgerReady,
      budget.killSwitch
        ? "AI_ENABLED=false is set: every AI feature is on its plain fallback. Set AI_ENABLED=true (or remove it) and redeploy to turn AI back on."
        : budget.overLimit
          ? "Today's cap is spent — AI resumes tomorrow (UTC), or raise AI_DAILY_CALL_LIMIT and redeploy. Emergency stop at any time: AI_ENABLED=false."
          : "Run add-ai-usage.sql for shared counts across servers. Cap: AI_DAILY_CALL_LIMIT (default 500/day). Emergency stop: set AI_ENABLED=false and redeploy — see docs/AI_LOG_FIXES.md.",
    ],
    ["Push alerts (Firebase)", pushConfigured(), "Add FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL and FIREBASE_PRIVATE_KEY, plus the NEXT_PUBLIC_FIREBASE_* web keys. Until then visitors only see email alerts."],
    ["Geocoding fallback (Google)", googleConfigured(), "Add GOOGLE_MAPS_API_KEY with the Geocoding API enabled. Address searches and pin drops then fall back to Google when OpenStreetMap draws a blank — a big upgrade for Nassau streets.", true],
    ["Site address", Boolean(process.env.APP_URL), "Add APP_URL, your real https address. Emails will not send until it is set, so the links in them cannot be forged."],
    ["Session secret", Boolean(process.env.AUTH_SECRET), "Optional on a single server (a random one is saved in .data/). Set AUTH_SECRET if you run more than one server."],
  ];

  return (
    <div className="space-y-6">
      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Members" value={people.total} sub={`${people.week} joined this week`} />
        <StatCard label="On a plan" value={people.paid} sub="including complimentary" />
        <StatCard label="Open reports" value={rep.open} sub={`${rep.today} filed in the last day`} />
        <StatCard label="Links waiting" value={wire.pending} sub="from readers" tone={wire.pending ? "warn" : undefined} />
        <StatCard label="New enquiries" value={inq.fresh} sub="from Enterprise" tone={inq.fresh ? "warn" : undefined} />
        <StatCard label="Suspended" value={people.suspended} sub="members" />
        <StatCard label="Email not confirmed" value={people.unverified} sub="members" />
        <StatCard label="No email on file" value={people.noEmail} sub="cannot reset a password by email" />
        <StatCard label="Crashes (7d)" value={crashWeek} sub="browser + server error groups" tone={crashWeek ? "warn" : undefined} />
      </section>

      <section className="grid gap-3 lg:grid-cols-2">
        <MiniBars title="New members" data={signups.rows as Point[]} />
        <MiniBars title="Reports filed" data={filed.rows as Point[]} />
      </section>

      <section className="glass rounded-2xl p-4">
        <p className="display text-[15px] font-bold text-primary">Crashes</p>
        <p className="mt-1 text-[13px] text-secondary">
          Browser, server and app errors, grouped — one row per bug. If a beta tester says “the map died”, the answer is here. Needs add-client-errors.sql run first.{" "}
          <Link href="/admin/logs" className="font-bold text-text-accent underline">
            Open Logs &amp; AI fixes →
          </Link>{" "}
          for breadcrumbs, AI diagnoses and approving a fix.
        </p>
        {crashes.length ? (
          <ul className="mt-3 space-y-1.5">
            {crashes.map((e) => (
              <li key={e.id} className="flex flex-wrap items-center gap-x-2.5 gap-y-1 rounded-lg bg-white/4 px-3 py-2 text-[12px]">
                <span className={`shrink-0 rounded-full px-1.5 py-0.5 text-[11.5px] font-extrabold uppercase ${e.kind === "server" ? "bg-danger-500/20 text-danger-400" : e.kind === "boundary" ? "bg-warn-500/20 text-warn-400" : "bg-accent/18 text-text-accent"}`}>{e.kind}</span>
                <span className="min-w-0 flex-1 truncate font-semibold text-primary" title={e.message}>{e.message}</span>
                <span className="shrink-0 font-mono text-[11.5px] text-tertiary">{e.url ?? "—"}</span>
                <span className="shrink-0 text-secondary">×{e.count}</span>
                {e.handle ? <span className="shrink-0 text-secondary">@{e.handle}</span> : null}
                <span className="shrink-0 text-[11.5px] text-tertiary">{timeAgo(e.lastSeenAt)}</span>
                <span className="shrink-0"><CrashDismissButton id={e.id} /></span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-2 text-[12.5px] text-tertiary">Nothing on record — quiet is good.</p>
        )}
      </section>

      <section className="glass rounded-2xl p-4">
        <p className="display text-[15px] font-bold text-primary">Island Life places</p>
        <p className="mt-1 text-[13px] text-secondary">Fills the place directory with bars, restaurants, cafes and beaches from OpenStreetMap. Run it once, and again whenever you want new venues.</p>
        <div className="mt-3">
          <PlaceImportButton />
        </div>
      </section>

      <section className="glass rounded-2xl p-4">
        <p className="display text-[15px] font-bold text-primary">Setup checklist</p>
        <ul className="mt-2 space-y-2">
          {checks.map(([label, ok, help, optional]) => (
            <li key={label} className="flex items-start gap-2.5 text-[13px]">
              <span className={`mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full text-[11.5px] font-black ${ok ? "bg-accent text-on-accent" : optional ? "bg-hover text-secondary" : "bg-warn-500/25 text-warn-400"}`}>
                {ok ? "✓" : optional ? "–" : "!"}
              </span>
              <span>
                <span className="font-bold text-primary">{label}</span>
                <span className="block text-[12px] text-secondary">{ok ? "Set up." : optional ? `Optional, not in use. ${help}` : help}</span>
              </span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
