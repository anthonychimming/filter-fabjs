# Architecture

Filter FabJS v2.9.1 uses a renderer-neutral compiler boundary so the formula language is not coupled directly to either rendering backend.

```text
Formula text
    ↓
Tokenizer / Parser
    ↓
Typed IR program
    ↓
RendererManager
    ├─ WebGPU renderer
    └─ CPU Worker renderer
    ↓
RGBA pixel output
```

## Module contracts

- `src/core/formula-language.js` — tokenization, parsing, formula validation, and syntax trees.
- `src/core/controls.js` — shared definitions for the ten public controls, rich-presentation validation, raw/display mapping, formatting, and the five control pairs.
- `src/core/chroma.js` — math-mode-specific chroma bounds shared by CPU and WebGPU code generation.
- `src/core/ir.js` — conversion from syntax trees to renderer-neutral typed IR, semantic metadata including simple constant-`val()` mapping inspection, and memoized canonical program keys.
- `src/io/png-metadata.js` — bounded PNG chunk parsing plus the versioned, CRC-checked Filter FabJS iTXt carrier; native filter validation remains in `src/io/filter-format.js`.
- `src/gpu/wgsl-compiler.js` — WebGPU compatibility analysis and typed-IR-to-WGSL compilation.
- `src/gpu/params-layout.js` — aligned WebGPU parameter-buffer sizing with twelve reserved control slots for the ten public controls.
- `src/renderers/renderer-backend.js` — shared renderer contract.
- `src/renderers/cpu-renderer.js` — CPU Worker lifecycle, shared retained source, keyed IR reuse, rendering, progress, lazy restart, and cancellation.
- `src/renderers/webgpu-renderer.js` — recoverable GPU buffers, shared retained source, entry/byte-bounded WGSL-plan/pipeline reuse, direct RGBA upload/readback, full-frame dispatch, source release, and queued/active cancellation.
- `src/renderers/renderer-manager.js` — renderer selection, immutable source coordination, entry/byte-bounded compatibility analysis and diagnostic snapshots, lazy source synchronization, inactive-backend release, cancellation-aware runtime CPU fallback, and bounded repeated program-failure quarantine.
- `src/presets/builtins.js` — built-in filter definitions, human-readable descriptions, and selected rich-control showcases.
- `src/io/filter-format.js` — size-bounded native JSON and historic AFS validation, normalized filter/control metadata, parsing, and validated-AST handoff to application preparation.
- `src/io/image-io.js` — image and clipboard encoding helpers.
- `src/app/filter-thumbnail-service.js` — bounded source downscaling, isolated thumbnail rendering, cancellation, prioritization, stale-result protection, and render-semantic LRU caching.
- `src/ui/*` — DOM, controls, and canvas presentation.
- `src/app/filter-fab-app.js` — application state and browser UI orchestration.

## Design rules

1. Formula parsing must remain independent of renderer-specific APIs.
2. Renderer backends consume typed IR programs rather than parser AST objects.
3. WebGPU-specific behavior belongs in `gpu/` or `renderers/`, not UI modules.
4. `WGSLCompiler.analyze()` is the sole authority for WebGPU compatibility; neutral IR metadata must not predict renderer support.
5. CPU fallback must remain explicit and report why GPU execution was unavailable or incompatible.
6. File-format parsing belongs in `io/`; rendering code should not know how a filter was loaded.
7. Shared application state should be coordinated by the app layer rather than mutated from renderer/compiler internals.

Filter descriptions are optional top-level metadata beside `name` and `author`. Rich control presentations are optional `ui` metadata beside each control's canonical `label` and `value`. Both are normalized before UI mutation and persistence. Display values are derived from canonical 0–255 values, and presentation metadata remains outside typed-IR execution, renderer selection, GPU parameter layout, CPU Worker evaluation, and program cache keys. IR `controlMappings` metadata inspects only straightforward constant `val(index,min,max)` calls for authoring feedback; it never changes execution.

