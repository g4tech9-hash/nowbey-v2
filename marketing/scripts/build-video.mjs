/**
 * Builds the three reels. Usage: node scripts/build-video.mjs [1|2|3|all]
 * Each clip is 8s, 1080×1920, 30fps, H.264 (yuv420p, faststart) + a looped
 * poster frame, so the same file loads instantly on TikTok, Reels and FB.
 */
import { videoMap, videoReport, videoAlerts } from "./video.mjs";

const which = process.argv[2] ?? "all";
const jobs = { 1: videoMap, 2: videoReport, 3: videoAlerts };
for (const [k, fn] of Object.entries(jobs)) {
  if (which !== "all" && which !== k) continue;
  const t0 = Date.now();
  const out = await fn();
  console.log(`✓ ${out}  (${((Date.now() - t0) / 1000).toFixed(1)}s)`);
}
