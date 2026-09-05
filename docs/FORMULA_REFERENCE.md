# Filter FabJS Formula Reference

**Applies to Filter FabJS v2.6.5 · native filter format v2 · typed IR v1**

This is the compact, implementation-oriented reference for writing Filter FabJS formulas. For worked explanations and tutorials, see the [Filter FabJS Programming Guide (PDF)](Filter_FabJS_Programming_Guide_v2.4.7.pdf). For analytic mask details, see [ANALYTIC_SHAPES.md](ANALYTIC_SHAPES.md).

The shipping parser in `src/core/formula-language.js`, CPU evaluator in `src/renderers/cpu-worker-source.js`, and WebGPU compiler in `src/gpu/wgsl-compiler.js` are the implementation source of truth.

## 1. Formula model

A filter contains exactly four expressions, evaluated as **R, G, B, A** output channels.

```text
R: r
G: g
B: b
A: a
```

Native filters use floating-point math. The final channel result is clamped to `0..255` before it is written to the output image.

Historic Filter Factory `.afs` imports use legacy integer compatibility mode and are CPU-only.

## 2. Syntax

- One expression per channel; no statements, assignments, loops, or user-defined functions.
- Identifiers are case-sensitive and contain letters/digits only.
- Decimal literals are supported, for example `0.5`, `128`, `2.25`.
- Hexadecimal literals are supported, for example `0xFF`.
- Scientific notation is **not** supported: write `0.001`, not `1e-3`.
- `//` line comments are supported.
- Parentheses may be nested up to 128 levels.
- Formula limits: 8,192 characters, 4,096 tokens, and 4,096 syntax nodes. WebGPU generation is capped at 4,096 IR nodes per four-channel program; CPU dispatch also applies an image-scaled weighted work limit.

Example:

```text
clamp((c-128)*1.25+128,0,255) // contrast
```

### Operators and precedence

Highest to lowest:

| Precedence | Operators | WebGPU |
| --- | --- | --- |
| 10 | prefix `+ - !` | Yes |
| 10 | prefix `~` | CPU only |
| 9 | `* / %` | Yes |
| 8 | `+ -` | Yes |
| 7 | `<< >>` | CPU only |
| 6 | `< <= > >=` | Yes |
| 5 | `== !=` | Yes |
| 4 | `& ^ \|` | CPU only |
| 3 | `&& \|\|` | Yes |
| 2 | `condition ? true : false` | Yes |
| 1 | comma sequencing `,` | CPU only |

Two deliberate parser details differ from C/JavaScript: `&&` and `||` have the same precedence, and `&`, `^`, and `|` have the same precedence. Use parentheses when mixing them.

Division or modulo by zero evaluates to `0`.

## 3. Variables

### Source channels and pixel state

| Variable | Meaning |
| --- | --- |
| `r g b a` | Source red, green, blue, alpha (`0..255`) |
| `c` | Source channel matching the formula currently being evaluated |
| `i` | Luminance: `(299*r + 587*g + 114*b) / 1000` |
| `u v` | Signed chroma components |
| `x y` | Current pixel coordinates |
| `nx ny` | Normalized image coordinates spanning `0..1` across each dimension |
| `cx cy` | Centered image coordinates spanning `-1..1` across each dimension |
| `z` / `p` | Current output channel index: `0=R`, `1=G`, `2=B`, `3=A` |
| `d` | Direction from image centre, using 1024 angle units per turn |
| `m` | Distance from image centre in pixels |

Native-float chroma bounds are `u=-55..55` and `v=-78..78`.

For a one-pixel-wide or one-pixel-high dimension, its normalized coordinate is `0.5` and its centered coordinate is `0`. Existing uppercase `U` and `V` remain chroma-span constants for compatibility.

### Image and range constants

| Variable | Value / meaning |
| --- | --- |
| `X`, `xmax` | Image width |
| `Y`, `ymax` | Image height |
| `Z`, `P`, `zmax`, `pmax` | `4` |
| `D` | `1024` angle units per turn |
| `M`, `mmax` | `hypot(X,Y)/2` |
| `R G B A C I` | `255` |
| `rmax gmax bmax amax cmax imax` | `255` |
| `U` | Native chroma-U span: `110` |
| `V` | Native chroma-V span: `156` |
| `umax`, `umin` | `55`, `-55` in native-float mode |
| `vmax`, `vmin` | `78`, `-78` in native-float mode |
| `dmax`, `dmin` | `512`, `-512` |
| `t`, `tmin` | `0` |
| `tmax`, `total` | `1` |
| other `*min` values | `0` |

