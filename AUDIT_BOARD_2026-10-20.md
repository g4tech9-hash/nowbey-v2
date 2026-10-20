# Virtual Engineering & Product Audit Board — NowBey v2

**Date:** 2026-10-20 · **Branch:** `arena/59d4010b-nowbey-v2` · **Method:** line-level static review of `src/`, `expo/`, schema, routes, config, and dependency graph (883 tracked files, ~39.5k LOC in `src/`)

**Board verdict, in one paragraph:** this codebase has been hardened by prior passes and it shows — origin walls, shared rate limiting, webhook signature verification, session-version revocation, constant-time cron guard, ownership checks on every mutation we swept, and near-complete index coverage are all genuinely in place. We refuse to invent praise, and we refuse to invent problems. What follows is everything that is *actually* wrong: 23 findings — including one live privacy lie ("push is off" when it is not), one API key leaking through URLs, one GDPR right being paywalled, a signup flow with no consent evidence on the primary channel, a privacy policy that names the wrong processors, and a third of the repository being a dead backup tree. Each finding ships with the fix, ready to paste.

---

# STAGE 1 — DEAD CODE & BUNDLE LIQUIDATION

---

## 1.1 [ARCHITECTURE] Location: `V2_UI_Backup/` — 304 of 883 tracked files (34%), 2.9 MB

**Flaw & Risk:** The entire previous-generation application — its own `package.json`, `package-lock.json`, admin pages, API routes, `.claude` config, Expo client and `RESTORE.md` — is committed as a living directory. `.vercelignore` does not exclude it (Vercel uploads it with every deploy), `.easignore` does not exclude it (EAS ships it to build workers), `tsc`/eslint can still reach into it depending on tooling globs, and every future agent/human must re-audit 304 files to answer "is this live?". Git history already preserves this snapshot; the working tree should not. This is the single largest liquidation available.

**Production-Ready Refactor:**

```bash
# The snapshot is permanently preserved in git history at the commit before this one.
git rm -r V2_UI_Backup
```

```gitignore
# .gitignore (append)
V2_UI_Backup/
```

```text
# .vercelignore (append) — belt and braces for any old branch
V2_UI_Backup/
audit/
audit-staging/
```

---

## 1.2 [ARCHITECTURE] Location: `audit/` (42 files, 972 KB), `audit-staging/` (8 files), and stale "STAGING" banners inside live components — `src/components/incident-actions.tsx:1–36`, `src/components/admin-errors.tsx:1–36`

**Flaw & Risk:** Dated audit-run artifacts are tracked as product source. Worse, `audit-staging/Staging_Fix_AriaLive.tsx` and `Staging_Fix_CrashDismissButton.tsx` were **already applied** to `src/components/incident-actions.tsx` and `src/components/admin-errors.tsx` — the live files now open with the banner *"STAGING FILE — DO NOT APPLY WITHOUT APPROVAL"*. Production source that instructs engineers not to apply itself is an operational hazard: the next reviewer either wastes an hour re-deciding an already-made decision or "un-applies" a shipped accessibility and error-handling fix. The staging folder is now a second copy of shipped code — pure duplication.

**Production-Ready Refactor:**

```bash
git rm -r audit-staging
# audit/ runs are session reports, not source. Keep them out of the product tree:
git rm -r audit
```

For `src/components/incident-actions.tsx` and `src/components/admin-errors.tsx`: delete the entire banner comment block (lines 1–36 in each — everything from `/**` through the `*/` that ends with *"No API change, no route change."*), leaving `"use client";` as the first line. The behavior changes inside those files stay exactly as they are.

---

## 1.3 [ARCHITECTURE] Location: `src/lib/pulse/mock.ts` — all 201 lines

**Flaw & Risk:** Orphaned module. Zero importers anywhere — `src/`, `tests/`, `scripts/`, `qa/`, `docs/` were all swept; nothing references `@/lib/pulse/mock` or `./mock`. Its header claims it powers "flows the design system specifies that the API does not serve yet (a saved / watch list, related signals)", but `src/app/saved/page.tsx` reads the real API and `src/components/pulse/detail-drawer.tsx` never imports these fixtures. It will either be resurrected stale (it types against `IncidentRow`, which has moved on) or rot silently. Note `src/ui/mock-screens.tsx` is **not** dead — `src/ui/phone-demo.tsx` renders it on the landing page. Only `pulse/mock.ts` goes.

**Production-Ready Refactor:**

```bash
git rm src/lib/pulse/mock.ts
```

---

## 1.4 [ARCHITECTURE] Location: `fetchPlaces.js`, `verify_table.js`, `verify_tables.js`, `import_places.ts` (repository root)

**Flaw & Risk:** Four one-off ops scripts with no npm script, no caller, and no shared tooling. `verify_table.js`/`verify_tables.js` regex-scrape the raw `.env` file for `DATABASE_URL` with `env.match(/DATABASE_URL="?([^"\n\r]+)"?/)` and open unauthenticated `pg` connections — a copy-paste template for leaking credentials into shell history and bypassing every abstraction in `src/db/`. `import_places.ts` re-implements an upsert with a hand-rolled `for` loop over `src/data/places.json`. `fetchPlaces.js` is the only consumer of the `openplaces` dependency (see 1.5). One-off scripts belong in `scripts/` behind npm scripts, or in the bin of history.

**Production-Ready Refactor:**

```bash
git rm fetchPlaces.js verify_table.js verify_tables.js import_places.ts
```

If the places import is ever needed again, it belongs behind `scripts/import-places.ts` using the existing `src/db` module and `process.env.DATABASE_URL` (never file-scraping), wired as `"db:import-places": "tsx scripts/import-places.ts"`.

