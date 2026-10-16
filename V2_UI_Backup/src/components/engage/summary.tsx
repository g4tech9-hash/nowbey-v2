import Link from "next/link";
import { REACTIONS, topReactions, type Engagement } from "@/lib/engage-kinds";

/** A read-only line for cards in lists: the top reactions, the comment count, and a link into the conversation. */
export function EngagementSummary({ eng, href }: { eng: Engagement; href: string }) {
  const top = topReactions(eng.counts);
  const quiet = eng.total === 0 && eng.comments === 0;
  return (
    <Link href={`${href}#comments`} className="inline-flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px] font-semibold text-[#a9cdc9] hover:text-tide-300">
      {eng.total > 0 ? (
        <span aria-label={`${eng.total} ${eng.total === 1 ? "reaction" : "reactions"}`}>
          <span aria-hidden="true">{top.map((k) => REACTIONS[k].emoji).join("")}</span> {eng.total}
        </span>
      ) : null}
      {eng.comments > 0 ? (
        <span>
          {eng.comments} {eng.comments === 1 ? "comment" : "comments"}
        </span>
      ) : null}
      {quiet ? <span>Join the conversation</span> : null}
    </Link>
  );
}
