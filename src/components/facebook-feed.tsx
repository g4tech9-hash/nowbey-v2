import Link from "next/link";
import { fetchFacebookPosts } from "@/lib/facebook";
import { timeAgo } from "@/lib/geo";
import { Panel, SectionTitle } from "@/components/ui";

/**
 * "On Facebook" rail panel for the wire page: the tracked page's latest posts through
 * the /api/rss/facebook converter, plus the feed link so readers can subscribe.
 * Renders nothing when the converter cannot see the page (login wall, no bridge
 * configured) — a missing panel is honest, an empty box is not.
 */
export async function FacebookFeedPanel({ username }: { username: string }) {
  let posts: Awaited<ReturnType<typeof fetchFacebookPosts>>["posts"] = [];
  try {
    ({ posts } = await fetchFacebookPosts(username, process.env, 5000));
  } catch {
    return null;
  }
  if (!posts.length) return null;

  return (
    <Panel className="rounded-[20px] p-4">
      <SectionTitle>On Facebook</SectionTitle>
      <p className="num mt-1.5 text-[12px] leading-snug text-ink-400">
        Latest posts on the page we follow, converted to a feed on our own wire.
      </p>
      <ul className="mt-3 space-y-2.5">
        {posts.slice(0, 4).map((p) => (
          <li key={p.url} className="min-w-0">
            <a href={p.url} target="_blank" rel="noreferrer" className="block min-w-0">
              <span className="block truncate text-[12.5px] font-semibold text-ink-200">
                {(p.text.split("\n").find((l) => l.trim()) ?? "Posted a photo").slice(0, 90)}
              </span>
              <span className="num text-[11px] text-ink-400">
                facebook.com · {timeAgo(p.publishedAt)}
              </span>
            </a>
          </li>
        ))}
      </ul>
      <p className="mt-3 border-t hairline pt-3 text-[12px] leading-[1.75] text-ink-400">
        Subscribe in any reader:{" "}
        <Link href={`/api/rss/facebook?url=https://www.facebook.com/${username}/`} className="nb-textlink">
          RSS feed
        </Link>
      </p>
    </Panel>
  );
}