---

## 1.5 [ARCHITECTURE] Location: `package.json:28–47` — `dompurify`, `@types/dompurify`, `openplaces`

**Flaw & Risk:** Three dependencies with zero production reach:
- `dompurify` (^3.4.16): never imported. `src/lib/sanitize/index.ts:1` uses `isomorphic-dompurify`, which vendors its own DOMPurify. Two DOMPurify copies in the lockfile, one dead.
- `@types/dompurify` (^3.0.5): types for the dead package — and DOMPurify v3 ships its own types anyway.
- `openplaces` (^0.3.5): only consumer was the deleted `fetchPlaces.js` (1.4).

Every unused dependency is transitive-CVE surface, install time, and audit noise (npm audit flags packages nobody uses and somebody must triage).

**Production-Ready Refactor:**

```bash
npm uninstall dompurify @types/dompurify openplaces
```

---

## 1.6 [ARCHITECTURE] Location: `src/app/api/news/route.ts:69`, `src/lib/facebook-ingest.ts:105`

**Flaw & Risk:** `console.log` debug lines in production server paths. On Vercel, every refresh appends `[fb] refresh: N new post(s)…` / `[fb] @username: …` to the function log stream — unstructured, unfilterable, and it discloses ingested account names/counts to anyone with log access in a channel meant for failures. The codebase elsewhere uses `console.warn`/`console.error` deliberately (`session/route.ts:127`, `cron.ts:8`); these two are leftovers.

**Production-Ready Refactor:**

`src/app/api/news/route.ts:69`:

```ts
      if (stats && stats.inserted > 0) console.warn(`[fb] refresh: ${stats.inserted} new post(s) across ${stats.pages.length} page(s)`);
```

`src/lib/facebook-ingest.ts:105`:

```ts
      if (inserted > 0 || note !== "ok") console.warn(`[fb] @${page.username}: ${posts.length} found, ${inserted} inserted (${note})`);
```

---

# STAGE 2 — BUG SWEEPS & STATE EDGE CASES

**Sweep log (clean results recorded so they are not re-flagged):** every `setInterval`/`setTimeout` we found is paired with cleanup in its effect return (`src/app/map/page.tsx:140–155`, `src/app/saved/page.tsx:35`, `src/components/pulse/feed-stream.tsx:177–208`, `expo/src/Splash.tsx:23–24`, `expo/app/(tabs)/index.tsx:57–58`); Leaflet listeners are `off()`-ed in cleanups (`src/components/map/NowBeyMap.tsx:166–172, 307–341`); `window` pointer listeners are removed (`NowBeyMap.tsx:410–414`); the comment/reaction rate limiter counts only on success; signup race on handle/email is defused by constraint-catch (`src/app/api/session/route.ts:99–115`). The bugs below are what survived that sweep.

---

## 2.1 [UX / PRIVACY] Location: `expo/src/push.ts:97–112` (`disablePush`) and `expo/src/push.ts:116–134` (`releasePushOnSignOut`)

**Flaw & Risk:** The function's own doc comment states the contract: *"If the server cannot be reached the token is kept, so nothing is silently left delivering."* The code does the opposite. `fetch(...).catch(() => undefined)` swallows both network failures **and** non-2xx responses (`res` is never checked), then `await setPushToken(null)` runs unconditionally and the function returns `"off"`. Result: a user toggles push off on a flaky connection, the UI says "off", the server row in `push_tokens` is still `active: true`, and alerts keep arriving at a phone whose owner believes they are muted. For a hazard-alerting product this is a consent failure with a safety dimension (alert fatigue → real alerts ignored). Same unconditional wipe exists in `releasePushOnSignOut` (`!auth` path clears locally with no unregister attempt).

**Production-Ready Refactor:**

