# Phase C — approved design decision

The user approved this approach on 2026-10-20. Phase C is implemented; see [implementation and verification](FILTER_LIBRARY_PHASE_C.md). The proposal below records the approved Phase C approach, which excluded Phase D at that time.

Subsequent authorization: the user separately requested Phase D. Its implementation is documented in [the Phase D report](FILTER_LIBRARY_PHASE_D.md); the exclusions below record the original Phase C scope.

## Evidence and desired result

At 778 × 622, Phase B retains the 473px-high native modal bottom sheet. Its top is approximately y=149; the fitted demo artwork starts around y=126. Only about 23px of artwork height is exposed above the sheet. Compact results now fit two complete rows, but browsing still prevents meaningful image evaluation. CSS suppresses the inspector, backdrop and edge launcher while the Library is open without changing their lifecycle or stored state.

## Proposed layout and modality

Keep `dialog.showModal()` and native focus containment. The canvas is visible but remains inert behind the modal. Do not add canvas input through the backdrop. Retain explicit candidate selection and Apply/Cancel/Escape semantics.

Choose the layout from measured workspace geometry, not the window width alone. Initial trial criteria: workspace width at least 740px, usable height at least 460px, and a 344px drawer plus 12px separation leaving at least 360px of canvas stage. At 778px, this leaves approximately 422px before toolbar/padding allowances. Measure the actual fitted artwork at the reproduction size before fixing these constants. Target at least a 280 × 280px available image box, with aspect ratio preserved; extreme portrait/landscape images need separate acceptance examples.

Use a bottom sheet when these conditions fail: phones, tall narrow windows, or short landscape windows. Existing desktop drawer widths can remain where they leave a meaningful artwork area. Observe the workspace container and visual viewport; avoid breakpoint oscillation by deriving layout from the unsplit workspace bounds. Do not introduce automatic minimization or Phase D controls.

## Canvas and inspector coordination

Add a temporary library presentation state in the app/UI layer, separate from the candidate transaction. Use a workspace column/inset to actually shrink the canvas stage alongside the drawer. Align the modal to that reserved column. A smaller stage naturally uses the existing `ResizeObserver` and `fitCanvas()` toolbar allowances; it recenters the fitted artwork into the remaining viewport instead of covering an unchanged stage.

The existing inspector API exposes only `hide()` and `destroy()`; it cannot safely implement temporary suspension and restoration. Add a narrowly scoped suspension API to `createInspectorLayout()`. Suspension must preserve `focused`, `opened`, `expanded`, width, mode, scroll positions, active input/selection and unsaved DOM values, and restore its original inert/focus behavior. Do not call `hide()` as a substitute, remove/rebuild the inspector, persist temporary visibility, or reset its controls. Suppress the splitter and edge launcher during the session. Restore inspector presentation before returning focus to the Library launcher. Continue letting the native modal handle Tab/Escape while open.

Before changing geometry, capture stage scroll and zoom mode/level. In Fit mode, resize through existing `fitCanvas()` and observer paths. In manual mode, preserve the numerical zoom level and pan position, clamp scroll only to valid extents, and do not silently refit. An oversized manually zoomed image can remain partially clipped; if a temporary Fit action is needed, it must be an explicit in-dialog action that restores the original manual zoom/pan on close. This is a decision to validate during implementation, not permission for automatic zoom changes.

Restore geometry in a deterministic order: end candidate render/cancellation through existing transaction code, restore inspector and stage layout, then refit only if the restored mode is Fit, restore valid scroll/focus, and release the suspension. Handle Apply, Cancel, Close, Escape, rejected previews, source replacement and unload through the same cleanup path. No renderer or filter-engine changes.

## Risks, validation and effort

Main risks are nested inspector modality, focus restoration while inert state changes, resize/fit feedback loops, toolbar reservation and splitter persistence, manual pan clamping, and stale asynchronous preview completions. Rendering overlays must stay inside the resized stage. Breakpoint changes during an open session must not recreate the Library or discard its selected identity/restrictions/page.

Add geometry and state restoration tests for 778 × 622, all Phase B sizes, 200% zoom, open/closed/expanded inspector states, both workspace modes, pending invalid formulas, unsaved values, scroll, Fit/manual zoom, resized splitter, portrait/landscape artwork, and resize across the side-drawer boundary while previewing. Acceptance requires meaningful side-by-side artwork at 778 × 622 in Fit mode, preserved manual zoom, restored inspector state and focus, and passing transaction regressions.

Estimate: approximately 2–3 development days including focused API changes and browser regression work, subject to the manual-zoom interaction decision and device QA.

**Approved scope:** measured side drawer, native modal semantics, temporary inspector suspension, and preservation of manual zoom. No Phase D implementation.
