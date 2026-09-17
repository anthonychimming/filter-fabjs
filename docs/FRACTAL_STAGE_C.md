# Stage C completion report — 2.8.5c

Stage C is implemented as a bounded GPU field-sharing pass. Source, automated tests, documentation, and generated site/standalone output are complete for manual review. No commit or push was performed for this stage.

## Investigation and implementation decision

The Stage B compiler already supports statements before the four output expressions. A small compiler-local prepass can therefore introduce shared f32 fields without redesigning expression lowering, rendering, or persistence. The production change is confined to `src/gpu/wgsl-compiler.js` (39 added and two replaced lines); no runtime dependencies or new renderer modules were needed.

The pass interns exact structural signatures using child IDs, then finds eligible calls used unconditionally in at least two distinct output channels. A signature includes operation, type, identifier/operator/function, constant value with signed-zero distinction, and argument order. No algebraic equivalence, formula string matching, or preset identifiers are involved. Signature storage is proportional to the existing bounded IR; candidate sorting orders dependencies before parents. The existing 4,096-node GPU limit is checked before this work and is not relaxed.

Only these call roots are candidates: `mandelbrot`, `julia`, `fbm`, `turbulence`, `ridged`, `worleyF1`, and `worleyF2`. Their entire subtrees must be deterministic, supported, and independent of the output channel. Dependencies on `c`, `c0`, `c1`, `z`, `p`, or implicit-channel convolution block sharing. Fixed-channel source reads can qualify because the source is immutable. Unsupported/stateful operations remain CPU-only.

The compiler emits dependency-ordered `let ff_shared_*:f32` declarations and reuses them in output expressions. This is restricted field sharing, not general CSE. Cheap wrappers remain separate. Calls repeated in only one channel, calls with different arguments, and branch-only calls are not candidates.

Regression risk is concentrated in channel dependence and moving conditional work. The implementation conservatively treats both ternary branches and logical right operands as guarded, even when a condition is constant. They cannot establish sharing eligibility. Conditions and logical left operands can qualify. If two unconditional channels already require a field, a guarded occurrence can reuse that result without introducing new work. Nested lazy arguments remain scoped through Stage B's statement capture.

GPU measurements below demonstrate a material benefit on heavy workloads, so this small implementation was retained. Broader branch-local sharing and algebraic optimization remain outside this change.

## Behavior before and after

- GPU fields: an eligible identical RGB field previously generated three calls; it now generates one shared declaration feeding all three palettes.
- GPU ternaries: Stage B's scoped `if/else` remains intact. Branch-only expensive calls remain guarded and separate; cheap ternaries retain `select()`.
- CPU evaluation and budgeting: unchanged. CPU output channels still evaluate independently. Iteration-aware bounds, conservative unknown/legacy fallback, lazy ternary estimates, and the 3,000,000,000 work-unit guard are preserved. GPU sharing never reduces CPU budget estimates.
- Mandelbrot Atlas and Fractal Clouds benefit automatically, without preset changes. Atlas's generated shader shrinks from 18,024 to 17,572 characters and its main function contains one Mandelbrot call. Fractal Clouds shrinks from 17,406 to 17,284 characters with one FBM call. Unrelated presets have no qualifying fields under this scope.

## Validation

`npm run verify` passed all 30 source/script syntax checks, all **17 Node smoke suites**, production build generation, and build-output checks. `git diff --check` passed. All 35 built-ins remain GPU-compatible.

New regressions cover all seven candidate functions, structural distinctions, signed zero, implicit and explicit channel dependencies, unsupported/stateful calls, branch-only exclusion, nested dependencies, guards, resource bounds, stable code generation, unchanged IR/key metadata, and Atlas compilation. An instrumented scalar execution harness uses real CPU intrinsic helpers to compare all output channels and verify one execution for shared fields. Both generated artifacts are loaded in isolated runtimes and must generate the same shared-field WGSL as the source compiler.

The first focused compiler run found an existing assertion that searched only the final output assignment for an intrinsic call. Its search was updated to include the shared declarations in `main`; the call requirement remains enforced. No Node/build failures remain.

The browser's Stage C suite passed **18/18 fixtures**, with zero shared/unshared GPU differences and zero CPU/GPU differences on every fixture. These include all seven field functions, 128/256/512 fractals, channel-dependent exclusions, channel-sensitive palettes, nested fields, nested lazy arguments, and guarded reuse. The shaders compiled and executed through WebGPU. Every paired benchmark render also matched the unshared GPU output exactly.

The existing full browser parity suite remains **82/86**, with the same four failures and error values documented and reproduced on the 2.8.5 baseline during Stage B:

