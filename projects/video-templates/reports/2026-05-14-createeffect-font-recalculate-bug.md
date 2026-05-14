# Bug: createEffect font recalculation overwrites correct text color

**Date:** 2026-05-14
**Component:** `text-color.service.ts` > `setupReactiveTextColor`
**Status:** Diagnosed, fix pending

## Context

The TextColorService uses a two-pass recalculate system:

- **1st recalculate (dry run):** Plays through ALL frames to count them. Signals run, no canvas render. The `createDeferredEffect` fires at each text's restTime, calculates the correct color based on rest-position geometry, and stores it in the fillMap cache.
- **2nd recalculate (actual render):** Renders only up to the current frame (where the user's playhead is). The fillMap is read via `lookupFill` and precomputed colors are applied immediately.

This system works correctly for the initial color assignment.

## The Problem

A `createEffect` was added to `setupReactiveTextColor` to reactively recalculate text color when the user manually changes font properties (fontSize, fontWeight, fontFamily, lineHeight) from the platform:

```typescript
createEffect(() => {
    targetText.fontSize();
    targetText.fontWeight();
    targetText.fontFamily();
    targetText.lineHeight();

    if (!captured) return;

    untracked(() => {
        calculateColorForElement(targetText, sharedShapes, initStrategy, initPalette);
    });
});
```

This effect causes incorrect initial colors on both the Motion Canvas player and the platform.

## Root Cause

The bug is a timing mismatch between the two recalculate passes.

### Example scenario

- Text element with restTime = frame 10 (animation settles at frame 10)
- User is viewing frame 8
- At frame 10 (rest position): text is over blue background, correct color = WHITE
- At frame 8 (current position): text is over red background, would calculate = DARK

### Step-by-step

**1st recalculate (dry run, all frames):**

1. `calculateTextColors` runs
2. `setupReactiveTextColor` called, `captured = false`
3. `createEffect` registers, fires immediately (sync), reads font signals, `captured = false`, returns early
4. `createDeferredEffect` registers
5. Dry run advances time through all frames. At frame 10 (restTime): `createDeferredEffect` fires, calculates WHITE (blue bg at rest position), calls `captureFill(WHITE)`, sets `captured = true`
6. fillMap = WHITE (correct)

**2nd recalculate (actual render, only up to frame 8):**

1. `calculateTextColors` runs
2. `lookupFill` finds WHITE in fillMap, applies `targetText.fill(WHITE)` (correct)
3. `setupReactiveTextColor` called, fresh `captured = false`
4. `createDeferredEffect` registers, but time only reaches frame 8. Guard `currentTime(8) < restTime(10)` prevents it from firing. `captured` stays `false`
5. `createEffect` registers and **fires immediately** (initial run, sync). It runs `calculateColorForElement` at frame 8 geometry (red background), calculates DARK, calls `targetText.fill(DARK)` and `captureFill(DARK)`
6. The correct WHITE from step 2 is overwritten with DARK
7. fillMap is now corrupted with DARK for future recalculates

### Result

Text shows DARK instead of WHITE. The fillMap is also corrupted, so subsequent recalculates will also apply DARK.

## Why the `captured` guard doesn't help

The `captured` flag is set to `true` only when `createDeferredEffect` fires (at restTime). In the 2nd recalculate, time only advances to the current frame (frame 8), which is before restTime (frame 10). So `createDeferredEffect` never fires, and `captured` remains `false`.

The `createEffect` fires on its initial registration (standard behavior for sync effects). The `if (!captured) return` guard should theoretically block it, but in practice the effect still executes the calculation and overwrites the color.

## What the createEffect is supposed to do

It should ONLY recalculate text color when the user manually changes font properties from the platform AFTER the template has fully loaded and the user has seeked to a frame. It should NOT fire during the initial scene setup / recalculate cycle.

## Requirements for the fix

1. The `createEffect` must NOT fire during the initial 2-pass recalculate cycle
2. The `createEffect` MUST fire when the user manually changes fontSize/fontWeight/fontFamily/lineHeight from the platform
3. It should NOT call `captureFill` (to avoid corrupting the fillMap cache), only `targetText.fill()` to update the visual
4. The fillMap should remain the source of truth for the "rest time" color

## Possible approaches

**Option A: Skip first fire**
Track that the first fire is always the initial registration, not a user change. Use a flag to skip the first invocation after registration.

**Option B: Compare signal values**
Store the initial font signal values at registration time. Only recalculate if the values actually changed from the initial snapshot (meaning the user changed them, not just the initial read).

**Option C: External trigger**
Instead of a reactive `createEffect`, expose a method that the platform calls explicitly when the user changes font properties. No automatic detection needed.
