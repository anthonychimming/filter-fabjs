# Filter Library Phase D — explicit image viewing

Implemented after the user's separate authorization to proceed with Phase D. This extends the existing Phase B/C implementation on `main` at base HEAD `42067cb`. No commit, push, merge or deployment.

## Interaction

The bottom sheet now offers **View Image** after a candidate preview is ready. Favorites, thumbnails and package downloading do not enable it. While another candidate is loading/rendering, image viewing is disabled under the same ready-preview rules as Apply. Selecting a filter never automatically hides the browser.

View Image keeps the existing native modal and candidate transaction open. Discovery and results are hidden, and a compact bar retains **Back to Filters**, **Close**, **Cancel** and **Apply Filter**. Temporary image-view CSS suppresses the inert app header, status bar and canvas toolbar, reserving the actual remaining stage above the bar. Fit mode centers the artwork in that space; manual zoom is preserved. The underlying canvas remains inert, with no added zoom/pan gestures or interaction through a native modal.

Back to Filters reveals the same DOM and restores result/discovery scroll, query, source, favorite restriction, sort, tags, disclosure, page, candidate identity and rendered pixels. Scroll restoration also handles results refreshed while hidden. Focus stays on the toggle, so returning does not automatically focus Search or summon a keyboard.

The side drawer continues to show the artwork and filters together and hides the unnecessary toggle. A user's explicit image-view preference survives a resize through side-drawer geometry during that session. A new session always starts at Filters, with View Image disabled until a valid preview. Apply, Cancel, Close, Escape, image replacement and unload retain the existing shared cleanup paths. Apply/Cancel errors are also copied to the existing live status so they remain announced while the result area is hidden.

## Files

- `src/ui/filter-browser.js`: accessible toggle/help, results identity, readiness gating and failure announcements. No filter/transaction/render semantics changed.
- `src/ui/library-layout.js`: explicit view state, measured bar height, visible-viewport positioning, reserved canvas inset, scroll/focus handling and cleanup. Normal header height is measured for breakpoint selection even while image viewing hides it; this prevents feedback between sheet/drawer eligibility and hidden chrome.
- `styles/app.css`: scoped modal-bar and temporary image-area presentation. The preview pane remains explicitly in the expanding workspace row while the header/status are hidden.
- `tests/library-image-view-browser.cjs`: focused real-browser tests, including a `--touch` check. Existing compact tests add ready-preview gating assertions; Phase C browser artifacts can be directed to a separate review directory.

No renderer, formula engine, catalogue schema, cache, search semantics, pagination contract, app navigation functionality or global gesture changes.

## Measured image-view geometry

Microsoft Edge headless on Windows, CPU backend. The selected preview is fully contained above the bar, with no horizontal overflow.

| CSS viewport | Fitted demo artwork | Control bar height |
|---|---:|---:|
| 390 × 844 | 342 × 228px | 111px |
| 320 × 568 | 272 × 181px | 111px |
| 640 × 360 | 308 × 205px | 99px |
| 720 × 450 | 443 × 295px | 99px |
| 1440 × 420 | 398 × 265px | 99px |

These measurements use the ordinary fine-pointer context. A separate 320 × 568 coarse-pointer check confirms at least 44px button heights, contained controls and native modality. The 720 × 450 case is a 200%-equivalent CSS geometry check; true browser/OS zoom remains unverified.

Normal browsing geometry still passes the Phase C suite at 778 × 622, 1024 × 768, 768 × 1024, 390 × 844, 320 × 568, 640 × 360, 1440 × 900, 1440 × 420, 740 × 700 and 720 × 450. At 778 × 622 the side drawer still shows three complete cards beside 374 × 249px fitted artwork in a 422px stage.

## Verification

- PASS: `node tests/library-image-view-browser.cjs`. Explicit-only entry, readiness, native modality, contained artwork and controls, available stage height, Tab containment, restrictions/page/scroll restoration (including hidden refresh), unchanged preview pixels, selected identity, Apply and Escape, fresh-session reset, rotation, manual zoom/pan, page two of a 105-entry custom catalogue and advanced tags/sort/search. It also exercises View Image/Back in generated static-site and real `file:` standalone builds. No page errors.
- PASS: `node tests/library-image-view-browser.cjs --touch`. 320px coarse-pointer emulation, 44px targets, no automatic Search focus, image viewing, Back and launcher focus restoration.
- PASS: Phase C `library-layout-browser.cjs` regression suite: ten geometries, inspector/draft/selection/scroll restoration, candidate state across resizing, manual zoom, Apply/Cancel/Close/Escape, delayed-render cancellation, stale completion, image replacement, portrait/landscape/square Fit.
- PASS: compact Library, inspector, canvas-view, layout eligibility, Online discovery, Online package and Online cache Node smoke checks; syntax checks; separate production build and generated-output checks.
- PASS: existing Online package browser workflows in modular and standalone builds; static-site and actual standalone `file:` startup/preview/Escape smoke checks.
- Known pre-existing failure: old Library browser workflow stops at its Adjust reset-label assertion in modular and standalone builds (expects “Reset to Pass Through”, unchanged UI displays “Reset”). Its later assertions were not run.
- `npm run verify` was attempted. Core/render/UI/catalogue/cache/publishing and Library Manager assertions printed success, but the Library Manager sync process remained running after its success output, matching the baseline problem. It was stopped. Full verification is **incomplete**, not a clean PASS. Log: `../../library-phase-d-verify.log`.
- Not performed: real-device on-screen keyboard, Safari/Firefox, assistive-technology announcement QA, actual OS/browser zoom or hardware WebGPU parity. Touch emulation does not imply these passed.

Screenshots, browser workflow output and raw image-view measurements are in `../../library-ux-review/phase-d/`. The manual-test standalone is `../../library-ux-review/filter-fabjs-phase-d.html`. Prior Phase B/C standalones and review files are preserved. Generated repository `dist/` files are tested then excluded from the source patch per repository guidance. All changes remain uncommitted.
