# Native procedural intrinsics — v2.12.0 release readiness

**Status:** v2.12.0 release candidate, unmerged and undeployed. Both functions passed Gate 3 under the documented numerical policy on a physical Intel Iris Xe. Public `main` remains v2.11.2 until the merge/deployment are separately authorized.

## Scope and versioning

- Add native-float scalar `sdfRoundedBox(x,y,cx,cy,width,height,radius,rotation)` and `hue1024(r,g,b)` to the existing four-channel expression language.
- Preserve native filter JSON **v2**, typed IR **v1**, historic AFS/legacy math, renderer interfaces, installed libraries and existing built-in/Online Library filter definitions.
- The minimum compatible app reader is **v2.12.0**. The prior v2.11.2 reader rejects either identifier; do not add a serialized `introducedVersion` field to native JSON v2. Format v2 compatibility does not imply support for future function names.
- A minor v2.x release is appropriate; do **not** present this change as a Phase 4 graph-engine upgrade or native format v3.

## Authoring and API

- `sdfRoundedBox` returns signed distance in pixels (negative inside, zero at boundary); radius is absolute and clamped to the smaller half-extent; rotation is measured in 1024 units/turn. GPU admission is conservative and may depend on image dimensions and valid contributing controls. The CPU returns positive finite `1e20` for nonfinite evaluated inputs/intermediates.
- `hue1024` clamps encoded RGB arguments to [0,255] on CPU and returns a hue angle in [0,1024). Exact gray and nonfinite inputs return +0; red-first tie precedence is intentional. A legacy six-sector calculation uses `(hue1024(r,g,b)*6/1024)`, not bare `hue1024`.
- GPU hue admission requires conservatively proven byte producers; unsupported fractional/computed producers fall back to CPU. The existing 3-billion-unit CPU budget may refuse expensive full-resolution programs when WebGPU is unavailable.
- Neither name is accepted in historic `.afs` or legacy integer math, including otherwise unreachable branches. Do not change original filter formulas as part of this release.

## Hardware accuracy and limitations

- Gate 3 final numerical acceptance on **one Intel Iris Xe / gen-12lp adapter** used production WebGPU dispatch and actual buffer readback. The original dynamic-rotation 0.05 px error was corrected; all 7,160 rounded-box scalar vectors met the original magnitude-dependent threshold, with maximum absolute distance error ~0.000973359 px.
- Eight adversarial hard-edge coverage disagreements remained within one local-coordinate f32 ULP of their mathematical boundaries and satisfied the separate scalar-error test. They can produce real 0/255 differences; the [hard-edge review criterion](../GATE3_HARD_EDGE_ACCEPTANCE_POLICY.md) permits them only under both limits. This is not a rendering epsilon, a smoothing promise, or universal bit-for-bit CPU/GPU parity.
- `hue1024` reconstructed the correct integer six-sector classification for all 16,777,216 byte RGB triples on the tested adapter. The byte-wheel maximum circular hue error was ~0.000080902 angle units. Unproved fractional inputs and device subnormal behavior are not covered by byte-domain GPU admission.
- Complete-filter substitutions: rounded border had **zero original/substituted GPU byte changes** in the tested 1/4/8 MP matrix. Hue/Saturation and Vibrance had at most **one byte of magnitude** per changed channel. Existing source alpha passthrough was preserved. The three full filters exceed the CPU work budget at 8 MP.
- Warm end-to-end GPU rendering had no consistently measured speedup; no repeatable >5% regression on the unchanged control filter was demonstrated. Do not market these additions as universal acceleration.
- Actual hardware evidence is limited to the tested Intel adapter and driver. Broader portability is a future test opportunity, not an established guarantee.

## Release integration checks (must be performed on the combined runtime + docs branch)

1. Review the remote release-candidate branch against the audited v2.11.2 baseline and the accepted Gate 4 patch. Confirm the exact 28 reviewed source blob hashes remain identical and record the final candidate SHA.
2. Verify parser arities 8/3; native-only mode guard; Worker/WGSL implementations; direct WebGPU numeric admission and cache/source-swap behavior; unchanged CPU work limit; no built-in or online formula migrations.
3. Test that every new documentation example parses/compiles in the final build. Confirm user-facing documentation identifies v2.12.0 as the minimum reader; do not change native JSON/typed IR format versions or introduce serialized version fields.
4. Run both dedicated suites, fresh `npm run verify`, build-output checks and representative browser regressions on the **combined** commit. Confirm existing v1/v2 JSON, PNG metadata and historic `.afs` roundtrips remain unchanged.
5. Retest an older compatible reader's handling of a new-function file and Online Library preview/apply failure. Ensure an error is explicit and the previous preview/active document is retained; do not publish new-name filters until consumers can update.
6. Confirm the Gate 3 acceptance policy and evidence can be found in the repository. Record the known pre-existing Mandelbrot browser-parity failure separately; it was identical on Gate 3 baseline/remediation and is **not** a new-intrinsic regression.
7. Review the full source diff against v2.11.2 with a human reviewer. Prepare a draft PR; obtain explicit merge/release authorization before updating `main`, version tags, Pages, public filter library, or release artifacts.

## Evidence provenance

- Audited app baseline: `a83b9e819f62dd1a1f8194ae51f69f6a4312ebc6` (v2.11.2).
- Gate 2B: `b63f144f3cfb12a34fa60eea92a887de7308176b`; Gate 2C: `83c2677fa37ba07af5cfdf320ae935c400fa9aac`.
- Gate 3R tested runtime commit: `7e57c540de69d4c8bac7a2a7ad5034de5c670326`; final acceptance documentation tip: `63b63878a6676a4939176fd1fc6d7cd789c61a47`.
- `GATE3_FINAL_ACCEPTANCE_REPORT.md` and `Gate3-final-acceptance-evidence.zip` were supplied for Gate 4 review. Tests reported a full `npm run verify` PASS and physical hardware evidence; **the accepted combined Gate 4 code underwent full regression tests; the new v2.12.0 metadata commit still requires fresh verification**.

## Release decision

**Release candidate only.** Approval to merge/publish requires a clean combined v2.12.0 branch, fresh verification on its final SHA, a reviewed PR and explicit authorization to merge and deploy.