## Current WebGPU boundary

The Phase 3.5 WebGPU subset covers supported deterministic stateless operations: arithmetic, conditions, ten controls, image and polar sampling, normalized and centered coordinates, coordinate shaping and repetition, scalar palette ramps, gradients, procedural patterns, analytic shape masks, signed-distance primitives and composition, deterministic noise, bounded Mandelbrot and Julia fields, blend operations, and fixed 3×3 convolution. Signed-distance fields remain ordinary scalar expressions inside the current one-pass program and become masks only through explicit fill/outline helpers; domain warping is coordinate composition rather than a second execution model. Fractal iteration is encapsulated inside compiler intrinsics with a shared 512-step ceiling; the formula language does not expose general-purpose loops. Operations outside the subset are identified by compatibility analysis and use the CPU Worker fallback. Phase 3.5D exposes the manager's authoritative analysis as a read-only diagnostic snapshot containing formula compatibility, current GPU eligibility, selected backend, fallback reason, operation count, and the current one-pass count. `pow()` remains CPU-only because WGSL does not define JavaScript-compatible results for negative bases.

The CPU renderer remains the compatibility backend for legacy integer-mode AFS filters, bitwise/shift/comma expressions, and operations with sequential or shared mutable state (`rnd()`, `rst()`, `get()`, and `put()`).

## Filter library

`core/filter-metadata.js` owns bounded tags, portable identity validation, and metadata comparison. `app/filter-catalog.js` projects metadata, searches/ranks cached catalog entries, persists per-entry local preferences, and checks target baselines before ID-based writes. `ui/filter-browser.js` owns the visual drawer, search/cards, lazy visibility observation, and action dialogs. The app owns the temporary library session: it snapshots the working presentation, rendered pixels, active saved/imported identity, saved-content baseline, and source-record baseline before any candidate is shown. Candidate presentation and rendering reuse normal validation and renderer-generation protection but do not commit identity or persistence. Apply promotes the prepared candidate; Cancel restores the snapshot without rerendering.

`app/filter-thumbnail-service.js` is a third, isolated preview path. It downsizes each new immutable source once to a maximum dimension of 160 pixels and gives that source to a dedicated `RendererManager`. Visible and near-visible cards enqueue their real validated program at concurrency one. Main-canvas rendering suspends and cancels thumbnail work, which resumes afterward if its UI request remains current. A 48-entry LRU uses source revision, thumbnail dimensions, and the existing render-semantic filter signature, so metadata/search/sort changes reuse pixels while formula, control, math-mode, and source changes do not. Thumbnail diagnostics never replace main renderer diagnostics, and no thumbnail result writes application document or canvas state. Catalog indexing never parses formulas.

Custom records retain `ffw-custom-presets`; favorites and built-in additions use `ffw-entry-v1:<builtin|custom>:<id>`. Existing custom ID migration is reused. Raw malformed entries and unrelated record fields survive writes. Search criteria are session-only. Storage events invalidate catalog projections and refresh preferences without applying a filter. Update re-reads its target and checks the captured record baseline, but shared-list localStorage writes are not atomic across tabs.

### Online catalog foundation (Stage 1)

```text
Online manifest metadata
    ↓
src/io/filter-library-manifest.js
    ↓
metadata-only CatalogEntry
    ↓
searchCatalog()
```

`validateOnlineLibraryManifest(value)` validates an already-parsed object and returns a fresh projection of known fields. Schema `filter-fab-js/library`, schema version 1 requires a positive safe-integer `libraryVersion` and at most 1,000 filters with unique portable IDs. Entries require a positive safe-integer revision, a trimmed 1–120-character name, `documentType: 'filter'`, `filterFormat: 2`, a preview descriptor (relative PNG/WebP path, integer dimensions 1–2048), and a separate package descriptor (relative PNG path). Author and description default to empty strings and are bounded to 120 and 2,000 characters; tags default to `[]` and reuse portable tag normalization. Optional `publishedAt` must be a real `YYYY-MM-DD` date; optional `generatedAt` must be a non-empty Date.parse-compatible string retained as supplied. Asset paths are bounded to 2,048 characters and timestamps to 120. Paths are trimmed, reject schemes, leading slashes, backslashes, controls, dot/traversal segments (including encoded forms), queries and fragments, and are never resolved to absolute URLs here. Unknown fields are discarded; no native filter document is parsed or fabricated.

