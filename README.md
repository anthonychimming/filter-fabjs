# Filter FabJS — Procedural Image Filter Editor for the Web

**Create custom image filters directly in your browser with mathematical expressions, real-time previews, WebGPU acceleration, and Filter Factory compatibility.**

**Current release: v2.9.1**

**[▶ Launch Filter FabJS](https://anthonychimming.github.io/filter-fabjs/)**

Filter FabJS is an open-source procedural image filter editor inspired by Adobe Filter Factory and the open-source Filter Foundry project. It lets you build, edit, preview, organize, and share custom image effects without installing a desktop application.

Use four RGBA expressions to transform an image, expose creative parameters as controls, and combine sampling, gradients, procedural noise, fractals, masks, convolution, blending, and coordinate transforms. Compatible filters run through WebGPU, while unsupported or historic Filter Factory formulas automatically fall back to the CPU renderer.

## Highlights

- **Browser-native image processing** — load an image, apply or author filters, and export the result without a desktop install.
- **Custom procedural filters** — write separate R, G, B, and Alpha expressions with live validation and preview rendering.
- **WebGPU acceleration** — compatible filters compile to WGSL, with automatic CPU fallback when required.
- **Filter Factory compatibility** — import historic Adobe Filter Factory / Filter Foundry `.afs` filters through the legacy compatibility path.
- **52 built-in filters** — searchable by name, description, author, tags, and favorites.
- **Online Filter Library** — browse additional filters, preview them on your current image, then apply, save, or download them.
- **Artist-first controls** — filters can expose up to ten sliders, number fields, toggles, or seed controls with custom ranges and labels.
- **Procedural graphics toolkit** — includes image sampling, transforms, gradients, palette ramps, Perlin/Worley noise, FBM, turbulence, fractals, analytic masks, signed-distance fields, convolution, and blend operations.
- **Portable filter files** — import and export native Filter FabJS JSON filters.
- **Filter-aware PNG export** — exported PNGs can carry the active Filter FabJS definition as embedded metadata while remaining ordinary PNG images.
- **Local filter library** — save custom filters, organize them with tags and favorites, and search them alongside built-ins.
- **Explore and Author workspaces** — use Explore for fast visual adjustment and Author for formulas, metadata, control definitions, and renderer diagnostics.

## How it works

A Filter FabJS filter contains four mathematical expressions that define the output red, green, blue, and alpha channels.

```text
R: 255-r
G: 255-g
B: 255-b
A: a
```

Expressions can reference source pixels, image coordinates, custom controls, gradients, noise fields, fractals, masks, sampling functions, and other image-processing operations.

Native filters use floating-point math and a typed, renderer-neutral intermediate representation shared by the CPU and WebGPU renderers.

For the complete formula language and compatibility rules, see:

- **[Formula Reference](docs/FORMULA_REFERENCE.md)**
- **[Filter FabJS Programming Guide](docs/Filter_FabJS_Programming_Guide_v2.4.7.pdf)**
- **[Project Status](docs/PROJECT_STATUS.md)**

## Filter Library

The Filter Library brings **Built-in**, **My Filters**, and **Online** filters into one searchable interface.

You can:

- search names, descriptions, authors, and tags;
- filter by source or favorites;
- preview filters non-destructively on the current image;
- apply or cancel a preview explicitly;
- save imported or edited filters to My Filters;
- browse additional filters from the separate [Filter FabJS Library](https://github.com/anthonychimming/filter-fabjs-library).

See **[Filter Library documentation](docs/FILTER_LIBRARY.md)** for metadata, storage, identity, and portable export behavior.

## Split preview comparison

In Split mode, drag the vertical divider or its circular handle to compare Original (left) with Filtered (right). Use Left/Right to move by 1%, Shift+Left/Right by 5%, or Home/End to reach either edge. The position remains when switching preview modes and follows the displayed image during Fit, zoom, and resizing.

## Portable PNG filters

Filter FabJS can embed the current validated native filter definition inside an exported PNG using standard PNG metadata.

When a Filter FabJS PNG is reopened, the app can detect the embedded filter and let you either import the filter or open only the image.

This metadata is portable convenience data, not proof of authorship or authenticity, and some image editors or optimization services may remove it.

## Run locally

Requirements:

- a modern browser;
- Node.js;
- WebGPU support for GPU rendering, where available.

Start the development server:

```bash
npm run dev
```

Then open:

```text
http://localhost:8080
```

WebGPU and Clipboard APIs normally require HTTPS or `localhost`, so opening `index.html` directly is not the supported development workflow.

## Verify and build

Run the complete verification pipeline:

```bash
npm run verify
```

Or run individual stages:

```bash
npm run check
npm test
npm run build
```

Build output:

- `dist/site/` — deployable static site
- `dist/filter-fabjs-v2.9.1.html` — standalone single-file build

The project currently has no npm package dependencies.

## Documentation

Technical and authoring documentation lives under `docs/` rather than in this README.

- **[Architecture](docs/ARCHITECTURE.md)** — renderer, compiler, IR, and application structure
- **[Project Status](docs/PROJECT_STATUS.md)** — current implementation state and known boundaries
- **[Formula Reference](docs/FORMULA_REFERENCE.md)** — syntax, variables, functions, controls, and renderer support
- **[Programming Guide](docs/Filter_FabJS_Programming_Guide_v2.4.7.pdf)** — worked explanations and filter-authoring guidance
- **[Analytic Shapes](docs/ANALYTIC_SHAPES.md)** — mask and coordinate conventions
- **[Filter Library](docs/FILTER_LIBRARY.md)** — filter metadata, search, storage, and portable packages
- **[Brand & Theme](docs/BRAND_THEME.md)** — visual system and UI tokens
- **[Changelog](CHANGELOG.md)** — release history

## Contributing

Bug reports, compatibility findings, filter examples, performance observations, and focused improvement proposals are welcome.

For rendering issues, include the browser version, operating system, GPU, selected renderer, filter or formulas involved, and reproducible steps when possible.

See **[CONTRIBUTING.md](CONTRIBUTING.md)** for contribution guidance.

## License

Filter FabJS is distributed under the **GNU General Public License v2.0 or later**. See **[LICENSE](LICENSE)**.

The project is inspired by the open-source [Filter Foundry](https://github.com/danielmarschall/filter_foundry) project and preserves the relevant attribution in the source.
