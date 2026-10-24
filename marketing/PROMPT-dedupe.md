Duplicates went out on the NowBey accounts because earlier runs reposted entries that were already live: Instagram and Facebook have no idempotency key, and the ledger that prevents this either did not exist yet or did not know about posts made before it. Fix it now, and make it impossible to repeat.

Work inside the kit folder (the one with `scripts/`, `out/`, `captions/`, `KIT-VERSION.txt`).

## Step 0 — Confirm you have the tools

```bash
node scripts/publish.mjs --help
```

The help must list `DUPLICATES`, `LEDGER` and `BRAND`. If `dupes` is missing, stop and tell me the kit is stale (check `KIT-VERSION.txt` against the download page) — do not write your own deletion script.

```bash
node scripts/token-extend.mjs
```

The token must be valid and carry `pages_manage_posts`; without it nothing can be deleted. If it is expired, stop and give me the replacement steps from `00-START-HERE.md` § "When the token expires".

## Step 1 — Look before touching anything

```bash
node scripts/publish.mjs dupes --dry-run
```

This reads the Instagram media list and the Facebook Page posts, groups them by caption fingerprint, and keeps the **oldest** of each group. Nothing is deleted on a dry run.

Save what it prints to `dupes-before.txt` and show me the summary line ("N items · M duplicate(s)").

Rules for deciding what is a duplicate:

- Same caption after normalising whitespace and punctuation, and published minutes apart → duplicate.
- Same caption but a **materially different** asset (different `media_type`, a reel vs a still) → **not** a duplicate. Leave it.
- Empty captions (stories) cannot be fingerprinted. The command lists them separately with timestamps — read them, and only remove ones you can prove repeat by time and content.
- **The oldest of every group is the original.** It stays. Never "clean up" by keeping the newest.

If the count looks wrong — zero duplicates when I say there are many, or a group that is clearly two different posts — stop and show me the raw list instead of guessing.

## Step 2 — Remove the Facebook duplicates

```bash
node scripts/publish.mjs dupes --delete
```

Facebook Page posts can be deleted through the API, so this does it: one `DELETE /{post-id}` per duplicate, oldest kept, each id printed as it goes. If a delete fails it prints the reason and continues — report those, do not retry in a loop.

Verify afterwards:

```bash
node scripts/publish.mjs dupes
```

must come back with `0 duplicate(s)`.

## Step 3 — Instagram, by hand, with me

The Instagram Graph API has **no delete endpoint** — media can only be removed in the app. Do not attempt `DELETE /{ig-media-id}`; it will fail and it is not worth the rate limit.

The command prints a numbered list of permalinks. Give them to me exactly as printed, one per line, with the timestamp, so I can open each on my phone: post → ⋯ → Delete. Ask me to confirm when I have done it, then re-run:

```bash
node scripts/publish.mjs dupes
```

Repeat until it reports zero. If a permalink 404s, the post is already gone — note it and move on.

## Step 4 — Teach the ledger what survived

For every post that remains live, record it so `plan` never repeats it:

```bash
node scripts/publish.mjs mark --day <n> --platform <ig|fb> --type <post|reel|story|carousel> \
  --asset <asset path from captions/plan.json> --id <live id> --label "<label from plan.json>"
```

Match ids to entries using the caption text in `captions/plan.json`. If a live post does not correspond to any calendar entry, do not invent one — leave it out and list it in your report as "live, off-calendar".

## Step 5 — Prove the guard works before posting again

```bash
node scripts/publish.mjs plan --day 1 --dry-run
```

Every already-live item must show `↳ already published … — skipped`. Then, still without publishing, ask me before running any `--yes`.

Note the extra guard in this build: even with an empty ledger, before each post the script now fetches the account and skips anything whose caption already exists on that platform. So the failure mode that produced these duplicates is closed twice over — ledger, then live caption match.

**Never use `--force` in this task.** `--force` ignores the ledger; on a dedupe job that is the one command that makes things worse.

## Guardrails

- Never print a token; never write one to a tracked file.
- Delete only what the tool marks as a duplicate, and only after step 1 has been shown to me.
- One `DELETE` per confirmed duplicate. No retry loops on 4xx, no bulk `DELETE` on a list you have not printed.
- Instagram allows 25 API-published posts per 24h; do not spend the budget on delete attempts.
- Do not re-post anything to "balance" a deletion. If removing a duplicate leaves a gap in the calendar, tell me — do not fill it.
- British spelling in anything you write.

## What "done" looks like

1. `node scripts/publish.mjs dupes` reports `0 duplicate(s)` on both platforms.
2. Every surviving post is in `.publish-state.json` with its real id.
3. A table for me: platform, caption's first line, original id kept, ids removed, and how each was removed (API or in-app).
4. A short note on anything left alone and why — especially empty-caption stories and off-calendar posts.
5. `plan --day 1 --dry-run` shows no item that is already live.
