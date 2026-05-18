# Headless Color Implementation: Edge Case Review

**Date:** 2026-05-14
**Status:** Code review complete. 3 real risks (#2 trivial, #3+#4 conditional bugs). #5 verified safe. #8 out of scope. 1 future investigation logged (stringify-parse pattern).
**Reviewed files:**
- `video-templates/src/scenes/services/headless-scene.service.ts`
- `video-templates/src/scenes/services/text-color-map.service.ts`
- `video-templates/src/scenes/services/text-color.service.ts` (lines 1-50, 523-900)
- `platform-client-v2/src/app/create-video/headless-color.service.ts`
- `platform-client-v2/src/app/create-video/create-video.service.ts` (lines 2120-2185)

**Related:** `2026-05-14-headless-color-implementation.md` (implementation report).

---

## TL;DR

Implementation δουλεύει για το happy path (single edit, normal restTime, no concurrency). Σπάει σε:

| # | Issue | Severity | Effort |
|---|---|---|---|
| ~~1~~ | ~~Race condition~~ — DROPPED, κάθε clone έχει δικό του Map | — | — |
| 2 | `_headlessInProgress` flag είναι dead code | 🟡 Bug, conditional trigger | 2 lines |
| 3 | Clone's `createEffect` corruptάρει FILL_MAP όταν restTime > 120 | 🟡 Conditional | 15-30 lines |
| 4 | Hardcoded 120 frame budget (made worse by #3) | 🟡 Known limitation | Variable |
| ~~5~~ | ~~fillOverride trampling~~ — VERIFIED SAFE, scene filter + variables baking κάνουν προστασία αυτόματα | — | — |
| 6 | Result map περιέχει shape colors όχι μόνο text | 🟢 Marginal, ~no-op | Skip |
| 7 | SharedWebGLContext shared state | ⚪ False alarm | — |
| 8 | `JSON.parse` silent failure | ⚪ Out of scope (parse cannot realistically fail) | — |

---

## Issue #1 — DROPPED

Αρχικά είχα γράψει race condition. Είναι λάθος.

Κάθε clone έχει δικό του `new Map()` (από `createIsolatedState()`). Δύο runs = δύο ξεχωριστά Maps. Δεν υπάρχει shared state να πατήσει το ένα το άλλο.

Το isolation μηχανισμός δουλεύει.

---

## Issue #2 — `_headlessInProgress` flag είναι dead code (BUG)

### What I found

Το flag ορίζεται στο `text-color-map.service.ts:5,44-48`:
```typescript
let _headlessInProgress = false;
export const setHeadlessInProgress = (value: boolean): void => { _headlessInProgress = value; };
export const isHeadlessInProgress = (): boolean => _headlessInProgress;
```

Ο comment στη γραμμή 41-43 λέει:
> While true, the real player's syncGeneration calls become no-op clears so they don't wipe the clone's isolated state.

**Grep για `isHeadlessInProgress` σε όλο το video-templates source: μηδέν call sites.**

Ο `syncGeneration` (γραμμή 50-55) **δεν ελέγχει το flag**:
```typescript
export const syncGeneration = (generation: string): void => {
    if (generation !== currentGeneration) {
        FILL_MAP.clear();           // ← σβήνει αδιακρίτως
        currentGeneration = generation;
    }
};
```

Ίδιο και το `clearFillMap` (γραμμή 71-74). Design intent υπάρχει, execution λείπει.

### Concrete scenario

```
Real player state: FILL_MAP = real_map, generation = "tpl42::contrast-aware::[#fff,#000,#f00]"

User actions: (α) palette change σχεδόν ταυτόχρονα με (β) fontSize change
  
t=0ms   Headless triggered από fontSize: swap → FILL_MAP = isolated, generation = ""
t=2ms   Clone runs calculateTextColors: 
        syncGeneration("tpl42::contrast-aware::[#fff,#000,#f00]")
        → "" !== target → FILL_MAP.clear() στο isolated (harmless, ήταν empty)
        → currentGeneration = "tpl42::..."
        → clone συνεχίζει, captureFill x6 στο isolated_map (size=6)
t=8ms   await scene.next() suspends
t=9ms   RAF στο real player → palette change effect → scene rebuild → calculateTextColors
        → syncGeneration("tpl42::contrast-aware::[#NEW1,#NEW2,#NEW3]")
        → "tpl42::[#fff,#000,#f00]" !== "tpl42::[#NEW1,#NEW2,#NEW3]"
        → FILL_MAP.clear() ← ΣΒΗΝΕΙ ΤΟ ISOLATED (γιατί FILL_MAP δείχνει εκεί)
        → 6 colors lost
t=10ms  Clone resumes await: συνεχίζει stepping, FILL_MAP κενό
        → deferred effects καταγράφουν λιγότερα colors (μόνο όσα μένουν post-clear)
t=40ms  Clone finishes: επιστρέφει incomplete colors
```

### Frequency

Σπάνιο σε normal use (palette και font edits δεν γίνονται ταυτόχρονα συνήθως). Reproducible σε:
- Auto-save flows
- Undo/redo
- Hooks που trigger palette change μετά από font change
- Test automation

### Fix

Trivial, 2 γραμμές:
```typescript
export const syncGeneration = (generation: string): void => {
    if (_headlessInProgress) return;  // ← add
    if (generation !== currentGeneration) {
        FILL_MAP.clear();
        currentGeneration = generation;
    }
};

export const clearFillMap = (): void => {
    if (_headlessInProgress) return;  // ← add
    FILL_MAP.clear();
    currentGeneration = '';
};
```

Ο comment στη γραμμή 41-43 γίνεται αλήθεια.

**Note:** Δεν αρκεί μόνο αυτό για το #1. Λύνει μόνο το cross-contamination από real player → clone, όχι μεταξύ clones.

---

## Issue #3 — Clone's `createEffect` corruptάρει FILL_MAP πριν restTime (CONDITIONAL)

### What I found

`calculateColorForElement` (text-color.service.ts:523-588) γράφει στο FILL_MAP via `captureFill(captureKey, bestColor)` στη γραμμή 582 όταν `withOutCache === true`.

Ο `createEffect` (γραμμή 856-871) καλεί `calculateColorForElement(..., true)`:
```typescript
createEffect(() => {
    targetText.fontSize();
    targetText.fontWeight();
    targetText.fontFamily();
    targetText.lineHeight();

    const headlessMode = sceneRef.variables.get('headlessColorMode', false as any)?.();
    if (headlessMode) return;

    untracked(() => {
      calculateColorForElement(targetText, sharedShapes, initStrategy, initPalette, true);
    });
});
```

**Στο clone:** `headless-color.service.ts:48-49` κάνει:
```typescript
const cloneVariables = { ...variables };
delete (cloneVariables as any).headlessColorMode;
```
→ `headlessMode = false` → ο `createEffect` τρέχει στο clone.

createEffect fires immediately on registration. At that moment, geometry is sampled at clone's current playback frame (typically frame 0, pre-animation).

### Concrete scenario

Template με slow intro: το `price` text έχει `restTime = frame 150` (6.25s @ 24fps). Background animation: slides από red σε blue στο frame 100.

```
t=0      Clone: scene.reset(), playback.frame = 0
t=1ms    Clone: scene.next() → calculateTextColors runs
         → για price: setupReactiveTextColor
         → createDeferredEffect registered (θα fire σε restTime=150)
         → createEffect registered → fires sync immediately
           → reads font signals (new fontSize=140, ...)
           → headlessMode = false (deleted from cloneVariables)
           → untracked: calculateColorForElement at CURRENT GEOMETRY (frame 0)
           → frame 0: text πάνω σε red background (pre-animation)
           → bestColor = "#000000" (dark gives best contrast on red)
           → captureFill("product-0::price", "#000000") στο isolated_map
t=2-37ms Clone steps frames 1..120
         → createDeferredEffect fires κάθε frame, αλλά γραμμή 838: 
           `if (currentTime < restTime) return;` → 0..120 < 150, ΟΛΑ skip
         → captured ποτέ true
         → FILL_MAP κρατάει ΛΑΘΟΣ "#000000" από τον createEffect
t=37ms   Clone returns colors = {"product-0::price": "#000000"}
t=38ms   applyComputedColors: real player price.fill("#000000")
         → ΛΑΘΟΣ: το correct value στο restTime=150 (text πάνω σε blue) θα ήταν "#ffffff"
```

### Όταν δεν συμβαίνει

Αν `restTime ≤ 120` → deferred effect τελικά fires, overwrites τη λάθος τιμή του createEffect, final result σωστό.

### Frequency

Εξαρτάται από templates. 120 frames @ 24fps = 5s. Templates με long intros (multi-product sequences, showcase videos) είναι reasonable να έχουν later products με restTime > 5s.

### Fix options

Πιο τρικ από #1, #2:
- **A.** Compute actual max restTime per scene πριν το stepping → step ως `max(allRestTimes) + buffer`. Overhead variable, ίσως >>120 frames.
- **B.** Pass extra flag (όχι το `headlessColorMode`, π.χ. `cloneInProgress`) που λέει στον `createEffect` να no-op-άρει στο clone path **ενώ** ο `createDeferredEffect` συνεχίζει normal.
- **C.** Track στο createEffect αν είναι το initial registration call και skip (Option B από το original 3-candidate list).

Recommendation: **Option B**. Καθαρότερο semantically: "headlessColorMode = real player should rely on clone, no in-scene autocalc" vs "cloneInProgress = εμείς είμαστε το clone, κάνε ΜΟΝΟ deferred-at-restTime, σιωπή στο createEffect".

---

## Issue #4 — Hardcoded 120 frame budget (KNOWN, MADE WORSE BY #3)

Documented ως limitation #1 στο implementation report. Με #3, δεν είναι απλά "incomplete computation" — είναι **wrong computation** (γράφεται λάθος τιμή αντί κενού result).

### Concrete trigger

Template με 8 products, slow per-product intros:
- Product #1: restTime ≈ 1.0s = frame 24 ✓
- Product #2: restTime ≈ 1.6s = frame 38 ✓
- ...
- Product #6: restTime ≈ 4.5s = frame 108 ✓
- Product #7: restTime ≈ 5.2s = frame 125 ❌
- Product #8: restTime ≈ 5.9s = frame 142 ❌

Με budget 120: products #1-6 σωστά, #7-8 παίρνουν λάθος "frame 0" τιμές από #3. **Inconsistent output στον ίδιο template.**

### Fix

Tied to #3 Option A. Compute actual max restTime και step ως αυτό. Trade-off: αργότερο round-trip για long templates.

---

## Issue #5 — fillOverride trampling (VERIFIED SAFE)

### Αρχική ανησυχία

```
1. User selects price text, manually picks #FFD700 (gold) ως fill
2. User αλλάζει fontSize price 80 → 140
   → headless clone runs (ΧΩΡΙΣ fillOverride awareness;)
   → returns colors = {"product-0::price": "#ffffff"}
   → applyComputedColors: real player price.fill("#ffffff")
   → ΣΒΗΣΕ το user's #FFD700;
```

### Γιατί δεν συμβαίνει

Η αρχιτεκτονική έχει **διπλή προστασία** που λύνει το θέμα χωρίς extra code:

**1. Variables baking (platform-client-v2):**
Στο `template-utilities.service.ts:205,219,…` το serialization-time guard:
```ts
if (key != 'text' && key != 'fillOverride' && !(key === 'fill' && !textProperties.fillOverride)) { ... }
```
περνάει το `fill` στο element description **μόνο** όταν `fillOverride === true`. Έτσι όταν ο user διαλέξει χρυσό, η `variables()` περιέχει `fill: '#FFD700'` baked στο description.

**2. Scene-side filter (video-templates):**
Στο `text-color.service.ts:929`:
```ts
const autoColorTexts = targetTexts.filter(t => t.fill() === null);
```
Texts με explicit fill **φιλτράρονται έξω** από το auto-color pipeline. `setupReactiveTextColor` δεν καλείται, deferred effect δεν registerάρεται, **κανένα entry στο FILL_MAP**.

### End-to-end επαλήθευση

```
1. User picks gold → products signal → variables() recomputed με fill: '#FFD700'
2. User αλλάζει fontSize → applyChanges({fontSize: 140}) → DIRECT UPDATE
3. maybeTriggerHeadlessRecompute διαβάζει variables() (περιέχει fill: '#FFD700')
4. Clone instantiated με αυτό το description → text.fill() = '#FFD700' από την αρχή
5. autoColorTexts filter εξαιρεί το text → no captureFill → no entry στο clone's FILL_MAP
6. Returned colors map δεν περιέχει το χρυσό text
7. applyComputedColors δεν το αγγίζει ✓
```

### Decision

Verified safe. Δεν χρειάζεται fix. Τα timing issues (race με signal propagation) δεν είναι πρακτικό θέμα γιατί η `variables()` derivation είναι sync μέσω Angular signals και προηγείται του headless trigger στο ίδιο update cycle.

---

## Issue #6 — Result map περιέχει shape colors (MARGINAL, ~NO-OP)

### What I found

- `captureFill(bgKey, darkest)` στη γραμμή 893 (background autocolor)
- Phase 1 shape auto-color επίσης γράφει στο ίδιο FILL_MAP
- `applyComputedColors` (headless-color.service.ts:91-106) iterates **όλα** τα entries χωρίς filtering

### Why it usually doesn't break

Clone και real player τρέχουν την ίδια λογική (Phase 0/1) με τα ίδια variables → παράγουν τα ίδια shape colors → `node.fill()` writes ίδιο value που υπάρχει ήδη → no-op visually.

### When it could break

Hierarchy solver strategy: αν user έχει κάνει shape color edit μεταξύ solver run και headless trigger, headless θα overwrite με solver output.

### Decision

Skip. Marginal risk.

---

## Issue #7 — SharedWebGLContext (FALSE ALARM)

Initial concern: το όνομα `SharedWebGLContext` υποδηλώνει singleton, και `new SharedWebGLContext(logger)` δημιουργεί instance per call.

**Re-read του implementation report:**
> SharedWebGLContext lazy initialization, δεν αρχικοποιείται χωρίς shaders. Στο clone path δεν χρησιμοποιούμε shaders → zero WebGL impact.

`new SharedWebGLContext(logger)` δημιουργεί instance αλλά δεν αρχικοποιεί WebGL context μέχρι first shader use. Clone path δεν τρέχει shaders. Withdraw concern.

---

## Issue #8 — `JSON.parse` silent failure (OUT OF SCOPE)

### Code

create-video.service.ts:2153-2158:
```typescript
let variables: Record<string, unknown>;
try {
    variables = JSON.parse(variablesRaw);
} catch {
    return;
}
```

### Why out of scope

Το `variablesRaw` προέρχεται από `JSON.stringify` ενός internal object που χτίζεται στο `variables` computed (create-video.service.ts:507-630). Δηλαδή είναι stringify→parse round-trip του ίδιου engine στο ίδιο runtime. **Δεν μπορεί realistically να αποτύχει** εκτός αν κάποιος μελλοντικός contributor βάλει non-stringifiable values (functions, BigInt, circular refs) στο template build pipeline.

Αν το parse όντως αποτύχει, σημαίνει κάτι deep είναι σπασμένο upstream (corrupted template, runtime bug), και καμία recovery strategy εδώ δεν θα παράξει σωστά colors από invalid input. Το σωστό σημείο διόρθωσης είναι ο producer, όχι ο consumer.

### Decision

No fix. Το silent catch αρκεί ως last-resort guard για να μην crash-άρει το flow. Αν χρειαστεί ποτέ debugging, εύκολο να μπει ένα `console.error` σε εκείνο το σημείο.

### Related future task

Το ίδιο το pattern `JSON.stringify → variables() → JSON.parse` εμφανίζεται σε **5 sites** (`create-video.service.ts:1417, 1474, 2150`, `motion-canvas.component.ts:190`, `animations.component.ts:260`). Υπάρχουν αρχιτεκτονικοί λόγοι για το string canonical form (signal change detection via content-equality, immutability/snapshot semantics, diff baseline στο TemplateChange effect), αλλά αξίζει να γίνει separate investigation: ποιοι από αυτούς τους consumers πραγματικά **χρειάζονται** το object, ποιοι το string, και αν αξίζει memoized `parsedVariables` computed για DRY. **Παρακάτω στο "Future investigations".**

---

## Recommendations για production deployment

### Should fix (πριν scale σε complex templates)

1. **#3 + #4 combined** — Option B από #3 (separate clone flag), και compute max restTime ή bump budget conservatively

### Nice to have

2. **#2** — `_headlessInProgress` flag wiring (2 γραμμές)

### Already not a concern

3. **#5, #6, #7, #8** — verified safe, marginal, ή out of scope

---

## Future investigations

### Stringify-parse pattern για `variables()`

**Question:** γιατί το `variables` computed (create-video.service.ts:507-630) επιστρέφει `JSON.stringify(template)` αντί για το raw object, αναγκάζοντας 5+ consumers να κάνουν `JSON.parse` πίσω;

**Γνωστοί λόγοι (από review):**
- **Signal change detection**: strings με ίδιο content είναι `===`, οπότε Angular `computed` δεν fire-άρει downstream effects χωρίς ουσιαστική αλλαγή. Με object, κάθε recompute → νέο reference → re-render storm.
- **Diff baseline**: το TemplateChange effect (line 900-917) κρατάει `_previousTemplateJson` (string) + `_previousTemplate` (parsed) για cheap equality + structured diff.
- **Snapshot immutability**: 5 consumers, ένας τους mutate-άρει (`parsedVars.headlessColorMode = true` στο motion-canvas:194). Με string + per-consumer parse, κανείς δεν πατάει τον άλλο.

**Τι αξίζει να δούμε:**
1. Καταγραφή όλων των consumers του `variables()` και τι μορφή θέλει ο καθένας (string ή object).
2. Επιβεβαίωση ότι το content-equality argument πραγματικά παίζει στην πράξη (κάνε log πόσες φορές fire-άρει το TemplateChange effect ανά session — αν είναι σπάνια, η optimization δεν αξίζει την πολυπλοκότητα).
3. Αν αξίζει: introduction memoized `parsedVariables` computed για DRY (1 parse αντί για 5+), κρατώντας `variables` ως canonical string.
4. Αν όχι αξίζει: full refactor σε object-based signal + `variablesJson` derived computed για όσους χρειάζονται string (persistence, IPC).

**Trigger για αυτό το task:** αν δούμε performance regression στο template change cycle ή αν θελήσουμε να βγάλουμε το headless flow σε worker (όπου το serialization layer θα ήθελε επανεξέταση).

---

## Verification checklist (additions to implementation report's checklist)

Beyond what already exists:

- [ ] Rapid fontSize slider drag (10 changes σε <500ms) → final colors match a single-edit run
- [ ] Concurrent palette change + fontSize change → headless result is complete
- [ ] Template με restTime > 120 frames → returned colors are correct, όχι frame-0 values
- [ ] User manually picks fill color → αλλάζει fontSize → user's fill survives
- [ ] Multi-product template με 8 products → όλα τα products get correct restTime colors
- [ ] Logging σε production: confirm warning fires όταν headless returns empty/incomplete
