"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { FbIngestStatus } from "@/lib/facebook-ingest-core";

const BTN = "rounded-full px-3 py-1.5 text-[12px] font-bold disabled:opacity-50";
const INPUT =
  "min-h-[40px] w-full rounded-xl border hairline bg-white/5 px-3 text-[13px] text-sand-100 placeholder:text-ink-400 focus:border-tide-500 focus:outline-none";

async function send(url: string, method: string, body?: unknown) {
  const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: body ? JSON.stringify(body) : undefined });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error ?? "Could not do that.");
  return data;
}

/** Deterministic on server and client, so the panel never trips React hydration. */
function when(iso: string): string {
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? iso : `${date.toISOString().slice(0, 16).replace("T", " ")} UTC`;
}

function hostOf(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return url;
  }
}

/**
 * "Facebook pages" editor on /admin/wire: paste a public page link, name it, and its posts start
 * flowing into the wire like any other story (on the next refresh). Facebook walls off hosting IPs,
 * so each page can also take a bridge feed (rss.app / fetchrss / RSS-Bridge) — pasted here it applies
 * on the next refresh, no redeploy. "Check now" runs the ingest immediately and reports what it saw,
 * so a bridge can be verified in the same minute it is saved.
 */
export function FacebookPagesAdmin({
  pages,
  bridges,
  status,
}: {
  pages: { username: string; pageName: string }[];
  bridges: Record<string, string>;
  status: FbIngestStatus | null;
}) {
  const router = useRouter();
  const [url, setUrl] = useState("");
  const [name, setName] = useState("");
  const [drafts, setDrafts] = useState<Record<string, string>>(() =>
    Object.fromEntries(pages.map((p) => [p.username, bridges[p.username] ?? ""])),
  );
  const [busy, setBusy] = useState(false);
  const [checking, setChecking] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  async function add() {
    setBusy(true);
    setErr(null);
    setNotice(null);
    try {
      await send("/api/admin/facebook-pages", "POST", { url, name });
      setUrl("");
      setName("");
      setNotice("Added. Its recent posts appear on the wire with the next refresh.");
      router.refresh();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Could not add that page.");
    } finally {
      setBusy(false);
    }
  }

  async function remove(username: string) {
    if (!window.confirm(`Stop following @${username}? Posts already on the wire stay.`)) return;
    setBusy(true);
    setErr(null);
    try {
      await send("/api/admin/facebook-pages", "DELETE", { username });
      router.refresh();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Could not remove that page.");
    } finally {
      setBusy(false);
    }
  }

  async function saveBridge(username: string) {
    setBusy(true);
    setErr(null);
    setNotice(null);
    try {
      const value = (drafts[username] ?? "").trim();
      await send("/api/admin/facebook-pages", "PATCH", { username, bridgeUrl: value });
      setNotice(value ? "Bridge saved. Press “Check now” to see its posts land." : "Bridge removed — this page goes back to the direct read.");
      router.refresh();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Could not save that bridge.");
    } finally {
      setBusy(false);
    }
  }

  async function checkNow() {
    setChecking(true);
    setErr(null);
    setNotice(null);
    try {
      const data = await send("/api/admin/facebook-pages/check", "POST", {});
      const stats = data.stats as { inserted: number; pages: { username: string; found: number; inserted: number; note: string }[] };
      const detail = stats.pages.map((p) => `@${p.username}: ${p.found} found, ${p.inserted} new — ${p.note}`).join(" · ");
      setNotice(`${stats.inserted} new post(s). ${detail}`);
      router.refresh();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "The check could not run.");
    } finally {
      setChecking(false);
    }
  }

  return (
    <section className="glass rounded-2xl p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="display text-[15px] font-bold text-sand-100">Facebook pages on the wire{pages.length ? ` (${pages.length})` : ""}</p>
          <p className="mt-0.5 text-[12px] text-secondary">
            Paste a public Facebook page link and its posts are converted to stories on the wire — same cards, categories and map pins as the news outlets.
          </p>
        </div>
        <button type="button" disabled={checking || busy} onClick={checkNow} className={`${BTN} border hairline text-sand-100 hover:bg-white/8`}>
          {checking ? "Checking…" : "Check now"}
        </button>
      </div>

      <p className="mt-2 rounded-xl border hairline bg-white/[0.03] px-3 py-2 text-[11.5px] leading-relaxed text-secondary">
        Facebook shows a login wall to servers, so a page with <b>no bridge</b> usually finds no posts — the feed below stays empty and the note says why. A bridge feed (the RSS address rss.app, fetchrss or an RSS-Bridge gives you for the page) always works and is used first. Saving one here takes effect on the next refresh; no redeploy.
      </p>

      {pages.length ? (
        <ul className="mt-2 divide-y divide-white/5">
          {pages.map((p) => {
            const run = status?.pages.find((r) => r.username === p.username);
            const bridge = bridges[p.username] ?? "";
            return (
              <li key={p.username} className="py-3">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-[13px] font-semibold text-sand-100">{p.pageName}</p>
                    <a
                      href={`https://www.facebook.com/${p.username}/`}
                      target="_blank"
                      rel="noopener noreferrer nofollow"
                      className="block truncate text-[11.5px] text-tide-300 underline"
                    >
                      facebook.com/{p.username}
                    </a>
                    <p className="mt-0.5 text-[11.5px] text-tertiary">
                      {bridge ? `Bridge: ${hostOf(bridge)}` : "No bridge — Facebook blocks server-side reads for this page."}
                    </p>
                  </div>
                  <button type="button" disabled={busy} onClick={() => remove(p.username)} className={`${BTN} border hairline text-danger-500 hover:bg-white/8`}>
                    {busy ? "…" : "Remove"}
                  </button>
                </div>

                <div className="mt-2 flex flex-col gap-2 sm:flex-row">
                  <input
                    value={drafts[p.username] ?? ""}
                    onChange={(e) => setDrafts((prev) => ({ ...prev, [p.username]: e.target.value }))}
                    placeholder="Bridge feed URL (optional) — https://rss.app/feeds/…"
                    aria-label={`Bridge feed URL for ${p.pageName}`}
                    className={INPUT}
                    inputMode="url"
                  />
                  <button type="button" disabled={busy} onClick={() => saveBridge(p.username)} className={`${BTN} shrink-0 border hairline text-sand-100 hover:bg-white/8`}>
                    {busy ? "…" : "Save bridge"}
                  </button>
                </div>

                <p className="mt-1.5 text-[11.5px] text-tertiary">
                  {run ? (
                    <>
                      Last check {when(run.at ?? status?.ranAt ?? "")}: {run.found} found, {run.inserted} new — {run.note}
                    </>
                  ) : (
                    "Not checked yet. Use “Check now” after saving a bridge."
                  )}
                </p>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="mt-2 text-[12.5px] text-tertiary">No pages yet — the wire currently follows Bahamas Power and Light (@mybpl242) by default.</p>
      )}

      <div className="mt-3 flex flex-col gap-2 border-t border-white/5 pt-3 sm:flex-row">
        <input
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://www.facebook.com/mybpl242/"
          className={INPUT}
          inputMode="url"
        />
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Name (optional)" className={`${INPUT} sm:max-w-[200px]`} />
        <button type="button" disabled={busy || !url.trim()} onClick={add} className={`${BTN} bg-tide-600 text-sand-100 hover:bg-tide-500`}>
          {busy ? "…" : "Add page"}
        </button>
      </div>
      {err ? <p className="mt-1.5 text-[11.5px] text-danger-500">{err}</p> : null}
      {notice ? <p className="mt-1.5 text-[11.5px] text-ok-500">{notice}</p> : null}
    </section>
  );
}
