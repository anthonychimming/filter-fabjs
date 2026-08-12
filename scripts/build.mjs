import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const order = [
  'src/core/utils.js',
  'src/core/formula-language.js',
  'src/core/ir.js',
  'src/presets/builtins.js',
  'src/renderers/cpu-worker-source.js',
  'src/gpu/wgsl-compiler.js',
  'src/renderers/renderer-backend.js',
  'src/renderers/cpu-renderer.js',
  'src/renderers/webgpu-renderer.js',
  'src/renderers/renderer-manager.js',
  'src/io/filter-format.js',
  'src/io/image-io.js',
  'src/ui/dom.js',
  'src/ui/canvas-view.js',
  'src/ui/controls.js',
  'src/app/filter-fab-app.js',
  'src/main.js'
];

function stripModules(source) {
  return source
    .replace(/^import\s+[^;]+;\s*$/gm, '')
    .replace(/^export\s+/gm, '');
}

await fs.rm(path.join(root, 'dist'), { recursive: true, force: true });
await fs.mkdir(path.join(root, 'dist', 'site', 'assets'), { recursive: true });

const css = await fs.readFile(path.join(root, 'styles', 'app.css'), 'utf8');
const modules = [];
for (const relative of order) {
  const source = await fs.readFile(path.join(root, relative), 'utf8');
  modules.push(`\n/* ${relative} */\n${stripModules(source)}`);
}

const bundle = `(()=>{'use strict';\n${modules.join('\n')}\n})();\n`;
const html = await fs.readFile(path.join(root, 'index.html'), 'utf8');

const siteHtml = html
  .replace('./styles/app.css', './assets/app.css')
  .replace('<script type="module" src="./src/main.js"></script>', '<script src="./assets/app.js" defer></script>');

await fs.writeFile(path.join(root, 'dist', 'site', 'index.html'), siteHtml);
await fs.writeFile(path.join(root, 'dist', 'site', 'assets', 'app.css'), css);
await fs.writeFile(path.join(root, 'dist', 'site', 'assets', 'app.js'), bundle);

const safeBundle = bundle.replace(/<\/script/gi, '<\\/script');
const standalone = html
  .replace('<link rel="stylesheet" href="./styles/app.css">', () => `<style>\n${css}\n</style>`)
  .replace('<script type="module" src="./src/main.js"></script>', () => `<script>\n${safeBundle}\n</script>`);

await fs.writeFile(path.join(root, 'dist', 'filter-fabjs-v2.1.0.html'), standalone);
console.log('Built dist/site and dist/filter-fabjs-v2.1.0.html');
