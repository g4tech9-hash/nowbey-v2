# Reconciliation Report — chat plans vs. repo reality

**Date:** 2026-10-19 · **Branch:** `arena/6ea130a4-nowbey-v2` · **HEAD:** `0015fa6`
**Scope:** session history (master refinement Phases 1–5, theme calibration, embedded DB), `TODO_HUMAN.md`, `V2_UI_Backup/`, drizzle/SQL migration inventory, package scripts, and cross-module bridges.

---

## 1. Git state

| Check | Result |
|---|---|
| Working tree | **Clean** — zero modified, staged, or untracked files |
| Unpushed commits | **None** — local HEAD == `origin/arena/6ea130a4-nowbey-v2` (`0015fa6`) |
| Stashes | None |
| Ignored artifacts (correct) | `node_modules/`, `.next/`, `.data/pglite/` (seeded embedded DB), `tsconfig.tsbuildinfo` |

**Session commits (all pushed):**

```
0015fa6 Allow embedded dev Postgres under next start via NOWBEY_EMBEDDED_DB=1
bf619b8 Darken Ocean Night one more step (deep-night landing)
ee0ab03 Darken Ocean Night one small step
fa06baf Ocean Night v2 — tonal architecture and element polish
67916eb Fix Island look overriding surfaces to near-black; lift ramp again
2e1e290 Lift dark-theme background further — page still tested too dark
2ca9998 Brighten dark theme one notch — lift the night ramp off true black
a8b8224 Add master refinement final report
37bfedc Master refinement: trust & data integrity, unified copy/tokens, page acceptance
```

## 2. Uncommitted work

**None.** Everything produced or discussed in this session is committed and pushed. There are no dangling edits to chunk.

One caveat of a different kind — **stale, not uncommitted:** `REFINEMENT_REPORT.md` (committed in `a8b8224`) stops at the master refinement. The seven later commits above (the entire theme-calibration arc including the Island-look bugfix, and the `NOWBEY_EMBEDDED_DB` flag) are absent from its changelog and verify instructions. The branch is ahead of its own report.

## 3. Missing implementations & discrepancies

### 3.1 Doc drift — `REFINEMENT_REPORT.md` (P0)
The changelog/verify sections predate: the five night-ramp commits, the `:root[data-look="island"]` near-black override fix (a real bugfix that masked every brightness lift), and the embedded-DB opt-in. Anyone reading the report as the source of truth will not know the dark theme was rebuilt ("Ocean Night v2") or how to run the preview with data.

### 3.2 Broken bridge — `CoverageBadge` orphaned, copy triplicated (P1)
- `src/components/coverage-badge.tsx` (the Phase 2 "coverage honesty badge") is **imported by nothing**.
- `/alerts` renders the same badge **inline, with a hardcoded string** (`src/app/alerts/page.tsx:94`).
- `src/lib/copy.ts` owns `COVERAGE_COPY.badge` — the glossary's single source — but **neither** implementation reads it.
- Net: feature is delivered (it shows on `/alerts`), but through a dead component and three copies of the string. Content-lint does not guard this string's consistency.

### 3.3 Half-integrated SSOT — category lists (P1)
`src/lib/categories.ts` opens with "ONE SOURCE OF TRUTH for categories… Do not duplicate this list elsewhere", but:

- Consumers of `@/lib/categories`: **only** `wire-forms.tsx` (for `CATEGORY_GROUPS`) plus the content-lint tests.
- `src/app/report/page.tsx`, `src/app/wire/page.tsx`, and `wire-forms.tsx` still import `CATEGORIES` from the legacy **`src/lib/geo.ts`**.
- The test `"categories: one list of 13, used everywhere"` only asserts the new list's internal shape — it does **not** cross-check `geo.ts`, so the two lists can drift silently.

### 3.4 Ghost feature — Expo / React Native mobile app (P2, decision needed)
- The entire original Expo app **is** in the repo, tracked (304 files), at **`V2_UI_Backup/expo/`** — but by design it is the 2026-10-16 pre-"Tideglass" **rollback snapshot** (`V2_UI_Backup/RESTORE.md`), not a living package.
- Nothing in this session's commits touched it. Any mobile work discussed more recently than 2026-10-16 **is not in this repository** — if it exists, it lives in another workspace/branch and is uncommitted here.
- Meanwhile the web side keeps the door open: `push_tokens.platform` (`expo | fcm`), admin device routing, and `/mobile` developer docs (`EXPO_PUBLIC_API_BASE=… npx expo start`) — but `/mobile` tells developers to "ask the NowBey team for the nowbey-expo folder" while the code sits unpublished in `V2_UI_Backup/expo/`.
- Decide: promote `nowbey-expo` out of the backup into a real package (or its own repo), or update `/mobile` copy to point at the path that actually exists.

