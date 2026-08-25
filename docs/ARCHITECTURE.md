# Architecture

Filter FabJS v2.6.4 uses a renderer-neutral compiler boundary so the formula language is not coupled directly to either rendering backend.

```text
Formula text
    ↓
Tokenizer / Parser
    ↓
Typed IR program
    ↓
RendererManager
    ├─ WebGPU renderer
    └─ CPU Worker renderer
    ↓
RGBA pixel output
```

## Module contracts

- `src/core/formula-language.js` — tokenization, parsing, formula validation, and syntax trees.
- `src/core/controls.js` — shared definitions for the ten public controls, their defaults, and the five control pairs.
- `src/core/chroma.js` — math-mode-specific chroma bounds shared by CPU and WebGPU code generation.
- `src/core/ir.js` — conversion from syntax trees to renderer-neutral typed IR, semantic metadata, and memoized canonical program keys.
- `src/gpu/wgsl-compiler.js` — WebGPU compatibility analysis and typed-IR-to-WGSL compilation.
- `src/gpu/params-layout.js` — aligned WebGPU parameter-buffer sizing with twelve reserved control slots for the ten public controls.
- `src/renderers/renderer-backend.js` — shared renderer contract.
- `src/renderers/cpu-renderer.js` — CPU Worker lifecycle, shared retained source, keyed IR reuse, rendering, progress, lazy restart, and cancellation.
- `src/renderers/webgpu-renderer.js` — recoverable GPU buffers, shared retained source, entry/byte-bounded WGSL-plan/pipeline reuse, direct RGBA upload/readback, full-frame dispatch, source release, and queued/active cancellation.
- `src/renderers/renderer-manager.js` — renderer selection, immutable source coordination, entry/byte-bounded compatibility analysis and diagnostic snapshots, lazy source synchronization, inactive-backend release, cancellation-aware runtime CPU fallback, and bounded repeated program-failure quarantine.
- `src/presets/builtins.js` — built-in filter definitions.
- `src/io/filter-format.js` — size-bounded native JSON and historic AFS validation, normalization, parsing, and validated-AST handoff to application preparation.
- `src/io/image-io.js` — image and clipboard encoding helpers.
- `src/ui/*` — DOM, controls, and canvas presentation.
- `src/app/filter-fab-app.js` — application state and browser UI orchestration.

## Design rules

1. Formula parsing must remain independent of renderer-specific APIs.
2. Renderer backends consume typed IR programs rather than parser AST objects.
3. WebGPU-specific behavior belongs in `gpu/` or `renderers/`, not UI modules.
4. `WGSLCompiler.analyze()` is the sole authority for WebGPU compatibility; neutral IR metadata must not predict renderer support.
5. CPU fallback must remain explicit and report why GPU execution was unavailable or incompatible.
6. File-format parsing belongs in `io/`; rendering code should not know how a filter was loaded.
7. Shared application state should be coordinated by the app layer rather than mutated from renderer/compiler internals.

## Current WebGPU boundary

The Phase 3.5 WebGPU subset covers supported deterministic stateless operations: arithmetic, conditions, ten controls, image and polar sampling, normalized and centered coordinates, coordinate shaping and repetition, scalar palette ramps, gradients, procedural patterns, analytic shape masks, signed-distance primitives and composition, deterministic noise, bounded Mandelbrot and Julia fields, blend operations, and fixed 3×3 convolution. Signed-distance fields remain ordinary scalar expressions inside the current one-pass program and become masks only through explicit fill/outline helpers; domain warping is coordinate composition rather than a second execution model. Fractal iteration is encapsulated inside compiler intrinsics with a shared 256-step ceiling; the formula language does not expose general-purpose loops. Operations outside the subset are identified by compatibility analysis and use the CPU Worker fallback. Phase 3.5D exposes the manager's authoritative analysis as a read-only diagnostic snapshot containing formula compatibility, current GPU eligibility, selected backend, fallback reason, operation count, and the current one-pass count. `pow()` remains CPU-only because WGSL does not define JavaScript-compatible results for negative bases.

The CPU renderer remains the compatibility backend for legacy integer-mode AFS filters, bitwise/shift/comma expressions, and operations with sequential or shared mutable state (`rnd()`, `rst()`, `get()`, and `put()`).
