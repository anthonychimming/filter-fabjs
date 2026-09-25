# Filter Library — v2.9.0

v2.9.0 brings Built-in, My Filters and Online into the same Filter Library, with search, tags, favorites and pagination. All local remains the default; Online is selected explicitly. Local interaction history is recorded in [UI Phase 3](UI_PHASE_3.md); the dated validation records below describe earlier development checkpoints.

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

**Apply Filter** is enabled only after a candidate renders successfully. For a local candidate, applying promotes the already rendered presentation into the normal built-in or custom identity and baseline without an unnecessary second render. Online Apply instead creates an imported, unsaved filter, as described below. A custom record that was deleted or changed in another tab must be previewed again before it can be applied.

**Cancel**, the close button, and **Escape** share the same restoration path. Active preview work is cancelled silently, the exact opening state and pixel buffer are restored without rerendering, the library closes, and focus returns to the launcher. This preserves dirty built-in, dirty custom, imported, pending-formula, and invalid-formula work.

## Search, cards, tags, and favorites

Search matches stored names, descriptions, authors, and tags, never formula source or unsaved edits. Every whitespace-separated query term must match somewhere in the metadata. Matching ignores case and diacritics; tag identity preserves accents and punctuation. Relevance sorts exact names first, then name prefixes, all terms in the name, and other matches. Ties use name, source, and stable identity.

Source, Favorites only, text, and selected tags combine with AND. Selected tags match all. Tag choices come from the source/favorite scope before text and tag restrictions. Reset view clears all criteria; Clear search clears only text. Clicking a card tag clears the other restrictions and browses that exact normalized tag from page one.

Each local card contains a real source-based thumbnail, filter name, Built-in/My Filter source badge, author, concise description, tags, and a separate favorite control. Cards appear immediately with a neutral checkerboard placeholder. Visible and near-visible cards move through queued/rendering to ready; a failed thumbnail shows **Preview unavailable** without removing or disabling the filter. Actual thumbnail canvases are decorative and do not add keyboard stops.

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

## Online Filter Library

Source now offers **All local** (default), **Built-in**, **My Filters**, and **Online**. Opening local sources never requests Online data. Selecting Online loads a bounded static manifest; loading, an empty catalogue, no search matches, and a failed request with Retry are distinct. Successful metadata is saved as a bounded last-known-good catalogue; first Online use on a later page immediately shows validated saved cards while refreshing. There is no periodic polling. Reset view returns to All local. Card tags browse All local for local cards and remain Online for Online cards.

Online entries are metadata-only (`document: null`). They reuse metadata search, match-all tags, favorites, sorting and pagination. Online cards show lazy static **Sample** images from standardized reference artwork, with **Sample unavailable** on image failure. These Sample images do not render against the current source image. Selecting an Online card explicitly loads its package and previews it on your current source image. Favorites never fetch packages or install filters. Browsing alone cannot enable Apply; a previously rendered candidate remains available for Apply or Cancel. Author's preset dropdown and local thumbnail workflows stay local-only.

The production static catalogue is delivered by the separate `filter-fabjs-library` GitHub Pages repository at `https://anthonychimming.github.io/filter-fabjs-library/catalogue.json`. Its launch state is `libraryVersion: 2`, with five entries: **Chromatic Neon Contour**, **CRT Display**, **Levels / Midtone**, **Turbulent Displace** and **Lens Distortion**. Transport uses HTTPS, omitted credentials, an 8 MiB response bound, a 12-second timeout, cancellation and manifest validation. Catalogue metadata is persisted as last-known-good data; validated packages are cached only in memory for the page session, as described below.

For controlled manual testing, run `npm run dev` and open `http://localhost:8080/tests/online-library-browser.html`. The test-only app initializer injects a local URL/fetch implementation. Its first request fails; Retry serves three entries, two static PNG samples and one intentional broken-image path. **Run Stage 2 browser checks** verifies failure isolation, search/favorites, unchanged canvas/program/diagnostics, local candidate coexistence and Cancel restoration. Reload the fixture before rerunning; the check restores its test favorite preference. The fixture also remains usable interactively. Existing local workflow checks remain at `tests/library-browser.html`, for both modular and standalone builds.

For discovery regressions, check local default/no network; Online success and Sample labels; failure/Retry; broken sample plus usable Favorite; local Apply and exact Cancel/Escape restoration; desktop/narrow layouts; and keyboard reachability/focus restoration. Real endpoint availability/CORS and physical touch/screen-reader behavior require their own checks.

