"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function IngestButton() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [report, setReport] = useState<string | null>(null);

  return (
    <div className="flex flex-wrap items-center gap-2">
      <button
        type="button"
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          setReport("Checking for new stories…");
          try {
            const res = await fetch("/api/news", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ limit: 12 }),
            });
            const data = await res.json();
            const s = data.stats ?? {};
            const added = s.inserted ?? 0;
            setReport(
              added
                ? `${added} new ${added === 1 ? "story" : "stories"} added${s.geocoded ? `, ${s.geocoded} placed on the map` : ""}.`
                : "You are all caught up — no new stories right now.",
            );
            router.refresh();
          } catch {
            setReport("Could not reach the news outlets. Please try again in a minute.");
          } finally {
            setBusy(false);
          }
        }}
        className="rounded-full bg-tide-500 px-3.5 py-2 text-[12.5px] font-extrabold text-abyss-950 disabled:opacity-50"
      >
        {busy ? "Checking…" : "Refresh stories"}
      </button>
      {report ? <p className="text-[12px] text-[#a9cdc9]">{report}</p> : null}
    </div>
  );
}

/** Opens the Stripe billing page, or ends a demo plan. */
export function ManageBillingButton({ demo }: { demo: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  return (
    <div>
      <button
        type="button"
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          setErr(null);
          try {
            const res = await fetch("/api/billing/manage", { method: "POST" });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error ?? "Could not open billing.");
            if (data.url) {
              window.location.assign(data.url);
              return;
            }
            router.refresh();
          } catch (e) {
            setErr(e instanceof Error ? e.message : "Could not open billing.");
          } finally {
            setBusy(false);
          }
        }}
        className="rounded-full bg-sand-100 px-3.5 py-2 text-[12.5px] font-extrabold text-abyss-950 hover:bg-white disabled:opacity-50"
      >
        {busy ? "One moment…" : demo ? "End demo plan" : "Manage billing"}
      </button>
      {err ? <p className="mt-1 text-[11.5px] text-conch-400">{err}</p> : null}
    </div>
  );
}

export function SignOut() {
  const [busy, setBusy] = useState(false);
  return (
    <button
      type="button"
      disabled={busy}
      onClick={async () => {
        setBusy(true);
        await fetch("/api/session", { method: "DELETE" });
        window.location.assign(new URL("/", window.location.origin).href);
      }}
      className="rounded-full border hairline px-3.5 py-2 text-[12.5px] font-bold text-[#a9cdc9] hover:bg-white/5"
    >
      {busy ? "Signing out…" : "Sign out"}
    </button>
  );
}
