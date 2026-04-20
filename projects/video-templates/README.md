# video-templates

- **Type:** work
- **Code:** `/Users/dionisis/Projects/video-templates`
- **AWS Alias:** none
- **Description:** Motion Canvas-based system for creating animated video templates with Angular platform integration. Includes `converter.js` for S3/DynamoDB uploads and `project.ts` for rendering.
- **Status:** Active
- **Key date:** 2026-04-30, ship full template-cloning system

## Goal: Template cloning system
Build an end-to-end system that lets you create a new video template by cloning an existing one. Specifically:

1. Map the flow of producing a template from an existing video.
2. Capture guideline drift from Claude Code: when the code works but ignores project conventions or mishandles special cases, add hints so from now on it knows the right way. Hints teach conventions, they don't prevent crashes.
3. Analyze time cost of each step, find what eats the most time, target it for automation.

## Goal: Palette systematization

**High-level:** Συστηματοποίηση του τρόπου που ορίζουμε τις παλέττες στα templates και καλύτεροι τρόποι να επιλέγουμε παλέττα ανά template.

**Concrete target:** Για κάθε (template, palette) combination, να επιστρέφουμε το καλύτερο permutation χρωμάτων→slots, ή signal `no viable assignment` αν δεν υπάρχει καλό.

**Scope:** 30 templates. Χρώματα έρχονται δυναμικά από το brief κάθε φορά.

**Artifacts:** Όλα συγκεντρωμένα στο `color-roles/` στο video-templates repo (root folder):
- `color-roles/docs/color-role-analysis.md` — M3 role theory + template-42 worked example + section 8 για το πώς τροφοδοτεί το permutation scoring
- `color-roles/prompts/template-analysis-prompt.md` — active Gemini prompt για per-template M3 color role analysis (= v3)
- `color-roles/prompts/slot-role-mapping-prompt.md` — Claude prompt για το slot→role mapping step
- `color-roles/scorer/color-scorer-prototype.js` — N! permutation scorer με 3-axis scoring (text / adjacency / chroma)
- `color-roles/scripts/*.mjs` — pipeline runners (analyze → generate-mapping → bundle-final, + orchestrator run-pipeline)

### Phase A — LLM annotation pass (per template)

1. Τρέξιμο M3 prompt σε Gemini για κάθε template με screenshot.
2. Store JSON profiles σε: `color-roles/profiles/<templateId>_<ts>.json` (timestamped, never overwrite).
3. **Manual review:** έλεγχος κάθε profile πριν περάσει στο scorer. Το Gemini ήδη έκανε το κλασικό λάθος (`surface` σε saturated red) στο template-42.
4. Version tag στο schema (`"schemaVersion": 1`) για future changes.

Αυτοματοποιημένο validation pass είναι TODO για αργότερα — για τώρα human-in-the-loop.

**Status (2026-04-17):** Phase A **unblocked**. Prompt ωρίμασε σε v3 μετά από συστηματικό consistency testing στο template-126.

Prompt iteration:
- **v1** → baseline. Slot count ±3, secondary/tertiary 50% swap, occasional "surface" σε saturated colors.
- **v2** → role allow-list/deny-list, quantitative tie-breakers, surface chroma threshold. Fixed swap + "surface" bug. Introduced regressions: text role copied the text's color, orphan `on-X` without `X`.
- **v3 (ενεργό)** → rule "text role = role of slot beneath", `on-X requires X` enforcement + self-check. Closes v2 regressions. **12/12 text slots consistent, 8/8/8/8 slot count, 0 orphan-on-X violations across 4 runs.**

Artifacts:
- `color-roles/prompts/template-analysis-prompt.md` — active prompt (= v3)
- `color-roles/prompts/template-analysis-prompt-v{1,2,3}.md` — history
- `color-roles/profiles/*.json` — timestamped runs
- `color-roles/mappings/*.json` — Claude slot→role mapping outputs
- `color-roles/final/*.json` — merged profile+mapping bundles
- `color-roles/docs/template-126-consistency.html` — full v1/v2/v3 comparison
- `color-roles/docs/m3-color-roles-reference.html` — M3 role reference + video adaptation doctrine
- `color-roles/scripts/run-pipeline.mjs` — end-to-end orchestrator (`--all`, `--force`, `--skip-gemini`, `--skip-mapping`)

**Decision:** v3 locked as production prompt. No more prompt changes until scorer feedback provides a reason to iterate.

### Phase B — Smart color mapping

Το `__primary` / `__secondary` naming στα templates δεν συμβαδίζει με M3 και δεν είναι consistent μεταξύ templates.

**1. Naming inconsistency**
Decision for now: keep naming, structural-only. Το M3 role field κάνει το semantic bridge. Re-evaluation μόνο αν προκύψουν real bugs.

