# Open Issues Analysis

**Date:** 2026-05-07 (updated 2026-05-14)
**Status:** Analysis complete. Issue #3 resolved via headless scene clone (2026-05-14). Issues #1, #2, #4 still open.

---

## 1. Shapes not picking up color changes (BLOCKING)

**Status:** Root cause found, fix pending
**Affected templates:** 112, 118

### What happens

When the user changes palette colors in the platform UI, some shapes don't update. They keep showing the color they had at initial load, ignoring the new palette entirely.

### Why it happens

The color system has two separate moments where colors get applied:

1. **Platform side** (`replaceTemplateValuesWithPalette()`): walks the template JSON, finds any value matching `__color[N]`, replaces it with the actual hex from the palette. This works correctly for all properties.

2. **MC side** (hierarchy solver's `collectColorGroupShapes()`): after the scene rebuilds, the solver needs to find which shapes are "color-aware" so it can re-assign them. It looks for `_metadata.color` being a number.

The gap: step 1 resolves the hex correctly everywhere, but only stamps `_metadata.color` on `fill`/`stroke` properties (line 424, `template-utilities.service.ts`). Templates that store `__color[N]` in custom properties get correct hex at load, but the solver never sees them again on palette change.

### Per-template breakdown

**Template 112 (ACTIVE BUG, 7 instances)**
- Property: `_metadata.appliedColor` on 7 Layout elements (lines 337, 357, 377, 397, 417, 437, 457)
- Visual: rotated grid background (`backgroundRects`, rotation: -45) with colored columns
- Mechanism: runtime code (line 1312) reads `backgroundRects.children()[iz].children()[0]._metadata.appliedColor` and assigns `fill =` on dynamically created Rect shapes
- Double problem: the `__color[N]` is inside `_metadata` (not fill/stroke), AND the shapes that actually display the color are created at runtime inside a Function handler. They don't exist in the static template tree. The solver can't see them even if metadata were stamped correctly, because they don't exist yet when the solver runs.

**Template 118 (ACTIVE BUG, 1 instance)**
- Property: `_metadata.introTxtMatchingColor` on Background (line 309), value `__color[2]`
- Visual: Line shape for intro text animation, color matches the background
- Mechanism: runtime code (line 1081) reads `backgroundlayer._metadata.introTxtMatchingColor`, then creates a Line with `fill: introTxtMatchingColor` inside a Function handler (line 1139)
- Same double problem as 112: color stored in `_metadata`, Line created dynamically in Function block, solver never sees either

### The real problem is narrower (and harder) than we thought

The original diagnosis was "metadata stamping misses custom properties." That's true but incomplete.

In both active cases (112, 118), fixing metadata stamping alone won't solve the problem. The colored shapes are **created dynamically at runtime** inside Function handlers. They don't exist in the static template tree that the solver walks. Even if every `__color[N]` property got `_metadata.color` stamped, the solver runs on the static tree and would still miss these shapes because they haven't been created yet.

This means the fix has two parts:
1. Stamp `_metadata.color` on any property containing `__color[N]` (necessary but not sufficient)
2. Handle the case where Function handlers create shapes that need to participate in the color system. Either:
   - The Function handler itself needs to stamp metadata on the shapes it creates
   - The solver needs to run after Function execution, not before
   - The parent element that holds the `__color[N]` in `_metadata` needs to propagate color changes to its dynamically-created children

### The assumptions underneath

**Assumption 1: all color assignments live in `fill` or `stroke`.** True for the first templates, broke when templates started using custom properties for colors.

**Assumption 2: all color-aware shapes exist in the static template tree.** True for simple templates, broke when templates started creating shapes dynamically in Function handlers. The solver walks the tree once, at a fixed point in time. Shapes born after that walk are invisible.

**Assumption 3 (implicit contract):** Platform stamps metadata, MC reads it. But this contract is not declared anywhere, it's encoded in two `if` checks in two different codebases. When one side's vocabulary grows, the other side silently goes blind.

### Earlier wrong hypothesis

Initial investigation (2026-05-04) blamed `JSON.stringify` destroying function bodies in `functionsAfterLayersInit`. Agent team review (2026-05-05) disproved this: the converter already serializes function bodies to strings via `extractFunctionBody()` before they reach the platform. The "primary" root cause was wrong; the "secondary" issue (metadata stamping) was the real one. And now we know even that secondary issue is only half the story.

### Fix direction

The metadata stamping fix is still needed and still small (one conditional in `replaceTemplateValuesWithPalette()`). But for templates 112 and 118, we also need a strategy for dynamically-created shapes.

Options for the dynamic shapes problem:
- **Function handlers stamp metadata themselves:** each Function that creates colored shapes also sets `_metadata.color` on them. Template-specific, manual.
- **Solver runs after Function execution:** changes the solver's timing. Broader impact, needs investigation.
- **Parent-to-child color propagation:** parent element with `_metadata.appliedColor` propagates to children. Automatic but needs a mechanism.

**The deeper question:** should the MC solver depend on platform-stamped metadata at all? Right now it's a fragile implicit contract. Alternatives: the solver could detect `__color[N]` patterns itself, or templates could declare their color slots explicitly in descriptors. The dynamic shapes problem makes this question more urgent, because descriptors could declare "this Function creates N colored shapes in group X" without needing the shapes to exist yet.

**Full investigation:** `reports/2026-05-04-shapes-color-investigation.md`

---

## 2. Shape masks/patterns breaking with dynamic color replacement (BLOCKING)

**Status:** Investigation needed per-template

### What happens

Shapes that function as masks, clip containers, or use composite blend modes break visually when the solver applies dynamic color replacement. The shape stops masking correctly, or the visual composition falls apart. This happens regardless of which strategy is active (auto-color or hierarchy solver).

### Why it happens

Not fully diagnosed per-template yet, but the mechanism is understood: the solver treats every shape with `_metadata.color` as a candidate for color reassignment. It doesn't distinguish between "this shape is visible and should match the palette" vs "this shape exists purely for a structural/masking purpose and its color value is load-bearing for composition."

When a mask shape's color gets reassigned, the mask itself changes, which changes what's visible through it.

### The assumption underneath

**The system assumes every colored shape is a "palette slot" that can be freely reassigned.** In reality, some shapes use color for structural purposes (masks, gradients, blend modes) where the specific color value is part of the visual logic, not a brand/palette choice.

There's no concept of "structural color" vs "palette color" in the system. The only signal is `_metadata.color` exists (palette) or doesn't (ignored). Binary. No middle ground for "has color, but don't touch it."

### Fix direction

Per-template investigation to identify which shapes need exclusion. Implementation options:
- Exclusion flag in template descriptors (`"excludeFromSolver": true`)
- Heuristic based on node type (clip paths, masks, blend modes auto-excluded)
- New metadata value: `_metadata.colorLocked = true`

**The deeper question:** this is the same contract problem as issue #1, from the opposite direction. Issue #1: solver can't see shapes it should see. Issue #2: solver touches shapes it shouldn't touch. Both stem from the metadata system being too crude (binary: has color number or doesn't). A richer descriptor model that distinguishes "palette-assignable" from "structural" from "locked" would prevent both classes of bug.

---

## 3. Text color: targeted invalidation on direct edits (RESOLVED 2026-05-14)

**Status:** RESOLVED via headless scene clone. Implementation report: `2026-05-14-headless-color-implementation.md`.

**Fix summary:** Όταν αλλάζει text layout property (fontSize, fontFamily, fontWeight, lineHeight, letterSpacing), η platform τρέχει ένα δεύτερο scene instance (no render) frame-by-frame μέχρι 120 frames με isolated FILL_MAP. Τα deferred effects υπολογίζουν τα σωστά χρώματα στο restTime με τα νέα properties, η platform διαβάζει το result και κάνει `node.fill(color)` στο real player. Latency ~40ms. Η in-scene `createEffect` πλέον no-op-άρει όταν `headlessColorMode = true` ώστε να μην υπάρχει διπλό/λάθος computation στο current frame.

**Original analysis below (kept for history):**

### What happens

User edits text properties (font size, content, position) through the Angular UI. The text might grow to overlap a different background region. But the cached text color in FILL_MAP was computed for the pre-edit size/position. The color stays stale until a full recalculate cycle runs (which only happens on palette change, not on text edits).

### Why it happens

The text color system has two phases:
1. **Recalculate phase** (before playback): deferred effect fires at text's rest position, samples background behind text, picks best contrast via minimax APCA, caches result in FILL_MAP.
2. **Playback phase**: texts read from FILL_MAP instantly. No re-computation.

Direct text edits in Angular are "property updates" that bypass the MC recalculate cycle entirely. The cache doesn't know something changed.

### The assumption underneath

**The system assumes text properties don't change after the initial recalculate pass.** This is true during playback (templates are read-only during animation), but false during editing. The editing flow and the playback flow share the same color cache, but only the playback flow populates it.

More specifically: **the system assumes the only trigger for color recomputation is a palette change.** Text edits that affect spatial overlap (and therefore which background the text sits on) are a second trigger that wasn't modeled.

### Fix direction

Platform-side: when any text property changes (except `fill`), trigger a color recalculate for that text.

It might get the color wrong (e.g. sampling the wrong frame, incomplete background state). That's fine. The next full scene recalculate will correct it. The point is immediate visual feedback during editing, not accuracy. Accuracy comes from the recalculate cycle, which always has the full picture.

**Effort:** Small-medium. The deferred effect mechanism already exists, just needs a new trigger path.

---

## 4. Platform-client-v2 uncommitted work (LOW urgency, HIGH risk)

**Status:** Code written, not committed

### What's at risk

The 2026-04-30 color feedback work:
- `create-video.service.ts`: 3 new signals (`colorAssignment`, `lockedColors`, `isEditingColors`), effect for lockedColors restore/reset
- `motion-canvas.component.ts`: `mc:colorAssignment` event listener
- `template-properties.component.ts`: editing card, custom palette support
- `Palette` interface: extended with `lockedColors` and `templateTag`
- Default strategy changed to `contrast-aware`

### The assumption underneath

**This isn't a bug, it's a process gap.** The assumption was "I'll commit when it's PR-ready." But uncommitted code on a local machine has exactly one backup: the filesystem. A disk failure, accidental reset, or even a stale branch cleanup would lose days of work.

### Action

Commit to a WIP branch. Doesn't need to be PR-ready.

---

## 5. Open research questions (LOW)

Non-blocking, informational:

- **Claude Code drift:** Where exactly does CC drift off-guidelines during template coding? No error-mode catalog yet.
- **Time tracking:** What eats most time per template (Gemini analysis, gap Q&A, coding, debugging)? No instrumentation.
- **Approach F compatibility:** Do handlers coexist cleanly with legacy flat-format templates?
- **template-describe reuse:** Is it part of the cloning flow or separate?

---

## Cross-cutting assumptions

Stepping back from individual issues, several assumptions recur across multiple problems:

### A. "Metadata is the single source of truth for color awareness"

Issues #1 and #2 are two sides of the same coin. The solver uses `_metadata.color` as a binary signal: exists = solver manages this shape, doesn't exist = invisible. This creates two failure modes:
- False negative (#1): shape should be managed but metadata wasn't stamped
- False positive (#2): shape is managed but shouldn't be (masks, structural elements)

The metadata system has no vocabulary for nuance. A shape is either "in" or "out." No concept of "color-aware but locked," "structural color," or "palette-assignable with constraints."

### B. "Platform and MC share an implicit color contract"

Platform stamps metadata. MC reads it. But the contract (which properties get stamped, what values mean what) is encoded in code, not declared. When one side evolves (new custom properties, new template patterns), the other side doesn't know unless someone manually updates both.

This is the class of bug where "it worked on the first 15 templates" silently breaks on template 16 because template 16 uses a pattern nobody anticipated.

### C. "One-time computation is enough"

Issue #3 (text color invalidation) involves caching a color decision and assuming it won't need to change. For playback, this is true. For editing, it's false. The system was designed for playback-first and editing was added later without revisiting the caching assumptions.

---

## Priority order

| # | Issue | Urgency | Effort | Dependencies |
|---|---|---|---|---|
| 1 | Shapes not picking up colors | Blocking | Small (metadata) + Medium (dynamic shapes) | None |
| 2 | Masks/patterns breaking | Blocking | Medium | Per-template |
| 4 | Uncommitted platform code | Low urgency, high risk | Tiny (just commit) | None |
| 3 | Text color invalidation | ✅ RESOLVED 2026-05-14 | Done (headless scene clone) | — |
| 5 | Research questions | Low | Varies | None |
