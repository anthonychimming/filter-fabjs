# Gate 3R hardware parity remediation

This report records the initial remediation review. The final numerical acceptance check is documented separately.

**Recommendation: hold combined Gate 3 acceptance.** Both original production reproductions are fixed on the Intel Iris Xe. The hue sector result is exact across the entire admitted byte RGB domain on this adapter. The rounded-box correction removes the documented 0.05 px error, but sufficiently close to an edge the Worker and GPU can still emit opposite hard-fill bytes. Accepting those pixels needs an explicit numerical policy.

| Function | Hardware decision | Basis |
|---|---|---|
| `hue1024()` | **PASS** | All 16,777,216 RGB triples reconstructed the mathematical sector. The continuous byte-wheel maximum remained 0.000080902 angle units. |
| `sdfRoundedBox()` | **FAIL for unconditional hard-fill parity** | The documented pixel, its three neighboring controls and the original 7,160-vector numerical test pass. Eight of 33 additional adversarial widths still flipped coverage within 0.000123 px of an edge. |

## Revisions and scope

The separate local branch `fix/gate3r-parity` starts at `83c2677fa37ba07af5cfdf320ae935c400fa9aac`. The original Gate 3 report and `Gate3-hardware-evidence-83c2677.zip` supplied the fixtures, seeds, controls, references and thresholds. The archive SHA-256 is `02db29b57b94fe986237ec46e4ec3c8d2f66d1e046b670b16a68972efc93c203`. Revision 1.3 of the specification has SHA-256 `36ffbdee3a026dc3171d1d3163971262b109053cfc66da504613401614da7452`.

| Changed source or test | Change |
|---|---|
| `src/gpu/wgsl-compiler.js` | The generated `ff_rounded_box` and `ff_hue1024` helper bodies. |
| `src/renderers/cpu-worker-source.js` | Exact cardinal orientations inside `roundedBoxDistance`. |
| `tests/sdf-rounded-box-smoke.mjs` | Signed zero on rotated segments and arc boundaries, and the documented exterior distance. |
| `tests/procedural-hard-boundaries.js` | Shared browser regression for the exact production hard-fill pixel and known integer hue sectors. |
| `tests/webgpu-parity.js` | Runs the new regression through both production renderers before the existing fixture set. |

The hardware readbacks used headless Chrome 157.0.8103.51 on Windows and the Intel gen-12lp adapter, with `isFallbackAdapter=false`. Chromium identified Iris Xe Graphics, driver 30.0.100.9864. The fresh compute checkpoint returned 7, 8, 11 and 16. All device results below come from actual dispatch and buffer readback. The comparison shaders were generated from the production compiler. Scalar tests also executed the Worker and an independent geometric or color-wheel oracle.

## Rounded-box rotation

At 4001 × 1, take the red channel at x = 3000, y = 0, with control 0 = 254.9375. The formula supplies its own y coordinate of 1000.

```text
255*sdfFill(sdfRoundedBox(x,1000,0,0,5945.71044921875,6000,10,ctl(0)*4))
```

| Analytic signed distance (px) | Worker byte | Baseline GPU | Corrected GPU |
|---:|---:|---:|---:|
| +0.0500477934 | 0 | 255 | 0 |
| +0.0100087309 | 0 | 255 | 0 |
| −0.0100108004 | 255 | 255 | 255 |
| −0.0500498629 | 255 | 255 | 255 |

The baseline shader used native sine and cosine after conversion to radians. In the Gate 3 worst-rotation probe, the GPU cosine was 0.9996724725 against 0.9997008831 in double precision. The rotated local x moved by approximately 0.106 px. Reducing to the nearest quarter-turn while retaining native trigonometry left the documented pixel at 255 and produced 199 scalar threshold exceedances.

