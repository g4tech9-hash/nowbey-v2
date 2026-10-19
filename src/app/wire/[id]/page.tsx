import Link from "next/link";
import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { db, hasDatabase } from "@/db";
import { DatabaseSetup } from "@/components/db-setup";
import { newsItems } from "@/db/schema";
import { AdSlot } from "@/components/ad-slot";
import { Discussion } from "@/components/engage/discussion";
import { ReactionBar } from "@/components/engage/reaction-bar";
import { MapPanel } from "@/components/map/map-panel";
import { engagementFor } from "@/lib/engage";
import { NO_ENGAGEMENT } from "@/lib/engage-kinds";
import { CATEGORIES, type CategoryKey, timeAgo } from "@/lib/geo";
import { UUID_RE } from "@/lib/validate";
import { getViewer } from "@/lib/viewer";
import { stripMarkup } from "@/lib/sanitize";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  // No database configured → the page below renders the setup notice, so keep the title generic.
  if (!hasDatabase()) return { title: "News wire" };
  if (!UUID_RE.test(id)) return { title: "Story not found" };
  const [row] = await db.select({ title: newsItems.title, review: newsItems.review }).from(newsItems).where(eq(newsItems.id, id)).limit(1);
  return { title: row && row.review === "approved" ? row.title : "News wire" };
}

export default async function StoryPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!hasDatabase()) {
    return (
      <DatabaseSetup
        eyebrow="News wire"
        title="This story opens once the database is connected"
        blurb="The wire needs its database before any story can be read and discussed here. This deployment just needs its DATABASE_URL first."
      />
    );
  }
  if (!UUID_RE.test(id)) notFound();
  const [story] = await db.select().from(newsItems).where(eq(newsItems.id, id)).limit(1);
  if (!story) notFound();

  const viewer = await getViewer();
  const open = story.review === "approved";
  // A link that is still waiting for review is only for staff.
  if (!open && !viewer.isEditor) notFound();

  const eng = (await engagementFor("news", [id], viewer.userId)).get(id) ?? NO_ENGAGEMENT;
  const c = CATEGORIES[story.category as CategoryKey] ?? CATEGORIES.notice;
  let host = "the source";
  try {
    host = new URL(story.url).host.replace(/^www\./, "");
  } catch {
    /* keep the generic label */
  }

  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
      <article className="min-w-0">
        <Link href="/wire" className="text-[12px] font-bold text-text-accent hover:underline">
          ← News wire
        </Link>

        {!open ? <p className="mt-2 rounded-xl bg-warn-500/12 px-3.5 py-2.5 text-[12.5px] text-warn-600">This link is waiting for review, so only staff can see it.</p> : null}

        <div className="mt-2 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[11.5px] font-bold uppercase tracking-wide">
          <span style={{ color: c.color }}>{c.label}</span>
          <span className="normal-case tracking-normal text-tertiary">
            {story.sourceName} · {timeAgo(story.publishedAt)}
          </span>
          {story.parish ? <span className="rounded-full bg-white/8 px-2 py-0.5 text-[11.5px] normal-case tracking-normal text-secondary">{story.parish}</span> : null}
        </div>

        <h1 className="display mt-2 text-[clamp(1.5rem,4vw,2.1rem)] font-extrabold leading-[1.1] text-primary">{story.title}</h1>
        {story.aiSummary ? (
          <p className="mt-3 max-w-[68ch] text-[14.5px] leading-relaxed text-secondary">
            <span className="mr-1.5 rounded bg-accent/15 px-1 py-px align-middle text-[9.5px] font-extrabold uppercase tracking-wide text-text-accent">AI brief</span>
            {stripMarkup(story.aiSummary)}
          </p>
        ) : story.summary ? (
          <p className="mt-3 max-w-[68ch] text-[14.5px] leading-relaxed text-secondary">{stripMarkup(story.summary)}</p>
        ) : null}

        <a
          href={story.url}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-4 inline-block rounded-full bg-primary px-4 py-2 text-[13px] font-extrabold text-on-accent hover:bg-white"
        >
          Read the full story at {host} ↗
        </a>

        {story.lat !== null && story.lng !== null ? (
          <div className="mt-5 overflow-hidden rounded-2xl border border-accent/20">
            <MapPanel
              mode="browse"
              center={[story.lat, story.lng]}
              zoom={14}
              initialLayer="hybrid"
              className="h-[240px] w-full"
              pins={[{ id: story.id, lat: story.lat, lng: story.lng, category: story.category as CategoryKey, title: story.title, meta: story.sourceName }]}
            />
          </div>
        ) : null}

        {open ? (
          <div className="mt-5">
            <p className="mb-1.5 text-[11.5px] font-bold uppercase tracking-wide text-accent-hover">What do you think?</p>
            <ReactionBar type="news" id={story.id} initial={eng} signedIn={viewer.signedIn} />
          </div>
        ) : null}

        <div className="mt-7">
          <Discussion type="news" id={story.id} viewer={viewer} open={open} />
        </div>
      </article>

      <aside className="space-y-4">
        <div className="nb-surface rounded-xl2 p-3.5 text-[12.5px] leading-relaxed text-tertiary">
          <p className="display text-[14.5px] font-bold text-primary">About this story</p>
          <p className="mt-1.5">
            NowBey shows the headline and a short summary, and links to the outlet for the full story. The conversation here is between NowBey members, so please keep it kind.
          </p>
        </div>
        <AdSlot index={1} adFree={viewer.adFree} variant="rail" />
      </aside>
    </div>
  );
}