### 3.5 Schema vs. reality (P2 — ops, not code)
- `src/db/schema.ts` (30+ tables) ↔ `drizzle/0000_init.sql` **aligned** — including session-relevant columns (`pin_approximated`, `accuracy_meters`). The embedded DB applies exactly this, so dev/preview and a fresh prod database are in lock-step. **No session-planned schema change is missing.**
- 23 loose SQL files (10 × `add-*.sql` at root, 13 under `src/db/`) are the documented idempotent one-time scripts for the **existing Neon production DB**; their tables/columns are already folded into `0000_init.sql` for fresh installs.
- `TODO_HUMAN.md` carries the matching manual checklist (34 steps: Facebook bridge-feed paste, run `add-live-streams.sql`/`add-banned-devices.sql`/`add-error-ai.sql`/`add-ai-usage.sql` on Neon, `GITHUB_TOKEN`/`GITHUB_REPO`/`GEMINI_API_KEY` env, broadcaster grants, …). These are unfinished **human** steps by design, not forgotten code.

### 3.6 Documented Phase 3–5 debt (unchanged since the report; P3)
Measured and still open: **55** `!important` declarations across CSS, **1010** arbitrary-value utilities (`text-[11.5px]` …), abyss-/tide-/conch- alias codemod not run, `--sev-5` token still defined, map bottom sheet not built, sitemap lacks incident URLs (needs DB/ISR), no Playwright/axe/Lighthouse CI (`lighthouserc.json` untouched), news categorisation still "Notice"-heavy without `GEMINI_API_KEY`, canned demo notes suppressed in UI but not deleted by data migration, 2 pre-existing lint warnings.

### 3.7 Minor gaps (P3)
- `NOWBEY_EMBEDDED_DB=1` exists only in `src/instrumentation.ts` and the commit message — not in `README`/`TODO_HUMAN.md`/`REFINEMENT_REPORT.md`.
- `public/scenes/` absent, `SCENE_PHOTOS_PRESENT = false` — intentional (documented in `src/lib/themes.ts`), but the Island look is therefore photo-less.
- `TODO_HUMAN.md` line-1 title claims "no guessing" and its section numbers are all "## 0." — cosmetic renumber debt.

## 4. Action plan

### 4.1 Git commands
There is **nothing to `git add` today** — the tree is clean and synced. The commands below are the exact chunks for the fixes above, ready when you want them executed:

```bash
# P0 — bring the report up to the branch it documents
git add REFINEMENT_REPORT.md
git commit -m "Update refinement report: theme calibration arc, island-look fix, embedded DB flag"

# P1 — CoverageBadge: wire copy.ts as the source, mount on /alerts, drop the inline duplicate
git add src/components/coverage-badge.tsx src/app/alerts/page.tsx src/lib/copy.ts tests/content-lint.test.mjs
git commit -m "Use COVERAGE_COPY everywhere; mount CoverageBadge on /alerts"

# P1 — category SSOT: point report/wire at src/lib/categories.ts, retire geo.CATEGORIES
git add src/lib/geo.ts src/app/report/page.tsx src/app/wire/page.tsx src/components/wire-forms.tsx tests/content-lint.test.mjs
git commit -m "Consolidate category list onto src/lib/categories.ts with a cross-check test"

# P3 — document the preview database flag
git add README.md TODO_HUMAN.md
git commit -m "Document NOWBEY_EMBEDDED_DB preview database flag"
```

### 4.2 Prioritized code checklist

| P | Task | Notes |
|---|---|---|
| P0 | Refresh `REFINEMENT_REPORT.md` changelog + verify section | 7 commits of missing history; include theme tokens table and `NOWBEY_EMBEDDED_DB=1` |
| P1 | `CoverageBadge` → render `COVERAGE_COPY.badge`; mount on `/alerts`; delete the inline span | one source of truth for the coverage string |
| P1 | Category consolidation: `geo.ts` re-exports from `categories.ts` (or codemod the 3 importers) + extend the content-lint test to diff both lists | prevents silent label/severity drift |
| P2 | Decide the mobile story: promote `V2_UI_Backup/expo` → `nowbey-expo/` (or separate repo) and fix `/mobile` copy | backend contract is already live |
| P2 | Owner-run `TODO_HUMAN.md` (Neon SQL + env vars + FB bridge feed) | prod-only; nothing to code |
| P3 | Phase 3 sweep: alias codemod, `!important`/arbitrary-value reduction, delete `--sev-5` | mechanical, ~40 pages |
| P3 | Sitemap incident URLs (DB/ISR), map bottom sheet, Playwright/axe CI, GEMINI recategoriser, canned-note data migration, 2 lint warnings | as per report risk list |

### 4.3 Verify after any of the above

```bash
npm test && npx tsc --noEmit && npm run lint && npm run build
npm run audit:contrast && BASE=http://localhost:3100 node scripts/mobile-audit.mjs
```

*(Current baseline: 152/152 tests, tsc clean, lint 0 errors / 2 known warnings, contrast 136/136 both themes, build green.)*
