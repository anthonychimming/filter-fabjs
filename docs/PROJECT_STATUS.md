# Filter FabJS Project Status

This document describes the implementation currently present in the public repository.

## Release

- Application version: **2.4.3**
- Native filter format: **version 2**
- Typed IR: **version 1**
- Development layout: native ES modules
- Release layouts: multi-file static site with fingerprinted assets and standalone HTML

## Rendering

Filter FabJS provides two rendering backends:

- **WebGPU** — compiles supported typed IR into WGSL and renders with a full-frame compute/readback submission. If the device is lost, the retained source is uploaded to the replacement device on the next GPU render. Generated plans and pipelines use a 32-entry LRU cache.
- **CPU Worker** — compatibility renderer for unsupported WebGPU operations and legacy integer-mode filters.

The **Auto** renderer selects WebGPU when the current program is compatible and WebGPU is available; otherwise it reports a fallback reason and uses the CPU Worker. Runtime GPU failures also fall back through the renderer manager, preserving cancellation and suppressing repeated validation attempts for the same device/program pair. `WGSLCompiler.analyze()` is the sole WebGPU-capability authority; renderer-neutral IR metadata records semantic facts without predicting backend support. Compatibility analysis uses a 64-entry LRU cache, and unchanged parsed IR is reused for control-only renders. When a new image is loaded, both backends release the previous source and only the selected backend receives the replacement lazily.

## Formula engine

Formula text is validated after a short pause without starting a render. The preview changes only when the user selects **Render** or presses **Ctrl/⌘ + Enter**, so incomplete expressions never interrupt typing. After an intentional render, keyboard focus and the text selection are restored.

Each formula is limited to 8,192 characters, 4,096 tokens, 4,096 syntax nodes, and 128 nesting levels so malformed input fails predictably before recursive parsing or compilation can exhaust resources.

The current formula engine includes:

- RGBA/source-channel variables and image coordinates.
- Signed YUV chroma variables with coherent native-float bounds and spans; legacy imports retain the historic Filter Factory constant model.
- Arithmetic, comparisons, logical operations, and ternary selection.
- Controls and value mapping.
- Nearest, wrapped, mirrored, and bilinear image sampling.
- Numeric shaping and coordinate helpers.
- Procedural noise functions.
- Gradients and patterns.
- Anti-aliased analytic line, circle, ring, rotated-box, triangle, and grid masks.
- Finite-depth Sierpiński masks with coherent barycentric child folding and feathered outer and internal edges.
- Several blend modes.
- Legacy Filter Factory functions used by imported AFS filters.

## WebGPU compatibility

The WebGPU backend supports the deterministic stateless formula language, including hash, value, Perlin, Worley, FBM, turbulence, ridged and periodic noise; procedural patterns; analytic shape and Sierpiński masks; polar sampling; and fixed 3×3 convolution. All 28 native built-in filters are WebGPU-compatible.

Sequential random-state functions (`rnd()` and `rst()`), shared cell operations (`get()` and `put()`), bitwise/shift/comma expressions, direct `pow()` formulas, and legacy integer compatibility remain CPU-only by design.

Compatibility is analyzed from typed IR before a render is dispatched.

## File and image workflows

Current workflows include:

- Strictly validated and normalized Filter FabJS native JSON v1/v2 import plus version 2 export.
- Historic `.afs` import with legacy integer math and the same formula budgets.
- Image loading and drag-and-drop.
- Clipboard image paste.
- RGBA PNG copy where browser clipboard support permits it.
- PNG export.
- Original, filtered, and split preview modes.
- Transparency checkerboard preview.

## Tests

The repository includes smoke tests for:

- Formula parsing and typed IR compilation.
- Built-in preset compilation.
- Phase 3.5 WGSL call generation and explicit stateful fallback boundaries.
- Analytic shape-mask CPU semantics and optional CPU/WebGPU pixel parity.
- An optional browser parity suite comparing CPU and WebGPU pixels on actual WebGPU hardware.
- Native JSON and AFS format handling.
- CPU Worker pixel rendering.
- Formula-editor event wiring and focus-safe render behavior.
- Brand-token contrast, neutral preview-canvas treatment, and the GitHub profile target.
- Fingerprinted production-asset references and a self-contained standalone build.
- Import-size, schema, metadata, and parser-resource limits.
- Bounded renderer caches, inactive-source release, and control-only reuse.
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
