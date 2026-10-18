import Constants from "expo-constants";
import { Platform } from "react-native";
import { getServer, getToken, setPushToken, setServer, setToken } from "./storage";
import { noteApiFailure, registerApiBase } from "./errorReporting";
import type { CategoryKey } from "./geo";

/**
 * Where NowBey's website runs. The app uses the same API as the site, so there is one backend.
 * Order of preference:
 *   1. an address typed into the app (You tab > Server address), saved on the phone
 *   2. EXPO_PUBLIC_API_BASE set when Expo starts
 *   3. "extra.apiBase" in app.json, unless it is still the localhost placeholder
 *   4. the computer running Expo, port 3000 (works when the site runs on the same computer)
 */
const fromEnv = process.env.EXPO_PUBLIC_API_BASE;
const fromConfig = (Constants.expoConfig?.extra as { apiBase?: string } | undefined)?.apiBase;

function clean(url: string): string {
  let u = url.trim().replace(/\/+$/, "");
  if (u && !/^https?:\/\//i.test(u)) u = `http://${u}`;
  return u;
}

function isLocal(url: string): boolean {
  return /^https?:\/\/(localhost|127\.0\.0\.1)(:|\/|$)/i.test(url);
}

function guessFromMetro(): string | null {
  if (Platform.OS === "web") return null;
  const host = (Constants.expoConfig as { hostUri?: string } | null)?.hostUri ?? (Constants as unknown as { expoGoConfig?: { debuggerHost?: string } }).expoGoConfig?.debuggerHost;
  const name = host?.split(":")[0];
  return name ? `http://${name}:3000` : null;
}

function initialBase(): string {
  if (fromEnv) return clean(fromEnv);
  if (fromConfig && !isLocal(fromConfig)) return clean(fromConfig);
  return guessFromMetro() ?? clean(fromConfig || "http://localhost:3000");
}

/** Read by the screens on every render; reassigned by loadApiBase / changeApiBase. */
export let API_BASE: string = initialBase();
registerApiBase(() => API_BASE);

/** Called once at start-up: applies an address the person saved earlier. */
export async function loadApiBase(): Promise<void> {
  const saved = await getServer();
  if (saved) API_BASE = clean(saved);
}

/**
 * Plain http is only acceptable on this phone or the local network (a developer's laptop). Anywhere else
 * the sign-in token and every report would cross the internet unencrypted.
 */
export function insecureServer(url: string): boolean {
  let u: URL;
  try {
    u = new URL(url);
  } catch {
    return true;
  }
  if (u.protocol === "https:") return false;
  if (u.protocol !== "http:") return true;
  const h = u.hostname;
  return !(
    h === "localhost" ||
    /^127\./.test(h) ||
    /^10\./.test(h) ||
    /^192\.168\./.test(h) ||
    /^172\.(1[6-9]|2\d|3[01])\./.test(h) ||
    h.endsWith(".local")
  );
}

function originOf(url: string): string {
  try {
    return new URL(url).origin;
  } catch {
    return url;
  }
}

/**
 * Saves a new website address (or clears it with an empty string).
 *
 * The sign-in token belongs to the server that issued it. Pointing the app at a different server signs
 * this phone out first, so a token is never handed to a server that did not create it — otherwise anyone
 * who talked a member into "changing the server address" would receive their session with the next request.
 */
export async function changeApiBase(url: string): Promise<{ signedOut: boolean }> {
  const next = clean(url);
  if (next && insecureServer(next)) {
    throw new ApiError("Use an https:// address. Plain http:// only works for a computer on your own Wi-Fi.", 0);
  }
  const target = next || initialBase();
  const moving = originOf(target) !== originOf(API_BASE);
  if (moving) {
    await setToken(null);
    await setPushToken(null);
  }
  await setServer(next || null);
  API_BASE = target;
  return { signedOut: moving };
}

export type StationPrice = { station: string; parish: string; fuel: "regular" | "premium" | "diesel"; priceCents: number; reportedAt: string; reports: number };
export type GasBoard = {
  stations: StationPrice[];
  stats: { fuel: "regular" | "premium" | "diesel"; averageCents: number | null; cheapest: StationPrice | null; stations: number }[];
  official: Partial<Record<"regular" | "premium" | "diesel", number>> | null;
  windowDays: number;
};

export type Badge = "verified" | "desk" | null;
export type TierKey = "conch" | "rock" | "admiral";

export type Incident = {
  id: string;
  title: string;
  details: string | null;
  category: CategoryKey;
  severity: number;
  lat: number;
  lng: number;
  accuracyMeters: number | null;
  address: string | null;
  street: string | null;
  parish: string | null;
  status: string;
  confirmations: number;
  sightings: number;
  photoNote: string | null;
  authorHandle: string | null;
  authorBadge: Badge;
  createdAt: string;
  updatedAt: string;
};

export type Update = { id: number; kind: string; note: string | null; authorHandle: string | null; createdAt: string };

export type NewsItem = {
  id: string;
  title: string;
  summary: string | null;
  url: string;
  sourceName: string;
  parish: string | null;
  lat: number | null;
  lng: number | null;
  category: CategoryKey;
  publishedAt: string;
};

export type ReactionKind = "like" | "love" | "thanks" | "wow" | "sad";
export type TargetType = "post" | "incident" | "news";
export type ReactionCounts = Partial<Record<ReactionKind, number>>;
export type Engagement = { counts: ReactionCounts; total: number; mine: ReactionKind | null; comments: number };

export type CommentNode = {
  id: number;
  authorHandle: string;
  body: string;
  /** published | hidden | removed. A hidden or deleted comment arrives blank, with placeholder set. */
  status: string;
  createdAt: string;
  badge: Badge;
  mine: boolean;
  placeholder: boolean;
  replies: CommentNode[];
};

export type LifePost = {
  id: string;
  kind: string;
  placeName: string | null;
  title: string;
  body: string;
  rating: number | null;
  priceLevel: number | null;
  parish: string | null;
  /** Total of every reaction, not only likes. */
  likeCount: number;
  commentCount: number;
  reactions: ReactionCounts;
  myReaction: ReactionKind | null;
  photoCount: number;
  firstPhotoId: string | null;
  authorHandle: string;
  authorBadge: Badge;
  likedByMe: boolean;
  createdAt: string;
};

export type Plan = { tier: TierKey | null; interval: "month" | "year" | null; status: string | null; renewsAt: string | null };
export type SessionUser = {
  handle: string;
  displayName: string;
  email?: string | null;
  emailVerified?: boolean;
  parish: string | null;
  isAdmin: boolean;
  isStaff?: boolean;
  verified: boolean;
  /** False for an account opened with Google; the delete screen must not ask for a password. */
  hasPassword?: boolean;
  termsVersion?: string | null;
  plan: Plan;
};
export type Place = { street?: string | null; address?: string | null; parish?: string | null };

/** Intake copilot answer (POST /api/reports/assist). Every field is advisory only. */
export type ReportAssist = {
  ai: boolean;
  suggestion: {
    category: string | null;
    severity: number | null;
    headline: string;
    missingInfo: string[];
    confidence: string;
  } | null;
  place: { lat: number; lng: number; parish: string; street: string } | null;
  duplicates: { id: string; title: string; category: string; confirmations: number; distanceM: number | null; strength: "exact" | "similar" }[];
};

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

/**
 * The same rule as the website's src/lib/error-copy.ts: never show "Network request failed", because it says
 * nothing about whether the person's report survived. On a phone in a storm that is the only question.
 */
export function errMsg(e: unknown): string {
  const raw = e instanceof Error ? e.message : typeof e === "string" ? e : "";
  if (/network request failed|failed to fetch|load failed/i.test(raw)) {
    return "Your phone cannot reach NowBey right now. The signal may have dropped. Nothing has been sent — try again when you have a bar.";
  }
  if (/abort/i.test(raw)) return "NowBey took too long to answer. The signal may be poor. Try again in a moment.";
  return raw || "Something went wrong. Please try again.";
}

async function call<T>(path: string, init: { method?: string; body?: unknown } = {}): Promise<T> {
  const token = await getToken();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 20000);
  try {
    const res = await fetch(`${API_BASE}${path}`, {
      method: init.method ?? "GET",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        "x-nowbey-client": "native",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: init.body === undefined ? undefined : JSON.stringify(init.body),
      signal: controller.signal,
    });
    let data: unknown = null;
    try {
      data = await res.json();
    } catch {
      /* empty body */
    }
    if (!res.ok) {
      // Server-side failures join the log pipeline (breadcrumbs everywhere, reported at 5xx).
      noteApiFailure(init.method ?? "GET", path, res.status);
      const message = (data as { error?: string } | null)?.error ?? `Request failed (${res.status}).`;
      throw new ApiError(message, res.status);
    }
    return data as T;
  } catch (e) {
    if (e instanceof ApiError) throw e;
    noteApiFailure(init.method ?? "GET", path, 0);
    throw new ApiError(`Could not reach NowBey at ${API_BASE}. Open the You tab and set the Server address to where the NowBey website runs.`, 0);
  } finally {
    clearTimeout(timer);
  }
}