| Existing fixture | Max byte delta | Mean byte delta |
| --- | ---: | ---: |
| Mandelbrot field | 189 | 0.5330 |
| Centered angle | 128 | 0.1795 |
| Signed-zero angle | 128 | 128.0000 |
| Angular gradient | 255 | 4.3072 |

No fixture or tolerance was removed or weakened. The full optional hardware suite is not all green; no new parity failure was observed.

## Paired GPU benchmark observations

Measured on 2026-09-16 using `tests/webgpu-sharing.html?benchmark=1`: 512×384 pixels, the same field feeding three different RGB scales, one warmup per variant, then medians of seven runs in alternating order. Each timing includes dispatch and readback; shader compilation is warmed and both variants use pipeline caches. The unshared reference uses the same compiler lowering while skipping only the sharing prepass, through a test-only renderer subclass. There is no production optimization toggle. Timings have no pass/fail threshold.

Each entry below is **unshared → shared milliseconds**:

| Workload | 128 iterations | 256 iterations | 512 iterations |
| --- | ---: | ---: | ---: |
| Mandelbrot early escape | 3.4 → 3.5 | 3.3 → 3.9 | 3.4 → 3.5 |
| Mandelbrot boundary | 4.9 → 3.3 | 7.5 → 4.1 | 9.0 → 4.8 |
| Mandelbrot interior | 4.9 → 3.5 | 8.3 → 4.4 | 14.5 → 5.9 |
| Julia interior | 5.0 → 3.2 | 7.7 → 3.9 | 13.0 → 5.7 |

The 512-iteration interior cases improved by approximately 2.46× for Mandelbrot and 2.28× for Julia on this backend. Early escape showed no benefit and some noisy regressions at these small elapsed times. These observations justify sharing heavy repeated loops; they are not universal browser/GPU speed guarantees. CPU benchmark code and behavior were not changed; the existing 128/256/512 CPU observations remain in [the Stage A report](FRACTAL_STAGE_A.md).

## Compatibility and manual test targets

The shared 512 ceiling, f32 fractal arithmetic, numeric coercions, channel clamping, native JSON v2, v1/v2 import, AFS/legacy behavior, typed IR v1, control storage, automatic CPU fallback, cancellation, shader/pipeline budgets, and single-pass architecture are unchanged. This release adds no formula identifiers, new document schema, general-purpose loops, intermediate textures, or deep-zoom subsystem.

Run `npm run dev` and open `/dist/filter-fabjs-v2.8.5c.html` over localhost. Check Mandelbrot Atlas and Fractal Clouds at defaults and control extremes on CPU and WebGPU. For a direct sharing check, use these R/G/B formulas and alpha `a`:

```text
mandelbrot(cx*1.5-0.5,cy,512)*255
mandelbrot(cx*1.5-0.5,cy,512)*128
mandelbrot(cx*1.5-0.5,cy,512)*64
```

Inspect generated WGSL for one `ff_shared_*` field feeding all three outputs. Then check a field depending on `c` or `z`, which must stay separate, and the Stage B conditional Mandelbrot/Julia formulas, whose branches must stay lazy. Check alpha, cancellation, fallback reasons, controls, and PNG/filter import/export.

Use `/tests/webgpu-sharing.html` for the new differential/CPU parity suite, add `?benchmark=1` for paired timing measurements, and use `/tests/webgpu-parity.html` for the full suite. Recommended follow-up is manual testing on the intended browser/GPU and a separate investigation of the four existing numerical discrepancies. Broadening sharing to branch-only work would require a separate dominance/guard design and is not included.

## Files changed

- Compiler: `src/gpu/wgsl-compiler.js`.
- Tests: new `tests/wgsl-sharing-smoke.mjs`, `tests/webgpu-sharing.html`, `tests/webgpu-sharing.js`; updated `tests/wgsl-compiler-smoke.mjs`, `tests/wgsl-conditional-smoke.mjs`, `tests/build-output-smoke.mjs`, `tests/library-browser.js`.
- Version/test command: `package.json`, `index.html`, `src/app/filter-fab-app.js`.
- Documentation: `CHANGELOG.md`, `README.md`, `docs/ARCHITECTURE.md`, `docs/FORMULA_REFERENCE.md`, `docs/FILTER_AUTHORING.md`, `docs/FILTER_LIBRARY.md`, `docs/PROJECT_STATUS.md`, this report.
- Generated artifacts: `dist/filter-fabjs-v2.8.5c.html`, `dist/site/index.html`, `dist/site/assets/app.183263cae1bd.js`. The normal build replaced the previous standalone and JavaScript fingerprint; CSS is unchanged.

Pre-existing changes in `custom_filters/`, `AGENTS.md`, `filters/`, and `tmp/` were left untouched.
