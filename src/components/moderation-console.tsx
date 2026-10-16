/**
 * Content Moderation -- the interactive half.
 *
 * Three queues on one screen:
 *   1. live broadcasts, each with a Kill Stream button,
 *   2. flagged comments, each with Approve and Delete & Warn,
 *   3. flagged posts, each with Approve and Hide.
 *
 * The Kill Stream button is the one that matters most: it writes
 * status = 'killed' to live_streams, and every viewer's client sees the stream
 * as ended the moment that row flips. The media plane is external, so the
 * database is the switch -- see the comment in /api/admin/moderation.
 *
 * Every action is optimistic about nothing: the row is only removed from the
 * local list after the server confirms, and a failure puts the error in a live
 * region rather than silently doing nothing.
 */

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Pill } from "@/components/admin-ui";

export type StreamRow = {
  id: string;
  authorHandle: string;
  title: string;
  locationLabel: string | null;
  parish: string | null;
  provider: string;
  roomId: string | null;
  viewers: number;
  peakViewers: number;
  ago: string;
};

export type CommentRow = {
  id: number;
  authorHandle: string;
  body: string;
  flags: number;
  incidentId: string | null;
  postId: string | null;
  ago: string;
};

export type PostRow = {
  id: string;
  authorHandle: string;
  title: string;
  body: string;
  flags: number;
  ago: string;
};

const BTN = "rounded-full border hairline px-3 py-1 text-[11.5px] font-bold text-ink-300 hover:bg-white/8 disabled:opacity-50";
const BTN_ON = "rounded-full bg-tide-500 px-3 py-1 text-[11.5px] font-extrabold text-abyss-950 hover:bg-tide-400 disabled:opacity-50";
const BTN_KILL = "rounded-full bg-danger-500 px-3 py-1 text-[11.5px] font-extrabold text-abyss-950 hover:bg-danger-400 disabled:opacity-50";

