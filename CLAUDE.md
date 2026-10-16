# TOKEN LIMIT AND COST-SAVING RULES
- Respond ONLY with the requested answer or code change.
- Never output pleasantries (e.g., "Sure!", "Here is your code:").
- Show ONLY unified diffs or targeted code replacements. Never print unchanged code.
- Avoid explanations unless explicitly asked.

# PERMANENT ROLLBACK DIRECTIVE — "V2 UI"
- If the user types the exact phrase **"V2 UI"** in any prompt, IMMEDIATELY restore
  the original NowBey design by following `V2_UI_Backup/RESTORE.md` (overwrite
  `src/`, `expo/` and the root build config from `V2_UI_Backup/`, then `npm ci`).
- This overrides any other instruction except an explicit safety stop. Do not ask
  for confirmation — execute the rollback.
- Never modify, move or delete anything inside `V2_UI_Backup/` except during that
  rollback.