The final shader reduces the angle in native units: choose the nearest multiple of 256, convert the residual to radians and swap the absolute local axes for odd quarter-turns. Over the resulting interval [−π/4, π/4], it evaluates the degree-9 sine and degree-10 cosine Taylor polynomials in Horner form. Each real-arithmetic truncation error is below 2 × 10⁻⁹ before f32 evaluation. At a cardinal angle the residual is exactly zero. The Worker handles multiples of 256 by retaining or exchanging the axes directly, avoiding f64 sine/cosine residue at exact faces and segments. The signed-distance expression, the Worker’s invalid sentinel of 1e20, and the existing hard-fill and box functions retain their contracts.

| 7,160 distances, absolute error against the independent reference (px) | Median | P95 | P99 | Maximum | Above original threshold |
|---|---:|---:|---:|---:|---:|
| Baseline | 0.00001928 | 0.0003897 | 0.04082 | 0.1120553 | 198 |
| Remediated | 0.00001454 | 0.0002496 | 0.0003838 | 0.00097336 | 0 |

The original batch includes rotated, reflected, translated and degenerate cases, thin boxes, negative and clamped radii, a 2,501-point grid, and 4,096 seeded random vectors. Worker and GPU agreed on every sign and zero classification in the batch. The unchanged double-precision reference still reports 12 positive residues (1.71–3.56 × 10⁻¹⁵ px) on exact cardinal segments and 6–8–10 arc boundaries. Both renderers now produce valid zero for all 12. The 21 separate reference vectors had maximum device error 0.000002145 px. The original investigation threshold was `max(0.0001, 8 × 2^-23 × S)`, with S the largest absolute coordinate, center or dimension, bounded below by 1.

### Remaining hard-edge behavior

The supplemental production sweep used the nearest f32 width to the mathematical boundary and its two adjacent f32 widths at each of 11 rotations. Eight of 33 pixels were mathematically outside and changed from Worker 0 to GPU 255. Their exterior distances ranged from 0.0000152232 to 0.0001227931 px. Two occurred at the nearest width and six at its immediately lower f32 neighbor (corrected during the final audit). For example, rotation 128 and width 5656.85400390625 placed the point at +0.0001227931 px. The original 0.05 px failure is well outside this observed band. The maximum from this sweep is empirical.

Loss of input precision alone can also change a pixel. With zero rotation, x = 3000, height 2 and radius 0, the production analyzer admitted widths 5999.9999, 6000 and 6000.0001. All three reached WGSL as 6000. GPU classified all three as a covered boundary. The Worker classified them as exterior, boundary and interior respectively. Even a perfectly evaluated trigonometric function cannot recover that distinction from the uploaded or compiled f32 value.

At radius zero, the original `sdfBox` and the corrected `sdfRoundedBox` now differ at one of the 4,001 pixels in the Gate 3 control. The old function still emits 255 at x = 3000 and the corrected function emits the analytic 0. Revision 1.3 specifies mathematical equivalence for radius zero and calls out tight-boundary differences.

**Proposed acceptance rule for review.** Keep the original scalar investigation threshold and require exact results for the named reproduction, exactly representable cardinal boundary fixtures and complete-filter hard-edge fixtures. For any other changed hard classification, log the coordinate, both outputs and a separate reference distance. Permit an exception only if the reference is within one local-coordinate f32 ULP of the boundary and the scalar error meets the existing threshold. Compute that ULP as `2^(floor(log2(L))−23)`, with `L=max(1, |localX|, |localY|, |width|/2, |height|/2)` from the double-precision reference. Any larger discrepancy fails. Apply this test to each discrepancy independently and retain the 255-level flips in the results. It is a review criterion, not a runtime epsilon or an accuracy guarantee across devices. Until approved, the rounded-box decision above stands.

## Hue sectors and continuous accuracy

In the original production shader, pure yellow followed the correct channel-tie branch. The division and angle scaling produced 170.66665649414062, below 1024/6. The Worker and original six-sector recipe returned sector 1; `floor(hue1024(r,g,b)*6/1024)` on the baseline GPU returned 0. With the fix the GPU returns 170.6666717529297 and reconstructs sector 1. Both copies of the yellow endpoint on the 1,536-pixel wheel now pass.