**2. Role-aware palette prefiltering**
Αντί για naive N! permutation σε όλους τους συνδυασμούς:
- `surface` slots → μόνο neutral palette colors (chroma < 0.15)
- `primary` / `tertiary` slots → μόνο chromatic colors

Μικρότερο permutation space + semantically correct rankings.

### Phase C — gb library integration

1. Port του scorer σε live runtime στο gb library.
2. Ingest brief palettes → run scorer per template → apply colors μέσω του υπάρχοντος apply-palette-color layer (paletteIndex per element). Όταν αλλάζει το permutation, τα χρώματα ρέουν αυτόματα στα σωστά elements.
3. Visual check σε όλα τα 30 templates: το output βγάζει νόημα;

### Phase D — Iteration

- Collect failure modes από visual review → tune rules + thresholds (`chroma(surface) < ?`, `hueDiff >= ?`).
- Ground truth θα χτιστεί με εμπειρία — όχι formal calibration dataset upfront.
- Expand M3 coverage αν χρειαστεί (π.χ. `secondary-container`, `outline`).

### Immediate next action (2026-04-17)

Prompt stability ✅. Επόμενο βήμα: **apply** στα templates.

1. **Scale Phase A**: τρέξιμο v3 prompt σε 5 templates (πέρα από το template-126). Screenshots ήδη να μπουν στο `color-roles/screenshots/`. Command: `node color-roles/scripts/run-pipeline.mjs --all` (ή `node color-roles/scripts/analyze-template-colors.mjs --all --runs 1` για μόνο Gemini).
2. **Manual review** των 5 JSON profiles — μόνο red flags, όχι nitpick.
3. **Τρέξε scorer** (`color-roles/scorer/color-scorer-prototype.js`) με 3-5 sample palettes σε κάθε profile.
4. **Manual check**: βγάζει νόημα το top permutation; Αν ναι → Phase B/C integration. Αν όχι → αναλογικά debug (scorer thresholds, prompt refinement, ή role rule gap).
5. **Connect to live runtime**: Phase C plan — port scorer στο gb library και feed brief palettes → runtime color assignment.

## Progress (as of 2026-04-17)

### Pipeline built
```
video → Gemini → raw analysis.md
      → /video-gap-analysis → gap report (D1-D10, Confirmed/Ambiguous/Missing)
      → [Q&A round-trip with Gemini for Missing]
      → /video-analysis-to-template → src/template-{N}/new-project-vertical.ts
      → npm run convert template-{N} vertical dev
```

