# Changelog

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
