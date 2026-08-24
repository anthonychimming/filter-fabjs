# Filter FabJS v2.5.0

Filter FabJS is an open-source, browser-native procedural RGBA image-filter editor. It combines a compact expression language with WebGPU rendering and a CPU Worker fallback.

The project is under active development.

**[▶ Try Filter FabJS Live](https://anthonychimming.github.io/filter-fabjs/)**

## Current capabilities

- Four-channel RGBA formula editing with live validation and preview rendering.
- WebGPU acceleration with automatic CPU fallback for unsupported or legacy formulas.
- Built-in image-processing and procedural filters, including analytic shapes, patterns, gradients, noise, convolution, and fractal masks.
- Auto / GPU / CPU renderer selection, render progress, and cancellation.
- Native Filter FabJS JSON import/export plus historic Filter Factory `.afs` import.
- Custom local presets.
- PNG image loading, export, clipboard copy/paste, and alpha-aware preview.
- Modular development source plus a standalone single-file release build.

See [Project Status](docs/PROJECT_STATUS.md) for implementation details, compatibility notes, and current boundaries.

For the formula language, function reference, renderer compatibility notes, and worked filter examples, see the **[Filter FabJS Programming Guide (PDF)](docs/Filter_FabJS_Programming_Guide_v2.4.7.pdf)**.

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
- `dist/filter-fabjs-v2.5.0.html` — standalone single-file distribution.

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
