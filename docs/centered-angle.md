# Exact centered coordinates in angle inputs

The CPU's `cx` and `cy` are exactly positive zero at an odd image dimension's
center pixel. WebGPU's existing normalized-coordinate calculation can instead
leave a tiny residual. For example, at `(15,11)` in a 31×23 image, GPU `cx` was
`-5.960464477539063e-8`. That changed `angle(cx,cy)` from zero to a half turn.

When lowering an explicit `angle` or `c2d` argument, the compiler uses integer
pixel coordinates and image dimensions to recognize `2*pixel == size-1`. At that
coordinate only, it supplies zero and a positive semantic sign. It retains the
original f32 value everywhere else. Even dimensions cannot satisfy the equality;
one-pixel dimensions correctly produce zero. There is no epsilon or floating
comparison used to recognize the center.

The correction follows the existing angle sign-lowering path through unary
`+`/`-`, arithmetic `+`/`-`/`*`/`/`/`%`, and selected value branches. This covers
`angle(cx+0,cy)`, `angle(cx,cy*1)`, and scaled or negated coordinates without
symbolic simplification. A nonzero offset such as `cx+0.000000001` is still added
after correcting the underlying center; it is not snapped to zero. Negation
retains semantic negative zero through the existing sign metadata.

Other function calls and boolean/condition expressions are boundaries for this
correction. For example, `angle(sin(cx),cy)` keeps the original coordinate inside
`sin`, and `angle(cx==0,cy)` keeps the original comparison. An explicit nested
angle establishes its own correction scope. This is deliberately not a promise
of exactness for every expression mathematically derived from centered inputs.

The shared `cx`/`cy` definitions remain unchanged. Fractals, noise, sampling,
masks, and other coordinate consumers retain their existing values, including
when they share a shader with an angle expression. This is GPU-local codegen:
CPU evaluation, syntax, IR, formats, angle units, and renderer layout are unchanged.

The alternative `(2*pixel-(size-1))/(size-1)` corrected centers but changed many
non-center f32 bit patterns in hardware diagnostics, including endpoints.
Keeping the old value except at the exact integer center avoids that change.
The emitted correction adds one integer equality and one WGSL `select` per
lowered centered-coordinate occurrence, with no extra buffers, dispatches,
texture reads, loops, or control-flow branches.

Run `node tests/centered-angle-smoke.mjs` (also included in `npm test`), and open
`http://localhost:8080/tests/centered-angle-parity.html` after `npm run dev`.
The browser suite observes the production lowering's coordinate values/signs
and checks all non-center coordinate bits, plus CPU/GPU angle output across odd,
even, and one-pixel dimensions. Signed-zero regressions remain covered separately
by `tests/signed-zero-angle-parity.html`. Broad hardware tolerances are unchanged.
