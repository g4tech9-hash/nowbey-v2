"use client";

import { useEffect } from "react";

const MAX_PER_LOAD = 5;
const DEDUPE_MS = 60_000;
let sent = 0;
const recent = new Map<string, number>();

/** Fire-and-forget crash report; sendBeacon survives page teardown during navigation. */
export function reportClientError(payload: { kind: "client" | "boundary"; message: string; stack?: string; url?: string }): void {
  try {
    const key = `${payload.kind}|${payload.message}`;
    const now = Date.now();
    if (sent >= MAX_PER_LOAD || now - (recent.get(key) ?? 0) < DEDUPE_MS) return;
    sent += 1;
    recent.set(key, now);
    const body = JSON.stringify({ ...payload, url: payload.url ?? window.location.pathname });
    const blob = new Blob([body], { type: "application/json" });
    if (typeof navigator !== "undefined" && navigator.sendBeacon && navigator.sendBeacon("/api/errors", blob)) return;
    void fetch("/api/errors", { method: "POST", body, headers: { "Content-Type": "application/json" }, keepalive: true, credentials: "omit" }).catch(() => undefined);
  } catch {
    // The error reporter must never cause an error.
  }
}

/** Global hooks for the whole app: uncaught errors and unhandled promise rejections get reported. */
export function ErrorReporter() {
  useEffect(() => {
    const onError = (event: ErrorEvent) => {
      // Resource load failures (a missing image) are not crashes; only script errors have .error or a useful message.
      if (!event.error && !event.message) return;
      const stack = event.error instanceof Error ? event.error.stack : undefined;
      reportClientError({ kind: "client", message: String(event.message || "Unknown script error"), stack });
    };
    const onRejection = (event: PromiseRejectionEvent) => {
      const reason = event.reason;
      const message = reason instanceof Error ? reason.message : typeof reason === "string" ? reason : "Unhandled promise rejection";
      const stack = reason instanceof Error ? reason.stack : undefined;
      reportClientError({ kind: "client", message: String(message), stack });
    };
    window.addEventListener("error", onError);
    window.addEventListener("unhandledrejection", onRejection);
    return () => {
      window.removeEventListener("error", onError);
      window.removeEventListener("unhandledrejection", onRejection);
    };
  }, []);
  return null;
}
