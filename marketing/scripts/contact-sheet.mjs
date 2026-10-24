/** Contact sheet: every asset in the kit on one page, for review. */
import { createCanvas, loadImage } from "./canvas.mjs";
import { readdirSync, writeFileSync, mkdirSync } from "node:fs";
import { GlobalFonts } from "@napi-rs/canvas";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
for (const f of readdirSync(join(ROOT, "fonts/static"))) GlobalFonts.registerFromPath(join(ROOT, "fonts/static", f));

const posts = readdirSync(join(ROOT, "out/posts")).filter((f) => f.endsWith(".png")).sort();
const stories = readdirSync(join(ROOT, "out/stories")).filter((f) => f.endsWith(".png")).sort();
const videos = readdirSync(join(ROOT, "out/video")).filter((f) => f.endsWith(".mp4")).sort();
const posters = readdirSync(join(ROOT, "out/video")).filter((f) => f.endsWith(".png")).sort();

const COLS = 5;
const CELL_W = 300;
const GAP = 18;
const PAD = 48;
const SECTION_GAP = 54;
const groups = [
  ["FEED POSTS · 1080 × 1080 · Instagram + Facebook", posts, "out/posts", CELL_W],
  ["STORIES & REELS COVERS · 1080 × 1920", stories, "out/stories", Math.round(CELL_W * 0.62)],
  ["REELS · 8s · 1080 × 1920 · 30fps · H.264", posters, "out/video", Math.round(CELL_W * 0.62)],
];
const rowHeights = groups.map(([, files, , cw]) => {
  const rows = Math.ceil(files.length / COLS);
  const cellH = cw === CELL_W ? CELL_W : Math.round(CELL_W * 1.0);
  return rows * (cellH + 40);
});
const W = PAD * 2 + COLS * CELL_W + (COLS - 1) * GAP;
const H = PAD * 2 + 110 + rowHeights.reduce((a, b) => a + b + SECTION_GAP, 0) + 60;

const canvas = createCanvas(W, H);
const ctx = canvas.getContext("2d");
ctx.fillStyle = "#0c151d";
ctx.fillRect(0, 0, W, H);
ctx.strokeStyle = "rgba(122,186,190,0.07)";
for (let x = 0; x < W; x += 56) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); }
for (let y = 0; y < H; y += 56) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }

ctx.fillStyle = "#f3f1ea";
ctx.font = "800 54px Brico800";
ctx.fillText("NowBey — social launch kit", PAD, PAD + 34);
ctx.font = "400 22px Inter400";
ctx.fillStyle = "#9aafb3";
ctx.fillText("Every asset generated from the product's own design tokens · marketing/out/", PAD, PAD + 72);

let y = PAD + 120;
for (const [title, files, dir, cw] of groups) {
  ctx.font = "700 20px JBMono700";
  ctx.fillStyle = "#3fd6c0";
  ctx.fillText(title, PAD, y + 24);
  y += 46;
  let col = 0;
  let rowTop = y;
  // squares get a square row; portraits get a 9:16 row
  const rowH = cw === CELL_W ? CELL_W : Math.round(CELL_W * 1.0);
  for (const f of files) {
    const img = await loadImage(join(ROOT, dir, f));
    const x = PAD + col * (CELL_W + GAP);
    // contain-fit inside the cell, keeping the true aspect
    const s = Math.min(CELL_W / img.width, rowH / img.height);
    const dw = img.width * s;
    const dh = img.height * s;
    const dx = x + (CELL_W - dw) / 2;
    ctx.save();
    ctx.beginPath();
    ctx.roundRect(dx, rowTop, dw, dh, 10);
    ctx.clip();
    ctx.drawImage(img, dx, rowTop, dw, dh);
    ctx.restore();
    ctx.strokeStyle = "rgba(148,206,202,0.16)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(dx, rowTop, dw, dh, 10);
    ctx.stroke();
    ctx.font = "400 15px Inter400";
    ctx.fillStyle = "#b9c8c9";
    ctx.fillText(f.replace(/\\.(png|mp4)$/, ""), x, rowTop + dh + 22);
    col++;
    if (col === COLS) {
      col = 0;
      y = rowTop + rowH + 40;
      rowTop = y;
    }
  }
  if (col !== 0) y = rowTop + rowH + 40;
  y += SECTION_GAP - 40;
}

ctx.font = "400 20px Inter400";
ctx.fillStyle = "#9aafb3";
ctx.fillText(`nowbey.com  ·  ${posts.length} posts  ·  ${stories.length} vertical frames  ·  ${videos.length} reels (8s each)`, PAD, H - 46);

mkdirSync(join(ROOT, "out"), { recursive: true });
writeFileSync(join(ROOT, "out/CONTACT_SHEET.png"), canvas.toBuffer("image/png"));
console.log("✓ out/CONTACT_SHEET.png", canvas.width, "x", canvas.height);