```ts
/**
 * Turns push off for this device: tell the server to forget the token first, then drop it here.
 * If the server cannot be reached the token is kept and "off" is not claimed, so nothing is
 * silently left delivering while the switch says otherwise.
 */
export async function disablePush(): Promise<PushState> {
  try {
    const token = await getPushToken();
    const auth = await getToken();
    if (!token) return "off";
    if (!auth) {
      // Session already gone: the server will not accept an unregister, but it also cannot
      // prove ownership of this token later — clear it and report honestly.
      await setPushToken(null);
      return "off";
    }
    const res = await fetch(`${API_BASE}/api/push/unregister`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${auth}`, "x-nowbey-client": "native" },
      body: JSON.stringify({ token }),
    }).catch(() => null);
    if (!res || !res.ok) {
      // Server never confirmed: keep the token so the toggle can stay truthful and retryable.
      return "denied";
    }
    await setPushToken(null);
    return "off";
  } catch {
    return "off";
  }
}
```

> Note: the returned `"denied"` above is the closest existing truthful state; better is to widen `PushState` with `"stuck"` and surface "We could not switch push off — try again" in the You tab. The critical fix is: **never report "off" while the server may still be delivering.**

---

## 2.2 [UX] Location: `expo/src/api.ts:235–265` (`call` catch block)

**Flaw & Risk:** Every failure mode — 20-second timeout (`AbortError`), DNS failure, TLS rejection, captive-portal garbage, server 500 with unparseable body — is rewritten into one message: *"Could not reach NowBey at {API_BASE}. Open the You tab and set the Server address to where the NowBey website runs."* On a 3G drop in Exuma the user is told to reconfigure the server address, which is correct. On a timeout against the correct server, the same text sends them spelunking into settings and potentially **breaking a working configuration** (and `changeApiBase` signs them out on origin change — `api.ts:84–96`). Error taxonomy exists (`ApiError.status`) but the network layer flattens it before any screen can react differently.

**Production-Ready Refactor:**

```ts
  } catch (e) {
    if (e instanceof ApiError) throw e;
    noteApiFailure(init.method ?? "GET", path, 0);
    const timedOut = e instanceof Error && (e.name === "AbortError" || e.name === "TimeoutError");
    throw new ApiError(
      timedOut
        ? "NowBey took too long to answer. The connection here may be weak — try again."
        : `Could not reach NowBey at ${API_BASE}. Check your connection; if this keeps happening, the You tab can point the app at a different server.`,
      0,
    );
  } finally {
```

---

## 2.3 [SECURITY] Location: `src/components/map/NowBeyMap.tsx:84–99` (`pinHtml`), `:86` (`(pin as any).approximate`)

**Flaw & Risk:** `pinHtml` builds marker markup by raw string concatenation of `pin.color`, `pin.label` and the derived `code` and hands it to Leaflet's `divIcon({ html })` — i.e. `innerHTML`. `MapPin.color?: string` and `MapPin.label?: string` are typed as free-form strings that any caller can fill; today's callers pass constants, but the type contract is an open invitation for the future "label the pin with the street name" commit to place **user-authored content** into an HTML sink. The app's CSP (`script-src 'self' 'nonce-…' 'strict-dynamic'`) currently blocks inline-handler and inline-script execution, so this is HTML injection / defacement, not full XSS — but `strict-dynamic` means any nonce'd script that itself creates a script element propagates trust, and pin HTML that smuggles markup can rewrite the marker into a phishing surface ("Report deleted — sign in again"). Meanwhile `(pin as any).approximate` punches through the type system for a field that is set on the very next lines from the same object. Escape at the sink, and type the field.

**Production-Ready Refactor:**

```ts
/** Text that will be placed inside an HTML string. Markers are named by humans, not trusted as markup. */
function esc(s: string): string {
  return s.replace(/[&<>"']/g, (m) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[m] as string);
}

function pinHtml(pin: MapPin & { approximate?: boolean }, selected: boolean) {
  const isApprox = pin.approximate === true;
  const c = esc(pin.color ?? pulseCategoryMeta(pin.category).token);
  const raw = pin.label ?? CATEGORIES[pin.category]?.pin ?? "NT";
  const code = esc(raw.length <= 2 ? raw.toUpperCase() : raw.split(/\s+/).map((w) => w.charAt(0)).slice(0, 2).join("").toUpperCase());
  const size = code.length > 1 ? 9.5 : 13;
  if (isApprox) {
    return `<div class="nb-pin nb-pin-approx ${pin.live ? "nb-pin-live" : ""}" style="border:3px solid ${c};background:transparent;color:${c};width:38px;height:38px;border-radius:999px;display:grid;place-items:center;${selected ? "outline:3px solid var(--accent);outline-offset:2px;" : ""}"><span style="font-size:${size}px;color:${c}">${code}</span></div>`;
  }
  return `<div class="nb-pin ${pin.live ? "nb-pin-live" : ""}" style="background:${c};color:${c};${
    selected ? "outline:3px solid var(--accent);outline-offset:2px;box-shadow:0 0 0 6px var(--accent-muted);" : ""
  }"><span style="font-size:${size}px">${code}</span></div>`;
}
```

Also add `approximate?: boolean` to the `MapPin` type (line 43 area) and delete the `as any` cast.

---

## 2.4 [UX / A11Y] Location: `src/ui/pulse/pressable.tsx:33–40` (`Pressable` with `as="div"`)

**Flaw & Risk:** The `div` variant renders `role="button" tabIndex={0}` — focusable, announced as a button — but ships **no key handler**. Enter and Space, the two activation keys every screen-reader and keyboard user will press, do nothing. The component is the design system's shared press primitive, so every `as="div"` call site inherits an inert control. WCAG 2.1.1 (Keyboard) failure, hiding behind an otherwise good abstraction.

**Production-Ready Refactor:**

```tsx
  if (Tag === "div") {
    return (
      <div
        ref={ref as React.Ref<HTMLDivElement>}
        className={classes}
        role="button"
        tabIndex={disabled ? -1 : 0}
        aria-disabled={disabled || undefined}
        onKeyDown={(e) => {
          if (disabled) return;
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            (rest as React.HTMLAttributes<HTMLDivElement>).onClick?.(e as unknown as React.MouseEvent<HTMLDivElement>);
          }
        }}
        {...(rest as React.HTMLAttributes<HTMLDivElement>)}
      >
        {children}
      </div>
    );
  }
```

---

## 2.5 [UX] Location: `src/components/push-toggle.tsx:108–128` (`disable`)

**Flaw & Risk:** The web toggle's off-switch calls `/api/push/unregister` and **never checks `res.ok`**, then runs `deleteToken()` and flips the UI to "off" regardless. If the unregister 500s (deploy blip, DB timeout), the Firebase token is destroyed client-side while the server row survives with a dead token: the UI is honest ("off") but `push_tokens` accumulates zombie rows that fail at dispatch and skew "push enabled" counts in admin. Combined with finding 2.1 (mobile), the token table has no reliable garbage path.

**Production-Ready Refactor:**

```ts
  async function disable() {
    setBusy(true);
    setNote("");
    try {
      const token = await fetchToken();
      if (token) {
        const res = await fetch("/api/push/unregister", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token }),
        }).catch(() => null);
        const { initializeApp, getApps } = await import("firebase/app");
        const { getMessaging, deleteToken, isSupported } = await import("firebase/messaging");
        if (await isSupported()) {
          const app = getApps().length ? getApps()[0] : initializeApp(config);
          await deleteToken(getMessaging(app));
        }
        if (!res || !res.ok) {
          // Delivery stops (token deleted), but say the server-side cleanup failed so it can retry.
          setNote("Switched off on this device, but the server could not be told. It will clean up on its own; nothing will arrive here.");
        }
      }
      setState("off");
    } catch {
      setNote("Could not switch push off right now — you can also block notifications for this site in your browser settings.");
    } finally {
      setBusy(false);
    }
  }
