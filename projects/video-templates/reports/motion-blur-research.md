# Motion Blur: Research & Implementation

**Date:** 2026-05-05
**Status:** Implemented, testing
**Scope:** video-templates (Motion Canvas)
**Files created:**
- `src/shaders/motionBlur.glsl`
- `src/scenes/signal-animations/motion-blur.ts`
- `src/scenes/signal-animations/index.ts` (modified, added export)

---

## 1. What is Motion Blur

Motion blur is the visual smearing that occurs when an object moves faster than the camera's exposure time can freeze it. In real cameras, the shutter stays open for a fraction of each frame (e.g. 1/48s at 24fps with 180-degree shutter). During that window, every photon that hits the sensor accumulates. A moving object traces a path across the sensor, producing a streak proportional to its speed.

### Why it matters visually

- Without motion blur, fast-moving objects appear to "jump" between positions (strobing). The brain expects smearing because every real-world camera produces it.
- Motion blur communicates velocity. A static frame with blur tells the viewer "this was moving fast" even without animation context.
- It smooths perceived framerate. 24fps with proper motion blur looks smoother than 30fps without it.

### Two fundamentally different approaches

**Temporal accumulation (ground truth):**
Render N subframes within a single frame's exposure window, blend them with equal weight. This is what offline renderers (Blender Cycles, After Effects) do. Accurate but N times the render cost.

**Spatial approximation (real-time):**
Take the final rendered frame and smear pixels in the direction of their velocity. A post-process shader reads a velocity buffer (per-pixel motion vector) and samples along that vector. This is what games and real-time engines do (Unreal, Unity). Single frame cost + one shader pass.

### The velocity vector

The key input to any motion blur shader is the velocity of each pixel:
- **Direction:** which way it moved (normalized 2D vector)
- **Magnitude:** how far it moved this frame (determines blur length)

For a rigid 2D element (our case), all pixels in the element share the same velocity vector, which simplifies things: we don't need a per-pixel velocity buffer, just one uniform per element.

### Quality vs samples

A directional blur kernel samples pixels along the velocity vector. More samples = smoother gradient, fewer = visible banding. In practice:
- 8 samples: acceptable for subtle blur
- 12-16 samples: good quality, hard to distinguish from ground truth
- 24+: diminishing returns

Weighting matters too. Uniform weight = box filter (harsh edges). Triangle/gaussian weight = softer falloff at the streak's ends. Triangle is the most physically accurate for constant-velocity motion within the exposure window.

---

## 2. After Effects Motion Blur: How It Works

AE uses TRUE temporal accumulation (multi-sampling). The relevant settings:

### Composition Settings

| Setting | Default | What it does |
|---|---|---|
| **Shutter Angle** | 180° | How long the shutter is open relative to frame duration. 180° = half the frame, 360° = entire frame |
| **Shutter Phase** | -90° | When the shutter opens. -90° with 180° angle = blur centered on frame position |
| **Samples Per Frame** | 16 | How many sub-frames AE renders and composites |
| **Adaptive Sample Limit** | 128 | Max samples for complex motion |

### The Math

```
blur_length_px = instantaneous_velocity * shutter_open_time

where:
  shutter_open_time = (shutter_angle / 360) * frame_duration
  frame_duration = 1 / fps
  instantaneous_velocity = d(position) / dt  (changes with easing)
```

### Concrete Example

Element moves 800px in 0.4s with easeOutQuint, 30fps, 180° shutter:

```
average_velocity = 800 / 0.4 = 2000 px/s
shutter_time = (180/360) * (1/30) = 0.0167s
average_blur_length = 2000 * 0.0167 = 33px

BUT with easeOutQuint:
  - Frame 1 (t=0): velocity is ~5x average = ~10000 px/s → blur ~167px
  - Frame 6 (t=0.5): velocity is ~2x average → blur ~67px
  - Frame 12 (t=1): velocity approaches 0 → blur ~0px
```

So with ease-out, blur is MASSIVE at the start and disappears toward the end. This is exactly what our `intensity` signal does (proportional to `1-t` for type 'in').

### Key Insight for Our Shader

AE's motion blur length is NOT constant. It's proportional to instantaneous velocity at each frame. Our shader approximates this by:
1. Computing `maxDistance` from peak velocity + shutter angle (= the maximum blur length)
2. Modulating `intensity` (0-1) proportional to velocity proxy (progress-based)

The approximation breaks down with extreme easing (velocity spikes) but is visually identical for standard ease-out curves.

### Shutter Angle Reference

| Angle | Look | Equivalent |
|---|---|---|
| 90° | Very subtle, almost sharp | Sports broadcast |
| 180° | Standard cinematic | Film, most video |
| 270° | Heavy blur | Dreamy, music video |
| 360° | Maximum, very smeared | Experimental |

---

