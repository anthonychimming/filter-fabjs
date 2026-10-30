# ChromaMeld RGBA Codex Guide

This file applies to the entire repository. It describes the current implementation and the rules future Codex sessions must follow when changing it.

## Project overview

ChromaMeld RGBA (formerly Filter FabJS) v2.10.1 is an open-source, browser-native procedural RGBA image-filter editor. Users write one expression for each of the red, green, blue, and alpha output channels. The application parses those expressions into a renderer-neutral typed IR, then executes compatible programs with WebGPU or uses a CPU Web Worker as the compatibility backend.

Current user-facing capabilities include formula validation, ten filter controls, built-in and browser-local presets, image and clipboard workflows, native Filter FabJS JSON import/export, historic Filter Factory `.afs` import, render cancellation and progress, alpha-aware previews, and PNG export. Development uses native ES modules; the build produces both a fingerprinted static site and a standalone HTML file.

The current release contracts are:

- Application version: 2.10.1.
- Native export format: Filter FabJS JSON version 2.
- Native import formats: Filter FabJS JSON versions 1 and 2.
- Typed IR version: 1.
- Historic compatibility import: RGB Filter Factory `.afs`, evaluated with legacy integer math.
- Licence: GPL-2.0-or-later.

These values describe the current tree. When changing versions or release documentation, verify them against `package.json`, `IR_VERSION`, the filter-format implementation, and the build script rather than treating this file as the version authority.

## Entry points and source layout

- `index.html` is the browser shell and loads `styles/app.css` and `src/main.js`.
- `src/main.js` is the development entry point and calls `initFilterFabApp()`.
- `src/app/filter-fab-app.js` owns application state and orchestration: event wiring, validation, render lifecycle, cancellation, presets, filter and image I/O, and the diagnostic `window.FilterFabJS` object.
- `src/core/` contains the formula language, typed IR, chroma models, and shared utilities.
- `src/gpu/` contains WebGPU compatibility analysis, typed-IR-to-WGSL compilation, and the generated shader helper library.
- `src/renderers/` contains the backend contract, CPU Worker implementation, WebGPU implementation, and `RendererManager`.
- `src/presets/` contains native built-in filter definitions.
- `src/io/` contains filter-format validation/parsing and image/clipboard helpers.
- `src/ui/` contains DOM lookup, control-panel behavior, and canvas presentation.
- `styles/` contains the application stylesheet and brand tokens.
- `scripts/` contains the dependency-free development server, syntax checker, and production build.
- `tests/` contains Node smoke tests and the optional browser WebGPU parity suite.
- `docs/` contains architecture, status, formula, authoring, analytic-shape, brand, migration, and UX documentation.

Keep these responsibility boundaries intact. Formula and IR modules must remain renderer-neutral. WebGPU details belong in `src/gpu/` or `src/renderers/`, not UI code. File-format parsing belongs in `src/io/`. Shared application state belongs in the app layer rather than compiler or renderer internals.

## Formula parser and typed IR

`src/core/formula-language.js` implements a tokenizer and Pratt-style parser. It accepts a deliberately closed set of variables, functions, literals, and operators; it does not evaluate formula text as JavaScript. It produces compact parser AST nodes. Important syntax details, including the existing precedence table and the fact that `&&` and `||` share a precedence level, are observable compatibility behavior.

Each channel formula is bounded by:

- 8,192 characters.
- 4,096 tokens.
- 4,096 syntax nodes.
- 128 nesting levels.

`src/core/ir.js` lowers four parser ASTs into a `filter-fab-program` typed IR v1. The active expression types are scalar, integer, boolean, mask, and channel; color, vector2, and image are reserved categories. The compiler records renderer-neutral metadata such as used controls, functions, variables, source sampling, statefulness, and determinism. It also creates a canonical, memoized program key used for compatibility, worker-program, WGSL-plan, and pipeline reuse.

Do not make neutral IR metadata predict WebGPU support. `WGSLCompiler.analyze()` is the sole authority for GPU compatibility. Do not pass parser AST objects directly to renderers; renderers consume validated typed IR programs.

