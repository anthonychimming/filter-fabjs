# Filter FabJS Filter Authoring Guide

**Applies to Filter FabJS v2.5.0**

This guide is for designing new Filter FabJS filters efficiently and with predictable CPU/WebGPU behavior. It assumes the formula syntax in [FORMULA_REFERENCE.md](FORMULA_REFERENCE.md).

For the full human-oriented manual, see the [Filter FabJS Programming Guide (PDF)](Filter_FabJS_Programming_Guide_v2.4.7.pdf).

## 1. Start with the rendering target

For new native filters, prefer the deterministic stateless subset so the filter can run on WebGPU.

Use these freely:

- arithmetic, comparisons, logical operators, and ternaries;
- `ctl()`, `val()`, and `map()`;
- `src()`, `srcWrap()`, `srcMirror()`, `srcLinear()`, `rad()`;
- `cnv()`;
- numeric shaping and coordinate helpers;
- deterministic noise;
- gradients and patterns;
- analytic masks;
- blend modes.

Avoid these unless CPU-only behavior is intentional:

```text
rnd() rst() get() put() pow()
~ & ^ | << >>
comma sequencing
```

Historic `.afs` filters use legacy integer math and are CPU-only by design.

## 2. Think in four channel expressions

A filter is always four formulas: R, G, B, A.

When the same operation applies to RGB, prefer `c` and `z` so the expression can be reused:

```text
R: clamp(c+20,0,255)
G: clamp(c+20,0,255)
B: clamp(c+20,0,255)
A: a
```

For sampling filters, `z` makes the same expression channel-independent:

```text
srcLinear(x+8,y,z)
```

Preserve alpha with `a` unless transparency is part of the effect.

## 3. Keep value ranges explicit

Most filter bugs come from mixing the two principal ranges:

- image channels and raw controls: `0..255`;
- noise, gradients, and masks: `0..1`.

Useful conversions:

```text
mask*255
noise*255
ctl(0)/255
```

Prefer `val()` for semantic control ranges:

```text
val(0,-64,64)      // pixel displacement
val(1,4,128)       // cell size
val(2,0,1024)      // angle
val(3,0.25,2.5)    // multiplier
```

For mix controls, `ctl()` can be passed directly to `lerp()` or blend helpers:

```text
lerp(c,target,ctl(7))
```

## 4. Design controls around user intent

Use controls for visible concepts rather than internal constants.

Good labels:

- Strength
- Scale
- Radius
- Edge Softness
- Seed
- Angle
- Cell Size
- Contrast
- Effect Mix

Avoid exposing implementation details such as `Octave Multiplier 2` unless the filter is specifically educational or technical.

A practical pattern is:

- controls 0–5: effect-specific parameters;
- control 6: tone/color/detail parameter if needed;
- control 7: global effect mix.

This is a convention, not an engine requirement.

## 5. Prefer resolution-independent formulas

Use `X`, `Y`, and `min(X,Y)` rather than hard-coded canvas dimensions.

Examples:

```text
circle(x,y,X/2,Y/2,min(X,Y)*0.25,1)
```

```text
sierpinski(x,y,X/2,Y/2,min(X,Y)*0.9,6,1)
```

This keeps the composition stable across portrait, landscape, and square images.

For directional effects, scale displacement intentionally. A fixed pixel amount is appropriate when the UI control is explicitly in pixels; otherwise consider deriving the amount from image size.

## 6. Sampling strategy

Choose the sampler according to the visual result.

### `src()` — nearest, clamped

Use for:

- integer-like offsets;
- hard-edged pixel effects;
- mirrors;
- block effects where interpolation is undesirable.

```text
src(X-1-x,y,z)
```

### `srcLinear()` — bilinear, clamped

Use for:

- smooth displacement;
- subpixel transforms;
- soft directional echoes;
- distortion.

```text
srcLinear(x+dx,y+dy,z)
```

### `srcWrap()` — toroidal nearest sampling

Use when displacement should wrap at the image boundary:

```text
srcWrap(x+shift,y,z)
```

This is especially useful for glitch and seamless procedural effects.

