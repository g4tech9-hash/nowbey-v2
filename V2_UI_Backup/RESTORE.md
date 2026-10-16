# V2 UI — ORIGINAL DESIGN RESTORE POINT

This directory is the **permanent rollback point** for the original NowBey design.
It was created on 2026-10-16, immediately before the 2026 "Tideglass" UI migration
(commits after `a14dd43` on branch `arena/9c329914-nowbey-v2`).

## Contents
| Path | What it holds |
|---|---|
| `src/` | The entire original web app (App Router pages, components, lib, db, styles) |
| `expo/` | The entire original Expo mobile app |
| `root/` | Build/style config: `package.json`, `package-lock.json`, `next.config.ts`, `postcss.config.mjs`, `tsconfig.json`, `eslint.config.mjs`, `capacitor.config.ts`, `drizzle.config.ts`, `neon.ts`, `next-env.d.ts`, `.env.example` |

## ROLLBACK COMMAND — "V2 UI"

If the user types the exact phrase **"V2 UI"**, the original design must be restored
immediately. Run:

```bash
cd /home/user/nowbey-v2

# 1. restore the original source trees
rm -rf src expo
cp -r V2_UI_Backup/src src
cp -r V2_UI_Backup/expo expo

# 2. restore original build/style config (keep .env.local — it is user-specific)
cp V2_UI_Backup/root/package.json .
cp V2_UI_Backup/root/package-lock.json .
cp V2_UI_Backup/root/next.config.ts .
cp V2_UI_Backup/root/postcss.config.mjs .
cp V2_UI_Backup/root/tsconfig.json .
cp V2_UI_Backup/root/eslint.config.mjs .
cp V2_UI_Backup/root/capacitor.config.ts .
cp V2_UI_Backup/root/drizzle.config.ts .
cp V2_UI_Backup/root/neon.ts .
cp V2_UI_Backup/root/next-env.d.ts .

# 3. reinstall to match the original lockfile, then verify
npm ci
npm run typecheck && npm run lint && npm run build
```

A git-only fallback also exists — the pre-migration tree is commit `a14dd43`
("UI 3-d — …") on `arena/9c329914-nowbey-v2`:

```bash
git checkout a14dd43 -- src expo package.json next.config.ts postcss.config.mjs tsconfig.json eslint.config.mjs
```

## Rules
- **Never edit, move or delete anything inside `V2_UI_Backup/`** except when
  performing the rollback itself.
- The rollback is destructive to the migrated design: after running it, the 2026
  UI is gone from the working tree (it remains in git history after `a14dd43`).
- The migration is designed to be reversible this way because it did not change
  the database schema, API routes, or `src/lib` data contracts.
