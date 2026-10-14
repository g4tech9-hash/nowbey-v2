# NowBey V2 — Code Review Findings (Implementation Handoff)

> **Purpose of this document:** a complete, self-contained export of a production-readiness code
> review of this workspace. It is written so an AI (or engineer) can implement the fixes without
> re-reading the review. Each finding has an exact file path, line anchor, explanation, and a
> rewritten code block.
>
> **Review method:** static reading of the auth/session layer, all admin routes, both cron routes,
> ~15 API routes read in full (the rest pattern-searched for SQL interpolation, rate-limit keys and
> auth gates), the Drizzle schema, the sanitizer, the photo pipeline, layout and key client
> components, plus git history inspection. `npx tsc --noEmit` → exit 0; `npm run lint` → exit 0 at
> the time of review. No source files were modified by the review.
>
> **Severity legend:** 🚨 CRITICAL = fix immediately (app-breaking / security / data loss) ·
> ⚠️ HIGH = must not merge to production · 💡 MEDIUM = best-practice / refactor · 📝 LOW = nitpick.

**Implementation order:** C1 → C2 → C3 → H1 → H2 → H3 → H4 → H5 → H6 → mediums → lows.
After each fix, run `npx tsc --noEmit` and `npm run lint` (both must exit 0).

---

## Summary of findings

| ID | Sev | Pillar | File(s) |
|----|-----|--------|---------|
| C1 | 🚨 CRITICAL | Security | `src/app/api/cron/gas-update/route.ts`, `src/app/api/cron/places-update/route.ts` |
| C2 | 🚨 CRITICAL | Architecture/Logic | `src/app/api/cron/gas-update/route.ts`, `src/db/schema.ts` |
| C3 | 🚨 CRITICAL | Security | `.env.vercel`, `.gitignore` |
| H1 | ⚠️ HIGH | Code Quality | `next.config.ts` |
| H2 | ⚠️ HIGH | Security | `src/app/api/billing/checkout/route.ts` |
| H3 | ⚠️ HIGH | Security | `next.config.ts` |
| H4 | ⚠️ HIGH | Security/Performance | `src/lib/ratelimit.ts` |
| H5 | ⚠️ HIGH | Performance | `src/app/api/cron/places-update/route.ts` |
| H6 | ⚠️ HIGH | Code Quality | `package.json` (missing test suite) |
| M1 | 💡 MEDIUM | Security | `src/app/api/session/route.ts` |
| M2 | 💡 MEDIUM | Security/Performance | `src/lib/auth.ts` |
| M3 | 💡 MEDIUM | Architecture | `src/db/schema.ts` (bytea photo storage) |
| M4 | 💡 MEDIUM | Performance | `src/components/live-ticker.tsx` |
| M5 | 💡 MEDIUM | Performance | `src/lib/viewer.ts` |
| M6 | 💡 MEDIUM | Security | `next.config.ts` (frame-ancestors) |
| M7 | 💡 MEDIUM | Code Quality | misc DRY/dead scripts |
| L1 | 📝 LOW | Code Quality | repo hygiene (372 junk files) |
| L2 | 📝 LOW | Code Quality | `src/components/nav-links.tsx` |
| L3 | 📝 LOW | Code Quality | stale root docs |
| L4 | 📝 LOW | Performance | `src/app/api/geocode/route.ts` |
| L5 | 📝 LOW | Performance | `src/app/map/page.tsx` |

**Overall verdict:** the codebase is well engineered — parameterized Drizzle queries everywhere,
timing-safe token comparison, one-time hashed reset tokens, magic-byte image sniffing + re-encode,
DOMPurify sanitization, `requireStaff` on every staff route, CSV-injection escaping in the export.
No SQL injection, no XSS, no missing admin auth was found. The critical items are configuration
and cron correctness, not request-handling code.

---

# 🚨 CRITICAL

## C1. Cron endpoints are unauthenticated when `CRON_SECRET` is unset — "Bearer undefined" bypass

**Files:**
- `src/app/api/cron/gas-update/route.ts` line 12
- `src/app/api/cron/places-update/route.ts` line 11

**Current code:**
```ts
if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
  return new Response("Unauthorized", { status: 401 });
}
```

**Why it's a problem:** if `CRON_SECRET` is missing (new environment, project without the var,
local dev), this compares against the literal string `"Bearer undefined"`. Sending
`Authorization: Bearer undefined` **passes the gate**, so anyone can trigger DB-writing jobs. It
is also a plain `!==`, so it is timing-unsafe and by construction fails *open*.