### Skills shipped (`.claude/skills/`)
- **auto-template** — end-to-end orchestrator. Takes a video path, runs Gemini CLI (user's authenticated subscription) on `docs/video-analysis-prompt.md`, runs `video-gap-analysis`, handles Q&A round-trips (max 2), presents Decision Table (only human-in-the-loop), then runs `video-analysis-to-template` + convert. Outputs to `ai-designer/template-analysis/template-{N}/`. Auto-increments template numbers starting at 900 (to separate from human-created).
- **video-analysis-to-template** — parses gap report, builds full Motion Canvas template file section by section. Copies boilerplate verbatim from `template-131`. Stops if any D1-D10 dimension is unresolved Missing.
- **video-gap-analysis** — evaluates raw video LLM output across 10 must-have dimensions (scene structure, element inventory, positions, animation techniques, timing, transitions, palette, dependencies, persistence, first-product differentiation). Outputs Confirmed/Ambiguous/Missing table + English Q's to send back to video LLM.
- **template-describe** — describes an existing template (not inspected in detail yet).
- **hint** — manages `docs/implementation-hints.md`. ADD/MODIFY/REMOVE practical recipes with `[H-NN]` IDs, tags, code snippets, reference templates. This is the intended vehicle for capturing guideline drift.
- **rule** — normative rules (MUST/SHOULD), separate from hints.

### Gemini prompt
`docs/video-analysis-prompt.md` — 164-line structured prompt forcing the video LLM to describe scene structure, elements, entry/exit order, animation *techniques* (not just directions), visual groupings/dependencies, persistence, palette, typography.

### Recent commits of note
- `26726f2` — template-900 pipeline artifacts (first auto-template run)
- `e71c7f7` — auto-template skill (end-to-end orchestrator)
- `c935827` — hint skill + blur-slide animation + template-146 refinements
- `62db85f` — video-analysis-to-template + video-gap-analysis skills
- `89b9ef3` — template-describe skill
- `d0d23e9` — rules.md + /rule skill

### auto-template first run (template-900, 2026-04-17)

First end-to-end test of the auto-template skill against `test.mp4` (Manttitude skincare, 8 products, ~37s). Pipeline ran clean up to the Decision Table review step. Human-in-the-loop held exactly where intended.

**Timeline:**
1. Step 1–2 (auto): template number 900 + analysis folder created.
2. Step 3 (auto): Gemini CLI on `test.mp4` via `@abs-path` syntax with `--yolo -o text`. Output: 106-line structured analysis. Exit 0.
3. Step 4 (auto): first gap analysis → 4 Confirmed, 5 Ambiguous, 8 Missing (Q1–Q8 on bg slide direction, product image entrance uniformity, pill direction, exit model, width dependencies, container+text timing, first-product differentiation).
4. Step 5 (auto): Q&A round 1 back to Gemini with same video. All 8 questions answered decisively in a single pass.
5. Step 6 (auto): re-run gap analysis → 8 Confirmed, 2 Ambiguous (D3 positions + D5 timings, numeric assumptions), 0 Missing. **Coding-ready.**
6. Step 7 (human): Decision Table presented with D1–D10 + critical items highlighted (exit model = single-unit push-up, priceBox FIXED vs categoryPill DYNAMIC, productImg X+Y tumble). Awaiting user approval before final coding.

**Artifacts:** `ai-designer/template-analysis/template-900/`
- `raw-analysis.md` (106 → 141 lines after Q&A merge)
- `gap-analysis-round-0.md`, `gap-analysis-round-1.md`
- `qa-round-1-prompt.md`, `qa-round-1-answers.md`
- `gemini-stderr.log`

**Validated assumptions (will inform future runs):**
- Gemini CLI `@absolute-path.mp4` syntax works cleanly for video attachments (no Files API plumbing needed).
- Single Q&A round sufficed for a moderately detailed video. Max-2-rounds policy looks right.
- Gemini can re-attach the same video on follow-up without losing prior context for our purposes (answers were consistent with round 0).
- Ambiguous D3 (positions) and D5 (timings) are expected residuals. Coding with safe numeric assumptions is the correct default, not another Q&A round.

**Open to validate on next runs:**
- Does the assumption hold for busier videos with >8 scenes?
- How often does the Decision Table review actually catch drift vs. waste time? Worth instrumenting edit-count after a few runs.
- Is `test.mp4` representative enough to be the canonical test, or do we need a second reference video with oldPrice + intro-differentiation to exercise those branches?

## Open questions (non-specific, research will clarify)
- Where exactly does Claude Code drift off-guidelines during coding? No catalogued error-mode list yet — hint skill exists but the feedback loop that populates it hasn't been formalized.
- What eats the most time per template: Gemini analysis, gap Q&A round-trips, coding, convert/preview debugging? No instrumentation/timing log yet.
- Does the Approach F handlers pattern coexist cleanly with legacy flat-format templates, or is it a drift hotspot?
- Is `template-describe` reusable as part of the cloning flow, or is it for a different use case?

Next steps deliberately left open: research will make them specific.

## TODO

### Signal animation + property animation conflict
Review signal animations and handle the case where a signal animation and a regular property animation are both assigned as in/out on the same node and both target a common property. Currently the property animation's initial-value setter destroys the signal's reactive binding, so the signal animation silently fails (documented in H-03). Decision needed: either throw an explicit error when this conflict is detected, or find a way to compose them (if possible). Known workarounds exist (separate inner/outer nodes, combined signal utility) but no runtime guard prevents the silent failure.

### Text color strategies: document and decide
Catalog the three text color strategies that have been tried and decide the final approach:
1. **White/Black** (original): binary pick of #ffffff or #444444 via APCA contrast. Fails on dual backgrounds.
2. **Grayscale** (intermediate, `grayscale-solver.ts`): minimax sweep of 51 grayscale values. Better on dual backgrounds but can't use brand colors.
3. **Palette** (current, `text-color.service.ts`): picks the best palette color via minimax APCA. Falls back to grayscale solver for complex dual-background cases.

All three share the ahead-of-time problem: text color depends on rendered backgrounds, so it can't be decided before the template runs. Current workaround: reactive signals + first-fill freeze. Proposed long-term fix: build-time palette dependency map (run analysis mode during convert, pre-compute mappings, resolve at platform runtime with zero geometry).

Need to document: which strategy is the final one, how the grayscale fallback interacts with the palette strategy, and whether the build-time approach is worth pursuing now or later.

## Notes
- Full docs in repo under `docs/` (PROJECT_INDEX, API_REFERENCE, COMPONENT_CATALOG, NAVIGATION_INDEX, video-template-design-rules-v-1-1-4, rules.md).
- Build/dev: `npm run serve`, `npm run build`.
- Convert: `npm run convert [templateName] [vertical|horizontal|square] [dev]`.
