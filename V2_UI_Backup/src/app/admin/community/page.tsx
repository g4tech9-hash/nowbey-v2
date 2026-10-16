import Link from "next/link";
import { desc, eq, gt, sql } from "drizzle-orm";
import { db } from "@/db";
import { posts } from "@/db/schema";
import { PostModActions } from "@/components/admin-community-actions";
import { FilterChips, Pager, Pill } from "@/components/admin-ui";
import { timeAgo } from "@/lib/geo";
import { KINDS, type KindKey } from "@/lib/life-kinds";
import { clampInt } from "@/lib/validate";
import { engagementFor } from "@/lib/engage";
import { NO_ENGAGEMENT } from "@/lib/engage-kinds";
import { getViewer } from "@/lib/viewer";

export const dynamic = "force-dynamic";
export const metadata = { title: "Community" };

const PAGE = 20;
const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

export default async function CommunityAdmin({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const viewer = await getViewer(); // the layout has already turned non-staff away
  const sp = await searchParams;
  const view = ["flagged", "hidden", "all"].includes(first(sp.view) ?? "") ? (first(sp.view) as string) : "flagged";
  const page = clampInt(first(sp.page), 1, 1, 100000);

  const where = view === "hidden" ? eq(posts.status, "hidden") : view === "all" ? undefined : gt(posts.flagCount, 0);
  const [{ n }] = await db.select({ n: sql<number>`count(*)::int` }).from(posts).where(where);
  const pages = Math.max(1, Math.ceil(n / PAGE));
  const rows = await db
    .select({
      post: posts,
      reasons: sql<string | null>`(select string_agg(distinct f.reason, ', ') from post_flags f where f.post_id = "posts"."id")`,
      aiFlagged: sql<boolean>`coalesce((select bool_or(f.actor_key = 'ai:mod') from post_flags f where f.post_id = "posts"."id"), false)`,
    })
    .from(posts)
    .where(where)
    .orderBy(desc(posts.flagCount), desc(posts.createdAt))
    .limit(PAGE)
    .offset((Math.min(page, pages) - 1) * PAGE);

  const engMap = await engagementFor("post", rows.map((r) => r.post.id), null);
  const params = { view: view === "flagged" ? undefined : view };

  return (
    <div className="space-y-4">
      <div className="glass rounded-2xl p-3.5">
        <FilterChips
          label="Show"
          name="view"
          value={view === "flagged" ? "" : view}
          path="/admin/community"
          params={params}
          options={[
            { value: "", label: "Reported" },
            { value: "hidden", label: "Hidden" },
            { value: "all", label: "Everything" },
          ]}
        />
      </div>
      <p className="text-[12px] text-[#8fb9b6]">
        {n} {n === 1 ? "post" : "posts"}. Most reported first. Hiding a post removes it, its photos and its comments from public view, and you can restore it.
      </p>

      <ul className="space-y-2">
        {rows.map(({ post: p, reasons, aiFlagged }) => {
          const k = KINDS[p.kind as KindKey] ?? KINDS.tip;
          return (
            <li key={p.id} className="glass flex flex-wrap items-start justify-between gap-3 rounded-2xl p-3.5" style={{ boxShadow: `inset 3px 0 0 ${k.color}` }}>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[11px] font-extrabold uppercase tracking-wide" style={{ color: k.color }}>
                    {k.label}
                  </span>
                  {p.status === "hidden" ? <Pill tone="conch">Hidden</Pill> : null}
                  {p.flagCount > 0 ? (
                    <Pill tone="sun">
                      {p.flagCount} {p.flagCount === 1 ? "report" : "reports"}
                    </Pill>
                  ) : null}
                  <span className="text-[11.5px] text-[#6e97a0]">{timeAgo(p.createdAt)}</span>
                </div>
                <Link href={`/life/${p.id}`} className="mt-1 block text-[14.5px] font-bold text-sand-100 hover:text-tide-300">
                  {p.title}
                </Link>
                <p className="mt-0.5 text-[12px] text-[#8fb9b6]">
                  by{" "}
                  <Link href={`/admin/users/${p.authorHandle}`} className="font-semibold text-tide-300 hover:underline">
                    @{p.authorHandle}
                  </Link>{" "}
                  · {p.parish ?? "no island"} · {p.photoCount} {p.photoCount === 1 ? "photo" : "photos"} · {(engMap.get(p.id) ?? NO_ENGAGEMENT).comments} comments · {(engMap.get(p.id) ?? NO_ENGAGEMENT).total} reactions
                </p>
                {reasons ? (
                  <p className="mt-0.5 text-[12px] text-sun-400">
                    Reported as: {reasons}
                    {aiFlagged ? <span className="ml-1.5 rounded bg-tide-500/15 px-1 py-px align-middle text-[9.5px] font-extrabold uppercase tracking-wide text-tide-300">AI flag</span> : null}
                  </p>
                ) : null}
              </div>
              <PostModActions id={p.id} status={p.status} flagged={p.flagCount > 0} canDelete={viewer.isAdmin} />
            </li>
          );
        })}
        {rows.length === 0 ? (
          <li className="glass rounded-2xl p-5 text-center text-[13px] text-[#8fb9b6]">{view === "flagged" ? "Nothing has been reported. All quiet." : "Nothing here."}</li>
        ) : null}
      </ul>
      <Pager page={Math.min(page, pages)} pages={pages} path="/admin/community" params={params} />
    </div>
  );
}