### Compatibility aliases

`r0 g0 b0 a0 c0 i0 u0 v0 d0 m0` and `r1 g1 b1 a1 c1 i1 u1 v1 d1 m1` currently alias the same single source image. Likewise `src0/src1`, `rad0/rad1`, and `cnv0/cnv1` alias their unsuffixed forms.

## 4. Controls

Filter FabJS exposes ten controls indexed `0..9`. Raw control values are `0..255`.

| Function | Meaning |
| --- | --- |
| `ctl(i)` | Raw control value. Invalid index returns `0`. |
| `val(i,a,b)` | Maps control `i` linearly from `0..255` to `a..b`. |
| `map(i,v)` | Reversible remap of `v` through control pair `i*2` / `i*2+1`; `i` is `0..4`. |

Use `val()` when a control represents a semantic range:

```text
val(0,-32,32)      // offset in pixels
val(1,0,1024)      // angle
val(2,0.5,2.5)     // scale
```

Use `ctl()` directly for opacity/mix controls because blend helpers and `lerp()` accept `0..255` control values.

## 5. Sampling and convolution

| Function | Result | WebGPU |
| --- | --- | --- |
| `src(x,y,z)` | Nearest source sample; coordinates clamp to image edges | Yes |
| `srcWrap(x,y,z)` | Nearest sample with toroidal wrapping | Yes |
| `srcMirror(x,y,z)` | Nearest sample with mirrored edges | Yes |
| `srcLinear(x,y,z)` | Bilinear source sample with clamped edges | Yes |
| `rad(angle,distance,z)` | Nearest sample from image centre using polar coordinates | Yes |
| `cnv(k0,k1,k2,k3,k4,k5,k6,k7,k8,divisor)` | 3×3 convolution, row-major kernel, edge-clamped sampling | Yes |

A convolution divisor of `0` returns `0`.

Examples:

```text
srcLinear(x+val(0,-32,32),y,z)
```

```text
cnv(1,1,1,1,1,1,1,1,1,9)
```

## 6. Numeric and coordinate functions

| Function | Meaning | WebGPU |
| --- | --- | --- |
| `min(a,b)` / `max(a,b)` | Minimum / maximum | Yes |
| `abs(x)` | Absolute value | Yes |
| `add(a,b,c)` | `min(a+b,c)` | Yes |
| `sub(a,b,c)` | `max(abs(a-b),c)` | Yes |
| `dif(a,b)` | `abs(a-b)` | Yes |
| `mix(a,b,n,d)` | `a*n/d + b*(d-n)/d`; `d=0` gives `0` | Yes |
| `scl(v,inLo,inHi,outLo,outHi)` | Linear range mapping; zero input span gives `0` | Yes |
| `sqr(x)` | Native float: square (`x*x`). Legacy mode: Filter Factory integer square root. | Yes in native float mode |
| `sqrt(x)` | Native float: `sqrt(max(0,x))`. Legacy mode: alias of the Filter Factory integer square root. | Yes in native float mode |
| `clamp(v,lo,hi)` | Clamp to range | Yes |
| `lerp(a,b,t)` | Linear interpolation; `t` is `0..1` if `abs(t)<=1`, otherwise interpreted as `t/255`, then clamped | Yes |
| `step(edge,x)` | `0` below edge, otherwise `1` | Yes |
| `smoothstep(edge0,edge1,x)` | Smooth normalized transition | Yes |
| `floor(x)` / `ceil(x)` / `round(x)` | Integer-valued rounding functions | Yes |
| `fract(x)` | Fractional part | Yes |
| `sign(x)` | Sign of value | Yes |
| `bias(v,b)` | Bias curve; `v` is normalized `0..1` | Yes |
| `gain(v,g)` | Gain curve; `v` is normalized `0..1` | Yes |
| `wrap(v,size)` | Positive modulo coordinate | Yes |
| `mirror(v,size)` | Ping-pong coordinate | Yes |
| `repeat(v,size)` | Descriptive alias of `wrap(v,size)` | Yes |
| `mirrorRepeat(v,size)` | Descriptive alias of `mirror(v,size)` | Yes |

