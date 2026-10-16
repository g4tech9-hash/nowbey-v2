import Link from "next/link";
import { notFound } from "next/navigation";
import { and, desc, eq, ilike, inArray, isNotNull, isNull, ne, or, sql, type SQL } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import { getViewer } from "@/lib/viewer";
import { timeAgo } from "@/lib/geo";
import { TIERS, isTierKey } from "@/lib/tiers";
import { clampInt, likeEscape, param } from "@/lib/validate";
import { FilterChips, Pager, Pill, SearchBox } from "@/components/admin-ui";
import { UserActions } from "@/components/user-actions";

export const dynamic = "force-dynamic";
export const metadata = { title: "Members" };

const PAGE = 25;
const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

export default async function MembersPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const viewer = await getViewer();
  if (!viewer.isAdmin) notFound();

  const sp = await searchParams;
  const q = param(first(sp.q), 80);
  const role = ["resident", "editor", "admin"].includes(first(sp.role) ?? "") ? (first(sp.role) as string) : "";
  const status = ["active", "suspended"].includes(first(sp.status) ?? "") ? (first(sp.status) as string) : "";
  const plan = ["free", "paid", "comp"].includes(first(sp.plan) ?? "") ? (first(sp.plan) as string) : "";
  const page = clampInt(first(sp.page), 1, 1, 100000);

  const conds: SQL[] = [];
  if (q) {
    const n = `%${likeEscape(q)}%`;
    const match = or(ilike(users.handle, n), ilike(users.displayName, n), ilike(users.email, n));
    if (match) conds.push(match);
  }
  if (role) conds.push(eq(users.role, role));
  if (status) conds.push(eq(users.status, status));
  if (plan === "free") conds.push(isNull(users.adFreeTier));
  if (plan === "comp") conds.push(eq(users.planStatus, "comp"));
  if (plan === "paid") {
    conds.push(isNotNull(users.adFreeTier));
    const notComp = or(isNull(users.planStatus), ne(users.planStatus, "comp"));
    if (notComp) conds.push(notComp);
  }
  const where = conds.length ? and(...conds) : undefined;

  const [{ n }] = await db.select({ n: sql<number>`count(*)::int` }).from(users).where(where);
  const pages = Math.max(1, Math.ceil(n / PAGE));
  const rows = await db
    .select({
      handle: users.handle,
      displayName: users.displayName,
      email: users.email,
      verified: users.emailVerifiedAt,
      role: users.role,
      status: users.status,
      tier: users.adFreeTier,
      planStatus: users.planStatus,
      joined: users.createdAt,
      lastLogin: users.lastLoginAt,
      reports: sql<number>`(select count(*)::int from incidents i where i.user_id = "users"."id")`,
      // A live broadcaster badge, so the row can show and revoke it without a
      // second query per member.
      broadcaster: sql<string | null>`(
        select b.reason from badge_grants b
        where b.user_id = \"users\".\"id\" and b.badge = 'broadcaster' and b.revoked_at is null
        limit 1
      )`,

    })
    .from(users)
    .where(where)
    .orderBy(desc(users.createdAt))
    .limit(PAGE)
    .offset((Math.min(page, pages) - 1) * PAGE);

  /**
   * Device bans per member, as a map rather than a subquery.
   *
   * device_bans is a new table. As a subquery inside the SELECT above it would
   * take the whole page down until add-admin-modules.sql has run, and a
   * half-migrated database must still be able to show the member list. One
   * guarded query that degrades to "no bans" is the honest failure mode.
   */
  const banCount = new Map<string, number>();
  try {
    const bans = await db
      .select({ handle: users.handle, n: sql<number>`count(*)::int` })
      .from(users)
      .innerJoin(
        sql`device_bans as d`,
        sql`d.user_id = "users"."id" and d.revoked_at is null and (d.expires_at is null or d.expires_at > now())`,
      )
      .where(inArray(users.handle, rows.map((r) => r.handle)))
      .groupBy(users.handle);
    for (const b of bans) banCount.set(b.handle, b.n);
  } catch (err) {
    console.warn("[admin/users] device_bans unavailable, showing no bans:", (err as Error).message);
  }

  const params = { q: q || undefined, role: role || undefined, status: status || undefined, plan: plan || undefined };

  return (
    <div className="space-y-4">
      <div className="glass space-y-3 rounded-2xl p-3.5">
        <SearchBox path="/admin/users" q={q} placeholder="Search handle, name or email" keep={{ role: params.role, status: params.status, plan: params.plan }} />
        <FilterChips
          label="Role"
          name="role"
          value={role}
          path="/admin/users"
          params={params}
          options={[
            { value: "", label: "Any" },
            { value: "resident", label: "Residents" },
            { value: "editor", label: "Editors" },
            { value: "admin", label: "Admins" },
          ]}
        />
        <FilterChips
          label="Plan"
          name="plan"
          value={plan}
          path="/admin/users"
          params={params}
          options={[
            { value: "", label: "Any" },
            { value: "free", label: "Free" },
            { value: "paid", label: "Paying" },
            { value: "comp", label: "Complimentary" },
          ]}
        />
        <FilterChips
          label="Status"
          name="status"
          value={status}
          path="/admin/users"
          params={params}
          options={[
            { value: "", label: "Any" },
            { value: "active", label: "Active" },
            { value: "suspended", label: "Suspended" },
          ]}
        />
      </div>

      <p className="text-[12px] text-[#8fb9b6]">
        {n} {n === 1 ? "member" : "members"}
        {q || role || plan || status ? " match" : ""}. Newest first.
      </p>

      <div className="glass nb-scroll overflow-x-auto rounded-2xl">
        <table className="w-full min-w-[820px] text-left text-[12.5px]">
          <thead className="text-[10.5px] uppercase tracking-wide text-[#6e97a0]">
            <tr>
              <th className="px-3 py-2">Member</th>
              <th className="px-2">Email</th>
              <th className="px-2">Role</th>
              <th className="px-2">Plan</th>
              <th className="px-2">Joined</th>
              <th className="px-2">Last sign-in</th>
              <th className="px-3 text-right">Reports</th>
              <th className="px-3 text-right">Manage</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.handle} className="border-t hairline align-top">
                <td className="px-3 py-2">
                  <Link href={`/admin/users/${r.handle}`} className="font-bold text-sand-100 hover:text-tide-300">
                    @{r.handle}
                  </Link>
                  <span className="block text-[11.5px] text-[#8fb9b6]">{r.displayName}</span>
                  {r.status === "suspended" ? <Pill tone="conch">Suspended</Pill> : null}
                </td>
                <td className="px-2 py-2">
                  {r.email ? (
                    <>
                      <span className="block max-w-[190px] truncate font-mono text-[11.5px] text-[#cfeee9]">{r.email}</span>
                      {r.verified ? <Pill tone="tide">Confirmed</Pill> : <Pill tone="sun">Unconfirmed</Pill>}
                    </>
                  ) : (
                    <span className="text-[#6e97a0]">none</span>
                  )}
                </td>
                <td className="px-2 py-2">
                  <Pill tone={r.role === "admin" ? "violet" : r.role === "editor" ? "tide" : "slate"}>{r.role}</Pill>
                </td>
                <td className="px-2 py-2">
                  {isTierKey(r.tier) ? (
                    <>
                      <span className="font-bold" style={{ color: TIERS[r.tier].tone }}>
                        {TIERS[r.tier].name}
                      </span>
                      <span className="block text-[11px] text-[#8fb9b6]">{r.planStatus === "comp" ? "complimentary" : (r.planStatus ?? "active")}</span>
                    </>
                  ) : (
                    <span className="text-[#6e97a0]">Free</span>
                  )}
                </td>
                <td className="px-2 py-2 text-[#8fb9b6]">{timeAgo(r.joined)}</td>
                <td className="px-2 py-2 text-[#8fb9b6]">{r.lastLogin ? timeAgo(r.lastLogin) : "never"}</td>
                <td className="px-3 py-2 text-right font-bold text-sand-100">{r.reports}</td>
                <td className="px-3 py-2 text-right">
                  <UserActions
                    row={{
                      handle: r.handle,
                      status: r.status,
                      isAdmin: r.role === "admin",
                      isSelf: r.handle === viewer.handle,
                      broadcaster: { granted: Boolean(r.broadcaster), reason: r.broadcaster },
                      deviceBans: { active: banCount.get(r.handle) ?? 0, total: banCount.get(r.handle) ?? 0 },
                    }}
                  />
                </td>
              </tr>
            ))}
            {rows.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-3 py-6 text-center text-[#8fb9b6]">
                  No members match that.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
      <Pager page={Math.min(page, pages)} pages={pages} path="/admin/users" params={params} />

      <p className="text-[11.5px] leading-relaxed text-[#6e97a0]">
        Making the first admin: put your handle in <code className="rounded bg-white/10 px-1">ADMIN_HANDLES</code> in the server settings. From then on you can promote others here.
      </p>
    </div>
  );
}