```

Server-side (one-time hygiene, `src/app/api/push/register/route.ts` or a cron): delete `push_tokens` rows whose dispatch has failed N times — the schema already has `push_tokens_active_idx` to make that sweep cheap.

---

# STAGE 3 — API, ENDPOINTS & DATABASE RIGOR

**Sweep log (clean results):** validation is uniformly explicit and correct (`src/lib/validate.ts` — `text`, `dbInt`, `UUID_RE`, `readJson`, `likeEscape` used consistently; no route we opened passes raw query/body input to the ORM); IDOR sweep of `comments/[cid]`, `life/[id]`, `life/place/[id]`, `incidents/[id]`, `account/*` found ownership-or-staff checks on every mutation with audit-log writes for staff actions; admin routes gate through `requireStaff("admin")` with self-demotion and env-admin guards (`src/app/api/admin/users/route.ts:28–56`); webhooks verify signatures over raw bodies (`billing/webhook:17–22`, `streams/webhook:10–17`); crons are constant-time bearer-gated and 404 when unauthorized (`src/lib/cron.ts:5–19`). The findings below are what survived.

---

## 3.1 [SECURITY] Location: `src/lib/ai.ts:212` (Gemini call)

**Flaw & Risk:** The Gemini API key is sent as a URL query parameter: `…/generateContent?key=${encodeURIComponent(key)}`. URL strings are logged in full by proxies, CDN edge logs, APM request capture, Google's own URL infrastructure, and any `fetch` tracing — a bearer-equivalent credential in the most-logged string in the stack. One leaked key = unlimited Gemini spend on NowBey's bill and full read of the model's request payloads (which contain user report text — see 5.3). Google supports the `x-goog-api-key` header precisely for this.

**Production-Ready Refactor:**

```ts
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model())}:generateContent`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          // Header, never the ?key= query string: URLs end up in logs; headers do not.
          "x-goog-api-key": key,
        },
        cache: "no-store",
        signal: AbortSignal.timeout(opts.timeoutMs ?? 12_000),
        body: JSON.stringify(buildGeminiBody(parts, opts)),
      },
    );
```

Then rotate the key once in Google AI Studio — the old one has been living in loggable URLs for as long as this file has existed.

---

## 3.2 [SECURITY] Location: `src/lib/csp.ts:1–7` (stale comment) + `src/proxy.ts:57–59` vs `next.config.ts:16–17` (two CSPs)

**Flaw & Risk:** Three-way drift around the app's most important security header.
1. `src/lib/csp.ts:5–7` documents *"Shipped as Content-Security-Policy-Report-Only first… Switch the header name in src/proxy.ts once the console is clean"* — but `src/proxy.ts` already sets the **enforcing** `Content-Security-Policy` name. The runbook says the switch has not happened; the code says it has. An engineer following the comment would believe XSS is still only being observed.
2. `next.config.ts:17` sends a **second, different** CSP on `/:path*` (`frame-ancestors 'none'; base-uri 'self'; object-src 'none'; form-action 'self'`). Browsers enforce the intersection of multiple CSP headers — it works today only because the two policies happen not to conflict; the first person to tighten one policy can silently blank a page while the other header "looks fine".
3. `buildCsp` allows `style-src 'self' 'unsafe-inline' https:` — any HTTPS origin may inject styles (UI redressing, clickjack-style overlays that `X-Frame-Options` does not cover).

**Production-Ready Refactor:**

`src/lib/csp.ts` — fix the doc and tighten styles:

```ts
/**
 * The page Content-Security-Policy with a per-request nonce for scripts.
 *
 * Enforced (not Report-Only): src/proxy.ts sets this exact string as the single
 * Content-Security-Policy header. Do not add a second CSP in next.config.ts —
 * browsers intersect multiple policies and two headers will fight each other.
 */
```

(and in `buildCsp`, replace the style line:)

```ts
    "style-src 'self' 'unsafe-inline'",
```

`next.config.ts` — remove the duplicate CSP entry so exactly one policy exists:

```ts
const productionOnlyHeaders =
  process.env.NODE_ENV === "production"
    ? [{ key: "X-Frame-Options", value: "DENY" }]
    : [];
```

(`frame-ancestors 'none'`, `base-uri`, `object-src`, `form-action` are already in `buildCsp`; nothing is lost.)

---

## 3.3 [ARCHITECTURE / DB] Location: `src/db/schema.ts:86–94` (incidents indexes)

**Flaw & Risk:** The two hottest queries on the largest table have no matching composite index:
- `GET /api/incidents` (`route.ts:52–58`): `WHERE status = ? ORDER BY created_at DESC LIMIT n` — served by `incidents_created_idx` on `(created_at)` alone, so Postgres sorts the filtered set or scans the index backwards filtering rows. Fine at 1k rows, quadratic-ish pain at 500k.
- The duplicate-detection window (`route.ts:96–108`): `WHERE status='active' AND category=? AND created_at >= ? AND lat BETWEEN ? AND lng BETWEEN ?` — hits `incidents_status_idx` or `incidents_created_idx` with the rest as filter. The bounding box cannot use a btree, but the `(category, created_at)` prefix can.

**Production-Ready Refactor:**

```ts
  (table) => [
    index("incidents_created_idx").on(table.createdAt.desc()),
    index("incidents_status_idx").on(table.status),
    index("incidents_parish_idx").on(table.parish),
    index("incidents_user_idx").on(table.userId),
    // The map feed: WHERE status = ? ORDER BY created_at DESC LIMIT 60.
    index("incidents_status_created_idx").on(table.status, table.createdAt.desc()),
    // The 90-minute duplicate window: WHERE status='active' AND category = ? AND created_at >= ?.
    index("incidents_dedupe_idx").on(table.category, table.createdAt.desc()),
  ],
