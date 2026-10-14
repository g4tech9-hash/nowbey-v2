import Link from "next/link";
import { eq, ne, sql } from "drizzle-orm";
import { db } from "@/db";
import { enterpriseInquiries, incidents, newsItems, users } from "@/db/schema";
import { getViewer } from "@/lib/viewer";
import { stripeConfigured, webhookConfigured } from "@/lib/billing";
import { mailConfigured } from "@/lib/mail";
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
        <p className="text-[13px] text-[#a9cdc9]">
          As an editor you can resolve, hide or restore reports and decide which reader links go on the wire. Open{" "}
          <Link href="/admin/reports" className="font-bold text-tide-300 underline">
            Reports
          </Link>{" "}
          or{" "}
          <Link href="/admin/wire" className="font-bold text-tide-300 underline">
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

  const checks: [string, boolean, string][] = [
    ["Payments (Stripe key)", stripeConfigured(), "Add STRIPE_SECRET_KEY. Until then plans are disabled."],
    ["Payment webhook", webhookConfigured(), "Add STRIPE_WEBHOOK_SECRET so paid plans switch on and off by themselves."],
    ["Email sending", mailConfigured(), "Add SMTP_HOST, SMTP_USER and SMTP_PASS (for example a Gmail app password), or RESEND_API_KEY. Without one, confirmation, password-reset and alert emails cannot be sent."],
    ["Enterprise notifications", Boolean(process.env.ENTERPRISE_NOTIFY_TO), "Add ENTERPRISE_NOTIFY_TO to be emailed when an enquiry arrives."],
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
      </section>

      <section className="grid gap-3 lg:grid-cols-2">
        <MiniBars title="New members" data={signups.rows as Point[]} />
        <MiniBars title="Reports filed" data={filed.rows as Point[]} />
      </section>

      <section className="glass rounded-2xl p-4">
        <p className="display text-[15px] font-bold text-sand-100">Island Life places</p>
        <p className="mt-1 text-[13px] text-[#a9cdc9]">Fills the place directory with bars, restaurants, cafes and beaches from OpenStreetMap. Run it once, and again whenever you want new venues.</p>
        <div className="mt-3">
          <PlaceImportButton />
        </div>
      </section>

      <section className="glass rounded-2xl p-4">
        <p className="display text-[15px] font-bold text-sand-100">Setup checklist</p>
        <ul className="mt-2 space-y-2">
          {checks.map(([label, ok, help]) => (
            <li key={label} className="flex items-start gap-2.5 text-[13px]">
              <span className={`mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full text-[11px] font-black ${ok ? "bg-tide-500 text-abyss-950" : "bg-sun-500/25 text-sun-400"}`}>
                {ok ? "✓" : "!"}
              </span>
              <span>
                <span className="font-bold text-sand-100">{label}</span>
                <span className="block text-[12px] text-[#8fb9b6]">{ok ? "Set up." : help}</span>
              </span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