**Fix (fail closed, constant-time) — apply to BOTH cron routes:**
```ts
import { timingSafeEqual } from "node:crypto";

/** Fail closed: no secret configured means nobody can call this route. */
function authorized(header: string | null, secret: string | undefined): boolean {
  if (!secret || secret.length < 16) return false;
  const expected = Buffer.from(`Bearer ${secret}`);
  const got = Buffer.from(header ?? "");
  return got.length === expected.length && timingSafeEqual(got, expected);
}

export async function GET(request: Request) {
  if (!authorized(request.headers.get("Authorization"), process.env.CRON_SECRET)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  // ... existing body
}
```

**Also:** set `CRON_SECRET` (≥16 random chars) in the deployment environment after this change,
or the route will correctly refuse everyone.

---

## C2. Gas cron cannot work: it inserts a system-user UUID that violates a foreign key — then writes fake prices

**Files:**
- `src/app/api/cron/gas-update/route.ts` lines 28–45
- `src/db/schema.ts` lines 386–391 (`gasReports`)

**Schema (the constraint the cron violates):**
```ts
export const gasReports = pgTable("gas_reports", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  // ...
});
```

**Why it's a problem (three failures in one route):**
1. `gasReports.userId` is `.notNull().references(() => users.id)` — inserting
   `"00000000-0000-0000-0000-000000000000"` throws Postgres `23503` unless that row exists. The
   route's `catch` then returns **500 every run**.
2. The comment says "Upsert logic" but the code is a blind `insert` — if you seed the system user,
   every run adds 3 more duplicate rows and corrupts the price history the UI charts.
3. The prices are hard-coded mock data (`Shell 708, Esso 750, Rubis 756`) presented to users as
   real member-reported prices.

**Fix — schema change (nullable system rows):**
```ts
userId: uuid("user_id").references(() => users.id, { onDelete: "set null" }),
```

**Fix — migration (once):**
```sql
-- make the column nullable, add a natural-key uniqueness for idempotent upserts
ALTER TABLE gas_reports ALTER COLUMN user_id DROP NOT NULL;
CREATE UNIQUE INDEX gas_reports_day_idx
  ON gas_reports (station, fuel, parish, (created_at::date));
-- clean up the fake system user if it was ever inserted:
UPDATE gas_reports SET user_id = NULL WHERE user_id = '00000000-0000-0000-0000-000000000000';
```

**Fix — route body (true upsert):**
```ts
for (const p of prices) {
  await db
    .insert(gasReports)
    .values({
      userId: null, // system row: no owner
      station: p.station,
      parish: p.parish,
      fuel: p.fuel,
      priceCents: p.price,
      createdAt: new Date(),
    })
    .onConflictDoNothing() // (station, fuel, parish, day) — index from the migration
    .execute();
}
```
If the mock feed is intentional staging data, tag it explicitly (e.g. a `source` column set to
`"placeholder"`) and never return it as live member reports.

---

## C3. `.env.vercel` is committed to git and contains `VERCEL_OIDC_TOKEN`

**File:** `.env.vercel` — tracked at commit `9e4eb47`

**Why it's a problem:** `.env` and `.data` are correctly ignored, but `.env.vercel` slipped through
(the `.gitignore` only lists `.env`, `.env.local`, `.env.*.local`). A live OIDC token in history
allows OIDC-federation identity actions as the project, and any future value written to that file
(Stripe keys, DB URLs) will silently leak the same way.

**Fix:**
```bash
# 1. Remove from the index (keeps the local file)
git rm --cached .env.vercel

# 2. Append to .gitignore (replace the current secret block for clarity)
cat >> .gitignore <<'EOF'
.env.vercel
.env.*
!/.env.example
EOF

# 3. Revoke/rotate the token in Vercel — removing the file does NOT remove it from history.
# 4. If the remote is/was public, purge history:
#    git filter-repo --sensitive-paths .env.vercel
```

---

# ⚠️ HIGH

## H1. `typescript.ignoreBuildErrors: true` — production builds accept broken types

**File:** `next.config.ts` lines 15–17

**Current:**
```ts
const nextConfig: NextConfig = {
  poweredByHeader: false,
  typescript: {
    ignoreBuildErrors: true,
  },
  // ...
```

**Why it's a problem:** `npm run typecheck` passes today, but `next build` will now ship *any* type
violation to production (implicit `any`, broken refactors, null-derefs the compiler would have
caught). For a production-critical deploy this is the easiest quality regression to close.

