"use client";

import { useCallback, useEffect, useState } from "react";

type Props = {
  config: Record<string, string>;
  vapidKey: string;
  /** Islands this push profile follows; today only New Providence is live. */
  parishes: string[];
};

/**
 * What a browser push registration actually covers, in the order a person asks the questions:
 * which island, which categories, and which browsers can show it at all. The switch is only ever
 * on this page when the server has Firebase configured, so it never promises what the server
 * cannot deliver.
 */
const COVERAGE = "every kind of report except the ones rated “annoying”";

type State = "checking" | "unsupported" | "needs-install" | "off" | "on" | "denied";

/**
 * The push-alerts switch on /alerts. Only ever rendered when the server has Firebase set up;
 * inside, it stays quiet on browsers that cannot do web push at all.
 */
export function PushToggle({ config, vapidKey, parishes }: Props) {
  const [state, setState] = useState<State>("checking");
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState("");

  const fetchToken = useCallback(async (): Promise<string | null> => {
    const [{ initializeApp, getApps }, { getMessaging, getToken, isSupported }] = await Promise.all([
      import("firebase/app"),
      import("firebase/messaging"),
    ]);
    if (!(await isSupported())) return null;
    const app = getApps().length ? getApps()[0] : initializeApp(config);
    const messaging = getMessaging(app);
    const registration = await navigator.serviceWorker.register("/firebase-messaging-sw.js");
    return getToken(messaging, { vapidKey, serviceWorkerRegistration: registration });
  }, [config, vapidKey]);

  // On load: if the browser already granted permission, quietly make sure the registration
  // is fresh — tokens rotate, and re-registering heals an out-of-date server row.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const ua = navigator.userAgent;
        const iOS = /iPad|iPhone|iPod/.test(ua) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
        const standalone = window.matchMedia("(display-mode: standalone)").matches || (navigator as { standalone?: boolean }).standalone === true;
        if (!("serviceWorker" in navigator) || !("Notification" in window)) return setState("unsupported");
        // iOS Safari delivers web push only to a Home Screen app, so say that instead of failing later.
        if (iOS && !standalone) return setState("needs-install");
        if (Notification.permission === "denied") return setState("denied");
        if (Notification.permission === "granted") {
          const token = await fetchToken();
          if (cancelled) return;
          if (token) {
            await fetch("/api/push/register", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ token, parishes }),
            });
            return setState("on");
          }
          return setState("unsupported");
        }
        setState("off");
      } catch {
        if (!cancelled) setState("unsupported");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [fetchToken, parishes]);

  async function enable() {
    setBusy(true);
    setNote("");
    try {
      const permission = await Notification.requestPermission();
      if (permission === "denied") {
        setState("denied");
        return;
      }
      if (permission !== "granted") return;
      const token = await fetchToken();
      if (!token) {
        setNote("This browser could not register for push — try Chrome, Edge or Safari on macOS/iOS 16.4+.");
        return;
      }
      const res = await fetch("/api/push/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, parishes }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setState("on");
    } catch (err) {
      setNote(`Could not switch push on (${err instanceof Error ? err.message : "unknown error"}). Check the connection and try again.`);
    } finally {
      setBusy(false);
    }
  }

  async function disable() {
    setBusy(true);
    setNote("");
    try {
      const token = await fetchToken();
      if (token) {
        await fetch("/api/push/unregister", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token }),
        });
        const { initializeApp, getApps } = await import("firebase/app");
        const { getMessaging, deleteToken, isSupported } = await import("firebase/messaging");
        if (await isSupported()) {
          const app = getApps().length ? getApps()[0] : initializeApp(config);
          await deleteToken(getMessaging(app));
        }
      }
      setState("off");
    } catch {
      setNote("Could not switch push off right now — you can also block notifications for this site in your browser settings.");
    } finally {
      setBusy(false);
    }
  }

  if (state === "checking" || state === "unsupported") return null;

  return (
    <div className="nb-surface rounded-xl2 p-4">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <div className="min-w-0 flex-1">
          <p className="display text-[15px] font-bold text-sand-100">Push alerts on this device</p>
          <p className="mt-0.5 text-[12.5px] leading-relaxed text-ink-300">
            {state === "needs-install"
              ? "On an iPhone, notifications reach the site only after it is added to the Home Screen: tap Share, then “Add to Home Screen”, and open NowBey from that new icon. Email alerts keep working in the meantime."
              : state === "on"
              ? `This device gets an instant notification for ${COVERAGE} that lands in ${parishes.join(", ")} — no email needed.`
              : state === "denied"
                ? "Notifications are blocked for this site in your browser settings. Unblock them there, then come back."
                : `An instant notification for ${COVERAGE} that lands in ${parishes.join(", ")}. Chrome, Edge and Firefox on a computer or Android phone can show these; on an iPhone the site has to be added to the Home Screen first.`}
          </p>
          {note ? <p className="mt-1 text-[12px] text-danger-500">{note}</p> : null}
        </div>
        {state === "on" ? (
          <button
            type="button"
            onClick={disable}
            disabled={busy}
            className="rounded-full border border-tide-400/40 bg-tide-500/10 px-3 py-1.5 text-[12px] font-extrabold text-tide-300 hover:bg-tide-500/20 disabled:opacity-50"
          >
            {busy ? "Working…" : "On — tap to stop"}
          </button>
        ) : state === "off" ? (
          <button
            type="button"
            onClick={enable}
            disabled={busy}
            className="rounded-full bg-tide-500 px-3.5 py-1.5 text-[12px] font-extrabold text-on-accent hover:bg-tide-400 disabled:opacity-50"
          >
            {busy ? "Working…" : "Turn on push alerts"}
          </button>
        ) : null}
      </div>
    </div>
  );
}
