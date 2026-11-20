# Gate 3 final numerical acceptance

**Gate 3 passes on the tested Intel Iris Xe under the one-local-coordinate-f32-ULP hard-edge review criterion.**

| Function | Decision | Deciding evidence |
|---|---|---|
| `sdfRoundedBox()` | **PASS under the documented criterion** | The original exterior pixel returned 0 on both renderers. All eight adversarial coverage disagreements satisfy both numerical bounds. All 7,160 distances passed the original scalar threshold. |
| `hue1024()` | **PASS** | The production sector expression returned the correct sector for all 16,777,216 byte RGB triples, including yellow at sector 1. |

**Tested implementation commit:** `7e57c540de69d4c8bac7a2a7ad5034de5c670326` on `fix/gate3r-parity`. Its direct parent is `83c2677fa37ba07af5cfdf320ae935c400fa9aac`. The final acceptance check used the previously reviewed runtime and tests. The accompanying Git commit for this report changes documentation only.

**Hardware:** Intel Iris Xe Graphics, driver 30.0.100.9864, WebGPU adapter `intel / gen-12lp`, fallback false, Chrome 157.0.8103.51 on Windows. The compute checkpoint returned 7, 8, 11 and 16. The coverage bytes and scalar distances below came from hardware dispatch and mapped buffer readback.

## Hard-edge review criterion

The committed policy requires exact coverage for the named dynamic reproduction, the exactly representable cardinal boundary fixtures and the complete-filter hard-edge fixtures. For each other classification disagreement, the independent reference distance and the measured scalar must satisfy **both** inclusive tests. [Committed policy](./GATE3_HARD_EDGE_ACCEPTANCE_POLICY.md)

| Test | Definition, in pixels |
|---|---|
| Proximity to the geometric boundary | `abs(d_ref) <= U`, where `L = max(1, abs(localX), abs(localY), abs(width)/2, abs(height)/2)` and `U = 2^(floor(log2(L)) - 23)`. |
| Accuracy of the computed distance | `abs(d_gpu - d_ref) <= T`, where `S = max(1, abs(x), abs(y), abs(cx), abs(cy), abs(width), abs(height))` and `T = max(0.0001, 8 * 2^-23 * S)`. |

The audit computed signed reference distances separately with 80-digit decimal arithmetic, deriving π by Machin’s identity and evaluating sine and cosine by series. Every tested point projected onto a straight face, which allowed the reference to use the perpendicular distance to that face. It verified binary32 spacing two ways: subtraction of consecutive representable bit patterns bracketing the scale, and an independent integer-exponent calculation. Tests at, immediately below and above binade boundaries checked the direction of spacing. The criteria operate only in review; production hard fills still cover a computed distance of zero or less.

## The eight coverage disagreements

All rows use a 4001 × 1 source, pixel (3000, 0), formula y = 1000, center (0, 0), box height 8000, radius 0 and control 0 = rotation / 4. Each row reproduced through both production renderers. A second dispatch reused the production shader, control, source and buffers and changed only the final packer to bitcast the red-channel distance into a 32-bit readback. The raw scalar sign and exact-zero flag matched the original packed outputs. The CSV in the evidence archive retains the full reference precision.

| Rotation | Box width | Reference distance | GPU distance | Worker class / byte | GPU class / byte | Local scale L | One ULP | Absolute scalar error | Scalar limit T | Result |
|---:|---:|---:|---:|---|---|---:|---:|---:|---:|---|
| 105 | 5998.45654296875 | +0.000015223209 | 0 | exterior / 0 | boundary / 255 | 4000 | 0.000244140625 | 0.000015223209 | 0.00762939453125 | PASS |
| 128 | 5656.85400390625 | +0.000122793065 | -0.000244140625 | exterior / 0 | interior / 255 | 4000 | 0.000244140625 | 0.000366933690 | 0.00762939453125 | PASS |
| 255 | 2036.777587890625 | +0.000035284752 | 0 | exterior / 0 | boundary / 255 | 4000 | 0.000244140625 | 0.000035284752 | 0.00762939453125 | PASS |
| 384 | 2828.427001953125 | +0.000061396533 | -0.000244140625 | exterior / 0 | interior / 255 | 4000 | 0.000244140625 | 0.000305537158 | 0.00762939453125 | PASS |
| 509 | 5962.169921875 | +0.000054544165 | 0 | exterior / 0 | boundary / 255 | 4000 | 0.000244140625 | 0.000054544165 | 0.00762939453125 | PASS |
| 640 | 5656.85400390625 | +0.000122793065 | -0.000244140625 | exterior / 0 | interior / 255 | 4000 | 0.000244140625 | 0.000366933690 | 0.00762939453125 | PASS |
| 767 | 2036.777587890625 | +0.000035284752 | 0 | exterior / 0 | boundary / 255 | 4000 | 0.000244140625 | 0.000035284752 | 0.00762939453125 | PASS |
| 896 | 2828.427001953125 | +0.000061396533 | -0.000244140625 | exterior / 0 | interior / 255 | 4000 | 0.000244140625 | 0.000305537158 | 0.00762939453125 | PASS |