**Fix:**
```ts
const nextConfig: NextConfig = {
  poweredByHeader: false,
  // Do NOT set typescript.ignoreBuildErrors — CI runs `npm run typecheck` before build.
  // Also do not set eslint.ignoreDuringBuilds.
  // ...
};
```
Add a CI step: `npm run typecheck && npm run lint && npm run build`.

---

## H2. Demo-mode plan self-grant: anyone can unlock the paid tier when Stripe is unconfigured

**File:** `src/app/api/billing/checkout/route.ts` lines 44–52

**Current:**
```ts
// Demo mode: no payment provider is connected, so nothing is charged.
if (!stripeConfigured()) {
  await db
    .update(users)
    .set({ adFreeTier: tier, planInterval: interval, planStatus: "sandbox", planRenewsAt: null })
    .where(eq(users.id, viewer.userId));
  return NextResponse.json({ mode: "demo", tier, interval });
}
```

**Why it's a problem:** deploy to production before adding Stripe keys and every account can
self-upgrade — including `admiral`, which unlocks the CSV export gate in
`src/app/api/export/route.ts` line 22 (`viewer.tier !== "admiral" && !viewer.isAdmin`) and the
verified badge. Direct revenue/authz bypass.

**Fix:**
```ts
const demoPlans = process.env.ALLOW_DEMO_PLANS === "true"; // set ONLY on dev/preview

if (!stripeConfigured()) {
  if (!demoPlans) {
    return NextResponse.json(
      { error: "Payments are not set up on this server." },
      { status: 503 },
    );
  }
  await db
    .update(users)
    .set({ adFreeTier: tier, planInterval: interval, planStatus: "sandbox", planRenewsAt: null })
    .where(eq(users.id, viewer.userId));
  return NextResponse.json({ mode: "demo", tier, interval });
}
```

---

## H3. `Access-Control-Allow-Origin: *` on every `/api/*` response, while those routes are cookie-authenticated

**File:** `next.config.ts` lines 26–33

**Current:**
```ts
{
  source: "/api/:path*",
  headers: [
    { key: "Access-Control-Allow-Origin", value: "*" },
    { key: "Access-Control-Allow-Methods", value: "GET,POST,PATCH,DELETE,OPTIONS" },
    { key: "Access-Control-Allow-Headers", value: "Content-Type, Authorization, x-nowbey-client" },
  ],
},
```

**Why it's a problem:** the comment claims *"Sign-in there uses a bearer token, not cookies"*, but
`/api/session` sets the `nowbey_session` cookie and every authenticated GET (`/api/export`,
`/api/life`, `/api/session`) is cookie-readable. Today the wildcard is *latent* rather than
exploitable (no `Access-Control-Allow-Credentials` + `SameSite=lax`), but it is one
`credentials: 'include'` away from full cross-origin account-data theft, and it needlessly exposes
the private API to any origin.

**Fix:**
```ts
const apiOrigins = (process.env.ALLOWED_ORIGINS ?? process.env.APP_URL ?? "http://localhost:3000")
  .split(",")
  .map((s) => s.trim().replace(/\/$/, ""));

// inside headers():
{
  source: "/api/:path*",
  headers: [
    { key: "Access-Control-Allow-Origin", value: apiOrigins[0] }, // or echo Origin when it is in apiOrigins
    { key: "Vary", value: "Origin" },
    { key: "Access-Control-Allow-Methods", value: "GET,POST,PATCH,DELETE,OPTIONS" },
    { key: "Access-Control-Allow-Headers", value: "Content-Type, Authorization, x-nowbey-client" },
    // deliberately NO Access-Control-Allow-Credentials: cookie sessions stay same-origin only
  ],
}
```
If multiple origins are needed (Expo web dev server + `APP_URL`), implement the allowlist echo in
the existing `src/proxy.ts` (~8 lines) instead of using `*`.

---

## H4. Rate limiting is per-process and IP-spoofable

**File:** `src/lib/ratelimit.ts` lines 12–30

**Why it's a problem — two independent weaknesses that together defeat every limit in the app
(login 30/15 min, 10 sign-ups/hour, comment/post caps):**
1. `clientIp()` takes the **first** `X-Forwarded-For` entry. If the host appends (rather than
   overwrites) a client-supplied XFF, the attacker rotates the first hop and resets every counter.
