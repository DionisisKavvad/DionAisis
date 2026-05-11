# Animation System Review: Agent Team Evaluation

**Date:** 2026-05-08
**Reviewers:** Motion Canvas expert, Solution architect, Devil's advocate
**Scope:** Animation unification (conflict detection, additive composition, compound enforcement)

---

## What works

- Two-pass approach (signal animations first, tweens second) is correct for MC's cooperative generator model
- `additiveProperties` pattern cleanly redirects tweens to base signals without collision
- Compound property ban (`position`, `scale`) catches ambiguity early with clear error messages
- Schema registry auto-populates from barrel export, zero wiring needed for new signal animations
- LayerOpacityService correctly skips signal animations when prepending initial-value keyframes (line 46: `if (signalAnimationRegistry[...]) continue`)

---

## Issues found

### Critical

~~**1. Signal vs signal conflict: zero detection**~~

~~`detectAnimationConflicts` only checks signal `propertiesAffected` against `tweenProps`. If two signal animations both affect the same property (e.g., `create3DRotationY` + a future `createBounceScale` both targeting `scale.x`), no error is thrown. The second reactive binding silently overwrites the first. The detector has zero signal-vs-signal logic.~~

~~**Fix:** Collect all signal `propertiesAffected` and check for overlaps between signal animations too, not just signal vs tween.~~

---

~~**2. `_independentAnimations` bypass all protection**~~

~~`_independentAnimations` are processed in a completely separate loop (lines 249-281) with no conflict detection, no additive signal lookup, no compound property enforcement. A tween in `_independentAnimations` targeting `position.x` will directly fight a signal animation's reactive binding from `_animations`. Total silent collision.~~

~~**Fix:** Either run the same two-pass logic for `_independentAnimations`, or document it as an unprotected escape hatch and ensure templates don't mix signal-targeted properties across the two arrays.~~

---

~~**3. Reactive bindings never cleaned up (rotation3d)**~~

~~`rotation3d` sets `targetNode.scale.x(() => baseScaleX * Math.cos(...))` permanently. After the generator finishes, the `angle` signal stops changing but the reactive binding remains. If anything else later tries to set `scale.x` to a static value, the binding persists until overwritten. `createTypewriterGradient` cleans up (`targetNode.fill(originalFill)` at the end), but `rotation3d` does not.~~

~~**Fix:** At the end of the generator, restore properties to their final static values.~~ Resolved: dynamic cleanup via `withSignalCleanup` wrapper in AnimationService. Uses `signal(signal())` to freeze reactive bindings to static values after generator completes. Skips additive properties. No manual cleanup needed per signal animation.

---

### Medium

**4. `positionBase` captures potentially stale value**

`createSignal(targetNode.position().x)` snapshots position.x at setup time (when `signalFn()` is called in pass 1). But `functionsAfterLayersInit` or `LayerOpacityService` might mutate position.x between setup and generator execution. The additive tween then applies its delta to a stale origin.

**Risk level:** Low in practice because position.x is rarely mutated between function passes, but architecturally fragile.

**Fix:** Defer the snapshot to inside the generator (capture when it first yields), or accept the risk and document the constraint.

**Status:** Ignored for now. Re-capture inside generator conflicts with additive tween timing (possible 1-frame glitch if tween starts before generator). Low practical risk, not worth the complexity.

---

~~**5. Conflict detection runs AFTER signal animations execute**~~

~~If a signal animation throws during setup (caught by the try/catch at line 202), its `additiveProperties` never populate `additiveSignals`. The conflict check then runs with incomplete data. Tweens that should have been redirected to additive signals instead run directly on the node property, fighting the (partially set up) reactive binding.~~

~~**Fix:** Split into two phases:~~
- ~~Static conflict check BEFORE pass 1 (use `propertiesAffected` from schemas, not runtime results)~~
- ~~Additive routing resolution AFTER pass 1 (using runtime `additiveProperties`)~~

---

~~**6. `propertiesAffected` schemas are manually maintained**~~

~~Nothing validates that a schema's `propertiesAffected` matches what the generator actually touches. If someone adds a signal animation and forgets to list a property, conflict detection is blind. No runtime introspection, no test, no lint rule.~~

~~**Fix options:**~~
~~- Convention + code review (pragmatic, accept the risk)~~
~~- A test that introspects generator code for property assignments (complex, brittle)~~
~~- Runtime detection via Proxy on node properties during a test run (overkill for now)~~

Resolved: convention documented in signal-animations barrel export (index.ts). Accept the risk with 3-4 signal animations. Revisit with Proxy-based test if the number grows.

---

### Low

~~**7. `createOneSideSwing` doesn't expose `additiveProperties`**~~

~~Not an issue. `oneSideSwing` uses direct `yield*` tweens on rotation, which is correct. Additive composition would break the swing animation (it relies on sequential yield* calls returning to base rotation). Conflict detection correctly throws if a tween targets `rotation` on the same node.~~

---

~~**8. `COMPOUND_PROPERTIES` is incomplete**~~

~~Only `position` and `scale` are listed. `size` is not checked. Future compound properties could pass through unguarded.~~

~~**Fix:** Add `size` to the map. Review MC's compound properties for completeness.~~ Resolved: replaced hardcoded `COMPOUND_PROPERTIES` map with dynamic `propsConflict()` prefix matching. Any compound/granular overlap (position vs position.x, scale vs scale.y, etc.) is detected automatically without maintaining a list.

---

## Recommended next steps

| Priority | Action | Fixes | Effort |
|---|---|---|---|
| ~~1~~ | ~~Add signal vs signal conflict detection~~ | ~~#1~~ | ~~Done~~ |
| ~~2~~ | ~~Static conflict check before pass 1 (use schema metadata)~~ | ~~#5~~ | ~~Done~~ |
| ~~3~~ | ~~Add cleanup at end of rotation3d generator~~ | ~~#3~~ | ~~Done~~ |
| ~~4~~ | ~~Decide on `_independentAnimations` policy (protect or document)~~ | ~~#2~~ | ~~Done~~ |
| ~~5~~ | ~~Add `size` to COMPOUND_PROPERTIES~~ | ~~#8~~ | ~~Done~~ |
| ~~6~~ | ~~Add additive support to `createOneSideSwing`~~ | ~~#7~~ | ~~Not needed~~ |
| ~~7~~ | ~~Document `propertiesAffected` convention for future signal animations~~ | ~~#6~~ | ~~Done~~ |
