"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const BTN = "rounded-full px-3 py-1.5 text-[12px] font-bold disabled:opacity-50";
const INPUT =
  "min-h-[40px] w-full rounded-xl border hairline bg-white/5 px-3 text-[13px] text-sand-100 placeholder:text-ink-400 focus:border-tide-500 focus:outline-none";

async function send(url: string, method: string, body?: unknown) {
  const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: body ? JSON.stringify(body) : undefined });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error ?? "Could not do that.");
  return data;
}

/**
 * "Facebook pages" editor on /admin/wire: paste a public page link, name it, and its
 * posts start flowing into the wire like any other story (on the next refresh).
 */
export function FacebookPagesAdmin({ pages }: { pages: { username: string; pageName: string }[] }) {
  const router = useRouter();
  const [url, setUrl] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
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

  return (
    <section className="glass rounded-2xl p-4">
      <p className="display text-[15px] font-bold text-sand-100">Facebook pages on the wire{pages.length ? ` (${pages.length})` : ""}</p>
      <p className="mt-0.5 text-[12px] text-[#8fb9b6]">
        Paste a public Facebook page link and its posts are converted to stories on the wire — same cards, categories and map pins as the news outlets.
      </p>

      {pages.length ? (
        <ul className="mt-2 divide-y divide-white/5">
          {pages.map((p) => (
            <li key={p.username} className="flex flex-wrap items-center justify-between gap-3 py-2.5">
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
              </div>
              <button type="button" disabled={busy} onClick={() => remove(p.username)} className={`${BTN} border hairline text-danger-500 hover:bg-white/8`}>
                {busy ? "…" : "Remove"}
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-2 text-[12.5px] text-[#6e97a0]">No pages yet — the wire currently follows Bahamas Power and Light (@mybpl242) by default.</p>
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
