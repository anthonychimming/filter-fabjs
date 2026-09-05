import assert from 'node:assert/strict';
import {
  DEFAULT_CONTROL_UI,
  displayToRaw,
  formatControlValue,
  normalizeControlUI,
  normalizeToggleRaw,
  randomSeedDisplay,
  rawToDisplay,
  snapDisplay,
  validateControlUI
} from '../src/core/controls.js';
import { Parser } from '../src/core/formula-language.js';
import { compileFilterProgram } from '../src/core/ir.js';
import { detectFilterFormat, parseAFS, validateNativeFilter } from '../src/io/filter-format.js';
import { presets } from '../src/presets/builtins.js';

const generic={...DEFAULT_CONTROL_UI};
assert.deepEqual(normalizeControlUI(),generic,'legacy controls must receive the generic slider presentation');
assert.deepEqual(normalizeControlUI({widget:'dial',displayMin:10,displayMax:20,step:2,format:'fixed',unit:'units'}),{widget:'slider',displayMin:10,displayMax:20,step:2,format:'number',unit:'units'},'unknown vocabularies must safely fall back without discarding otherwise valid metadata');
assert.deepEqual(normalizeControlUI({widget:'slider',displayMin:Number.NaN,displayMax:0,step:-1,format:'number',unit:{}}),generic,'invalid numeric metadata must not enter application state');
assert.throws(()=>validateControlUI({widget:'slider',displayMin:10,displayMax:10,step:1,format:'number',unit:''}),/greater than/);
assert.throws(()=>validateControlUI({widget:'slider',displayMin:0,displayMax:10,step:11,format:'number',unit:''}),/no larger/);

const iterations={widget:'slider',displayMin:24,displayMax:192,step:1,format:'integer',unit:''};
assert.equal(rawToDisplay(0,iterations),24);
assert.equal(rawToDisplay(255,iterations),192);
assert.equal(rawToDisplay(127.5,iterations),108);
assert.ok(Math.abs(displayToRaw(96,iterations)-109.28571428571429)<1e-10,'display values must map to floating-point canonical values');
assert.equal(rawToDisplay(displayToRaw(96,iterations),iterations),96,'display-to-raw-to-display must round trip');
assert.equal(snapDisplay(95.6,iterations),96,'integer display ranges must snap in display space');

for(const [name,ui,value] of [
  ['decimal',{widget:'slider',displayMin:0,displayMax:1,step:0.1,format:'number',unit:''},0.3],
  ['percentage',{widget:'slider',displayMin:0,displayMax:100,step:1,format:'number',unit:'%'},72],
  ['angle',{widget:'slider',displayMin:0,displayMax:360,step:1,format:'number',unit:'°'},270],
  ['negative',{widget:'number',displayMin:-50,displayMax:50,step:0.5,format:'number',unit:''},-17.5]
])assert.ok(Math.abs(rawToDisplay(displayToRaw(value,ui),ui)-value)<1e-10,`${name} ranges must round trip through canonical space`);
assert.equal(formatControlValue(0.30000000000000004,{widget:'slider',displayMin:0,displayMax:1,step:0.1,format:'number',unit:''}),'0.3');
assert.equal(formatControlValue(95.6,iterations),'96');
assert.equal(normalizeToggleRaw(127.499),0);
assert.equal(normalizeToggleRaw(127.5),255);
const seedUI={widget:'seed',displayMin:1,displayMax:9999,step:1,format:'integer',unit:''};
assert.equal(randomSeedDisplay(seedUI,()=>0),1);
assert.equal(randomSeedDisplay(seedUI,()=>0.999999),9999);

