# WALKTHROUGH — the whole thing, in order, no decisions

You are on Windows. Open **PowerShell** (Start → type "powershell" → Enter) and keep it open for all
of this. Type or paste one block at a time, press Enter, and check the line marked **CHECK** before
moving on. Six steps, about 20 minutes, and you only ever edit one file.

If a step fails, stop — the fix is in the table at the bottom.

---

## Step 1 — Put the kit on your PC and check Node

1. Download `nowbey-social-kit.zip` from the gallery page.
2. Right-click the downloaded zip → **Extract All…** → extract to your Downloads folder.
   You should end up with a folder `nowbey-social-kit` containing `out`, `scripts`, `captions`.
3. In PowerShell:

```powershell
cd $HOME\Downloads\nowbey-social-kit
node -v
```

**CHECK:** it prints something like `v22.11.0`. If it says "node is not recognised", install Node LTS
from https://nodejs.org (all defaults), close PowerShell, open it again, and retry.

---

## Step 2 — Make your settings file

```powershell
Copy-Item .env.example .env
notepad .env
```

Notepad opens with five empty values. Leave it open — you'll paste two things into it in steps 3 and 4,
then save.

---

## Step 3 — Get your Meta token (the only fiddly bit)

You need this once. It takes about 5 minutes.

1. Go to **https://developers.facebook.com/apps** → log in → **Create app**.
2. Choose **Business** → Next → give it a name like `NowBey Publisher` → Create app.
3. In the new app, open **https://developers.facebook.com/tools/explorer/**
4. At the top right, set **Meta App** to the app you just made.
5. In the right-hand **Permissions** panel, type each of these into the search box and tick it:
   `pages_show_list` · `pages_read_engagement` · `pages_manage_posts` · `instagram_basic` ·
   `instagram_content_publish` · `business_management`
6. Click the blue **Generate Access Token** button. A Facebook login window opens — log in with the
   account that **owns the Page you created**, and click **Continue/Allow** on every screen
   (there will be one for Facebook and one for Instagram).
7. Copy the long string it gives you (`EAA…`).
8. In Notepad, put it after `META_TOKEN=` with no spaces and no quotes:

```
META_TOKEN=EAAxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

**CHECK:** the token starts with `EAA` and is roughly 100–200 characters.

> This token dies in about an hour — fine for today. Before launch week, extend it: paste it at
> https://developers.facebook.com/tools/debugger/ → **Debug** → **Extend Access Token**, and use the
> new one. (System-user tokens in Business Settings never expire; that's in CREDENTIALS.md §1.)

---

## Step 4 — Host the images so Meta can fetch them

Meta does not upload from your computer; it downloads from a link. So give it a link.

1. Open **https://app.netlify.com/drop** in your browser.
2. Drag the **`out`** folder (from inside `nowbey-social-kit`) onto that page.
3. Wait ~20 seconds. You get a URL like `https://calm-palm-1234.netlify.app`.
4. Test it: open `https://calm-palm-1234.netlify.app/posts/01-map.png` in a **private/incognito**
   window. The square map post should appear with no login.
5. In Notepad, add that URL (no trailing slash):

```
KIT_BASE=https://calm-palm-1234.netlify.app
```

**CHECK:** the image loads in the private window. If it opens a Netlify login page instead, the site
is private — use the "Claim"/sign-in step Netlify shows, or try option B in CREDENTIALS.md §4.

Now **save Notepad** (Ctrl+S) and close it.

---

## Step 5 — Let the script find your two IDs

Back in PowerShell:

```powershell
node scripts\preflight.mjs
```

It prints a table. The first time, expect it to find your Page and Instagram account and *tell you
their numbers*, like this:

```
✗ FB_PAGE_ID    FAIL     missing — one of: NowBey=100063…
✗ IG_USER_ID    FAIL     missing — it is 178414…

Found these for you — paste them into .env and run preflight again:

  FB_PAGE_ID=100063…
  IG_USER_ID=178414…
```

1. `notepad .env` again.
2. Paste those two lines in. Save, close.
3. Run it again:

```powershell
node scripts\preflight.mjs
```

**CHECK:** every line says **PASS** except `TT_TOKEN`, which may say `PENDING` — that is fine, TikTok
is optional (see step 7).

If instead you see `Instagram linked … FAIL`, your Instagram account isn't a professional account
linked to the Page. Fix in the Instagram app: **Settings → Account type and tools → Switch to
professional account → Business → Connect a Facebook Page** → choose your Page. Then run preflight
again.

---

## Step 6 — Publish

Look before you leap:

```powershell
node scripts\publish.mjs plan --day 1 --dry-run
```

It lists the six things it would post, with the first line of each caption and the URL it would fetch.
Nothing is sent. Read it.

Then send it:

```powershell
node scripts\publish.mjs plan --day 1 --yes
```

**CHECK:** each item prints `✓ posted` and a post id. Open Instagram and Facebook on your phone —
the map post should be at the top of each.

Day 2 and beyond, when you're ready:

```powershell
node scripts\publish.mjs plan --day 2 --yes    # stories + the report reel
node scripts\publish.mjs plan --day 3 --yes    # confirmation post + alerts reel
...
node scripts\publish.mjs plan --all --dry-run  # see the whole calendar first
```

---

## Step 7 — TikTok, by hand (2 minutes each)

There is no API posting for a new TikTok app yet, so do these three in the app:

1. Send `out\video\01-map-countdown.mp4` to your phone (email it to yourself, or Google Drive).
2. TikTok → **+** → Upload → pick the video.
3. **Cover:** tap *Select cover* → *Upload from device* → choose
   `out\video\01-map-countdown-poster.png`. Don't use frame 0.
4. **Add sound:** tap *Add sound* → pick something trending in the list today.
5. Caption: open `captions\reel-1-map.txt` in Notepad and paste it in.
6. Repeat with `02-report-flow.mp4` and `03-alerts-setup.mp4` on later days.

---

## When something goes wrong

| What you see | What it means | Do this |
| --- | --- | --- |
| `node is not recognised` | Node isn't installed | install Node LTS, reopen PowerShell |
| `Meta rejected the token` | token expired (they last 1 h) or was copied short | Graph API Explorer → Generate again → paste the whole string |
| `Pages visible: none` | you logged into Facebook as the wrong account | log out, redo step 3 as the Page's admin |
| `Instagram linked FAIL` | IG isn't professional or isn't linked to the Page | IG app → Settings → Account type → Connect a Facebook Page |
| `Media … HTTP 404` | `KIT_BASE` is one level off | if the working URL contains `/out/`, add `/out` to `KIT_BASE` |
| `Media … text/html` | the host is showing a login page | make the folder public (Netlify: claim the site and set it public) |
| `no base URL is set` | `.env` has no `KIT_BASE` | step 4 |
| `unaudited_client_can_only_post_to_private_accounts` | TikTok app hasn't passed their audit | ignore it, post TikTok in the app (step 7) |

Still stuck? Paste the **output of `node scripts\preflight.mjs`** into your CLI agent and say
*"fix the failing lines"* — it has the runbook and will walk the specific line. Never paste a token
into a chat window; if an agent asks for one, say no and put it in `.env` yourself.
