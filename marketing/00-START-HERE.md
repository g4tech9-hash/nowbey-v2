# NOWBEY LAUNCH KIT — read this first

One zip, everything in it: every image and reel, both brand identity sets, the scripts that made
them, the publishing CLI, the captions, and the auth setup. Nothing else to download.

Work down the list. Each step has one **CHECK** line — if the check fails, stop there and read the
note under it before moving on. Do not skip ahead to step 7.

---

## Step 1 — Put the folder somewhere simple

Unzip so you get a single folder, and put it directly on `C:\`:

```
C:\nowbey-kit\
```

**CHECK:** opening `C:\nowbey-kit` shows `00-START-HERE.md` (this file), `KIT-VERSION.txt`, `scripts`, `out`, `src`.

> `KIT-VERSION.txt` tells you which build you have. If it is missing, or its date is older than the
> download page you used, you are holding a stale zip — download the full kit again and unzip over
> this folder. Every script named in this file exists in a current build.

> If your unzip tool made `C:\nowbey-kit\nowbey-kit\...`, move the inner folder up one level.
> Paths with spaces or OneDrive folders cause avoidable trouble with `npm` — plain `C:\nowbey-kit` is
> the safe choice.

---

## Step 2 — Check Node

Open PowerShell and run:

```powershell
node -v
```

**CHECK:** it prints `v20.` or higher (v22 is ideal).

> Anything lower, or "not recognised": install the LTS from https://nodejs.org, close PowerShell,
> open it again, re-run.

---

## Step 3 — Install the dependencies

```powershell
cd C:\nowbey-kit
npm install
```

**CHECK:** the command finishes and the last lines are not red, and a `node_modules` folder now exists.

> It pulls `@resvg/resvg-js` and `@napi-rs/canvas`, which include prebuilt binaries. If it fails on a
> network hiccup, run `npm install` again once.

---

## Step 4 — Create your credentials file

Your real tokens are **not** in this zip, and never should be. There is a pre-filled template with
the three values already known for this Page:

1. Copy `env-prefilled.txt` to `.env` **in the same folder**:

   ```powershell
   Copy-Item env-prefilled.txt .env
   ```

2. Open `.env` in Notepad and paste your Meta token after `META_TOKEN=`. One line, no quotes, no
   spaces. Everything else is already filled in.

3. Where the token comes from, click by click: `CREDENTIALS.md`. The short version — Graph API
   Explorer → *Get User Access Token* → tick `pages_show_list`, `pages_read_engagement`,
   `pages_manage_posts`, `instagram_basic`, `instagram_content_publish` → then extend it to 60 days in
   the Access Token Debugger.

**CHECK:**

```powershell
node scripts/preflight.mjs
```

Every line says `PASS`. If `IG_USER_ID` is the only one that fails, the script can resolve it for
you with `node scripts/preflight.mjs --write`.

Then, before you rely on it, check how long the token has left:

```powershell
node scripts/token-extend.mjs
```

It prints the token's type, expiry date and any missing publishing scope. If it says **Expired**, the
token is already dead — scroll to the last section of this file, "When the token expires".

---

## Step 5 — Put the images behind a public URL

Meta does not accept uploads from your laptop — it downloads the file from a URL. Your kit images are
in `C:\nowbey-kit\out`.

1. Open https://app.netlify.com/drop
2. Drag the `out` folder onto the page.
3. In the Deploy Preview bar, click **Make public** (a private deploy returns 404 to Meta).

**CHECK:** open `https://<your-site>/posts/01-map.png` in a private browser window — the image loads
with no login. Then put that base URL (no trailing slash, no `/posts`) into `KIT_BASE=` in `.env`.

> Already deployed? `KIT_BASE` in the template is the site from the last launch. Confirm it still
> serves `/posts/01-map.png` before reusing it.

---

## Step 6 — Make the profiles look like NowBey

The cover can be set from here. The two profile pictures cannot — Meta removed those writes from the
API — so the command does the cover and prints the clicks for the rest.

