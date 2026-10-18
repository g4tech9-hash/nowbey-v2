"use client";

import Link from "next/link";
import { useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { COMMENT_MAX, type TargetType } from "@/lib/engage-kinds";
import { FLAG_REASONS, type FlagReason } from "@/lib/life-kinds";

type Note = { ok: boolean; text: string } | null;

/** The box for writing a comment, or a reply when parentId is given. */
export function CommentComposer({
  type,
  id,
  signedIn,
  parentId,
  initial = "",
  onDone,
}: {
  type: TargetType;
  id: string;
  signedIn: boolean;
  parentId?: number;
  initial?: string;
  onDone?: () => void;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [body, setBody] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!signedIn) {
    return (
      <p className="rounded-xl bg-white/[.04] px-3.5 py-3 text-[13px] text-ink-300">
        <Link href={`/login?mode=signin&next=${encodeURIComponent(`${pathname}#comments`)}`} className="font-bold text-tide-300 underline">
          Sign in
        </Link>{" "}
        to join the conversation.
      </p>
    );
  }

  return (
    <form
      noValidate
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        setError(null);
        try {
          const res = await fetch("/api/comments", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ type, id, body, parentId }),
          });
          const data = await res.json().catch(() => ({}));
          if (res.status === 401) {
            router.push(`/login?mode=signin&next=${encodeURIComponent(`${pathname}#comments`)}`);
            return;
          }
          if (!res.ok) throw new Error(data.error ?? "Could not post that.");
          setBody("");
          onDone?.();
          router.refresh();
        } catch (err) {
          setError(err instanceof Error ? err.message : "Could not post that.");
        } finally {
          setBusy(false);
        }
      }}
    >
      <label className="block">
        <span className="sr-only">{parentId ? "Write a reply" : "Add a comment"}</span>
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          maxLength={COMMENT_MAX}
          rows={parentId ? 2 : 3}
          placeholder={parentId ? "Write a reply…" : "Add a comment, a tip or a question…"}
          className="w-full resize-y rounded-lg border border-white/10 bg-abyss-950/70 px-3 py-2.5 text-[14px] leading-relaxed outline-none focus:border-tide-400"
        />
      </label>
      <div className="mt-2 flex items-center gap-3">
        <button type="submit" disabled={busy || body.trim().length < 1} className="rounded-xl bg-tide-500 px-4 py-2 text-[13px] font-extrabold text-on-accent disabled:opacity-50">
          {busy ? "Posting…" : parentId ? "Reply" : "Post comment"}
        </button>
        {onDone ? (
          <button type="button" onClick={onDone} className="rounded-xl border hairline px-3.5 py-2 text-[13px] font-bold text-sand-100 hover:bg-white/8">
            Cancel
          </button>
        ) : null}
        <span className="ml-auto text-[11.5px] text-ink-400">
          {body.length}/{COMMENT_MAX}
        </span>
      </div>
      {error ? (
        <p role="alert" className="mt-2 text-[12.5px] text-danger-500">
          {error}
        </p>
      ) : null}
    </form>
  );
}

