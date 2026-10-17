import Link from "next/link";
import { notFound } from "next/navigation";
import { and, desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { adminAudit, bannedDevices, deviceTokens, incidents, memberNotes, pushTokens, users } from "@/db/schema";
import { badgeHistory } from "@/lib/profile";
import { getViewer } from "@/lib/viewer";
import { adminAccess, isEnvAdmin, normalizeHandle } from "@/lib/handles";
import { CATEGORIES, type CategoryKey, timeAgo } from "@/lib/geo";
import { TIERS, isTierKey } from "@/lib/tiers";
import { AdminUserActions } from "@/components/admin-user-actions";
import { Pill } from "@/components/admin-ui";

export const dynamic = "force-dynamic";
export const metadata = { title: "Member" };

const date = (d: Date | null) => (d ? d.toLocaleString("en-US", { day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit" }) : "never");

function Fact({ k, children }: { k: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="text-[11.5px] font-bold uppercase tracking-wide text-[#6e97a0]">{k}</dt>
      <dd className="mt-0.5 text-[13px] text-sand-100">{children}</dd>
    </div>
  );
}

export default async function MemberPage({ params }: { params: Promise<{ handle: string }> }) {
  const viewer = await getViewer();
  if (!viewer.isAdmin) notFound();
  const { handle } = await params;
  const [u] = await db.select().from(users).where(eq(users.handle, normalizeHandle(handle))).limit(1);
  if (!u) notFound();

  // Token previews only (first 8 chars) — the full token never leaves the server.
  const preview = (t: string) => `${t.slice(0, 8)}…`;
  const [reports, history, notes, badges, appDevices, webDevices, bans] = await Promise.all([
    db.select().from(incidents).where(eq(incidents.userId, u.id)).orderBy(desc(incidents.createdAt)).limit(8),
    db
      .select()
      .from(adminAudit)
      .where(and(eq(adminAudit.targetType, "user"), eq(adminAudit.targetId, u.id)))
      .orderBy(desc(adminAudit.createdAt))
      .limit(10),
    db.select().from(memberNotes).where(eq(memberNotes.userId, u.id)).orderBy(desc(memberNotes.createdAt)).limit(20),
    badgeHistory(u.id),
    db.select({ id: deviceTokens.id, token: deviceTokens.token, at: deviceTokens.updatedAt }).from(deviceTokens).where(eq(deviceTokens.userId, u.id)).orderBy(desc(deviceTokens.updatedAt)).limit(10),
    db.select({ id: pushTokens.id, token: pushTokens.token, platform: pushTokens.platform, at: pushTokens.lastSeenAt }).from(pushTokens).where(eq(pushTokens.userId, u.id)).orderBy(desc(pushTokens.lastSeenAt)).limit(10),
    // The ban table may not be migrated yet — a missing table must never hide the member page.
    db.select().from(bannedDevices).where(eq(bannedDevices.userId, u.id)).orderBy(desc(bannedDevices.createdAt)).limit(10).catch(() => []),
  ]);
  const devices = [
    ...appDevices.map((d) => ({ kind: "app" as const, id: d.id, label: `App · ${preview(d.token)}`, at: d.at })),
    ...webDevices.map((d) => ({ kind: "web" as const, id: String(d.id), label: `${d.platform === "web" ? "Browser" : d.platform} · ${preview(d.token)}`, at: d.at })),
  ];

  const tier = isTierKey(u.adFreeTier) ? TIERS[u.adFreeTier] : null;
  const payingViaStripe = Boolean(u.stripeSubscriptionId) && !["sandbox", "comp"].includes(u.planStatus ?? "");
  const envAdmin = isEnvAdmin(u.handle);
  const access = adminAccess(u);

  return (
    <div className="space-y-4">
      <Link href="/admin/users" className="text-[12px] font-bold text-tide-300 hover:underline">
        ← All members
      </Link>

      <div className="flex flex-wrap items-center gap-2">
        <h2 className="display text-[clamp(1.4rem,3.6vw,1.9rem)] font-extrabold text-sand-100">@{u.handle}</h2>
        <Pill tone={access.isAdmin ? "violet" : u.role === "editor" ? "tide" : "slate"}>{access.isAdmin ? "admin" : u.role}</Pill>
        {u.status === "suspended" ? <Pill tone="conch">Suspended</Pill> : null}
      </div>
      {u.status === "suspended" ? (
        <p className="rounded-xl bg-conch-500/12 px-3 py-2 text-[12.5px] text-conch-400">
          Suspended {date(u.suspendedAt)}
          {u.suspendedReason ? `: ${u.suspendedReason}` : "."}
        </p>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)]">
        <section className="glass rounded-2xl p-4">
          <p className="display text-[15px] font-bold text-sand-100">Details</p>
          <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-3">
            <Fact k="Name">{u.displayName}</Fact>
            <Fact k="Home island">{u.parish ?? "not set"}</Fact>
            <Fact k="Email">
              {u.email ? (
                <>
                  <span className="break-all font-mono text-[12px]">{u.email}</span>
                  <span className="mt-1 block">{u.emailVerifiedAt ? <Pill tone="tide">Confirmed</Pill> : <Pill tone="sun">Not confirmed</Pill>}</span>
                </>
              ) : (
                <span className="text-sun-400">none on file</span>
              )}
            </Fact>
            <Fact k="Plan">
              {tier ? (
                <>
                  <span className="font-bold" style={{ color: tier.tone }}>
                    {tier.name}
                  </span>
                  <span className="block text-[11.5px] text-[#8fb9b6]">
                    {u.planStatus === "comp" ? "complimentary" : `${u.planStatus ?? "active"}${u.planInterval ? `, ${u.planInterval}ly` : ""}`}
                  </span>
                </>
              ) : (
                "Free"
              )}
            </Fact>
            <Fact k="Joined">{date(u.createdAt)}</Fact>
            <Fact k="Last sign-in">{date(u.lastLoginAt)}</Fact>
            <Fact k="Password changed">{date(u.passwordChangedAt)}</Fact>
            <Fact k="Reports filed">{reports.length === 8 ? "8 or more" : reports.length}</Fact>
            {u.stripeCustomerId ? <Fact k="Stripe customer">{<span className="break-all font-mono text-[11.5px]">{u.stripeCustomerId}</span>}</Fact> : null}
          </dl>
        </section>

        <section className="glass rounded-2xl p-4">
          <p className="display text-[15px] font-bold text-sand-100">Manage</p>
          <div className="mt-3">
            <AdminUserActions
              handle={u.handle}
              role={u.role}
              suspended={u.status === "suspended"}
              tier={u.adFreeTier}
              payingViaStripe={payingViaStripe}
              isSelf={u.id === viewer.userId}
              envAdmin={envAdmin}
              targetIsAdmin={u.role === "admin" || envAdmin}
              hasEmail={Boolean(u.email)}
              emailVerified={Boolean(u.emailVerifiedAt)}
              badges={badges}
              // Dynamic server page: evaluate expiry once per request, not in the client render.
              // eslint-disable-next-line react-hooks/purity
              badgeCheckAt={Date.now()}
              devices={devices}
              bans={bans.map((b) => ({ id: b.id, platform: b.platform, reason: b.reason, at: b.createdAt }))}
            />
          </div>
        </section>
      </div>

      {/* Why this account is (or is not) staff — the same verdict the member sees on /admin-access,
          so an admin answering "why can't they open /admin?" is never guessing. */}
      <section className={`rounded-2xl p-4 ${access.isAdmin ? "bg-tide-500/12" : "bg-sun-500/12"}`}>
        <p className="display text-[15px] font-bold text-sand-100">
          {access.isAdmin ? "Admin access" : "No admin access"}
        </p>
        <p className="mt-1.5 text-[12.5px] leading-relaxed text-sand-100/90">{access.reason}</p>
      </section>

      <section className="glass rounded-2xl p-4">
        <p className="display text-[15px] font-bold text-sand-100">Recent reports</p>
        {reports.length ? (
          <ul className="mt-2 divide-y divide-white/5">
            {reports.map((r) => {
              const c = CATEGORIES[r.category as CategoryKey] ?? CATEGORIES.notice;
              return (
                <li key={r.id} className="flex items-center gap-2.5 py-2">
                  <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: c.color }} />
                  <Link href={`/incident/${r.id}`} className="min-w-0 flex-1 truncate text-[13px] font-semibold text-sand-100 hover:text-tide-300">
                    {r.title}
                  </Link>
                  <span className="shrink-0 text-[11.5px] text-[#8fb9b6]">
                    {r.status} · {timeAgo(r.createdAt)}
                  </span>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="mt-2 text-[12.5px] text-[#6e97a0]">No reports filed under this account.</p>
        )}
      </section>

      <section className="glass rounded-2xl p-4">
        <p className="display text-[15px] font-bold text-sand-100">Staff notes</p>
        <p className="mt-0.5 text-[12.5px] text-[#8fb9b6]">
          Sentences a person wrote about this member. Append-only, admin-only, and never shown to them — add a note in the Manage panel above.
        </p>
        {notes.length ? (
          <ul className="mt-3 space-y-2">
            {notes.map((n) => (
              <li key={n.id} className="rounded-xl border hairline p-3">
                <p className="text-[12.5px] leading-relaxed text-[#cfeee9]">{n.body}</p>
                <p className="mt-1 text-[11.5px] text-[#6e97a0]">
                  @{n.authorHandle} · {timeAgo(n.createdAt)}
                </p>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-2 text-[12.5px] text-[#6e97a0]">No notes yet.</p>
        )}
      </section>

      <section className="glass rounded-2xl p-4">
        <p className="display text-[15px] font-bold text-sand-100">Staff activity on this member</p>
        {history.length ? (
          <ul className="mt-2 divide-y divide-white/5 text-[12.5px]">
            {history.map((h) => (
              <li key={h.id} className="py-2">
                <span className="font-mono text-[11.5px] text-tide-300">{h.action}</span> <span className="text-[#cfeee9]">by @{h.actorHandle}</span>
                {h.detail ? <span className="text-[#8fb9b6]"> · {h.detail}</span> : null}
                <span className="block text-[11.5px] text-[#6e97a0]">{timeAgo(h.createdAt)}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-2 text-[12.5px] text-[#6e97a0]">Nothing yet.</p>
        )}
      </section>
    </div>
  );
}
