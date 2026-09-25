import fs from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const order = [
  'src/core/utils.js',
  'src/core/controls.js',
  'src/core/filter-metadata.js',
  'src/core/formula-language.js',
  'src/core/chroma.js',
  'src/core/ir.js',
  'src/presets/contributed-builtins.js',
  'src/presets/pass2-builtins.js',
  'src/presets/builtins.js',
  'src/renderers/cpu-worker-source.js',
  'src/gpu/params-layout.js',
  'src/gpu/angle-sign.js',
  'src/gpu/wgsl-compiler.js',
  'src/renderers/renderer-backend.js',
  'src/renderers/ir-numeric-bounds.js',
  'src/renderers/cpu-renderer.js',
  'src/renderers/webgpu-renderer.js',
  'src/renderers/renderer-manager.js',
  'src/io/filter-format.js',
  'src/io/image-io.js',
  'src/app/filter-thumbnail-service.js',
  'src/io/png-metadata.js',
  'src/io/filter-library-manifest.js',
  'src/io/filter-library-cache.js',
  'src/io/filter-library-client.js',
  'src/io/filter-library-package.js',
  'src/app/filter-catalog.js',
  'src/ui/filter-browser.js',
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

function fingerprint(source) {
  return createHash('sha256').update(source).digest('hex').slice(0, 12);
}

await fs.rm(path.join(root, 'dist'), { recursive: true, force: true });
await fs.mkdir(path.join(root, 'dist', 'site', 'assets'), { recursive: true });

const css = await fs.readFile(path.join(root, 'styles', 'app.css'), 'utf8');
// Keep development URLs local, fingerprint site fonts, and embed standalone fonts.
const fonts = ['InterVariable.woff2', 'JetBrainsMono-Variable.woff2'];
const fontDirectory = path.join(root, 'assets', 'fonts');
const siteFontDirectory = path.join(root, 'dist', 'site', 'assets', 'fonts');
await fs.mkdir(siteFontDirectory, { recursive: true });
let siteCss = css;
let standaloneCss = css;
for (const filename of fonts) {
  const bytes = await fs.readFile(path.join(fontDirectory, filename));
  const sourceUrl = `../assets/fonts/${filename}`;
  if (!css.includes(sourceUrl) || bytes.toString('ascii', 0, 4) !== 'wOF2') {
    throw new Error(`Missing CSS reference or invalid WOFF2 font: ${filename}`);
  }
  const siteFilename = filename.replace('.woff2', `.${fingerprint(bytes)}.woff2`);
  await fs.writeFile(path.join(siteFontDirectory, siteFilename), bytes);
  siteCss = siteCss.replaceAll(sourceUrl, `./fonts/${siteFilename}`);
  standaloneCss = standaloneCss.replaceAll(sourceUrl, `data:font/woff2;base64,${bytes.toString('base64')}`);
}
for (const filename of ['OFL-Inter.txt', 'OFL-JetBrainsMono.txt', 'README.md']) {
  const notice = await fs.readFile(path.join(fontDirectory, filename), 'utf8');
  await fs.writeFile(path.join(siteFontDirectory, filename), notice);
  // Each distribution carries the licenses and source/conversion provenance.
  standaloneCss += `\n/* ${filename}\n${notice.replaceAll('*/', '* /').replace(/<\/style/gi, '<\\/style')}\n*/\n`;
}
const modules = [];
for (const relative of order) {
  const source = await fs.readFile(path.join(root, relative), 'utf8');
  modules.push(`\n/* ${relative} */\n${stripModules(source)}`);
}

const bundle = `(()=>{'use strict';\n${modules.join('\n')}\n})();\n`;
const html = await fs.readFile(path.join(root, 'index.html'), 'utf8');
const packageMetadata = JSON.parse(await fs.readFile(path.join(root, 'package.json'), 'utf8'));
const cssFilename = `app.${fingerprint(siteCss)}.css`;
const jsFilename = `app.${fingerprint(bundle)}.js`;
const standaloneFilename = `filter-fabjs-v${packageMetadata.version}.html`;

const siteHtml = html
  .replace('./styles/app.css', `./assets/${cssFilename}`)
  .replace('<script type="module" src="./src/main.js"></script>', `<script src="./assets/${jsFilename}" defer></script>`);

await fs.writeFile(path.join(root, 'dist', 'site', 'index.html'), siteHtml);
await fs.writeFile(path.join(root, 'dist', 'site', 'assets', cssFilename), siteCss);
await fs.writeFile(path.join(root, 'dist', 'site', 'assets', jsFilename), bundle);

const safeBundle = bundle.replace(/<\/script/gi, '<\\/script');
const standalone = html
  .replace('<link rel="stylesheet" href="./styles/app.css">', () => `<style>\n${standaloneCss}\n</style>`)
  .replace('<script type="module" src="./src/main.js"></script>', () => `<script>\n${safeBundle}\n</script>`);

await fs.writeFile(path.join(root, 'dist', standaloneFilename), standalone);
console.log(`Built dist/site with fingerprinted assets and dist/${standaloneFilename}`);
