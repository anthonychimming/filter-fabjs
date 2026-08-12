# Contributing to Filter FabJS

Contributions and technical feedback are welcome.

## Useful contributions

- Reproducible bug reports.
- WebGPU compatibility reports across browsers and GPUs.
- CPU/GPU output comparisons.
- Performance measurements with clear test conditions.
- Historic AFS compatibility examples.
- Focused UI/UX improvements.
- Tests that reproduce a defect or protect existing behavior.
- Filter examples that demonstrate engine behavior or compatibility problems.

## Before submitting code

Run:

```bash
npm run verify
```

The verification suite checks JavaScript syntax, smoke tests, and both production build formats.

## Bug reports

Please include, where relevant:

- Filter FabJS version.
- Browser and browser version.
- Operating system.
- GPU model.
- Renderer selection: Auto, GPU, or CPU.
- Filter name or the four formulas involved.
- Source image dimensions and whether alpha is involved.
- Exact reproduction steps.
- Error/status text shown by Filter FabJS.

For GPU-specific problems, include whether the same filter succeeds with the CPU renderer.

## Pull requests

Keep pull requests focused on one change or closely related set of changes. Avoid mixing large refactors with unrelated behavior changes.

Preserve the architectural boundaries described in `docs/ARCHITECTURE.md`:

- parser and IR code should remain renderer-neutral;
- WebGPU implementation belongs in GPU/renderer modules;
- UI modules should not directly own renderer internals;
- CPU fallback and legacy compatibility should not be silently removed.

Add or update tests when practical.

## Licence

By contributing, you agree that your contribution is distributed under the repository's GPL-2.0-or-later licence.