`onlineCatalogEntry(metadata, preference)` consumes one normalized manifest entry. Its stable key is `online:<id>` and source is `online`; it projects name, description, author, curated tags, search index, favorite state, `unavailable: false`, and revision/type/format/date/asset descriptors under `remote`. Unresolved remote entries have `document: null` until a later package-resolution stage. Favorites reuse `ffw-entry-v1:online:<id>`; preference tags never augment curated Online tags. `searchCatalog()` retains default `source: 'all'` (every supplied entry), adds `local` (Built-in + Custom only), and supports `online` alongside existing individual source scopes.

Manifest validation is independent of network transport, PNG parsing, and rendering; remote catalog metadata does not enter the compiler or renderer. The manifest validator itself makes no network request. The transport, UI and package layers below connect validated entries to Online browsing and candidate preview while preserving local Built-in/My Filters behavior.

### Online browsing

`io/filter-library-client.js` adds static GET transport → bounded bytes → strict UTF-8/JSON decoding → Stage 1 validation → metadata-only catalog entries → Filter Library search/tags/favorites → lazy static Sample images. The single default endpoint is `https://anthonychimming.github.io/filter-fabjs-library/catalogue.json`. Requests omit credentials, disallow redirects, use `cache: 'no-store'`, reject declared or received bodies above 8 MiB, and support caller cancellation plus a 12-second timeout. The client accepts HTTPS, with HTTP loopback allowed for test fixtures. Asset paths resolve against the validated manifest URL and must retain its origin; this catalogue client does not fetch packages.

The app owns `createOnlineLibrarySession()`: idle/loading/ready/error state, one in-flight request, generation-guarded completion, explicit Retry, and successful metadata retained in the page session (Stage 4 adds validated persistent fallback below). The app initializer accepts test-only dependency injection for the manifest URL and fetch implementation; there is no production URL preference. Local `catalog()` remains the Author dropdown's source. The browser receives local plus Online projections, with preference invalidation on favorite writes and storage events. The manifest itself is never modified by preferences.

The visible source options are now All local (default), Built-in, My Filters, and Online. Only first entering Online in a page session or explicit Retry requests a manifest; startup and local sources do not. Loading, empty catalog, no search matches, and error are distinct browser states. Online cards use decorative static `<img>` samples, a Sample badge, separate favorites, and existing 50-entry pagination. Stage 3 adds the explicit package actions described below. The existing 180-pixel observation margin (first eight fallback) assigns image URLs lazily; UI generations isolate late callbacks. Online entries retain `document: null` and never enter local definition resolution or thumbnail rendering. Browsing alone never prepares or previews a filter. An existing local candidate remains intact when browsing Online. Local Apply/Cancel/Close/Escape restoration is unchanged.

Package loading, PNG metadata extraction, current-image preview, Apply and Download PNG are described below, followed by the cache layers. Renderer/compiler/PNG codec contracts are unchanged. Controlled Node tests and `tests/online-library-browser.html` exercise local fixtures without the production endpoint.

### Online package use

`io/filter-library-package.js` implements Online CatalogEntry → the Stage 2 same-origin asset resolver → bounded package GET → existing `extractFilterFabMetadata()` → existing `validateNativeFilter()` → catalogue identity checks. The package limit is 8 MiB (declared length and received bytes, stopping streamed responses at the limit); empty bodies fail. Requests omit credentials, disallow redirects, check any reported final response origin, use `cache: 'no-store'`, and support caller abort plus an 18-second timeout. HTTPS and loopback-only HTTP follow the existing resolver. MIME and filename are not trusted as format validation.

