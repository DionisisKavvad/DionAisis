# Shapes Not Updating Color on Palette Change

**Date:** 2026-05-04
**Status:** Investigation complete, fix pending
**Scope:** All templates using `__color[N]` system in platform

---

## Problem

Στην πλατφόρμα, όταν αλλάζεις palette, κάποια shapes δεν παίρνουν το νέο χρώμα. Το πρόβλημα εμφανίζεται σε templates που χρησιμοποιούν `__color[N]` placeholders.

---

## Root Cause: `setVariables` destroys function bodies

### Η αλυσίδα

1. **Platform:** `variables` computed signal returns `JSON.stringify(template)` (line 612, `create-video.service.ts`)
2. **Πρόβλημα:** `template.functionsAfterLayersInit` περιέχει objects με `body: function(args) { ... }` (actual function objects). `JSON.stringify` **αγνοεί functions**, οπότε τα body γίνονται `undefined`.
3. **MC component:** `this.player?.setVariables(JSON.parse(variablesForPlayer))` (line 190, `motion-canvas.component.ts`)
4. **MC Variables.updateSignals():** Αποθηκεύει τα broken variables σε `this.variables`
5. **playback.reload()** → `scene.reset()` → fires `onReset` → **`this.signals = {}`** (clears ALL signals)
6. **Scene rebuilds:** `useScene().variables.get('functionsAfterLayersInit', null)` creates NEW signal from `this.variables['functionsAfterLayersInit']`, which is the **broken** JSON-parsed version (functions without bodies)

### Ο κώδικας που χαλάει

**MC Variables.js** (node_modules/@motion-canvas/core/lib/scenes/Variables.js):

```javascript
// Line 10-12: Reset clears all signals
this.handleReset = () => {
    this.signals = {};
};
scene.onReset.subscribe(this.handleReset);

// Line 22-26: get() creates signal from this.variables if signal doesn't exist
get(name, initial) {
    this.signals[name] ?? (this.signals[name] = createSignal(this.variables[name] ?? initial));
    return () => this.signals[name]();
}

// Line 30-37: updateSignals overwrites this.variables
updateSignals(variables) {
    this.variables = variables;  // ← HERE: broken functions stored
    Object.keys(variables).map(variableName => {
        if (variableName in this.signals) {
            this.signals[variableName](variables[variableName]);
        }
    });
}
```

**Sequence:**
- `setVariables()` → `updateSignals()` → `this.variables` = broken JSON (functions without bodies)
- `reload()` → `reset()` → `this.signals = {}` (all signals cleared)
- Scene rebuilds → `get('functionsAfterLayersInit')` → signal doesn't exist → creates from `this.variables` → **broken functions**

### Γιατί στο αρχικό load δουλεύει

Στο αρχικό load, η compiled template JS (`project-YYYY-MM-DD.js`) exports τα variables με actual function objects μέσω `project.variables`. Το MC τα αποθηκεύει σε `this.variables` σωστά (line 120, Player.js):
```javascript
scene.variables.updateSignals(project.variables ?? {});
```

Εδώ τα `project.variables` είναι ο compiled JS code, όχι JSON-parsed. Οπότε τα function bodies υπάρχουν.

Μετά το πρώτο `setVariables(JSON.parse(...))`, τα `this.variables` αντικαθίστανται με τα broken.

---

## Secondary Issue: `__color[N]` σε custom properties

### Πρόβλημα

Η `replaceTemplateValuesWithPalette` (line 424, `template-utilities.service.ts`) σετάρει `_metadata.color` **μόνο** όταν `key === 'fill' || key === 'stroke'`:

```javascript
if (key === 'fill' || key === 'stroke') {
    if (!obj['_metadata']) obj['_metadata'] = {};
    obj['_metadata'].color = colorIndex;
}
```

Templates που χρησιμοποιούν `__color[N]` σε custom properties **δεν** παίρνουν `_metadata.color`. Αυτό σημαίνει ότι ο solver (`collectColorGroupShapes`) δεν τα βρίσκει.

### Affected properties ανά template

| Template | Property | Value |
|---|---|---|
| template-112 | `_metadata.appliedColor` | `'__color[1]'` through `'__color[4]'` (7 instances) |
| template-118 | `introTxtMatchingColor` | `'__color[2]'` |
| template-124 | `_metadata.primaryColor2` | `'__color[1]'` |
| template-48 | `primaryColor` | `'__color[1]'` |

**Σημείωση:** Template-112 workaround-αρει αυτό με function code στο line 1313:
```javascript
lines[iz][iy]._metadata = { color: backgroundRects.children()[iz].children()[0]._metadata.colorForChildren }
```
Δηλαδή σετάρει χειροκίνητα `_metadata.color` σε dynamically created shapes. Αλλά αυτό εξαρτάται από τη function execution, η οποία χαλάει λόγω του primary issue.

