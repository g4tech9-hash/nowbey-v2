import Link from "next/link";
import { topReactions, type Engagement } from "@/lib/engage-kinds";
import { ReactionGlyph } from "./reaction-icons";

/** A read-only line for cards in lists: the top reactions, the comment count, and a link into the conversation. */
export function EngagementSummary({ eng, href }: { eng: Engagement; href: string }) {
  const top = topReactions(eng.counts);
  const quiet = eng.total === 0 && eng.comments === 0;
  return (
    <Link href={`${href}#comments`} className="inline-flex flex-wrap items-center gap-x-3 gap-y-1 text-xs font-semibold text-ink-200 transition duration-200 ease-standard hover:text-cyan">
      {eng.total > 0 ? (
        <span aria-label={`${eng.total} ${eng.total === 1 ? "reaction" : "reactions"}`} className="inline-flex items-center gap-1">
          <span className="flex items-center gap-0.5" aria-hidden="true">
            {top.map((k) => (
              <ReactionGlyph key={k} kind={k} size={13} />
            ))}
          </span>
          {eng.total}
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
