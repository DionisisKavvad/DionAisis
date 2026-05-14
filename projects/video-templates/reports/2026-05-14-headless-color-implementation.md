# Headless Scene Clone: Implementation Report

**Date:** 2026-05-14
**Status:** Implemented, smoke-tested, working end-to-end
**Latency measured:** ~40ms round-trip (trigger → applied)

---

## Τι λύσαμε

Όταν ο χρήστης άλλαζε text properties (fontSize, fontFamily, fontWeight, lineHeight, letterSpacing) στο Angular UI, το text reflowing έκανε το cached χρώμα stale. Η υπάρχουσα `createEffect` στο text-color.service υπολόγιζε νέο χρώμα στο **current frame** του player, που σήμαινε:

- Αν ο χρήστης ήταν σε frame πριν το restTime (κατά τη διάρκεια intro animation), το sampling γινόταν σε λάθος background position
- Η platform έστελνε `fill` σε κάθε property update, που πατούσε πάνω στο auto-computed χρώμα
- Δεν υπήρχε guarantee ότι το χρώμα ήταν σωστό για τη rest position του text

## Η λύση

Headless scene clone: όταν αλλάζει text property, η platform τρέχει ένα **δεύτερο scene instance** (χωρίς render στο canvas), frame-by-frame μέχρι 120 frames. Τα deferred effects μέσα στο clone υπολογίζουν τα σωστά χρώματα στο restTime με τα νέα properties εφαρμοσμένα. Η platform διαβάζει τα results και κάνει `node.fill(color)` στο real player.

Validated από το agent team ότι τα module-level Scene/Thread/Playback stacks του MC είναι safe σε interleaving (balanced push/pop + top-only reads). Το **πραγματικό** πρόβλημα ήταν το shared `FILL_MAP`, που λύθηκε με state swap mechanism.

---

## Files modified / created

### video-templates (4 αρχεία)

#### 1. `src/scenes/services/text-color-map.service.ts` (MODIFIED)
Πρόσθεσε state swap mechanism:

```typescript
let FILL_MAP = new Map<string, string>();      // changed: const → let
let currentGeneration = '';
let _skipShapeAutoColor = false;
let _headlessInProgress = false;               // NEW

export interface FillMapState { fillMap, generation, skipShapeAutoColor }
export const swapFillMapState(newState): FillMapState  // NEW
export const createIsolatedState(): FillMapState       // NEW
export const setHeadlessInProgress(value)              // NEW
export const isHeadlessInProgress()                    // NEW
```

Όλες οι υπάρχουσες exports (`syncGeneration`, `captureFill`, `lookupFill`, `invalidateFill`, `getFillMap`, `clearFillMap`, κλπ) παραμένουν αμετάβλητες, απλά διαβάζουν/γράφουν στο τρέχον (post-swap) FILL_MAP reference.

#### 2. `src/scenes/services/headless-scene.service.ts` (NEW, ~120 lines)

Public API:
```typescript
export async function computeColorsAtFrame(opts: {
    description: FullSceneDescription;
    variables: Record<string, unknown>;
    targetFrame: number;
    fps: number;
    logger?: Logger;
    size?: Vector2;
}): Promise<{ colors: Map<string, string> }>
```

Internal flow:
1. Swap FILL_MAP state to isolated Map
2. Set `_headlessInProgress = true`
3. Create `PlaybackManager` + `PlaybackStatus`
4. Instantiate scene: `new description.klass({...})`
5. Inject variables via `updateSignals`
6. `scene.reset()` then loop `scene.next()` for `targetFrame` frames
7. Snapshot isolated FILL_MAP
8. Cleanup: remove clone's View2D from shared shadow DOM, dispose WebGL context
9. Restore real player's FILL_MAP state (try/finally guaranteed)

#### 3. `src/scenes/services/text-color.service.ts` (MODIFIED)
- Line ~870: Added `headlessColorMode` guard στην in-scene `createEffect` που παρακολουθεί text property signals. Όταν `true`, ο effect κάνει early return ώστε να μη γίνεται διπλό computation (μία λάθος σε current frame από εδώ, μία σωστή από headless).
- Line 849: Fixed pre-existing TS error (call με 4 args ενώ signature θέλει 5). Πρόσθεσα `true` ως 5th arg.
- Removed debug logs: `'111111'`, `'222222'`, `'!!!!!!!!!!!!!'`

