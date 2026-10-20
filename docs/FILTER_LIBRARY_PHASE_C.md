# Filter Library Phase C

Implemented following explicit approval of [the design decision](FILTER_LIBRARY_PHASE_C_PROPOSAL.md). Phase D remains deferred. No automatic minimization, new canvas gestures, renderer changes, commits, pushes or deployment.

## Behavior and boundaries

The Library remains a native modal dialog. The artwork is visible beside the drawer but the canvas and the rest of the app remain inert until Apply, Cancel, Close or Escape finishes the session. Previewing a candidate still does not commit it.

`src/ui/library-layout.js` measures the unsplit workspace and usable height (excluding the header/status bar). A side drawer requires at least 740px width, 460px usable height, and 360px remaining canvas width after the drawer and 12px separation. Drawer width is 32% of the workspace, bounded to 344–378px. Other geometries use a bottom sheet, with full-height behavior on phones and short windows. The visual viewport resize/scroll events update geometry when available; this is not a claim of real-device keyboard verification.

Only the preview pane reserves drawer space. Keeping the existing top bar at the workspace width avoids a resize/toolbar-wrapping feedback loop; its right-hand portion can sit behind the native modal while inert. Header/navigation functionality is otherwise unchanged. The existing canvas stage, Fit calculation, toolbar container rules, split overlay and resize observer fit and center the artwork inside the remaining stage. Portrait, landscape and square images keep their aspect ratios. The render overlay stays inside the stage.

`createInspectorLayout().suspend()` temporarily removes the inspector, splitter, backdrop and edge tab from presentation without persisting temporary preferences. Opened/hidden/expanded/width state survives while suspended. If the desktop/compact breakpoint changes, release maps the original visible/hidden state to the new inspector presentation, keeping the launcher available for focus restoration. On release, DOM values remain intact, scroll and text selections restore, and the appropriate inspector modality is reinstated. Normal Library close restores focus to its launcher after geometry cleanup. Existing candidate rollback restores unsaved metadata and invalid/pending formulas on Cancel; Apply retains its intentional document commit behavior.

Canvas viewport capture/restore preserves manual zoom and original pan (subject to valid scroll bounds); opening, resizing and closing never silently switch manual zoom to Fit. Fit mode refits when the usable stage changes. Image replacement is a deliberate exception: it closes the Library and retains the new source's ordinary Fit behavior rather than restoring the old image's manual zoom.

The Library handles Escape before a populated Search field can consume it, except during text composition. Tab/Shift+Tab wrap at visible enabled dialog controls; native modality remains responsible for making the background inert. Compact card styling now follows the actual Library container, including a narrow drawer on a wide desktop.

## Measured layouts

Headless Microsoft Edge on Windows, CPU renderer, blocked production Online catalogue so the fallback/Retry notice remains visible. These are CSS pixels. Row counts include only complete cards.

| Viewport | Presentation | Remaining stage width | Fitted demo artwork | Complete rows |
|---|---|---:|---:|---:|
| 778 × 622 | Side drawer | 422px | 374 × 249px | 3 |
| 1024 × 768 | Side drawer | 668px | 620 × 413px | 4 |
| 768 × 1024 | Side drawer | 412px | 364 × 243px | 7 |
| 390 × 844 | Bottom sheet | 390px | 342 × 228px behind sheet | 6 |
| 320 × 568 | Bottom sheet | 320px | 272 × 181px behind sheet | 2 |
| 640 × 360 | Bottom sheet | 640px | 131 × 87px behind sheet | 1 |
| 1440 × 900 | Side drawer | 1050px | 950 × 633px | 6 |
| 1440 × 420 | Bottom sheet | 1440px | 368 × 245px behind sheet | 2 |
| 740 × 700 | Side drawer | 384px | 336 × 224px | 4 |
| 720 × 450 | Bottom sheet | 720px | 266 × 177px behind sheet | 2 |

At 778 × 622, Phase B exposed approximately 23px of artwork above its sheet; Phase C exposes the full fitted artwork beside the drawer. No horizontal overflow was observed in these cases. Oversized manual zoom may still clip the artwork as intended; it is not automatically refitted. Phone/short-window sheets can still hide artwork. Phase D remains a separate decision.

## Verification

- PASS: `library-layout-smoke`, `library-compact-smoke`, `inspector-layout-smoke`, `canvas-view-smoke`; includes width/height eligibility, preserved inspector expansion across suspended breakpoint changes, idempotent release, no temporary preference writes, and viewport mode/zoom/pan restoration.
- PASS: `library-layout-browser.cjs`: ten geometries above; real modal state and contained Fit geometry; control visibility; unsaved metadata/invalid formula/selection/scroll/expanded inspector restoration; resize with a selected candidate/search preserved; manual zoom/pan across layout transitions; Apply/Close/Cancel/Escape cleanup; Tab containment; render overlay containment; cancellation during an artificially delayed render and stale completion; image replacement from manual zoom; portrait/landscape/square Fit. No page errors.
- PASS: the Phase B `library-responsive-browser.cjs` regression suite, including compact Online action geometry, paging at 320px, active restrictions, coarse-pointer focus and 200%-equivalent geometry. Native dialog focus assertions wait for its asynchronous close event.
- Existing Node Online discovery/package/cache tests and generated static/standalone build smoke checks pass.
- Existing Online package browser workflows pass in modular and standalone builds. Actual `file:` standalone and static-site startup/preview/Escape smoke checks pass.
- The old Library browser workflow still fails before its later checks on its pre-existing Adjust reset-label assertion (expects “Reset to Pass Through”, current unchanged UI displays “Reset”), in both modular and standalone builds.
- `npm run verify` was run. Core, renderer, UI, catalogue/cache, publishing and Library Manager assertions emitted success output, but the Library Manager sync process did not terminate normally, matching the baseline limitation. Full verification must not be described as a clean PASS. See `../../library-phase-c-verify.log`.
- Real on-screen keyboard, true browser/OS 200% zoom, Safari/Firefox, assistive-technology announcements and hardware WebGPU parity remain manual/unverified. The 720 × 450 CSS viewport is a 200% equivalent geometry check, not a substitute for actual browser zoom.

Screenshots/raw measurements are in `../../library-ux-review/phase-c/`. A standalone for manual testing is saved as `../../library-ux-review/filter-fabjs-phase-c.html`. Generated repository `dist/` output is exercised then excluded from the patch per repository guidance. Prior Phase B artifacts and pre-existing untracked `review-results/` are preserved. Work remains uncommitted on `main` at base HEAD `42067cb`.