```

Then `npm run db:gen` and apply. (Claim checked against the actual `drizzle-orm` where-clauses in `src/app/api/incidents/route.ts:40–58` and `:96–108`.)

---

## 3.4 [ARCHITECTURE] Location: `src/app/api/incidents/route.ts:48–55` (count query) and root `add-*.sql` files (12 hand-run migrations)

**Flaw & Risk:** Two smaller rigor items that compound:
1. The `counts` query (58–63) runs on **every** map fetch and counts all active incidents grouped by category — a full aggregate beside a paginated read. It is cheap today and becomes the map's first bottleneck; it changes only when incidents change. Cache it (the route already has `after()` infrastructure) or compute it in the same pass.
2. Twelve migration files (`add-ai-push.sql`, `add-pin-privacy.sql`, `add-banned-devices.sql`, …) live at the repo root, outside `drizzle/`, applied by hand — `src/lib/ratelimit-core.ts:17–19` literally degrades security ("the shared verbs fall back to the in-memory layer… until the migration has run") when one is forgotten. Two migration systems, one of which silently weakens auth throttling when skipped.

**Production-Ready Refactor:**

For (2), fold each root SQL into drizzle-kit migrations (`drizzle/` is already the generated dir) and delete the root copies; make `rate_limits` fallback **fail closed** for password routes instead of silently downgrading:

```ts
// src/lib/ratelimit-core.ts — sharedHit for credential routes:
// if the table is missing, refuse rather than fall back to per-instance counting on Vercel.
```

```ts
export async function sharedHitStrict(key: string, limit: number, windowMs: number) {
  try {
    return await sharedHit(key, limit, windowMs);
  } catch (e) {
    // Table missing = deployment half-done. Sign-in/reset must not run on the weak path.
    console.error("[ratelimit] rate_limits table unavailable — refusing credential attempt", pgCode(e));
    return { ok: false, retryAfter: 60 };
  }
}
```

and call `sharedHitStrict` from `session/route.ts`, `account/forgot`, `account/reset`, `account/password`.

---

# STAGE 4 — UI/UX & MOBILE ACCESSIBILITY

---

## 4.1 [UX] Location: `expo/src/ui.tsx:125–148` (`Pill`) — used at `expo/app/(tabs)/you.tsx:85–86, 104`, parish pickers, map filters

**Flaw & Risk:** `Pill` is the app's primary tappable chip: `paddingVertical: 7` + `fontSize: 12` ≈ **30 px tall**, under the 44 pt iOS HIG / 48 dp Android standard, with no `hitSlop` compensation. It selects home island, map filters, sign-in mode — and, at `you.tsx:104`, it is the **Terms & Privacy agreement toggle**. Mis-taps on a hazard-reporting app move parish attribution; mis-taps on the consent control are worse. Everything else in `ui.tsx` is disciplined (`Btn` `minHeight: 44`, `Field` `minHeight: 46`).

**Production-Ready Refactor:**

```tsx
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: !!active, disabled: !!disabled }}
      onPress={onPress}
      disabled={disabled}
      hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
      style={{
        paddingHorizontal: 13,
        paddingVertical: 7,
        minHeight: 44,
        justifyContent: "center",
        borderRadius: radius.pill,
        backgroundColor: active ? `${c}33` : "rgba(255,255,255,0.06)",
        borderWidth: 1,
        borderColor: active ? c : "transparent",
        marginRight: 6,
        marginBottom: 6,
        opacity: disabled ? 0.45 : 1,
      }}
    >
```

---

## 4.2 [UX] Location: `expo/app/(tabs)/report.tsx:154–157` and `expo/app/(tabs)/you.tsx` signup card — zero keyboard-avoidance in the entire Expo app

**Flaw & Risk:** Grep result: the Expo project contains **no** `KeyboardAvoidingView`, no `automaticallyAdjustKeyboardInsets`, no `keyboardVerticalOffset` anywhere. `report.tsx` is a `ScrollView` of `Field`s (title, details, photo note, 3-step wizard) and `you.tsx` stacks handle/email/name/password inputs; on any iPhone with a keyboard (all of them) the focused field and the submit button sit under the keyboard until the user blindly scrolls. The report wizard's "Check & send" step is exactly the moment this bites — the submit button is below the fold of the keyboard. `keyboardShouldPersistTaps="handled"` is set (good) but that only fixes tap-to-dismiss.

**Production-Ready Refactor:**

`expo/app/(tabs)/report.tsx:154–157`:

```tsx
    <ScrollView
      style={{ flex: 1 }}
      contentContainerStyle={{ padding: 16, paddingBottom: 48 }}
      keyboardShouldPersistTaps="handled"
      automaticallyAdjustKeyboardInsets
      keyboardDismissMode="interactive"
    >
