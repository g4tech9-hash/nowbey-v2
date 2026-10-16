# Deep Ultra-Audit — NowBey V2

**Date:** 2026-10-16
**Branch:** `arena/9c329914-nowbey-v2` (HEAD `b34741d`)
**Scope:** every page, every API route, every client component that fetches, every internal link, rendered HTML of 10 live pages
**Method:** static analysis + HTTP sweep of the running dev server + DOM extraction from rendered HTML
**Nature of this document:** findings only. **No project file has been modified.**

---

## The short version

The report says the app is in far better shape than the framing suggests, and it is worth being precise about that rather than agreeable.

**What is actually broken — 3 dead links and 1 broken button:**

| # | Where | What is wrong |
|---|---|---|
| 1 | `src/app/admin/partners/page.tsx:21` | "+ Add Partner" → `/admin/partners/new` — **no such route** |
| 2 | `src/app/admin/partners/page.tsx:48` | "Manage" → `/admin/partners/${p.id}` — **no such route** |
| 3 | `src/app/mobile/page.tsx:34` | "Download" → `/downloads/nowbey-expo.zip` — **file does not exist** |
| 4 | `src/components/admin-errors.tsx` | `CrashDismissButton` **reports success even when the delete fails** |

And one structural gap behind them: `/admin/partners` has **no navigation entry anywhere**. It is reachable only by typing the URL, and since nothing in the codebase writes to `digest_partners`, the entire B2B revenue surface — the page, the tab, the data — can never gain a row through the product. That is the most consequential finding in the audit.

**What is not broken, despite appearances:**

- The 404s and 500s in the HTTP sweep are **by design or environmental**, not regressions. Every one has a traced cause.
- Accessibility of rendered HTML is **clean**: 0 unlabelled inputs, 0 nameless buttons, 0 images without alt, no heading-level jumps, `<main>` and a skip link on all 10 pages sampled.
- API wiring is **intact**: 33 client components that fetch, 0 broken calls.
- Async handling is **good**: 30/33 have a loading state, 32/33 handle errors.

---

## Step 1 — Root-cause audit

### 1.1 Dead links

75 distinct internal links were extracted from every `"…"`, `'…'` and template literal in the source, normalised (`[param]` and `${expr}` → `*`), and segmented against the route tables: **39 pages, 64 API routes**.

**11 apparent dead links → 8 were false positives → 3 real.**

The false positives, recorded so they are never re-flagged:

- `/`, `/.//evil.com`, `//evil.com`, `/<tab>/evil.com`, `/\evil.com`, `/((` — **open-redirect security fixtures** in `src/lib/redirect.ts` and `src/proxy.ts`. Correctly rejected, not dead.
- `/g,` — a substring inside a sentence in `src/lib/mail.ts`, not a path.
- `/incident` — a **theme scene key** in `src/lib/themes.ts`, not a route.

The three real dead links are the table above. Both partners links sit on a page that nothing links to, so **the practical impact of #1 and #2 is zero today** — but they are still dead ends for anyone who types the URL, which is exactly what happened here.

### 1.2 Broken API calls

**0 of 33.** Every `fetch()` target in every client component resolves to a route that exists.

> An earlier pass reported 38 broken calls. That was a bug in the audit script: it stripped the `src/app/api` prefix instead of `src/app`, so it compared paths against the page table and every call looked broken. The corrected table has 64 routes and 0 misses.

### 1.3 Mismanaged async states

Of 33 client components that fetch:

| | Count |
|---|---|
| Have a loading/pending state | **30 / 33** |
| Handle errors | **32 / 33** |
| Never announce the outcome to assistive tech | **26 / 33** |

The 26 are the real finding. The pattern is copy-pasted across the codebase: a `<p>` whose text is set after the fetch resolves, with no `role="status"`, no `role="alert"`, no `aria-live`. A sighted user sees "Still there"; a screen-reader user hears nothing at all — not the success, not the failure, and no way to tell them apart.

`src/components/incident-actions.tsx` is otherwise **well built** — busy state, `try/catch`, buttons disabled during flight, correct router refresh. It only lacks the live region.

