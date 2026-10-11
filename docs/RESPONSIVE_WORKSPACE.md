# Responsive workspace and inspector

The image workspace owns the app header, preview toolbar, composition stage,
and preview status. The single Explore/Author inspector occupies a separate
full-height region, starting at the viewport top on desktop. Existing theme,
filter actions, formulas, controls, and renderer behavior are preserved.

At 1024 CSS pixels and wider, drag the divider to resize the inspector. Its
default is 384px, its minimum is 320px, and its maximum is the smallest of
520px, 44% of app width, and the space remaining after reserving 640px for
the workspace. Focus the separator and use Left/Right to widen/narrow by
16px, Shift for 32px, or Home/End for the bounds. Double-click resets the
default. Switching Explore/Author never changes width.

The versioned `ffw-workspace-layout` browser preference stores only desktop
width. Malformed preferences and inaccessible storage fall back gracefully.
Viewport constraints temporarily clamp the displayed width without replacing
the preferred width. Focus mode is session-local: Hide inspector expands the
workspace, and Show inspector restores the same forms, mode and scroll.

At 768–1023px the Inspector launcher opens a right drawer. Below 768px it
opens a full-width 80dvh sheet; Expand sheet provides full viewport height.
Overlays start closed and close on backdrop, Close or Escape. The workspace
is inert while the overlay is open; keyboard focus stays in the inspector
and returns to the launcher on dismissal. Native Filter Library and control
editor dialogs take precedence over the inspector's Escape and Tab handling.
Crossing a breakpoint closes transient overlays without discarding edits.
Desktop returns to its previous focus-mode state and preferred width.

Only inspector content scrolls. Fit recomputes placement as the stage changes;
manual zoom retains pixel scale and aspect ratio, with scrollable overflow
for navigation. Split remains a separate image interaction. Layout actions
never compile formulas, change pixels, or request a filter render.

## Verification

`npm run verify` includes `tests/inspector-layout-smoke.mjs`, covering width
bounds, bad/unavailable storage, pointer and keyboard persistence, modal
focus, state restoration, responsive transitions, and shell ownership.
Existing canvas and UI tests continue to cover the shared preview workflow.

The browser acceptance matrix is 1920×1080, 1440×900, 1280×800, 1024×768,
920×720, 768×1024, 560×800 and 390×844. Check both packaged outputs as well
as development, including standalone `file:` loading. Narrow toolbars wrap
to keep every file action accessible. The specified 384px default differs
from the screenshot's wider inspector; its ownership and full-height
alignment follow the approved target.

No formula, file-format, IR, renderer, release version, or Phase 4 changes
are part of this UI refinement. Hardware WebGPU parity is outside this
layout verification.

Implementation review used headless Edge at all eight sizes, with before/after
screenshots. Pointer and keyboard resizing, width persistence across reload,
session-local focus mode, unsaved Author edits across breakpoint changes,
Escape/focus restoration, nested dialogs, manual zoom, and Split passed.
Touch emulation, all ten controls, long formulas, and the effective viewport
sizes corresponding to 125%/200% zoom were checked. Both static-site and
standalone `file:` builds passed inspector interaction checks. Native browser
zoom controls, physical mobile keyboards, Firefox and Safari remain manual QA.