```

Same three props on the `ScrollView` wrapping the signup card in `expo/app/(tabs)/you.tsx` (the form is inside the screen's main scroll container). `automaticallyAdjustKeyboardInsets` is iOS-native and free; for Android add `android:windowSoftInputMode="adjustResize"` in `expo/app.config.js` (`"softwareKeyboardLayoutMode": "resize"` in `expo.android`).

---

## 4.3 [UX / COMPLIANCE] Location: `expo/app/(tabs)/report.tsx:52–60` (`useMyLocation`), `src/components/map/NowBeyMap.tsx:462–486`

**Flaw & Risk:** Both platforms fire the OS location dialog the instant a control is tapped, with no in-app pre-prompt explaining *why* before the system prompt appears. `expo/app/(tabs)/report.tsx:54` calls `Location.requestForegroundPermissionsAsync()` directly; `NowBeyMap.tsx:467` calls `navigator.geolocation.getCurrentPosition` directly. Apple HIG and Google Play policy both expect apps to prime the permission with context ("We use your location only to place the pin near you — nothing is tracked in the background") *before* the OS dialog, because a cold denial is often permanent and un-install-recoverable. Secondary: `report.tsx:59` requests `Location.Accuracy.High` (GNSS, max battery) to drop a pin the server immediately fuzzes via `storedPinFor`/`pinPrivacyMeters` (`src/lib/location-privacy.ts`) — the accuracy is discarded by design; the battery cost is not.

**Production-Ready Refactor:**

```tsx
  const [locPrimer, setLocPrimer] = useState(false);

  async function useMyLocation() {
    setError(null);
    // Pre-prompt: explain before the OS dialog, not after the denial.
    if (!locPrimer) {
      setLocPrimer(true);
      Alert.alert(
        "Use your location?",
        "NowBey uses your location once, only to place the report pin near you. It is never tracked in the background, and the published pin is deliberately blurred.",
        [
          { text: "Not now", style: "cancel" },
          { text: "Continue", onPress: () => void useMyLocation() },
        ],
      );
      return;
    }
    setLocating(true);
    try {
      const perm = await Location.requestForegroundPermissionsAsync();
      if (perm.status !== "granted") {
        setError("Allow location access, or tap the map to place the pin.");
        return;
      }
      // Balanced: the server fuzzes the stored pin anyway (location-privacy.ts) —
      // high accuracy is battery spent on precision that is then thrown away.
      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const p = { lat: pos.coords.latitude, lng: pos.coords.longitude };
      ...
```

(Import `Alert` from `react-native`; mirror the same `Alert.alert` pre-prompt before `navigator.geolocation.getCurrentPosition` in `NowBeyMap.tsx`'s locate handler, gated by a `askedOnce` ref.)

---

## 4.4 [UX] Location: `src/components/wire-forms.tsx:83, 341, 349, 395`; `src/components/life/post-form.tsx:131`; `src/components/ad-slot.tsx:9–27`; `src/components/splash-screen.tsx:75–89`

**Flaw & Risk:** Design tokens are bypassed with raw hex values at the point of use. Worst offender `wire-forms.tsx` hardcodes `#ff7a6b` four times for error text — line 83 even sits *next to* the correct token (`var(--nb-danger-500, #ff7a6b)`) and lines 341/349/395 skip the variable entirely. Theme retune (the repo already runs multi-theme via `src/lib/themes.ts` and a light/dark toggle) then shows one stray coral error on an otherwise coherent surface. `life/post-form.tsx:131` hardcodes `#fff0d9` text color; `ad-slot.tsx` and `splash-screen.tsx` bake brand hexes instead of reading the palette. (`global-error.tsx` is excused — it must render when React context is gone — and the Google logo in `login-form.tsx:202–205` is brand-mandated.)

**Production-Ready Refactor:**

`src/components/wire-forms.tsx` (all four sites):

```tsx
{msg ? <p style={{ fontSize: 12.5, color: msg.ok ? "var(--nb-mint)" : "var(--nb-danger-500)" }}>{msg.text}</p> : null}
...
{locMsg ? <p className="nb-hint" style={{ color: "var(--nb-danger-500)" }}>{locMsg}</p> : null}
...
{err ? <p className="nb-hint" style={{ color: "var(--nb-danger-500)" }}>{err}</p> : null}
```

`src/components/life/post-form.tsx:131`:

```tsx
<span className="display mt-2 block text-[14px] font-extrabold" style={{ color: on ? KINDS[k].color : "var(--text-primary)" }}>
```

`src/components/ad-slot.tsx` — move the four `tone` hexes to theme tokens (`var(--nb-mint)`, `var(--nb-sun)`, `var(--nb-danger-500)`, `var(--nb-lilac)`), keeping hex only as fallback: `tone: "var(--nb-mint, #2ee6d0)"`.

---

# STAGE 5 — LEGAL, PRIVACY & COMPLIANCE

---

## 5.1 [COMPLIANCE] Location: `src/app/login/login-form.tsx:335–351` (signup submit) vs `expo/app/(tabs)/you.tsx:104–117` (app signup)

**Flaw & Risk:** The **website** — the primary sign-up channel, including "Sign up with Google" (`login-form.tsx:200–207`) — creates accounts with **no Terms/Privacy notice, no links, and no acceptance control** at the moment of collection. The submit area offers "Continue without an account" and "report a hazard anonymously" and nothing else. The mobile app gets this right: a mandatory "Tap to agree to the Terms and Privacy Policy" pill, links to both documents, and the submit button disabled until agreed (`you.tsx:104–117`). That inconsistency is the worst shape legally: the company demonstrably *knew* the standard (it built it for the app) and applied it to only one channel. CCPA requires notice at or before collection; GDPR requires informed, affirmative consent (or a documented alternative basis) — a signup form with zero legal surface supports neither.

**Production-Ready Refactor:**

In `src/app/login/login-form.tsx`, inside the signup branch immediately after the Confirm-password block (line ~342) and before `{error ? …}`:

```tsx
          <div className="mt-3">
            <label className="flex items-start gap-2 text-[12px] leading-relaxed text-tertiary">
              <input
                type="checkbox"
                checked={agreed}
                onChange={(e) => setAgreed(e.target.checked)}
                className="mt-0.5 h-4 w-4 shrink-0 accent-[var(--nb-mint)]"
              />
              <span>
                I agree to the{" "}
                <Link href="/terms" target="_blank" className="font-bold text-text-accent hover:underline">
                  Terms of Use
                </Link>{" "}
                and{" "}
                <Link href="/privacy" target="_blank" className="font-bold text-text-accent hover:underline">
                  Privacy Policy
                </Link>
                . We use your email only for your account and the alerts you choose.
              </span>
            </label>
          </div>
```

Add state `const [agreed, setAgreed] = useState(false);` and gate the submit button and the Google button in signup mode:

```tsx
        <button type="submit" disabled={busy || (mode === "signup" && !agreed)} className="nb-btn nb-btn-primary mt-4 w-full">
```

---

## 5.2 [COMPLIANCE] Location: `src/app/api/session/route.ts:89–108` (signup insert) + `src/db/schema.ts:24–54` (`users` table)

**Flaw & Risk:** Even the app's agreement checkbox is **client-side theater**: it is never sent to the server (`expo/src/api.ts` signup payload has no `agreed` field — checked), and `/api/session` POST signup stores handle/name/email/parish/password-hash with **no consent timestamp**. GDPR Art. 7(1): *"The controller shall be able to demonstrate that the data subject has consented."* A screenshot of a checkbox the server never heard about does not demonstrate anything in an audit or a DSAR dispute. The Google OAuth path (`auth/google/*`) creates accounts with even less surface.

**Production-Ready Refactor:**

Migration (new file in `drizzle/` via `db:gen`, or immediate SQL):

```sql
ALTER TABLE users ADD COLUMN terms_accepted_at timestamptz;
ALTER TABLE users ADD COLUMN privacy_accepted_at timestamptz;
```

`src/db/schema.ts` in the `users` columns object:

```ts
    /** When the member accepted the Terms of Use — recorded so acceptance can be demonstrated (GDPR Art. 7). */
    termsAcceptedAt: timestamp("terms_accepted_at", { withTimezone: true }),
    privacyAcceptedAt: timestamp("privacy_accepted_at", { withTimezone: true }),
```

`src/app/api/session/route.ts`, signup branch — require and store it:

```ts
    if (intent === "signup") {
      if (body.agreed !== true) {
        return NextResponse.json({ error: "Please accept the Terms of Use and Privacy Policy to create an account." }, { status: 400 });
      }
      ...
        .values({
          handle,
          displayName: text(body.displayName, 60) || handle,
          email,
          parish: (PARISHES as readonly string[]).includes(parishIn) ? parishIn : null,
          passwordHash: await hashPassword(password),
          lastLoginAt: new Date(),
          termsAcceptedAt: new Date(),
          privacyAcceptedAt: new Date(),
        })
```

Send `agreed: true` from `login-form.tsx` (it is already gated on the checkbox) and from `expo/src/api.ts`'s signup call (it is already gated on the pill). For Google sign-ups, set the same two columns in the Google account-creation path and treat the "Continue with Google" click-after-links-shown (add the same links block under the Google button) as the acceptance event.

---

## 5.3 [COMPLIANCE] Location: `src/app/privacy/page.tsx:30–37` ("Who sees it" / "How we use it") vs actual data flows

**Flaw & Risk:** The policy's processor list is *"our hosting and database provider, Resend (email) and Stripe (payments)"*. The codebase sends user data to materially more parties:

| Data | Where it goes | Code |
|---|---|---|
| Report title/details/photo notes + **pin coordinates** | **Google Gemini** | `src/lib/report-ai.ts` via `src/app/api/reports/assist/route.ts:27–37` |
| Uploaded Island Life **photos** (content moderation) | **Google Gemini** | `screenPhotos` in the life POST (`src/app/api/life/route.ts:146`) |
| Client error stacks, breadcrumbs, URLs, handles | **Google Gemini** | `src/lib/error-ai.ts` via `src/app/api/errors/route.ts:47` |
| News/digest text generation | **Google Gemini** | `src/lib/news-ai.ts`, `src/lib/digest/*` |
| Geocoder search queries + IPs | **OpenStreetMap / Nominatim** (and Google geocoding when key present) | `src/app/api/geocode/route.ts:26–30, 76–84`, `src/lib/geocode.ts` |
| Broadcast audio/video | **LiveKit Cloud** | `src/lib/broadcast.ts`, `src/app/api/streams/*` |
| Push tokens | **Expo / Apple APNs / Google FCM** (and **Firebase** for web push) | `expo/src/push.ts`, `src/lib/push.ts`, `firebase-messaging-sw.js` |
| Name + email at "Sign up with Google" | **Google** | `src/app/api/auth/google/*` |

A privacy policy that names three processors while eight exist is not incomplete — it is inaccurate, which is the standard regulators actually enforce (GDPR Art. 13(1)(e) requires recipients/categories; CCPA requires the "categories of third parties" at or before collection). "We do not use it for advertising by other companies" remains true, but the "Who sees it" section currently under-discloses by name.

**Production-Ready Refactor:**

Replace the second and third SECTIONS entries in `src/app/privacy/page.tsx` with:

```ts
  {
    h: "How we use it",
    p: [
      "To run the map and news wire, show your reports (with your handle unless you post anonymously), send the alert emails you ask for, keep the service safe, and manage paid plans.",
      "To check reports and photos for harmful content and to draft suggestions for report titles: text and photos you submit, and the pin you placed, are processed by Google's Gemini AI on our behalf. The AI only ever suggests — a person publishes everything you see. Nothing from these checks is used to advertise.",
      "We do not sell your personal information and we do not use it for advertising by other companies. Ads shown are our own house ads.",
    ],
  },
  {
    h: "Who sees it",
    p: [
      "Reports, comments and posts are public. Anyone can see them and the location you pinned.",
      "Service providers who help us run NowBey, who may only use your data to provide those services: our hosting and database provider; Resend (email); Stripe (payments); Google (AI processing of report text and photos, and Google sign-in); OpenStreetMap/Nominatim and Google (address lookups when you search or place a pin); LiveKit (live audio/video when you broadcast); Apple and Google (delivering push notifications); Expo and Firebase (notification delivery infrastructure).",
      "We may share information when the law requires it, or to protect people from harm.",
    ],
  },
```

---

## 5.4 [COMPLIANCE] Location: `src/app/api/export/route.ts:18–21` vs `src/app/privacy/page.tsx:45`

**Flaw & Risk:** The privacy policy promises *"ask us for a copy of your data"*. The only implemented copy path is `GET /api/export`, which returns **403 "Downloading reports is part of the Admiral plan"** for every member not paying for the Admiral tier or admin. Charging for data access is a textbook GDPR Art. 12(5) violation: *"information provided … and any communication … shall be provided free of charge"* — access to one's own personal data cannot sit behind a paywall. Worse, the CSV that paying members *do* get covers only their incidents — not comments, life posts, photos, profile, alert subscriptions, or push tokens — so even the paid path is not a complete access response. The Admiral perk is fine as a *product* feature (pretty CSV export of reports); it must not be the *rights* channel.

**Production-Ready Refactor:**

`src/app/api/export/route.ts` — split the gate; free for everyone on their own data:

```ts
/**
 * Any member can download their own personal data (GDPR Art. 15 / CCPA right to know),
 * free of charge. The Admiral plan's perk is the polished spreadsheet format of reports;
 * the raw data is everyone's right.
 */
export async function GET(req: Request) {
  const viewer = await getViewer();
  if (!viewer.signedIn || !viewer.userId || !viewer.handle) {
    return new Response("Sign in to download your data.", { status: 401 });
  }
  const sp = new URL(req.url).searchParams;
  const full = sp.get("scope") === "all"; // the complete access bundle (right of access)
  const pretty = viewer.tier === "admiral" || viewer.isAdmin; // the paid spreadsheet perk

  const rows = await db
    .select()
    .from(incidents)
    .where(or(eq(incidents.userId, viewer.userId), and(eq(incidents.authorHandle, viewer.handle), eq(incidents.anonymous, false))))
    .orderBy(desc(incidents.createdAt));
  ...
```

and for `scope=all`, append sections (CSV or JSON) covering `comments` by `userId`, `posts` by `userId`, `alertSubscriptions`, and the `users` row itself minus `passwordHash`/`sessionVersion`. Update the `/you/settings` UI so the free download is discoverable without mentioning plans. In the policy, "Your choices" can then keep its promise verbatim.

---

## 5.5 [COMPLIANCE] Location: `src/app/api/account/route.ts:30–79` (DELETE) — one retention gap in an otherwise exemplary erasure path

**Flaw & Risk:** Account deletion is the strongest compliance surface in the codebase — password re-check with lockout, admin and active-subscription guards, a single transaction that anonymizes incidents/updates, blanks threaded comments, deletes the rest, drops alert subscriptions and the user row (FK cascade takes posts/photos/reactions). Two gaps remain against the policy text *"Your comments, Island Life posts, photos and alert settings are deleted"*:
1. `push_tokens` for the user are **not** unregistered — the schema has `userId` on `push_tokens` (`schema.ts:605` area is the table; check cascade: if `userId` FK lacks `onDelete: "cascade"`, tokens survive the user and could receive future broadcast pushes).
2. `device_tokens` / `banned_devices` / `account_tokens` rows similarly depend on cascade behavior that is not verified by the delete transaction.

**Production-Ready Refactor:**

Inside the same `db.transaction` in `src/app/api/account/route.ts`, before `tx.delete(users)`:

```ts
    await tx.delete(alertSubscriptions).where(eq(alertSubscriptions.userId, u.id));
    await tx.delete(pushTokens).where(eq(pushTokens.userId, u.id));
    await tx.delete(deviceTokens).where(eq(deviceTokens.userId, u.id));
    await tx.delete(accountTokens).where(eq(accountTokens.userId, u.id));
```

(add the schema imports; belt-and-braces on top of any FK cascade, and it makes the policy statement true by code, not by hope.)

---

# Board sign-off

| Stage | Findings | Ship-blockers |
|---|---|---|
| 1 — Dead code & bundle | 6 | `V2_UI_Backup/` deletion before any store build |
| 2 — Bugs & state | 5 | 2.1 (push "off" that is not off) — privacy/safety |
| 3 — API/DB rigor | 4 | 3.1 (API key in URLs) — rotate + fix |
| 4 — UX & mobile a11y | 4 | Keyboard avoidance before app-store submission |
| 5 — Legal & privacy | 5 | 5.1/5.2 (consent), 5.3 (processor list), 5.4 (paywalled access right) before public launch |

Everything else in the sweep — auth plumbing, IDOR posture, webhook verification, rate limiting, cron guards, interval cleanup, DB indexing, validation hygiene — was inspected and passed. The distance between this codebase and production-ready is measured in these 23 items, not in rewrites.
