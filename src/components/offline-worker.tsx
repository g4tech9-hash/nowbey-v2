"use client";

import { useEffect } from "react";

/**
 * Registers the offline worker in production builds. If push is configured, the push worker already exists at
 * this scope and it imports the offline worker itself, so registering that file keeps one registration.
 */
export function OfflineWorker() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
    if (!("serviceWorker" in navigator)) return;
    let cancelled = false;
    (async () => {
      let script = "/sw.js";
      try {
        const probe = await fetch("/firebase-messaging-sw.js", { cache: "no-store" });
        if (probe.ok) script = "/firebase-messaging-sw.js";
      } catch {
        /* no push worker: use the offline worker alone */
      }
      if (!cancelled) navigator.serviceWorker.register(script).catch(() => {});
    })();
    return () => {
      cancelled = true;
    };
  }, []);
  return null;
}
