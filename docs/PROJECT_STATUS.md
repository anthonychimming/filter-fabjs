# Filter FabJS Project Status

This document describes the implementation currently present in the public repository.

## Release

- Application version: **2.6.7**
- Native filter format: **version 2**
- Typed IR: **version 1**
- Development layout: native ES modules
- Release layouts: multi-file static site with fingerprinted assets and standalone HTML

## Rendering

Filter FabJS provides two rendering backends:

- **WebGPU** — compiles supported typed IR into WGSL and renders with a full-frame compute/readback submission using direct RGBA byte views. If the device is lost or destroyed to abort active work, the retained source is uploaded to the replacement device on the next GPU render. Generated plans and pipelines use an entry- and payload-bounded LRU cache.
- **CPU Worker** — compatibility renderer for unsupported WebGPU operations and legacy integer-mode filters. It reuses hot-loop evaluation storage and keeps the current validated IR so control-only renders send only a compact key.

The **Auto** renderer selects WebGPU when the current program is compatible and WebGPU is available; otherwise it reports a fallback reason and uses the CPU Worker. A live diagnostic beside the renderer selector distinguishes GPU eligibility, explicit CPU selection, and CPU fallback while showing the typed-IR operation count and current one-pass count; its read-only snapshot is also available through `window.FilterFabJS.getRendererDiagnostics()`. Runtime GPU failures also fall back through the renderer manager, preserving cancellation and suppressing repeated validation attempts for the same device/program pair. WebGPU render and source-upload generations are captured when work is queued, so cancellation prevents stale queued work from starting; cancelling submitted work destroys the device to interrupt pending readback. `WGSLCompiler.analyze()` is the sole WebGPU-capability authority; renderer-neutral IR metadata records semantic facts without predicting backend support. Compatibility analysis reuses compact memoized program keys in an entry- and payload-bounded LRU cache, and unchanged parsed IR is reused for control-only renders. The app, renderer manager, and main-thread renderer state share one immutable source pixel array; the CPU Worker receives its own transferable copy. When a new image is loaded, both backends release the previous source and only the selected backend receives the replacement lazily. A cancelled CPU Worker remains stopped until the next render request.

## Formula engine

Formula text is validated after a short pause without starting a render. The preview changes only when the user selects **Render** or presses **Ctrl/⌘ + Enter**, so incomplete expressions never interrupt typing. After an intentional render, keyboard focus and the text selection are restored.

Each formula is limited to 8,192 characters, 4,096 tokens, 4,096 syntax nodes, and 128 nesting levels so malformed input fails predictably before recursive parsing or compilation can exhaust resources. WebGPU generation additionally caps aggregate four-channel IR size, while CPU dispatch rejects programs whose weighted execution cost multiplied by the image pixel count exceeds its work budget.

The current formula engine includes:

- RGBA/source-channel variables and image coordinates.
- Signed YUV chroma variables with coherent native-float bounds and spans; legacy imports retain the historic Filter Factory constant model.
- Arithmetic, comparisons, logical operations, and ternary selection.
- Ten data-driven controls, including five reversible `map()` pairs, with default expansion for older eight-control filters.
- Optional per-control slider, number, toggle, and seed presentation metadata with display-space ranges, steps, integer/number formatting, and short units; canonical renderer inputs remain floating-point values from 0–255.
- Normalized `nx`/`ny` and centered `cx`/`cy` image coordinates.
- Radius, angle, repeat, mirror-repeat, and three-/four-stop scalar palette-ramp helpers.
- Nearest, wrapped, mirrored, and bilinear image sampling.
- Numeric shaping and coordinate helpers.
- Procedural noise functions.
- Deterministic Mandelbrot and Julia escape-time fields with a shared 256-iteration ceiling.
- Gradients and patterns.
- Anti-aliased analytic line, circle, ring, rotated-box, triangle, and grid masks.
- Signed-distance circle, stroked-line, and rotated-box primitives with boolean and smooth-union composition plus fill/outline mask conversion.
- Finite-depth Sierpiński masks with coherent barycentric child folding and feathered outer and internal edges.
- Several blend modes.
- Legacy Filter Factory functions used by imported AFS filters.

## WebGPU compatibility

The WebGPU backend supports the deterministic stateless formula language, including ten controls; normalized and centered coordinates; radius, angle, repeat, mirror-repeat, and scalar palette-ramp helpers; hash, value, Perlin, Worley, FBM, turbulence, ridged and periodic noise; bounded Mandelbrot and Julia fields; procedural patterns; analytic shape, signed-distance composition, and Sierpiński masks; polar sampling; and fixed 3×3 convolution. All 31 native built-in filters are WebGPU-compatible. Mandelbrot Atlas, Layered Noise Benchmark, and Warped SDF Bloom are grouped as deterministic performance workloads for manual like-for-like CPU/WebGPU timing comparisons.

