# eshop-analyzer — Τελευταία πράγματα (2026-07-01)

**TL;DR:** Τα δύο πιο πρόσφατα πράγματα στο project ήταν (1) ένα crash fix που έσωσε ~50% των runs σε βαριά sites και (2) τα 26 brand characteristics + tier στο output. Ήταν κολλημένα σε λάθος branch· τα πέρασα στο `master` και έγιναν push στο GitHub. Το άσχετο `/validate` εργαλείο βγήκε από εδώ και πήγε στο DionAi.

---

## Τα 2 τελευταία ουσιαστικά commits (τώρα στο master + pushed)

### 1. `dbcc5d1` — Crash fix σε heavy stores
- **Πρόβλημα:** σε αργά/βαριά eshops, browser εντολές >2min πήγαιναν "στο παρασκήνιο" → εσωτερικό μήνυμα που ο headless handler δεν χειρίζεται → **crash στο ~50% των καταστημάτων**.
- **Fix (10 γραμμές στο `analyze-workflow.js`):** `BASH_DEFAULT_TIMEOUT_MS` / `BASH_MAX_TIMEOUT_MS` = 600000 (10min) → οι εντολές μένουν foreground, δεν κρασάρει.
- Verified σε CoffeeIsland + Cosmossport. Root cause = anthropics/claude-code#19195.
- ➡️ Σοβαρό production fix.

### 2. `31e2bc7` — 26-tag brand characteristics
- **Νέα πεδία στο ANALYSIS_SCHEMA** (`store-analysis.js`):
  - `tier`: `budget | mainstream | premium | luxury`
  - `characteristics`: μέχρι 26 tags, καθένα με `confidence` (Elegant, Playful, High-Tech, Minimalist, Handcrafted, Sophisticated, ...)
- Ο agent τα δίνει μέσω 4-axis scaffold (visual/tier/voice/energy) στο prompt.
- Docs: source-mapping + visual diagram + README + δείγμα Plaisio.
- ➡️ Κάνει το output πολύ πιο χρήσιμο downstream (brief/video platform: χρώματα, fonts, CTA).

## Τι είχε προηγηθεί (η polish φάση στο master)
- ColorThief hybrid color extraction + AI-as-selector (`edba809`, `c1dd53e`)
- Snapshot-driven logo detection + dismiss overlays/cookies (`e849b39`)
- Full-page screenshots + realistic user-agent (`695cb6a`)
- Fixed-recipe prompt, restrict agent tools (`2dfb20a`), speed optimization (`f3582c0`)
- Enforce ελληνικά (native script) στα text outputs (`3439610`)

## Housekeeping αυτής της συνεδρίας
- **Master:** fast-forward με τα 2 παραπάνω commits → **pushed στο origin** (σε sync).
- **Branch cleanup:** σβήστηκε το `feat/validate-workflow-harness` (είχε λάθος μπλεγμένα validate + real work). Το `feat/brand-characteristics-26tags` έχει 0 commits εκτός master → ασφαλές να σβηστεί.
- **`/validate` → DionAi:** το generic idea-validation workflow μεταφέρθηκε στο command center (`~/Projects/DionAi/.claude/workflows/validate.js` + `docs/validate-workflow/`, commit `35f72e0`, local-only ακόμα). Δεν ανήκε στο eshop-analyzer.

## Κατάσταση προϊόντος
Ώριμο & σταθερό. Pipeline: SQS → PM2 worker → Claude Agent SDK + agent-browser → brand JSON → DynamoDB/S3/EventBridge. ~115s, ~$0.33/store. 6 source files.

## Ανοιχτά
- DionAi commit `35f72e0` + αυτό το report είναι local-only (χωρίς push).
- Το `feat/brand-characteristics-26tags` branch μπορεί να σβηστεί όποτε θες.
