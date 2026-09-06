# Filter FabJS

**A browser-based procedural image filter editor with WebGPU acceleration.**

**[▶ Launch Filter FabJS](https://anthonychimming.github.io/filter-fabjs/)**

Filter FabJS is an open-source, browser-native procedural RGBA image-processing environment inspired by Adobe Filter Factory and the open-source Filter Foundry project. It lets users build and edit custom image filters from mathematical expressions directly in the browser.

The engine combines four-channel RGBA formula authoring with WebGPU rendering and automatic CPU Worker fallback. Its procedural vocabulary includes image sampling, coordinate transforms, gradients, palette ramps, deterministic noise, fractals, analytic masks, signed-distance fields, convolution, and blend operations. Historic Filter Factory `.afs` filters remain supported through the legacy compatibility path. fileciteturn7file1L1-L1

**Current stable release: v2.6.7**

## Features

- Custom R, G, B, and Alpha formulas with live validation and preview rendering.
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
- Native Filter FabJS JSON import/export plus historic Filter Factory `.afs` import.
- Editable filter descriptions and persistent custom local presets.
- PNG loading/export, clipboard copy/paste, and alpha-aware preview.
- Modular development source plus a standalone single-file release build.

Filter FabJS v2.6.7 uses a typed, renderer-neutral intermediate representation, with the CPU and WebGPU renderers consuming the same semantic formula program. The current engine remains a single-pass formula renderer; multi-pass graph processing is planned for the Phase 4 development line rather than the stable v2.x branch. fileciteturn7file0L31-L44 fileciteturn7file0L47-L71

See [Project Status](docs/PROJECT_STATUS.md) for implementation details, compatibility notes, and current boundaries.

For the formula language, function reference, renderer compatibility notes, and worked filter examples, see the **[Filter FabJS Programming Guide (PDF)](docs/Filter_FabJS_Programming_Guide_v2.4.7.pdf)** and **[Formula Reference](docs/FORMULA_REFERENCE.md)**. Native filters use four channel expressions, floating-point math, and explicit CPU fallback for legacy/stateful constructs. fileciteturn7file2L9-L20 fileciteturn7file2L358-L377

## Run locally

```bash
npm run dev
```

Open `http://localhost:8080`.

WebGPU and Clipboard APIs normally require HTTPS or `localhost`, so opening `index.html` directly is not the supported development path.

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
- `dist/filter-fabjs-v2.6.7.html` — standalone single-file distribution.

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