The existing PNG decoder validates chunk structure, the matching FilterFabJS iTXt CRC, its envelope/schema, document type, and native v2 carrier; it does not verify every PNG chunk CRC or decode image pixels. Native validation retains formula/control/metadata bounds. Normalized `id`, `name`, `author`, and `description` must equal the catalogue; tags compare canonical sets using existing normalization and `tagKey` (order and case ignored). Revision and publication time remain catalogue metadata. This proves package/catalogue consistency, not cryptographic authorship.

`fetchOnlineFilterPackage()` returns `{entryKey, revision, packageUrl, bytes, document}`. The persistent Online entry remains metadata-only with `document === null`. Candidate resolution stays independent of catalogue entries. Stage 4 retains bounded validated session copies as described below. Preview and Download have separate abort controllers; concurrent duplicate Download clicks for the same key are ignored.

Only an explicit Online Preview action resolves and prepares the package, then joins the existing library candidate session and renderer. Main renders continue to use the immutable current source image, never candidate output. Each selection increments session request ownership and aborts prior resolution. A superseded in-progress render is cancelled and rolled back to the last completed candidate before the next presentation. Package/preparation failure leaves that candidate and its canvas unchanged. Request/session generations reject late results, including transports that ignore abort. Source selector changes do not transfer candidate ownership. Cancel/Close/Escape restore the original full snapshot; actual source/document replacement invalidates pending operations and closes the session before replacing state. Renderer cancellation completion also checks its generation before changing locks/status.

Online Apply commits `key: null`, the portable package `id`, `imported: true`, `importSource: 'online'`, and `recordBaseline: null`, with a baseline of the applied native document. It is unsaved, does not write My Filters, and keeps provenance outside native v2. Existing Author Save can create an independent My Filter. Download validates separately, then passes a Blob of the exact original bytes to the existing download helper as `filterfab-<validated id>.png`; it never uses canvas re-encoding, candidate selection, or installation. The existing helper revokes object URLs after initiation. Sample images remain static; a successful Online candidate is labelled **✓ Previewing on canvas**.

Controlled coverage lives in `online-library-package-smoke.mjs`, `online-package-ui-smoke.mjs`, and `online-package-browser.html` (also `?standalone=1` after a build). Stage 2 discovery/local regression coverage remains in `online-library-browser.html`. Neither suite requires the public endpoint. Stage 4 adds persistent catalogue metadata and session package reuse below. Persistent packages, offline installation and update checks remain unimplemented. The separate publishing repository now serves the production launch catalogue through GitHub Pages, with five filters at libraryVersion 2. No formula, native format, typed IR, compiler, renderer, or Phase 4 engine changes are involved.

## Stage A fractal refinement (2.8.5)

`MAX_FRACTAL_ITERATIONS` is the single shared 512 ceiling interpolated into both worker and WGSL source. CPU static budgeting derives conservative numeric bounds from typed IR constants, unary signs, controls, constant-endpoint `val()`, `clamp()`, `min()`, `max()`, and bounded selects. It matches f32 conversion and truncation before clamping the loop cost. Unknown bounds and legacy integer-mode expressions use 512; argument evaluation remains fully counted. Control bounds assume the validated native 0–255 control contract. This internal renderer helper adds no capability predictions to neutral IR metadata.

CPU selects cost one node plus the condition and the maximum branch cost, including nested operations. Other operations retain their existing conservative estimates. The 3,000,000,000 work-unit guard is unchanged. A literal 128-iteration call previously cost 256 loop units and now costs 128; `val(3,32,256)` costs 256 and `val(3,32,512)` costs 512. Pop Print Quad now fits the maximum image size with the corrected lazy-branch estimate.

