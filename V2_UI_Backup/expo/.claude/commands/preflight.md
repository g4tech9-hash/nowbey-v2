---
description: Full EAS-readiness check (add "native" to also run the Gradle build)
---
Run `node scripts/preflight-full.js $ARGUMENTS` with a 10-minute timeout (in the background if it may take longer, checking back at most once a minute) and read only its printed summary. For each FAIL, read only the last 30 lines of the named log file, fix the cause in the real project, then rerun the script. Stop after 3 rounds. Do not paste logs back to me and do not run any other checks. Finish with at most 8 lines: PASS or FAIL per check, what you changed, and anything left for me. Never run eas commands.
