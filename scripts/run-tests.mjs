import { spawnSync } from 'node:child_process';

// Full-suite order is shared by every group; keep new smoke tests here.
const tests = [
  "tests/shortcuts-smoke.mjs",
  "tests/save-export-smoke.mjs",
  "tests/library-backup-smoke.mjs",
  "tests/fractal-smoke.mjs",
  "tests/core-smoke.mjs",
  "tests/control-definitions-smoke.mjs",
  "tests/color-groups-smoke.mjs",
  "tests/explore-smoke.mjs",
  "tests/app-workflows-smoke.mjs",
  "tests/png-metadata-smoke.mjs",
  "tests/wgsl-compiler-smoke.mjs",
  "tests/wgsl-conditional-smoke.mjs",
  "tests/wgsl-sharing-smoke.mjs",
  "tests/cpu-renderer-smoke.mjs",
  "tests/webgpu-renderer-smoke.mjs",
  "tests/renderer-manager-smoke.mjs",
  "tests/analytic-shapes-smoke.mjs",
  "tests/canvas-view-smoke.mjs",
  "tests/canvas-navigation-smoke.mjs",
  "tests/thumbnail-service-smoke.mjs",
  "tests/ui-wiring-smoke.mjs",
  "tests/inspector-layout-smoke.mjs",
  "tests/theme-smoke.mjs",
  "tests/night-circuit-consistency-smoke.mjs",
  "tests/filter-catalog-smoke.mjs",
  "tests/online-library-manifest-smoke.mjs",
  "tests/online-library-client-smoke.mjs",
  "tests/online-library-ui-smoke.mjs",
  "tests/library-compact-smoke.mjs",
  "tests/library-layout-smoke.mjs",
  "tests/online-library-package-smoke.mjs",
  "tests/online-package-ui-smoke.mjs",
  "tests/online-library-cache-smoke.mjs",
  "tests/online-package-cache-smoke.mjs",
  "tests/online-cache-ui-smoke.mjs",
  "tests/online-library-publish-smoke.mjs",
  "tests/library-manager-launcher-smoke.mjs",
  "tests/library-manager-smoke.mjs",
  "tests/library-manager-gcm-smoke.mjs",
  "tests/library-manager-github-smoke.mjs",
  "tests/library-manager-ui-smoke.mjs",
  "tests/library-manager-sync-smoke.mjs",
  "tests/support-link-smoke.mjs"
];
const integration = new Set(['tests/library-manager-smoke.mjs', 'tests/library-manager-sync-smoke.mjs']);
const group = process.argv[2] ?? 'all';
if (!['all', 'fast', 'integration'].includes(group)) {
  console.error('Usage: node scripts/run-tests.mjs [all|fast|integration]');
  process.exit(1);
}
const start = Date.now();
for (const test of tests) {
  if (group === 'fast' && integration.has(test) || group === 'integration' && !integration.has(test)) continue;
  console.log(`\n> ${test}`);
  const result = spawnSync(process.execPath, [test], { stdio: 'inherit' });
  if (result.error) console.error(result.error);
  if (result.status !== 0) process.exit(result.status || 1);
}
console.log(`\nTest group ${group} completed in ${((Date.now() - start) / 1000).toFixed(2)}s.`);