Formula semantics are a public compatibility surface. Do not change operator precedence, coercion, zero-division behavior, rounding, sampling, coordinate conventions, chroma constants, function arity, control mapping, legacy integer behavior, or channel clamping without explicit approval and focused cross-backend tests. Do not silently add identifiers, characters, numeric forms, aliases, coercions, or malformed-input recovery that widens accepted syntax.

## CPU renderer

`src/renderers/cpu-renderer.js` creates a Web Worker from the self-contained source returned by `src/renderers/cpu-worker-source.js`. Formula programs are data interpreted by that worker, not executable JavaScript generated from user input.

The CPU renderer is the compatibility backend for all constructs accepted by the current parser. The worker receives a transferable source-pixel copy, evaluates four IR output expressions per pixel, reports row progress, and returns a transferable RGBA buffer. It supports native floating-point math and historic legacy integer math, including CPU-only bitwise/shift/comma expressions, direct `pow()`, sequential random operations (`rnd()` and `rst()`), and shared cell operations (`get()` and `put()`). Historic Filter Factory behavior is not guaranteed to be bit-exact for every edge case.

The worker retains the current validated IR and its canonical key, so control-only renders can send a compact key instead of resending the program. Cancellation terminates the worker; it restarts lazily on the next render. Replacing or releasing the source rejects pending work and releases the old worker/source state.

Changes to formula operations commonly require coordinated edits to the parser/function table, typed IR classification and metadata, CPU evaluator, documentation, and tests. Preserve hot-loop reuse and transferable-buffer behavior unless the task explicitly calls for an architectural performance change.

## WebGPU renderer and WGSL compiler

`src/gpu/wgsl-compiler.js` analyzes typed IR and compiles the supported deterministic, stateless subset to WGSL. Its current phase-3.5 subset includes arithmetic, conditions, controls, image and polar sampling, coordinate shaping, gradients, procedural patterns, analytic masks, deterministic noise, blend operations, and fixed 3x3 convolution.

The current GPU blockers include legacy integer mode, bitwise and shift operators, unary `~`, comma sequencing, `rnd()`, `rst()`, `get()`, `put()`, and direct `pow()`. `pow()` remains CPU-only because WGSL does not provide JavaScript-compatible results for negative bases.

`src/renderers/webgpu-renderer.js` lazily obtains an adapter/device, uploads direct RGBA bytes, dispatches one full-frame compute pass with 8x8 workgroups, and reads the result back into a `Uint8ClampedArray`. It retains its source-array reference so buffers can be recreated after device loss; the app and renderer manager treat that shared source as immutable. WGSL plans and GPU pipelines are cached together with entry and payload limits. Queued work is guarded by generation tokens; cancelling active submitted work destroys the device so pending readback is interrupted, and a later render recovers with a new device.

Keep generated WGSL derived only from validated IR nodes and whitelisted compiler mappings. When adding a GPU operation, add compatibility analysis, code generation, shader helpers if needed, CPU/GPU parity coverage, and an explicit unsupported path for cases whose semantics cannot match the CPU.

## Renderer selection and fallback

`src/renderers/renderer-manager.js` owns immutable source coordination, lazy backend source synchronization, compatibility-analysis caching, backend selection, cancellation checks, runtime fallback, and bounded persistent GPU-failure quarantine.

- `cpu` preference selects the CPU Worker directly.
- `auto` uses WebGPU only when `WGSLCompiler.analyze()` reports compatibility and WebGPU is available; otherwise it selects CPU and returns a visible fallback reason.
- `webgpu` is a preference, not a strict GPU-only mode. Unsupported, unavailable, initialization-failed, or runtime-failed GPU work still falls back to CPU.
- A non-cancellation WebGPU render failure is retried through the CPU renderer.
- Persistent WGSL compilation or non-device validation failures are quarantined by program key and device generation so unchanged control renders do not repeat the same failure. Device replacement invalidates that quarantine.
- If GPU and CPU both fail, the manager reports a combined `RendererFallbackError`.
- Cancellation and stale-render checks must remain effective while backends and sources are being initialized.

