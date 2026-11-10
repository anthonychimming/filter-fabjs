import assert from 'node:assert/strict';
import { presets } from '../src/presets/builtins.js';
import { normalizeColorGroups, reconcileTogglePreservation } from '../src/core/controls.js';
import { validateNativeFilter, detectFilterFormat } from '../src/io/filter-format.js';
import { groupLockState, toggleGroupLocks } from '../src/ui/controls.js';
import { portableContent } from '../src/core/filter-metadata.js';
import { createLibraryBackup, serializeLibraryBackup, parseAndValidateBackup } from '../src/io/library-backup.js';
import { readLibrary, writeLibraryRecord } from '../src/app/filter-catalog.js';
import { normalizeCustomPresetList } from '../src/app/filter-fab-app.js';
import { createExploreSession, saveExploreSnapshot, commitExploreValues, exploreValues } from '../src/app/explore-state.js';
const g=(label,red,green,blue)=>({label,channels:{red,green,blue}});
const groups=[g('Glow',9,2,0),g('Other',1,4,6)];
assert.deepEqual(normalizeColorGroups(groups),groups);
assert.deepEqual(normalizeColorGroups(null),[]);
for(const bad of [g('',0,1,2),g('x'.repeat(81),0,1,2),g('x\n',0,1,2),g('x',0,0,2),g('x',-1,1,2),g('x',0,1,10),g('x',0,1,1.5),g('x','0',1,2),{},null]){
  // A trailing newline is trimmed; use an embedded control character instead.
  if(bad?.label==='x\n')bad.label='x\ny';
  assert.deepEqual(normalizeColorGroups([bad]),[]);
}
assert.deepEqual(normalizeColorGroups([groups[0],g('Conflict',0,3,4),groups[1]]),groups);
const input={format:'filter-fab-js',version:2,formulas:['r','g','b','a'],controls:[{value:23.5,label:'Keep'}],colorGroups:groups};
const filter=validateNativeFilter(input);assert.deepEqual(filter.colorGroups,groups);assert.equal(filter.controls[0].value,23.5);
assert.deepEqual(validateNativeFilter(JSON.parse(JSON.stringify(filter))).colorGroups,groups);
assert.notEqual(portableContent(filter),portableContent({...filter,colorGroups:[]}));
assert.equal(validateNativeFilter({...input,colorGroups:[g('bad',0,0,2)]}).controls[0].value,23.5);
const toggle={widget:'toggle',displayMin:0,displayMax:1,step:1,format:'integer',unit:''};
const groupedToggle=validateNativeFilter({...input,controls:[{value:23.5,label:'Keep',ui:toggle}]});assert.equal(groupedToggle.controls[0].value,23.5);
// Save, reload, remove the group, save and reload again without quantizing.
class MemoryStorage { constructor(){this.data=new Map()} getItem(key){return this.data.get(key)??null} setItem(key,value){this.data.set(key,String(value))} }
const storage=new MemoryStorage(),first={...groupedToggle,id:'rgb-regression'};
let saved=writeLibraryRecord(storage,normalizeCustomPresetList,first);
let loaded=validateNativeFilter(readLibrary(storage,normalizeCustomPresetList).presets[0]);
assert.equal(loaded.controls[0].value,23.5);assert.deepEqual(loaded.colorGroups,groups);
const flags=reconcileTogglePreservation(loaded.controls.map(c=>c.ui),loaded.controls.map(c=>c.value),[],loaded.colorGroups,[]);
assert.equal(flags[0],true);
const without={...loaded,controls:loaded.controls.map((c,i)=>({...c,...(flags[i]?{preserveToggleValue:true}:{})}))};delete without.colorGroups;
saved=writeLibraryRecord(storage,normalizeCustomPresetList,without,{targetId:saved.id,expected:JSON.stringify(saved)});
loaded=validateNativeFilter(readLibrary(storage,normalizeCustomPresetList).presets[0]);
assert.equal(loaded.controls[0].value,23.5);assert.equal(loaded.controls[0].preserveToggleValue,true);assert.equal(loaded.colorGroups,undefined,'removed groups must not return when updating saved records');
assert.equal(detectFilterFormat(JSON.stringify(loaded),'test.json').data.controls[0].value,23.5);
assert.equal(validateNativeFilter({...input,colorGroups:undefined,controls:[{label:'Legacy',value:23.5,ui:toggle}]}).controls[0].value,0,'old unmarked toggle normalization remains unchanged');
const backup=createLibraryBackup([saved],{},{appVersion:'2.10.2',exportedAt:'2026-11-09T12:00:00.000Z'});
assert.equal(parseAndValidateBackup(serializeLibraryBackup(backup)).filters[0].document.controls[0].value,23.5);
const groupedBackup=createLibraryBackup([first],{},{appVersion:'2.10.2',exportedAt:'2026-11-09T12:00:00.000Z'});
assert.deepEqual(parseAndValidateBackup(serializeLibraryBackup(groupedBackup)).filters[0].document.colorGroups,groups);
const state={controls:[23.5,64,160],explore:createExploreSession([23.5,64,160])};saveExploreSnapshot(state,'A');
state.explore.locks[0]=true;const varied=exploreValues(state.controls,[toggle,{},{}],[true,true,true],state.explore,false,()=>0.9);assert.equal(varied[0],23.5);
commitExploreValues(state,varied);commitExploreValues(state,state.explore.snapshots.A);assert.deepEqual(state.controls,[23.5,64,160]);