```powershell
node scripts/publish.mjs brand --set emblem --dry-run   # shows the calls and the file paths
node scripts/publish.mjs brand --set emblem --yes       # sets the Facebook Page cover
```

**CHECK:** the dry run ends with "Would set the Page cover…", and the real run ends with
"✓ Page cover updated".

Then, by hand, with the file it names:

- **Facebook Page avatar** — the Page → Edit profile → Profile picture → Upload →
  `out\brand\pfp-1080.png`
- **Instagram avatar** — Instagram app → profile → Edit profile → Change profile photo → the same file

That is the **first** identity set — the filled pin over a wave on a teal disc — with
`cover-1920x1080.png` as the Page cover and `cover-1500x500.png` for the X/LinkedIn banner. Keep one
set for the whole launch. `--set gateway` swaps in the other one (the N monogram and the photographic
banner); it is not used here.

---

## Step 7 — Rehearse the post, then publish

```powershell
node scripts/publish.mjs plan --day 1 --dry-run
```

**CHECK:** it lists the day's items with `ok` / `skipped` and posts nothing.

Then the real run:

```powershell
node scripts/publish.mjs plan --day 1 --yes
```

**CHECK:** each item prints `✓ posted` plus an id. `skipped` means it was already live (safe to
ignore). A `failed` line prints a plain-English reason.

> **If Facebook fails with `403 (#200) ... publish_actions`:** that is a token-scope problem, not the
> script. Regenerate the token with `pages_manage_posts` ticked and run the preflight again. The
> script now uses the Page token and continues past a single failure, so one bad item no longer kills
> the rest of the day.

---

### Resuming a launch that stopped half way

Instagram and Facebook have no "have I posted this already?" check, so the script keeps its own
record in `.publish-state.json`. Anything in there is skipped on the next run, with its id printed:

```powershell
node scripts/publish.mjs plan --day 1 --yes
#   ↳ already published 2026-10-24 · id 18149289610526133 — skipped (--force to repeat)
```

A post that went out **before** the ledger existed (or straight from the Instagram app) has to be
recorded once, so the script stops trying to post it again:

```powershell
node scripts/publish.mjs mark --day 1 --platform ig --type post `
  --asset out/posts/01-map.png --id 18149289610526133 --label "IG feed · the map"
```

**CHECK:** `node scripts/publish.mjs plan --day 1 --dry-run` lists that item as
"already published" and everything else as pending. Then drop the `--dry-run`.

`--force` ignores the ledger entirely and reposts everything — only use it deliberately.

### If something already went out twice

```powershell
node scripts/publish.mjs dupes --dry-run    # what repeats, oldest kept
node scripts/publish.mjs dupes --delete     # removes the Facebook duplicates
```

Facebook Page posts can be deleted through the API. Instagram has **no delete endpoint** — the command
hands you a permalink list to remove in the app. Before every post this build also compares the caption
against what is already live on that platform and skips a match, so a stale ledger cannot cause a
repeat.

**CHECK:** `node scripts/publish.mjs dupes` ends with `0 duplicate(s)`.

---

## Step 8 — Look at what you are posting

```powershell
node scripts/serve.mjs
```

**CHECK:** it prints a `http://localhost:4173` address. Open it — the gallery shows posts, stories,
reels, and both brand sets. `Ctrl+C` in PowerShell stops it.

---

## Step 9 — Rebuild anything, at any time

Everything here was generated from code in `scripts/`, so nothing is a dead end:

```powershell
npm run build            # 8 feed posts
npm run build:stories    # 9 verticals
npm run build:video      # 3 reels + posters  (needs ffmpeg)
npm run build:brand      # profile photo + covers (emblem set)
npm run build:identity   # monogram avatar + gateway banner
npm run sheet            # contact sheet
```

