import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const html = read('index.html');
const css = read('styles/app.css');
const funding = read('.github/FUNDING.yml');
const koFi = 'https://ko-fi.com/chromameld';

const toolbarMatch = html.match(/<a id="supportLink"[^>]*>.*?<\/a>/s);
assert.ok(toolbarMatch, 'Toolbar contains the Support action');
assert.ok(toolbarMatch[0].includes(`href="${koFi}"`), 'Support action uses the correct Ko-fi URL');
assert.ok(toolbarMatch[0].includes('target="_blank"'), 'Ko-fi opens in a new tab');
assert.ok(toolbarMatch[0].includes('rel="noopener noreferrer"'), 'External link has safe rel attributes');
assert.ok(toolbarMatch[0].includes('aria-label="Support ChromaMeld RGBA on Ko-fi"'), 'Icon-only layout remains accessible');
assert.ok(toolbarMatch[0].includes('class="support-heart"'), 'Toolbar includes the decorative heart');
assert.ok(/<svg[^>]*>\s*<path[^>]*\/>\s*<\/svg>/.test(toolbarMatch[0]), 'Support heart uses a crisp inline SVG');
const fullscreenIndex = html.indexOf('id="fullscreenBtn"');
assert.ok(fullscreenIndex > html.indexOf('id="supportLink"'), 'Support precedes the fullscreen toggle');
assert.ok(html.includes(`support continued development on Ko-fi</a>`), 'Help dialog contains Ko-fi support link');
assert.ok(html.includes(`href="${koFi}"`), 'Help link uses the correct Ko-fi URL');
assert.ok(css.includes('.topbar .support-link:focus-visible'), 'Support control has keyboard focus styling');
assert.ok(css.includes('.topbar .support-heart{') && css.includes('color:var(--accent)'), 'Heart uses the branded accent color on the dark button');
assert.ok(!css.includes('.topbar .support-logo{'), 'Old Ko-fi logo badge styles are removed');
assert.ok(css.includes('.topbar .support-label{display:none}'), 'Compact toolbar layout retains icon');
assert.match(funding, /^ko_fi:\s*chromameld\s*$/m, 'GitHub sponsors setting targets the Ko-fi page');

console.log('Ko-fi support link smoke checks passed');
