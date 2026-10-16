/*
 * Push alerts through Firebase Cloud Messaging (HTTP v1 API). No server SDK: the OAuth token is a
 * service-account JWT signed here with node:crypto, and each message is one HTTPS POST.
 * Everything is a no-op until the three FIREBASE_* server keys (and the NEXT_PUBLIC_* web keys
 * for the browser) are set — the rest of the app never needs to know whether push is on.
 */
import { createSign } from "node:crypto";
import { eq, inArray, sql } from "drizzle-orm";
import { db } from "@/db";
import { deviceTokens, pushTokens, type Incident, type NewsItem } from "@/db/schema";
import { oneLine } from "@/lib/ai";
import { chunkArray, isDeadReceipt, isExpoPushToken, type PushReceipt } from "@/lib/collect";
import { CATEGORIES, nearestParish, type CategoryKey } from "@/lib/geo";

export function pushConfigured(): boolean {
  return Boolean(
    process.env.FIREBASE_PROJECT_ID?.trim() &&
      process.env.FIREBASE_CLIENT_EMAIL?.trim() &&
      process.env.FIREBASE_PRIVATE_KEY?.trim() &&
      pushPublicConfig(),
  );
}

/** Keys the browser needs to talk to Firebase. Safe to expose — they identify the project, they do not authorise anything. */
export function pushPublicConfig(): { config: Record<string, string>; vapidKey: string } | null {
  const g = (k: string) => process.env[k]?.trim() ?? "";
  const config: Record<string, string> = {
    apiKey: g("NEXT_PUBLIC_FIREBASE_API_KEY"),
    projectId: g("NEXT_PUBLIC_FIREBASE_PROJECT_ID"),
    messagingSenderId: g("NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID"),
    appId: g("NEXT_PUBLIC_FIREBASE_APP_ID"),
  };
  const authDomain = g("NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN");
  if (authDomain) config.authDomain = authDomain;
  if (Object.values(config).some((v) => !v)) return null;
  const vapidKey = g("NEXT_PUBLIC_FIREBASE_VAPID_KEY");
  if (!vapidKey) return null;
  return { config, vapidKey };
}

function serviceAccount(): { projectId: string; clientEmail: string; privateKey: string } | null {
  const projectId = process.env.FIREBASE_PROJECT_ID?.trim();
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL?.trim();
  // PEM newlines are often pasted as \n into env managers; undo that.
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n").trim();
  if (!projectId || !clientEmail || !privateKey) return null;
  return { projectId, clientEmail, privateKey };
}

let cachedToken: { token: string; expiresAt: number } | null = null;

/** Mint (and cache) a Google OAuth access token for the FCM scope straight from the service account. */
async function accessToken(): Promise<string | null> {
  const sa = serviceAccount();
  if (!sa) return null;
  if (cachedToken && Date.now() < cachedToken.expiresAt - 60_000) return cachedToken.token;

  const now = Math.floor(Date.now() / 1000);
  const b64 = (o: object) => Buffer.from(JSON.stringify(o)).toString("base64url");
  const unsigned = `${b64({ alg: "RS256", typ: "JWT" })}.${b64({
    iss: sa.clientEmail,
    scope: "https://www.googleapis.com/auth/firebase.messaging",
    aud: "https://oauth2.googleapis.com/token",
    iat: now,
    exp: now + 3600,
  })}`;

  let jwt: string;
  try {
    const sign = createSign("RSA-SHA256");
    sign.update(unsigned);
    sign.end();
    jwt = `${unsigned}.${sign.sign(sa.privateKey, "base64url")}`;
  } catch (err) {
    console.error(`[push] FIREBASE_PRIVATE_KEY could not sign (${err instanceof Error ? err.message : err})`);
    return null;
  }

  try {
    const res = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      cache: "no-store",
      signal: AbortSignal.timeout(8000),
      body: new URLSearchParams({
        grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
        assertion: jwt,
      }),
    });
    if (!res.ok) {
      console.error(`[push] Google refused the service account (HTTP ${res.status})`);
      return null;
    }
    const data = (await res.json()) as { access_token?: string; expires_in?: number };
    if (!data.access_token) return null;
    cachedToken = { token: data.access_token, expiresAt: Date.now() + (data.expires_in ?? 3600) * 1000 };
    return data.access_token;
  } catch (err) {
    console.error(`[push] token request failed: ${err instanceof Error ? err.message : err}`);
    return null;
  }
}