**Important:** Native float filters use `sqr(x)` for squaring and `sqrt(x)` for square root. Historic AFS/legacy programs retain Filter Factory's `sqr(x)` square-root semantics; `sqrt(x)` is its legacy alias.

## 7. Angles and polar helpers

Filter FabJS uses **1024 units per full turn**:

- `0` = right
- `256` = down
- `512` = left
- `768` / `-256` = up

| Function | Meaning | WebGPU |
| --- | --- | --- |
| `sin(angle)` | `512 * sin(angle * 2π / 1024)` | Yes |
| `cos(angle)` | `512 * cos(angle * 2π / 1024)` | Yes |
| `tan(angle)` | `1024 * tan(angle * 2π / 1024)` | Yes |
| `r2x(angle,radius)` | Cartesian X offset | Yes |
| `r2y(angle,radius)` | Cartesian Y offset | Yes |
| `c2d(x,y)` | Cartesian vector to Filter FabJS direction | Yes |
| `c2m(x,y)` | Vector magnitude | Yes |
| `angle(x,y)` | Descriptive alias of `c2d(x,y)` | Yes |
| `radius(x,y)` | Descriptive alias of `c2m(x,y)` | Yes |

For unit direction vectors, use radius `1`:

```text
x+r2x(val(0,0,1024),1)*20
```

## 8. Noise, fractals, and procedural fields

These deterministic functions return normalized values in approximately `0..1` and are WebGPU-compatible.

| Function | Meaning |
| --- | --- |
| `hash2(x,y,seed)` | Deterministic hash |
| `valueNoise(x,y,scale,seed)` | Interpolated value noise |
| `perlin(x,y,scale,seed)` | Gradient noise |
| `worleyF1(x,y,scale,seed)` | Nearest-cell Worley distance |
| `worleyF2(x,y,scale,seed)` | Second-nearest Worley distance |
| `fbm(x,y,scale,octaves,lacunarity,gain,seed)` | Fractal Brownian motion; octaves clamp to `1..12` |
| `turbulence(x,y,scale,octaves,seed)` | Absolute-value fractal noise |
| `ridged(x,y,scale,octaves,seed)` | Ridged fractal noise |
| `periodicNoise(x,y,periodX,periodY,seed)` | Seamless periodic noise |
| `mandelbrot(x,y,iterations)` | Normalized Mandelbrot escape-time field; iterations clamp to `1..256` |
| `julia(x,y,cx,cy,iterations)` | Normalized Julia escape-time field for constant `cx,cy`; iterations clamp to `1..256` |

Convert normalized fields to channel range explicitly when needed:

```text
fbm(x,y,64,5,2,0.5,1234)*255
```

`mandelbrot()` and `julia()` return `0` for a point that escapes on the first iteration, an intermediate normalized escape time for later escapes, and `1` for a point that remains bounded through the requested limit. Both are deterministic, stateless, WebGPU-compatible intrinsics; the iteration loop is bounded inside the CPU and WGSL backends rather than exposed as formula-language control flow.

Aspect-correct Mandelbrot coordinates can be written with the centered variables:

```text
mandelbrot(cx*X/min(X,Y)*1.5-0.5,cy*Y/min(X,Y)*1.5,128)
```

## 9. Gradients and patterns

| Function | Meaning / range | WebGPU |
| --- | --- | --- |
| `linearGrad(x,y,x0,y0,x1,y1)` | Projection from start to end, clamped `0..1` | Yes |
| `radialGrad(x,y,cx,cy,radius)` | `1` at centre to `0` at radius | Yes |
| `angularGrad(x,y,cx,cy,offset)` | Wrapped angular ramp `0..1`; offset is turns when `abs(offset)<=1`, otherwise 1024-angle units | Yes |
| `gradient3(t,a,b,c)` | Piecewise-linear scalar ramp through three equally spaced stops; `t` clamps to `0..1` | Yes |
| `gradient4(t,a,b,c,d)` | Piecewise-linear scalar ramp through four equally spaced stops; `t` clamps to `0..1` | Yes |
| `checker(x,y,cellWidth,cellHeight)` | Checker mask `0` or `1` | Yes |
| `brick(x,y,width,height,mortar,offset)` | Brick mask: `1` brick, `0` mortar | Yes |

