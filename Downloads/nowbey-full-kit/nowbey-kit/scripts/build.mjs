/**
 * NOWBEY MARKETING — BUILD
 * ---------------------------------------------------------------------------
 *   node scripts/build.mjs            everything
 *   node scripts/build.mjs posts      just the 1080×1080 feed posts
 *   node scripts/build.mjs stories    just the 1080×1920 stories + Reels covers
 *   node scripts/build.mjs video      just the reels / clip stills
 *   node scripts/build.mjs 04         any asset whose name contains "04"
 *
 * Output lands in marketing/out/<group>/ at the platform's own pixel size.
 */

import { mkdirSync, writeFileSync } from "node:fs";
import { render } from "./lib.mjs";
import { POSTS } from "./build-posts.mjs";
import { STORIES } from "./build-stories.mjs";

const args = process.argv.slice(2);
const filter = args.find((a) => !["posts", "stories"].includes(a));
const groups = [];
if (!args.length || args.includes("posts")) groups.push(["posts", POSTS, 1080]);
if (!args.length || args.includes("stories")) groups.push(["stories", STORIES, 1080]);

for (const [group, table, width] of groups) {
  mkdirSync(`out/${group}`, { recursive: true });
  for (const [name, fn] of Object.entries(table)) {
    if (filter && !name.includes(filter)) continue;
    const svg = await fn();
    const png = render(svg, width);
    writeFileSync(`out/${group}/${name}.png`, png);
    console.log(`  ${group}/${name}.png  ${Math.round(png.length / 1024)} KB`);
  }
}
