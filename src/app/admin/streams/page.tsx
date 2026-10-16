import Link from "next/link";
import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { liveStreams } from "@/db/schema";
import { getViewer } from "@/lib/viewer";
import { timeAgo } from "@/lib/geo";
import { KillStreamButton } from "@/components/admin-stream-actions";
import { Pill } from "@/components/admin-ui";

export const dynamic = "force-dynamic";
export const metadata = { title: "Live streams" };

/**
 * Content Moderation → live grid. Every broadcast that is live right now, with the red button.
 * Data flow: the broadcaster's phone POSTs to /api/streams (playback URL from the streaming
 * provider) → this page reads the live rows → Kill calls PATCH /api/admin/streams, which flips
 * the row to "killed" so every client drops it.
 */
export default async function StreamsAdmin() {
  await getViewer(); // the layout has already turned non-staff away
  let live: (typeof liveStreams.$inferSelect)[] = [];
  let recent: (typeof liveStreams.$inferSelect)[] = [];
  let missingTable = false;
  try {
    [live, recent] = await Promise.all([
      db.select().from(liveStreams).where(eq(liveStreams.status, "live")).orderBy(desc(liveStreams.startedAt)).limit(24),
      db.select().from(liveStreams).where(eq(liveStreams.status, "killed")).orderBy(desc(liveStreams.endedAt)).limit(10),
    ]);
  } catch {
    // The migration (add-live-streams.sql) has not run yet — say so instead of 500ing.
    missingTable = true;
  }

  if (missingTable) {
    return (
      <div className="glass rounded-2xl p-5 text-[13px] text-[#a9cdc9]">
        Live broadcasts are not switched on yet. Run <span className="font-mono text-sand-100">add-live-streams.sql</span> on the
        database first (see TODO_HUMAN.md), then reload this page.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-[12px] text-[#8fb9b6]">
        {live.length} {live.length === 1 ? "broadcast" : "broadcasts"} live now. Killing a broadcast cuts viewers off immediately and
        records who stopped it and why. Going live is limited to members with the broadcaster badge — grant it on a{" "}
        <Link href="/admin/users" className="font-bold text-tide-300 underline">member page</Link>.
      </p>

      {live.length === 0 ? (
        <div className="glass rounded-2xl p-5 text-center text-[13px] text-[#8fb9b6]">Nobody is live right now.</div>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {live.map((s) => (
            <li key={s.id} className="glass space-y-2 rounded-2xl p-3.5">
              <div className="overflow-hidden rounded-xl bg-abyss-900/80">
                {s.playbackUrl ? (
                  <video key={s.playbackUrl} src={s.playbackUrl} controls playsInline className="aspect-video w-full" />
                ) : (
                  <div className="flex aspect-video w-full items-center justify-center text-[12px] text-[#6e97a0]">
                    No preview URL — audio/data broadcast
                  </div>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Pill tone="conch">● live</Pill>
                <span className="text-[11.5px] text-[#6e97a0]">{timeAgo(s.startedAt)}</span>
              </div>
              <p className="text-[14px] font-bold text-sand-100">{s.title}</p>
              <p className="text-[12px] text-[#8fb9b6]">
                by @{s.authorHandle}
                {s.incidentId ? (
                  <>
                    {" "}· covering <Link href={`/admin/reports/${s.incidentId}`} className="font-bold text-tide-300 underline">a report</Link>
                  </>
                ) : null}
              </p>
              <KillStreamButton id={s.id} />
            </li>
          ))}
        </ul>
      )}

      {recent.length ? (
        <div className="glass rounded-2xl p-4">
          <h3 className="mb-2 text-[13px] font-extrabold uppercase tracking-wide text-sand-100">Recently killed</h3>
          <ul className="space-y-1.5">
            {recent.map((s) => (
              <li key={s.id} className="text-[12.5px] text-[#a9cdc9]">
                “{s.title}” by @{s.authorHandle} — stopped by @{s.killedBy ?? "staff"} ({s.killReason ?? "no reason given"}){" "}
                <span className="text-[#6e97a0]">· {s.endedAt ? timeAgo(s.endedAt) : ""}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
