# Stage B completion report — 2.8.5b

Stage B is implemented. Stage C was not investigated or implemented. The revised standalone and static-site builds are ready for manual testing; no commit or push was performed for this stage.

## Implementation

Previously every formula ternary became WGSL `select(falseValue,trueValue,condition)`, allowing both fractal branches to execute. Ternaries with expensive work in either branch now emit an f32 result variable assigned inside actual `if/else` control flow. The compiler keeps nested statements inside their branch and preserves logical short-circuit guards when an `&&` or `||` right operand needs statements. Cheap ternaries retain inline `select()`.

The deterministic, compiler-local classification recognizes Mandelbrot, Julia, FBM, turbulence, ridged noise, Worley F1/F2, convolution aliases, and Sierpiński calls anywhere in a branch subtree. It covers bounded loops and repeated sampling without changing renderer-neutral metadata or GPU compatibility analysis.

Temporary names are unique across the shader. Classification caching only avoids repeating compiler analysis; it does not reuse computed pixel values. Output channels remain independently generated, with explicit regression coverage against cross-channel hoisting.

CPU execution and budgeting are unchanged from Stage A: a select costs its condition plus the maximum branch, with conservative iteration bounds and the same 3,000,000,000-unit guard. The shared 512 ceiling, f32 fractal arithmetic, channel clamping, native JSON v2, typed IR v1, AFS/legacy behavior, cancellation, automatic CPU fallback, and the single-pass architecture are unchanged. Mandelbrot Atlas is unchanged.

## Automated validation

`npm run verify` passes: 30 source/script syntax checks, all 16 Node smoke suites, normal production build, and build-output smoke checks. All 35 built-ins remain GPU-compatible.

The new conditional suite verifies emitted branch structure, nested scopes, boolean and numeric coercion, function arguments, logical short-circuit behavior, unique temporary names, deterministic compilation, unsupported-function rejection, and independent RGBA evaluation. A test-only execution harness runs the emitted scalar/control-flow subset with instrumented real CPU fractal helpers, checking selected calls and numeric results against typed-IR evaluation. This harness is not a substitute for GPU arithmetic validation.

The build checks execute the compiler from both generated artifacts and compare conditional WGSL with the source compiler. The first run of this added check failed because its isolated test context lacked `TextEncoder`; providing the standard encoder/decoder globals fixed the harness. No Node/build failures remain.

## Browser WebGPU validation

The optional browser suite was run on 2026-09-16. All **18 new Stage B fixtures passed with max and mean pixel deltas of zero**, including conditional Mandelbrot/Julia selection, nested ternaries, function arguments, logical guards, and channel-sensitive values at 256/384/512 iterations. The shaders compiled and executed through the WebGPU renderer.

The full suite reports **82/86 passed**. The following four existing fixtures fail on this browser/backend. A separate snapshot of committed 2.8.5 was served and tested: it reports **64/68 passed**, reproducing the same four failures with identical error values.

| Existing fixture | Max byte delta | Mean byte delta |
| --- | ---: | ---: |
| Mandelbrot field | 189 | 0.5330 |
| Centered angle | 128 | 0.1795 |
| Signed-zero angle | 128 | 128.0000 |
| Angular gradient | 255 | 4.3072 |

No tolerance was weakened and no fixture was removed. These baseline numerical discrepancies remain separate follow-up work; Stage B adds no observed hardware parity regression. The optional full hardware suite is therefore not all green, despite all new conditional fixtures and all Node/build checks passing.

## Benchmarks

The optional `?benchmark=1` suite now includes bounded/bounded and early/bounded conditional workloads at 128/256/512 iterations, alongside the existing fractal regions. It reports median render times from three runs after warmup, including dispatch/readback, with no timing pass/fail assertions. Its source is 31×23 with one fractal output channel, so these small measurements cannot establish a general speedup. CPU benchmark implementation and Stage A observations remain unchanged; see [the Stage A report](FRACTAL_STAGE_A.md).

Actual per-pixel branch work is reduced in the generated program, but divergent GPU lanes, driver optimization, workload size, and readback overhead still affect elapsed time. No cross-channel performance benefit is claimed.

The browser benchmark completed all 24 cases. Conditional medians in this run were:

| GPU workload | 128 iterations (ms) | 256 (ms) | 512 (ms) |
| --- | ---: | ---: | ---: |
| Bounded / bounded branches | 4.0 | 3.9 | 3.1 |
| Early-escape / bounded branches | 2.9 | 3.0 | 2.9 |

The non-monotonic results at this small size are consistent with overhead and timing noise dominating iteration cost; no before/after speedup claim is inferred.

## Manual test targets and follow-up

Run `npm run dev` and open `/dist/filter-fabjs-v2.8.5b.html` over localhost. Check the version in the UI and diagnostics, then test CPU and WebGPU with this channel formula:

```text
(x<X/2 ? mandelbrot(cx*1.5-0.5,cy,512) : julia(cx,cy,-0.8,0.156,512))*255
```

Check both halves, nested ternaries, alpha, source-sensitive `c`/`z` formulas, cancellation, fallback diagnostics, and PNG/filter export. Inspect generated WGSL for scoped `ff_branch_*` assignments; cheap formulas such as `x<X/2?0:255` should still use `select()`.

Use `/tests/webgpu-parity.html` for parity and append `?benchmark=1` for console timing tables and JSON. Repeat representative checks on the intended browser/GPU, with the four documented baseline differences in mind. Investigate those numerical differences separately without changing formula semantics as part of this release. Stage C requires a separate instruction after this manual review.

## Files changed

- Compiler: `src/gpu/wgsl-compiler.js`.
- Tests: new `tests/wgsl-conditional-smoke.mjs`; updated `tests/fractal-fixtures.js`, `tests/webgpu-parity.js`, `tests/webgpu-parity.html`, `tests/build-output-smoke.mjs`, and `tests/library-browser.js`.
- Version and test command: `package.json`, `index.html`, `src/app/filter-fab-app.js`.
- Documentation: `CHANGELOG.md`, `README.md`, `docs/ARCHITECTURE.md`, `docs/FORMULA_REFERENCE.md`, `docs/FILTER_AUTHORING.md`, `docs/FILTER_LIBRARY.md`, `docs/PROJECT_STATUS.md`, this report.
- Generated output: `dist/filter-fabjs-v2.8.5b.html`, `dist/site/index.html`, `dist/site/assets/app.95f791c0c135.js`. Normal build generation replaces the old standalone and JavaScript fingerprint; CSS is unchanged.

Pre-existing local changes in `custom_filters/`, `AGENTS.md`, `filters/`, and `tmp/` are excluded from the release changes.
