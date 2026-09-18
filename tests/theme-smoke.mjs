import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createHash } from 'node:crypto';

const css = fs.readFileSync('styles/app.css', 'utf8');
const html = fs.readFileSync('index.html', 'utf8');

const root = css.match(/:root\s*\{([^}]+)\}/)?.[1] || '';
const properties = Object.fromEntries([...root.matchAll(/--([\w-]+)\s*:\s*([^;}]+)/g)].map(([, name, value]) => [name, value.trim()]));
const tokens = Object.fromEntries(Object.entries(properties).filter(([, value]) => /^#[0-9a-f]{6}$/i.test(value)));
assert.deepEqual(tokens, {
  bg:'#08050d',panel:'#110a19',panel2:'#180e23',panel3:'#24142f','surface-hover':'#2d1938',
  line:'#4a2b58',line2:'#674276','control-border':'#9576a2',text:'#cdddb7','text-strong':'#f6efc4',heading:'#ece49d',muted:'#91a085',
  accent:'#e1ec1a','accent-hover':'#f0f562','accent-ink':'#08050d',accent2:'#c429a3',info:'#088dbf',good:'#78c972',warn:'#ece49d',bad:'#ff647c',
  'code-bg':'#061005','code-text':'#a8d59a',r:'#e45a87',g:'#9fd36a',b:'#38a9d4',a:'#d8cbe6'
}, 'the complete brand palette must remain unchanged');

function declarations(body) {
  return Object.fromEntries(body.split(';').filter(part => part.includes(':')).map(part => {
    const separator = part.indexOf(':');
    return [part.slice(0, separator).trim(), part.slice(separator + 1).trim()];
  }));
}
const rules = [...css.replace(/\/\*[\s\S]*?\*\//g, '').matchAll(/([^{}]+)\{([^{}]*)\}/g)];
function rule(selector) {
  return Object.assign({}, ...rules.filter(([, selectors]) => selectors.split(',').map(s => s.trim()).includes(selector)).map(([, , body]) => declarations(body)));
}
function expectFont(selector, token) {
  const style = rule(selector);
  assert.ok((style['font-family'] || style.font || '').includes(`var(--${token})`), `${selector} must use --${token}`);
}
assert.match(properties['font-ui'], /^"Inter Variable",Inter,/);
assert.match(properties['font-code'], /^"JetBrains Mono Variable","JetBrains Mono",/);
for (const [name, value] of Object.entries({
  'space-1':'4px','space-2':'8px','space-3':'10px','space-4':'12px','space-5':'16px',
  'radius-control':'8px','radius-panel':'12px','radius-dialog':'14px',
  'control-height-sm':'30px','control-height-md':'36px','touch-target':'44px'
})) assert.equal(properties[name], value, `${name} must preserve compact component metrics`);
for (const selector of ['html','body','.filter-description textarea','.control-widget .slider-value','.control-readout','.control-preview-value']) expectFont(selector, 'font-ui');
for (const selector of ['textarea','.formula-label','.renderer-diagnostics','.render-card kbd','.render-button kbd','.slider-index','.chip','code','kbd','.modal-body td:first-child','.control-editor-index','.control-widget-seed .slider-value']) expectFont(selector, 'font-code');
for (const selector of ['.control-widget .slider-value','.control-readout','.control-preview-value','input[type=number]','#zoomLabel','.progress-meta']) assert.equal(rule(selector)['font-variant-numeric'], 'tabular-nums', `${selector} must use aligned UI numerals`);
assert.equal(rule('dialog')['border-radius'], 'var(--radius-dialog)');
assert.equal(rule('.segmented')['border-radius'], 'var(--radius-group)');

const fontFaces = rules.filter(([, selector]) => selector.trim() === '@font-face').map(([, , body]) => declarations(body));
assert.equal(fontFaces.length, 2, 'ship only the two requested upright variable faces');
const fontFixtures = [
  ['Inter Variable','InterVariable.woff2','100 900','OFL-Inter.txt','693b77d4f32ee9b8bfc995589b5fad5e99adf2832738661f5402f9978429a8e3'],
  ['JetBrains Mono Variable','JetBrainsMono-Variable.woff2','100 800','OFL-JetBrainsMono.txt','fe7b565a583febc11ec94fa9aacf8a8180c21efe601f174a33c71a0b596346b7']
];
for (const [family, filename, weights, license, hash] of fontFixtures) {
  const face = fontFaces.find(face => face['font-family'] === `"${family}"`);
  assert.ok(face, `${family} must have a local font face`);
  assert.equal(face['font-weight'], weights);
  assert.equal(face['font-style'], 'normal');
  assert.equal(face['font-display'], 'swap');
  assert.ok(face.src.includes(`../assets/fonts/${filename}`));
  const bytes = fs.readFileSync(`assets/fonts/${filename}`);
  assert.equal(bytes.toString('ascii', 0, 4), 'wOF2');
  assert.equal(bytes.readUInt32BE(8), bytes.length, 'WOFF2 header length must match the real file');
  assert.equal(createHash('sha256').update(bytes).digest('hex'), hash, 'vendored font must match the verified upstream/conversion record');
  assert.match(fs.readFileSync(`assets/fonts/${license}`, 'utf8'), /SIL OPEN FONT LICENSE Version 1\.1/);
}
assert.doesNotMatch(css, /@import\b/i, 'CSS must not import external styles');
for (const [, url] of css.matchAll(/url\(\s*["']?([^"')\s]+)/gi)) assert.ok(fontFixtures.some(([, filename]) => url === `../assets/fonts/${filename}`), `unexpected CSS dependency: ${url}`);
// Resolve the token before retaining the existing 44px touch-target assertions.
const resolvedCss = css.replace(/var\(--touch-target\)/g, properties['touch-target']);

function luminance(hex) {
  const channels = hex.slice(1).match(/../g).map(value => parseInt(value, 16) / 255);
  const [r, g, b] = channels.map(value => value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrast(foreground, background) {
  const a = luminance(foreground);
  const b = luminance(background);
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
}

function expectContrast(foregroundToken, backgroundToken, minimum) {
  const ratio = contrast(tokens[foregroundToken], tokens[backgroundToken]);
  assert.ok(ratio >= minimum, `${foregroundToken} on ${backgroundToken} must be at least ${minimum}:1; received ${ratio.toFixed(2)}:1`);
}

for (const name of ['bg', 'panel', 'panel2', 'text', 'text-strong', 'heading', 'muted', 'accent', 'accent-ink', 'accent2', 'info', 'code-bg', 'code-text']) {
  assert.ok(tokens[name], `theme token --${name} must be defined`);
}

expectContrast('text', 'panel2', 4.5);
expectContrast('muted', 'panel2', 4.5);
expectContrast('heading', 'panel', 4.5);
expectContrast('accent', 'panel', 4.5);
expectContrast('accent-ink', 'accent', 4.5);
expectContrast('code-text', 'code-bg', 4.5);
expectContrast('info', 'panel', 4.5);
for(const surface of ['bg','panel','panel2','panel3','surface-hover']){
  expectContrast('control-border',surface,3);
  expectContrast('accent',surface,3);
}
assert.match(css,/textarea:focus-visible,summary:focus-visible\{outline:3px solid var\(--accent\)/,'textareas and disclosures need an explicit focus indicator');
assert.match(resolvedCss,/@media\(pointer:coarse\)\{[\s\S]*?min-height:44px/,'coarse pointers need comfortable control heights');
assert.match(resolvedCss,/input\[type=range\]\{min-height:44px/,'touch sliders need an enlarged native interaction area');
assert.match(css,/@media\(pointer:coarse\) and \(hover:none\)\{\.render-button kbd\{display:none\}/,'keyboard badges must not clutter touch layouts');

assert.match(css, /\.canvas-stage\{[^}]*background-color:#090b0f[^}]*#10141b/i, 'preview stage must remain neutral black/grey');
assert.match(css, /\.canvas-wrap\{[^}]*background-color:#d4d4d4[^}]*#ececec/i, 'transparency checkerboard must remain neutral grey');
assert.match(css, /textarea\.edited:not\(\.invalid\)[^{]*\{[^}]*196,41,163/i, 'edited formula state must use the magenta semantic accent');
assert.match(css, /\.renderer-control span\{[^}]*var\(--info\)/i, 'renderer label must use the cyan technical accent');
assert.match(css, /\*\{scrollbar-color:var\(--line2\) transparent;scrollbar-width:thin\}/, 'all scrollbars must use the branded Firefox colors');
assert.match(css, /\*::-webkit-scrollbar-thumb\{background:var\(--line2\);[^}]*border-radius:999px\}/, 'all Chromium scrollbars must use the branded thumb color');
assert.match(html, /id="githubBtn"[^>]*href="https:\/\/github\.com\/anthonychimming"/i, 'GitHub button must target the current profile URL');

console.log('Brand theme smoke checks passed.');
