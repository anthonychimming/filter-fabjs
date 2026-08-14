# Filter FabJS Project Status

This document describes the implementation currently present in the public repository.

## Release

- Application version: **2.1.2**
- Native filter format: **version 2**
- Typed IR: **version 1**
- Development layout: native ES modules
- Release layouts: multi-file static site and standalone HTML

## Rendering

Filter FabJS provides two rendering backends:

- **WebGPU** — compiles supported typed IR into WGSL and renders in tiled compute dispatches.
- **CPU Worker** — compatibility renderer for unsupported WebGPU operations and legacy integer-mode filters.

The **Auto** renderer selects WebGPU when the current program is compatible and WebGPU is available; otherwise it reports a fallback reason and uses the CPU Worker.

## Formula engine

Formula text is validated after a short pause without starting a render. The preview changes only when the user selects **Render** or presses **Ctrl/⌘ + Enter**, so incomplete expressions never interrupt typing. After an intentional render, keyboard focus and the text selection are restored.

The current formula engine includes:

- RGBA/source-channel variables and image coordinates.
- Arithmetic, comparisons, logical operations, and ternary selection.
- Controls and value mapping.
- Nearest, wrapped, mirrored, and bilinear image sampling.
- Numeric shaping and coordinate helpers.
- Procedural noise functions.
- Gradients and patterns.
- Several blend modes.
- Legacy Filter Factory functions used by imported AFS filters.

## WebGPU compatibility

The WebGPU backend currently supports a defined stateless subset of the formula language. Some procedural noise functions, convolution, polar sampling, shared cell operations, sequential random-state functions, and legacy integer compatibility remain CPU-only.

Compatibility is analyzed from typed IR before a render is dispatched.

## File and image workflows

Current workflows include:

- Filter FabJS native JSON import/export.
- Historic `.afs` import with legacy integer math.
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
- Native JSON and AFS format handling.
- CPU Worker pixel rendering.
- Formula-editor event wiring and focus-safe render behavior.
- Brand-token contrast, neutral preview-canvas treatment, and the GitHub profile target.
- JavaScript syntax and production builds.

Run all verification with:

```bash
npm run verify
```

## Known boundaries

- Browser WebGPU availability varies by browser, OS, GPU, and security context.
- CPU and GPU floating-point implementations may have small numerical differences.
- Historic Filter Factory behavior is not guaranteed to be bit-exact for every edge case.
- Clipboard interoperability depends on the browser and receiving application.