Stage A did not change GPU ternaries. Stage B (2.8.5b), described below, adds scoped conditional lowering; Stage C (2.8.5c) adds the restricted cross-channel sharing described below. Automatic CPU fallback, cancellation, native format v2, legacy AFS, typed IR v1, and the one-pass architecture remain unchanged.

Run `npm run benchmark:fractal` for deterministic 64×64 CPU Worker workloads at 128/256/512 iterations (early escape, boundary, and interior regions for both intrinsics). Timings are observational, with no timing pass/fail thresholds. The optional `tests/webgpu-parity.html` suite adds early/slow/bounded and above-ceiling fixtures at 256/384/512/9999 with the existing max-3, mean-0.35 byte tolerance. Add `?benchmark=1` for optional hardware timings in the browser console. See [Stage A validation](FRACTAL_STAGE_A.md) for the release measurements and manual test targets.

## Stage B GPU conditional lowering (2.8.5b)

The WGSL compiler classifies a branch as expensive when its typed-IR subtree contains `mandelbrot`, `julia`, `fbm`, `turbulence`, `ridged`, `worleyF1`, `worleyF2`, `cnv`/`cnv0`/`cnv1`, or `sierpinski`. This deterministic rule covers bounded loops and repeated sampling, including calls nested inside ordinary arithmetic, wrappers, conditions, or selections. It is compiler-local and does not change `WGSLCompiler.analyze()` or neutral IR metadata.

A ternary with expensive work in either branch produces an f32 temporary assigned inside an actual WGSL `if/else`. The compiler captures each branch's statements separately, so nested work remains under the correct guard. Logical `&&`/`||` retain native short-circuit expressions unless their right operand needs statements; in that case a guarded bool temporary preserves short-circuit execution. Cheap ternaries retain inline WGSL `select()`. All names are deterministic and unique within a shader.

Stage B did not perform cross-channel sharing. Stage C adds eligible unconditional field sharing while preserving these branch scopes. The 512 ceiling, CPU execution and budgeting, numeric coercion, clamp rules, fallback, cancellation, typed IR v1, native format v2, and single-pass architecture remain unchanged. See [Stage B validation and manual checks](FRACTAL_STAGE_B.md).

## Stage C shared procedural fields (2.8.5c)

Before output emission, the WGSL compiler interns structural signatures of validated typed-IR nodes using child IDs. Signatures preserve operation, expression type, identifier/operator/function, constant value (including signed zero), and ordered arguments. The pass is bounded by the existing 4,096-node GPU compatibility limit, uses compile-local maps, and leaves IR, metadata, canonical program keys, pipeline resource limits, and compatibility analysis unchanged. No source-text matching or preset-specific rules are used.

Only `mandelbrot`, `julia`, `fbm`, `turbulence`, `ridged`, `worleyF1`, and `worleyF2` call roots qualify, and only if structurally identical independent calls occur on unconditional paths in at least two output channels. Dependency-ordered f32 `let ff_shared_*` declarations then feed the existing output expressions. Cheap wrapper operations remain in their channels; this is not a general CSE pass or algebraic simplifier.

Independence propagates through every child. `c`, `c0`, `c1`, `z`, `p`, and implicit-channel `cnv`/`cnv0`/`cnv1` block sharing of an enclosing field. Unsupported/stateful functions remain blocked by GPU analysis and cannot qualify. Explicit-channel source reads may qualify only when their arguments are independent; source pixels are immutable during the pass.

Both ternary branches and logical right operands are treated as guarded, regardless of constant conditions. Their calls never establish eligibility. Conditions and logical left operands remain unconditional. A field already required by two unconditional channels can also be reused inside a guard, but branch-only work is never moved out. Nested field dependencies are emitted first; nested lazy arguments still use Stage B statement capture. There is no branch-local CSE, global value cache, intermediate texture, additional dispatch, new IR/schema, or CPU optimization.

