import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { alertSubscriptions, users, type Incident } from "@/db/schema";
import { CATEGORIES, haversineMeters, type CategoryKey } from "@/lib/geo";
import { emailButton, emailLayout, escapeHtml, sendMail } from "@/lib/mail";
import { PAID_STORM_TIERS, entitledTier } from "@/lib/tiers";
import { demoPlansAllowed } from "@/lib/billing";

const COOLDOWN_MS = 3 * 60 * 1000;
const SEVERITY = ["Annoying", "Blocking a lane", "Blocking a road", "Dangerous"];

export type DispatchStats = { matched: number; sent: number; skipped: number; failed: number };

/**
 * Emails everyone whose confirmed alert profile covers this report's island and category.
 * Rules: reports rated "annoying" stay quiet unless they are storms; nobody gets more than
 * one alert every three minutes; Rock Sound and Admiral members always get storm reports
 * for their islands, whatever categories they picked; you are never alerted about your own report.
 * Geofence: profiles with a saved centre only match reports within their radiusKm.
 */
export async function dispatchIncidentAlerts(incident: Incident, base: string): Promise<DispatchStats> {
  const stats: DispatchStats = { matched: 0, sent: 0, skipped: 0, failed: 0 };
  const isStorm = incident.category === "storm";
  if (incident.severity < 2 && !isStorm) return stats;

  const rows = await db
    .select({ sub: alertSubscriptions, tier: users.adFreeTier, status: users.planStatus })
    .from(alertSubscriptions)
    .leftJoin(users, eq(alertSubscriptions.userId, users.id))
    .where(
      and(
        eq(alertSubscriptions.verified, true),
        eq(alertSubscriptions.active, true),
        eq(alertSubscriptions.channel, "email"),
      ),
    );

  const meta = CATEGORIES[incident.category as CategoryKey] ?? CATEGORIES.notice;
  const where = [incident.street, incident.parish].filter(Boolean).join(", ") || "The Bahamas";
  const link = `${base}/incident/${incident.id}`;
  const now = Date.now();
  const demo = demoPlansAllowed();

  for (const { sub, tier, status } of rows) {
    const islands = sub.parishes.split(",").map((s) => s.trim());
    if (!incident.parish || !islands.includes(incident.parish)) continue;

    const cats = sub.categories.split(",").map((s) => s.trim()).filter(Boolean);
    const owner = entitledTier({ adFreeTier: tier, planStatus: status }, demo);
    const stormOverride = isStorm && owner !== null && PAID_STORM_TIERS.includes(owner);
    if (cats.length && !cats.includes(incident.category) && !stormOverride) continue;
    if (incident.userId && sub.userId === incident.userId) continue;

    // Geofence: a profile with a saved centre only fires inside its radius.
    // Profiles without a centre keep the old island-wide behaviour.
    if (
      typeof sub.lat === "number" &&
      typeof sub.lng === "number" &&
      Number.isFinite(sub.lat) &&
      Number.isFinite(sub.lng) &&
      Number.isFinite(incident.lat) &&
      Number.isFinite(incident.lng)
    ) {
      const radiusM = Math.min(100, Math.max(2, sub.radiusKm ?? 12)) * 1000;
      if (haversineMeters([sub.lat, sub.lng], [incident.lat, incident.lng]) > radiusM) continue;
    }

    stats.matched += 1;
    if (sub.lastSentAt && now - sub.lastSentAt.getTime() < COOLDOWN_MS) {
      stats.skipped += 1;
      continue;
    }

    const stop = `${base}/alerts?stop=${sub.token ?? ""}`;
    const subject = `${meta.label} · ${incident.title}`.slice(0, 120);
    const body = `
      <p style="margin:0 0 6px;font-size:13px;color:${meta.color};font-weight:800;text-transform:uppercase;letter-spacing:.06em">${escapeHtml(meta.label)} · ${escapeHtml(SEVERITY[incident.severity - 1] ?? "Notice")}</p>
      <p style="margin:0 0 6px;font-size:16px;font-weight:700;color:#f6ead8">${escapeHtml(incident.title)}</p>
      <p style="margin:0 0 6px;font-size:14px;color:#a9cdc9">${escapeHtml(where)}</p>
      ${incident.details ? `<p style="margin:10px 0 0;font-size:14px;line-height:1.5;color:#cfeee9">${escapeHtml(incident.details.slice(0, 400))}</p>` : ""}
      ${emailButton(link, "See it on the map")}`;
    const footer = `You get this because you asked for alerts about ${escapeHtml(sub.parishes.split(",").join(", "))}. <a href="${escapeHtml(stop)}" style="color:#74f3e3">Stop these alerts</a>.`;
    const text = `${meta.label}: ${incident.title}\n${where}\n${link}\n\nStop these alerts: ${stop}`;

    const result = await sendMail({
      to: sub.target,
      subject,
      html: emailLayout("New report near you", body, footer),
      text,
      kind: "alert",
    });
    if (result.status === "sent") {
      stats.sent += 1;
      await db.update(alertSubscriptions).set({ lastSentAt: new Date() }).where(eq(alertSubscriptions.id, sub.id));
    } else if (result.status === "failed") stats.failed += 1;
    else stats.skipped += 1;
  }
  return stats;
}

