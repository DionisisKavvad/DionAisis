# Shader Invisibility Root Cause Report

**Date:** 2026-05-06
**Project:** video-templates
**Component:** `src/scenes/signal-animations/motion-blur-shader.ts`

## Symptom

Any GLSL shader applied to a Motion Canvas node via `.shaders()` at runtime made the node completely invisible. The node reappeared on the last frame when the shader was removed during cleanup.

No errors in the console. No GL compilation errors. Shader setup/teardown callbacks fired correctly.

## Investigation Timeline

1. **Eliminated shader code issues:** Even a solid red shader (`outColor = vec4(1,0,0,1)`) with zero texture dependency produced invisible output. Ruled out shader logic, imports, and `#include` resolution.

2. **Eliminated GL pipeline issues:** Verified all GL state was correct:
   - No GL errors before or after render
   - Program compiled and bound correctly
   - Vertex buffer bound, attribute 0 enabled with size 2
   - Framebuffer complete (36053)
   - No scissor/depth/stencil/cull face tests
   - Color mask `[true, true, true, true]`

3. **Found the quad was rendering into a 5px area:** Computed NDC coordinates from the `sourceMatrix` uniform and found the quad was mapped to NDC range `[-1.004, -0.994]` x `[0.997, 1.002]`, a ~5x5 pixel sliver at the extreme top-left corner of a 1080x1920 canvas.

4. **Traced to degenerate cache bbox:** The `worldSpaceCacheBBox` at render time was `{x:-2, y:-2, w:5, h:5}` instead of the expected `{x:48, y:1222, w:585, h:77}`.

5. **Found NaN cachePadding as root cause.**

## Root Cause

```js
const originalCachePadding = targetNode.cachePadding();
// Returns: _Spacing {top: 0, right: 0, bottom: 0, left: 0}  (an object, not a number)

targetNode.cachePadding(Math.max(originalCachePadding, computedMaxDistance));
// Math.max(Spacing_object, 6) = NaN
// Sets cachePadding to NaN on all sides
```

MC's `cachePadding()` getter returns a `_Spacing` object. `Math.max(object, number)` coerces the object via `valueOf()`, which returns `NaN` for Spacing. The setter then stored `NaN` as padding on all four sides.

### NaN propagation chain

1. `cachePadding` = `_Spacing {top: NaN, right: NaN, bottom: NaN, left: NaN}`
2. `cacheBBox()` calls `addSpacing(NaN)` producing `{x: NaN, y: NaN, w: NaN, h: NaN}`
3. `worldSpaceCacheBBox()` transforms NaN corners via `localToWorld()`, gets NaN points
4. `BBox.fromPoints()` with NaN values produces a degenerate bbox
5. `.intersection()` with the view bounds collapses to `{x: -2, y: -2, w: 5, h: 5}`
6. The `sourceMatrix` uniform (inverse of `cameraToCache`) gets scale factors ~0.004 instead of ~0.5
7. The GL quad renders into ~5 pixels on a 1920x1080 canvas, effectively invisible

## Fix

```js
const originalPaddingMax = Math.max(
  originalCachePadding.top ?? 0,
  originalCachePadding.right ?? 0,
  originalCachePadding.bottom ?? 0,
  originalCachePadding.left ?? 0,
);
targetNode.cachePadding(Math.max(originalPaddingMax, computedMaxDistance));
```

Extract numeric values from the Spacing object before comparing with `Math.max`.

## Additional fix: peak velocity for eased motion

The original `peakVelocity = slideLen / duration` assumed linear motion. With `easeOutQuint`, the actual peak velocity is 5x higher (derivative at t=0 is 5). This produced `computedMaxDistance = 6px` instead of ~28px.

Fixed by sampling the easing derivative to find the true peak:

```js
let maxDerivative = 1.0;
for (let i = 0; i <= 100; i++) {
  const t = i / 100;
  const t1 = Math.max(0, t - 0.001);
  const t2 = Math.min(1, t + 0.001);
  const derivative = Math.abs(ease(t2) - ease(t1)) / (t2 - t1);
  maxDerivative = Math.max(maxDerivative, derivative);
}
const peakVelocity = maxDerivative * slideLen / duration;
```

## Why it was hard to find

- MC's pipeline surfaced zero errors. Shader compiled, GL state was valid, callbacks fired.
- `readPixels` at canvas center returned `(0,0,0,0)`, which looked like the shader wasn't rendering at all. In reality, it was rendering into a 5px area at the canvas edge.
- The NaN originated from a type mismatch (Spacing object vs number) that JS silently coerced instead of throwing.
- The degenerate bbox `{-2, -2, 5, 5}` looked like a default/fallback value, not like a NaN-derived artifact.
