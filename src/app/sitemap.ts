import type { MetadataRoute } from "next";
import { hasDatabase, pool } from "@/db";

/**
 * Sitemap: static routes always; live incident URLs when a database is attached.
 *
 * Deliberately request-time (not build-time): a fresh deploy without a database
 * must still ship a valid sitemap (the static half), and one with a database
 * should list real incidents from the first request rather than waiting for an
 * ISR window. The incident query is tiny (one indexed scan, capped), and a
 * failure degrades to the static half instead of erroring — a missing sitemap
 * costs discovery; a 500 costs trust.
 */
export const dynamic = "force-dynamic";

const INCIDENT_URL_CAP = 1000;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? "https://nowbey.com";
  const now = new Date();
  const staticRoutes = ["", "/map", "/feed", "/report", "/wire", "/alerts", "/support", "/privacy", "/terms", "/login"];
  const entries: MetadataRoute.Sitemap = staticRoutes.map((route) => ({
    url: `${base}${route}`,
    lastModified: now,
    changeFrequency: route === "" ? "daily" : "weekly",
    priority: route === "" ? 1 : route === "/map" || route === "/feed" ? 0.9 : 0.7,
  }));

  if (!hasDatabase()) return entries;

  try {
    const { rows } = await pool.query<{ id: string; updated_at: string | Date }>(
      `SELECT id, updated_at FROM incidents WHERE status = 'active' ORDER BY updated_at DESC LIMIT $1`,
      [INCIDENT_URL_CAP],
    );
    for (const row of rows) {
      entries.push({
        url: `${base}/incident/${row.id}`,
        lastModified: new Date(row.updated_at),
        changeFrequency: "daily",
        priority: 0.8,
      });
    }
  } catch (err) {
    console.error("[sitemap] incident URLs skipped:", err instanceof Error ? err.message : err);
  }
  return entries;
}
