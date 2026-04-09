---
name: project-context-restore
description: Restore full context on a project Dionisis is jumping back into. Surfaces last changes, work in progress, and concrete next steps so he can start coding in under 30 seconds.
---

# Project Context Restore

## When to use this skill
Trigger when Dionisis says anything like:
- "pick up where I left off on <project>"
- "what was I doing on <project>"
- "restore <project>"
- "catch me up on <project>"
- "/restore <project>"
- opens a session asking about a project after a gap

If the project name is ambiguous or missing, ask which one (list the options from `projects/` in DionAi). Otherwise go straight to the steps below. Do NOT ask permission first, just run it.

## What it produces
A single, concise brief with these sections:

1. **Last touched** — date of most recent commit, plus how many days ago
2. **Last commits** — last 5 commit subjects (one line each)
3. **In progress (uncommitted)** — what's dirty in the worktree right now, grouped by file
4. **Where you left off** — your best inference of what he was actively working on, based on uncommitted diff + last commit + any TODO/FIXME in recently changed files
5. **Next steps** — 3 concrete actions to resume work, ordered by what makes sense to do first

Keep the whole output under ~40 lines. Bullets only. No fluff.

## Steps

### Step 1: Find the project
- Read `projects/<name>/README.md` in DionAi to get the `Code:` path
- If no `Code:` line exists, ask Dionisis where the code lives, then update the README with that path before continuing
- `cd` to the code path for all subsequent commands

### Step 2: Gather git signals (run in parallel)
Run these in a single message with parallel Bash calls:

- `git log --oneline -10` — recent commits
- `git log -1 --format='%cr | %ci'` — when was the last commit
- `git status --short` — dirty files
- `git diff --stat` — size of uncommitted changes
- `git diff HEAD~3..HEAD --stat` — recent activity scope
- `git branch --show-current` — current branch

### Step 3: Read what's actually changing
- For the top 3 most-modified uncommitted files, read the diff with `git diff <file>` (or the full file if small and new)
- Grep those files for `TODO`, `FIXME`, `WIP`, `XXX` to catch self-notes
- If there's a session-summary file or scratch notes in the repo root, read those

### Step 4: Check DionAi for anything relevant
- Read `projects/<name>/README.md` for the latest status note
- Grep `decisions/log.md` for any entries mentioning this project
- Check `context/current-priorities.md` to see if this project is still in the active push

### Step 5: Synthesize and report
Output the brief in the format above. For "Next steps":
- Prefer concrete actions over vague ones. "Finish the `parseTrendBatch` function, it's half-written in `src/parser.ts:42`" beats "keep working on parser"
- If tests are failing or broken, that's usually step 1
- If there's a half-done refactor, finishing it is usually step 1
- If nothing obvious is in progress, suggest the most impactful next thing based on the README status and key date

### Step 6: Offer to update the README
After delivering the brief, ask in one line: "Want me to update `projects/<name>/README.md` with the current status?" If yes, update it with a short status note and today's date.

## Rules for the output
- Follow `.claude/rules/communication-style.md`: concise bullets, casual, no em-dashes, no hype
- Never guess. If you can't tell what he was doing, say so and ask
- If the worktree is clean AND the last commit is older than 7 days, lead with that fact, it matters
- If there's a merge conflict, lock file change, or unusual state (detached HEAD, stash exists), flag it up top
- Always run commands in parallel where possible to keep latency low
