# Fractal refinement Stage A — 2.8.5

Stage A is complete. Stage B GPU conditional lowering and Stage C cross-channel common-subexpression work were neither investigated nor implemented, as requested. The generated GPU ternary remains `select(falseValue,trueValue,condition)`, with potentially eager branch evaluation, and channels remain separately generated.

The shared ceiling is now 512. CPU budgeting reads conservative bounds from typed IR, accounts for f32 rounding before iteration truncation, counts nested arguments, and charges the condition plus the more expensive ternary branch. The 3,000,000,000 work-unit guard remains unchanged. Unknown expressions and legacy math use the full ceiling.

| Fractal iteration expression | Previous loop cost | New loop cost |
| --- | ---: | ---: |
| `128` | 256 | 128 |
| `val(3,32,256)` | 256 | 256 |
| `val(3,32,512)` | 256 | 512 |
| Unknown dynamic expression | 256 | 512 |
| `9999` | 256 | 512 |

These are loop weights, excluding argument and surrounding expression costs. Ternaries previously summed both branches; they now take their maximum, matching CPU execution. This lets Pop Print Quad run at 1800×1800 within the existing budget (2,349,000,000 units). Three independently evaluated 512-iteration channels can still exceed that budget on large images; a higher ceiling is not a promise that every worst-case workload fits.

Mandelbrot Atlas remains unchanged: its established 24–192 iteration control and normalized square-root palette preserve the default appearance. Increasing its existing iteration control can still recolor already-escaping regions. A fixed escape-count palette would materially change its established control behavior, so only authoring guidance was added.

## Validation

On 2026-09-16, `npm run verify` passed syntax checks, all 15 Node smoke suites, the production build, and build-output smoke checks. New tests cover the shared ceiling, CPU/WGSL clamps, historical f32 results at 1/24/64/128/192/256, 257/384/512 and above-ceiling values, control bounds, unknown fallback, nested ternary accounting, legacy conservative budgeting, and unchanged budget enforcement. All 35 built-ins compile as GPU-compatible programs; CPU default/extreme-control checks pass.

The first focused CPU suite exposed its old expectation that Pop Print Quad must exceed the maximum-size CPU budget. That assertion was updated for the intended lazy-branch behavior; the six remaining expensive built-in rejection cases are retained. No outstanding automated test failures remain.

Actual hardware WebGPU parity and driver shader validation were not run. WGSL generation tests pass, and the optional hardware suite now includes early escape, slow escape, bounded points, and requests above 512 for both intrinsics without changing its existing tolerance. Manual visual and hardware checks remain the next step.

## CPU benchmark observations

`npm run benchmark:fractal` passed deterministic-output checks on Node 22.17.0. Each measurement is a median of three worker-reported render times after warmup, for a 64×64 image with one fractal output channel. Timings exclude worker startup and have no pass/fail thresholds.

| Workload | 128 iterations (ms) | 256 (ms) | 512 (ms) |
| --- | ---: | ---: | ---: |
| Mandelbrot early escape | 3.66 | 1.95 | 1.76 |
| Mandelbrot boundary | 7.67 | 12.10 | 19.97 |
| Mandelbrot interior | 8.00 | 13.65 | 24.32 |
| Julia early escape | 3.24 | 2.00 | 2.03 |
| Julia boundary | 6.12 | 7.88 | 8.92 |
| Julia interior | 7.64 | 13.34 | 24.25 |

Early escape avoids most loop work; small timing differences include runtime warmup/noise. Interior workloads scale strongly with the iteration limit. Static budgeting intentionally does not discount early escape. No GPU timing claims are made.

## Compatibility and manual testing

Requests at or below 256 retain their earlier arithmetic. Existing requests above 256 now execute up to 512, which can change normalized colors and render time. Native JSON v2, v1/v2 import, AFS, typed IR v1, f32 fractal arithmetic, cancellation, CPU fallback, and the single-pass architecture are preserved.

Run `npm run dev` and test both the source app and `/dist/filter-fabjs-v2.8.5.html` over localhost. Check Mandelbrot Atlas at defaults, then custom Mandelbrot/Julia formulas at 128/256/384/512/9999 on CPU and WebGPU. Check cancellation, fallback diagnostics, PNG export, and filter reimport. Use `/tests/webgpu-parity.html` for hardware parity, or `/tests/webgpu-parity.html?benchmark=1` for additional console timings at 128/256/512. The optional GPU benchmark uses the parity page's 31×23 source and includes readback, so its timings are not directly comparable to the CPU table.

Stage B/C require a separate instruction after manual review.

## Changed files

- Engine: `src/core/formula-language.js`, `src/renderers/cpu-renderer.js`, new `src/renderers/ir-numeric-bounds.js`.
- Version/build wiring: `package.json`, `index.html`, `src/app/filter-fab-app.js`, `scripts/build.mjs`.
- Tests/benchmarks: new `tests/fractal-smoke.mjs`, `tests/fractal-fixtures.js`, `tests/fractal-benchmark.mjs`; updated `tests/core-smoke.mjs`, `tests/cpu-renderer-smoke.mjs`, `tests/build-output-smoke.mjs`, `tests/webgpu-parity.js`, `tests/library-browser.js`.
- Documentation: `CHANGELOG.md`, `README.md`, `docs/ARCHITECTURE.md`, `docs/FORMULA_REFERENCE.md`, `docs/FILTER_AUTHORING.md`, `docs/FILTER_LIBRARY.md`, `docs/PROJECT_STATUS.md`, this report.
- Generated artifacts: `dist/filter-fabjs-v2.8.5.html`, `dist/site/index.html`, and the fingerprinted JavaScript asset. The normal build replaces the previous 2.8.4 standalone and obsolete JavaScript fingerprint; CSS content is unchanged.

Pre-existing workspace changes in `custom_filters/`, `filters/`, `tmp/`, and `AGENTS.md` were left untouched. No commit, branch, push, or GitHub action was performed.
