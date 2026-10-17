import { BadgeMark } from "@/components/verified-badge";
import { listComments, type CommentNode } from "@/lib/engage";
import type { TargetType } from "@/lib/engage-kinds";
import { timeAgo } from "@/lib/geo";
import type { Viewer } from "@/lib/viewer";
import { CommentComposer, CommentTools } from "./comment-ui";

const TAG = "rounded-full px-2 py-0.5 text-[11.5px] font-extrabold uppercase tracking-wide";

function Row({ c, type, id, viewer, open }: { c: CommentNode; type: TargetType; id: string; viewer: Viewer; open: boolean }) {
  const staff = viewer.isEditor;

  return (
    <li className="rounded-xl bg-white/[.045] px-3.5 py-2.5">
      {c.placeholder ? (
        <p className="text-[12.5px] italic text-ink-400">{c.status === "hidden" ? "This comment was hidden by a moderator." : "This comment was deleted."}</p>
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-2 text-[12px]">
            <span className="font-bold text-sand-100">@{c.authorHandle}</span>
            <BadgeMark kind={c.badge} />
            <span className="text-ink-400">{timeAgo(c.createdAt)}</span>
            {staff && c.status === "hidden" ? <span className={`${TAG} bg-danger-500/15 text-danger-500`}>Hidden</span> : null}
            {staff && c.status === "removed" ? <span className={`${TAG} bg-white/10 text-ink-200`}>Deleted by author</span> : null}
            {staff && c.flagCount > 0 ? (
              <span className={`${TAG} bg-sun-500/15 text-sun-600`}>
                {c.flagCount} {c.flagCount === 1 ? "report" : "reports"}
              </span>
            ) : null}
          </div>
          <p className="mt-1 whitespace-pre-line break-words text-[13.5px] leading-relaxed text-ink-200">{c.body || "(deleted)"}</p>
          {c.status !== "removed" ? (
            <CommentTools
              type={type}
              id={id}
              commentId={c.id}
              handle={c.authorHandle}
              mine={c.mine}
              canReply={open && c.status === "published"}
              canReport={c.status === "published"}
              canDelete={c.mine || staff}
              staffAction={staff ? (c.status === "hidden" ? "restore" : "hide") : null}
              signedIn={viewer.signedIn}
            />
          ) : null}
        </>
      )}

      {c.replies.length ? (
        <ol className="mt-2.5 space-y-2 border-l-2 border-white/10 pl-3">
          {c.replies.map((r) => (
            <Row key={r.id} c={r} type={type} id={id} viewer={viewer} open={open} />
          ))}
        </ol>
      ) : null}
    </li>
  );
}

/** The whole conversation under a post, a pin or a news story: the box, the thread and the replies. */
export async function Discussion({ type, id, viewer, open }: { type: TargetType; id: string; viewer: Viewer; open: boolean }) {
  const { nodes, total, truncated } = await listComments(type, id, viewer);
  return (
    <section id="comments" className="scroll-mt-24">
      <p className="display text-[15px] font-extrabold text-sand-100">
        {total} {total === 1 ? "comment" : "comments"}
      </p>
      {open ? (
        <div className="mt-2.5">
          <CommentComposer type={type} id={id} signedIn={viewer.signedIn} />
        </div>
      ) : (
        <p className="mt-2 text-[12.5px] text-ink-400">Comments are closed while this is hidden.</p>
      )}
      <ol className="mt-3 space-y-2.5">
        {nodes.map((c) => (
          <Row key={c.id} c={c} type={type} id={id} viewer={viewer} open={open} />
        ))}
        {nodes.length === 0 ? <li className="text-[12.5px] text-ink-400">No comments yet. Be the first.</li> : null}
      </ol>
      {truncated ? <p className="mt-2 text-[11.5px] text-ink-400">Showing the 200 most recent conversations. Older ones are not shown.</p> : null}
    </section>
  );
}