#### 4. `src/project-for-angular.ts` (MODIFIED)
Attached `computeColorsAtFrame` στο default project export ώστε η platform να μπορεί να το καλέσει μέσω του dynamic import bundle:

```typescript
const project = makeProject({...});
(project as any).computeColorsAtFrame = computeColorsAtFrame;
export default project;
export { computeColorsAtFrame };
```

---

### platform-client-v2 (3 αρχεία)

#### 5. `src/app/create-video/headless-color.service.ts` (NEW Angular service, ~130 lines)

Stateless service (no CreateVideoService injection για αποφυγή circular DI). Δύο public methods:

```typescript
async recomputeAtRestTime(opts: {
    project: any;
    player: any;
    variables: Record<string, unknown>;
    targetFrame: number;
}): Promise<Map<string, string>>

applyComputedColors(player: any, colors: Map<string, string>): void
```

**Match logic** για το `applyComputedColors`: τα keys από `buildTextKey` έχουν format `${progenitorKey}::${textKey}`. Ο progenitorKey μπορεί να είναι:
- `product-N` (index-based fallback) → resolves σε `view.findAll(_type === 'Product')[N]`
- explicit context/id → walks parent chain ψάχνοντας ancestor με αυτό το context
- `'root'` → οποιοδήποτε node με τον textKey

#### 6. `src/app/create-video/canvas/motion-canvas/motion-canvas.component.ts` (MODIFIED)
- Στο `updateSource` (line ~538): `this.createVideoService.project = project` (expose project για το headless service)
- Στο initial player setup (line ~523): `initialVars.headlessColorMode = true` πριν το `player.setVariables`
- Στο template change effect (line ~191): `parsedVars.headlessColorMode = true` πριν το `player.setVariables`

#### 7. `src/app/create-video/create-video.service.ts` (MODIFIED)
- Imported και injected `HeadlessColorService`
- Added `public project: any` field
- Added constants:
  ```typescript
  HEADLESS_TARGET_FRAME = 120;
  TEXT_LAYOUT_PROPS = Set(['fontSize', 'fontFamily', 'fontWeight', 'lineHeight', 'letterSpacing']);
  ```
- Στο τέλος του `applyChanges` (line ~2116): καλεί `maybeTriggerHeadlessRecompute(changes)`
- New method `maybeTriggerHeadlessRecompute`: detects layout property changes, parses current variables, fires-and-forgets το recompute, εφαρμόζει τα colors όταν ολοκληρωθεί

---

## End-to-end flow

```
User: αλλάζει fontSize 80 → 140 στο price text
   ↓
Angular UI dispatcher → text-properties.service.createProductTextProperties()
   ↓
createVideoService.products signal update
   ↓
templateData computed → variables computed (serializes template με νέο fontSize)
   ↓
motion-canvas.component effect fires
   → setVariables με headlessColorMode: true
   → analyzeTemplateUpdate: ΟΧΙ structural change
   → DIRECT UPDATE branch
   ↓
applyChanges([{selector: 'price', properties: {fontSize: 140}, productIndex: 0}])
   → scene.getView().findAll(n => n.context === 'price')
   → node.fontSize(140)                       ← Phase 1: ορατό αμέσως (~6ms)
   → player.requestRender()
   ↓
maybeTriggerHeadlessRecompute() (async, fire-and-forget)
   ↓
HeadlessColorService.recomputeAtRestTime
   → project.computeColorsAtFrame(...) από το bundle
     → swapFillMapState(isolated)              ← isolation
     → setHeadlessInProgress(true)
     → new sceneClass({...})                   ← clone instance (~2ms)
     → scene.variables.updateSignals(variables)
     → scene.reset()
     → for i in 0..120:
         playback.frame = i+1
         await scene.next()                    ← deferred effects fire
     → 6 colors written στο isolated FILL_MAP
     → setHeadlessInProgress(false)
     → swapFillMapState(real)                  ← restore
     → return { colors }                       (~38ms total)
   ↓
applyComputedColors(player, colors)
   → for each key in colors:
       resolve progenitor (product-N → products[N], or context match)
       node.fill(color)                        ← Phase 2: ορατό (~30ms μετά Phase 1)
   ↓
player.requestRender()
```

## Measured latency (smoke test)