---

## Color Flow Pipeline (reference)

```
Platform:
  templateData.palette changes
    → variables computed signal recomputes
    → JSON.parse(JSON.stringify(selectedVideoTemplate().template))  [fresh clone]
    → replaceTemplateValuesWithPalette(template, flatPalette)
        → walks all properties recursively
        → '__color[N]' → hex value
        → sets _metadata.color ONLY for fill/stroke keys
    → template.palette = flatPalette
    → template.functionsAfterLayersInit = [...functions with body: function(){}...]
    → return JSON.stringify(template)  ← FUNCTIONS LOST HERE

MC Component:
  player.setVariables(JSON.parse(variablesForPlayer))  ← broken functionsAfterLayersInit
  player.playback.reload()
    → scene.reload() → cached = false → reloaded event
    → requestRecalculation()
    → prepare() → playback.recalculate()
    → scene.reset() → onReset → signals = {} (cleared)
    → new runner → scene function runs from scratch

Scene rebuild:
  initializeTemplateState()
    → useScene().variables.get('functionsAfterLayersInit')
    → creates signal from this.variables  ← BROKEN (no function bodies)
  ComponentService.createLayers()
    → createParentAndChildrenLayers()
    → resolves __color[N] if present (already resolved by platform, skipped)
    → copies _metadata to MC layer
  executeFunctionsInPasses()
    → Pass 5: calculateHierarchyColors
    → collectColorGroupShapes(layers) finds shapes with _metadata.color
    → solver applies colors
```

---

## Solver Flow (reference, works correctly in isolation)

**`hierarchy-color.service.ts`**, contrast-aware path:

1. `syncGeneration(generation)` → clears FILL_MAP if palette changed
2. Background group: `selectByAverageLc(paletteColors)` → immediate apply
3. Other groups: check FILL_MAP cache → if miss, `createDeferredEffect` at image rest time
4. Deferred effect: `sampleBackgroundColors` → `pickBestContrast` → apply
5. `applyLockedColors` for user-locked overrides
6. `emitColorAssignment` → dispatches `mc:colorAssignment` event to platform

**`collectColorGroupShapes`:** Walks all layers, finds nodes with `typeof n._metadata?.color === 'number'`. Only these shapes participate in solver color assignment.

---

## Templates using `__color[N]` (20 of 27 new-format templates)

Templates sorted by `__color` usage count:

| Template | `__color` count | Has custom properties | Has gradient functions |
|---|---|---|---|
| template-117 | 16 | no | no |
| template-42 | 15 | no | no |
| template-126 | 13 | no | no |
| template-60 | 11 | no | no |
| template-115 | 11 | no | no |
| template-124 | 10 | yes (`primaryColor2`) | no |
| template-95 | 9 | no | no |
| template-81 | 9 | no | no |
| template-112 | 8 | yes (`appliedColor` x7) | no |
| template-99 | 6 | no | no |
| template-48 | 6 | yes (`primaryColor`) | no |
| template-119 | 6 | no | no |
| template-118 | 5 | yes (`introTxtMatchingColor`) | no |
| template-74 | 4 | no | no |
| template-106 | 3 | no | no |
| template-131 | 0 | no | no |
| + others | 0-2 | no | varies |

---

## Templates with gradient functions (old format, `project-vertical.ts`)

These use `new Gradient({...})` with color values that may become stale:

| Template | Gradient usage |
|---|---|
| template-103 | 8 gradients |
| template-121 | `backgroundGradient` + `rectGradient` (read from `gradientColors` component) |
| template-122 | 1 gradient |
| template-130 | 1 gradient |
| template-136 | 1 gradient |

Template-121 is the most complex: `gradientColors` component has `fill: __secondary[0]` (old format, NOT `__color[N]`), and gradient functions read those fills. These are unrelated to the `__color[N]` issue but are broken for different reasons (old-format static resolution).

---

## Fix Options

### Option A: Exclude `functionsAfterLayersInit` from JSON serialization

**Where:** `create-video.service.ts`, `variables` computed signal (line 612)

Strip `functionsAfterLayersInit` from the JSON before stringify, so `setVariables` doesn't override them. The compiled template code already provides the correct function objects.

```typescript
const { functionsAfterLayersInit, ...variablesWithoutFunctions } = template;
return JSON.stringify(variablesWithoutFunctions);
```

**Pros:** Minimal change, fixes the root cause.
**Cons:** `functionsAfterLayersInit` won't be updatable from the platform side (unlikely need).

### Option B: Custom serializer for functions

**Where:** `create-video.service.ts`

Before `JSON.stringify`, convert function bodies to strings using `getFunctionBody()`.

