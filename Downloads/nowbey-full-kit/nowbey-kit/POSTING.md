# Posting this kit — the short version

## Batch 2 (days 15–20) is already in the plan

The four-pillar batch — photographic frames in `out/alt/`, captions in `captions/batch-2/`,
calendar entries in `captions/plan.json` days 15–20 — posts through the same CLI as everything
below. The brief, the MARCO Alert ruling and the step-by-step CLI route live in
`SOCIAL-BATCH-2.md` → "Publishing — the CLI route, step by step". Rehearse with
`npm run publish -- plan --day 15 --dry-run` before anything real.

## When Meta rate-limits you — `403 OAuthException Application request limit reached`

This is the **app-level call budget**, not a problem with your post or token. It typically hits
when a run makes many calls in a short window (fingerprint checks + media create + publish, per
entry), and it clears on a rolling window — usually within the hour.

What the kit does about it now:

- `graph()` **backs off and retries by itself**: 60s, then 2 min, then 5 min per limited call,
  logging `⏳ Meta rate limit (code 4) · x-app-usage …` before each sleep. If it still fails after
  three retries, the window is genuinely full — wait ~an hour and re-run.
- **Nothing repeats on the retry.** `.publish-state.json` records only posts that actually went
  out, so a day that half-failed (Facebook ✅, Instagram ❌) re-runs as *Instagram only*: the
  Facebook entry is skipped from the ledger, and the fingerprint check would catch it anyway even
  without the ledger.

Pacing advice so you meet the limit less:

- Run one day at a time, not `--day all`, and leave breathing room between days.
- During an active weather event the map post outranks the calendar — accept the odd limit there
  and let the backoff handle it.
- `--force` repeats a recorded post; never use it to "fix" a rate-limit failure, or you will post
  the same caption twice.

## Can this kit post itself? Not without credentials — but the CLI is already written.

There is no token in this repo and Arena has no Instagram / Facebook / TikTok connector, so nothing
here can publish on its own. What it does ship is `scripts/publish.mjs`: a Graph API client that
posts the exact files in `out/` from your terminal, once you supply a token.

### The CLI (Instagram + Facebook)

```bash
cd marketing
export META_TOKEN=EAA...          # long-lived token: instagram_basic,
                                  # instagram_content_publish, pages_show_list,
                                  # pages_manage_posts
export IG_USER_ID=17841400...     # IG Business account id
export FB_PAGE_ID=100000...       # the Page it is linked to

npm run publish -- --help         # every command
```

Meta fetches media from a URL, so the kit has to be reachable. Either host `out/` and pass
`--base https://your-host/kit/`, or give full `https://` URLs:

```bash
# always try it dry first — it prints the exact calls and posts nothing
npm run publish -- ig-post --image out/posts/01-map.png \
  --base https://nowbey.com/kit/ --caption "See what's happening on your island." --dry-run

# feed post
npm run publish -- ig-post --image out/posts/01-map.png \
  --base https://nowbey.com/kit/ --caption-file cap-01.txt

# carousel, in swipe order
npm run publish -- ig-carousel \
  --images out/posts/06-feed.png,out/posts/01-map.png,out/posts/02-report.png,out/posts/05-confirmed.png,out/posts/03-alerts.png \
  --base https://nowbey.com/kit/ --caption-file cap-carousel.txt

# reel, with its poster as the cover
npm run publish -- ig-reel --video out/video/01-map-countdown.mp4 \
  --cover out/video/01-map-countdown-poster.png \
  --base https://nowbey.com/kit/ --caption-file cap-reel-1.txt

# 24-hour story
npm run publish -- ig-story --image out/stories/S1-map-story.png --base https://nowbey.com/kit/

# Facebook Page post, scheduled (10 min – 30 days ahead)
npm run publish -- fb-post --image out/posts/01-map.png \
  --message "Quick one for the Nassau folks…" \
  --base https://nowbey.com/kit/ --scheduled 2026-10-27T07:00:00-04:00
```

Getting the ids once: `curl "https://graph.facebook.com/v21.0/me/accounts?access_token=$META_TOKEN"`
gives the Page ids; `curl ".../PAGE_ID?fields=instagram_business_account&access_token=$META_TOKEN"`
gives the IG id. A System User token from Meta Business Settings is the sane long-term choice — it
does not expire in 60 days the way a user token does.

**TikTok is not in the CLI.** Its Content Posting API needs an app that has been through TikTok's
audit (weeks, and a business account); until then the only route is uploading in the app. Same for
scheduling: Meta's own Planner covers IG + FB natively, and it is free.

## No terminal? Upload by hand

Three ways, easiest first.

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