2. `buckets` is an in-process `Map`: on a multi-instance deploy each instance keeps its own count,
   so "10/hour" becomes `10 × instances`. Cleanup only runs `if (buckets.size > 5000)` and only
   prunes *expired* keys — a spoofed-IP flood keeps keys alive (`signup:` keys live 1 hour,
   `loginfail:` 15 min) and grows memory without bound between sweeps.

**Fix 1 — trusted address:**
```ts
export function clientIp(req: Request): string {
  // Prefer the address your trusted proxy sets last; earlier entries can be client-controlled.
  const chain = (req.headers.get("x-forwarded-for") ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  const ip = req.headers.get("x-real-ip") ?? chain[chain.length - 1] ?? "";
  return ip.slice(0, 64) || "local";
}
```
> ⚠️ Confirm the platform's XFF semantics first (Vercel prepends the client IP; a self-hosted Node
> server usually sees the client's raw header and must take the last trusted hop).

**Fix 2 — hard memory cap, sweep on every call:**
```ts
const MAX_KEYS = 5000;

function live(key: string, windowMs: number): number[] {
  const now = Date.now();
  const entry = buckets.get(key);
  const hits = (entry?.hits ?? []).filter((t) => now - t < windowMs);
  if (buckets.size >= MAX_KEYS) {
    for (const [k, v] of buckets) {
      if (!v.hits.length || now - v.hits[v.hits.length - 1] > v.windowMs) buckets.delete(k);
      if (buckets.size < MAX_KEYS) break; // never let the map outrun the cap
    }
  }
  return hits;
}
```

**Fix 3 — shared store for auth routes:** keep this in-memory limiter as first-line defense, but
back `/api/session`, `/api/account/reset`, `/api/account/forgot` with a shared store (Redis/Upstash
or a small Postgres `rate_events` table) so limits survive instance scaling.

---

## H5. Places cron is N+1, racy, and fails the whole run on one conflict

**File:** `src/app/api/cron/places-update/route.ts` lines 36–92

**Why it's a problem:** for every row in `places.json` it runs a `SELECT` (check) then `INSERT`
(act) sequentially — classic N+1 with a check-then-insert race. The schema has
`uniqueIndex("places_external_idx")` (`src/db/schema.ts` line 489), so under two overlapping cron
runs the loser gets `23505` → the whole route 500s after already having written partial data (no
transaction). `fs.readFileSync(JSON.parse(...))` of the full dataset on every invocation also throws
synchronously if the file is absent on a read-only deploy image, landing in the same 500 catch.

**Fix — one statement per row, atomic upsert, keeping the "never overwrite member edits" rule
(`COALESCE` only backfills NULLs):**
```ts
import { sql } from "drizzle-orm";

for (const p of data) {
  await db.execute(sql`
    INSERT INTO places (name, kind, parish, address, lat, lng, external_id, source,
                        contact_number, social_links, image_urls, hours)
    VALUES (${p.name}, ${p.category ?? "tip"}, ${p.parish}, ${p.address}, ${p.lat}, ${p.lng},
            ${p.id}, 'openplaces', ${p.phone},
            ${p.website ? JSON.stringify({ website: p.website }) : null},
            ${p.imageUrls ? JSON.stringify(p.imageUrls) : null}, ${hours})
    ON CONFLICT (external_id) DO UPDATE SET
      hours          = COALESCE(places.hours,          EXCLUDED.hours),
      contact_number = COALESCE(places.contact_number, EXCLUDED.contact_number),
      social_links   = COALESCE(places.social_links,   EXCLUDED.social_links),
      image_urls     = COALESCE(places.image_urls,     EXCLUDED.image_urls),
      lat            = COALESCE(places.lat,            EXCLUDED.lat),
      lng            = COALESCE(places.lng,            EXCLUDED.lng),
      parish         = CASE WHEN places.parish IN ('Unknown', '') THEN EXCLUDED.parish ELSE places.parish END,
      updated_at     = now()
  `);
}
```
Also guard the file read: return `{ ok: false, stage: "read" }` with `e.message` logged instead of
a generic 500.

---

## H6. Zero automated tests

**File:** `package.json` — scripts are `dev / build / start / lint / typecheck` only.

**Why it's a problem:** for a production-critical app, the auth, token, rate-limit, sanitizer and
webhook paths are verified only by hand.