For `brick()`, `offset` is a fraction of brick width when `abs(offset)<=1`, otherwise pixels. Odd rows are staggered.

Palette ramps return a scalar, so use one ramp per output channel to define an explicit RGB palette:

```text
R: gradient4(nx,12,74,220,255)
G: gradient4(nx,8,36,126,240)
B: gradient4(nx,28,110,190,96)
```

## 10. Analytic shape masks

All shape functions return normalized masks `0..1`, are stateless, and are supported on CPU and WebGPU. Coordinates, dimensions, widths, and feather values are in pixels. Negative dimensions/widths are treated as absolute values. Feathering extends outward.

| Function | Meaning |
| --- | --- |
| `line(x,y,ax,ay,bx,by,width,feather)` | Line segment mask |
| `circle(x,y,cx,cy,radius,feather)` | Filled circle |
| `ring(x,y,cx,cy,radius,width,feather)` | Circular outline |
| `box(x,y,cx,cy,width,height,rotation,feather)` | Rotated rectangle; rotation uses 1024 units/turn |
| `triangle(x,y,ax,ay,bx,by,cx,cy,feather)` | Filled triangle |
| `grid(x,y,cellWidth,cellHeight,lineWidth,feather)` | Repeating grid lines |
| `sierpinski(x,y,cx,cy,size,depth,feather)` | Equilateral Sierpiński gasket; depth clamps to `0..10` |

Mask composition:

```text
max(circle(x,y,X/2,Y/2,80,1),box(x,y,X/2,Y/2,120,60,128,1))*255
```

```text
clamp(circle(x,y,X/2,Y/2,80,1)-circle(x,y,X/2,Y/2,60,1),0,1)*255
```

Use `max()` for union, multiplication for intersection, and clamped subtraction for cutouts.

### Signed-distance composition

Signed-distance primitives return pixel distances rather than masks: values are negative inside, `0` at the mathematical boundary, and positive outside. They are scalar, deterministic, stateless, and supported on CPU and WebGPU.

| Function | Meaning |
| --- | --- |
| `sdfLine(x,y,ax,ay,bx,by,width)` | Distance to a stroked line segment; `width` is the full stroke width |
| `sdfCircle(x,y,cx,cy,radius)` | Distance to a filled circle |
| `sdfBox(x,y,cx,cy,width,height,rotation)` | Distance to a rotated rectangle; rotation uses 1024 units/turn |
| `sdfUnion(a,b)` | Exact union: `min(a,b)` |
| `sdfIntersect(a,b)` | Exact intersection: `max(a,b)` |
| `sdfSubtract(a,b)` | Remove field `b` from field `a`: `max(a,-b)` |
| `sdfSmoothUnion(a,b,radius)` | Polynomial smooth union; radius is absolute and `0` reduces to exact union |
| `sdfFill(distance)` / `sdfFill(distance,feather)` | Convert a field to a filled `0..1` mask |
| `sdfOutline(distance,width)` / `sdfOutline(distance,width,feather)` | Convert the zero boundary to a centred outline mask; `width` is the full stroke width |

Fill and outline feathering defaults to `0`, treats negative values as absolute, and extends outward from the generated edge. Existing `circle()`, `line()`, and `box()` continue to return masks; their behavior is unchanged.

Example:

```text
sdfFill(
  sdfSubtract(
    sdfSmoothUnion(
      sdfCircle(x,y,X/2,Y/2,80),
      sdfBox(x,y,X/2,Y/2,120,70,128),
      16
    ),
    sdfCircle(x,y,X/2,Y/2,28)
  ),
  1
)*255
```

## 11. Blend functions

The blend helpers operate in channel space (`0..255`). The optional opacity may be `0..1` or `0..255`.

| Function | WebGPU |
| --- | --- |
| `multiply(a,b)` / `multiply(a,b,opacity)` | Yes |
| `screen(a,b)` / `screen(a,b,opacity)` | Yes |
| `overlay(a,b)` / `overlay(a,b,opacity)` | Yes |
| `softLight(a,b)` / `softLight(a,b,opacity)` | Yes |
| `difference(a,b)` / `difference(a,b,opacity)` | Yes |

