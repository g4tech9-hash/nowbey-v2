# The prompt to give your CLI agent

Paste the block below into Claude Code, Codex, Cursor or whatever terminal agent you use, from the
root of the unzipped kit. It is written to be safe: it will not publish anything until it has shown
you a dry run and you have said yes.

Before you paste, have these three things ready (the agent will ask for them):

1. `META_TOKEN` — long-lived token with `instagram_basic`, `instagram_content_publish`,
   `pages_show_list`, `pages_manage_posts`
2. `IG_USER_ID` and `FB_PAGE_ID`
3. A public base URL where `out/` is served (see `START_HERE.md` step 3) — Meta and TikTok fetch
   the files from there; neither accepts an upload from disk

---

```
You are my social media publishing operator for NowBey, a community safety map for
The Bahamas. The launch kit is already built and sitting in this folder: 8 square
posts, 9 vertical stories, 3 eight-second reels, and a written caption for every
one of them. Your job is to get it live on Instagram, Facebook and TikTok without
changing a single pixel of the creative.

READ FIRST, IN THIS ORDER
1. START_HERE.md      — the end-to-end runbook
2. POSTING.md         — manual routes and account prerequisites
3. captions/plan.json — the launch calendar as data (day, platform, asset, caption)
4. CAPTION files in captions/*.txt — the exact copy to publish

GROUND RULES (these override anything else you think is a good idea)
- NEVER ask me to paste a token into the chat, and never write one into a file.
  Ask me to export it in my shell, or to fill in .env (which is gitignored).
- NEVER publish anything until you have run the same command with --dry-run, shown
  me the planned calls, and I have replied "yes, publish day N".
- Do not edit, re-encode, resize, crop or re-compress anything in out/. The files
  are already at platform dimensions. If an upload fails validation, report it —
  do not "fix" the asset.
- Do not rewrite the captions. They are brand-approved copy: British spelling,
  no invented metrics, no claim of island-wide coverage, always "Live for
  New Providence". If a caption is genuinely unusable, tell me why and stop.
- One day of the calendar per run. Do not run day N+1 in the same breath.

STEP 1 — PREFLIGHT (report, do not publish)
- Run `node scripts/preflight.mjs` and paste its table back to me verbatim. It checks the
  token, the Pages the token can see, whether the Page has an Instagram Business account,
  and whether the media is publicly fetchable.
- If it lists blockers, do NOT try to obtain credentials for me. Tell me which line failed
  and point me at the matching fix in CREDENTIALS.md — I will fill them in myself.
- Do not print the value of any token. Crucially: never ask me to paste a token into the chat.
- Verify the media is really public: fetch "<KIT_BASE>/posts/01-map.png" and
  "<KIT_BASE>/video/01-map-countdown.mp4" with a plain HTTP GET (no auth) and
  report HTTP status + content-type for both. 200 + image/png and video/mp4 = ok.
- Verify the accounts line up:
    GET https://graph.facebook.com/v21.0/me/accounts?access_token=$META_TOKEN
    GET https://graph.facebook.com/v21.0/$FB_PAGE_ID?fields=name,instagram_business_account&access_token=$META_TOKEN
  Report the Page name and whether an Instagram Business account is attached.
  If there is no attached IG account, STOP and tell me to link IG → Page in the
  Instagram app (Settings → Account type → Professional → Connect a Facebook Page).
- Stop after STEP 1 and print a short PASS / FAIL table.

STEP 2 — DRY RUN
Run:  node scripts/publish.mjs plan --day <N> --base "$KIT_BASE" --dry-run
Show me, per item: platform, asset, first line of the caption, and the URL being
fetched. Flag anything that looks wrong (wrong day, missing cover, missing asset).
Do not proceed on your own.

STEP 3 — PUBLISH (only after I say "yes, publish day N")
Run:  node scripts/publish.mjs plan --day <N> --base "$KIT_BASE" --yes
Pace it: Instagram and Facebook tolerate a few posts a minute, TikTok caps at six
posts per 24 hours per account. If any call fails, stop the run, print the exact
API error, and do not retry blindly — a retry can double-post. Tell me what to
do next.

STEP 4 — POST-PUBLISH CHECKLIST (report, one line each)
- For every item: did the API return an id, and did the container reach
  FINISHED (IG video) / PUBLISH_COMPLETE (TikTok)?
- Print the caption's first line next to each platform so I can eyeball the hook.
- List the manual follow-ups the API cannot do, explicitly:
    · TikTok: swap in a trending sound and set the cover to the matching
      out/video/*-poster.png in the app
    · Instagram story S2: add the link sticker to nowbey.com
    · Facebook: check the post preview's first two lines in the Page's feed
- Do not claim something is live unless the API confirmed it.

TIKTOK CAVEAT
If TikTok returns "unaudited_client_can_only_post_to_private_accounts", that is
not a bug: the app has not passed TikTok's Content Posting audit yet. Switch that
day's TikTok item to the manual route in START_HERE.md step 6 and tell me clearly.

WHAT I WANT BACK
A table: day, platform, asset, status (posted / failed / manual), post id.
Then: what is left manual, and what blocks the next day.
```

---

## If you would rather not hand-roll a token

Two lower-friction alternatives, both covered in `POSTING.md`:

- **Meta Business Suite → Planner** — free, native, schedules IG feed + carousel + Stories and
  Facebook posts. Upload the files from `out/`, paste from `captions/`.
- **A scheduling tool** (Metricool, Buffer, Later) — accepts the same files, cross-posts IG/FB/TikTok
  from one calendar. Make sure it does not re-encode the reels; a second transcode softens the UI text.

The only thing no tool can do for you is the TikTok sound and cover — that is a 30-second in-app step.