Automatic CPU fallback is a core compatibility guarantee. Never remove it, hide its reason, or make unsupported formulas fail merely because GPU was requested.

## Built-in presets

`src/presets/builtins.js` exports data definitions containing an id, display name, eight control values, eight labels, and four formulas. The application sorts them for display, validates and compiles them through the same public formula pipeline, and keeps custom presets separately in browser storage.

There are currently 28 native built-ins, and all are expected to pass WebGPU compatibility analysis. Do not add preset-specific renderer flags or bypass parser/IR validation. A new or changed built-in must compile as a four-channel native float program, use valid controls, remain CPU/GPU compatible unless explicitly approved otherwise, and receive focused test coverage.

The compatibility storage keys `ffw-renderer` and `ffw-custom-presets` must be preserved unless an explicit migration is designed and approved.

## Import, export, and untrusted input

Treat every imported filter, formula, metadata field, image, and clipboard payload as untrusted input. Preserve strict validation and fail closed with useful errors.

`src/io/filter-format.js` currently enforces:

- A 256 KiB browser `File.size` limit before `file.text()` in the app, plus a separate 262,144-character limit on decoded filter text in `src/io/filter-format.js`.
- Exactly four non-empty formula strings, each subject to parser resource limits.
- Native JSON must be an object with `format: "filter-fab-js"` and version 1 or 2.
- Native v1 defaults to legacy math; native v2 defaults to float math. Both may specify only `float` or `legacy`.
- At most eight controls. Values must be finite numbers from 0 through 255; labels are bounded to 80 characters.
- Names and authors are strings bounded to 120 characters.
- AFS input must have a supported `%RGB` header, at least eight control lines, and four formulas reconstructed by the current grouping algorithm. That algorithm takes the first four non-empty separated groups when at least four exist, or otherwise accumulates lines using parenthesis depth. AFS controls are parsed with `Number.parseInt`, clamped to 0-255, and formulas use the same parser budgets.
- BOM and line-ending normalization, multiline AFS reconstruction, and historic `\\r`/`\\n` continuation handling are compatibility behavior.

Export remains normalized native JSON version 2. Preserve import support for native v1/v2 and the currently supported historic `.afs` behavior. Do not introduce `eval`, `Function`, unchecked shader fragments, or direct HTML insertion from imported text. Keep output filenames and metadata safely bounded/escaped. Maintain asynchronous Blob-based PNG export and alpha-preserving image/clipboard behavior.

Maintain existing resource bounds in the formula parser, filter importer, renderer caches, image workflow, and GPU buffers. Image loading currently checks an `image/` MIME prefix, delegates decoding to `createImageBitmap`, and scales the decoded image so its largest dimension is at most 1,800 pixels; there is no explicit image-file byte limit. Do not claim stronger validation than the implementation provides. Any new externally supplied format must define comparable schema, size, count, depth, and payload limits before accepting data.

## Backward compatibility

Preserve the legacy `filter-fab-js` JSON and PNG schemas, PNG keyword `FilterFabJS`, PNG generator name `Filter FabJS`, library and backup schemas, browser storage keys, and `window.FilterFabJS` diagnostic API. Branding changes do not migrate browser data between origins.

Correctness and backward compatibility take priority over refactoring. Preserve, unless explicitly approved otherwise:

- Existing formula syntax and numeric semantics in both float and legacy modes.
- Four-channel RGBA program behavior and final 0-255 output clamping.
- Native JSON v1/v2 import and v2 export.
- Supported Filter Factory `.afs` parsing and legacy CPU execution.
- Coordination among the current typed IR v1 producer and its CPU Worker, WGSL compiler, diagnostics, and tests. Typed IR is internal and is not part of the persisted filter JSON schema; change its version only with coordinated consumer updates.
- Automatic and runtime CPU fallback with user-visible reasons.
- CPU/GPU equivalence wherever both backends support an operation, allowing only documented floating-point tolerances.
- The `ffw-renderer` and `ffw-custom-presets` storage contracts. Built-in ids, formulas, labels, and defaults are internal data rather than a documented persisted schema, but changes to them should still be intentional and covered by preset compilation/behavior tests.
- Browser workflows for image loading, alpha, PNG, clipboard, cancellation, focus restoration, and original/filtered/split preview modes.