type PushPayload = { title: string; body: string; url: string; kind: string; icon: string };

/** One FCM send. "gone" means the registration is dead and should be deleted. */
async function sendOne(oauth: string, projectId: string, token: string, p: PushPayload): Promise<"ok" | "gone" | "failed"> {
  try {
    const res = await fetch(`https://fcm.googleapis.com/v1/projects/${encodeURIComponent(projectId)}/messages:send`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${oauth}` },
      cache: "no-store",
      signal: AbortSignal.timeout(8000),
      body: JSON.stringify({
        message: {
          token,
          notification: { title: p.title.slice(0, 100), body: p.body.slice(0, 220) },
          data: { url: p.url, kind: p.kind },
          webpush: {
            notification: { icon: p.icon },
            fcmOptions: { link: p.url },
          },
        },
      }),
    });
    if (res.ok) return "ok";
    const body = (await res.json().catch(() => null)) as { error?: { status?: string; message?: string } } | null;
    const status = body?.error?.status ?? "";
    if (status === "UNREGISTERED" || status === "INVALID_ARGUMENT") return "gone";
    console.warn(`[push] FCM answered HTTP ${res.status} (${(body?.error?.message ?? status) || "no detail"})`);
    return "failed";
  } catch (err) {
    console.warn(`[push] send failed: ${err instanceof Error ? err.message : err}`);
    return "failed";
  }
}

export type PushStats = { matched: number; sent: number; skipped: number; failed: number; pruned: number };

const COOLDOWN_MS = 3 * 60 * 1000;

/** Shared matching + sending for both incidents and wire stories. */
async function dispatch(opts: {
  parish: string | null;
  category: string;
  lat: number | null;
  lng: number | null;
  payload: (originLink: string) => PushPayload;
  link: string;
}): Promise<PushStats> {
  const stats: PushStats = { matched: 0, sent: 0, skipped: 0, failed: 0, pruned: 0 };
  if (!pushConfigured()) return stats;
  const sa = serviceAccount();
  if (!sa) return stats;

  const rows = await db.select().from(pushTokens).where(eq(pushTokens.active, true));
  if (!rows.length) return stats;

  const oauth = await accessToken();
  if (!oauth) return stats;

  const now = Date.now();
  const targets: typeof rows = [];
  for (const row of rows) {
    const islands = row.parishes.split(",").map((s) => s.trim()).filter(Boolean);
    // Content with no island can never match a device safely — skip it rather than wake the wrong island.
    if (!opts.parish) continue;
    if (islands.length && !islands.includes(opts.parish)) continue;
    const cats = row.categories.split(",").map((s) => s.trim()).filter(Boolean);
    if (cats.length && !cats.includes(opts.category)) continue;
    stats.matched += 1;
    if (row.lastPushAt && now - row.lastPushAt.getTime() < COOLDOWN_MS) {
      stats.skipped += 1;
      continue;
    }
    targets.push(row);
  }

  const payload = opts.payload(opts.link);
  // FCM v1 has no multicast; small fan-out in batches is plenty for a Nassau-sized audience.
  for (let i = 0; i < targets.length; i += 20) {
    const results = await Promise.allSettled(targets.slice(i, i + 20).map((row) => sendOne(oauth, sa.projectId, row.token, payload)));
    const dead: string[] = [];
    const sentIds: number[] = [];
    results.forEach((r, j) => {
      const row = targets[i + j];
      if (r.status !== "fulfilled") {
        stats.failed += 1;
        return;
      }
      if (r.value === "ok") {
        stats.sent += 1;
        sentIds.push(row.id);
      } else if (r.value === "gone") {
        dead.push(row.token);
        stats.pruned += 1;
      } else stats.failed += 1;
    });
    if (sentIds.length) {
      await db.update(pushTokens).set({ lastPushAt: new Date() }).where(sql`${pushTokens.id} = any(${sentIds}::int[])`);
    }
    for (const token of dead) await db.delete(pushTokens).where(eq(pushTokens.token, token));
  }
  return stats;
}

/** Push for a fresh incident. Same bar as email alerts: quiet "annoying" reports stay on the map only. */
export async function dispatchIncidentPush(incident: Incident, base: string): Promise<PushStats> {
  const isStorm = incident.category === "storm";
  if (incident.severity < 2 && !isStorm) return { matched: 0, sent: 0, skipped: 0, failed: 0, pruned: 0 };
  const meta = CATEGORIES[incident.category as CategoryKey] ?? CATEGORIES.notice;
  const where = [incident.street, incident.address, incident.parish].filter(Boolean).join(", ") || "The Bahamas";
  const link = `${base}/incident/${incident.id}`;
  return dispatch({
    parish: incident.parish ?? (Number.isFinite(incident.lat) && Number.isFinite(incident.lng) ? nearestParish(incident.lat, incident.lng) : null),
    category: incident.category,
    lat: incident.lat,
    lng: incident.lng,
    link,
    payload: () => ({
      title: `${meta.label} · ${oneLine(incident.title, 80)}`,
      body: oneLine(where, 140),
      url: link,
      kind: "incident",
      icon: `${base}/icon.svg`,
    }),
  });
}

/** Push for a wire story an editor pressed "Send alert" on. */
export async function dispatchNewsPush(story: Pick<NewsItem, "id" | "title" | "parish" | "category" | "sourceName">, base: string): Promise<PushStats> {
  if (!story.parish) return { matched: 0, sent: 0, skipped: 0, failed: 0, pruned: 0 };
  const meta = CATEGORIES[story.category as CategoryKey] ?? CATEGORIES.notice;
  const link = `${base}/wire/${story.id}`;
  return dispatch({
    parish: story.parish,
    category: story.category,
    lat: null,
    lng: null,
    link,
    payload: () => ({
      title: `${meta.label} · ${oneLine(story.title, 80)}`,
      body: oneLine(`${story.parish} · from ${story.sourceName}`, 140),
      url: link,
      kind: "news",
      icon: `${base}/icon.svg`,
    }),
  });
}

/* --- Expo Push Service (mobile app) --- */

const EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send";
const EXPO_RECEIPT_URL = "https://exp.host/--/api/v2/push/getReceipts";

export type PushMessage = { title: string; body: string; data?: Record<string, string> };

function expoHeaders(): Record<string, string> {
  const h: Record<string, string> = { "Content-Type": "application/json", Accept: "application/json" };
  const token = process.env.EXPO_ACCESS_TOKEN?.trim();
  if (token) h.Authorization = `Bearer ${token}`;
  return h;
}

type ExpoTicket = { status: string; id?: string };

/**
 * Sends a push to every registered device of the given members via the Expo
 * Push Service. Never throws: push failures must never block email.
 */
export async function sendPushForUsers(userIds: string[], msg: PushMessage): Promise<{ sent: number; pruned: number }> {
  const out = { sent: 0, pruned: 0 };
  try {
    const ids = [...new Set(userIds)].filter(Boolean);
    if (!ids.length) return out;
    const rows = await db
      .select({ token: deviceTokens.token })
      .from(deviceTokens)
      .where(inArray(deviceTokens.userId, ids));
    const tokens = [...new Set(rows.map((r) => r.token).filter(isExpoPushToken))];
    if (!tokens.length) return out;

    const h = expoHeaders();
    const owned: { token: string; id: string }[] = [];
    for (const part of chunkArray(tokens, 100)) {
      const res = await fetch(EXPO_PUSH_URL, {
        method: "POST",
        headers: h,
        body: JSON.stringify(
          part.map((to) => ({ to, title: msg.title, body: msg.body, data: msg.data ?? {}, channelId: "default" })),
        ),
      });
      if (!res.ok) continue;
      const tickets = ((await res.json()) as { data?: ExpoTicket[] }).data ?? [];
      tickets.forEach((t, i) => {
        if (t?.status === "ok" && t.id) {
          out.sent += 1;
          owned.push({ token: part[i], id: t.id });
        }
      });
    }

    const dead: string[] = [];
    for (const part of chunkArray(owned, 100)) {
      const res = await fetch(EXPO_RECEIPT_URL, {
        method: "POST",
        headers: h,
        body: JSON.stringify({ ids: part.map((p) => p.id) }),
      });
      if (!res.ok) continue;
      const receipts = ((await res.json()) as { data?: Record<string, PushReceipt> }).data ?? {};
      for (const p of part) {
        const r = receipts[p.id];
        if (r && isDeadReceipt(r)) dead.push(p.token);
      }
    }
    for (const part of chunkArray([...new Set(dead)], 100)) {
      if (!part.length) continue;
      await db.delete(deviceTokens).where(inArray(deviceTokens.token, part));
      out.pruned += part.length;
    }
    return out;
  } catch {
    return out;
  }
}