export type NewsForAlert = { id: string; title: string; summary: string | null; url: string; parish: string | null; category: string; sourceName: string };

/**
 * Emails subscribers about a news story an editor has chosen to send. Same rules as incident alerts: only
 * confirmed subscribers, only the islands and categories they picked, and the three-minute cooldown.
 */
export async function dispatchNewsAlert(story: NewsForAlert, base: string): Promise<DispatchStats> {
  const stats: DispatchStats = { matched: 0, sent: 0, skipped: 0, failed: 0 };
  if (!story.parish) return stats;

  const rows = await db
    .select({ sub: alertSubscriptions })
    .from(alertSubscriptions)
    .where(and(eq(alertSubscriptions.verified, true), eq(alertSubscriptions.active, true), eq(alertSubscriptions.channel, "email")));

  const meta = CATEGORIES[story.category as CategoryKey] ?? CATEGORIES.notice;
  const link = `${base}/wire/${story.id}`;
  const now = Date.now();

  for (const { sub } of rows) {
    const islands = sub.parishes.split(",").map((s) => s.trim());
    if (!islands.includes(story.parish)) continue;
    const cats = sub.categories.split(",").map((s) => s.trim()).filter(Boolean);
    if (cats.length && !cats.includes(story.category)) continue;

    stats.matched += 1;
    if (sub.lastSentAt && now - sub.lastSentAt.getTime() < COOLDOWN_MS) {
      stats.skipped += 1;
      continue;
    }

    const stop = `${base}/alerts?stop=${sub.token ?? ""}`;
    const body = `
      <p style="margin:0 0 6px;font-size:13px;color:${meta.color};font-weight:800;text-transform:uppercase;letter-spacing:.06em">${escapeHtml(meta.label)} · News from ${escapeHtml(story.sourceName)}</p>
      <p style="margin:0 0 6px;font-size:16px;font-weight:700;color:#f6ead8">${escapeHtml(story.title)}</p>
      <p style="margin:0 0 6px;font-size:14px;color:#a9cdc9">${escapeHtml(story.parish)}</p>
      ${story.summary ? `<p style="margin:10px 0 0;font-size:14px;line-height:1.5;color:#cfeee9">${escapeHtml(story.summary.slice(0, 300))}</p>` : ""}
      ${emailButton(link, "Read on NowBey")}
      <p style="margin:10px 0 0;font-size:12px;color:#6e97a0">Full story: <a href="${escapeHtml(story.url)}" style="color:#74f3e3">${escapeHtml(story.sourceName)}</a></p>`;
    const footer = `You get this because you asked for alerts about ${escapeHtml(sub.parishes.split(",").join(", "))}. <a href="${escapeHtml(stop)}" style="color:#74f3e3">Stop these alerts</a>.`;

    const result = await sendMail({
      to: sub.target,
      subject: `Alert · ${story.title}`.slice(0, 120),
      html: emailLayout("News alert near you", body, footer),
      text: `${meta.label}: ${story.title}\n${story.parish}\n${link}\n\nStop these alerts: ${stop}`,
      kind: "news-alert",
    });
    if (result.status === "sent") {
      stats.sent += 1;
      await db.update(alertSubscriptions).set({ lastSentAt: new Date() }).where(eq(alertSubscriptions.id, sub.id));
    } else if (result.status === "failed") stats.failed += 1;
    else stats.skipped += 1;
  }
  return stats;
}