**Minimum bar before deploy (write as `src/lib/__tests__/*.test.ts` + an npm `test` script using
`node --test` or vitest):**
1. `auth.makeToken/readToken` — valid, expired, tampered-signature, wrong-version tokens.
2. `auth.hashPassword/verifyPassword` — wrong password, empty stored hash, corrupt `salt:hash`.
3. `account.peekToken/consumeToken` — single-use, expiry, wrong kind.
4. `export.cell` — CSV formula-injection escaping (`=`, `+`, `-`, `@`, tab, CR).
5. `sanitizeArticleContent` — `<script>`, `javascript:` href, SVG/onerror, style expressions.
6. `requireStaff` — anonymous → 401, resident → 403, editor → allowed for `editor` gate and
   refused for `admin` gate.

---

# 💡 MEDIUM

## M1. Sign-up confirms account existence (enumeration) while sign-in pretends not to

**File:** `src/app/api/session/route.ts` lines 69–72 (409 EMAIL_TAKEN on signup) and 130–137
("No account has the handle @x" on signin).

**Why it's a problem:** the email path is a free account-existence oracle for anonymous callers,
enabling targeted credential-stuffing. (Handle disclosure is acceptable — handles are public on
reports; keep that behavior.)

**Fix (if the UX cost is acceptable):**
```ts
// signup: if the email exists, silently proceed as if the mail was sent
if (emailTaken) return NextResponse.json({ ok: true, emailEnabled: mailConfigured() });
```
If you keep the 409, document it as an accepted risk.

---

## M2. Password hashing: sync scrypt on the event loop, 40-byte key, default params

**File:** `src/lib/auth.ts` lines 44–54

**Current:**
```ts
export function hashPassword(password: string): string {
  const salt = randomBytes(12).toString("hex");
  const hash = scryptSync(password, salt, 40).toString("hex");
  return `${salt}:${hash}`;
}
```

**Why it's a problem:** `scryptSync` blocks Node's single thread per login/reset/signup (~50–100 ms
CPU each), a cheap way to stall request handling, and default `N=16384` is below OWASP's `N=2^17`
guidance for scrypt.

**Fix:**
```ts
import { randomBytes, scrypt, timingSafeEqual } from "node:crypto";

const SCRYPT = { N: 2 ** 17, r: 8, p: 1, maxmem: 128 * 1024 * 1024, keylen: 64 };

const scryptAsync = (pw: string, salt: string, keylen: number) =>
  new Promise<Buffer>((resolve, reject) =>
    scrypt(Buffer.from(pw), salt, keylen, SCRYPT, (e, k) => (e ? reject(e) : resolve(k))),
  );

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString("hex");
  const hash = await scryptAsync(password, salt, SCRYPT.keylen);
  return `${salt}:${hash.toString("hex")}`;
}

export async function verifyPassword(password: string, stored: string | null | undefined): Promise<boolean> {
  if (!stored || !stored.includes(":")) return false;
  const [salt, hash] = stored.split(":");
  const expected = Buffer.from(hash, "hex");
  const candidate = await scryptAsync(password, salt, expected.length);
  return candidate.length === expected.length && timingSafeEqual(candidate, expected);
}
```
**Note:** every call site must become `await` — search for `hashPassword(` / `verifyPassword(`
(`src/app/api/session/route.ts`, `src/app/api/account/password/route.ts`,
`src/app/api/account/reset/route.ts`, `src/lib/account.ts` if used). Long-term: switch to `argon2id`.

---

## M3. Photos stored in Postgres as `bytea`

**File:** `src/db/schema.ts` lines 310–315 (`postPhotos`) and 475–487 (`placePhotos`).

**Why it's a problem:** Sharp's re-encode (`src/lib/images.ts`) caps each JPEG at 1600px/q80 and
strips EXIF (good), but bytes in-row still bloat the database: every backup/WAL/replica carries all
photos and any `SELECT *` touching these tables buffers full bytea into Node memory. With growth
this becomes the scaling wall.

**Fix options (pick one, no code block applies — it is an infrastructure change):**
1. Move bytes to object storage (S3 / R2) and store only a key + width/height in the row; serve via
   signed URLs or a streaming route.
2. Minimum viable mitigation: guarantee no query ever does `select().from(postPhotos)` without
   projecting only `id`/`position`/`width`/`height`; keep `/api/photos/[id]` as the only byte path.
3. Test a real `pg_dump`/restore now with current photo volume — not during an incident.

---

## M4. Dead `LiveTicker` — imported into the client bundle, polls forever, and its data is never displayed

**Files:**
- `src/components/live-ticker.tsx` lines 16–44
- imported at `src/app/layout.tsx` line 4 and re-exported at `src/components/app-shell.tsx` line 134
- `<LiveTicker />` is **never rendered anywhere** (verified by searching all references)

