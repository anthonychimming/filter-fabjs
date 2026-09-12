# Phase 3 interaction and accessibility polish — v2.8.4

Explore keeps the active filter, library, and adjustments visible. Author contains formula editing and collapsed **Technical diagnostics**, including the renderer selector, GPU eligibility, IR version, operation/pass counts, and a readable fallback reason. Explore no longer exposes technical footer details or long renderer exceptions. Renderer analysis and fallback remain owned by the renderer manager.

## Action semantics

- **Save Filter** opens the browser-local save dialog for built-in or unsaved filters. **Update Filter** opens it for the active saved custom identity; **Save as New** creates a separate copy. Existing imported-ID and cross-tab conflict decisions are preserved.
- **Reset to Pass Through** discards the active filter edits and loads the built-in Pass Through filter while retaining the source image. It is not a control-only reset or a revert to the last saved filter.
- **Update Preview** retains manual formula rendering and Ctrl/Command+Enter. Pending edits use a visible dot and text; invalid formulas retain their error icon, associated error description, and `aria-invalid` state.
- **Apply Embedded Filter** keeps the current source image and loads the PNG's validated embedded filter. **Open Image Only** opens the PNG without applying that filter. Cancel and invalid/newer metadata routing retain their existing behavior.

## Interaction and layout

Essential control borders use a separate token tested at a minimum 3:1 against the adjacent dark surfaces. Decorative dividers retain the existing palette. Keyboard focus has a chartreuse outline, selected tabs retain their filled background without underlining, preview buttons expose `aria-pressed`, and selected library cards include a checkmark and text. Favorites remain independent buttons. A completed candidate preview preserves focus if the user has moved to search.

Inactive workspaces use `hidden`; closed dialogs use native dialog focus containment. Native ranges announce their own values, with live output readouts disabled. Render progress remains a progressbar; the status region announces start, completion, and failure without repeating every row. Thumbnail completion is not a live announcement.

Coarse-pointer media queries enlarge important controls and native range interaction areas to at least 44 pixels. The inspector stays beside the artwork at desktop/laptop and landscape-tablet widths, and stacks on smaller screens. Narrow preview toolbars and runtime controls reflow. Library search/tools can scroll independently while Apply/Cancel remain reachable. Keyboard shortcut functionality remains available when touch layouts hide the visual badge.

The optional inspector-collapse control is deferred. This release adds no document history, control memories, renderer/compiler changes, or persisted format changes.

## Verification

Run `npm run verify` and the modular/standalone workflows in `tests/library-browser.html`. The browser fixture covers metadata labels, hidden panels, preview cues, identity-aware saving, focus restoration, selected-card semantics, Apply/Cancel, thumbnails, favorites/tags/search, and persistence failures.

Release checks on September 12, 2026 used headless Chrome 152 on Windows with an isolated browser context and the CPU renderer:

- `npm run verify`: syntax, all Node smoke suites, production build, and generated-output checks passed.
- The modular and generated v2.8.4 standalone library browser fixtures both passed, including a deferred-preview regression proving that completion preserves search focus.
- Mouse and emulated touch workflows opened a 64×48 source PNG, previewed three candidates, applied one, adjusted controls, edited a formula in Author, used Ctrl+Enter, returned to Explore, exported PNG, and exercised both embedded-filter choices at 1366×768, 1024×768, and 768×1024.
- Keyboard navigation exercised Tab, arrow-key workspace selection, search, independent favorite actions, Apply, sliders, formula editing/shortcut, visible textarea focus, and diagnostic disclosure. Hidden panels were skipped and launcher/formula/control-editor focus restoration passed.
- Layout checks covered 1440×900, 1366×768, 1024×768, 768×1024, 320×800, and a 640×360 CSS viewport equivalent to 200% zoom at 1280×720. Explore, Author, the control editor, and the library had no page-level horizontal overflow. Apply/Cancel remained in the viewport. Coarse-pointer emulation measured 44-pixel Apply, Cancel, favorite, close, and native range targets.
- Auto selection with a CPU-only bitwise formula displayed **CPU · Compatibility mode**; detailed fallback information remained available in Author.

Initial test-harness failures were resolved by selecting a slider-based fixture, waiting for asynchronous PNG-dialog completion, and avoiding full-page screenshots that reset touch emulation in this browser/runtime combination. A real toolbar overlap discovered with enlarged controls was fixed by allowing the preview toolbar row to size to its content.

The zoom check used an equivalent CSS viewport, not the browser's zoom menu. No physical tablet, screen reader, or hardware WebGPU pixel-parity test was run for this UI release.