/** Reply, report, delete and (for staff) hide, under one comment. */
export function CommentTools({
  type,
  id,
  commentId,
  handle,
  mine,
  canReply,
  canReport,
  canDelete,
  staffAction,
  signedIn,
}: {
  type: TargetType;
  id: string;
  commentId: number;
  handle: string;
  mine: boolean;
  canReply: boolean;
  canReport: boolean;
  canDelete: boolean;
  /** What a staff member can do right now: hide a published comment, or restore a hidden one. */
  staffAction: "hide" | "restore" | null;
  signedIn: boolean;
}) {
  const router = useRouter();
  const [panel, setPanel] = useState<"reply" | "report" | null>(null);
  const [reason, setReason] = useState<FlagReason>("spam");
  const [busy, setBusy] = useState<string | null>(null);
  const [note, setNote] = useState<Note>(null);

  async function call(label: string, url: string, init: RequestInit, done?: string) {
    setBusy(label);
    setNote(null);
    try {
      const res = await fetch(url, { ...init, headers: { "Content-Type": "application/json" } });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Could not do that.");
      if (done) setNote({ ok: true, text: data.already ? "You have already reported this. Thank you." : done });
      setPanel(null);
      router.refresh();
    } catch (e) {
      setNote({ ok: false, text: e instanceof Error ? e.message : "Could not do that." });
    } finally {
      setBusy(null);
    }
  }

  const link = "text-[11.5px] font-bold text-ink-400 hover:text-tide-300 disabled:opacity-50";
  return (
    <div className="mt-1">
      <div className="flex flex-wrap items-center gap-x-3.5 gap-y-1">
        {canReply ? (
          <button type="button" className={link} aria-expanded={panel === "reply"} onClick={() => setPanel(panel === "reply" ? null : "reply")}>
            Reply
          </button>
        ) : null}
        {canReport && !mine ? (
          <button type="button" className={link} aria-expanded={panel === "report"} onClick={() => setPanel(panel === "report" ? null : "report")}>
            Report
          </button>
        ) : null}
        {canDelete ? (
          <button
            type="button"
            disabled={busy !== null}
            className={`${link} !text-danger-500`}
            onClick={() => {
              if (window.confirm("Delete this comment?")) void call("delete", `/api/comments/${commentId}`, { method: "DELETE" });
            }}
          >
            {busy === "delete" ? "Deleting…" : "Delete"}
          </button>
        ) : null}
        {staffAction ? (
          <button
            type="button"
            disabled={busy !== null}
            className={`${link} !text-tide-300`}
            onClick={() => void call("staff", "/api/admin/comments", { method: "PATCH", body: JSON.stringify({ id: commentId, action: staffAction }) })}
          >
            {busy === "staff" ? "…" : staffAction === "hide" ? "Hide (staff)" : "Restore (staff)"}
          </button>
        ) : null}
      </div>

      {panel === "reply" ? (
        <div className="mt-2">
          <CommentComposer type={type} id={id} signedIn={signedIn} parentId={commentId} initial={`@${handle} `} onDone={() => setPanel(null)} />
        </div>
      ) : null}

      {panel === "report" ? (
        <div className="mt-2 rounded-lg border hairline bg-white/[.03] p-2.5">
          <label className="block text-[12px] font-bold text-sand-100">
            What is wrong with this comment?
            <select
              value={reason}
              onChange={(e) => setReason(e.target.value as FlagReason)}
              className="mt-1.5 block w-full rounded-lg border border-white/10 bg-abyss-950/80 px-2.5 py-2 text-[13px] font-normal outline-none focus:border-tide-400"
            >
              {(Object.keys(FLAG_REASONS) as FlagReason[]).map((r) => (
                <option key={r} value={r}>
                  {FLAG_REASONS[r]}
                </option>
              ))}
            </select>
          </label>
          <div className="mt-2 flex gap-2">
            <button
              type="button"
              disabled={busy !== null}
              onClick={() => void call("report", `/api/comments/${commentId}/flag`, { method: "POST", body: JSON.stringify({ reason }) }, "Thank you. Our team will take a look.")}
              className="rounded-lg bg-conch-500 px-3 py-1.5 text-[12px] font-extrabold text-on-accent disabled:opacity-50"
            >
              {busy === "report" ? "Sending…" : "Send report"}
            </button>
            <button type="button" onClick={() => setPanel(null)} className="rounded-lg border hairline px-3 py-1.5 text-[12px] font-bold text-sand-100 hover:bg-white/8">
              Cancel
            </button>
          </div>
        </div>
      ) : null}

      {note ? (
        <p role={note.ok ? "status" : "alert"} className={`mt-1.5 text-[12px] ${note.ok ? "text-tide-300" : "text-danger-500"}`}>
          {note.text}
        </p>
      ) : null}
    </div>
  );
}
