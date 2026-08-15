# Changelog

## 2.4.0

- Added **Midnight Tartan**, a GPU-compatible procedural textile preset based on layered `grid()` and `checker()` masks.
- Added controls for sett scale, stripe widths, weave density and angle, pattern strength, blue tone, and source-image mixing.
- Added built-in compiler coverage for the new preset and documented its mask-compositing approach.

## 2.3.1

- Reissued the standalone build under a new versioned filename after replacing the old **Fractal Shape Study** preset identity with **Sierpiński Fractal**.

## 2.3.0

- Added GPU-compatible analytic mask functions for lines, filled circles, rings, rotated boxes, filled triangles, and grids.
- Implemented matching anti-aliased geometry semantics in the CPU Worker and WGSL shader library.
- Added a bounded `sierpinski()` mask that produces true self-similarity through coordinate folding without shader recursion.
- Replaced the geometric-collage showcase with **Sierpiński Fractal** and moved the six primitive demonstrations into a separate **Analytic Shape Sampler**.
- Expanded compiler, CPU semantic, built-in, and optional CPU/WebGPU parity coverage for the new vocabulary.

## 2.2.1

- Fixed the generated WGSL hash expression by parenthesizing multiplicative terms before bitwise XOR.
- Restored WebGPU execution for GPU-compatible filters instead of compiling unsuccessfully and rerendering through the slower CPU Worker fallback.
- Added a regression assertion for the WGSL operator-parenthesization requirement.

## 2.2.0

- Completed the Phase 3.5 stateless WebGPU subset with deterministic hash, value, Perlin, Worley, FBM, turbulence, ridged, and periodic noise.
- Added WebGPU polar sampling and fixed 3×3 convolution for `rad()`, `rad0()`, `rad1()`, `cnv()`, `cnv0()`, and `cnv1()`.
- Added WebGPU support for `map()`, bias/gain shaping, angular gradients, checker patterns, and brick patterns.
- Made all 25 native built-in filters WebGPU-compatible while preserving explicit CPU fallback for `rnd()`, `rst()`, `get()`, `put()`, and legacy integer-mode AFS filters.
- Added WGSL compiler regression coverage and an actual-hardware CPU/WebGPU parity page.

## 2.1.2

- Introduced a semantic brand palette derived from the supplied Obsidian theme: aubergine surfaces, sage and parchment typography, chartreuse primary actions, magenta edit states, and cyan technical labels.
- Preserved a neutral black/grey preview stage and transparency checkerboard so the interface does not bias image colour judgement.
- Rebranded the logo, controls, formula editor, progress, status, overlays, dialogs, reference chips, and built-in demo image.
- Confirmed the top-navigation GitHub button targets the current `anthonychimming` profile and added a regression check for the URL.
- Added automated contrast and theme-boundary smoke checks plus brand-token documentation.
- Fingerprinted the deployed CSS and JavaScript filenames so GitHub Pages cannot combine a new HTML shell with cached assets from an older release.

## 2.1.1

- Stopped formula fields from rendering on every keystroke and losing focus mid-entry.
- Added debounced, non-rendering formula validation with clear current, pending, and invalid states.
- Added a prominent Render action while preserving the Ctrl/⌘ + Enter shortcut.
- Restored the focused control and text selection after an intentional render finishes.
- Deferred control-slider rendering until the drag or number edit is committed.
- Improved formula-field labels, error relationships, focus indicators, responsive behavior, and help text.
- Added UI wiring regression checks and documented the UX audit behind the revision.

## 2.1.0

- Split the v2.0.7 monolithic HTML into native ES modules.
- Separated formula parsing, typed IR, WGSL compilation, renderer backends, presets, file I/O, image helpers, canvas UI, controls, and app orchestration.
- Decoupled WebGPU debug output from global application state through an `onCompile` callback.
- Added a dependency-free local server and dependency-free build pipeline.
- Added deployable multi-file and standalone HTML outputs.
- Added compiler, format, preset, and CPU renderer smoke tests.
- Preserved project format v2, IR version 1, custom-preset storage, renderer preference, AFS compatibility, clipboard workflows, and transparency preview.