export function ModerationConsole({
  streams: initialStreams,
  comments: initialComments,
  posts: initialPosts,
}: {
  streams: StreamRow[];
  comments: CommentRow[];
  posts: PostRow[];
}) {
  const router = useRouter();
  const [streams, setStreams] = useState(initialStreams);
  const [comments, setComments] = useState(initialComments);
  const [posts, setPosts] = useState(initialPosts);
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  async function post(payload: Record<string, unknown>, done?: () => void) {
    const key = String(payload.id ?? "");
    setBusy(key);
    setMsg(null);
    try {
      const res = await fetch("/api/admin/moderation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(typeof data.error === "string" ? data.error : "That did not work.");
      setMsg({ ok: true, text: typeof data.error === "string" ? data.error : "Done." });
      done?.();
      router.refresh();
    } catch (err) {
      setMsg({ ok: false, text: err instanceof Error ? err.message : "Could not reach the server." });
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-6">
      {msg ? (
        <p
          role={msg.ok ? "status" : "alert"}
          aria-live={msg.ok ? "polite" : "assertive"}
          className={`rounded-lg px-3 py-2 text-[12.5px] ${msg.ok ? "bg-tide-500/12 text-tide-300" : "bg-danger-500/15 text-danger-500"}`}
        >
          {msg.text}
        </p>
      ) : null}

      {/* ================= LIVE STREAMS ================= */}
      <section aria-labelledby="live-heading">
        <div className="mb-2.5 flex items-center gap-2">
          <h2 id="live-heading" className="text-[15px] font-extrabold text-sand-100">
            Live broadcasts
          </h2>
          <Pill tone={streams.length ? "conch" : "slate"}>{streams.length} live</Pill>
        </div>

        {streams.length ? (
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {streams.map((s) => (
              <li key={s.id} className="glass overflow-hidden rounded-2xl">
                {/*
                  The video surface. A placeholder frame rather than a real
                  player: the media plane (Agora/LiveKit/etc.) is external, and
                  embedding it here would need a provider SDK plus room
                  credentials in the admin bundle. What the admin needs is the
                  identity of the stream and the kill switch, and both are here.
                */}
                <div className="relative grid aspect-video place-items-center bg-[linear-gradient(140deg,#062434,#0a2735_55%,#3a1420)]">
                  <div className="nb-decorative absolute inset-0 opacity-25 [background-image:repeating-linear-gradient(0deg,transparent_0_38px,rgba(120,220,214,.2)_38px_39px)]" />
                  <span className="absolute left-2.5 top-2.5 inline-flex items-center gap-1.5 rounded-full bg-danger-500/90 px-2 py-0.5 text-[10.5px] font-extrabold uppercase tracking-wide text-abyss-950">
                    <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-abyss-950" />
                    Live
                  </span>
                  <span className="absolute right-2.5 top-2.5 rounded-full bg-abyss-950/70 px-2 py-0.5 text-[10.5px] font-bold text-sand-100">
                    {s.viewers} watching · peak {s.peakViewers}
                  </span>
                  <div className="relative px-3 text-center">
                    <p className="text-[12.5px] font-bold text-sand-100">{s.title}</p>
                    <p className="mt-1 font-mono text-[10.5px] text-[#7fb3ad]">
                      {s.provider || "no provider"} {s.roomId ? `· ${s.roomId}` : ""}
                    </p>
                  </div>
                </div>

                <div className="p-3">
                  <p className="truncate text-[12.5px] font-semibold text-sand-100">@{s.authorHandle}</p>
                  <p className="mt-0.5 text-[11.5px] text-ink-400">
                    {s.locationLabel ?? s.parish ?? "Somewhere on the island"} · started {s.ago}
                  </p>
                  <div className="mt-2.5 flex gap-2">
                    <button
                      type="button"
                      disabled={busy !== null}
                      onClick={() => {
                        // A kill is irreversible for that broadcast. Confirm, because
                        // there is no undo and the broadcaster loses their audience.
                        const why = window.prompt(`Kill @${s.authorHandle}'s stream? Add a reason (kept in the log):`);
                        if (why === null) return;
                        void post(
                          { action: "killStream", id: s.id, reason: why },
                          () => setStreams((cur) => cur.filter((x) => x.id !== s.id)),
                        );
                      }}
                      className={BTN_KILL}
                    >
                      {busy === s.id ? "Killing…" : "Kill Stream"}
                    </button>
                    <a href={`/live/${s.id}`} target="_blank" rel="noreferrer" className={`${BTN} grid place-items-center`}>
                      Watch
                    </a>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="glass rounded-2xl px-4 py-8 text-center text-[13px] text-[#a9cdc9]">
            Nobody is broadcasting right now.
          </p>
        )}
      </section>

      {/* ================= FLAGGED COMMENTS ================= */}
      <section aria-labelledby="comments-heading">
        <div className="mb-2.5 flex items-center gap-2">
          <h2 id="comments-heading" className="text-[15px] font-extrabold text-sand-100">
            Flagged comments
          </h2>
          <Pill tone={comments.length ? "sun" : "slate"}>{comments.length} waiting</Pill>
        </div>

        {comments.length ? (
          <ul className="space-y-2">
            {comments.map((c) => (
              <li key={c.id} className="glass rounded-2xl p-3.5">
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[12px]">
                  <span className="font-bold text-sand-100">@{c.authorHandle}</span>
                  <span className="text-ink-400">{c.ago}</span>
                  <Pill tone="sun">{c.flags} flags</Pill>
                  {c.incidentId ? <span className="text-ink-400">on an incident</span> : null}
                  {c.postId ? <span className="text-ink-400">on a post</span> : null}
                </div>
                <p className="mt-1.5 text-[13px] text-sand-100">{c.body}</p>
                <div className="mt-2.5 flex flex-wrap gap-2">
                  <button
                    type="button"
                    disabled={busy !== null}
                    onClick={() =>
                      void post({ action: "approveComment", id: c.id }, () =>
                        setComments((cur) => cur.filter((x) => x.id !== c.id)),
                      )
                    }
                    className={BTN_ON}
                  >
                    Approve
                  </button>
                  <button
                    type="button"
                    disabled={busy !== null}
                    onClick={() => {
                      const why = window.prompt(`Remove @${c.authorHandle}'s comment and warn them? Give a reason:`);
                      if (why === null) return;
                      void post({ action: "removeComment", id: c.id, reason: why, warn: true }, () =>
                        setComments((cur) => cur.filter((x) => x.id !== c.id)),
                      );
                    }}
                    className="rounded-full border border-conch-500/40 px-3 py-1 text-[11.5px] font-bold text-conch-400 hover:bg-conch-500/15 disabled:opacity-50"
                  >
                    Delete &amp; Warn
                  </button>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="glass rounded-2xl px-4 py-8 text-center text-[13px] text-[#a9cdc9]">Nothing flagged. Good island.</p>
        )}
      </section>

      {/* ================= FLAGGED POSTS ================= */}
      <section aria-labelledby="posts-heading">
        <div className="mb-2.5 flex items-center gap-2">
          <h2 id="posts-heading" className="text-[15px] font-extrabold text-sand-100">
            Flagged posts
          </h2>
          <Pill tone={posts.length ? "sun" : "slate"}>{posts.length} waiting</Pill>
        </div>

        {posts.length ? (
          <ul className="space-y-2">
            {posts.map((p) => (
              <li key={p.id} className="glass rounded-2xl p-3.5">
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[12px]">
                  <span className="font-bold text-sand-100">@{p.authorHandle}</span>
                  <span className="text-ink-400">{p.ago}</span>
                  <Pill tone="sun">{p.flags} flags</Pill>
                </div>
                <p className="mt-1.5 text-[13.5px] font-semibold text-sand-100">{p.title}</p>
                <p className="mt-0.5 text-[12.5px] text-[#a9cdc9]">{p.body}</p>
                <div className="mt-2.5 flex flex-wrap gap-2">
                  <button
                    type="button"
                    disabled={busy !== null}
                    onClick={() =>
                      void post({ action: "approvePost", id: p.id }, () => setPosts((cur) => cur.filter((x) => x.id !== p.id)))
                    }
                    className={BTN_ON}
                  >
                    Approve
                  </button>
                  <button
                    type="button"
                    disabled={busy !== null}
                    onClick={() => {
                      const why = window.prompt(`Hide "${p.title}"? Give a reason:`);
                      if (why === null) return;
                      void post({ action: "hidePost", id: p.id, reason: why }, () =>
                        setPosts((cur) => cur.filter((x) => x.id !== p.id)),
                      );
                    }}
                    className="rounded-full border border-conch-500/40 px-3 py-1 text-[11.5px] font-bold text-conch-400 hover:bg-conch-500/15 disabled:opacity-50"
                  >
                    Hide
                  </button>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="glass rounded-2xl px-4 py-8 text-center text-[13px] text-[#a9cdc9]">Nothing flagged.</p>
        )}
      </section>
    </div>
  );
}
