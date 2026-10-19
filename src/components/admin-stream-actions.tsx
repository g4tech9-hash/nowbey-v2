"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const BTN = "rounded-full px-3 py-1.5 text-[12px] font-bold disabled:opacity-50";

/** The red button. Kills a live broadcast now; the broadcaster sees the reason. */
export function KillStreamButton({ id }: { id: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  return (
    <div className="flex flex-col items-start gap-1">
      <button
        type="button"
        disabled={busy}
        onClick={async () => {
          const reason = window.prompt("Why is this broadcast being stopped? The broadcaster sees this reason.", "broke the community rules");
          if (reason === null) return;
          if (!window.confirm("Kill this live broadcast now? Viewers will be cut off immediately.")) return;
          setBusy(true);
          setErr(null);
          try {
            const res = await fetch("/api/admin/streams", {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ id, action: "kill", reason }),
            });
            const data = await res.json().catch(() => ({}));
            if (!res.ok) throw new Error(data.error ?? "Could not kill the broadcast.");
            router.refresh();
          } catch (e) {
            setErr(e instanceof Error ? e.message : "Could not kill the broadcast.");
          } finally {
            setBusy(false);
          }
        }}
        className={`${BTN} bg-danger-500 font-extrabold text-on-accent`}
      >
        {busy ? "Killing…" : "Kill stream"}
      </button>
      {err ? <p className="text-[11.5px] text-danger-400">{err}</p> : null}
    </div>
  );
}
