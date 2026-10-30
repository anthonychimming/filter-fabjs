import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { presets } from '../src/presets/builtins.js';
import { Parser } from '../src/core/formula-language.js';
import { compileFilterProgram } from '../src/core/ir.js';
import { WGSLCompiler } from '../src/gpu/wgsl-compiler.js';

const packageMetadata = JSON.parse(fs.readFileSync('package.json', 'utf8'));
const siteHtml = fs.readFileSync('dist/site/index.html', 'utf8');
const standalonePath = `dist/chromameld-rgba-v${packageMetadata.version}.html`;
const standaloneHtml = fs.readFileSync(standalonePath, 'utf8');

const title = 'ChromaMeld RGBA — Free Procedural Image Filter Editor';
const description = 'Create and explore procedural image filters in your browser. Customize RGBA formulas, preview effects, and export PNGs with optional WebGPU acceleration.';
const url = 'https://anthonychimming.github.io/filter-fabjs/';
const image = `${url}assets/social-card.png`;
const socialTitle = 'ChromaMeld RGBA — Procedural Image Filter Editor';
const socialDescription = 'Explore image effects and create your own with RGBA formulas. Free browser-based editor with WebGPU acceleration where supported.';
for (const html of [siteHtml, standaloneHtml]) {
  const head = html.split('</head>')[0];
  assert.equal((head.match(/<title>/g) || []).length, 1);
  assert.ok(head.includes(`<title>${title}</title>`));
  assert.equal((head.match(/<meta name="description"/g) || []).length, 1);
  assert.ok(head.includes(`<meta name="description" content="${description}">`));
  assert.equal((html.match(/<h1\b/g) || []).length, 1);
  assert.match(html, /<h1 class="brand-title">ChromaMeld RGBA<\/h1>/);
  assert.doesNotMatch(head, /noindex|name="keywords"|twitter:(?:site|creator)/i);
}
const head = siteHtml.split('</head>')[0];
assert.equal((head.match(/<link rel="canonical"/g) || []).length, 1);
assert.ok(head.includes(`<link rel="canonical" href="${url}">`));
const metadata = {
  'og:type': 'website', 'og:site_name': 'ChromaMeld RGBA', 'og:title': socialTitle,
  'og:description': socialDescription, 'og:url': url, 'og:image': image,
  'og:image:width': '1200', 'og:image:height': '630',
  'og:image:alt': 'ChromaMeld RGBA procedural image filter editor',
  'twitter:card': 'summary_large_image', 'twitter:title': socialTitle,
  'twitter:description': socialDescription, 'twitter:image': image,
};
for (const [key, value] of Object.entries(metadata)) {
  const attr = key.startsWith('og:') ? 'property' : 'name';
  const matches = [...head.matchAll(new RegExp(`<meta ${attr}="${key}" content="([^"]*)">`, 'g'))];
  assert.equal(matches.length, 1, `${key} must occur exactly once with safely quoted content`);
  assert.equal(matches[0][1], value.replaceAll('&', '&amp;').replaceAll('"', '&quot;').replaceAll('<', '&lt;').replaceAll('>', '&gt;'));
}
assert.equal(new URL(image).pathname, '/filter-fabjs/assets/social-card.png');
const card = fs.readFileSync('assets/social-card.png');
assert.deepEqual(fs.readFileSync('dist/site/assets/social-card.png'), card);
assert.deepEqual(card.subarray(0, 8), Buffer.from([137,80,78,71,13,10,26,10]));
assert.equal(card.toString('ascii', 12, 16), 'IHDR');
assert.equal(card.readUInt32BE(16), 1200); assert.equal(card.readUInt32BE(20), 630);
const standaloneHead = standaloneHtml.split('</head>')[0];
assert.doesNotMatch(standaloneHead, /<link\s+rel="canonical"|<meta\s+(?:name|property)="(?:og|twitter):|anthonychimming\.github\.io\/filter-fabjs/i);

const cssReference = siteHtml.match(/href="\.\/assets\/(app\.[0-9a-f]{12}\.css)"/)?.[1];
const jsReference = siteHtml.match(/src="\.\/assets\/(app\.[0-9a-f]{12}\.js)"/)?.[1];

assert.ok(siteHtml.includes('<link rel="icon" type="image/png" sizes="32x32" href="./favicon.png">'), 'deployed HTML must declare the ChromaMeld favicon');
assert.deepEqual(fs.readFileSync('dist/site/favicon.png'), fs.readFileSync('assets/favicon.png'), 'deployed favicon must preserve the source PNG bytes');
assert.match(siteHtml, /<div class="logo" aria-hidden="true"><img src="\.\/favicon\.png" alt="" decoding="async"><\/div>/, 'site header should use the branded logo');
assert.ok(standaloneHtml.includes(`src="data:image/png;base64,${fs.readFileSync('assets/favicon.png').toString('base64')}"`), 'standalone header must embed the branded logo');
assert.ok(cssReference, 'deployed HTML must reference a fingerprinted CSS asset');
assert.ok(jsReference, 'deployed HTML must reference a fingerprinted JavaScript asset');
assert.ok(fs.existsSync(`dist/site/assets/${cssReference}`), 'fingerprinted CSS asset must exist');
assert.ok(fs.existsSync(`dist/site/assets/${jsReference}`), 'fingerprinted JavaScript asset must exist');
assert.doesNotMatch(siteHtml, /assets\/app\.(?:css|js)/, 'deployed HTML must not use cache-prone stable asset filenames');

const deployedCss = fs.readFileSync(`dist/site/assets/${cssReference}`, 'utf8');
const deployedJavaScript = fs.readFileSync(`dist/site/assets/${jsReference}`, 'utf8');
const demoBytes=fs.readFileSync('assets/demo-splash.png');
assert.deepEqual(fs.readFileSync('dist/site/assets/demo-splash.png'),demoBytes,'the deployed splash must preserve the supplied PNG bytes');
assert.equal(demoBytes.readUInt32BE(16),960);assert.equal(demoBytes.readUInt32BE(20),640);
assert.match(deployedJavaScript,/new URL\('\.\/assets\/demo-splash\.png',baseURI\)/,'the splash must resolve relative to the document, including project subpaths');
assert.equal(new URL('./assets/demo-splash.png','https://example.test/filter-fabjs/').pathname,'/filter-fabjs/assets/demo-splash.png');
assert.ok(standaloneHtml.includes(demoBytes.toString('base64')),'standalone must embed the exact approved splash PNG');
assert.ok(!deployedJavaScript.includes(demoBytes.toString('base64')),'site JavaScript must not embed the splash PNG');
assert.match(standaloneHtml,/function demoImage\(\)/,'standalone must retain the generated offline demo');
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
  assert.match(output,/function createExploreSession\(/,'both builds must include Explore state');
  assert.match(output,/function createExploreController\(/,'both builds must include Explore UI');
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
  vm.runInContext(script.slice(0,init)+'globalThis.BuiltCompiler=WGSLCompiler;globalThis.BuiltPresets=presets;\n})();',context);
  assert.equal(JSON.stringify(context.BuiltPresets),JSON.stringify(presets),'both builds must contain the exact updated catalog');
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
assert.match(deployedJavaScript, /fillText\('CHROMAMELD',132,151\)|fillText\('CHROMAMELD',108,151\)/, 'deployed JavaScript must contain the branded demo artwork');
assert.match(deployedJavaScript, /clearRect\(110,391,260,120\)/, 'demo artwork must include transparent pixels');
const escapedVersion = packageMetadata.version.replaceAll('.', '\\.');
assert.match(deployedJavaScript, new RegExp(`version:'${escapedVersion}'`), 'deployed JavaScript API must report the package version');
assert.match(deployedJavaScript, /getRendererDiagnostics/, 'deployed JavaScript must expose the Phase 3.5D renderer diagnostic snapshot');
assert.match(deployedJavaScript, /filter-fab-js\/png/, 'deployed JavaScript must bundle the PNG metadata envelope schema');
assert.match(deployedJavaScript, /function embedFilterFabMetadata/, 'deployed JavaScript must bundle the PNG metadata codec');

assert.ok(standaloneHtml.includes('<title>ChromaMeld RGBA — Free Procedural Image Filter Editor</title>'), 'standalone title must use the product name');
assert.doesNotMatch(standaloneHtml, /<link[^>]+href=|<script[^>]+src=|type="module"/, 'standalone build must not depend on external CSS or JavaScript');
assert.match(standaloneHtml, /filter-fab-js\/png/, 'standalone build must contain the PNG metadata carrier');

console.log(`Build output smoke: ${cssReference}, ${jsReference}, and standalone v${packageMetadata.version} pass.`);
