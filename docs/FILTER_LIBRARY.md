# Filter Library — v2.8.3

The Explore workspace opens a canvas-visible **Filter Library**. On desktop it docks as a right-side drawer with no backdrop blur over the artwork; on narrow screens it becomes a bottom sheet so part of the canvas remains visible.

The compact Current filter dropdown remains in Author for intentional direct switching. Dropdown selection retains its existing immediate replacement behavior. The Explore library instead uses an explicit session:

```text
Open Filter Library
→ select one or more temporary candidates
→ Apply Filter to commit the current candidate
   or
→ Cancel / Close / Escape to restore the opening state
```

## Candidate-preview state

The application layer owns the temporary session. Opening the library snapshots the exact working presentation and document state, including raw metadata/formula fields, math mode, controls and control UI definitions, compiled-program state, active built-in/custom/imported identity, dirty and record baselines, imported source, rendered pixels, render provenance, formula validation UI, and renderer diagnostics.

Selecting a visual card validates the target through the normal preparation path, presents it temporarily, and renders it against the current source image. The selected card receives a persistent pressed/selected state and the library remains open. Rapid selection increments both a library request generation and the existing render generation; stale work is cancelled before the newest candidate is presented.

Card thumbnails are a separate preview tier. Their low-resolution render never selects a candidate, changes the active document, updates the main canvas, or substitutes for the authoritative candidate render required before Apply Filter is enabled.

Candidate preview does not write local storage and does not update the persistent active key, portable ID, imported flag, saved-content baseline, or source-record baseline. Favorite and built-in personal-tag actions retain their separate immediate preference semantics.

If validation fails, the working presentation is not changed. If rendering fails, the preceding candidate or opening presentation is restored and the error is announced inside the library.

**Apply Filter** is enabled only after a candidate renders successfully. Applying promotes the already rendered presentation into the normal built-in or custom identity and baseline without an unnecessary second render. A custom record that was deleted or changed in another tab must be previewed again before it can be applied.

**Cancel**, the close button, and **Escape** share the same restoration path. Active preview work is cancelled silently, the exact opening state and pixel buffer are restored without rerendering, the library closes, and focus returns to the launcher. This preserves dirty built-in, dirty custom, imported, pending-formula, and invalid-formula work.

## Search, cards, tags, and favorites

Search matches stored names, descriptions, authors, and tags, never formula source or unsaved edits. Every whitespace-separated query term must match somewhere in the metadata. Matching ignores case and diacritics; tag identity preserves accents and punctuation. Relevance sorts exact names first, then name prefixes, all terms in the name, and other matches. Ties use name, source, and stable identity.

Source, Favorites only, text, and selected tags combine with AND. Selected tags match all. Tag choices come from the source/favorite scope before text and tag restrictions. Reset view clears all criteria; Clear search clears only text. Clicking a card tag clears the other restrictions and browses that exact normalized tag from page one.

Each card contains a real source-based thumbnail, filter name, Built-in/My Filter source badge, author, concise description, tags, and a separate favorite control. Cards appear immediately with a neutral checkerboard placeholder. Visible and near-visible cards move through queued/rendering to ready; a failed thumbnail shows **Preview unavailable** without removing or disabling the filter. Actual thumbnail canvases are decorative and do not add keyboard stops.

One downsized immutable source is prepared for each loaded image with a maximum dimension of 160 pixels and no upscaling. A dedicated `RendererManager` executes the same validated typed-IR programs as the main renderer, using normal WebGPU analysis and CPU fallback without publishing its diagnostics to the ordinary renderer UI. Thumbnail concurrency is one. Starting an authoritative main-canvas render suspends and cancels active thumbnail work; current requested work resumes afterward.

`IntersectionObserver` requests only cards within or 180 pixels beyond the scrolling results viewport. Browsers without it request a bounded first batch of eight cards. Search, restrictions, sorting, paging, and library close discard pending DOM-specific requests. Source, request, and render generations prevent late results from attaching to replacement cards.

Completed pixel buffers use a 48-entry LRU cache. Keys contain the source revision, thumbnail dimensions, and the same math-mode/formula/control render signature used for main render provenance. Formula, control, math-mode, and source changes therefore miss or invalidate the cache; name, author, description, tags, favorites, search, source label, and sort order do not. The cache remains in memory only and is retained across library close for the current source.

Results are paged at 50 entries. Pagination is hidden when the complete result set fits on one page.

