# Angular-gradient exact directions

`angularGrad(x,y,centerX,centerY,offset)` uses the existing CPU convention:
`dx=x-centerX`, `dy=y-centerY`, and `atan2(dy,dx)/(2*pi)` followed by the
offset and positive modulo one. Positive Y points down the image, so the ray
`(+1,+1)` has a positive one-eighth turn. Offsets with absolute value at most
one are turns; other offsets are divided by 1024. These semantics are unchanged.

## WebGPU correction

The Angular-gradient-specific `ff_angular_turn` helper recognizes exact runtime
axes and diagonals with `x==0`, `y==0`, and `abs(x)==abs(y)`. Nonzero rays return
the binary-representable fractions 0, 1/2, +/-1/4, +/-1/8, and +/-3/8 directly.
The origin retains the existing guarded `ff_atan2` path. Every other direction
retains native `atan2` and division by `FF_TAU`. The offset and `ff_wrap` helper
are unchanged; exact zero, half, and one therefore remain zero, half, and zero.
Positive and negative zero turn representations are equivalent after this wrap.

Native `atan2` on the measured hardware returned a slightly negative error for
the exact ray `(11.5,-11.5)`. With offset 128 this crossed the wrap seam and
produced byte 255 instead of 0. The opposite diagonal produced 127 instead of
128. Exact turn fractions correct both discontinuities without an epsilon,
formula matching, coordinate matching, or tolerance change.

The helper is emitted only for programs containing `angularGrad`. Ordinary
`angle`/`c2d`, their signed-zero metadata, centered-coordinate correction,
global `atan2`, and global wrap logic are unchanged. The CPU evaluator, parser,
angle units, native JSON v2, typed IR, persistence, noise, sampling, fractals,
Online Library, PNG/JSON I/O, and backend selection/fallback are unchanged.

## Measured boundary and limitations

Before implementation, a separate storage-buffer shader tested 952 cases with
integer and half-integer centers, four axis rays, four diagonal rays, magnitudes
0.5/1/10.5/11.5, origin, nearby pixels, arbitrary directions, one-ULP neighbors,
and offsets 0/128/256/512/37/1/-128/0.1. All direction classifications were
correct. All 768 exact-ray and 24 origin cases produced matching CPU bytes.
All 160 near-direction cases retained the native turn bits.

Observed exact nonzero turn bits were `0x3e000000` / `0xbe000000` (+/-1/8),
`0x3e800000` / `0xbe800000` (+/-1/4), `0x3ec00000` / `0xbec00000` (+/-3/8),
and `0x3f000000` (1/2). The hardware sometimes returned `0x80000000` for the
eastward zero turn; the existing wrap produced exact positive zero and matching
bytes. This does not change the separate signed-zero `angle`/`c2d` contract.

Equality applies to the actual f32 inputs. This is not a claim of universal
f64 equivalence for arbitrary input expressions, offsets, or native `atan2`.
In particular, the one-ULP neighbors `(1,1.0000001192092896)` and
`(1,0.9999999403953552)` at offset -128 still exhibit the existing 0/255 seam
differences. They must not be snapped to a diagonal. The focused suite verifies
their turn and wrapped bits are identical to the original native path.

An expanded full-field matrix contains unchanged one-byte native approximation
differences on non-exact rays (for example `(-5.5,-3.5)` produces CPU 151 and
GPU 150 at offset zero). Its full-field byte equality result is 37/84, not
84/84. All 5,327 exact-ray pixels are CPU-exact, and all other pixels retain
the original shader bytes. These checks use no relaxed tolerance.

## Regression coverage and results

- `node tests/angular-gradient-smoke.mjs`: 55,041 raw CPU checks through the
  parser/IR, including offsets, origins, seams, half-byte output and exact wrap.
- `tests/angular-gradient-parity.html`: 546 CPU/WebGPU byte-exact ray fixtures;
  84 fields checking exact rays and unchanged native fallback; 287 raw turn/wrap
  probes including one-ULP near-diagonal controls. The page reports full-field
  byte equality separately.
- Ray fixtures use valid runtime controls for centers 16 and 16.5. Fields use
  image midpoint, integer and control-derived centers across 31x23, 32x24,
  33x25 and 17x17, with offsets 0, 128, 256, 512, 37, 1 and -128.
- The standard WGSL smoke suite imports the focused smoke tests. Build-output
  smoke verifies both deployed and standalone compilers emit the same shader.
- Signed-zero focused hardware: 552/552 exact. Centered-angle hardware:
  224/224 exact and 7/7 coordinate preservation checks.
- Broad hardware: 83/85 before, 84/85 after. Signed-zero, centered angle and
  Angular gradient are all 0 max / 0 mean. Mandelbrot remains 189 / 0.5330.
- Five launch filters remain 5/5 exact: Chromatic Neon Contour, CRT Display,
  Levels / Midtone, Turbulent Displace and Lens Distortion.

## Cost

Measured single-channel shader source for `angularGrad(x,y,X/2,Y/2,128)*255`
grew from 17,043 to 17,511 ASCII bytes (+468, including comments). Source for
`angle(cx,cy)` (17,563), `c2d(x,y)` (17,411), and `r+g` (16,983) was byte-for-byte
unchanged. The extra runtime work is a few exact equality/sign comparisons and
a small branch around native `atan2`; exact rays skip the transcendental call.
There are no additional loops, buffers, dispatches, or texture reads in production.
This is a source/cost review, not a GPU timing benchmark.