See [Stage C completion report](FRACTAL_STAGE_C.md) for complexity, regression risk, GPU timings, and manual test steps.


### Online resilience and package reuse (Stage 4)

`io/filter-library-cache.js` owns best-effort persistent metadata, separate from package resolution. The `ffw-online-library-cache-v1` localStorage record is `{cacheSchema:1, manifestUrl, storedAt, manifest}`. The URL must exactly match the configured manifest URL; every read reuses Stage 1 validation. Only normalized metadata is written, with a 2 MiB serialized UTF-8 record limit. Invalid/unsupported/oversized records are ignored; denied storage and quota failures are nonfatal. A larger valid network catalogue remains usable in memory without replacing the previous saved record. `storedAt` is informational only.

On first explicit Online use per page, the app lazily reads saved metadata and immediately exposes ready cards, then refreshes through the unchanged bounded Stage 2 client. No Online cache read or request occurs at startup or in local sources. State adds `provenance: saved|network|null`, `refreshing` and `refreshWarning`. Failed/invalid/older refreshes retain good data and show a nonblocking notice with Retry; no-cache failures keep Stage 2's blocking Online error. Retry retains cards. Equal/higher `libraryVersion` is accepted; lower versions are rejected with a developer warning. Publishing changes, including rollbacks, must increment this monotonic version. Writes recheck existing saved versions, but localStorage is not a cross-tab transaction.

Successful refresh rebuilds only metadata projections, preserving search/tags/sort/favorites and clamping pagination. Removed entries disappear without deleting preference keys or changing an existing candidate. The package cache prunes removed/revised/URL-changed or metadata-mismatched entries; generations prevent older pending requests repopulating pruned records.

`createOnlinePackageCache()` in `io/filter-library-package.js` wraps only successful Stage 3 validation results. It is a page-session LRU bounded to 12 entries and 32 MiB (PNG bytes plus serialized UTF-8 native-document payload). Keys include the exact manifest URL, stable entry key, revision and resolved package URL. Hits still check authoritative catalogue identity. Each consumer receives independent document/byte copies; the cache holds no renderer state, controls state, DOM, prepared program or persistent package storage. Oversized entries skip insertion, errors/aborts never insert, and count/byte eviction cannot mutate an active candidate. Native documents remain off the persistent metadata-only CatalogEntry (`document === null`).

Preview and Download reuse completed results; Download preserves the original PNG bytes. Concurrent single-flight is deliberately deferred: each unresolved Preview/Download retains its own abort controller, avoiding shared-request cancellation ownership changes. Cache hits still cross the existing request/session generation guards. Apply remains an unsaved imported Online document, and all existing candidate snapshot/restoration/source-baseline rules remain in force.

`online-library-cache-smoke.mjs`, `online-package-cache-smoke.mjs` and `online-cache-ui-smoke.mjs` cover storage, version, LRU, aliasing and refresh state. The package browser fixture covers network/cache races, cache reuse and exact cancellation; `?saved=1&cpu=1` covers immediate saved-card preview, refresh failure/Retry, removal of the candidate's card and exact Cancel restoration. Automated fixtures inject isolated storage; manual mode uses real localStorage and the same production cache paths. Publishing/GitHub Pages/CI are documented below; persistent packages, an offline shell, polling, automatic updates and community sources remain absent. Renderer/compiler/native v2/Typed IR contracts are unchanged.


## Online publishing (Stage 5)

The separate `filter-fabjs-library` repository supplies the static feed. The main app owns the Node publisher and reuses its native, PNG and Online validators. See [Online Library publishing](ONLINE_LIBRARY_PUBLISHING.md) for registry/revision rules, immutable historical PNGs, deterministic builds, validator pinning, deployment gates and release QA. The centralized production URL remains `https://anthonychimming.github.io/filter-fabjs-library/catalogue.json`. The launch catalogue has libraryVersion 2 and five production filters with standardized Sample images and portable PNG packages; test fixtures are never publication seeds.