Sequential random-state functions (`rnd()` and `rst()`), shared cell operations (`get()` and `put()`), bitwise/shift/comma expressions, direct `pow()` formulas, and legacy integer compatibility remain CPU-only by design.

Compatibility is analyzed from typed IR before a render is dispatched.

## File and image workflows

Current workflows include:

- Strictly validated and normalized Filter FabJS native JSON v1/v2 import plus version 2 export.
- Additive rich-control `ui` metadata preserved through native import/export, browser-local presets, switching, save, and reset. All 31 built-ins provide semantic display ranges and widgets for their active controls; missing metadata and historic AFS controls receive the generic 0–255 slider presentation.
- Optional multiline filter descriptions, bounded to 2,000 characters and preserved through all 31 built-ins, native import/export, and browser-local presets; missing descriptions normalize to an empty string.
- Historic `.afs` import with legacy integer math, eight whole-token integer controls with legacy 0–255 clamping, exactly four formula groups, preserved physical line-comment boundaries, and the same formula budgets.
- Image loading and drag-and-drop.
- Clipboard image paste.
- RGBA PNG copy where browser clipboard support permits it.
- Asynchronous Blob-based PNG export.
- Original, filtered, and split preview modes with zero-copy cached `ImageData` wrappers and animation-frame-coalesced split redraws.
- Transparency checkerboard preview.

## Tests

The repository includes smoke tests for:

- Formula parsing and typed IR compilation.
- Built-in preset compilation.
- Phase 3.5 WGSL call generation and explicit stateful fallback boundaries.
- Analytic shape-mask CPU semantics and optional CPU/WebGPU pixel parity.
- An optional browser parity suite comparing CPU and WebGPU pixels on actual WebGPU hardware.
- Native JSON and AFS format handling.
- Description metadata bounds, backward-compatible defaults, built-in coverage, local-preset persistence, and four-line editor wiring.
- Rich-control normalization, raw/display round trips, decimal/integer formatting, toggle and seed bounds, native/local persistence, simple/conflicting/dynamic `val()` mapping analysis, complete built-in coverage, and accessible responsive editor wiring.
- Ten-control normalization, indices 8/9, fifth-pair mapping, and aligned twelve-slot WebGPU parameter packing.
- Bounded Mandelbrot/Julia parser, typed-IR, CPU, WGSL, render-budget, built-in, and optional hardware-parity coverage.
- Signed-distance parser/arity, typed-IR type and metadata, CPU semantics, WGSL generation, domain-warp preset, render-budget, and optional hardware-parity coverage.
- Manager-owned renderer diagnostics, UI states, browser API exposure, benchmark classification, and optional full-preset CPU/WebGPU pixel parity.
- CPU Worker pixel rendering.
- Formula-editor event wiring and focus-safe render behavior.
- Brand-token contrast, neutral preview-canvas treatment, and the GitHub profile target.
- Fingerprinted production-asset references and a self-contained standalone build.
- Import-size, schema, metadata, and parser-resource limits.
- Compact canonical program keys; entry/byte-bounded renderer caches; inactive-source release; and control-only reuse.
- Queued and active WebGPU cancellation, direct RGBA GPU transfer, CPU Worker IR reuse/lazy restart, and zero-copy coalesced split-preview redraws.
- Shared immutable source ownership and asynchronous PNG export.
- Stable finite-depth Sierpiński holes and internal-edge feathering.
- Math-mode-specific chroma bounds, primary-colour normalization, and optional CPU/WebGPU chroma parity.
- Renderer-neutral IR metadata plus authoritative WGSL rejection of bitwise and comma expressions.
- JavaScript syntax and production builds.

Run all verification with:

```bash
npm run verify
```

For hardware parity, run `npm run dev` and open `http://localhost:8080/tests/webgpu-parity.html` in a WebGPU-capable browser.

## Known boundaries

- Browser WebGPU availability varies by browser, OS, GPU, and security context.
- CPU and GPU floating-point implementations may have small numerical differences.
- Historic Filter Factory behavior is not guaranteed to be bit-exact for every edge case.
- Clipboard interoperability depends on the browser and receiving application.
- Display ranges are linear; logarithmic curves, enums, colour controls, grouping, conditional visibility, and control reordering are not part of v2.6.7.