Tags normalize to NFC, trim outer whitespace, collapse internal whitespace, and compare by lowercase identity. They retain their readable label. Each document accepts up to 20 tags of 1–32 Unicode code points. Control and format characters are rejected. Existing-tag suggestions are searchable and bounded to 50.

Custom filters and drafts have document tags below Description in Author. Built-ins show read-only Included tags plus My tags, which save immediately in this browser without making the document dirty. Exporting a built-in includes the union of supplied and personal tags. Favorites never leave browser storage.

## Identity, persistence, and compatibility

Existing `builtin:<id>` and `custom:<id>` identities are retained. A rename with Update preserves the ID, favorites, and creation timestamp. Save as new creates a fresh identity and starts without favorites. A matching name never selects an update target.

An import loads an unsaved draft and does not add a library record. Saving an imported portable ID offers the existing equality/conflict decisions. Missing IDs are allocated on Save or Export. Export and rendering do not mark a draft saved.

The custom library retains `ffw-custom-presets` and its existing ID migration. Per-entry preferences retain `ffw-entry-v1:<entry-key>` with `{version:1,favorite:boolean,tags:string[]}`. Unknown record fields and malformed raw entries survive library writes; corrupt storage is not replaced with an empty list. Native v1/v2, historic AFS, rich-control metadata, PNG metadata, typed IR v1, WebGPU selection, and CPU fallback contracts are unchanged.

Storage events refresh the catalog and preferences without intentionally applying a candidate. Update re-reads and compares the target baseline immediately before writing. **localStorage is not transactional**: simultaneous shared-list writes can still race. Export important filters individually.

## Accessibility and layouts

The launcher exposes dialog semantics and the generated library is labelled by **Filter Library**. Search receives initial focus. Card preview and favorite are separate keyboard-focusable controls with independent pressed states. Thumbnail visibility also responds to keyboard focus and touch selection; hover is not required. Thumbnail canvases are decorative, failures add concise descriptive text to the existing card action, and background completions are not announced through a live region. The optional fade respects `prefers-reduced-motion`. Status and errors use live/alert semantics. Apply is disabled until the authoritative candidate preview succeeds. Ordinary Tab navigation reaches search, restrictions, tags, cards, Cancel, and Apply.

Desktop uses a full-height right drawer. At 920 CSS pixels or narrower the library uses a viewport-bounded bottom sheet; short-height layouts make tools and results independently reachable. Pagination is removed from layout when hidden. No physical touch or screen-reader speech claim is made without dedicated testing.

## Validation record — September 11, 2026

- `npm run verify`: passed syntax checks, all Node smoke suites (including the lazy thumbnail service), the production build, and build-output validation after the Phase 2.1 implementation.
- Browser workflow fixture: `tests/library-browser.html`. Both the modular application and generated standalone passed the Phase 2 workflows plus bounded thumbnail dimensions, single-render concurrency, lazy opening, main-program/canvas isolation, cache reuse, keyboard-stop behavior, and close cancellation. The generated standalone used WebGPU in the available Chromium session.
- A direct browser pass observed 4 of 35 thumbnails ready on initial open and 10 after scrolling, with the rest remaining lazy. Scrolling back reused completed previews; search reused the matching cached preview; an offscreen selected candidate was prioritized and rendered normally without changing the active filter until Apply.
- Responsive browser checks passed at 1,366 × 768, 1,024 × 768, 768 × 1,024, 318 × 798, and 638 × 358 CSS pixels. These cover the desktop drawer, portrait bottom sheet, narrow mobile, and 200%-zoom-equivalent layouts. A keyboard pass opened the library with Enter, reached search, restrictions, the first preview and its separate favorite action with Tab, skipped the decorative thumbnail canvas, and restored launcher focus with Escape.
- WebGPU and forced-CPU rendering were exercised in the browser; both produced real lazy card thumbnails. Coarse-pointer emulation, physical touch, and screen-reader speech were not tested.
- The same fixture retains the bounded 1,000-entry performance projection. One generated-standalone run in local Chromium 152 observed a 30.4 ms opening and 12.8 ms p95 query-plus-layout time; timings are local observations, not cross-device guarantees.
- Renderer/compiler/formula source was not changed. All 35 built-ins continue to compile as WebGPU-compatible in the automated suite.
- The release build is `dist/filter-fabjs-v2.8.3.html`. Direct `file://` behavior can vary by browser security policy, so localhost remains the supported test path.

Run the complete verification workflow with:

```bash
npm run verify
```