Stage 2 validation: the new client/UI Node smoke tests and full `npm run verify` pass. The controlled browser fixture passes for modular code and the generated standalone (`online-library-browser.html?standalone=1`), including rapid local candidate switching, pending-formula Escape restoration, My Filter Apply, and Close restoration. Desktop and narrow sample-card layouts were inspected. The older `library-browser.html` workflow currently stops at its pre-existing “single-page catalogs hide inert pagination” assertion: the baseline now includes 52 built-ins, exceeding the 50-entry page size. That assertion has not been weakened; its fixture assumption needs a separate update before relying on the complete older browser run.

Online Preview shows **Loading preview…**, then **Previewing…**, and finally **✓ Previewing on canvas**. The card image stays a standardized Sample; the main canvas uses your current source image. Failed fetch/validation leaves the last completed candidate and canvas intact, with a retry available by selecting the card again. Rapid selection keeps only the latest intended candidate. Cancel, Close, and Escape restore the exact original working filter, including unsaved edits; source/document replacement invalidates pending work.

Apply makes the resolved native filter active as **Imported from Online · Not saved**. It preserves the portable ID and does not automatically add My Filters. Use the ordinary Author Save workflow later to keep an independent local filter. No catalogue revision is added to native v2.

The separate **Download PNG** icon validates the package, then downloads its exact original bytes as `filterfab-<id>.png`. It does not preview, enable Apply, change favorites, or install a filter. Duplicate clicks while that download is pending share no extra request. Package transport is limited to the manifest origin, 8 MiB and 18 seconds; the existing PNG/native validators and catalogue metadata match are mandatory. Validation establishes consistency, not cryptographic authorship. Validated packages are reused within the page session, under the Stage 4 limits below.

Run `npm run dev` and open `http://localhost:8080/tests/online-package-browser.html` for controlled package/race/download checks; append `?standalone=1` after `npm run build` to test the standalone build. Run the existing Stage 2 fixture for discovery and local regressions. For local regression QA, manually check Online preview and Sample labelling; Cancel/Close/Escape during loading; rapid switching; Apply followed by Author edit/Save; Download followed by PNG image opening and embedded-filter import; malformed/unavailable packages; and keyboard/focus and narrow-screen layouts for Preview/Favorite/Download/Apply/Cancel.


## Validation record — September 11, 2026 (local library)

- `npm run verify`: passed syntax checks, all Node smoke suites (including the lazy thumbnail service), the production build, and build-output validation after the Phase 2.1 implementation.
- Browser workflow fixture: `tests/library-browser.html`. Both the modular application and generated standalone passed the Phase 2 workflows plus bounded thumbnail dimensions, single-render concurrency, lazy opening, main-program/canvas isolation, cache reuse, keyboard-stop behavior, and close cancellation. The generated standalone used WebGPU in the available Chromium session.
- A direct browser pass observed 4 of 35 thumbnails ready on initial open and 10 after scrolling, with the rest remaining lazy. Scrolling back reused completed previews; search reused the matching cached preview; an offscreen selected candidate was prioritized and rendered normally without changing the active filter until Apply.
- Responsive browser checks passed at 1,366 × 768, 1,024 × 768, 768 × 1,024, 318 × 798, and 638 × 358 CSS pixels. These cover the desktop drawer, portrait bottom sheet, narrow mobile, and 200%-zoom-equivalent layouts. A keyboard pass opened the library with Enter, reached search, restrictions, the first preview and its separate favorite action with Tab, skipped the decorative thumbnail canvas, and restored launcher focus with Escape.
- WebGPU and forced-CPU rendering were exercised in the browser; both produced real lazy card thumbnails. Coarse-pointer emulation, physical touch, and screen-reader speech were not tested.
- The same fixture retains the bounded 1,000-entry performance projection. One generated-standalone run in local Chromium 152 observed a 30.4 ms opening and 12.8 ms p95 query-plus-layout time; timings are local observations, not cross-device guarantees.
- At the v2.8.7 checkpoint, the catalog contained 52 built-ins, all attributed to Anthony Chimming and all compiling as WebGPU-compatible in the automated suite.
- The current release-preparation build is `dist/filter-fabjs-v2.9.0.html`. Direct `file://` behavior can vary by browser security policy, so localhost remains the supported test path.

Run the complete verification workflow with:

```bash
npm run verify
```

### Deterministic manual Online QA (development only)

From the repository, run `npm run dev`, then open **http://localhost:8080/tests/online-package-browser.html?manual=1**. Do not open the production standalone through `file://` for fixture QA: it retains the future production endpoint and a null origin. No production URL setting or production conditional is added.

The manual harness uses the existing `initFilterFabApp({onlineManifestUrl, onlineFetchImpl})` test injection. It supplies a local manifest URL and controlled Response objects for that manifest and its package PNGs; Sample images are ordinary localhost assets. Responses still run through the production Stage 1 manifest validator, Stage 2 catalogue client/session, and Stage 3 bounded package client, PNG decoder and native filter validation. Packages are generated using the existing PNG metadata writer. There is no production endpoint dependency; manual mode exercises the normal Stage 4 caches.

