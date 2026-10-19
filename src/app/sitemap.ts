import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? "https://nowbey.com";
  const now = new Date();
  const staticRoutes = ["", "/map", "/feed", "/report", "/wire", "/alerts", "/support", "/privacy", "/terms", "/login"];
  return staticRoutes.map((route) => ({
    url: `${base}${route}`,
    lastModified: now,
    changeFrequency: route === "" ? "daily" : "weekly",
    priority: route === "" ? 1 : route === "/map" || route === "/feed" ? 0.9 : 0.7,
  }));
}
