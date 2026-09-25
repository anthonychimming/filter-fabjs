import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { Parser } from '../src/core/formula-language.js';
import { compileFilterProgram } from '../src/core/ir.js';
import { WGSLCompiler } from '../src/gpu/wgsl-compiler.js';

const packageMetadata = JSON.parse(fs.readFileSync('package.json', 'utf8'));
const siteHtml = fs.readFileSync('dist/site/index.html', 'utf8');
const standalonePath = `dist/filter-fabjs-v${packageMetadata.version}.html`;
const standaloneHtml = fs.readFileSync(standalonePath, 'utf8');

const cssReference = siteHtml.match(/href="\.\/assets\/(app\.[0-9a-f]{12}\.css)"/)?.[1];
const jsReference = siteHtml.match(/src="\.\/assets\/(app\.[0-9a-f]{12}\.js)"/)?.[1];

assert.ok(cssReference, 'deployed HTML must reference a fingerprinted CSS asset');
assert.ok(jsReference, 'deployed HTML must reference a fingerprinted JavaScript asset');
assert.ok(fs.existsSync(`dist/site/assets/${cssReference}`), 'fingerprinted CSS asset must exist');
assert.ok(fs.existsSync(`dist/site/assets/${jsReference}`), 'fingerprinted JavaScript asset must exist');
assert.doesNotMatch(siteHtml, /assets\/app\.(?:css|js)/, 'deployed HTML must not use cache-prone stable asset filenames');

