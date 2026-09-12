import assert from 'node:assert/strict';
import fs from 'node:fs';

const css = fs.readFileSync('styles/app.css', 'utf8');
const html = fs.readFileSync('index.html', 'utf8');

const root = css.match(/:root\{([^}]+)\}/)?.[1] || '';
const tokens = Object.fromEntries([...root.matchAll(/--([\w-]+):(#[0-9a-f]{6})/gi)].map(([, name, value]) => [name, value]));

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
assert.match(css,/@media\(pointer:coarse\)\{[\s\S]*?min-height:44px/,'coarse pointers need comfortable control heights');
assert.match(css,/input\[type=range\]\{min-height:44px/,'touch sliders need an enlarged native interaction area');
assert.match(css,/@media\(pointer:coarse\) and \(hover:none\)\{\.render-button kbd\{display:none\}/,'keyboard badges must not clutter touch layouts');

assert.match(css, /\.canvas-stage\{[^}]*background-color:#090b0f[^}]*#10141b/i, 'preview stage must remain neutral black/grey');
assert.match(css, /\.canvas-wrap\{[^}]*background-color:#d4d4d4[^}]*#ececec/i, 'transparency checkerboard must remain neutral grey');
assert.match(css, /textarea\.edited:not\(\.invalid\)[^{]*\{[^}]*196,41,163/i, 'edited formula state must use the magenta semantic accent');
assert.match(css, /\.renderer-control span\{[^}]*var\(--info\)/i, 'renderer label must use the cyan technical accent');
assert.match(css, /\*\{scrollbar-color:var\(--line2\) transparent;scrollbar-width:thin\}/, 'all scrollbars must use the branded Firefox colors');
assert.match(css, /\*::-webkit-scrollbar-thumb\{background:var\(--line2\);[^}]*border-radius:999px\}/, 'all Chromium scrollbars must use the branded thumb color');
assert.match(html, /id="githubBtn"[^>]*href="https:\/\/github\.com\/anthonychimming"/i, 'GitHub button must target the current profile URL');

console.log('Brand theme smoke checks passed.');
