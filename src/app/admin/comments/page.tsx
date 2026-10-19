import Link from "next/link";
import { desc, eq, gt, sql } from "drizzle-orm";
import { db } from "@/db";
import { comments } from "@/db/schema";
import { CommentModActions } from "@/components/admin-comment-actions";
import { FilterChips, Pager, Pill } from "@/components/admin-ui";
import { timeAgo } from "@/lib/geo";
import { clampInt } from "@/lib/validate";

export const dynamic = "force-dynamic";
export const metadata = { title: "Comments" };

const PAGE = 20;
const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

export default async function CommentsAdmin({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  // The admin layout has already turned non-staff away.
  const sp = await searchParams;
  const view = ["flagged", "hidden", "all"].includes(first(sp.view) ?? "") ? (first(sp.view) as string) : "flagged";
  const page = clampInt(first(sp.page), 1, 1, 100000);

  const where = view === "hidden" ? eq(comments.status, "hidden") : view === "all" ? undefined : gt(comments.flagCount, 0);
  const [{ n }] = await db.select({ n: sql<number>`count(*)::int` }).from(comments).where(where);
  const pages = Math.max(1, Math.ceil(n / PAGE));
  const rows = await db
    .select({
      c: comments,
      reasons: sql<string | null>`(select string_agg(distinct f.reason, ', ') from comment_flags f where f.comment_id = "comments"."id")`,
      aiFlagged: sql<boolean>`coalesce((select bool_or(f.actor_key = 'ai:mod') from comment_flags f where f.comment_id = "comments"."id"), false)`,
    })
    .from(comments)
    .where(where)
    .orderBy(desc(comments.flagCount), desc(comments.createdAt))
    .limit(PAGE)
    .offset((Math.min(page, pages) - 1) * PAGE);

  const params = { view: view === "flagged" ? undefined : view };
  const where2 = (c: (typeof rows)[number]["c"]) =>
    c.postId ? { href: `/life/${c.postId}`, label: "an Island Life post" } : c.incidentId ? { href: `/incident/${c.incidentId}`, label: "a map pin" } : { href: `/wire/${c.newsId}`, label: "a news story" };

  return (
    <div className="space-y-4">
      <div className="glass rounded-2xl p-3.5">
        <FilterChips
          label="Show"
          name="view"
          value={view === "flagged" ? "" : view}
          path="/admin/comments"
          params={params}
          options={[
            { value: "", label: "Reported" },
            { value: "hidden", label: "Hidden" },
            { value: "all", label: "Everything" },
          ]}
        />
      </div>
      <p className="text-[12px] text-secondary">
        {n} {n === 1 ? "comment" : "comments"}. Most reported first. Hiding a comment removes it from public view, and you can restore it. You can also hide a comment right where it appears.
      </p>

      <ul className="space-y-2">
        {rows.map(({ c, reasons, aiFlagged }) => {
          const t = where2(c);
          return (
            <li key={c.id} className="glass flex flex-wrap items-start justify-between gap-3 rounded-2xl p-3.5">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  {c.status === "hidden" ? <Pill tone="conch">Hidden</Pill> : c.status === "removed" ? <Pill tone="slate">Deleted by author</Pill> : null}
                  {c.flagCount > 0 ? (
                    <Pill tone="sun">
                      {c.flagCount} {c.flagCount === 1 ? "report" : "reports"}
                    </Pill>
                  ) : null}
                  {c.parentId ? <span className="text-[11.5px] text-secondary">a reply</span> : null}
                  <span className="text-[11.5px] text-tertiary">{timeAgo(c.createdAt)}</span>
                </div>
                <p className="mt-1.5 whitespace-pre-line break-words text-[13.5px] leading-relaxed text-primary">{c.body || "(blank)"}</p>
                <p className="mt-1 text-[12px] text-secondary">
                  by{" "}
                  <Link href={`/admin/users/${c.authorHandle}`} className="font-semibold text-text-accent hover:underline">
                    @{c.authorHandle}
                  </Link>{" "}
                  on{" "}
                  <Link href={`${t.href}#comments`} className="font-semibold text-text-accent hover:underline">
                    {t.label}
                  </Link>
                </p>
                {reasons ? (
                  <p className="mt-0.5 text-[12px] text-warn-400">
                    Reported as: {reasons}
                    {aiFlagged ? <span className="ml-1.5 rounded bg-accent/15 px-1 py-px align-middle text-[9.5px] font-extrabold uppercase tracking-wide text-text-accent">AI flag</span> : null}
                  </p>
                ) : null}
              </div>
              <CommentModActions id={c.id} status={c.status} flagged={c.flagCount > 0} />
            </li>
          );
        })}
        {rows.length === 0 ? (
          <li className="glass rounded-2xl p-5 text-center text-[13px] text-secondary">{view === "flagged" ? "No comments have been reported. All quiet." : "Nothing here."}</li>
        ) : null}
      </ul>
      <Pager page={Math.min(page, pages)} pages={pages} path="/admin/comments" params={params} />
    </div>
  );
}
