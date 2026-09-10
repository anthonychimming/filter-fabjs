# Filter library — v2.7.2

The browser panel is titled **Filter search**.

The Filter dropdown provides direct access to built-ins, benchmarks, and My Filters. The separate Filter search button beside it opens the temporary Filters dialog. Name and Author occupy row two; Save, Delete, Reset, and saved status occupy row three. Buttons use the compact heights from v2.6.7. Dropdown and search-result selections validate the target and then replace the current editor contents immediately without an unsaved-changes warning; imported drafts have their own unsaved display option. Search matches stored names, descriptions, authors, and tags, never formula source or unsaved edits. Every whitespace-separated query term must match somewhere in the metadata. Matching ignores case and diacritics; tag identity preserves accents and punctuation. Relevance sorts exact names first, then name prefixes, all terms in the name, and other matches. Ties use name, source, and stable identity.

Source, Favorites only, text, and selected tags combine with AND. Selected tags match all. Tag choices come from the source/favorite scope before text and tag restrictions. Reset view clears all criteria; Clear search clears only text. Each result shows its source and author metadata, followed by compact individual tag buttons instead of a Details dropdown. Clicking a result tag clears text, source, favorites, and previous tag restrictions, then shows all filters with that exact normalized tag from page 1. Every tag is available as a button; they wrap when needed. Results are paged at 50 entries. Search state lasts for the page session.

## Tags and favorites

Tags normalize to NFC, trim outer whitespace, collapse internal whitespace, and compare by lowercase identity. They retain their readable label. Each document accepts up to 20 tags of 1–32 Unicode code points. Control and format characters are rejected. Commas remain literal punctuation, not separators. Existing-tag suggestions are searchable and bounded to 50.

Custom filters and drafts have document tags below Description. Built-ins show read-only Included tags plus My tags, which save immediately in this browser without making the document dirty. Favorites belong to saved entries. Starring does not load, render, or save the editor draft. Failed preference writes leave the previous visible state intact and report an error.

Exporting a built-in includes the union of supplied and personal tags. Personal additions therefore become visible portable metadata. Favorites never leave browser storage.

## Identity and drafts

Existing `builtin:<id>` and `custom:<id>` identities are retained. A rename with Update preserves the ID, favorites, and creation timestamp. Save as new creates a fresh identity and starts without favorites. A matching name never selects an update target; a distinct name is suggested but not required.

An import loads an unsaved draft and does not add a library record. Saving an imported portable ID offers Use saved record when normalized portable content is equal, or explicit Update existing / Save as new / Cancel when it differs. Missing IDs are allocated on Save or Export. An exported built-in/detached working copy retains its newly allocated portable ID for subsequent exports or first save. Export does not mark a draft saved.

Saved state is separate from preview state. Changes to name, author, description, tags, math mode, formulas, control values, labels, or control presentation metadata participate in draft comparison. Rendering never clears unsaved changes. Filter selection, search-result loading, Reset, and Import replace dirty or imported drafts immediately without a warning dialog. Invalid target filters fail validation before replacement. Delete targets the loaded custom ID, can retain dirty content as a detached unsaved draft, and immediately removes the deleted entry from both the dropdown and search catalog.

## Persistence and compatibility

The custom library retains `ffw-custom-presets` and its existing ID migration. Optional `tags` and portable `id` are preserved by the native v2 validator. Native v1/v2 and historic AFS rendering remain supported. AFS begins without tags/portable identity and retains legacy math mode. Existing ten-control presentations and both renderer boundaries are unchanged.

Per-entry preferences use `ffw-entry-v1:<entry-key>` with `{version:1,favorite:boolean,tags:string[]}`. Custom entries have no extra personal tag layer. Unknown record fields and malformed raw entries survive library writes; corrupt storage is not replaced with an empty list. Native exports retain only validated portable fields.

Storage events refresh the catalog and preferences without replacing the draft. A changed source record requires an explicit decision before Update; a deleted source detaches the draft. Updates re-read and compare the target baseline immediately before writing. **localStorage is not transactional**: simultaneous shared-list writes can still race. This release does not provide collection backup, cloud sync, graph documents, or batch management. Export important filters individually.

The v2.6.7 validator was tested against a v2 document containing the new fields: known rendering fields remain readable, but `id` and `tags` are dropped by that older reader. Older-version re-export is not a metadata-preserving round trip.

## Accessibility and layouts

The browser uses native dialogs, labels, checkboxes, buttons, lists, the Tags expander, and ordinary Tab navigation. Search gets initial focus; Enter in Search does not load a result. Close/Escape return focus to the launcher. Favorites have separate actions and pressed states. Removing the last focused favorite moves focus to Show all filters. The launcher locks during rendering.

The normal dialog keeps controls above the scrolling results. At viewport heights of 500 CSS pixels or less, the controls also scroll independently to preserve access to all actions with usable touch targets. This is a deliberate small-viewport adaptation. Narrow layouts wrap fields and tags without widening the canvas.

## Validation record — September 10, 2026

- `npm run verify`: passed syntax checks, all Node smoke suites, production build, and standalone/build-output validation.
- All 35 built-ins compile as GPU-compatible programs. Formula, IR, CPU, GPU, and manager implementation files are unchanged. Seven contributed filters retain formula programs that can exceed the CPU work budget on sufficiently large images; this accepted limitation is documented in `PROJECT_STATUS.md` and covered by explicit budget tests.
- Browser workflow fixture: `tests/library-browser.html`. Modular and standalone workflows cover export identity/tag preservation, local-only favorites, no preview/program changes while organizing, focus after unfavoriting, invalid-load recovery, immediate filter/search/import/reset replacement without the retired warning dialog, ID-based rename/copy, malformed-record preservation, cross-tab conflict cancellation, unsaved imports, quota failures, duplicate-import decisions, dirty deletion retention, and immediate dropdown/search removal after clean deletion.
- Native Enter/Escape and launcher focus restoration were checked. Layout checks passed at 318 × 798 CSS pixels (320-pixel iframe including borders) and 638 × 358 CSS pixels, approximating a 1280 × 720 desktop viewport at 200% zoom. The latter exposed a clipped result area; the short-height scrolling adaptation fixed it. Actual browser zoom, physical touch, and screen-reader speech were not independently tested.
- Performance: Windows x64, Codex in-app browser reporting Chromium 152, 1,000 synthetic metadata entries, 30 queries, forced DOM layout, bounded 50-row results. Observed openings were approximately 11–23 ms and p95 query-plus-layout approximately 12–26 ms. These are local observations, not cross-device guarantees. Hardware model enumeration was denied by the environment; timing starts after catalog projection and does not measure cold storage loading.
- Hardware CPU/WebGPU parity: **40/44 fixtures passed**. The same untouched v2.6.7 baseline produced identical failures:

| Fixture | Maximum byte difference | Mean difference |
| --- | ---: | ---: |
| Mandelbrot field | 189 | 0.5330 |
| Centered angle | 128 | 0.1795 |
| Signed-zero angle | 128 | 128.0000 |
| Angular gradient | 255 | 4.3072 |

These pre-existing numeric differences were not changed as part of search and organization. CPU fallback and compatibility smoke tests pass; this result does not claim universal hardware parity.

The standalone HTML is tested over localhost. Direct `file://` behavior can vary by browser security policy, so local-file opening remains a user test. The v2.7.2 deliverable is `dist/filter-fabjs-v2.7.2.html`. No commit, push, or deployment is performed by the release workflow.
