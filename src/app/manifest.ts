import type { MetadataRoute } from "next";
import { BRAND } from "@/lib/brand";

/** Lets a phone install NowBey to its home screen (no app store needed). */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: `${BRAND.name} · ${BRAND.tagline}`,
    short_name: BRAND.name,
    description: BRAND.description,
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#03121b",
    theme_color: "#03121b",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
      // Maskable: the artwork sits inside the 80% safe zone, so Android can crop it to any shape.
      { src: "/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml" },
    ],
  };
}