**Why it's a problem:** `load()` fetches `/api/incidents?limit=14` every 45 s *if* mounted, yet the
JSX renders four hard-coded blocks of gas prices (`$7.08/gal` …) — `rows`, `counts` and `setAt` are
dead state. The feature is simultaneously useless *and* would be an O(open-tabs) DB poll.

**Fix (recommended — Option A):** delete `src/components/live-ticker.tsx` and both import/re-export
lines (`layout.tsx` imports `LiveTicker` but never renders it; `app-shell.tsx` re-exports it).

**Option B — render it with server-driven rows, no polling:**
```tsx
// in the server component that renders it
const res = await fetch(`https://${host}/api/incidents?limit=14&status=active`, {
  next: { revalidate: 45 },
});
```
If client polling is kept anywhere, pause when hidden:
```ts
useEffect(() => {
  if (document.visibilityState !== "visible") return;
  /* start interval + visibilitychange listener */
}, []);
```

---

## M5. `getViewer()` issues a fresh `users` query on every call, called repeatedly per request

**File:** `src/lib/viewer.ts` line 49 (`export async function getViewer(): Promise<Viewer>`)

**Why it's a problem:** root layout, page component and each RSC call `await getViewer()` → 3–4
identical row lookups (plus a session-token HMAC) per page view.

**Fix:**
```ts
import { cache } from "react";