**Pros:** Functions survive serialization.
**Cons:** More complex, needs to handle arrow functions, methods, etc. Also needs MC-side to handle string bodies (already does via `executeFunction`).

### Option C: Restore original variables after `setVariables`

**Where:** `motion-canvas.component.ts`

After `setVariables`, restore `functionsAfterLayersInit` from the original template.

**Pros:** Targeted fix.
**Cons:** Requires access to the original compiled template variables from the MC component.

### Recommendation

**Option A** is the simplest and safest. `functionsAfterLayersInit` doesn't need to change at runtime (it's part of the template structure, not user data). The only things that change per palette are: `palette`, `lockedColors`, `products`, `components` (with resolved colors), `colorAssignmentStrategy`, etc. Functions are structural, not data.

---

## Files Referenced

### video-templates repo
- `src/scenes/services/hierarchy-color.service.ts` (solver, 608 lines)
- `src/scenes/services/text-color-map.service.ts` (FILL_MAP, generation, 52 lines)
- `src/scenes/core/function-execution.ts` (pass orchestration, 298 lines)
- `src/scenes/core/template-initialization.ts` (reads scene variables, 75 lines)
- `src/scenes/gbLibrary-utils.tsx` (createParentAndChildrenLayers, __color resolver, line 282-380)
- `src/scenes/gbLibrary.tsx` (scene entry point, 92 lines)
- `src/scenes/services/component.service.ts` (layer creation, 77 lines)
- `node_modules/@motion-canvas/core/lib/scenes/Variables.js` (signal management, 38 lines)
- `node_modules/@motion-canvas/core/lib/scenes/GeneratorScene.js` (scene reset/recalculate)
- `node_modules/@motion-canvas/core/lib/app/Player.js` (setVariables, requestRecalculation)

### platform-client-v2 repo
- `src/app/create-video/create-video.service.ts` (variables signal, analyzeTemplateUpdate)
- `src/app/create-video/template-utilities.service.ts` (replaceTemplateValuesWithPalette, line 424)
- `src/app/create-video/canvas/motion-canvas/motion-canvas.component.ts` (setVariables + reload)

---

## Agent Team Review (2026-05-05)

**Agents:** Motion Canvas expert + Devil's advocate
**Verdict:** Primary root cause analysis is WRONG. Option A would break things.

### Why `JSON.stringify` is NOT the problem

Function bodies in `functionsAfterLayersInit` are already **strings** by the time they reach the platform. The converter (`converter.js`, lines 98-103) calls `extractFunctionBody()` to convert all `body` values to strings before uploading to DynamoDB. `JSON.stringify` on `{body: "some code string"}` works fine.

There are no actual function objects in the platform data flow. The only place real functions exist is in the TypeScript source, pre-conversion.

### Why Option A would BREAK things

`updateSignals()` does `this.variables = variables` (full replacement, not merge). If `functionsAfterLayersInit` is excluded from `setVariables`:

1. `this.variables` = `{ palette, components, products, ... }` (no functionsAfterLayersInit)
2. After `reset()`: `this.signals = {}`
3. Scene rebuild: `get('functionsAfterLayersInit', null)` reads `this.variables['functionsAfterLayersInit']` = **undefined**
4. Falls back to `null`. All functions lost.

### Additionally: compiled JS has no variables

The compiled project JS (`project-YYYY-MM-DD.js`) does NOT include `variables` in `makeProject()`. So `project.variables` is `undefined`, initial state is always empty `{}`. There's no "good initial state" being destroyed.

### Actual root cause: the "secondary issue" is the real bug

The problem is `replaceTemplateValuesWithPalette` (line 424, `template-utilities.service.ts`) only sets `_metadata.color` for `fill`/`stroke` keys. Templates with custom color properties are invisible to the solver:

1. Custom properties (`appliedColor`, `primaryColor`, `introTxtMatchingColor`) get their hex resolved correctly
2. But `_metadata.color` is never set on those elements
3. `collectColorGroupShapes` requires `typeof n._metadata?.color === 'number'` to find shapes
4. Solver can't see these shapes, never updates their colors on palette change
5. Hex values baked at layer creation stay stale

### Templates that work vs don't

- **Work:** Templates using `__color[N]` on `fill`/`stroke` directly (e.g. template-117, 16 usages). Solver sees them.
- **Don't work:** Templates with custom properties (template-112, 118, 124, 48). Solver can't find them.

### Verification step

Add `console.log(typeof template.functionsAfterLayersInit[0].body)` before `JSON.stringify` in the `variables` computed signal. If output is `"string"`, the JSON hypothesis is dead.

### Revised fix direction

Fix `replaceTemplateValuesWithPalette` to set `_metadata.color` for ANY property containing a `__color[N]` value, not just `fill`/`stroke`. This makes all colored shapes visible to the solver.
