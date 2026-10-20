# Compact Filter Library — Phases A/B review

Implemented against `main`, HEAD `42067cb` (v2.9.5). No commit, push, merge or deployment. Phase C is a proposal only; Phase D is not implemented.

## Baseline and structure

The native modal is a 520px desktop drawer, a 76dvh bottom sheet below 920px, and full height below 560px or at short heights. The header, discovery controls, pagination and footer consume space outside the results. They are flex siblings, not sticky rows. `.filter-results` is the scrolling `ul` and remains the `IntersectionObserver` root with a 180px preload margin. Discovery has its own overflow when expanded. Native dialog cancellation invokes the explicit restoration path; backdrop clicks do not close it. Desktop opens with Search focused and close returns focus to the launcher.

Old compact rows reserved large thumbnails, wrapped metadata and tags, and switched to full-width 90px thumbnails below 560px. A stacked footer and separately reserved pagination further reduced browsing space. At 778 × 622 the available dialog height was 472.72px: 268.13px above results, 82.14px below, leaving 122.45px of results and no complete card.

## Implementation

- `src/ui/filter-browser.js`: accessible description, Source and checkbox Favorites, native Filters disclosure for Sort/Tags, hidden restriction count and conditional Reset view, count/paging header, coarse-pointer focus on Close. Card-tag navigation opens the disclosure to make its focus target visible. Removing the last chip restores focus to a visible control.
- `styles/app.css`: bounded flex results with `min-height:0`, 48–56px compact thumbnails, three text lines with truncation, separate Favorite/Download actions side by side, compact single-row action footer with safe-area padding, short-height adjustments, visible focus outlines. Compact tag browsing moves to Filters; desktop retains per-card tag shortcuts. Verbose footer feedback remains available through its existing live region, with selection/loading/error indicators on cards.
- Inspector, backdrop and edge launcher are visually suppressed using modal-scoped CSS opacity/pointer rules. Their state, layout allocation and lifecycle remain intact. Native dialog modality provides actual input containment. Canvas fitting is deliberately deferred.
- `package.json`: includes the focused compact smoke suite. New Node/browser test files cover the disclosure, counters, composition, paging, focus, preview transaction and responsive geometry. No runtime dependency added.

## Measured layouts

Headless Microsoft Edge/Chromium on Windows, CSS pixels, CPU renderer, deterministic blocked Online origin (the visible fallback/Retry notice is included in these measurements). Cards are counted only if their entire border box is inside the result viewport. Default All/Filters collapsed. Online cards with both actions were additionally tested at 778 × 622 with a controlled ready catalogue.

| Viewport | Complete rows before → after | Chrome above results before → after | Chrome below before → after | Horizontal overflow after |
|---|---:|---:|---:|---|
| 778 × 622 | 0 → 2 | 268.13 → 239.30px | 82.14 → 51.30px | None |
| 1024 × 768 | 2 → 2 | 296.13 → 281.30px | 62.30 → 52.30px | None |
| 768 × 1024 | 2 → 5 | 268.13 → 239.30px | 82.14 → 51.30px | None |
| 390 × 844 | 1 → 6 | 325.06 → 281.30px | 82.14 → 51.30px | None |
| 320 × 568 | 0 → 2 | 342.45 → 298.69px | 82.14 → 51.30px | None |
| 640 × 360 | 0 → 1 | 217.86 → 215.30px | 78.14 → 51.30px | None |
| 1440 × 900 | 3 → 3 | 296.13 → 281.30px | 62.30 → 52.30px | None |

At 778 × 622, results now have approximately 182.13px. Search, Source, Favorites, Close and action buttons are contained in the viewport; a 55-entry Online fixture confirms two complete cards and usable paging/Favorite/Download actions. A 105-entry fixture checks paging at 320px. The inspector no longer visually competes with the Library, but the existing sheet still covers most artwork. About 23px of the demo artwork is exposed above it at 778 × 622. On phones the full-height Library hides the artwork. These are Phase C/D issues, not claims of completed preview coordination.

## Verification

Run the browser scripts with an existing Playwright installation (`FILTER_FAB_PLAYWRIGHT` may identify its module path). Browser tooling is a development-only dependency supplied by the local environment.

- `npm run verify`: attempted before and after. Initial sandbox run failed on EPERM renaming a publishing-test temporary directory. Runs outside that restriction passed all core/UI/render/catalogue/cache/publishing suites preceding Library Manager. Baseline reached Library Manager sync success output but did not exit; the after run stalled in `library-manager-smoke.mjs`. These processes were stopped after more than ten minutes. Full verification is **incomplete**, not PASS. Logs are retained outside the repository in the project folder.
- `node tests/library-compact-smoke.mjs`: PASS. Disclosure values/badge/reset, IME composition, paging structure/50-row cap, observer root, independent favorite/preview/Apply/Cancel, focus.
- Existing `online-library-ui-smoke`, `online-package-ui-smoke`, `online-cache-ui-smoke`: PASS. Combined restrictions, loading/failure/retry, selection identity, package/download independence and asynchronous cache/refresh behavior.
- `node tests/library-responsive-browser.cjs`: PASS. Seven audited viewports, real-app candidate identity/Escape restoration and Tab containment, 320px paging and disclosure, Online action geometry, coarse-pointer opening, 720 × 450 equivalent layout for 200% scaling. No page errors.
- `node tests/library-workflows-browser.cjs`: mixed results. Existing Online package browser suite PASS in modular and standalone builds, covering packages, races and download lifetime. Static-site startup/preview/Escape and actual `file:` standalone startup/preview/Escape PASS. Existing library-browser workflow FAIL in both builds at its obsolete reset label assertion (expects “Reset to Pass Through”; current unchanged Adjust UI uses “Reset”). Its later checks therefore did not run; no claim of complete legacy workflow coverage.
- `npm run check`, `npm run build`, `node tests/build-output-smoke.mjs`: PASS. Separate GCM, GitHub, Library Manager UI and support-link smoke checks PASS.
- Not performed: Firefox/Safari, real device on-screen keyboard, true browser/OS 200% zoom, hardware WebGPU parity, assistive-technology announcement QA, and live production Online service. The CPU/controlled-fixture checks do not imply these passed.

Screenshots and raw JSON measurements are in `../../library-ux-review/`, with `before-`/`after-` names for all seven sizes, plus narrow paging, coarse pointer, Online cards and zoom-equivalent captures. Generated `dist/` files were exercised but are excluded from the review patch per repository guidance. Existing untracked `review-results/` files were preserved.

Review [the Phase C proposal](FILTER_LIBRARY_PHASE_C_PROPOSAL.md) before authorizing further implementation.
