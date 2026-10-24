# START HERE — from these files to a live post

Ten minutes if the accounts already exist. Read top to bottom; each step is small.

---

## Step 1 — Take the files with you

Everything you post lives in `marketing/out/`:

```
out/posts/     8 squares    1080×1080   Instagram feed, Facebook
out/stories/   9 verticals  1080×1920   Stories, Reels covers
out/video/     3 reels      8s, 1080×1920, H.264 + a poster PNG each
```

Three ways to get them onto your machine:

- **Zip:** `nowbey-social-kit.zip` in the workspace root (37 MB, 33 files).
- **Gallery:** the preview URL on this page — open an asset and save it.
- **Rebuild:** `cd marketing && npm install && npm run build && npm run build:video`.

Don't re-encode anything. Upload the PNG/MP4 as-is; that's what keeps the UI text sharp.

---

## Step 2 — The two accounts you actually need

| Platform | What it takes |
| --- | --- |
| **Instagram** | A **Business or Creator** account, linked to a Facebook Page. Personal accounts cannot post via API. |
| **Facebook** | A Page (not a personal profile) with you as admin. |
| **TikTok** | A normal account. No API — you upload in the app (see step 6). |

Link IG ↔ Page once: Instagram app → Settings → Account type → *Professional* → *Connect a Facebook Page*.

---

## Step 3 — Put the media behind a public URL

Meta does not accept uploads from your laptop — it **fetches** the image/video from a URL. Pick one:

**A. The site you already deploy (easiest)**
```bash
# copy the kit into the Next.js public folder and deploy
cp -r marketing/out nowbey-v2/public/kit
git add public/kit && git commit -m "publish social kit" && git push
# → https://nowbey.com/kit/posts/01-map.png
```
Remove `public/kit` after the launch month if you don't want 37 MB in the deploy. It is
static, cacheable and needs no extra service.

**B. Netlify Drop** — drag `out/` onto https://app.netlify.com/drop. You get a URL in seconds,
perfect for a one-month campaign. (Vercel, Cloudflare R2 and S3 all work the same way.)

**C. GitHub Pages** — push `out/` to a public repo, enable Pages, use the raw URL.

Whichever you pick, check one file in a browser first:
`https://…/posts/01-map.png` must load with no login.

---

## Step 4 — Get a token and two ids

> **The full click-by-click for all five values is in `CREDENTIALS.md`** — including the two things
> that block most launches: the Instagram account must be Professional *and* linked to the Page, and
> the token has to be extended or made as a System user. Short version below.

Fast path (start today):
1. Open https://developers.facebook.com/tools/explorer/
2. Select your app → **Get User Access Token** → tick `instagram_basic`,
   `instagram_content_publish`, `pages_show_list`, `pages_manage_posts`.
3. Exchange it for a long-lived token (60 days) — Tools → Access Token Debugger → *Extend*.

Durable path (do this before you rely on it): Business Settings → **System users** → create one →
assign the Page and the IG account → generate a token with the same permissions. System user
tokens don't expire.

Then find the ids:
```bash
curl "https://graph.facebook.com/v21.0/me/accounts?access_token=$META_TOKEN"
# → data[].id  = FB_PAGE_ID,   data[].access_token = page token

curl "https://graph.facebook.com/v21.0/$FB_PAGE_ID?fields=instagram_business_account&access_token=$META_TOKEN"
# → instagram_business_account.id = IG_USER_ID
```

Write them into `marketing/.env` (copied from `.env.example`) — the CLI reads it, so you don't have
to export anything:

```bash
META_TOKEN=EAA...
FB_PAGE_ID=100000...
IG_USER_ID=17841...
KIT_BASE=https://nowbey.com/kit          # whatever you chose in step 3
```

Then confirm everything at once:

```bash
node scripts/preflight.mjs
```

---

## Step 5 — Post (CLI), dry run first

The launch calendar is already encoded as data in `captions/plan.json`, with a caption file for every
post. So the shortest path is one command per day:

```bash
export KIT=https://nowbey.com/kit          # step 3
cd marketing

# preview day 1 (6 posts: IG feed, FB post, TikTok, IG reel, 2 stories)
npm run publish -- plan --day 1 --base $KIT --dry-run

# send it
npm run publish -- plan --day 1 --base $KIT --yes
```