export const getViewer = cache(async (): Promise<Viewer> => {
  // existing body unchanged
});
```
**Caveats:** do NOT cache `reissueSession` or the rate-limit helpers (they mutate); only the read
path. This `cache()` also makes `getSiteSettings`'s 5-second `globalThis` cache
(`src/lib/settings.ts`) largely redundant — consider removing the ad-hoc layer, but keep it if
settings are read outside the request scope.

---

## M6. `frame-ancestors` intentionally omitted — clickjacking on every form

**File:** `next.config.ts` lines 6–8 (comment says framing is left open on purpose for a preview
tool).

**Why it's a problem:** it leaves `/login`, `/you/settings` and `/admin` open to clickjacking.

**Fix:**
```ts
{
  key: "Content-Security-Policy",
  value: "frame-ancestors 'self' https://*.onrender.com https://*.vercel.app",
},
```
plus a per-route `X-Frame-Options: SAMEORIGIN` for `/admin/:path*` and `/you/:path*` if the preview
frame can be allowlisted by host.

---

## M7. DRY violations / stale root scripts

1. `src/app/api/incidents/[id]/route.ts` line 10 re-declares `UUID_RE` — import it from
   `src/lib/validate.ts` (`export const UUID_RE = ...` already exists there).
2. `src/app/api/cron/gas-update/route.ts` line 3 imports `sql` but never uses it — remove it, and
   add `@typescript-eslint/no-unused-vars: error` to `eslint.config.mjs` (lint currently misses
   unused imports).
3. `import_places.ts` (project root) is dead scaffolding: its tail is a no-op
   `import("drizzle-orm").then(...)` chain, and `catch (e) { // Skip duplicates }` swallows *all*
   errors so a failed import still prints `Successfully imported N places!`. **Delete it** or move
   it to `scripts/` with real error reporting and an `npm run import:places` script.

---

# 📝 LOW

## L1. 372 of 618 tracked files are junk
`New Text Document.txt` (empty), `d2cc9232-8405-4d25-84bb-c4bc1bc118b9.png` (100 KB screenshot),
`temp_eas_sim*/`, `temp_eas_simulation*/`, `temp_prebuild*/` (including a duplicated
`debug.keystore`). Triples clone size and buries real diffs.
```bash
git rm -r --cached temp_eas_sim temp_eas_simulation temp_eas_simulation_v2 temp_eas_simulation_v3 temp_eas_simulation_v4 temp_prebuild temp_prebuild_dir \
  "New Text Document.txt" d2cc9232-8405-4d25-84bb-c4bc1bc118b9.png
printf '\ntemp_*/\nNew Text Document.txt\n' >> .gitignore
```
(Verify the exact `temp_*` names with `git ls-files | grep '^temp_'` first.)

## L2. Nav active-state uses `startsWith`
**File:** `src/components/nav-links.tsx` lines 105 and 119 —
`pathname.startsWith("/life")` would also highlight Life for a future `/lifelines` route.
```ts
const segs = (pathname.split("/")[1] ?? "");
const active = l.href === "/" ? pathname === "/" : `/${segs}` === l.href;
```

## L3. Stale root docs
`NEEDS_APPROVAL.md` is 0 bytes; `AUDIT.md` / `PROGRESS.md` are out of date. Update or delete.

## L4. Geocode cache evicts by insertion order, not usage
**File:** `src/app/api/geocode/route.ts` line 21 — `cache.delete(cache.keys().next().value)` drops
the oldest inserted key even if it was just hit. Fix: re-`set` the key on read (Map preserves
insertion order → effectively LRU), or track `at` and evict the oldest `at`.

## L5. Map page polls 2 APIs every 60 s even when the tab is hidden
**File:** `src/app/map/page.tsx` lines 103–106. Add a `visibilitychange` guard as in M4.

---

# Edge Cases to Consider (per module)

## 1) Auth & session — `src/lib/auth.ts`, `src/lib/viewer.ts`

| # | Edge case | Risk | Patch |
|---|-----------|------|-------|
| 1 | `AUTH_SECRET` absent **and** `.data/` read-only (read-only container / serverless FS) → per-process random key fallback | Every instance silently issues tokens no other instance accepts; logins randomly "don't stick" and all sessions die on each cold start — looks like an outage, logs show nothing | Refuse to boot when neither is available: `if (!process.env.AUTH_SECRET && !writable) throw new Error("AUTH_SECRET required")` |
| 2 | System clock jumps forward past `exp` | All 120-day tokens mass-expire mid-session for every user | Tolerate 60 s skew (`exp < Date.now() - 60_000`), or issue absolute + refresh TTL pairs |
| 3 | A mutation path (`setRole`, `suspend`, `unsuspend`) forgets to bump `sessionVersion` | A suspended user keeps a working token | Integration test: `suspend → old token must 401` for each mutating admin action |
| 4 | The app is reachable on two hosts (`app.` + apex) and the cookie path is `/` | Session written on one host is invisible on the other; silent re-auth loops | Canonicalize one host; `curl -I` both and confirm `Set-Cookie` |
| 5 | Truncated/non-UTF8 base64url signature | `Buffer.from(sig)` length mismatch must never reach JSON parse | Keep the `sig.length !== expected.length` guard first (it exists — regression-test it) |

## 2) Cron routes — `gas-update`, `places-update`

| # | Edge case | Risk | Patch |
|---|-----------|------|-------|
| 1 | Two runs overlap (cron fires while the previous still executes) | Interleaved reads/writes → `23505` → 500 half-way through, partial data written | Make each row an atomic `ON CONFLICT DO UPDATE` (C2/H5), or take `pg_advisory_lock(771)` for the run |
| 2 | `CRON_SECRET` rotates | Old schedule sends the previous secret → 401 forever, unnoticed for weeks | Accept a comma-separated secret list (current + previous) and alert on repeated 401s |
| 3 | `places.json` missing/truncated on a read-only deploy image | `readFileSync` throws → generic 500 with no diagnostic detail | `existsSync` guard; log `e.message` and return `{ ok: false, stage: "read" }` |
| 4 | After making `gas_reports.user_id` nullable, legacy rows still hold the fake system UUID | Admin pages joining `users` show blanks | Migration: `UPDATE gas_reports SET user_id = NULL WHERE user_id = '00000000-0000-0000-0000-000000000000'` |
| 5 | Multi-MB `JSON.parse` inside the request path | Blocks the event loop for the whole sync parse | Stream-parse, or import the directory as a CLI step instead of a request handler |

## 3) Rate limiter — `src/lib/ratelimit.ts`

| # | Edge case | Risk | Patch |
|---|-----------|------|-------|
| 1 | Attacker sends 100 k distinct spoofed XFF values | `buckets` churns without bound between sweeps → RSS climbs until OOM | Hard `MAX_KEYS` cap + sweep on every call (H4 Fix 2) |
| 2 | Serverless cold start resets counters | 5 failures × 500 instances × restarts ≈ thousands of attempts/minute against `loginfail:*` | Shared store for auth routes (H4 Fix 3) |
| 3 | Clock moves backwards (NTP correction) | `now - last` goes negative → keys never pruned, users locked out permanently | Clamp negative deltas to 0 |
| 4 | Unbounded key strings (`loginfail:${ip}:${ident}` where ident is a 160-char email) | Memory growth by cycling long identifiers | Hash the identity part: `` `loginfail:${ip}:${sha256(ident).slice(0,16)}` `` |
| 5 | `tooMany()` wording vs `Retry-After` disagree at the 90 s boundary (91 s → "2 minutes" but header says 91) | Clients polling per header disagree with the copy | Derive the message from the same number put in `Retry-After` |

## 4) Uploads & media — `src/app/api/life/route.ts`, `src/lib/images.ts`, `src/app/api/photos/[id]/route.ts`

| # | Edge case | Risk | Patch |
|---|-----------|------|-------|
| 1 | `content-length` header lies (says 1 MB, streams 14 MB) | `MAX_REQUEST_BYTES` check passes while `formData()` buffers more than intended | Keep the per-file `size` check (exists) **and** abort mid-stream via a byte-counted `AbortSignal` |
| 2 | 4 photos at the decode ceiling (`limitInputPixels: 40_000_000`) | Sequential sharp decodes of 4 × 160 MP exceed function memory/time limits *after* rate-limit attempts are spent | Pre-check `width × height` from metadata before decoding; cap concurrent decodes |
| 3 | The same photo submitted twice | No dedupe: identical bytes stored twice (no hash column) | Store `sha256(bytes)` and reuse the existing row |
| 4 | Post hidden between photo upload and photo request | Feed query could ship bytes for a hidden post | Single-photo route already re-reads `posts.status` (good) — mirror that in any list query; add a test that hidden posts 404 |
| 5 | Empty `bytea` (corrupt row) | `new Uint8Array(row.data)` returns a 0-length 200 → browser fails to render the JPEG | `if (!row.data?.length) return notFound()` |

## 5) Billing & webhooks — `src/app/api/billing/webhook/route.ts`, `checkout/route.ts`, `src/lib/billing.ts`

| # | Edge case | Risk | Patch |
|---|-----------|------|-------|
| 1 | Event recorded in `stripe_events`, then the process crashes before `handleStripeEvent` finishes | Stripe retries get `duplicate: true`; subscription state permanently wrong | Record as `pending → applied` with a status column, and treat `pending` older than N minutes as retryable (or apply first, record after) |
| 2 | Two webhooks for the same subscription arrive concurrently | The second state transition (`cancelled → past_due`) may be the one dropped as duplicate | Reconcile from `stripe.subscriptions.retrieve` on every webhook instead of trusting event order |
| 3 | Valid signature with an old timestamp (replay) | Replay of a paid-success event if tolerance is loosened | Keep Stripe's default 3-minute tolerance; `stripe_events` stays the idempotency source of truth |
| 4 | Checkout created, tab closed, webhook never fires → `adFreeTier` set but `planStatus` null (or the reverse) | Entitlement ambiguity in `entitledTier` | Define exactly one authority in `src/lib/tiers.ts`; test every (tier, status) pair |
| 5 | `ALLOW_DEMO_PLANS` left on in production (H2 unpatched) | Irreversible revenue loss while open | Explicit flag **and** log every sandbox grant to `admin_audit` |

---

# Definition of done for this handoff

- [ ] C1: both cron routes use the `authorized()` helper; `CRON_SECRET` is set in the environment
- [ ] C2: `gas_reports.user_id` nullable + unique (station, fuel, parish, day) index; route upserts;
      fake-price data either removed or explicitly tagged non-production
- [ ] C3: `git rm --cached .env.vercel`; `.gitignore` updated; token rotated; history purged if public
- [ ] H1: `typescript.ignoreBuildErrors` removed; CI runs typecheck + lint before build
- [ ] H2: demo plan grant gated behind `ALLOW_DEMO_PLANS`
- [ ] H3: `Access-Control-Allow-Origin` allowlisted (no `*`)
- [ ] H4: `clientIp` trusted-hop logic + `MAX_KEYS` cap (+ shared store for auth routes)
- [ ] H5: places cron is a batched `ON CONFLICT` upsert with a guarded file read
- [ ] H6: `npm test` exists and covers the six listed areas
- [ ] M1–M7, L1–L5 triaged (fix or explicitly accept with a comment)
- [ ] After all changes: `npx tsc --noEmit` → exit 0 and `npm run lint` → exit 0

*Review limitations to carry forward: no live runtime testing was performed (no dev server, no DB,
no Stripe replay) — the C2 FK failure is proven by code + schema reading, not an observed 500.
~15 of ~60 API routes were read in full; the weakest coverage is `src/lib/billing.ts`
(`handleStripeEvent`) and `src/lib/ingest.ts` (SSRF/feed parsing). XFF trust semantics depend on
the deployment host and must be confirmed before applying H4.*
