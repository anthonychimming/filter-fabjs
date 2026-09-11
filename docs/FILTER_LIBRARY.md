# Filter Library — v2.8.2

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

Candidate preview does not write local storage and does not update the persistent active key, portable ID, imported flag, saved-content baseline, or source-record baseline. Favorite and built-in personal-tag actions retain their separate immediate preference semantics.

If validation fails, the working presentation is not changed. If rendering fails, the preceding candidate or opening presentation is restored and the error is announced inside the library.

**Apply Filter** is enabled only after a candidate renders successfully. Applying promotes the already rendered presentation into the normal built-in or custom identity and baseline without an unnecessary second render. A custom record that was deleted or changed in another tab must be previewed again before it can be applied.

**Cancel**, the close button, and **Escape** share the same restoration path. Active preview work is cancelled silently, the exact opening state and pixel buffer are restored without rerendering, the library closes, and focus returns to the launcher. This preserves dirty built-in, dirty custom, imported, pending-formula, and invalid-formula work.

## Search, cards, tags, and favorites

Search matches stored names, descriptions, authors, and tags, never formula source or unsaved edits. Every whitespace-separated query term must match somewhere in the metadata. Matching ignores case and diacritics; tag identity preserves accents and punctuation. Relevance sorts exact names first, then name prefixes, all terms in the name, and other matches. Ties use name, source, and stable identity.

Source, Favorites only, text, and selected tags combine with AND. Selected tags match all. Tag choices come from the source/favorite scope before text and tag restrictions. Reset view clears all criteria; Clear search clears only text. Clicking a card tag clears the other restrictions and browses that exact normalized tag from page one.

Each card contains a bounded decorative swatch, filter name, Built-in/My Filter source badge, author, concise description, tags, and a separate favorite control. The swatch is a lightweight placeholder derived from the stable entry key; only the selected card renders the full current source image. The library never eagerly renders every card.

Results are paged at 50 entries. Pagination is hidden when the complete result set fits on one page.

Tags normalize to NFC, trim outer whitespace, collapse internal whitespace, and compare by lowercase identity. They retain their readable label. Each document accepts up to 20 tags of 1–32 Unicode code points. Control and format characters are rejected. Existing-tag suggestions are searchable and bounded to 50.

Custom filters and drafts have document tags below Description in Author. Built-ins show read-only Included tags plus My tags, which save immediately in this browser without making the document dirty. Exporting a built-in includes the union of supplied and personal tags. Favorites never leave browser storage.

## Identity, persistence, and compatibility

Existing `builtin:<id>` and `custom:<id>` identities are retained. A rename with Update preserves the ID, favorites, and creation timestamp. Save as new creates a fresh identity and starts without favorites. A matching name never selects an update target.

An import loads an unsaved draft and does not add a library record. Saving an imported portable ID offers the existing equality/conflict decisions. Missing IDs are allocated on Save or Export. Export and rendering do not mark a draft saved.

The custom library retains `ffw-custom-presets` and its existing ID migration. Per-entry preferences retain `ffw-entry-v1:<entry-key>` with `{version:1,favorite:boolean,tags:string[]}`. Unknown record fields and malformed raw entries survive library writes; corrupt storage is not replaced with an empty list. Native v1/v2, historic AFS, rich-control metadata, PNG metadata, typed IR v1, WebGPU selection, and CPU fallback contracts are unchanged.

Storage events refresh the catalog and preferences without intentionally applying a candidate. Update re-reads and compares the target baseline immediately before writing. **localStorage is not transactional**: simultaneous shared-list writes can still race. Export important filters individually.

## Accessibility and layouts

The launcher exposes dialog semantics and the generated library is labelled by **Filter Library**. Search receives initial focus. Card preview and favorite are separate keyboard-focusable controls with independent pressed states. Click/tap is sufficient; hover is not required. Status and errors use live/alert semantics. Apply is disabled until preview succeeds. Ordinary Tab navigation reaches search, restrictions, tags, cards, Cancel, and Apply.

Desktop uses a full-height right drawer. At 920 CSS pixels or narrower the library uses a viewport-bounded bottom sheet; short-height layouts make tools and results independently reachable. Pagination is removed from layout when hidden. No physical touch or screen-reader speech claim is made without dedicated testing.

## Validation record — September 11, 2026

- `npm run verify`: passed syntax checks, all Node smoke suites, the production build, and build-output validation after the Phase 2 implementation.
- Browser workflow fixture: `tests/library-browser.html`. Both the modular application and generated standalone passed open-state identity, initial focus, hidden single-page pagination, favorite isolation, invalid-candidate recovery, rapid candidate switching, preview storage isolation, exact dirty pixel/document Cancel, Apply identity, Escape, dirty custom restoration, imported restoration, catalog filters, and existing save/import/delete conflict behavior.
- Responsive browser checks passed at 1,440 × 900, 1,366 × 768, 1,024 × 768, 768 × 1,024, 318 × 798, and 638 × 358 CSS pixels. These cover the desktop drawer, portrait bottom sheet, narrow mobile, and 200%-zoom-equivalent layouts.
- The same fixture retains the bounded 1,000-entry performance projection. One local Chromium 152 run observed a 31.6 ms opening and 12.2 ms p95 query-plus-layout time; timings are local observations, not cross-device guarantees.
- Renderer/compiler/formula source was not changed. All 35 built-ins continue to compile as WebGPU-compatible in the automated suite.
- The release build is `dist/filter-fabjs-v2.8.2.html`. Direct `file://` behavior can vary by browser security policy, so localhost remains the supported test path.

Run the complete verification workflow with:

```bash
npm run verify
```
