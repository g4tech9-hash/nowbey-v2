"use client";

import { useEffect } from "react";

const MAX_PER_LOAD = 5;
const DEDUPE_MS = 60_000;
const MAX_CRUMBS = 20;
let sent = 0;
const recent = new Map<string, number>();

type Crumb = { type: string; detail: string; at: string };
const crumbs: Crumb[] = [];

function sessionId(): string {
  try {
    let id = sessionStorage.getItem("nb_session");
    if (!id) {
      id = typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `s-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
      sessionStorage.setItem("nb_session", id);
    }
    return id;
  } catch {
    return "unknown";
  }
}

/**
 * Record what just happened (page visited, control tapped, API failed) so a later crash
 * report shows the trail that led to it. Paths and labels only — never form values,
 * never query strings (the server re-sanitizes everything anyway).
 */
export function addBreadcrumb(type: string, detail: string): void {
  try {
    crumbs.push({ type: String(type).slice(0, 24), detail: String(detail).slice(0, 160), at: new Date().toISOString() });
    if (crumbs.length > MAX_CRUMBS) crumbs.splice(0, crumbs.length - MAX_CRUMBS);
  } catch {
    // Breadcrumbs must never break the page.
  }
}

const pathOnly = (raw: string): string => {
  try {
    return new URL(raw, window.location.origin).pathname;
  } catch {
    return raw.split(/[?#]/)[0];
  }
};

/** Fire-and-forget crash report with its breadcrumb trail; sendBeacon survives page teardown. */
export function reportClientError(payload: { kind: "client" | "boundary" | "app"; message: string; stack?: string; url?: string }): void {
  try {
    const key = `${payload.kind}|${payload.message}`;
    const now = Date.now();
    if (sent >= MAX_PER_LOAD || now - (recent.get(key) ?? 0) < DEDUPE_MS) return;
    sent += 1;
    recent.set(key, now);
    const body = JSON.stringify({
      ...payload,
      url: payload.url ?? window.location.pathname,
      platform: "web",
      appVersion: process.env.NEXT_PUBLIC_APP_VERSION ?? "web",
      sessionId: sessionId(),
      breadcrumbs: [...crumbs],
    });
    const blob = new Blob([body], { type: "application/json" });
    if (typeof navigator !== "undefined" && navigator.sendBeacon && navigator.sendBeacon("/api/errors", blob)) return;
    void fetch("/api/errors", { method: "POST", body, headers: { "Content-Type": "application/json" }, keepalive: true, credentials: "omit" }).catch(() => undefined);
  } catch {
    // The error reporter must never cause an error.
  }
}

let installed = false;

/** Watch navigation, taps and failed same-origin API calls as breadcrumbs. Installed once. */
function installBreadcrumbs(): void {
  if (installed || typeof window === "undefined") return;
  installed = true;
  addBreadcrumb("navigation", window.location.pathname);

  const noteNav = () => addBreadcrumb("navigation", window.location.pathname);
  window.addEventListener("popstate", noteNav);
  for (const method of ["pushState", "replaceState"] as const) {
    const original = window.history[method].bind(window.history);
    window.history[method] = (...args: Parameters<History["pushState"]>) => {
      const result = original(...args);
      noteNav();
      return result;
    };
  }

  // Taps: the control's label says what the person was trying to do. No input values, ever.
  window.addEventListener(
    "click",
    (event) => {
      const el = (event.target as HTMLElement | null)?.closest?.("a,button,[role='button']") as HTMLElement | null;
      if (!el) return;
      const label = (el.getAttribute("aria-label") || el.textContent || el.tagName).replace(/\s+/g, " ").trim().slice(0, 60);
      addBreadcrumb("tap", label || el.tagName.toLowerCase());
    },
    { capture: true, passive: true },
  );

  // Failed API calls are the most useful breadcrumb of all, and a 5xx the server did not
  // record itself (proxy, CDN) still shows up here as context for the next crash.
  const originalFetch = window.fetch.bind(window);
  window.fetch = async (...args: Parameters<typeof fetch>) => {
    const res = await originalFetch(...args);
    try {
      const input = args[0];
      const rawUrl = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
      const method = (args[1]?.method ?? (input instanceof Request ? input.method : "GET")).toUpperCase();
      const path = pathOnly(rawUrl);
      if (path.startsWith("/api/") && path !== "/api/errors" && res.status >= 500) {
        addBreadcrumb("api", `${method} ${path} → ${res.status}`);
      }
    } catch {
      // Watching must never break the request itself.
    }
    return res;
  };
}

/** Global hooks for the whole app: uncaught errors and unhandled promise rejections get reported. */
export function ErrorReporter() {
  useEffect(() => {
    installBreadcrumbs();
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
