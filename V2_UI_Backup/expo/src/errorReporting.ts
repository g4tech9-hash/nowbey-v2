import Constants from "expo-constants";
import { Platform } from "react-native";

/* api.ts registers its live base URL here (avoids an import cycle: api.ts imports noteApiFailure). */
let baseGetter: (() => string) | null = null;
export function registerApiBase(getter: () => string): void {
  baseGetter = getter;
}

/*
 * The app's half of the log pipeline: uncaught JS errors, unhandled rejections and
 * failed API calls are sent to the same POST /api/errors the website uses, with a
 * small breadcrumb trail (screens visited, API failures). They land in client_errors
 * with platform android/ios, get the same automatic Gemini diagnosis, and appear in
 * Admin → Logs. Nothing here may ever crash the app it is reporting on: every entry
 * point swallows its own errors, and this module never imports the api.call() helper
 * (reporting a failure must not be able to fail recursively — it uses raw fetch).
 */

type Crumb = { type: string; detail: string; at: string };
const MAX_CRUMBS = 20;
const crumbs: Crumb[] = [];
const sessionId = `m-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
let sent = 0;
const recent = new Map<string, number>();

export function addBreadcrumb(type: string, detail: string): void {
  try {
    crumbs.push({ type: String(type).slice(0, 24), detail: String(detail).slice(0, 160), at: new Date().toISOString() });
    if (crumbs.length > MAX_CRUMBS) crumbs.splice(0, crumbs.length - MAX_CRUMBS);
  } catch {
    /* breadcrumbs must never break the app */
  }
}

const pathOnly = (raw: string): string => raw.split(/[?#]/)[0].replace(/^https?:\/\/[^/]+/i, "") || "/";

export function reportAppError(kind: "app" | "client", message: string, stack?: string, url?: string): void {
  try {
    const key = `${kind}|${message}`;
    const now = Date.now();
    if (sent >= 10 || now - (recent.get(key) ?? 0) < 60_000) return;
    sent += 1;
    recent.set(key, now);
    const base = baseGetter?.();
    if (!base) return;
    void fetch(`${base}/api/errors`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-nowbey-client": "native" },
      body: JSON.stringify({
        kind,
        message: String(message).slice(0, 300),
        stack: stack?.slice(0, 2000),
        url: url ?? crumbs.filter((c) => c.type === "navigation").at(-1)?.detail ?? "app",
        platform: Platform.OS,
        appVersion: Constants.expoConfig?.version ?? "expo",
        sessionId,
        breadcrumbs: [...crumbs],
      }),
    }).catch(() => undefined);
  } catch {
    /* the reporter must never throw */
  }
}

/** Called from the API helper: network failures and 5xx responses become breadcrumbs, and get reported. */
export function noteApiFailure(method: string, path: string, status: number): void {
  addBreadcrumb("api", `${method} ${pathOnly(path)} → ${status === 0 ? "unreachable" : status}`);
  if (status === 0 || status >= 500) {
    reportAppError("app", `API ${method} ${pathOnly(path)} failed (${status === 0 ? "unreachable" : status})`);
  }
}

type ErrorUtilsShape = {
  getGlobalHandler?: () => ((error: Error, isFatal?: boolean) => void) | undefined;
  setGlobalHandler?: (handler: (error: Error, isFatal?: boolean) => void) => void;
};

let installed = false;

/** Install once at startup (root layout). Chains the previous handler instead of replacing it. */
export function installErrorReporting(): void {
  if (installed) return;
  installed = true;
  addBreadcrumb("app", "started");
  try {
    const utils = (globalThis as { ErrorUtils?: ErrorUtilsShape }).ErrorUtils;
    const previous = utils?.getGlobalHandler?.();
    utils?.setGlobalHandler?.((error, isFatal) => {
      reportAppError("app", error?.message ?? "Unknown app error", error?.stack);
      previous?.(error, isFatal);
    });
  } catch {
    /* no global handler available (web build) — API-failure reporting still works */
  }
}
