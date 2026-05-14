# Motion Canvas Player Internals: The Two-Pass Recalculation

**Date:** 2026-05-14
**Source:** Motion Canvas 3.17.2 (`/Users/dionisis/Projects/motion-canvas-3.17.2/`)

---

## TL;DR

Ο MC Player έχει δύο ξεχωριστά passes:

1. **Recalculate pass** (αόρατο): τρέχει ολόκληρο το scene generator frame-by-frame χωρίς rendering, μόνο για να μετρήσει πόσα frames διαρκεί. Deferred effects τρέχουν κανονικά εδώ.
2. **Seek/playback pass** (ορατό): κάνει reset το scene, ξαναπαίζει μέχρι το target frame, και κάνει render.

Τα δύο passes τρέχουν σε σειρά, το ένα μετά το άλλο. Μεταξύ τους, ολόκληρο το scene κάνει reset (νέος generator, clean state). Module-level state (π.χ. FILL_MAP) επιβιώνει και στα δύο.

---

## Pass 1: Recalculate (frame counting)

### Πού ξεκινάει

`Player.prepare()` (Player.ts:374-387):

```
if (this.requestedRecalculation) {
    await this.playback.recalculate();
    this.duration.current = this.playback.frame;
    this.recalculated.dispatch();
}
```

Η `requestedRecalculation` γίνεται `true` σε:
- Constructor (πάντα, αρχικό boot)
- `setSpeed()` (αλλαγή playback speed)
- `configure()` (αλλαγή fps ή size)
- `scene.onReloaded` (scene reload, π.χ. μετά από `setVariables()` + hot reload)

### Τι κάνει

`PlaybackManager.recalculate()` (PlaybackManager.ts:164-187):

```typescript
async recalculate() {
    this.frame = 0;
    this.speed = 1;  // normalize speed for counting

    for (const scene of this.scenes.current) {
        await scene.recalculate(frame => {
            this.frame = frame;  // frame counter callback
        });
    }

    this.duration = this.frame;  // total frames calculated
}
```

Για κάθε scene, καλεί `GeneratorScene.recalculate()` (GeneratorScene.ts:201-236):

```typescript
async recalculate(setFrame) {
    cached.firstFrame = this.playback.frame;

    if (this.isCached()) {
        setFrame(cached.lastFrame);  // skip if already cached
        return;
    }

    await this.reset();  // ← RESET #1: fresh generator
    while (!this.canTransitionOut()) {
        setFrame(this.playback.frame + 1);  // count frame
        await this.next();                   // advance generator one step
    }

    cached.duration = cached.lastFrame - cached.firstFrame;
    this.cached = true;
}
```

### Τι σημαίνει "advance generator one step"

`GeneratorScene.next()` (GeneratorScene.ts:238-276) κάνει:
1. Καλεί `this.runner.next()` (προχωράει τον scene generator κατά ένα yield)
2. Καλεί `this.update()` (layout recalculation)
3. Χειρίζεται promises (async operations)

Αλλά: η `next()` δεν καλεί `render()`. Κανένα drawing. Μόνο logic + layout.

### Deferred effects τρέχουν εδώ

Μέσα στο `threads()` generator (threads.ts:105-110):

```typescript
for (const thread of newThreads) {
    if (!thread.canceled) {
        threads.push(thread);
        thread.runDeferred();  // ← deferred effects fire every frame
    }
}
```

`Thread.runDeferred()` (Thread.ts:158-162) κάνει dispatch στο `onDeferred` event, που τρέχει κάθε `DeferredEffectContext.update()` (αν τα dependencies άλλαξαν).

**Αυτό σημαίνει:** κάθε `createDeferredEffect()` τρέχει κανονικά κατά το recalculate pass. Ότι υπολογίζεται εκεί (π.χ. text colors στο FILL_MAP) γίνεται κατά το invisible pass.

### Τέλος recalculate

Μετά το loop, η scene κάνει cache τα αποτελέσματα: `firstFrame`, `lastFrame`, `duration`, `transitionDuration`. Αυτά χρησιμοποιούνται για navigation (seek, findBestScene).

---

## Pass 2: Seek/Playback (rendering)

### Πού ξεκινάει

Αμέσως μετά το recalculate, η `Player.run()` (Player.ts:423-496) εκτελείται. Αν υπάρχει pending seek (πάντα μετά από recalculate, Player.ts:375-377):

```typescript
if (state.seek >= 0) {
    await this.playback.seek(clampedFrame);
}
```

### Τι κάνει το seek

`PlaybackManager.seek(frame)` (PlaybackManager.ts:83-108):

```typescript
async seek(frame) {
    // Αν πρέπει να πάμε πίσω, ή αλλάξουμε scene:
    if (frame <= this.frame || ...) {
        const scene = this.findBestScene(frame);
        this.currentScene = scene;
        this.frame = scene.firstFrame;
        await this.currentScene.reset();  // ← RESET #2: fresh generator
    }

    // Παίξε frame-by-frame μέχρι το target
    while (this.frame < frame && !this.finished) {
        this.finished = await this.next();  // advance + deferred effects
    }
}
```

**Key point:** `reset()` δημιουργεί νέο generator (GeneratorScene.ts:278-292):

```typescript
async reset() {
    this.counters = {};
    this.runner = threads(
        () => this.runnerFactory(this.getView()),  // fresh generator!
        thread => { this.thread.current = thread; }
    );
    this.state = SceneState.AfterTransitionIn;
    await this.next();  // first step
}
```

### Seek = replay from scratch

