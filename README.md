# Filter FabJS v2.4.3

Filter FabJS is an open-source, browser-native procedural RGBA image-filter editor. It combines a compact expression language with a typed intermediate representation, WebGPU compute rendering, and a CPU Worker fallback.

The project is under active development. This repository documents and develops the open-source project as it exists today.

**[▶ Try Filter FabJS Live](https://anthonychimming.github.io/filter-fabjs/)**

## Current capabilities

- Four-channel RGBA formula editing.
- Focus-safe formula entry with debounced validation and explicit preview rendering.
- Branded aubergine UI with sage typography and restrained chartreuse, magenta, and cyan accents.
- Typed IR between the formula parser and renderer backends.
- Renderer-neutral IR metadata with WebGPU capability decisions owned by the WGSL analyzer.
- Math-mode-specific YUV chroma bounds: coherent signed ranges for native float filters and historic constants for legacy imports.
- WebGPU compute rendering for deterministic stateless formulas, including procedural noise, patterns, polar sampling, and fixed 3×3 convolution.
- Analytic line, circle, ring, rotated-box, triangle, and grid masks with CPU/WebGPU parity.
- Finite-depth Sierpiński-gasket masks generated through GPU-compatible child-triangle folding, including feathered internal holes.
- Automatic, cancellation-safe CPU Worker fallback for unsupported, legacy, or failed GPU operations.
- Bounded compatibility, WGSL-plan, and WebGPU-pipeline caches with control-only program reuse.
- Auto / GPU / CPU renderer selection.
- Size-bounded historic Filter Factory `.afs` import and strictly normalized native Filter FabJS JSON import/export.
- Built-in procedural and image-processing filters, including the mask-driven **Midnight Tartan** textile generator.
- Local custom presets.
- Image drag-and-drop, clipboard copy/paste, PNG export, and alpha-aware preview.
- Render cancellation and progress reporting.
- Modular ES-module development source plus a standalone single-file release build.

See [Project Status](docs/PROJECT_STATUS.md) for the current implementation and known boundaries.

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

- `dist/site/` — deployable static site with content-fingerprinted CSS and JavaScript assets to prevent mixed-version browser caches.
- `dist/filter-fabjs-v2.4.3.html` — standalone single-file distribution.

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

Architecture details are in [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md). Brand tokens and usage rules are in [docs/BRAND_THEME.md](docs/BRAND_THEME.md).
Analytic mask signatures and coordinate conventions are in [docs/ANALYTIC_SHAPES.md](docs/ANALYTIC_SHAPES.md).

## Feedback and contributions

Bug reports, compatibility findings, filter examples, performance observations, and focused improvement proposals are welcome.

Before opening an issue, run `npm run verify` when possible. For rendering bugs, include the browser version, operating system, GPU, selected renderer, filter/formulas, and steps needed to reproduce the problem.

See [CONTRIBUTING.md](CONTRIBUTING.md) for contribution guidance.

## Licence

Filter FabJS is distributed under the GNU General Public License v2.0 or later. See [LICENSE](LICENSE).

The project is inspired by the open-source Filter Foundry project and preserves the relevant attribution in the source.