Behavior-preserving modularization is acceptable only when it is necessary for the requested task and covered by existing or new tests. Do not combine semantic changes with broad cleanup.

## Future architectural direction

The currently implemented execution unit is one four-output typed-IR program: the CPU backend evaluates it in one worker render, while the WebGPU backend uses one compute dispatch. The repository source and checked-in documentation do not currently contain a pass graph, node editor, material-output model, persisted graph schema, or detailed design for those systems.

Pass graphs, a node editor, and material outputs are stated future direction for Codex work, not current capabilities. Do not invent their data model or preemptively refactor the current engine for them during unrelated work. When such work is explicitly requested, begin with a scoped design grounded in the renderer-neutral compiler boundary and preserve the existing four-channel formula path, JSON/AFS compatibility, validation limits, cancellation behavior, and automatic CPU fallback. Any new persisted or imported graph/material representation requires explicit versioning, validation, resource limits, compatibility tests, and a migration strategy before implementation.

## Development workflow

The project has no npm package dependencies. Use the existing scripts:

```bash
npm run dev
npm run check
npm test
npm run build
npm run verify
```

- `npm run dev` serves the repository at `http://localhost:8080`; use localhost or HTTPS for WebGPU and clipboard testing.
- `npm run check` syntax-checks JavaScript under `src/` and `scripts/`.
- `npm test` runs the Node smoke suites for core behavior, WGSL, both renderers, renderer management, analytic shapes, canvas behavior, UI wiring, and theme rules.
- `npm run build` recreates `dist/`, producing `dist/site/` with fingerprinted assets and `dist/chromameld-rgba-v<version>.html` as a standalone release.
- `npm run verify` runs syntax checks, Node tests, the production build, and build-output smoke validation. This is the standard completion command.
- Hardware CPU/WebGPU pixel parity is optional and browser-based: run the dev server and open `http://localhost:8080/tests/webgpu-parity.html` on a WebGPU-capable system.

Before considering a repository change complete, run:

```bash
npm run verify
```

Report every failure, including environment-specific or pre-existing failures. Do not claim hardware WebGPU parity unless the browser parity suite was actually run on WebGPU hardware.

Add or update focused regression tests for behavioral fixes. Prefer the narrowest relevant smoke test while developing, then run the full verification workflow. Changes involving shared CPU/GPU operations should test parser/IR behavior, WGSL compatibility/code generation, CPU semantics, and parity where practical. Import changes need malformed, oversized, boundary, and backward-compatibility cases.

## Change discipline

1. Make the smallest change that completely addresses the request.
2. Inspect nearby tests and documentation before editing behavior.
3. Avoid unrelated cleanup, formatting, renaming, dependency changes, and refactoring.
4. Preserve public and internal compatibility boundaries unless the user explicitly approves a migration.
5. Do not change formula semantics or widen input syntax without explicit approval.
6. Keep CPU and GPU behavior equivalent for shared operations.
7. Preserve automatic CPU fallback for unsupported or failed GPU formulas.
8. Add focused regression coverage for bug fixes and behavior changes.
9. Update documentation when a public behavior, format, function, compatibility boundary, or workflow changes.
10. Respect existing user changes in a dirty worktree; do not revert or overwrite unrelated work.
11. Do not commit, push, create branches, open or modify pull requests/issues, or otherwise change GitHub unless explicitly asked.
12. Do not hand-edit generated `dist/` output. Modify source files and let the normal build process regenerate it. Do not include generated output in a change unless the request or repository release workflow explicitly requires it.

When uncertain whether a change affects formula, file-format, renderer, or legacy behavior, treat it as compatibility-sensitive and stop to investigate or request explicit direction.
