import assert from 'node:assert/strict';
import fs from 'node:fs';

// Night Circuit v1.1 presentation contract; UI behavior is covered by
// library-compact-smoke, explore-smoke, app-workflows-smoke and theme-smoke.
const css=fs.readFileSync('styles/app.css','utf8');
const html=fs.readFileSync('index.html','utf8');
const browser=fs.readFileSync('src/ui/filter-browser.js','utf8');
const consistency=css.split('/* Night Circuit v1.1 — scoped UI consistency pass.')[1];
assert.ok(consistency,'Night Circuit consistency layer must be present');
assert.match(consistency,/--surface-selected:rgba\(225,236,26,.06\)/,'selected colour must be derived from canonical accent');
assert.match(consistency,/\.filter-browser \.filter-card\[data-selected=true\]/,'preview selection must have a visible card state');
assert.match(consistency,/\.filter-browser \.filter-card-actions\{display:flex;flex-direction:row/,'custom / online card actions must sit side by side');
assert.match(consistency,/\.filter-browser \.filter-card-delete:not\(:disabled\):hover/,'destructive icon hover needs an error treatment');
assert.match(html,/id="browseFiltersBtn" class="browser-launcher primary"/,'Library launcher must retain requested highlighted primary style');
assert.match(consistency,/\.active-filter-section \.browser-launcher\{min-height:var\(--control-height-md\);height:auto;font-weight:800\}/,'local button geometry must not override primary colors');
assert.match(consistency,/\.explore-menu\.locks-menu \.explore-menu-items\{left:auto;right:0;min-width:132px/,'Locks menu must be compact and right-aligned');
const explore=fs.readFileSync('src/ui/explore.js','utf8');
assert.match(explore,/locks\.parentElement\.classList\.add\('locks-menu'\)/,'Locks menu must receive its scoped class');
assert.match(consistency,/\.adjust-section \.slider-row\{min-height:var\(--control-height-md\)/,'parameter rows need the standard height');
assert.match(consistency,/\.adjust-section \.control-lock\[aria-pressed=true\]/,'locked controls need a distinct visual state');
assert.match(consistency,/\.snapshot-slots button\.modified \.snapshot-label::after\{content:" · Edited"/,'edited snapshot must have text beyond colour');
assert.match(consistency,/\.modal-head\{min-height:52px/,'dialog headers should use the same height');
assert.match(consistency,/\.filter-choice \.modal-body h2\{margin:0/,'generic choice dialogs need an explicit title hierarchy');
assert.match(consistency,/@media\(pointer:coarse\)\{[\s\S]*?\.filter-browser \.filter-card-actions button\{width:var\(--touch-target\)/,'card action hit targets must expand for touch');
assert.match(browser,/star\.title=star\.getAttribute\('aria-label'\)/,'favorite icon needs a tooltip');
assert.match(browser,/download\.title=download\.getAttribute\('aria-label'\)/,'download icon needs a tooltip');
assert.match(browser,/if\(value==='delete'\|\|value==='keep'\)choiceButton\.classList\.add\('danger'\)/,'destructive dialog options must be styled as such');
assert.match(browser,/value!=='cancel'&&!promoted/,'only one positive dialog action is emphasized');
assert.match(browser,/dialog\.addEventListener\('close'/,'existing native modal focus-return flow must remain');
assert.match(browser,/row\.dataset\.selected=String\(entry\.key===selectedKey\)/,'card preview selection must remain state-driven');
assert.match(browser,/entry\.source==='custom'&&deleteCustom/,'only My Filters can show delete');
console.log('Night Circuit v1.1 UI consistency smoke checks passed');