Πραγματικά measurements από το browser console:
```
[headless] scene instantiation:    1.7ms
[headless] reset + stepping:      37.8ms     ← 120 frames
[headless] stepped 120 frame(s), FILL_MAP size=6
[headless] computeColorsAtFrame:  39.9ms
[headless] applyComputedColors:    0.1ms
[headless] total round-trip:      40.3ms
```

40ms συνολικά. Στο όριο της αντίληψης (~50ms) αλλά κάτω από αυτό. Δεν αναμένεται visible delay για τυπικό χρήστη.

---

## Validation / διασφαλίσεις

### Module state isolation
- FILL_MAP swap σε try/finally εγγυάται restoration ακόμα και σε errors
- Validated agent team: Scene/Thread/Playback stacks safe σε interleaving γιατί `execute()` brackets ένα synchronous tick με balanced push/pop, και τα awaits γίνονται **έξω** από το `execute()` (stack είναι empty στο gap)

### Shadow DOM
- `View2D.shadowRoot` είναι `@lazy` static (shared). Cleanup function αφαιρεί το clone's root element μετά
- Η πλατφόρμα ήδη τρέχει multiple players (different templates) με success → shared shadow DOM δεν προκαλεί λάθος measurements

### WebGL
- `SharedWebGLContext` lazy initialization, δεν αρχικοποιείται χωρίς shaders. Στο clone path δεν χρησιμοποιούμε shaders → zero WebGL impact
- Explicit `dispose()` στο finally

### Double computation prevention
- Όταν headlessColorMode flag είναι true, η in-scene createEffect (που υπολόγιζε στο current frame) κάνει no-op
- Έτσι δεν τρέχει διπλό computation (μία λάθος + μία σωστή)

---

## Known limitations / future work

1. **Hardcoded restTime upper bound (120 frames)**: τρέχουμε πάντα 120 frames ακόμα κι αν το πραγματικό restTime είναι π.χ. 60. Overhead ~20ms extra. Βελτίωση: export `computeRestTime` logic ή προσθήκη στο template descriptor.

2. **Shadow DOM cleanup του TxtLeaf formatters**: η `TxtLeaf` constructor κάνει `View2D.shadowRoot.append(formatter)` (γραμμή 29). Αυτά είναι **independent** appends, το cleanup του view.element.remove() δεν τα πιάνει. Πιθανός memory leak. Δεν επηρεάζει measurements (formatters δεν έχουν visible content) αλλά worth tracking.

3. **PlaybackManager bypass**: το `scene.next()` δεν τρέχει `PlaybackManager.next()` logic (scene transitions, finished state). Αρκεί για single-scene templates (current setup με `gbLibrary.tsx`). Αν μπουν multi-scene templates, χρειάζεται adjustment.

4. **Console spam από clone**: το TextColorService logger μέσα στο clone παράγει τα ίδια logs με το real player (`🎨 TextColorService Performance`, color debug logs). Καθαρίζει αν gate-άρουμε τα Logger.debug calls με flag.

5. **fillOverride interaction**: το `fillOverride` flag στην platform εξακολουθεί να δουλεύει. Όταν user explicitly αλλάζει fill, το fill στέλνεται στο scene, και ο clone επίσης θα το σεβαστεί (γιατί διαβάζει τα ίδια variables).

---

## Commits needed

Όλα τα changes είναι uncommitted. Όταν είναι έτοιμα για commit:

**video-templates:**
- `feat(color): headless scene clone for ahead-of-time color computation`
- Files: text-color-map.service.ts, headless-scene.service.ts (new), text-color.service.ts, project-for-angular.ts
- Note: fix για το pre-existing 5-arg TS error στο line 849 περιλαμβάνεται

**platform-client-v2:**
- `feat(create-video): trigger headless color recompute on text layout changes`
- Files: headless-color.service.ts (new), motion-canvas.component.ts, create-video.service.ts

---

## Verification checklist για production deployment

- [ ] Test με palette change: πρέπει να δουλεύει κανονικά (existing flow αμετάβλητο)
- [ ] Test με fill color change explicit: user choice preserved (`fillOverride` mechanism)
- [ ] Test σε frame > restTime: idempotent, ίδιο αποτέλεσμα
- [ ] Test σε frame < restTime: σωστό χρώμα (το main bug fix)
- [ ] Test σε rapid consecutive fontSize changes: race conditions?
- [ ] Memory profiling: heap growth μετά από 100 fontSize changes
- [ ] Test με template που έχει size animations σε text nodes
- [ ] Test με multiple products (different productIndex values)