export const api = {
  incidents: (q: { status?: string; parish?: string; limit?: number } = {}) => {
    const p = new URLSearchParams();
    if (q.status) p.set("status", q.status);
    if (q.parish) p.set("parish", q.parish);
    if (q.limit) p.set("limit", String(q.limit));
    return call<{ incidents: Incident[] }>(`/api/incidents?${p.toString()}`);
  },
  incident: (id: string) => call<{ incident: Incident; updates: Update[] }>(`/api/incidents/${id}`),
  createIncident: (body: {
    title: string;
    details?: string;
    category: CategoryKey;
    severity: number;
    lat: number;
    lng: number;
    accuracyMeters?: number;
    address?: string | null;
    street?: string | null;
    parish?: string | null;
    photoNote?: string;
    anonymous?: boolean;
  }) =>
    call<{ incident: Incident; duplicate?: boolean; message?: string }>("/api/incidents", { method: "POST", body }),
  updateIncident: (id: string, kind: "confirm" | "photo" | "clear" | "escalate") =>
    call<{ incident: Incident; message?: string }>(`/api/incidents/${id}/updates`, { method: "POST", body: { kind } }),
  /** Intake copilot: advisory suggestions + near-duplicate warning. Creates nothing. */
  assistReport: (body: {
    title: string;
    details?: string;
    photoNote?: string;
    category: string;
    severity: number;
    parish?: string | null;
    lat?: number | null;
    lng?: number | null;
  }) =>
    call<ReportAssist>(`/api/reports/assist`, { method: "POST", body }),
  news: (limit = 40) => call<{ items: NewsItem[] }>(`/api/news?limit=${limit}`),
  gas: (parish?: string) => call<GasBoard>(`/api/gas${parish ? `?parish=${encodeURIComponent(parish)}` : ""}`),
  reportGas: (b: { station: string; parish: string; fuel: string; price: string }) => call<{ ok: boolean }>("/api/gas", { method: "POST", body: b }),
  refreshNews: () => call<{ stats: { inserted?: number } }>("/api/news", { method: "POST", body: { limit: 12 } }),
  submitLink: (url: string, note: string) => call<{ item: NewsItem }>("/api/news/submit", { method: "POST", body: { url, note } }),
  life: (q: { kind?: string; parish?: string; sort?: string; page?: number; limit?: number } = {}) => {
    const p = new URLSearchParams();
    if (q.kind) p.set("kind", q.kind);
    if (q.parish) p.set("parish", q.parish);
    if (q.sort) p.set("sort", q.sort);
    if (q.page) p.set("page", String(q.page));
    if (q.limit) p.set("limit", String(q.limit));
    return call<{ posts: LifePost[]; total: number; page: number; pages: number }>(`/api/life?${p.toString()}`);
  },
  lifePost: (id: string) => call<{ post: LifePost; photos: { id: string; width: number; height: number }[] }>(`/api/life/${id}`),
  react: (type: TargetType, id: string, kind: ReactionKind | null) => call<Engagement>("/api/react", { method: "POST", body: { type, id, kind } }),
  comments: (type: TargetType, id: string) =>
    call<{ comments: CommentNode[]; total: number; truncated: boolean; engagement: Engagement; open: boolean }>(`/api/comments?type=${type}&id=${id}`),
  addComment: (type: TargetType, id: string, body: string, parentId?: number) =>
    call<{ comment: { id: number } }>("/api/comments", { method: "POST", body: { type, id, body, parentId } }),
  deleteComment: (commentId: number) => call<{ ok: boolean }>(`/api/comments/${commentId}`, { method: "DELETE" }),
  flagComment: (commentId: number, reason: string) => call<{ ok: boolean; already: boolean }>(`/api/comments/${commentId}/flag`, { method: "POST", body: { reason } }),
  likePost: (id: string) => call<{ liked: boolean; count: number }>(`/api/life/${id}/like`, { method: "POST" }),
  reverse: (lat: number, lng: number) => call<Place>(`/api/geocode?lat=${lat}&lng=${lng}`),
  session: () => call<{ user: SessionUser | null }>("/api/session"),
  signIn: (handle: string, password: string) =>
    call<{ token?: string }>("/api/session", { method: "POST", body: { intent: "signin", handle, password } }),
  signUp: (body: { handle: string; email: string; password: string; displayName?: string; parish?: string; termsAccepted: boolean }) =>
    call<{ token?: string }>("/api/session", { method: "POST", body: { intent: "signup", ...body } }),
  signOut: () => call<{ ok: boolean }>("/api/session", { method: "DELETE" }),
  /** Trades the one-time code from the Google deep link for this app's own bearer token. */
  googleExchange: (code: string) => call<{ token?: string }>("/api/auth/google/native", { method: "POST", body: { code } }),
  deleteAccount: (body: { password: string } | { token: string }) =>
    call<{ ok: boolean }>("/api/account", { method: "DELETE", body }),
  /** Emails a one-time link for accounts that have no password to type. */
  requestDeletionLink: () => call<{ ok: boolean }>("/api/account/deletion-link", { method: "POST" }),
  flagPost: (id: string, reason: string) => call<{ ok: boolean; already?: boolean }>(`/api/life/${id}/flag`, { method: "POST", body: { reason } }),
  flagIncident: (id: string, reason: string) => call<{ ok: boolean }>(`/api/incidents/${id}/updates`, { method: "POST", body: { kind: "flag", reason } }),
  subscribeAlert: (body: { target: string; parishes: string[]; categories: CategoryKey[] }) =>
    call<{ ok: boolean; mail: "sent" | "skipped" | "failed" }>("/api/alerts", { method: "POST", body: { channel: "email", ...body } }),
};
