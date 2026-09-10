# Filter FabJS v2.8.1

**A browser-based procedural image filter editor with WebGPU acceleration.**

**[▶ Launch Filter FabJS](https://anthonychimming.github.io/filter-fabjs/)**

Filter FabJS is an open-source, browser-native procedural RGBA image-processing environment inspired by Adobe Filter Factory and the open-source Filter Foundry project. It lets users build and edit custom image filters from mathematical expressions directly in the browser.

The engine combines four-channel RGBA formula authoring with WebGPU rendering and automatic CPU Worker fallback. Its procedural vocabulary includes image sampling, coordinate transforms, gradients, palette ramps, deterministic noise, fractals, analytic masks, signed-distance fields, convolution, and blend operations. Historic Filter Factory `.afs` filters remain supported through the legacy compatibility path.

**Current stable release: v2.8.1**

## Features

- Custom R, G, B, and Alpha formulas with live validation and preview rendering.
- Artist-first Explore mode for active-filter adjustments, with metadata, formulas, control authoring, and diagnostics collected in Author mode.
- WebGPU / WGSL acceleration with automatic CPU fallback for unsupported or legacy formulas.
- Ten data-driven controls with author-defined slider, number, toggle, and seed presentations.
- Normalized, centered, polar, repeated, and mirrored coordinate systems.
- Image sampling, transforms, blend modes, gradients, and scalar palette ramps.
- Deterministic procedural noise including value noise, Perlin, Worley, FBM, turbulence, ridged, and periodic fields.
- Mandelbrot, Julia, and finite-depth Sierpiński fractal functions.
- Analytic shape masks and signed-distance-field composition.
- Fixed 3×3 convolution.
- Auto / GPU / CPU renderer selection with live eligibility and fallback diagnostics.
- Deterministic benchmark presets for CPU/WebGPU performance comparisons.
- Thirty-five built-in filters with searchable descriptions and tags.
- Native Filter FabJS JSON import/export plus historic Filter Factory `.afs` import.
- Editable filter descriptions, searchable local presets, user tags, and favorites.
- PNG loading/export with portable embedded filter metadata, clipboard copy/paste, and alpha-aware preview.
- Modular development source plus a standalone single-file release build.

Filter FabJS v2.8.1 uses a typed, renderer-neutral intermediate representation, with the CPU and WebGPU renderers consuming the same semantic formula program.

See [Project Status](docs/PROJECT_STATUS.md) for implementation details, compatibility notes, and current boundaries.

For the formula language, function reference, renderer compatibility notes, and worked filter examples, see the **[Filter FabJS Programming Guide (PDF)](docs/Filter_FabJS_Programming_Guide_v2.4.7.pdf)** and **[Formula Reference](docs/FORMULA_REFERENCE.md)**. Native filters use four channel expressions, floating-point math, and explicit CPU fallback for legacy/stateful constructs.

## Run locally

```bash
npm run dev
```

Open `http://localhost:8080`.

WebGPU and Clipboard APIs normally require HTTPS or `localhost`, so opening `index.html` directly is not the supported development path.

Seven formula-heavy contributed built-ins—C64 Multicolor Bitmap, Linear Prism Echo, Pop Print Quad, Spectral Tear Glitch, Teal Lime Modular Weave, Touching Random Capsules, and VHS Tracking Glitch—can exceed the bounded CPU work budget on sufficiently large images. They remain WebGPU-compatible and can run through the CPU backend at smaller image sizes.

## Verify and build

```bash
npm run verify
```

Or run the steps separately:

```bash
npm run check
npm test
npm run build
```

Build output:

- `dist/site/` — deployable static site.
- `dist/filter-fabjs-v2.8.1.html` — standalone single-file distribution.

The build uses Node.js and has no package dependencies.

## Source structure

```text
src/
├─ app/             application orchestration and event wiring
├─ core/            formula language, typed IR, shared utilities
├─ gpu/             typed-IR-to-WGSL compiler and shader library
├─ renderers/       renderer contract, CPU Worker, WebGPU, manager
├─ presets/         built-in filters
├─ io/              filter formats, image and clipboard helpers
└─ ui/              DOM references, canvas view, control panel
```

Architecture details are in [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md). Brand tokens and usage rules are in [docs/BRAND_THEME.md](docs/BRAND_THEME.md). Analytic mask signatures and coordinate conventions are in [docs/ANALYTIC_SHAPES.md](docs/ANALYTIC_SHAPES.md).

## Feedback and contributions

Bug reports, compatibility findings, filter examples, performance observations, and focused improvement proposals are welcome.

Before opening an issue, run `npm run verify` when possible. For rendering bugs, include the browser version, operating system, GPU, selected renderer, filter/formulas, and steps needed to reproduce the problem.

See [CONTRIBUTING.md](CONTRIBUTING.md) for contribution guidance.

## Licence

Filter FabJS is distributed under the GNU General Public License v2.0 or later. See [LICENSE](LICENSE).

The project is inspired by the open-source [Filter Foundry project](https://github.com/danielmarschall/filter_foundry) and preserves the relevant attribution in the source.

## Search, tags, and favorites

Explore is the default workspace. Use **Browse filters** to open the existing Filter search, then adjust only the controls used by the active filter. Switch to **Author** for the filter dropdown, metadata, tags, formulas, control definitions, and detailed renderer diagnostics. Search stored names, descriptions, authors, and tags; combine source, Favorites only, and match-all tags. Save updates the current custom ID; Save as new makes a separate copy. Imported filters remain unsaved drafts until saved. Updating the preview does not save a filter.

See [Filter library](docs/FILTER_LIBRARY.md) for metadata limits, portable export behavior, storage caveats, and the release validation record.

## Embedded PNG filters

Exported PNGs carry the current validated native-v2 filter definition in a standard `FilterFabJS` iTXt chunk. **Open image** and drag-and-drop detect this metadata before changing the active image or filter. Choose **Import Filter** to keep the current source image and apply the embedded filter, **Open Image** to ignore the filter and open the PNG normally, or **Cancel** to leave the current document untouched.

Embedded metadata is portable provenance, not cryptographic proof of authorship or authenticity. Image editors, PNG optimizers, and online services may strip it; the visible pixels remain an ordinary PNG.