Here the half-height fixes L at 4000, so U = 0.000244140625 px. The full height fixes S at 8000. The farthest reference point was 0.503 ULP from the boundary. The largest scalar error was 0.0003669336901 px, or 4.81% of its separate limit. Four scalar errors exceeded one local ULP; each passed the scalar-error test stated above. The remaining coverage flips are genuine 0-to-255 byte differences.

Two flips occurred at the nearest f32 width and six at the immediately lower f32 width. The prior remediation narrative had described all eight as nearest-width cases; its saved input widths and coverage bytes matched the rerun. Across the 33 widths, three additional interior points became GPU boundary zeros while retaining byte 255. All three passed both numerical tests. The separate zero-rotation 5999.9999 / 6000 / 6000.0001 width collision also passed review. All three widths reach WGSL as 6000.

## Required regressions

| Check | Fresh result |
|---|---|
| Original dynamic failure | At control 254.9375, the exactly documented width 5945.71044921875 gave reference +0.0500477934 px and Worker/GPU byte 0. All four inside/outside controls agreed. |
| Scalar geometry and cardinal boundaries | 7,160 vectors, maximum device/reference error 0.000973359 px, zero threshold exceedances, zero Worker/GPU sign or zero-class disagreements. The original f64 oracle reported positive residues below 4 × 10⁻¹⁵ px at 12 exact cardinal boundary samples. Both renderers returned valid zero. A further 45 production fixtures at nine cardinal angles from −1024 to +1024 matched the analytic coverage and zero flags for faces, arcs, degenerate segments, inside and outside points. The separate 21 reference vectors had maximum error 0.000002145 px. |
| Radius-zero controls | On the sensitive 4,001-pixel row the original GPU `sdfBox()` returned 255 and the corrected radius-zero rounded box returned the analytic 0 at x = 3000. The other 4,000 pixels agreed. Source comparison found identical old box and mask helpers and dispatch paths on both backends. Mathematical radius-zero equivalence permits differing packed coverage at a tight edge. |
| Hue boundaries | Pure yellow returned 170.6666717529297 and reconstructed sector 1. All six canonical colors, ties, grays, byte-near-grays and red wraparound were included in the exhaustive 256³ hardware check. Zero sector errors. The 1,792-vector byte wheel and gray ramp had maximum circular error 0.000080902, zero range violations and zero erroneous grays. |
| Fractional hue diagnostics | The 1,536-vector fractional wheel stayed within 0.000041 angle units. In the separate near-gray research probe, a subnormal green input flushed to zero on GPU. Fractional producers of that kind are outside the admitted byte domain. |
| Complete filters | All 39 matrix cases reproduced the original per-setting error metrics, histograms and examples. Source/formula hashes and CPU budget outcomes matched. Packed differences between original and substituted GPU recipes appear in the table below. |
| Direct before/after comparisons | Zero changed bytes in 36 wheel-stripe comparisons of the three substituted full filters at 1, 4 and 8 MP, across four settings. All 12 full-frame border sign checks agreed with the reference. The runtime-rotated full-frame probe agreed with the independent reference on all 52 million classifications. |
| Focused suites and full verification | Both focused Node suites exited 0. Fresh `npm run verify` exited 0, including the build-output smoke. The full test group took 565.20 s. |
| Browser parity page | Baseline 82/83, remediation 83/84. The new boundary regression passed. The same pre-existing Mandelbrot fixture failed on both, with maximum byte delta 189 and mean 0.5330. It is outside the two function decisions. |

| Original vs substituted GPU recipe, four settings combined | Changed bytes, 1 MP | Changed bytes, 4 MP | Changed bytes, 8 MP | Largest byte delta |
|---|---:|---:|---:|---:|
| Uniform Rounded Inset Border | 0 | 0 | 0 | 0 |
| Photoshop-Style Hue/Saturation | 5 | 16 | 11 | 1 |
| Photoshop Style Vibrance | 0 | 0 | 4 | 1 |

All 20 budget-admitted original/substituted full-filter Worker pairs were byte-identical. At 4 MP the original border exceeded the CPU cap and the substituted border ran. At 8 MP the cap refused both versions of all three full filters. The original 3-billion-work-unit rule was applied throughout.

**Disposition:** accept both functions for Gate 3 with the documented device and numerical scope. The work ends at final numerical acceptance. The evidence archive includes the independent checker, raw distances, per-case CSV, full-filter comparisons, test logs and an incremental Git bundle based on the specified parent.
