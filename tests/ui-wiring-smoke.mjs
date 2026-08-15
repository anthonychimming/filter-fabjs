import assert from 'node:assert/strict';
import fs from 'node:fs';

const app = fs.readFileSync('src/app/filter-fab-app.js', 'utf8');
const controls = fs.readFileSync('src/ui/controls.js', 'utf8');
const html = fs.readFileSync('index.html', 'utf8');

assert.match(html, /id="renderBtn"/, 'formula editor must expose an explicit Render action');
assert.match(html, /id="formulaEditStatus"/, 'formula editor must expose preview state');

const formulaInputHandler = app.match(/field\.oninput=\(\)=>\{([\s\S]*?)\n\s*\};\n\s*field\.onblur/)?.[1] || '';
assert.ok(formulaInputHandler, 'formula input handler must be present');
assert.match(formulaInputHandler, /scheduleFormulaValidation\(\)/, 'formula input must schedule validation');
assert.doesNotMatch(formulaInputHandler, /scheduleRender|\brender\s*\(/, 'formula input must not render while the user is typing');
assert.match(app, /const scheduleRender=debounce\(\(\)=>\{if\(!state\.hasPendingFormulaChanges\)render\(\);\}/, 'automatic control renders must not interrupt pending formula edits');

assert.match(app, /focusSnapshot=captureFocus\(\)/, 'render lock must capture focus');
assert.match(app, /restoreFocus\(snapshot\)/, 'render unlock must restore focus');
assert.match(app, /mathMode:state\.legacyMath\?'legacy':'float'/, 'filter serialization must preserve legacy math mode');
assert.doesNotMatch(app, /mathMode:'float'/, 'filter serialization must not hard-code float math');
assert.match(app, /const loadId=\+\+state\.imageLoadId/, 'image loading must use a latest-request generation');
assert.match(app, /if\(loadId!==state\.imageLoadId\)return false/, 'stale image decodes must be discarded');
assert.match(app, /finally\{bitmap\?\.close\?\.\(\);\}/, 'decoded image bitmaps must close on every exit path');
assert.match(controls, /range\.oninput=\(\)=>update\(range\.value\)/, 'range input must update its displayed value continuously');
assert.match(controls, /range\.onchange=\(\)=>scheduleRender\(\)/, 'range control must render only after the edit is committed');

console.log('UI wiring smoke checks passed.');
