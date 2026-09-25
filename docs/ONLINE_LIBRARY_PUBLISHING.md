# Online Library publishing (Stage 5)

Filter FabJS v2.9.0 retains native JSON v2 and Typed IR v1. Application releases
and catalogue revisions are separate: publishing library content does not
automatically change the app version. App release preparation coordinates
package.json, interface/version documentation and the normal generated build.

The separate `anthonychimming/filter-fabjs-library` repository owns publication
content, reference-image approval, its registry, workflows and maintainer guide.
This app owns the Node 22 publisher at `tools/online-library/publish-library.mjs`.
Runtime validation remains independent and enabled. The production constant stays:

`https://anthonychimming.github.io/filter-fabjs-library/catalogue.json`

## Commands

Run from this repository, with the library as its sibling:

```sh
npm run library:validate -- --library-root ../filter-fabjs-library
npm run library:build -- --library-root ../filter-fabjs-library --out ../filter-fabjs-library/dist --base-ref <published-library-commit>
npm run library:test
npm run verify
```

`--generated-at <timestamp>` makes repeated output deterministic. Without it, the
CLI build supplies the current time explicitly. The library API never invents a
timestamp. `--base-root <checkout>` is an alternative to `--base-ref`, for tests and
offline comparison. Base Git objects are read without checkout or running code.
No-base validation remains useful but prints that historical checks were skipped.

## Validation and build contract

- Registry schema `filter-fab-js/library-registry`, version 1, positive safe-integer
  libraryVersion, at most 1,000 filters. Only id/revision/publishedAt belong in each
  entry; existing manifest validation supplies the ID, revision, date and duplicate
  rules. IDs also cannot collide ignoring case on portable filesystems.
- Source is exactly `source/<id>.json`, bounded by the native 256 KiB file maximum,
  explicit native v2 and matching ID. Native formulas, controls and metadata pass
  the existing native validator without rendering.
- Current package is exactly `filters/<id>-r<revision>.png`, bounded by the shared
  Stage 3 8 MiB constant. A small `readPngDimensions()` export uses the existing PNG
  chunk parser and checks one leading IHDR and its CRC; dimensions must be 512×512.
  Existing FilterFabJS metadata decoding/envelope/native validation is reused.
  This is structural/metadata inspection, not image decoding or pixel-provenance QA.
- Source/package equality is explicit ID equality plus existing `portableContent()`
  on validated native documents, including rich controls and normalized tags.
- All historical revisioned PNGs are validated and copied unchanged, even for IDs
  removed from discovery. Symlink inputs and nonconforming package paths fail.
- The generated Stage 1 manifest derives names/authors/descriptions/tags from
  source and publication information from registry. Entries sort by ASCII portable
  ID. The same revisioned PNG is both preview and package; no new manifest fields.
- Output is restricted to the library's `dist/`, with a generated-directory marker.
  A non-generated directory is not removed. Validation completes before staging;
  generated JSON is parsed/revalidated and package bytes are compared before
  replacing output. No PNG transformation occurs. The landing page is copied from
  `site/index.html`; no missing-path HTML rewrite is generated.

## Publication comparisons

Against a base: old package paths cannot change or disappear; new IDs start at r1;
returning IDs need a new revision above retained history. Any source file/package
change requires a higher revision; unchanged bytes retain the revision. Source
formatting-only edits count, so avoid unnecessary reformatting. Every catalogue
change requires a higher libraryVersion; version regression always fails.
generatedAt and registry ordering are excluded from catalogue-change detection.
A rollback is published as a new revision and higher libraryVersion. Without a
base, rN requires retained r1, but prior publication cannot be inferred from files.

Stage 4 accepts equal/higher versions, retains good saved metadata on failure or
older responses, and keys its memory-only package reuse by revision and URL. No
publishing optimization removes these runtime checks or installs My Filters.

## CI configuration and first release

The library workflows use a required repository Actions variable
`FILTER_FABJS_VALIDATOR_REF`: a full 40-character app commit SHA containing this
tool and the complete Stage 1–4 dependencies. An unset pin fails closed; there is
no moving-main fallback. Publish/review the app commit before setting the pin.
PR validation has only contents-read permission. Trusted main/manual deployment
builds first, then its separate github-pages job receives contents-read,
pages-write and id-token-write. Main branch protection should require validation
and forbid history rewriting. Manual rebuild assumes already-validated history.

The published launch catalogue has `libraryVersion: 2` and five revision-1 entries:
`chromatic-neon-contour`, `crt-display`, `levels-midtone`, `turbulent-displace`
and `lens-distortion`. They use standardized 512×512 Sample images and portable
PNG packages. Test-generated PNGs remain confined to temporary test folders.

Final release QA: open the Pages landing/catalogue and real PNG URL; verify a missing
PNG yields 404; test Online Samples/search/tags/favorites, Preview/Cancel/Apply as
unsaved; Download and re-import; reload/offline saved catalogue then Retry; publish
r2 while keeping r1 accessible; recheck local Built-in/My Filters, JSON/PNG I/O,
Author Save/Delete and CPU/WebGPU. Empty-feed availability is not full content QA.

Community sources, signatures, automatic rendering, new document types, persistent
package storage and Phase 4 engine work remain deferred.
