# GPU angle zero-sign compatibility

`c2d(X,Y)` and `angle(X,Y)` use the CPU float semantics of
`Math.atan2(Y,X)*1024/(2*Math.PI)`. In particular, their origin results for
`(X,Y)=(+0,+0),(-0,+0),(+0,-0),(-0,-0)` are `+0,+512,-0,-512`.
On the negative X axis, the sign of zero Y selects `+512` or `-512`.

Some WebGPU compilers canonicalize floating zero signs, including constant
bitcasts. `src/gpu/angle-sign.js` therefore lowers angle arguments with a
GPU-local boolean semantic sign. It does not change the typed IR or file format.
The scalar result still uses the existing arithmetic/helper implementation.
Only angle arguments and their dependencies receive companion sign expressions.

- Literal and statically known arithmetic signs use JavaScript numbers and
  `Object.is(value,-0)` before WGSL serialization.
- Unary negation flips the sign. Multiplication and nonzero division use sign
  XOR. The language's zero-divisor guard returns semantic positive zero.
- Zero addition is negative only for two negative zeros; zero subtraction is
  negative only for negative zero minus positive zero. Remainder follows the
  dividend sign unless the divisor is zero.
- Conditional payloads and signs stay together inside the selected branch.
  Expensive branch work remains lazy.
- Calls have explicit zero-sign rules derived from the CPU evaluator. Runtime
  control signs are read from stored bits before arithmetic. A new function
  without a reviewed rule fails closed instead of assuming positive zero.
- A nested angle carries Y's semantic sign to its consumer. Its physical float
  is allowed to be positive zero. Top-level byte output needs no companion
  result sign.

`ff_angle` handles zero Y and zero X with the supplied signs and retains native
`atan2` for ordinary nonzero inputs. The direction variable and `angularGrad`
retain their existing helper. For angle arguments, exact centered coordinates
are handled by the [scoped centered-angle correction](centered-angle.md).
This does not repair gradient seams, general f32 underflow/precision differences,
or fractal parity.
No buffers, textures, dispatches, loops, renderer layouts, or CPU semantics change.

Run `node tests/signed-zero-angle-smoke.mjs` for raw CPU and codegen regression
coverage (also included in `npm test`). With `npm run dev`, open
`http://localhost:8080/tests/signed-zero-angle-parity.html` for exact hardware
checks. The focused page encodes both angle magnitude and a nested sign-sensitive
consumer; clamping cannot hide a lost negative zero. The independent broad suite
remains at `tests/webgpu-parity.html` with its original fixtures and tolerances.