const locks={},channels=[2,0,9];assert.equal(groupLockState(locks,channels),'false');toggleGroupLocks(locks,channels);assert.equal(groupLockState(locks,channels),'true');toggleGroupLocks(locks,channels);assert.equal(groupLockState(locks,channels),'false');locks[2]=true;assert.equal(groupLockState(locks,channels),'mixed');toggleGroupLocks(locks,channels);assert.equal(groupLockState(locks,channels),'true');locks[0]=false;assert.equal(groupLockState(locks,channels),'mixed');

const lockedSession={controls:[10,20,30],explore:createExploreSession([10,20,30])};
toggleGroupLocks(lockedSession.explore.locks,[0,1,2]);
assert.deepEqual(exploreValues(lockedSession.controls,[{},{},{}],[true,true,true],lockedSession.explore,false,()=>0.9),[10,20,30]);
saveExploreSnapshot(lockedSession,'A');commitExploreValues(lockedSession,[1,2,3]);assert.deepEqual(lockedSession.explore.undo,[10,20,30]);
commitExploreValues(lockedSession,lockedSession.explore.snapshots.A);assert.equal(groupLockState(lockedSession.explore.locks,[0,1,2]),'true');
commitExploreValues(lockedSession,lockedSession.explore.defaults);assert.equal(groupLockState(lockedSession.explore.locks,[0,1,2]),'true');
assert.equal(groupLockState(createExploreSession([10,20,30]).locks,[0,1,2]),'false');

// Built-in RGB metadata must remain a presentation-only mapping to existing controls.
const expectedBuiltinGroups={
  'sierpinskifractal':[g('Foreground Colour',3,4,5)],
  'duotone-gradient-map':[g('Shadow Colour',0,1,2),g('Highlight Colour',3,4,5)],
  'uniform-rounded-inset-border':[g('Border Colour',3,4,5)],
  'selective-color-isolate':[g('Target Colour',0,1,2)],
  'versatile-stripes':[g('Stripe Colour',4,5,6),g('Background Colour',7,8,9)]
};
for(const preset of presets){
  const expected=expectedBuiltinGroups[preset.id]||[];
  assert.deepEqual(normalizeColorGroups(preset.colorGroups),expected,`${preset.id}: RGB groups`);
  for(const group of expected){
    for(const index of Object.values(group.channels)){
      assert.ok(preset.controls[index],`${preset.id}: missing grouped control ${index}`);
      assert.equal(preset.controls[index].ui.displayMin,0,`${preset.id}: RGB min`);
      assert.equal(preset.controls[index].ui.displayMax,255,`${preset.id}: RGB max`);
    }
  }
}

console.log('Color groups, storage, backup, snapshots and group locks passed.');
