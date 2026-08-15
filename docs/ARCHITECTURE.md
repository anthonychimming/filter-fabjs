# Architecture

Filter FabJS v2.4.0 uses a renderer-neutral compiler boundary so the formula language is not coupled directly to either rendering backend.

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
- `src/core/ir.js` — conversion from syntax trees to renderer-neutral typed IR plus semantic metadata.
- `src/gpu/wgsl-compiler.js` — WebGPU compatibility analysis and typed-IR-to-WGSL compilation.
- `src/renderers/renderer-backend.js` — shared renderer contract.
- `src/renderers/cpu-renderer.js` — CPU Worker lifecycle, rendering, progress, and cancellation.
- `src/renderers/webgpu-renderer.js` — recoverable GPU buffers, bounded compute-pipeline caching, full-frame dispatch, readback, and cancellation checks.
- `src/renderers/renderer-manager.js` — renderer selection, source synchronization, and CPU fallback.
- `src/presets/builtins.js` — built-in filter definitions.
- `src/io/filter-format.js` — native JSON and historic AFS parsing/import logic.
- `src/io/image-io.js` — image and clipboard encoding helpers.
- `src/ui/*` — DOM, controls, and canvas presentation.
- `src/app/filter-fab-app.js` — application state and browser UI orchestration.

## Design rules

1. Formula parsing must remain independent of renderer-specific APIs.
2. Renderer backends consume typed IR programs rather than parser AST objects.
3. WebGPU-specific behavior belongs in `gpu/` or `renderers/`, not UI modules.
4. CPU fallback must remain explicit and report why GPU execution was unavailable or incompatible.
5. File-format parsing belongs in `io/`; rendering code should not know how a filter was loaded.
6. Shared application state should be coordinated by the app layer rather than mutated from renderer/compiler internals.

## Current WebGPU boundary

The Phase 3.5 WebGPU subset covers supported deterministic stateless operations: arithmetic, conditions, controls, image and polar sampling, coordinate shaping, gradients, procedural patterns, analytic shape masks, deterministic noise, blend operations, and fixed 3×3 convolution. Operations outside that subset are identified by compatibility analysis and use the CPU Worker fallback. `pow()` remains CPU-only because WGSL does not define JavaScript-compatible results for negative bases.

The CPU renderer remains the compatibility backend for legacy integer-mode AFS filters and operations with sequential or shared mutable state (`rnd()`, `rst()`, `get()`, and `put()`).