Για να φτάσει στο frame X, ο player:
1. Κάνει reset (νέος generator)
2. Τρέχει `next()` X φορές (κάθε yield = 1 frame)
3. Κάθε frame: generator logic + layout + deferred effects
4. Στο τέλος: `render.dispatch()` (Player.ts:492) σχεδιάζει το τελικό frame

**Δεν κάνει skip.** Δεν υπάρχει random access. Κάθε seek είναι sequential replay.

### Playback (after seek)

Μετά το seek, αν δεν είναι paused, κάθε `requestAnimationFrame` τρέχει `Player.run()`:

```typescript
// Simply move forward one frame
else if (this.status.frame < this.endFrame) {
    await this.playback.progress();  // = next() + frame++
}

// Draw the project
await this.render.dispatch();
this.frame.current = this.playback.frame;
```

---

## Η πλήρης σειρά events

```
setVariables() / reload / speed change
    ↓
requestedRecalculation = true
    ↓
Player.prepare()
    ↓
PlaybackManager.recalculate()
    ├── scene.reset()          ← RESET #1, new generator
    ├── loop: next() per frame ← deferred effects fire each frame
    │   (no rendering, just counting)
    └── result: duration = N frames
    ↓
Player.run()
    ↓
PlaybackManager.seek(targetFrame)
    ├── scene.reset()          ← RESET #2, new generator
    ├── loop: next() per frame ← deferred effects fire again
    │   (replaying to target frame)
    └── stops at targetFrame
    ↓
render.dispatch()              ← actual drawing happens here
```

---

## Τι επιβιώνει μεταξύ των δύο passes

| State | Επιβιώνει? | Γιατί |
|---|---|---|
| Module-level variables (FILL_MAP, globals) | Ναι | JS modules, δεν γίνονται reset |
| Generator local variables | Όχι | Νέος generator σε κάθε reset |
| Scene node tree (layouts, shapes) | Depends | `getView()` ξαναδημιουργεί, αλλά κάποια nodes μπορεί να persist |
| Signal values (scene variables) | Ναι | Variables object δεν κάνει reset |
| DeferredEffect subscriptions | Ξαναδημιουργούνται | Κάθε `createDeferredEffect` τρέχει στον νέο generator |
| Thread state | Όχι | Νέο thread tree σε κάθε reset |

---

## Implications για το color system

### FILL_MAP persistence

To FILL_MAP (module-level Map) επιβιώνει και στα δύο passes. Αυτό σημαίνει:
- Pass 1 (recalculate): deferred effects γεμίζουν το FILL_MAP με text colors
- Μεταξύ pass 1 & 2: `syncGeneration()` κάνει `FILL_MAP.clear()` αν generation string άλλαξε
- Pass 2 (seek): deferred effects ξαναγεμίζουν το FILL_MAP

Αν τα variables δεν άλλαξαν μεταξύ passes (ίδιο palette, ίδιο strategy), ο `syncGeneration` ΔΕΝ κάνει clear. Τα colors από Pass 1 μένουν, και Pass 2 μπορεί να τα χρησιμοποιήσει αμέσως.

### Deferred effects τρέχουν δύο φορές

Κάθε `createDeferredEffect` μέσα στο scene τρέχει:
1. Κατά το recalculate (Pass 1), σε κάθε frame
2. Κατά το seek/playback (Pass 2), σε κάθε frame

Η `captured` flag (μέσα στο deferred effect) ξεκινάει `false` σε κάθε pass γιατί ο generator ξαναδημιουργείται (reset). Κάθε pass δημιουργεί νέο `createDeferredEffect` call, νέο closure, νέα `captured = false`.

### Αυτό εξηγεί γιατί δουλεύει η text color λύση

Η ahead-of-time text color computation δουλεύει γιατί:
1. Pass 1 τρέχει, deferred effect κάνει background sampling στο restTime, γράφει FILL_MAP
2. Pass 2 ξαναδημιουργεί deferred effect, αλλά FILL_MAP ήδη έχει τιμές
3. Αν syncGeneration δεν κάνει clear (ίδιο palette), Pass 2 βρίσκει cached colors

### Potential gotcha: double computation

Αν syncGeneration κάνει clear (γιατί palette/strategy άλλαξε), τότε Pass 2 πρέπει να ξαναυπολογίσει τα πάντα. Αυτό δεν είναι bug (λειτουργεί), αλλά σημαίνει ότι κάθε palette change κάνει 2x computation (μία στο recalculate, μία στο seek). Η πρώτη computation πετιέται.

---

## Key source files

| File | Line | What |
|---|---|---|
| `core/src/app/Player.ts` | 362-421 | `prepare()`: triggers recalculate |
| `core/src/app/Player.ts` | 423-496 | `run()`: seek + render dispatch |
| `core/src/app/PlaybackManager.ts` | 164-187 | `recalculate()`: frame counting loop |
| `core/src/app/PlaybackManager.ts` | 83-108 | `seek()`: replay to target frame |
| `core/src/scenes/GeneratorScene.ts` | 201-236 | `recalculate()`: per-scene frame walk |
| `core/src/scenes/GeneratorScene.ts` | 278-292 | `reset()`: creates fresh generator |
| `core/src/scenes/GeneratorScene.ts` | 238-276 | `next()`: advance one frame |
| `core/src/threading/threads.ts` | 55-115 | `threads()`: main loop + runDeferred |
| `core/src/threading/Thread.ts` | 158-162 | `runDeferred()`: fires deferred effects |
| `core/src/signals/DeferredEffectContext.ts` | 1-27 | Deferred effect implementation |