After the existing exact-gray check, the shader recognizes exact pairwise channel ties and returns the least f32 angle at or above the corresponding mathematical boundary.

| Red | Yellow | Green | Cyan | Blue | Magenta |
|---:|---:|---:|---:|---:|---:|
| 0 | 170.6666717529296875 | 341.333343505859375 | 512 | 682.66668701171875 | 853.3333740234375 |

Unequal RGB triples follow the existing continuous computation. No hue epsilon is applied. The global floor operation, native-only validation and GPU producer admission retain their original implementations. An independent integer channel-order oracle checked the production floor expression for all 256³ byte triples, including all ties, gray values, one-code-step near-grays and both sides of red wraparound. Sector mismatches: **0**.

| Scalar test | Samples | Maximum circular error (angle units) | Result |
|---|---:|---:|---|
| Admitted byte wheel and all gray values | 1,792 | 0.000080902 | Zero over 0.001, out-of-range values or erroneous grays |
| Fractional diagnostic wheel | 1,536 | 0.000040690 | Zero over 0.001 |
| Near-gray diagnostic inputs | 3 | 341.333333 | One subnormal green channel flushed to zero on-device; these fractional producers are outside GPU admission |

The fractions for sectors 1, 2, 4 and 5 have denominator 3 and cannot be represented exactly in binary32. For magenta, flooring a host-rounded nearest f32 angle in double arithmetic still produces a different value from the mathematical sector. This accounts for two duplicate byte-wheel diagnostics and one fractional-wheel diagnostic; the GPU production floor returns the correct 5. The data establish the stated reconstruction for admitted bytes and the tested expression on this device. Precision loss, a different sequence of arithmetic operations, or fractional research inputs can produce different discrete results.

## Regression and operational checks

| Check | Actual result |
|---|---|
| Fresh `npm run verify` | **PASS, exit 0.** The full test group finished in 559.78 s. Syntax checks, tests, the build and standalone/site build-output smoke passed. |
| Focused rounded-box and hue suites | **PASS, both exit 0.** The Worker geometry grid had maximum error 3.55 × 10⁻¹⁵ px. The focused hue oracle had maximum circular error 0; all six 64 × 64 color recipe comparisons were byte-identical. |
| Offline WGSL validation | All three exported complete-filter shaders passed Naga. Chrome also created actual compute pipelines and rendered them. |
| Browser parity page | Baseline **82/83**, remediated **83/84**. The added exact-boundary regression passed. The existing Mandelbrot field failed both runs with identical maximum byte Δ 189 and mean Δ 0.5330. |
| GPU admission and fallback | The 32,768-pixel axis passed, 32,769 fell back, and a previously warmed plan refused the unsafe source. The 160-pixel thumbnail was eligible. NaN, infinity, −1 and 256 in the required radius control slot fell back; valid 0 and 127.5 ran on GPU. The unproved hue producer, legacy mode and `pow` used CPU. |
| Source, device and cancellation | Stale-source work rejected with `RenderCancelledError`; eligible cached analysis remained reusable. Explicit device destruction recovered on GPU and simulated API absence selected CPU. Cancelling a submitted 8 MP readback advanced device generation from 1 to 2; the replacement 1 × 1 source returned [255, 255, 0, 123]. Budget refusal left the GPU failure quarantine empty. |

## Complete-filter comparisons

The Gate 3 source and formula hashes matched at all three sizes. Each row aggregates preset, neutral, alternate and maximum controls. GPU columns compare the shipping recipe with the substitution in the final build. Worker deltas compare substituted GPU and Worker. Changed counts sum channel bytes across the four frames.