- **Online A:** valid red-inversion package, Warm/Colour tags, Fixture Author, static colour Sample.
- **Online B:** valid green-inversion package, Cool/Colour tags, Beatrice, static wave Sample.
- **Online Broken:** deliberately missing Sample and malformed package; Favorite still works, Preview/Download fail without replacing the current candidate.
- Uncached catalogue/package responses wait 700 ms in manual mode for visible loading and cancellation/race checks. Downloads are real PNG files. Favorites and explicit Author Save use this localhost origin's normal storage. Manual mode never runs the automated checks or intercepts downloads.

For a deterministic catalogue error, open **http://localhost:8080/tests/online-package-browser.html?manual=1&manifestFailure=1**, enter Online, then click Retry: the first manifest response is 503 and Retry succeeds. If you previously opened Online in manual mode, saved cards stay usable with a nonblocking refresh notice; otherwise the usual Online error is shown. Reload resets this failure scenario.

To test the generated standalone using the same fixtures, first run `npm run build`, then open **http://localhost:8080/tests/online-package-browser.html?manual=1&standalone=1** while the dev server is running. The harness injects only into its in-memory copy of the generated app; the standalone file and production default URL remain unchanged. The production URL is still `https://anthonychimming.github.io/filter-fabjs-library/catalogue.json`.


### Stage 4 cache QA

The saved catalogue uses `ffw-online-library-cache-v1`, schema 1, tied to the exact manifest URL and revalidated on read. It stores normalized metadata only, at most 2 MiB serialized UTF-8. Storage failures are nonfatal. Equal/newer catalogue versions replace it; older/invalid/failed responses retain it. Publishing rollbacks must use a higher `libraryVersion`.

Validated package reuse is memory-only: at most 12 entries / 32 MiB including document payload, evicted least-recently-used. Identity, revision and URL changes force a fresh resolution. Every Preview/Download gets independent copies; editing an applied filter cannot change later cache hits. Completed Preview → Download and Download → Preview reuse the package. Independent concurrent requests retain their existing cancellation behavior; single-flight is deferred. Reload discards packages. Saved catalogue metadata does not promise offline packages or Sample images.

1. Run `npm run dev` and open `http://localhost:8080/tests/online-package-browser.html?manual=1`. Local sources remain default. Open Online and verify Samples, search/tags/favorites and both valid packages.
2. Reload using `?manual=1&manifestFailure=1`. Enter Online: saved cards appear immediately, then the nonblocking refresh warning with Retry. Search/Preview/Download remain usable. Retry removes the warning on success without clearing the view.
3. Preview A, switch to B, then A, and Download A. The fixture's request counter should stop increasing for reused packages. Reload and preview A: it requires a fresh package request.
4. Rapidly switch candidates, Cancel/Close/Escape while loading, and verify original state restoration. Apply, edit in Author, reopen and preview the same Online entry: the published definition remains intact. My Filters changes only after explicit Save.
5. Verify Online Broken still fails gracefully and Retry/favorites remain independent. Check keyboard focus and narrow layouts for the saved-catalogue notice and actions.

Automated browser modes use isolated storage, so manual saved records cannot hide a tested network failure. Run `online-package-browser.html?cpu=1` for package/cache/race regressions and `online-package-browser.html?saved=1&cpu=1` for saved refresh/removal/restoration. Append `&standalone=1` after `npm run build` to exercise generated code. All three Stage 4 Node suites are part of `npm run verify`.


Stage 4 validation: prerequisite and final `npm run verify` passed, including all three new cache suites, build and build-output validation. The integrated package fixture passed all 39 checks in modular and generated standalone forced-CPU runs; the saved-catalogue fixture passed all 8 checks; the Stage 2 discovery/local fixture passed all 27 checks. Manual localhost storage was exercised across navigation: three saved cards survived an intentional manifest failure, with nonblocking Retry. No hardware WebGPU parity, physical touch or screen-reader speech claim is made. The older local fixture pagination assumption noted above remains a separate pre-existing issue.


## Online publishing (Stage 5)

The separate `filter-fabjs-library` repository supplies the static feed. The main app owns the Node publisher and reuses its native, PNG and Online validators. See [Online Library publishing](ONLINE_LIBRARY_PUBLISHING.md) for registry/revision rules, immutable historical PNGs, deterministic builds, validator pinning, deployment gates and release QA. The centralized production URL remains `https://anthonychimming.github.io/filter-fabjs-library/catalogue.json`. The production launch catalogue contains five published filters with standardized 512×512 Sample images and portable PNG packages; test fixtures are never publication seeds.