If you would rather drive it with a coding agent, paste `AGENT_PROMPT.md` into your CLI and have it do
the preflight, the dry run and the publish. Single-asset commands still work:

```bash
cd marketing

# 1. nothing is sent: prints the exact API calls so you can spot a wrong id
npm run publish -- ig-post --image out/posts/01-map.png --base $KIT \
  --caption "See what's happening on your island." --dry-run

# 2. the real thing — day 1, post 01
npm run publish -- ig-post --image out/posts/01-map.png --base $KIT \
  --caption-file cap-01.txt

# 3. same file to the Facebook Page, local-group caption
npm run publish -- fb-post --image out/posts/01-map.png --base $KIT \
  --message-file cap-fb-a.txt

# 4. the reel, with its poster as the cover
npm run publish -- ig-reel --video out/video/01-map-countdown.mp4 \
  --cover out/video/01-map-countdown-poster.png --base $KIT --caption-file cap-reel-1.txt

# 5. a story frame
npm run publish -- ig-story --image out/stories/S1-map-story.png --base $KIT

# 6. the carousel (swipe order matters)
npm run publish -- ig-carousel \
  --images out/posts/06-feed.png,out/posts/01-map.png,out/posts/02-report.png,out/posts/05-confirmed.png,out/posts/03-alerts.png \
  --base $KIT --caption-file cap-carousel.txt
```

`cap-*.txt` = paste the matching caption from `CAMPAIGN.md` into a text file, or use
`--caption "…"` for a short one. Captions live in CAMPAIGN.md §A (Reels), §B (Instagram),
§C (Facebook) so there is one source of truth.

**No terminal, or no token yet?** Post by hand instead — `POSTING.md` §"No terminal?"
walks through Meta Business Suite (free scheduling for IG + FB), phone upload, and buffer-style
tools. Same files, same captions.

---

## Step 6 — TikTok

**Via the API**, if your TikTok developer app has passed the Content Posting audit:

```bash
export TT_TOKEN=...                        # scopes video.publish (+ video.upload)
npm run publish -- tt-post --video out/video/01-map-countdown.mp4 \
  --base $KIT --caption-file captions/reel-1-map.txt --dry-run
npm run publish -- tt-post --video out/video/01-map-countdown.mp4 \
  --base $KIT --caption-file captions/reel-1-map.txt
```

Until the audit clears, TikTok only accepts posts to private accounts — `plan` prints that warning
rather than failing silently. In that case, post in the app (2 minutes per reel):

1. Send `out/video/01-map-countdown.mp4` to your phone (AirDrop / Google Drive / the gallery URL).
2. New post → upload → **cover**: choose *Upload cover* and pick
   `01-map-countdown-poster.png`. Do not let TikTok grab frame 0.
3. **Add sound** in-app: pick a trending track from the TikTok library (the files are silent by
   design so nothing clashes). Check the trending list that day — never a track from last month's deck.
4. Caption from `CAMPAIGN.md` §A, first line of the Reel-1 block.
5. Turn on TikTok's auto-captions if you like — they sit low, under the burned-in headline.
   Do **not** do this on Instagram Reels; the two sets of words fight.
6. Pin the best comment: `nowbey.com — free to look, no account needed`.

---

## Step 7 — Check it landed (60 seconds, each post)

- [ ] Image is not cropped: the square posts are 1:1, the stories are 9:16 already.
- [ ] Caption's first line reads well above the *more* fold — that line is the hook.
- [ ] Link in bio (or the platform's link sticker on Stories) points at `nowbey.com`.
- [ ] Reel cover shows the headline, not a black frame.
- [ ] On Facebook, the post preview shows the right image and the first two lines.

---

## What to post, in what order

`CAMPAIGN.md` has the 14-day calendar. Day one, if you only do four things:

1. IG feed — `posts/01-map.png`, caption §B "Post 01".
2. Facebook — `posts/01-map.png`, caption §C "Post A" (the local-group one).
3. Reels + TikTok — `video/01-map-countdown.mp4` with a trending track, caption §A "Reel 1".
4. IG/FB Story — `stories/S1-map-story.png` then `stories/S2-alerts-story.png`, link sticker on the second.

Two strings to confirm before the first post: the CTA domain (`nowbey.com`) and the coverage line
(**Live for New Providence** — do not upgrade it to "The Bahamas" until the map actually covers them).