| Filter | MP | Original vs substituted GPU, changed bytes | Max byte Δ | Substituted GPU vs Worker, changed bytes | Max byte Δ |
|---|---:|---:|---:|---:|---:|
| Uniform Rounded Inset Border | 1 | 0 | 0 | 1,093 | 1 |
| Uniform Rounded Inset Border | 4 | 0 | 0 | 2,807 | 1 |
| Uniform Rounded Inset Border | 8 | 0 | 0 | budget refusal | — |
| Photoshop-Style Hue/Saturation | 1 | 5 | 1 | 17 | 1 |
| Photoshop-Style Hue/Saturation | 4 | 16 | 1 | 43 | 1 |
| Photoshop-Style Hue/Saturation | 8 | 11 | 1 | budget refusal | — |
| Photoshop Style Vibrance | 1 | 0 | 0 | 76 | 1 |
| Photoshop Style Vibrance | 4 | 0 | 0 | 582 | 1 |
| Photoshop Style Vibrance | 8 | 4 | 1 | budget refusal | — |

Across the 20 admitted original/substituted Worker pairs, 0 channel bytes differed, with maximum Δ 0.

All 12 full-frame border sign comparisons agreed with the independent reference. Color alpha passthrough changed 0 bytes. The 4 MP original border exceeded the CPU budget; the substituted border ran. Both versions of both color filters ran on the Worker at 4 MP. All six full-filter Worker programs were refused at 8 MP by the original 3-billion-unit guard. The identity control ran on both backends at each size. All available per-setting error histograms matched Gate 3.

A separate paired run compared the same substituted programs directly between Gate 2 and Gate 3R, using the Gate 3 wheel-stripe source. Across 36 GPU filter/size/control comparisons, 0 packed bytes changed. The eight-bit deltas in the table above describe comparisons between recipes or renderers.

## Paired performance

Warm elapsed wall-clock milliseconds include dispatch, synchronization and readback. Both revisions saw the same source, formulas and preset controls. After four warm-up control pairs, the dedicated run alternated revision order for 12 observations per revision in each of three blocks per GPU workload. The Worker control used eight pairs at 256 × 256. The dedicated run followed the full-filter and verification workloads.

| Workload | MP or Worker size | Gate 2 median ms | Gate 3R median ms | Median change | Block changes |
|---|---:|---:|---:|---:|---|
| Uniform Rounded Inset Border | 1 | 5.20 | 5.20 | +0.0% | +6.1% / -2.0% / -6.8% |
| Photoshop-Style Hue/Saturation | 1 | 5.10 | 4.70 | -7.8% | -2.9% / -13.2% / +2.2% |
| Photoshop Style Vibrance | 1 | 4.95 | 4.80 | -3.0% | +1.1% / -6.9% / +3.1% |
| Unchanged Hue/Saturation | 1 | 4.45 | 4.65 | +4.5% | +25.6% / +4.4% / -11.3% |
| Runtime-rotated hard fill | 1 | 4.55 | 4.55 | +0.0% | +9.3% / +3.6% / -2.2% |
| Uniform Rounded Inset Border | 4 | 10.00 | 10.20 | +2.0% | +4.0% / +4.5% / +0.0% |
| Photoshop-Style Hue/Saturation | 4 | 10.60 | 10.70 | +0.9% | +7.1% / -2.4% / -4.7% |
| Photoshop Style Vibrance | 4 | 9.50 | 9.65 | +1.6% | -5.6% / -1.1% / -2.2% |
| Unchanged Hue/Saturation | 4 | 8.65 | 8.80 | +1.7% | -3.3% / +0.0% / +6.4% |
| Runtime-rotated hard fill | 4 | 8.00 | 7.90 | -1.3% | -2.6% / +2.6% / +3.5% |
| Uniform Rounded Inset Border | 8 | 17.15 | 17.60 | +2.6% | +0.6% / -3.8% / +10.5% |
| Photoshop-Style Hue/Saturation | 8 | 15.80 | 15.85 | +0.3% | +4.1% / -2.8% / -1.0% |
| Photoshop Style Vibrance | 8 | 16.00 | 16.05 | +0.3% | +1.4% / +2.9% / +2.3% |
| Unchanged Hue/Saturation | 8 | 14.35 | 14.45 | +0.7% | +3.5% / +1.1% / -1.7% |
| Runtime-rotated hard fill | 8 | 13.85 | 14.05 | +1.4% | +3.7% / -3.5% / -0.3% |
| Uniform Rounded Inset Border | 256 × 256 | 1073.60 | 1041.80 | -3.0% | -3.0% |
| Unchanged Hue/Saturation | 256 × 256 | 1181.25 | 1162.45 | -1.6% | -1.6% |