### 1.4 The one component with no error handling

`src/components/admin-errors.tsx`:

```tsx
await fetch("/api/admin/errors", { method: "DELETE", ... });
setDone(true);
```

No `catch`. No `res.ok` check. `fetch()` resolves on a 4xx/5xx, so a 403 or a 500 sails straight past this code and the button still flips to **"dismissed"** while the crash group is still on the list. On a screen whose entire job is telling the truth about errors, it reports success when it did not succeed.

### 1.5 Unrendered components

**0.** Four were flagged and all four are false positives: `adminHref`, `addBreadcrumb`, `IncidentRail` and `NowBeyMap` are helpers and `dynamic()`-loaded components that a naive scan reads as never-used.

### 1.6 Missing legacy features

**None found stripped during the UI transition.** The V2_UI_Backup diff was checked; no feature was removed. The one genuine functional gap is the **missing `public/` directory**, which is already tracked in `TODO_HUMAN.md` §10 and is therefore known, not a new regression.

### 1.7 HTTP sweep

| Response | Routes | Cause |
|---|---|---|
| **200** | 13 | working |
| **307 → login** | `/you`, `/you/profile`, `/you/settings`, `/admin-access` | correct auth gates |
| **404 by design** | all `/admin/*` | `AdminLayout` calls `notFound()` with no editor session — correct |
| **404 by design** | `/life`, `/gas`, `/life/places` | `FEATURES` flags off; `NEXT_PUBLIC_LAUNCH_STAGE !== "expanded"` |
| **404 by design** | `/firebase-messaging-sw.js` | returns 404 *when push is unconfigured*; the page relies on it |
| **500 environmental** | `/`, `/u/[handle]`, `/wire` | `DATABASE_URL is not set` in this sandbox |

**None of these are regressions and none should be "fixed."**

---

## Step 2 — Competitive UX critique

Benchmarked against Stripe, Linear and Apple.

### 2.1 Core Web Vitals

**LCP — genuinely broken, on every non-admin page.**
`sceneForPath()` returns a scene key for every non-`/admin` path, and `scene-backdrop.tsx` renders `<Image fill sizes="100vw">` from it. **None of the five `scenes/*.jpg` files exist** — there is no `public/` directory at all. So the largest contentful paint element on every public page is a **404 image**. This is the single highest-impact finding after the partners gap.

**CLS — low risk.** No web-font `<link>` (`next/font` self-hosts), and both backdrop images are absolutely positioned. The two "img without width/height" flags from a naive scan were `next/image fill` elements inside sized parents — false positives.

**INP — good.** Handlers are small, state is local, and the two components that do real work (`incident-actions`, `admin-errors`) keep the UI responsive during flight.

### 2.2 Render blocking

1 stylesheet, 22 scripts — not all `async`/`defer`. Moderate, and the smaller of the performance concerns next to the LCP image.

### 2.3 Missing 2026 usability paradigms

| Paradigm | Status |
|---|---|
| **Command palette / ⌘K quick nav** | **Missing.** ~40 routes, no quick-jump anywhere. Linear and Stripe both ship this as a primary surface. Highest-value addition in the audit. |
| **Toast system** | **Missing.** Status is inline `<p>` text, so a success on one part of the page is invisible if you have scrolled past it. |
| **Skeleton loading** | **Missing outside the map.** Pages pop in fully formed. |
| Reduced-motion support | **Present** |
| Focus-visible styling | **Present** |
| Splash screen | **Present** |

### 2.4 WCAG AAA

Rendered HTML is close to AAA on the mechanical criteria — labels, names, alt text, heading order, landmarks, focus order, positive tabindex. **The gap is not the markup, it is the missing live regions** (1.3) and the broken LCP element. Two things, both already in the fix list.

---

## Step 3 — Corrected code

Nothing has been applied. Every fix is in a staging file or a chat block.