const legacy=validateNativeFilter({format:'filter-fab-js',version:2,formulas:['r','g','b','a'],values:[64],labels:['Legacy']});
assert.deepEqual(legacy.controls[0],{label:'Legacy',value:64,ui:generic},'parallel legacy controls must normalize with default UI metadata');
const richUI={widget:'number',displayMin:-10,displayMax:10,step:0.25,format:'number',unit:'px'};
const rich=validateNativeFilter({format:'filter-fab-js',version:2,formulas:['val(0,-10,10)','g','b','a'],controls:[{label:'Offset',value:300,ui:richUI}]});
assert.equal(rich.controls[0].value,255,'finite imported canonical values must clamp to 0–255');
assert.deepEqual(rich.controls[0].ui,richUI,'rich UI metadata must survive native validation and round-tripping');
assert.deepEqual(detectFilterFormat(JSON.stringify(rich),'rich.json').data.controls[0].ui,richUI,'exported rich metadata must survive a native JSON import round trip');
const unknown=validateNativeFilter({format:'filter-fab-js',version:2,formulas:['r','g','b','a'],controls:[{label:'Safe',value:128,ui:{widget:'knob',displayMin:0,displayMax:100,step:1,format:'fixed',unit:'%'}}]});
assert.equal(unknown.controls[0].ui.widget,'slider');assert.equal(unknown.controls[0].ui.format,'number');
const toggle=validateNativeFilter({format:'filter-fab-js',version:2,formulas:['ctl(0)','g','b','a'],controls:[{label:'Invert',value:127.5,ui:{widget:'toggle',displayMin:0,displayMax:1,step:1,format:'integer',unit:''}}]});
assert.equal(toggle.controls[0].value,255,'toggle controls must normalize canonical values to 0 or 255');

const afs=parseAFS('%RGB-1.0\n0\n32\n64\n96\n128\n160\n192\n255\nr\ng\nb\na\n','legacy.afs');
assert.equal(afs.controls.length,10);assert.deepEqual(afs.controls[0].ui,generic,'AFS controls must receive generic presentation metadata');

const mappingProgram=compileFilterProgram(['val(0,24,192)','val(0,24,192)','b','a'].map(formula=>new Parser(formula).parse()));
assert.deepEqual(mappingProgram.metadata.controlMappings[0],{type:'val',min:24,max:192},'one repeated constant val() mapping must be inferred');
const conflictProgram=compileFilterProgram(['val(0,0,100)+val(0,-50,50)','g','b','a'].map(formula=>new Parser(formula).parse()));
assert.deepEqual(conflictProgram.metadata.controlMappings[0],{type:'conflict'},'different mappings for one control must be marked as conflicting');
const dynamicProgram=compileFilterProgram(['val(0,ctl(1),100)','g','b','a'].map(formula=>new Parser(formula).parse()));
assert.equal(dynamicProgram.metadata.controlMappings[0],null,'dynamic val() bounds must not produce a display-range suggestion');

for(const preset of presets){
  assert.ok(Array.isArray(preset.controls),`${preset.name} must use canonical rich control definitions`);
  const program=compileFilterProgram(preset.f.map(formula=>new Parser(formula).parse()));
  program.metadata.controlMask.forEach((used,index)=>{if(used)assert.ok(preset.controls[index]?.ui,`${preset.name} control ${index+1} must include UI metadata`)});
  preset.controls.forEach((control,index)=>assert.doesNotThrow(()=>validateControlUI(control.ui),`${preset.name} control ${index+1} must have valid UI metadata`));
}
for(const id of ['analoggrain','cellular','channelglitch','digitalglitch','fractalclouds','layerednoisebenchmark','noisedisplace','warpedsdfbloom'])assert.ok(presets.find(preset=>preset.id===id).controls.some(control=>control.ui.widget==='seed'),`${id} must expose its deterministic seed with the seed widget`);
assert.deepEqual(presets.find(preset=>preset.id==='directionalecho').controls[1].ui,{widget:'slider',displayMin:0,displayMax:360,step:1,format:'number',unit:'°'},'directional angles must be presented in degrees');

console.log('Control definition smoke tests passed.');
