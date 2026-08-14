import assert from 'node:assert/strict';
import fs from 'node:fs';

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
assert.match(deployedCss, /--accent:#e1ec1a/, 'deployed CSS must contain the v2.1.2 chartreuse accent');
assert.match(deployedCss, /--panel2:#180e23/, 'deployed CSS must contain the v2.1.2 aubergine surface');
assert.match(deployedJavaScript, /background\.addColorStop\(0,'#08050d'\)/, 'deployed JavaScript must contain the v2.1.2 demo artwork');
assert.match(deployedJavaScript, /version:'2\.1\.2'/, 'deployed JavaScript API must report v2.1.2');

assert.match(standaloneHtml, new RegExp(`<title>Filter FabJS v${packageMetadata.version.replaceAll('.', '\\.')}<\\/title>`), 'standalone title must match package version');
assert.doesNotMatch(standaloneHtml, /<link[^>]+href=|<script[^>]+src=|type="module"/, 'standalone build must not depend on external CSS or JavaScript');

console.log(`Build output smoke: ${cssReference}, ${jsReference}, and standalone v${packageMetadata.version} pass.`);