### `srcMirror()` — mirrored nearest sampling

Use where wrapping would create an obvious seam but repeating edge content is acceptable.

## 7. Build procedural filters from normalized fields

Noise, gradients, patterns, and masks compose well because they mostly produce `0..1` values.

A reliable construction sequence is:

1. produce one or more normalized fields;
2. combine or reshape them;
3. convert to channel scale or use them as a blend weight;
4. mix with the source image.

Example:

```text
lerp(c,fbm(x,y,64,5,2,0.5,1234)*255,ctl(0))
```

For more structure, combine fields:

```text
clamp(fbm(x,y,72,5,2,0.5,1234)*0.75+ridged(x,y,28,4,5678)*0.35,0,1)
```

Then convert or use as a mask.

## 8. Deterministic noise over sequential random

For new filters, prefer:

```text
hash2()
valueNoise()
perlin()
worleyF1()
worleyF2()
fbm()
turbulence()
ridged()
periodicNoise()
```

These are deterministic and WebGPU-compatible.

Avoid `rnd()` unless sequential, order-dependent randomness is specifically required. `rnd()` and `rst()` force CPU fallback.

Seed controls should normally map to a useful integer-like range:

```text
val(1,1,9999)
```

## 9. Noise selection by visual character

### Hash

```text
hash2(x,y,seed)
```

Use for independent grain, dithering, and block-level random decisions.

### Value noise

```text
valueNoise(x,y,scale,seed)
```

Use for smooth displacement and broad soft variation.

### Perlin

```text
perlin(x,y,scale,seed)
```

Use for organic continuous fields.

### Worley

```text
worleyF1(x,y,scale,seed)
worleyF2(x,y,scale,seed)
```

Use for cells, cracks, bubbles, and cellular boundaries.

A common edge field is:

```text
worleyF2(x,y,scale,seed)-worleyF1(x,y,scale,seed)
```

### FBM

```text
fbm(x,y,scale,octaves,lacunarity,gain,seed)
```

Use for layered clouds, terrain-like texture, smoke, and complex organic modulation.

### Ridged / turbulence

Use `ridged()` for vein-like or mountainous structures and `turbulence()` for folded, absolute-value noise.

### Periodic noise

Use `periodicNoise()` when the generated texture must tile without a seam.

## 10. Distortion pattern

For image displacement, generate two decorrelated fields and use them for X/Y offsets.

```text
srcLinear(
  x+(valueNoise(x,y,48,1234)-0.5)*24,
  y+(valueNoise(x+431,y+719,48,1234)-0.5)*24,
  z
)
```

The coordinate offsets (`+431`, `+719`) decorrelate the two fields without requiring separate random state.

Expose `scale`, `strength`, and `seed` as controls for a reusable distortion filter.

## 11. Shape masks as building blocks

Analytic masks return `0..1` and can be composed directly.

### Union

```text
max(maskA,maskB)
```

### Intersection

```text
maskA*maskB
```

### Cutout

```text
clamp(maskA-maskB,0,1)
```

### Draw a solid color

```text
background+(foreground-background)*mask
```

For one channel:

```text
20+(230-20)*circle(x,y,X/2,Y/2,80,1)
```

### Mix a generated shape with the source

```text
lerp(c,target,ctl(7))
```

Feather values should generally remain small in pixel terms. A hard `0` edge is appropriate for deliberately pixel-sharp geometry; otherwise a small positive feather reduces aliasing.

## 12. Pattern construction

### Checker

```text
checker(x,y,16,16)
```

returns `0` or `1`.

### Grid

```text
grid(x,y,32,32,2,0.75)
```

returns an anti-aliased line mask.

### Brick

```text
brick(x,y,48,24,2,0.5)
```

returns `1` for brick and `0` for mortar.

For rotated/reoriented procedural coordinates, transform `x` and `y` first using `r2x()` / `r2y()` and pass the transformed coordinates into a pattern function.

## 13. Gradients as masks and shading fields

Gradients are normalized and can act as both masks and lighting/shading terms.

```text
linearGrad(x,y,0,0,X,Y)
```

```text
radialGrad(x,y,X/2,Y/2,min(X,Y)*0.45)
```