Example:

```text
multiply(c,128,ctl(0))
```

## 12. CPU-only compatibility functions

| Function / construct | Meaning |
| --- | --- |
| `rnd(a,b)` | Sequential inclusive integer random value |
| `rst(seed)` | Reset sequential random seed; returns `0` |
| `get(index)` | Read one of 256 shared render cells |
| `put(value,index)` | Store to one of 256 shared render cells; returns `value` |
| `pow(a,b)` | Direct power function |
| `~`, `&`, `^`, `|`, `<<`, `>>` | Bitwise operations |
| comma sequencing | Evaluate left expression, return right expression |
| legacy integer math | Historic `.afs` compatibility mode |

`get()`/`put()` cells are cleared at the start of every render and are stateful/order-dependent. `rnd()` is also sequential. Native float filters retain Filter FabJS's existing generator, while historic AFS/legacy filters use Filter Factory's 56-entry subtractive generator and `rst()` reset behavior. These constructs intentionally force CPU rendering.

## 13. WebGPU compatibility rule

A native float filter is WebGPU-compatible when every operation in all four channel formulas is supported by the stateless WebGPU subset.

WebGPU supports:

- arithmetic, comparisons, logical operators, and ternary selection;
- ten controls and five-pair mapping;
- source sampling and 3×3 convolution;
- normalized/centered coordinates and numeric, polar, repeat, palette-ramp, noise, gradient, pattern, shape-mask, signed-distance, and blend functions listed above.

WebGPU rejects:

- legacy integer math;
- `rnd()`, `rst()`, `get()`, `put()`, direct `pow()`;
- bitwise operators and shifts;
- unary `~`;
- comma sequencing.

In **Auto** mode, unsupported formulas fall back to the CPU Worker.

## 14. Scaling conventions

Keep these ranges explicit when composing formulas:

| Value type | Typical range |
| --- | --- |
| Image channels (`r g b a c i`) | `0..255` |
| Raw controls (`ctl`) | `0..255` |
| Noise / gradients / masks | `0..1` |
| Signed-distance fields | pixels; negative inside and positive outside |
| Blend channels | `0..255` |
| Angles | `0..1024` per turn |
| Coordinates / sizes | pixels |
| Normalized coordinates (`nx ny`) | `0..1` |
| Centered coordinates (`cx cy`) | `-1..1` |

Common conversions:

```text
mask*255
noise*255
ctl(0)/255
val(0,minValue,maxValue)
```

## 15. Minimal native filter JSON

Native v2 filters use four formulas and up to ten controls:

```json
{
  "format": "filter-fab-js",
  "version": 2,
  "mathMode": "float",
  "name": "Example",
  "description": "Inverts the source RGB channels with an adjustable mix.",
  "author": "",
  "formulas": [
    "lerp(r,255-r,ctl(0))",
    "lerp(g,255-g,ctl(0))",
    "lerp(b,255-b,ctl(0))",
    "a"
  ],
  "controls": [
    { "label": "Effect Mix", "value": 255 }
  ]
}
```

Missing control entries are filled to ten controls with value `128`, so existing eight-control files remain valid without migration. The optional top-level `description` is limited to 2,000 characters and defaults to an empty string when absent. Native filter files are limited to 256 KiB.

## 16. Common correctness traps

- In native float filters, `sqr(x)` is square and `sqrt(x)` is square root.
- In historic AFS/legacy filters, both `sqr(x)` and `sqrt(x)` use Filter Factory's integer square-root behavior.
- `lerp()` accepts either normalized opacity (`0..1`) or control-style opacity (`0..255`).
- Noise, gradients, and masks are normalized; multiply by `255` before using them directly as image channels.
- `src()` is nearest/clamped; use `srcLinear()` for smooth subpixel displacement.
- `c` means the current source channel, so the same RGB formula can often be reused across R/G/B.
- Preserve alpha with `a` unless the filter intentionally changes transparency.
- Prefer deterministic `hash2()`/noise functions over `rnd()` for GPU-compatible filters.
- Use `X`, `Y`, and `min(X,Y)` instead of hard-coding image dimensions.
