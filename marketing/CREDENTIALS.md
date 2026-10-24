# Where the five values come from

Your agent stopped at preflight because nothing was set. That is the right behaviour — but the values
have to come from *your* accounts, so here is exactly where each one lives.

Five values, four of them from Meta or TikTok, one you create yourself:

| # | Value | Where it comes from | How long it lasts |
| --- | --- | --- | --- |
| 1 | `META_TOKEN` | Meta app → Graph API Explorer / System user | 1 h → 60 d → never |
| 2 | `FB_PAGE_ID` | The Facebook Page you already made | permanent |
| 3 | `IG_USER_ID` | The Instagram Business account linked to that Page | permanent |
| 4 | `TT_TOKEN` | TikTok developer app → OAuth | 24 h (refresh token 365 d) |
| 5 | `KIT_BASE` | You host the kit somewhere public | permanent |

Put them in `marketing/.env` (copy `.env.example`). It is gitignored, and both the CLI and the
preflight read it automatically — you do not need to export anything in your shell.

```bash
cd nowbey-social-kit          # or marketing/
cp .env.example .env
# paste the values in, then:
node scripts/preflight.mjs
```

---

## 1. `META_TOKEN` — the Facebook/Instagram access token

You need a **Meta app** first (free, 2 minutes, no review needed for your own Page):

1. Go to **https://developers.facebook.com/apps** → **Create app**.
2. App type: **Business**. Name it **`NowBey`** — that string is what appears on the permission
   screens when you authorise ("NowBey wants to access…"), so it should be the product name. You
   don't need to connect a Business portfolio to start.
   Rename an existing app under **Settings → Basic → Display name**.
3. In the app dashboard, add the products **Instagram** and (if offered) **Facebook Login**.

### Fast route — a token that works in 5 minutes

1. Open **https://developers.facebook.com/tools/explorer/**.
2. Top right: **Meta App** → pick the app you just made.
3. **Permissions** → add these six:
   - `pages_show_list`
   - `pages_read_engagement`
   - `pages_manage_posts`
   - `instagram_basic`
   - `instagram_content_publish`
   - `business_management`
4. Click **Generate Access Token**, log in as the account that administers your Page, and accept the
   permissions on *both* the Facebook and Instagram prompts.
5. Copy the token into `META_TOKEN`. It lasts ~1 hour — fine for one test run, too short for a launch.

### Keep it — extend to 60 days

1. Open **https://developers.facebook.com/tools/debugger/**.
2. Paste the token → **Debug**. Scroll to the bottom → **Extend Access Token**.
3. Copy the new token into `META_TOKEN`. It's now good for ~60 days.

### Keep it forever — a System User token (do this before launch day)

1. **https://business.facebook.com/settings** → left rail **Users → System users** → **Add**.
   Name the **system user** `nowbey-publisher` (this is a service account inside Business Manager,
   separate from the app, which stays `NowBey`). Role **Admin** (or Employee).
2. Select the system user → **Add Assets** → **Pages** → your Page → **Full control**.
   Repeat → **Instagram accounts** → your IG account → **Full control**.
3. **Generate New Token** → choose your Meta app → tick the same six permissions → **Generate**.
4. Copy it into `META_TOKEN`. This token does not expire; regenerate it only if you revoke it.

---

## 2. `FB_PAGE_ID` and `IG_USER_ID`

Both are numbers, not names.

**The quick way — ask the API** (works once `META_TOKEN` is set):

```bash
curl "https://graph.facebook.com/v21.0/me/accounts?access_token=$META_TOKEN"
```

The reply lists every Page your token can post to. Copy a Page's `id` into `FB_PAGE_ID`.

```bash
curl "https://graph.facebook.com/v21.0/<FB_PAGE_ID>?fields=name,instagram_business_account&access_token=$META_TOKEN"
```

That returns something like

```json
{ "name": "NowBey", "instagram_business_account": { "id": "17841400000000000" } }
```

Copy the `instagram_business_account.id` into `IG_USER_ID`.

**The clicking way:**

- `FB_PAGE_ID` — **https://business.facebook.com/settings** → **Accounts → Pages** → the **ID** column.
  (Or open the Page → *About* → *Page transparency* → Page ID.)
- `IG_USER_ID` — same Settings screen → **Accounts → Instagram accounts** → the **ID** column.
  On the Instagram app it is *Settings → Account type*.

> **This is the step that blocks most launches:** the Instagram account must be a **Professional**
> (Business or Creator) account **and** linked to that Facebook Page. If `instagram_business_account`
> comes back empty:
> Instagram app → **Settings → Account type and tools → Switch to professional account** → Business →
> **Connect a Facebook Page** → pick the Page. Then re-run the curl; the id will appear.
>
> `IG_USER_ID` is the **17841…** number. It is not `@yourhandle`, not the Page id, and not the app id.

