# Posting this kit — the short version

## Can this kit post itself? No.

Nothing in this repo has a social API token, and Arena has no Instagram / Facebook / TikTok
connector, so publishing has to happen from an account you own. What the kit does give you is every
file in its final size and every caption ready to copy — the human step is upload, paste, press post.

Three ways to do it, easiest first.

---

## 1. Meta Business Suite (free, no third-party app) — best for scheduling

Instagram feed posts, carousels, Stories and Facebook posts can all be scheduled from
**business.facebook.com → Planner** on desktop.

1. Download the folder `marketing/out/posts/` (8 files) and `marketing/out/stories/` (9 files).
2. Open `CAMPAIGN.md` → section **B** for Instagram, **C** for Facebook.
3. Create post → upload image → paste caption → set date/time from the calendar → schedule.
4. Carousel: upload the five files in this order — `06-feed`, `01-map`, `02-report`, `05-confirmed`,
   `03-alerts` — and paste the carousel caption.

**Important for Stories:** the verticals are 1080 × 1920 with the type in the upper third, so keep the
platform's own link sticker in the lower third (around 78% height) and it will not collide with the
copy.

## 2. Phone upload (fastest for today's posts)

AirDrop the files to your phone, or open the gallery URL in your phone browser and long-press → save.
Instagram and TikTok then read the exact 1080 × 1080 / 1080 × 1920 files with no re-crop.

## 3. Scheduling tools (only if you already pay for one)

Metricool and Buffer both accept square + vertical uploads and can cross-post IG/FB/TikTok. Do not
use a tool that re-encodes the reels — the H.264 files here are already platform-legal and a second
transcode softens the UI text.

---

## The 20-minute version (if you only do one thing today)

1. Post `out/posts/01-map.png` to Instagram with the Post 01 caption from `CAMPAIGN.md`.
2. Post `out/posts/01-map.png` to Facebook with the **Post A** caption (the local-group one).
3. Upload `out/video/01-map-countdown.mp4` to Reels and TikTok, add a trending track in-app, use the
   Reel 1 caption.
4. Post `out/stories/S1-map-story.png` and `out/stories/S2-alerts-story.png` as a two-frame Story with
   a link sticker to `nowbey.com` on the second frame.

That is the whole first day of the calendar.

---

## Reels: two settings that matter

- **Cover frame.** Upload the matching poster (`out/video/*-poster.png`) as the cover rather than
  letting the app grab frame 0. The end card and the hook line are both legible in it.
- **Captions.** The type is burned in, so they work muted. Do not also enable auto-captions on
  Reels — you will get two sets of words fighting each other. On TikTok, auto-captions are fine
  because they sit low, under the burned-in headline.

## Before the first post, check two strings

- The domain in the CTAs is `nowbey.com` on every asset. If the live domain differs, change it in
  `scripts/postkit.mjs` and re-run `npm run build` + `npm run build:video`.
- Coverage claim on every asset is **Live for New Providence**. If another island goes live, say so
  deliberately — do not soften it to "The Bahamas" until the map actually covers it.