Example shading factor:

```text
0.75+linearGrad(x,y,0,Y*0.2,0,Y*0.8)*0.25
```

Multiply this by another normalized mask before applying it to a color.

## 14. Angle conventions

Angles use `0..1024` per turn, not degrees or radians.

Useful values:

```text
0     // right
128   // 45° down-right
256   // down
512   // left
768   // up
1024  // one full turn
```

For a control:

```text
val(0,0,1024)
```

For a directional displacement:

```text
x-r2x(angle,distance)
y-r2y(angle,distance)
```

## 15. Blend helpers

For standard blend modes, prefer the built-in helpers over manually reproducing formulas.

```text
multiply(c,other,opacity)
screen(c,other,opacity)
overlay(c,other,opacity)
softLight(c,other,opacity)
difference(c,other,opacity)
```

Opacity may be normalized or `0..255`, so `ctl()` is directly usable.

Example:

```text
screen(c,noise*255,ctl(0))
```

## 16. `lerp()` as the default effect mixer

A simple source/target mix is one of the most reusable authoring patterns:

```text
lerp(c,target,ctl(7))
```

This keeps the filter reversible at mix `0` and makes strong effects easier to tune.

Because `lerp()` interprets values greater than `1` as `0..255` opacity, both of these are valid:

```text
lerp(a,b,0.5)
lerp(a,b,128)
```

Do not divide a raw control by `255` unless the next function explicitly expects a normalized value.

## 17. Convolution guidance

`cnv()` is a fixed 3×3 kernel and is supported by both renderers.

Blur:

```text
cnv(1,1,1,1,1,1,1,1,1,9)
```

Sharpen:

```text
cnv(0,-1,0,-1,5,-1,0,-1,0,1)
```

Use convolution when the operation is genuinely local-neighborhood based. Do not emulate a large blur with dozens of repeated `src()` calls; that becomes expensive quickly.

## 18. Performance model

Formula cost is paid per pixel and per output channel.

The most important authoring rule is therefore:

**Avoid recomputing expensive fields unnecessarily.**

Because the language has no local variables, common subexpressions written multiple times may be evaluated multiple times. Keep formulas compact and consider whether a visually equivalent formulation can use fewer noise or sampling calls.

Relative cost tends to increase roughly as follows:

1. arithmetic, controls, comparisons;
2. gradients, simple patterns, analytic masks;
3. one source sample;
4. multiple source samples / bilinear sampling;
5. convolution;
6. Worley and multi-octave fractal noise;
7. combinations of repeated high-cost operations.

This is qualitative guidance, not a guaranteed benchmark ordering.

## 19. Prefer reusable channel formulas

When possible, write one expression that works for R/G/B through `c` and `z`.

Good:

```text
lerp(c,fbm(x,y,64,5,2,0.5,123)*255,ctl(0))
```

Then use the same formula for R/G/B and `a` for alpha.

Use separate channel formulas only when the color effect genuinely differs per channel, such as RGB channel splitting or duotone output.

## 20. Color construction

To colorize a normalized field, interpolate between channel endpoints.

For a field `f` in `0..1`:

```text
shadowR+(highlightR-shadowR)*f
```

With controls:

```text
ctl(0)+(ctl(3)-ctl(0))*f
```

Do this independently for R, G, and B.

For luminance-based duotone, `scl()` is concise:

```text
R: scl(i,0,255,ctl(0),ctl(3))
G: scl(i,0,255,ctl(1),ctl(4))
B: scl(i,0,255,ctl(2),ctl(5))
A: a
```

## 21. Conditional effects

Use ternary selection for hard conditional behavior:

```text
i>128 ? 255-c : c
```

Use `smoothstep()` instead when the transition should be soft.

Hard comparisons are useful for posterization, solarization, masks, and glitch decisions; smooth transitions are usually better for photographic effects.

## 22. Authoring templates

### Pass-through

```text
r
g
b
a
```

### Global per-channel transform

```text
R/G/B: clamp(/* expression using c */,0,255)
A: a
```

### Source displacement