| File | Fixes |
|---|---|
| `Staging_Fix_Partners_Page.tsx` | BUG-01 — server page, admin-gated, no dead links |
| `Staging_Fix_PartnersAdmin.tsx` | BUG-01 — the client half: add / edit / payment / delete with loading + error states |
| `Staging_Fix_DigestRoute_Partners.ts` | BUG-01 — four `partner*` actions on the existing `/api/admin/digest` POST |
| `Staging_Fix_AuditTarget.ts` | BUG-01 — one line, adds `"partner"` to the `AuditTarget` union |
| `Staging_Fix_AdminNav.tsx` | BUG-01 — the `tabs` array in `src/app/admin/layout.tsx` with Partners added |
| `Staging_Fix_AriaLive.tsx` | BUG-04 — `incident-actions.tsx` with a live region, `role="alert"` on errors, `aria-busy` |
| `Staging_Fix_CrashDismissButton.tsx` | BUG-05 — `admin-errors.tsx` with `res.ok` and a real error path |

### Design note: why API routes and not Server Actions

The first draft of the Partners fix used React Server Actions. It was rewritten, because **this codebase uses Server Actions nowhere** — all 33 mutations go through `/api/*` route handlers with an `action` discriminator, gated by `requireStaff()`. Following that pattern keeps the diff reviewable and means the fix reads as part of the existing codebase rather than a new architecture introduced by an audit. This also honours the standing constraint that DB schema, API routes and `src/lib` data contracts are preserved: the GET contract on `/api/admin/digest` is untouched and no new route is created.

### Verification performed on the staging code

Every symbol the staging files import was confirmed to exist with the signature used:

- `audit(actor, action, targetType, targetId, targetLabel, detail?)` — `src/lib/audit.ts:7`
- `PARISHES` — `src/lib/geo.ts:67`, and `knownParish()` at `:259`
- `text(value, max)` and `EMAIL_RE` — `src/lib/validate.ts:27` and `:2`
- `digestPartners` columns `organisation`, `contactName`, `email`, `parish`, `categories`, `paymentStatus`, `planInterval`, `lastPaymentAt`, `createdAt`, `updatedAt` — `src/db/schema.ts:488-500`
- `PageHead({ eyebrow, title, blurb?, actions? })` — `src/components/app-shell.tsx:123`

`getViewer().isAdmin` and `revalidatePath` are used by existing admin pages and are confirmed present.

---

## What was deliberately **not** changed

- The email-verified requirement for `ADMIN_HANDLES`. `envAdminActive` is **not** weakened.
- The admin diagnostic stays read-only and stays at the un-gated `/admin-access` path.
- The `V2_UI_Backup/` restore point. Untouched.
- The 404s and 500s in §1.7. All correct behaviour.
- The theme system, `SCENES`, `ROUTES`, `PHOTO_CREDITS`. Not in scope.

---

## Outstanding — needs a decision from you, not a code change

| Item | Why it is blocked |
|---|---|
| **The 5 missing `scenes/*.jpg`** | Binary assets cannot be authored from source. The code is correct; the files are absent. **This is the LCP fix and it needs images.** |
| **`nowbey-expo.zip`** | Same — the Expo build artifact must be produced and placed in `public/downloads/`. |
| **`public/` directory itself** | Does not exist. Both of the above need it created. |
| **Production state** | Production is unreachable from this sandbox (egress is restricted to package registries and GitHub). Live admin state must be confirmed by you in Neon/Vercel. |

---

## Verdict

The audit does not support "elements are broken, pages lead nowhere, features are missing, states are failing to load" as a description of the codebase. The state is good and the async handling is better than average.

What the audit *does* show is narrow and specific: **an entire admin revenue surface that is invisible and unpopulated**, **one button that lies about its result**, **one download that 404s**, and **a broken LCP element on every public page**. Those four are real, they are all fixed or fixable in this staging set, and none of them is a regression from the UI transition.

The fixes are staged and nothing is applied.

---

## Approval

Reply with exactly:

> **APPROVED: Deploy fixes.**

…and the seven staging files will be applied, typechecked, linted, tested, committed and pushed to `arena/9c329914-nowbey-v2`.

Anything less — including "yes", "looks good", or "go ahead" — will **not** trigger an apply. If you want only part of the set, say which and that part alone will be applied.

**No commit has been made during this audit.**