const deployedCss = fs.readFileSync(`dist/site/assets/${cssReference}`, 'utf8');
const deployedJavaScript = fs.readFileSync(`dist/site/assets/${jsReference}`, 'utf8');
const standaloneCss = standaloneHtml.match(/<style>([\s\S]*?)<\/style>/)?.[1];
assert.ok(standaloneCss, 'standalone must contain its stylesheet');
const cssUrls = css => [...css.matchAll(/url\(\s*["']?([^"')\s]+)/gi)].map(([, url]) => url);
const siteFontUrls = cssUrls(deployedCss);
const embeddedFontUrls = cssUrls(standaloneCss);
assert.equal(siteFontUrls.length, 2);
assert.equal(embeddedFontUrls.length, 2);
for (const filename of ['InterVariable.woff2', 'JetBrainsMono-Variable.woff2']) {
  const bytes = fs.readFileSync(`assets/fonts/${filename}`);
  const stem = filename.slice(0, -6);
  const siteUrl = siteFontUrls.find(url => url.startsWith(`./fonts/${stem}.`));
  assert.ok(siteUrl, `${filename} must have a site font URL`);
  assert.match(siteUrl, /^\.\/fonts\/[\w-]+\.[0-9a-f]{12}\.woff2$/, 'site font URLs must be local and fingerprinted');
  assert.deepEqual(fs.readFileSync(`dist/site/assets/${siteUrl}`), bytes, 'site fonts must retain the vendored bytes');
  assert.ok(embeddedFontUrls.includes(`data:font/woff2;base64,${bytes.toString('base64')}`), 'standalone must embed the complete vendored font');
}
for (const url of embeddedFontUrls) assert.match(url, /^data:font\/woff2;base64,[A-Za-z0-9+/]+=*$/, 'standalone CSS cannot request any external resource');
for (const css of [deployedCss, standaloneCss]) assert.doesNotMatch(css, /@import\b/i, 'built CSS must not import stylesheets');
for (const filename of ['OFL-Inter.txt', 'OFL-JetBrainsMono.txt', 'README.md']) {
  const notice = fs.readFileSync(`assets/fonts/${filename}`, 'utf8');
  assert.equal(fs.readFileSync(`dist/site/assets/fonts/${filename}`, 'utf8'), notice);
  assert.ok(standaloneCss.includes(notice), `standalone must carry ${filename}`);
}
const palette = css => Object.fromEntries([...css.matchAll(/--([\w-]+)\s*:\s*(#[0-9a-f]{6})\b/gi)].map(([, name, color]) => [name, color]));
for (const css of [deployedCss, standaloneCss]) assert.deepEqual(palette(css), palette(fs.readFileSync('styles/app.css', 'utf8')), 'built palette must match source');
for(const output of [deployedJavaScript,standaloneHtml]){
  assert.match(output,/MAX_FRACTAL_ITERATIONS=512/,'both builds must carry the shared 512 ceiling');
  assert.match(output,/function numericBounds\(/,'both builds must include numeric budgeting support');
  assert.match(output,/Math\.max\(costs\.get\(node\.whenTrue\),costs\.get\(node\.whenFalse\)\)/,'both builds must budget ternaries lazily');
}
// Exercise the compiler from each generated artifact, stopping before DOM init.
const conditionalProgram=compileFilterProgram(Array(4).fill('x?mandelbrot(0,0,512):julia(0,0,0,0,512)').map(f=>new Parser(f).parse()));
const sharedProgram=compileFilterProgram(['mandelbrot(cx,cy,512)*255','mandelbrot(cx,cy,512)*128','mandelbrot(cx,cy,512)*64','a'].map(f=>new Parser(f).parse()));
const signedAngleProgram=compileFilterProgram(['c2d(-0,0)','angle(1,x?-0:0)','angle(angle(1,-0),0)','255'].map(f=>new Parser(f).parse()));
const centeredAngleProgram=compileFilterProgram(['angle(cx,cy)','c2d(cx+0,cy*1)','angle(x?cx:1,cy)','mandelbrot(cx,cy,96)'].map(f=>new Parser(f).parse()));
const angularGradientProgram=compileFilterProgram(['angularGrad(x,y,X/2,Y/2,128)*255','angularGrad(x,y,ctl(0),ctl(1),512)*255','angle(cx,cy)','255'].map(f=>new Parser(f).parse()));
for(const script of [deployedJavaScript,standaloneHtml.match(/<script>([\s\S]*?)<\/script>/)?.[1]]){
  assert.ok(script,'build must contain executable JavaScript');
  const init=script.lastIndexOf('initFilterFabApp();');
  assert.ok(init>=0,'build must retain its application entry point');
  const context=vm.createContext({TextEncoder,TextDecoder});
  vm.runInContext(script.slice(0,init)+'globalThis.BuiltCompiler=WGSLCompiler;\n})();',context);
  assert.equal(context.BuiltCompiler.compile(conditionalProgram).code,WGSLCompiler.compile(conditionalProgram).code,'built compilers must emit the same scoped conditional WGSL as source');
  assert.equal(context.BuiltCompiler.compile(signedAngleProgram).code,WGSLCompiler.compile(signedAngleProgram).code,'both artifacts must include semantic angle lowering and preserve nested zero signs');
  assert.equal(context.BuiltCompiler.compile(centeredAngleProgram).code,WGSLCompiler.compile(centeredAngleProgram).code,'both artifacts must preserve angle-local exact centers without changing fractal coordinates');
  assert.equal(context.BuiltCompiler.compile(angularGradientProgram).code,WGSLCompiler.compile(angularGradientProgram).code,'both artifacts must preserve exact angular-gradient rays');
  const sharedCode=context.BuiltCompiler.compile(sharedProgram).code;
  assert.equal(sharedCode,WGSLCompiler.compile(sharedProgram).code,'both generated artifacts must retain source field sharing');
  assert.equal((sharedCode.split('fn main(')[1].match(/ff_mandelbrot\(/g)||[]).length,1,'built output must compute the shared fractal once');
}
assert.match(deployedCss, /--accent:#e1ec1a/, 'deployed CSS must contain the v2.1.2 chartreuse accent');
assert.match(deployedCss, /--panel2:#180e23/, 'deployed CSS must contain the v2.1.2 aubergine surface');
assert.match(deployedJavaScript, /background\.addColorStop\(0,'#08050d'\)/, 'deployed JavaScript must contain the v2.1.2 demo artwork');
const escapedVersion = packageMetadata.version.replaceAll('.', '\\.');
assert.match(deployedJavaScript, new RegExp(`version:'${escapedVersion}'`), 'deployed JavaScript API must report the package version');
assert.match(deployedJavaScript, /getRendererDiagnostics/, 'deployed JavaScript must expose the Phase 3.5D renderer diagnostic snapshot');
assert.match(deployedJavaScript, /filter-fab-js\/png/, 'deployed JavaScript must bundle the PNG metadata envelope schema');
assert.match(deployedJavaScript, /function embedFilterFabMetadata/, 'deployed JavaScript must bundle the PNG metadata codec');

assert.match(standaloneHtml, new RegExp(`<title>Filter FabJS v${packageMetadata.version.replaceAll('.', '\\.')}<\\/title>`), 'standalone title must match package version');
assert.doesNotMatch(standaloneHtml, /<link[^>]+href=|<script[^>]+src=|type="module"/, 'standalone build must not depend on external CSS or JavaScript');
assert.match(standaloneHtml, /filter-fab-js\/png/, 'standalone build must contain the PNG metadata carrier');

console.log(`Build output smoke: ${cssReference}, ${jsReference}, and standalone v${packageMetadata.version} pass.`);
