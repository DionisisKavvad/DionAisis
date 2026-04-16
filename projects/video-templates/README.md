# video-templates

- **Code:** `/Users/dionisis/Projects/video-templates`
- **AWS Alias:** none
- **Description:** Motion Canvas-based system for creating animated video templates with Angular platform integration. Includes `converter.js` for S3/DynamoDB uploads and `project.ts` for rendering.
- **Status:** Active
- **Key date:** 2026-04-30, ship full template-cloning system

## Goal
Build an end-to-end system that lets you create a new video template by cloning an existing one. Specifically:

1. Map the flow of producing a template from an existing video.
2. Capture guideline drift from Claude Code: when the code works but ignores project conventions or mishandles special cases, add hints so from now on it knows the right way. Hints teach conventions, they don't prevent crashes.
3. Analyze time cost of each step, find what eats the most time, target it for automation.

## Progress (as of 2026-04-15)

### Pipeline built
```
video → Gemini → raw analysis.md
      → /video-gap-analysis → gap report (D1-D10, Confirmed/Ambiguous/Missing)
      → [Q&A round-trip with Gemini for Missing]
      → /video-analysis-to-template → src/template-{N}/new-project-vertical.ts
      → npm run convert template-{N} vertical dev
```

### Skills shipped (`.claude/skills/`)
- **video-analysis-to-template** — parses gap report, builds full Motion Canvas template file section by section. Copies boilerplate verbatim from `template-131`. Stops if any D1-D10 dimension is unresolved Missing.
- **video-gap-analysis** — evaluates raw video LLM output across 10 must-have dimensions (scene structure, element inventory, positions, animation techniques, timing, transitions, palette, dependencies, persistence, first-product differentiation). Outputs Confirmed/Ambiguous/Missing table + English Q's to send back to video LLM.
- **template-describe** — describes an existing template (not inspected in detail yet).
- **hint** — manages `docs/implementation-hints.md`. ADD/MODIFY/REMOVE practical recipes with `[H-NN]` IDs, tags, code snippets, reference templates. This is the intended vehicle for capturing guideline drift.
- **rule** — normative rules (MUST/SHOULD), separate from hints.

### Gemini prompt
`docs/video-analysis-prompt.md` — 164-line structured prompt forcing the video LLM to describe scene structure, elements, entry/exit order, animation *techniques* (not just directions), visual groupings/dependencies, persistence, palette, typography.

### Recent commits of note
- `c935827` — hint skill + blur-slide animation + template-146 refinements
- `62db85f` — video-analysis-to-template + video-gap-analysis skills
- `89b9ef3` — template-describe skill
- `d0d23e9` — rules.md + /rule skill

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