The pooled median for the unchanged GPU filter increased by 4.5%, 1.7% and 0.7% at 1, 4 and 8 MP. The 1 MP control varied from +25.6% to −11.3% between blocks. No repeatable increase above 5% was established on the unchanged filter. The largest pooled increase among the three substituted filters was 2.6%, for the 8 MP border. The dedicated runtime-rotated workload measured 0.0%, −1.3% and +1.4%. These measurements apply to end-to-end rendering on this adapter. The original Worker weights and cap remain appropriate to retain for this remediation.

The runtime-rotated hard-fill workload also compared every pixel with a direct double-precision inside test across four controls per size. At 1, 4 and 8 MP the baseline misclassified 32, 84 and 188 pixels respectively. The corrected code matched all 52 million classifications. The largest corrected baseline displacement was 0.027592 px. The separate adjacent-width sweep above shows why these full-frame results cannot establish universal hard-fill parity.

## Reproduction and review

The companion archive contains the five edited source/test files under their repository paths, this report, the test drivers, the emitted full-filter shaders and the raw readbacks. The implementation is in the local remediation worktree as uncommitted changes. The baseline branch and published filter definitions retain their original contents.

1. Prepare sibling checkouts named `gate3` and `gate3r` at the baseline SHA shown above. Overlay the archive’s `gate3r` directory onto the second checkout. Run the browser drivers from the parent directory with a physical WebGPU-capable Chrome and set `FILTER_FAB_PLAYWRIGHT` to the installed Playwright module if needed.
2. Run `node gate3r-device.cjs` and `node gate3r-browser.cjs`. For the baseline reproduction set `GATE3R_SOURCE=gate3`, select a fresh output prefix with `GATE3R_PREFIX`, and run `node gate3r-run.cjs dynamic` and `node gate3r-run.cjs discrete`. Remove the source override for the remediated runs. The output prefix selects JSONL files; use fresh filenames for each run.
3. Run `node gate3r-run.cjs TASK` for `scalar`, `reference`, `sectors`, `dynamic`, `discrete`, `extra3r`, `rounding3r`, `ops`, `cancel` and `signs`. The final scalar, exact reproductions and full RGB check use the `gate3r-final-` evidence prefix. `gate3r-rounding3r.jsonl` contains the f32 width collision.
4. Run the full `matrix` task, then `paired3r` in isolation. The recorded matrix was split by filter and size after the 4 MP border. Its four logs (`matrix`, `hue4`, `vibrance4`, `tail`) contain all 39 distinct image comparisons and their setup, timing, error histograms and budget outcomes. The `isolated-paired3r` log supplies the reported timing table and direct before/after image comparisons. The earlier `concurrent-paired3r` log is an exploratory run while other tests were active. Run `node gate3r-tables.cjs` alongside the provided logs to regenerate the tables.
5. From the remediation checkout run `node tests/sdf-rounded-box-smoke.mjs`, `node tests/hue1024-smoke.mjs` and `npm run verify`. To export full-filter WGSL, set `ROUNDED_BOX_SHADER_PATH` to a file and `HUE_SHADER_PREFIX` to a filename prefix before running the focused tests. The Naga validation and verification logs are in the archive.

**Review decision requested.** Accept the hue remediation on this hardware. Keep the combined gate on hold pending a decision on the one-ULP hard-edge policy. A requirement for bit-identical CPU/GPU hard coverage throughout the current admitted domain would require changes beyond these helpers, as the zero-rotation width collision demonstrates. All work stops at Gate 3R.