```text
R/G/B: srcLinear(/* transformed x */,/* transformed y */,z)
A: a
```

### Procedural replacement

```text
R/G/B: /* normalized field */*255
A: a
```

### Procedural mix

```text
R/G/B: lerp(c,/* generated 0..255 target */,ctl(7))
A: a
```

### Mask-driven color

```text
R: backgroundR+(foregroundR-backgroundR)*mask
G: backgroundG+(foregroundG-backgroundG)*mask
B: backgroundB+(foregroundB-backgroundB)*mask
A: a
```

## 23. Native JSON template

```json
{
  "format": "filter-fab-js",
  "version": 2,
  "mathMode": "float",
  "name": "New Filter",
  "author": "",
  "formulas": [
    "lerp(r,255-r,ctl(7))",
    "lerp(g,255-g,ctl(7))",
    "lerp(b,255-b,ctl(7))",
    "a"
  ],
  "controls": [
    { "label": "Control 1", "value": 128 },
    { "label": "Control 2", "value": 128 },
    { "label": "Control 3", "value": 128 },
    { "label": "Control 4", "value": 128 },
    { "label": "Control 5", "value": 128 },
    { "label": "Control 6", "value": 128 },
    { "label": "Control 7", "value": 128 },
    { "label": "Effect Mix", "value": 255 }
  ]
}
```

Native v2 filters should normally use `"mathMode": "float"`.

## 24. Preflight checklist

Before considering a new filter complete, check:

1. **Syntax** — all function names and arities match [FORMULA_REFERENCE.md](FORMULA_REFERENCE.md).
2. **Ranges** — normalized fields and `0..255` channels are not accidentally mixed.
3. **Alpha** — alpha is intentionally preserved or modified.
4. **Controls** — every exposed control produces a useful and understandable change.
5. **Bounds** — extreme control settings do not cause obvious numeric instability or unusable output.
6. **Resolution** — the effect behaves reasonably on different aspect ratios and sizes.
7. **GPU compatibility** — no CPU-only construct is present unless intentional.
8. **Sampling** — nearest versus bilinear versus wrapped/mirrored behavior is deliberate.
9. **Performance** — expensive noise/sampling calls are not duplicated without a visual reason.
10. **Mix** — for destructive or stylized filters, consider a final Effect Mix control.

## 25. Common authoring mistakes

### Using `sqr()` as square root in native filters

The following guidance applies to native float filters. Historic AFS/legacy filters retain Filter Factory's integer square-root meaning for `sqr()` (with `sqrt()` as an alias).

Wrong:

```text
sqr(x*x+y*y)
```

if the intent is distance.

Correct:

```text
sqrt(x*x+y*y)
```

or simply:

```text
c2m(x,y)
```

### Sending a normalized mask directly to a channel

Wrong if a visible white mask is intended:

```text
circle(x,y,X/2,Y/2,80,1)
```

Correct:

```text
circle(x,y,X/2,Y/2,80,1)*255
```

### Using `src()` for smooth fractional displacement

Prefer:

```text
srcLinear(x+dx,y+dy,z)
```

### Using `rnd()` for ordinary grain

Prefer deterministic:

```text
hash2(x,y,seed)
```

so the filter stays GPU-compatible.

### Hard-coding dimensions

Avoid:

```text
circle(x,y,400,300,150,1)
```

Prefer:

```text
circle(x,y,X/2,Y/2,min(X,Y)*0.25,1)
```

## 26. Recommended authoring workflow

A practical workflow for a new filter is:

1. define the visual operation in normalized terms;
2. identify whether it requires source sampling, procedural fields, masks, or convolution;
3. choose a GPU-compatible implementation first;
4. write a minimal no-control version and validate the result;
5. add semantic controls with `val()`;
6. add a global mix control if appropriate;
7. test minimum/default/maximum control values;
8. test multiple images, sizes, and aspect ratios;
9. confirm Auto renderer stays on WebGPU unless CPU fallback is intentional;
10. export the final native v2 JSON and keep the formula reference synchronized if new language features were introduced.

The goal is not to maximize formula complexity. Prefer the smallest expression that produces the intended visual behavior predictably.
