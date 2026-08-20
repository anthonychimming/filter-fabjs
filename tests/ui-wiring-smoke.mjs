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
assert.match(app, /state\.filtered=state\.source/, 'initial source and filtered preview must share the immutable pixel buffer');
assert.match(app, /async function exportPNG\(\)/, 'PNG export must use the asynchronous encoding path');
assert.match(app, /blob=await canvasBlob\(canvas,'image\/png'\)/, 'PNG export must download an encoded Blob');
assert.doesNotMatch(app, /toDataURL\(/, 'PNG export must not block on a base64 data URL');
assert.match(app, /rendererManager\.renderWithFallback\(/, 'the renderer manager must own runtime CPU fallback');
assert.doesNotMatch(app, /rendererManager\.get\('cpu'\)|rendererManager\.active\s*=/, 'the app must not bypass manager-owned fallback state');
assert.match(app, /function prepareFilter\(input\)/, 'filter definitions must be normalized before application state changes');
assert.match(app, /function applyFilter\(definition,selection\)\{const next=prepareFilter\(definition\);state\.legacyMath=/, 'filter application must finish validation and compilation before mutating UI state');
assert.match(app, /FILTER_FILE_MAX_BYTES/, 'filter imports must reject oversized files before reading them');
assert.match(app, /lastProgramKey/, 'the app must retain a stable key for parsed-program reuse');
assert.match(app, /state\.lastProgramKey===key\)\{controlsController\.updateControlUsage\(state\.lastProgram\);return state\.lastProgram\}/, 'control-only renders must reuse the last parsed IR program');
assert.doesNotMatch(app, /WGSLCompiler\.analyze/, 'renderer compatibility analysis must not be repeated in the app layer');
assert.match(app, /el\.split\.oninput=\(\)=>\{state\.split=Number\(el\.split\.value\);canvasView\.requestDraw\(\);\}/, 'split-preview input must coalesce redraws through animation frames');
assert.match(controls, /range\.oninput=\(\)=>update\(range\.value\)/, 'range input must update its displayed value continuously');
assert.match(controls, /range\.onchange=\(\)=>scheduleRender\(\)/, 'range control must render only after the edit is committed');
assert.match(controls, /slider-label" type="text" maxlength="80"/, 'control labels must stay within the serialized metadata limit');
assert.match(html, /id="filterName"[^>]+maxlength="120"/, 'filter names must be bounded in the editor');
assert.match(html, /id="filterAuthor"[^>]+maxlength="120"/, 'filter authors must be bounded in the editor');

console.log('UI wiring smoke checks passed.');
