# Concerns

Open concerns and accepted risks for the animation system.

## Signal animation setup captures values at pass 1, not at generator execution

`createSignal(targetNode.position().x)` in rotation3d snapshots position.x when `signalFn()` is called (pass 1 in AnimationService). The generator runs later, after `delay()`. If something mutates position.x between setup and execution (e.g. `functionsAfterLayersInit`, `LayerOpacityService`), the base signal starts from a stale value.

**Risk:** Low. Position is rarely mutated between these phases.

**Why not fixed:** Moving the snapshot inside the generator conflicts with additive tween timing. The `positionBase` signal must exist at setup time for additive routing. Re-capturing inside the generator can cause a 1-frame glitch if an additive tween started before the generator.

**Revisit if:** Templates start using `functionsAfterLayersInit` to mutate position/scale on nodes that also have signal animations.
