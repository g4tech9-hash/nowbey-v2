# AI log fixes: auto-collect → AI diagnosis → your approval → GitHub issue → implemented by a human/Arena

The loop in one line: **user devices send their own crash logs, Gemini diagnoses them,
you approve or dismiss each diagnosis in Admin, and only an approved diagnosis becomes
work** — a GitHub issue that you then hand to Arena (this agent) or a developer.

```text
Web (browser/boundary/server) ─┐
Expo app (JS errors, API fails) ├→ POST /api/errors → client_errors (grouped, with breadcrumbs)
                               ┘        │
              cron /api/cron/error-analysis + throttled post-report hook
                                        ▼
                        Gemini diagnosis → error_analyses (pending_review)
                                        ▼
                        Admin → Logs:  [Approve] [Dismiss] [Re-analyze]
                                        │ approve
                                        ▼
                        GitHub issue (evidence + suggested fix + checklist)
                                        ▼
              You: "Arena, implement issue #N" → branch → PR → deploy gate → live
```

The AI inside the app **never edits code, opens PRs, merges or deploys**. That last step
always needs a human instruction, exactly as requested ("implement solutions after asking").

## What gets collected

| Source | What | Where |
| --- | --- | --- |
| Website | Uncaught errors, unhandled promise rejections, React error boundaries (`window.onerror`, `unhandledrejection`, `error.tsx`, `global-error.tsx`) | `src/components/error-reporter.tsx`, existing |
| Server | Route/render/server-action errors via Next.js `onRequestError` | `src/instrumentation.ts`, existing |
| Expo app | React Native global JS handler, network failures and 5xx API responses | `expo/src/errorReporting.ts` + `expo/src/api.ts` |
| All | Breadcrumb trail: pages/screens visited, controls tapped (label only), failed API calls; platform, app version, anonymous per-visit session id | sanitized server-side in `src/lib/error-core.ts` |

Privacy rules (enforced on the server, not just promised): paths only (query strings and
fragments dropped — they can carry reset tokens), token/bearer values redacted, no form
values, no typed text, breadcrumbs capped at 20 small entries, message/stack/context
length-capped, reports rate-limited (40 / 10 min / IP) and always answered `204`.

## Setup (one time, ~10 minutes)

1. Run the migrations in your database (both are re-runnable):
   `add-client-errors.sql` (probably already done), then `add-error-ai.sql`.
2. In the server environment (Vercel → Settings → Environment Variables) set:
   - `GEMINI_API_KEY` — same free key the news briefs use (aistudio.google.com).
   - `GITHUB_TOKEN` — GitHub → Settings → Developer settings → Fine-grained tokens →
     only this repo, **Issues: Read and write**.
   - `GITHUB_REPO=g4tech9-hash/nowbey-v2`
3. Schedule `GET /api/cron/error-analysis` every 15–60 min with header
   `Authorization: Bearer $CRON_SECRET`, alongside `/api/cron/ai-enrich`.
   (Analysis also runs, throttled, right after new crash reports — the cron is the guarantee.)
4. Nothing to enable in the apps: the website ships it in the layout, and the Expo app
   ships it in `expo/app/_layout.tsx` (it takes effect with the next APK build).

Without the Gemini key, groups collect and wait honestly as "AI unavailable". Without the
GitHub token, approvals are saved as "Approved — waiting for GitHub setup" and no issue is
faked. Admin → Overview's setup checklist and Admin → Logs both show which state you are in.

## Running the cost kill (Gemini spend control)

Every Gemini call in the app (news briefs, moderation, digests, log diagnosis, the
report copilot) goes through `src/lib/ai.ts`, so one switch stops them all. Calls are
counted in `ai_usage_daily` (run `add-ai-usage.sql` once) and the Admin overview shows
"AI cost cap — N/500 calls today (~$X)".

**Emergency stop (about 2 minutes):**
1. Vercel → your project → Settings → Environment Variables → set `AI_ENABLED` to
   `false` (Production).
2. Redeploy (Deployments → ⋯ → Redeploy) — env changes only take effect on a new deploy.
3. Done: every AI feature silently uses its plain non-AI fallback. Nothing breaks;
   briefs/digests use templates, moderation queues for humans only, log groups wait.
   Turn it back on the same way (`AI_ENABLED=true`, redeploy).

**Daily cap (automatic, no action needed):** `AI_DAILY_CALL_LIMIT` (default 500 calls
per UTC day). When the cap is hit, AI pauses until tomorrow (UTC) — the site never
errors. Raise/lower it in Environment Variables + redeploy. Admin → Overview shows
today's count and estimated spend.

**Nuclear option:** delete `GEMINI_API_KEY` + redeploy. Same effect as the kill switch,
plus the Admin checklist reports AI as unconfigured.

**Local development:** put `AI_ENABLED=false` (or `AI_DAILY_CALL_LIMIT=5` to test the
cap) in `.env.local` and restart `npm run dev`.

Note the cap counts *calls*, and each call's token usage is ledgered with an estimated
Flash-price cost — a budget guardrail, not an invoice. Google's own quota/billing caps
in AI Studio / Google Cloud remain the hard backstop; set a budget alert there too.

## Daily use

1. Open **Admin → Logs** (tab badge = proposals waiting). Worst-first order.
2. Read the diagnosis: summary, likely cause, suggested fix, confidence, plus the raw
   evidence (stack + breadcrumbs) under "Show stack + breadcrumbs".
3. **Approve → create GitHub issue**, **Dismiss proposal**, **Re-analyze**, or
   **Dismiss group** (fixed/already understood; it returns if the bug recurs).
4. To get it implemented, tell Arena: **"Implement GitHub issue #N in nowbey-v2"**
   (or assign a developer). The issue contains the diagnosis, scrubbed evidence and a
   checklist: confirm with you first, smallest fix, tests, PR through the deploy gate.
5. After the fix merges, watch the group in Admin → Logs: it should stop gaining
   occurrences. If it climbs by 5+ more, it is automatically queued for re-analysis
   (unless already dismissed or already an issue).

## Files

- `src/lib/error-core.ts` — scrubbing, breadcrumb hygiene, digests, answer validation,
  re-analysis rule, GitHub issue rendering (pure; covered by `tests/error-ai.test.mjs`)
- `src/lib/errortracking.ts` — grouped storage in `client_errors`
- `src/lib/error-ai.ts` — Gemini diagnosis, auto-analysis pass, approval → GitHub issue
- `src/app/api/errors/route.ts` — collection endpoint (web + Expo)
- `src/app/api/cron/error-analysis/route.ts` — scheduled analysis
- `src/app/api/admin/errors/route.ts` — analyze / approve / dismiss gate (admin only, audited)
- `src/app/admin/logs/page.tsx` + `src/components/admin-logs.tsx` — review UI
- `expo/src/errorReporting.ts` — app-side collection
