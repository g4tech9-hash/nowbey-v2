You are resuming a launch that stopped half way. Work inside the NowBey kit folder (the one containing `scripts/`, `out/`, `captions/` and `KIT-VERSION.txt`).

Context you need before touching anything:

- The kit publishes through `scripts/publish.mjs`. Instagram and Facebook have no idempotency key, so the script keeps a ledger in `.publish-state.json`; anything in it is skipped by `plan`.
- One post is already live: an **Instagram feed post** from day 1, asset `out/posts/01-map.png`. A Facebook post from the same run failed with `403 (#200) publish_actions` (a token-scope problem) and never went out.
- The brand identity assets exist in `out/brand/` and are **not** published yet. Use the **first** set — the emblem: `pfp-1080.png` (profile photo), `cover-1920x1080.png` (page cover), `cover-1500x500.png` (X/LinkedIn banner). There is also a `pfp-dark-1080.png` for light backgrounds.
- **Do not use the second set.** `pfp-n-1080.png` (N monogram) and `cover-gateway-1920x1080.png` (photographic banner) exist in the folder but are not part of this launch. Ignore them, and do not mix a file from one set into the other.

## Step 0 — Verify the kit is current

```bash
node scripts/publish.mjs --help
node scripts/token-extend.mjs
```

The help text must list `brand`, `mark`, `plan` and the `LEDGER` section. If `brand` or `mark` is missing, **stop** and tell me the zip is stale — `KIT-VERSION.txt` will show a build date older than the download page. Do not implement around it; I will re-download.

Then confirm the token is alive and has `pages_manage_posts`. If it is expired, stop and give me the replacement steps from `00-START-HERE.md` § "When the token expires" — an expired token cannot be extended.

## Step 1 — Find out what is actually live, do not assume

Read the ledger if it exists:

```bash
cat .publish-state.json
```

Then ask Meta directly, so the ledger is grounded in reality rather than in my description:

```bash
curl "https://graph.facebook.com/v21.0/$IG_USER_ID/media?fields=id,caption,timestamp,media_type,permalink&limit=50&access_token=$META_TOKEN"
curl "https://graph.facebook.com/v21.0/$FB_PAGE_ID/posts?fields=id,created_time,message,permalink_url&limit=50&access_token=$META_TOKEN"
```

Match what comes back against `captions/plan.json`. For every entry of the interrupted day that is already live on its platform, record it once:

```bash
node scripts/publish.mjs mark --day <n> --platform <ig|fb> --type <post|reel|story|carousel> \
  --asset <the asset path from plan.json> --id <the live post id> --label "<its label>"
```

Rules:

- **Never** use `--force`. Never delete or rewrite `.publish-state.json` wholesale; only add entries.
- If a caption or asset has no counterpart in the API response, treat it as **not published**.
- If you cannot reach the Graph API, or the token is dead, do not guess — stop and report.

## Step 2 — Finish the interrupted day only

```bash
node scripts/publish.mjs plan --day 1 --dry-run
```

Confirm every already-live item shows `↳ already published … — skipped`, and that the items pending are exactly the ones missing from the API's view. Show me that list before publishing.

Then:

```bash
node scripts/publish.mjs plan --day 1 --yes
```

A `failed` line does not stop the run — the script continues and reports at the end. After it finishes, print a table: label, platform, result (`posted` / `skipped – already live` / `skipped – no credentials` / `failed` + the error in plain English), and the id for each success.

**Do not continue to days 2+ without asking me.** Publishing a whole calendar unattended is not what I want; end the turn with the table and the remaining schedule.

## Step 3 — Brand identity

The cover can be set by the API; the two profile pictures cannot (Meta removed those writes), so do exactly this:

```bash
node scripts/publish.mjs brand --set emblem --dry-run
```

Check the dry run names `cover out/brand/cover-1920x1080.png` and `avatar out/brand/pfp-1080.png`, shows `POST /{page-id}/photos` with that file's public URL, then `POST /{page-id}` with `cover=<that photo id>`. If the URL is not reachable without auth, fix `KIT_BASE` first — that is the usual cause of a cover failure. Then:

```bash
node scripts/publish.mjs brand --set emblem --yes
```

Verify by reading the Page back:

```bash
curl "https://graph.facebook.com/v21.0/$FB_PAGE_ID?fields=cover,picture&access_token=$META_TOKEN"
```

`cover.source` must be a URL, not empty.

For the two avatars, do not attempt an API call — it will fail. Output these exact instructions and wait for me:

1. **Facebook Page avatar** — switch to the Page → Edit profile → Profile picture → Upload → `out/brand/pfp-1080.png`
2. **Instagram avatar** — Instagram app → profile → Edit profile → Change profile photo → the same file (Instagram crops to a circle; this artwork is drawn to survive it)

Both must be the same file so the two profiles match.

## Guardrails

- Never print a token, and never write one into a file that gets committed.
- Do not re-encode or resize any asset — upload the PNG/MP4 exactly as shipped.
- Instagram allows 25 API-published posts per 24h and TikTok 6; the script paces itself, do not add parallel runs.
- If something fails, report it and stop. No retry loops against a 4xx, and no switching to `--force` to "get past" a duplicate — that is the one mistake that cannot be undone.
- British spelling in anything you write.

## What "done" looks like

1. Every already-live item is in the ledger with its real id.
2. The interrupted day is fully published, with a result table.
3. The Page cover shows the emblem banner (`cover-1920x1080.png`), confirmed by reading it back.
4. Two copy-paste avatar instructions are on screen, pointing at `pfp-1080.png`.
5. Days 2+ are listed but untouched.