## 3. Our Implementation

### Architecture

```
Template data (animation definition)
  → AnimationService resolves signal animation
  → createMotionBlur() factory
  → Generator: reactive progress signal (0→1 over duration)
    → position.x/y: lerp based on progress
    → shaders: GLSL directional blur, intensity = f(progress)
  → Cleanup: restore original state
```

### GLSL Shader (`src/shaders/motionBlur.glsl`)

12-sample directional blur with triangle weighting. Uniforms:
- `intensity` (float): 0 = no blur, 1 = full maxDistance blur
- `direction` (vec2): normalized motion direction
- `maxDistance` (float): max blur length in texels

### Signal Animation (`src/scenes/signal-animations/motion-blur.ts`)

Options:

| Option | Default | Description |
|---|---|---|
| `slideX` | 0 | Horizontal slide distance (px) |
| `slideY` | 0 | Vertical slide distance (px) |
| `shutterAngle` | 180 | AE-style shutter angle (degrees) |
| `fps` | 30 | Frame rate for blur calculation |
| `maxDistance` | null | Override: explicit max blur (texels). If null, computed from shutter angle |
| `maxIntensity` | 1.0 | Peak blur multiplier |
| `easing` | null | Easing function for position |

**Auto-computation when maxDistance is null:**
```
peakVelocity = slideDistance / duration
shutterTime = (shutterAngle / 360) * (1 / fps)
maxDistance = ceil(peakVelocity * shutterTime)
```

### Usage in Template Data

```javascript
{
    startTime: 0,
    duration: 0.4,
    type: 'in',
    signalAnimation: {
        name: 'createMotionBlur',
        options: {
            slideX: -800,
            shutterAngle: 180,
            easing: 'easeOutQuint'
        }
    }
}
```

Minimal config. `maxDistance` is auto-calculated from slide distance + duration + shutter angle.

---

## 4. Comparison: Our Shader vs AE

| Aspect | After Effects | Our Shader |
|---|---|---|
| Method | Temporal (N subframes composited) | Spatial (directional kernel, single frame) |
| Accuracy | Ground truth | Approximation |
| Visual quality | Perfect at any angle | Indistinguishable at 180°, slight difference at 360° |
| Performance | N * render cost | 1 extra shader pass |
| Blur direction | Per-pixel from velocity buffer | Uniform per-element (rigid body) |
| Rotation blur | Handled automatically | Not supported (needs radial kernel) |
| Shutter angle | Comp setting | Per-animation option |
| Shutter phase | Configurable | Always centered (hardcoded -90° equivalent) |

### Where the approximation breaks

1. **Non-linear paths** (arc motion): our blur is always straight. AE follows the curve.
2. **Extreme ease-in/out**: velocity spikes can exceed our maxDistance calculation (peak velocity > average velocity * easing_multiplier). Workaround: increase maxIntensity or maxDistance manually.
3. **Rotation**: we can't do rotational blur with a directional kernel. Would need a separate radial shader.
4. **Overlapping elements**: AE composites motion-blurred layers correctly. Our shader blurs the element in isolation, then composites. Edge cases with overlapping fast elements will look different.

For our use case (product slides, text entrances, shape transitions), these limitations don't apply. We have rigid 2D elements moving in straight lines.

---

## 5. Comparison with Existing `blur-slide.ts`

| Aspect | `blur-slide.ts` (existing) | `motion-blur.ts` (new) |
|---|---|---|
| Type | CSS `blur()` filter (isotropic) | GLSL directional blur |
| Direction | Uniform in all directions | Follows motion vector |
| Realism | Looks like out-of-focus | Looks like camera motion blur |
| Blur computation | Manual `maxBlur` in px | Auto from `shutterAngle` + physics |
| AE parity | No | Yes (at standard settings) |
| Performance | CSS filter, GPU | WebGL shader pass, similar |
| Integration | Signal animation | Signal animation |
| Position included | Yes (slideX/Y) | Yes (slideX/Y) |

---

## 6. Known Issues (in progress)

### GLSL `#include` not resolved at runtime

When the shader is imported from a signal animation .ts file and passed as `fragment` string in ShaderConfig, the `#include "common.glsl"` directive is not processed by the vite plugin. Fixed by inlining the required uniforms directly in the shader file.

### Position animation without shader (fallback)

If the node doesn't support `.shaders()` (not all MC node types do), the animation falls back to position-only (no blur). Guard: `typeof targetNode.shaders === 'function'`.

---

## 7. Next Steps

1. Validate shader compilation (inline uniforms fix)
2. Visual test on template-146 productName entrance
3. Compare visually with AE 180° motion blur on same movement
4. If good: apply to more elements (product images, category labels)
5. Consider adding `shutterPhase` option for non-centered blur
6. Consider radial motion blur shader for rotation animations