---

## 3. `TT_TOKEN` — TikTok (optional)

Skip this entirely if you are happy to post TikTok by hand (2 minutes per reel, and you get to pick a
trending sound — which the API cannot do for you). If you want the CLI to do it:

1. **https://developers.tiktok.com/** → log in → **Manage apps** → **Connect an app**.
2. Add the product **Login Kit** and **Content Posting API**. Request scopes
   `user.info.basic`, `video.publish` (and `video.upload` if you want drafts).
3. Under **Login Kit**, add a redirect URI — for local testing `https://localhost:8080/callback`
   is fine, it only needs to match what you send.
4. The app starts in **Sandbox**. Add your own TikTok account as a **target user** (Sandbox settings),
   or authorization will be refused.
5. Get a code — open this in a browser, logged in as that TikTok account:

   ```
   https://www.tiktok.com/v2/auth/authorize/?client_key=YOUR_CLIENT_KEY
     &scope=user.info.basic,video.publish,video.upload
     &response_type=code&redirect_uri=YOUR_REDIRECT&state=nowbey
   ```

6. Exchange the `code` from the redirect for a token:

   ```bash
   curl -X POST https://open.tiktokapis.com/v2/oauth/token/ \
     -H "Content-Type: application/x-www-form-urlencoded" \
     -d "client_key=YOUR_CLIENT_KEY" -d "client_secret=YOUR_CLIENT_SECRET" \
     -d "code=THE_CODE" -d "grant_type=authorization_code" \
     -d "redirect_uri=YOUR_REDIRECT"
   ```

   The response's `access_token` → `TT_TOKEN`. It expires in **24 hours**; `refresh_token` lasts a year,
   and you renew with `grant_type=refresh_token`.

7. **Two things that will catch you out:**
   - Public posting requires the app to have passed TikTok's **Content Posting audit**. Before that,
     the API only accepts posts to private accounts — the CLI detects this and says so.
   - `PULL_FROM_URL` requires the **domain of `KIT_BASE` to be verified** in the TikTok developer app
     (a signature file placed at the domain root). If your `KIT_BASE` is a random Netlify url, verify
     that one — or just post in the app.

---

## 4. `KIT_BASE` — a public URL for the media

Meta and TikTok **fetch** the file; neither accepts an upload from your laptop. So the kit needs to be
reachable over plain HTTPS with no login. Any of these works:

**A. The site you already deploy** (best if `nowbey.com` is live)
```bash
cp -r out nowbey-v2/public/kit
git add public/kit && git commit -m "publish social kit" && git push
# KIT_BASE=https://nowbey.com/kit
```

**B. Netlify Drop** (fastest, no account needed to start)
1. Open **https://app.netlify.com/drop**.
2. Drag the **`out` folder itself** (not the zip) onto the page.
3. It gives you a URL like `https://calm-palm-1234.netlify.app` in ~20 seconds.
4. `KIT_BASE=https://calm-palm-1234.netlify.app` — and check
   `https://calm-palm-1234.netlify.app/posts/01-map.png` loads in a browser.
   (If you see `/out/posts/...` in the working URL instead, include `/out` in `KIT_BASE`.)

**C. GitHub Pages**
Create a repo, upload the *contents* of `out/`, Settings → Pages → deploy from `main` / root →
`KIT_BASE=https://<user>.github.io/<repo>`.

Either way, open `<KIT_BASE>/posts/01-map.png` in a **private window** — if it asks you to log in,
it is not public and Meta will fail with "media could not be fetched".

---

## 5. Check, then publish

```bash
node scripts/preflight.mjs
```

It prints a table: token valid, Pages visible, Instagram linked, media reachable, TikTok status. When
everything says PASS:

```bash
node scripts/publish.mjs plan --day 1 --base "$KIT_BASE" --dry-run   # look first
node scripts/publish.mjs plan --day 1 --base "$KIT_BASE" --yes       # send it
```

---

## If preflight fails

| Message | What it means | Fix |
| --- | --- | --- |
| `Meta rejected the token` | expired (1 h tokens do) or wrong app | regenerate, then **Extend** in the Debugger |
| `Pages visible: none` | token isn't from a Page admin | log into Graph API Explorer as the Page's admin |
| `Instagram linked: FAIL` | IG isn't Professional or isn't connected to the Page | IG app → Settings → Account type → Connect a Facebook Page |
| `IG_USER_ID … use the Page one` | you copied the handle's id, not the Business account | use the `instagram_business_account.id` from step 2 |
| `Media … HTTP 404` | `KIT_BASE` points at the wrong level | add or remove `/out` so `/posts/01-map.png` resolves |
| `Media … content-type text/html` | the host returned a login page | make the folder public |
| `TikTok rejected the token` | 24 h token expired, or your account isn't a sandbox target user | refresh, or add yourself as target user |