**CHECK:** the matching folder in `out\` gets new files with today's timestamp.

> `npm run build:video` needs `ffmpeg` on your PATH. The reels are already built in `out\video`, so
> you only need ffmpeg if you want to change them.

---

## What is in here

| Folder | What it holds |
| --- | --- |
| `out\posts\` | 8 squares, 1080×1080 — Instagram feed + Facebook |
| `out\stories\` | 9 verticals, 1080×1920 — Stories and Reels covers |
| `out\video\` | 3 reels, 8s, 1080×1920, H.264, plus a poster PNG each |
| `out\brand\` | 8 files — **both** identity sets: emblem avatar/covers and the N-monogram/gateway banner |
| `captions\` | 16 caption files + `plan.json`, the publishing order |
| `scripts\` | the whole generator and the publishing CLI |
| `src\` | the photo plates the composites are built on |
| `docs` | `CREDENTIALS.md` (auth), `POSTING.md` (per-platform how-to), `WALKTHROUGH.md`, `CAMPAIGN.md`, `VIDEO_PROMPTS.md`, `PROMPT-brand-v1.md` (a portable prompt that rebuilds the emblem set) |

**Two brand sets, one palette.** `pfp-1080.png` / `cover-1920x1080.png` / `cover-1500x500.png` are the
emblem set (filled pin over a wave on a teal disc). `pfp-n-1080.png` / `cover-gateway-1920x1080.png`
are the monogram set (the letter N cut by a palm frond, pin on its crown, over the photoreal Nassau
coast). Use one pair or the other — do not mix them mid-launch. `identity-preview.png` and
`preview.png` show both under a real avatar overlay and at 32px.

**Cover crops.** Upload `cover-1920x1080.png` as the Facebook page header and `cover-1500x500.png` as
the X/LinkedIn banner. Facebook crops a 16:9 to about 2.6:1 around the middle, so all copy sits in the
upper 60% by design, and both covers keep the bottom-left corner empty for the page avatar.

---

## If something is wrong

| Symptom | Cause |
| --- | --- |
| Netlify URL 404s | deploy is still **private**, or you dragged the folder *above* `out` |
| `403 (#200) publish_actions` | token missing `pages_manage_posts` — regenerate |
| Token expired / `Session has expired` | it cannot be extended once dead — see the last section |
| A post went out twice | the ledger was missing or deleted — `mark` it, then run `dupes --delete` |
| `brand` says the cover failed | the token lacks `pages_manage_posts`, or `KIT_BASE` is not public |
| `IG_USER_ID` unresolved | IG account is not Professional, or not linked to the Page |
| Preflight says token expired | extend in the Access Token Debugger, or use a System user token |
| Text renders as boxes in a rebuilt PNG | the static fonts in `fonts\` were not found — run `npm run fonts`, then rebuild |

---

## When the token expires

Expired tokens are deleted by Meta. There is nothing to extend — you make a new one and extend that
while it is still fresh (~1 hour).

```powershell
node scripts/token-extend.mjs
```

1. **https://developers.facebook.com/tools/explorer/** → pick the **NowBey** app.
2. Tick `pages_show_list`, `pages_read_engagement`, `pages_manage_posts`, `instagram_basic`,
   `instagram_content_publish`, `business_management`.
3. **Generate Access Token** → paste it into `META_TOKEN` in `.env`.
4. Immediately:

   ```powershell
   node scripts/token-extend.mjs --extend
   ```

   It writes a 60-day token back into `.env` and keeps the old one as `.env.bak`. Needs `APP_ID` and
   `APP_SECRET` in `.env` — no secret? Use the Debugger instead: paste the token at
   https://developers.facebook.com/tools/debugger/ → **Debug** → bottom → **Extend Access Token**.

**CHECK:** `node scripts/preflight.mjs` is all PASS, and `node scripts/token-extend.mjs` reports
roughly 60 days remaining.

**Stop this recurring:** make a **System User** token instead — Business settings → Users → System
users → `nowbey-publisher` → add the Page and IG account → Generate New Token. It never expires.
Full click path: `CREDENTIALS.md` § "Keep it forever".
