# UI refinement completion — v2.8.7

Implemented the typography and token brief against the existing v2.8.6 tree.
The Explore / Author structure, controllers, palette, layout breakpoints,
rendering semantics, filter formats, and persisted data remain unchanged.
No framework, UI kit, or npm dependency was added.

## Changes and files

- `styles/app.css`: local variable-font faces, centralized UI/code stacks,
  tabular UI numerals, selective technical typography, recurring spacing/radius/
  control-height tokens, and removal of the superseded 2px focus declaration.
  The authoritative 3px focus treatment remains. Existing component dimensions,
  44px coarse-pointer rules, state colors, and reduced-motion behavior remain.
- `assets/fonts/InterVariable.woff2`, `JetBrainsMono-Variable.woff2`,
  `OFL-Inter.txt`, `OFL-JetBrainsMono.txt`, and `README.md`: real variable fonts,
  SIL OFL 1.1 licenses, official source URLs, checksums, axis ranges, and
  reproduction instructions. See [font provenance](../assets/fonts/README.md).
- `scripts/build.mjs`: fingerprinted local site fonts and inline WOFF2 data
  URLs in the standalone stylesheet. Both distributions include licenses and
  provenance; normal builds use only checked-in assets and Node.js.
- `scripts/dev-server.mjs`: serves WOFF2 with the font MIME type.
- `tests/theme-smoke.mjs`: exact 26-token palette snapshot, typography roles,
  tabular numerals, metric tokens, font faces/ranges/licenses and byte integrity,
  local CSS dependencies, and token-aware preservation of touch assertions.
- `tests/build-output-smoke.mjs`: checks local fingerprinted font paths,
  byte-for-byte site/embedded font content, distribution notices, unchanged
  palette, and absence of external standalone CSS, JS, and font dependencies.
- `package.json`, `index.html`, and version strings in
  `src/app/filter-fab-app.js`: 2.8.7. The app module changes only the diagnostic
  version and PNG application-version string, not the PNG schema or workflow.
- `README.md`, `CHANGELOG.md`, `docs/BRAND_THEME.md`, `docs/PROJECT_STATUS.md`,
  `docs/ARCHITECTURE.md`, `docs/FILTER_AUTHORING.md`, `docs/FILTER_LIBRARY.md`,
  `docs/FORMULA_REFERENCE.md`, and this report: current version, typography,
  build documentation, and validation record.
- `dist/site/` and `dist/filter-fabjs-v2.8.7.html`: regenerated using the normal
  build. Previous versioned/fingerprinted output is replaced by that build.

## Conservative adaptations

Inter 4.1 supplies its variable WOFF2 directly. The official JetBrains Mono
2.304 archive supplies variable TTF, so its unmodified upright face was
converted to WOFF2 using temporary FontTools/Brotli tooling. Weight ranges
were read from the real fonts: Inter 100–900 and JetBrains Mono 100–800.
Conversion is not part of the project build and introduces no runtime or
project dependency. Both copyright/license notices are copied unchanged.

Distinct 32/34/38px controls, 11px library-card corners, and the 16px drawer
shape remain explicit. The brief's example tokens did not justify changing
those existing dimensions. The existing panel-radius token remains an alias.

## Validation

- `npm run verify`: **PASS** — JavaScript syntax checks, all 17 Node smoke
  suites, production build, and build-output validation. An initial run found
  accidental CRLF conversion affecting an existing source-inspection regex;
  original LF endings were restored, and verification passed without weakening
  the assertion.
- `git diff --check`: **PASS** for tracked implementation changes. The later
  staged check, which includes the new assets, reports upstream trailing
  whitespace in `OFL-JetBrainsMono.txt` and its two build copies. The license
  is intentionally preserved verbatim.
- All CSS color literals, including gradients and neutral canvas/checkerboard
  colors, compare identically with the original stylesheet. The full named
  palette is also locked by regression assertions.
- Headless Microsoft Edge checks at 1440, 1180, 920, 720, and 560px passed for
  Explore, Author, and the Filter Library with fine and coarse pointers:
  loaded fonts, no horizontal document/drawer overflow, 44px coarse-pointer
  buttons, and the existing bottom-sheet layout at narrow widths.
- Populated slider/seed controls, ordinary readouts, formula focus/invalid/
  edited states, diagnostics, Help code, control previews, and Edit Controls
  were checked at all five widths. The formula keyboard outline remains 3px
  chartreuse; ordinary values use Inter/tabular figures and seed fields use
  JetBrains Mono. Touch sliders retain 44px height.
- Representative component radii, padding, heights, and borders match the
  original CSS in browser-computed comparisons. Screenshots were reviewed for
  desktop composition, narrow library/touch layout, formulas, and dialogs.
- The generated site loads both fingerprinted fonts locally. The standalone
  was opened directly via `file:`: both faces loaded and no external resource
  requests occurred. No browser page errors appeared in the main layout checks.
- The screenshot harness initially disabled touch emulation when taking
  full-page images; viewport captures avoided that tool artifact and all
  coarse-pointer assertions then passed. No production CSS workaround was
  needed.

## Manual follow-up and scope

Check font appearance, long formulas/labels, zoom, keyboard navigation, and
touch scrolling in your normal browsers/devices, especially Firefox and
Safari, which were not exercised here. Two bundled fonts add about 455 KiB
to the site assets and about 606 KiB of base64 data to standalone HTML.
No new visual regression was found in the inspected Edge layouts.

Hardware CPU/WebGPU pixel parity was not rerun for this UI-only change;
automated renderer/compiler tests passed and those implementations were not
modified. Existing unrelated working-tree changes were left intact. Nothing
was committed, pushed, merged, or published.
