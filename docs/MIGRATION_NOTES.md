# v2.0.7 → v2.1.0 Migration Notes

The modular release is intended to preserve behavior rather than change the filter language or project format.

## Moved responsibilities

- Formula tokenizer and parser → `src/core/formula-language.js`
- Typed IR compiler → `src/core/ir.js`
- WGSL generation → `src/gpu/wgsl-compiler.js`
- CPU Worker source and renderer → `src/renderers/`
- WebGPU renderer and backend selection → `src/renderers/`
- Built-in filters → `src/presets/builtins.js`
- Native JSON and AFS parsing → `src/io/filter-format.js`
- Clipboard and image encoding helpers → `src/io/image-io.js`
- Canvas viewport and controls → `src/ui/`
- Application state, rendering workflow, imports/exports, and event wiring → `src/app/filter-fab-app.js`

## Compatibility

- Native filter schema remains version 2.
- Typed IR remains version 1.
- CPU legacy mode remains available for AFS filters.
- Renderer preference continues to use the `ffw-renderer` local-storage key.
- Custom presets continue to use the `ffw-custom-presets` local-storage key.

## Development rule

Engine changes should preserve the typed-IR and renderer abstraction boundaries. Do not place WebGPU-specific code in UI modules, and keep file-format and rendering responsibilities separated.
