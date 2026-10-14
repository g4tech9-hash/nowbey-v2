import { inArray } from "drizzle-orm";
import { db } from "@/db";
import { deviceTokens } from "@/db/schema";
import { chunkArray, isDeadReceipt, isExpoPushToken, type PushReceipt } from "./collect";

const PUSH_URL = "https://exp.host/--/api/v2/push/send";
const RECEIPT_URL = "https://exp.host/--/api/v2/push/getReceipts";

export type PushMessage = { title: string; body: string; data?: Record<string, string> };

function headers(): Record<string, string> {
  const h: Record<string, string> = { "Content-Type": "application/json", Accept: "application/json" };
  const token = process.env.EXPO_ACCESS_TOKEN?.trim();
  if (token) h.Authorization = `Bearer ${token}`;
  return h;
}

type Ticket = { status: string; id?: string };

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

    const h = headers();
    const owned: { token: string; id: string }[] = [];
    for (const part of chunkArray(tokens, 100)) {
      const res = await fetch(PUSH_URL, {
        method: "POST",
        headers: h,
        body: JSON.stringify(
          part.map((to) => ({ to, title: msg.title, body: msg.body, data: msg.data ?? {}, channelId: "default" })),
        ),
      });
      if (!res.ok) continue;
      const tickets = ((await res.json()) as { data?: Ticket[] }).data ?? [];
      tickets.forEach((t, i) => {
        if (t?.status === "ok" && t.id) {
          out.sent += 1;
          owned.push({ token: part[i], id: t.id });
        }
      });
    }

    const dead: string[] = [];
    for (const part of chunkArray(owned, 100)) {
      const res = await fetch(RECEIPT_URL, {
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
