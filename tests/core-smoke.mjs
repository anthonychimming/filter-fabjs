import assert from 'node:assert/strict';
import { FORMULA_LIMITS, Parser } from '../src/core/formula-language.js';
import { compileFilterProgram } from '../src/core/ir.js';
import { presets } from '../src/presets/builtins.js';
import { WGSLCompiler } from '../src/gpu/wgsl-compiler.js';
import { detectFilterFormat, FILTER_TEXT_MAX_LENGTH, getValidatedFormulaAsts, parseAFS, validateNativeFilter } from '../src/io/filter-format.js';

let gpuCompatible = 0;
let cpuFallback = 0;
for (const preset of presets) {
  const formulas = preset.formulas || preset.f;
  assert.equal(formulas.length, 4, `${preset.name} must have four formulas`);
  const program = compileFilterProgram(formulas.map(formula => new Parser(formula).parse()));
  assert.equal(program.outputs.length, 4);
  const analysis = WGSLCompiler.analyze(program);
  if (analysis.compatible) gpuCompatible += 1;
  else cpuFallback += 1;
}

assert.equal(presets.length, 28);
assert.equal(gpuCompatible, presets.length, 'every native built-in must compile for WebGPU after Phase 3.5');
assert.equal(cpuFallback, 0, 'native built-ins must not require CPU fallback');
assert.equal(gpuCompatible + cpuFallback, presets.length);
const native=detectFilterFormat(JSON.stringify({ format: 'filter-fab-js', version: 2, formulas: ['r','g','b','a'] }), 'test.json');
assert.equal(native.kind, 'native');
assert.equal(native.data.mathMode, 'float', 'version 2 files without mathMode must normalize to float mode');
assert.equal(native.data.controls.length, 8, 'native controls must normalize completely before UI mutation');
assert.deepEqual(native.data.controls[0],{label:'Control 1',value:128});
assert.equal(getValidatedFormulaAsts(native.data)?.length,4,'native validation must carry its parsed channel ASTs into application preparation');
const legacyNative=validateNativeFilter({format:'filter-fab-js',version:1,f:['r','g','b','a'],values:[0,255],labels:['Low','High']});
assert.equal(legacyNative.mathMode,'legacy','version 1 files without mathMode must retain legacy arithmetic');
assert.deepEqual(legacyNative.controls.slice(0,2),[{label:'Low',value:0},{label:'High',value:255}]);
const afsHeader='%RGB-1.0\n128\n128\n128\n128\n128\n128\n128\n128\n';
const afsWithFirstControl=value=>`%RGB-1.0\n${value}\n128\n128\n128\n128\n128\n128\n128\nr\ng\nb\na\n`;
const fourGroupAfs=parseAFS(`${afsHeader}r\n\ng\n\nb\n\na\n`,'test.afs');
assert.deepEqual(fourGroupAfs.f,['r','g','b','a'],'AFS import must accept exactly four separated formula groups');
assert.equal(getValidatedFormulaAsts(fourGroupAfs)?.length,4,'AFS validation must carry its parsed channel ASTs into application preparation');
assert.equal(parseAFS(afsWithFirstControl('  +128  '),'spaced-control.afs').values[0],128,'AFS controls may retain surrounding whitespace and an integer sign');
assert.equal(parseAFS(afsWithFirstControl('-1'),'low-control.afs').values[0],0,'valid AFS integers below the control range must retain legacy clamping');
assert.equal(parseAFS(afsWithFirstControl('256'),'high-control.afs').values[0],255,'valid AFS integers above the control range must retain legacy clamping');
for(const token of ['128junk','128.5','1e2','9007199254740992'])assert.throws(()=>parseAFS(afsWithFirstControl(token),'invalid-control.afs'),/control 1 is not a valid integer/,`AFS control token ${token} must be rejected in full`);
assert.throws(()=>parseAFS(`${afsHeader}r\n\ng\n\nb\n`,'three.afs'),/contains 3 channel formulas; expected 4/,'AFS import must reject three formula groups');
assert.throws(()=>parseAFS(`${afsHeader}r\n\ng\n\nb\n\na\n\n255\n`,'five.afs'),/contains 5 channel formulas; expected 4/,'AFS import must reject appended fifth formula groups instead of truncating them');
assert.throws(()=>parseAFS(`${afsHeader}r\ng\nb\na\n255\n`,'five-lines.afs'),/contains 5 channel formulas; expected 4/,'fallback AFS reconstruction must also reject a fifth formula');

const commentedAfs=parseAFS(`${afsHeader}r // preserve this boundary\n+ 1\n\ng\n\nb\n\na\n`,'comments.afs');
assert.equal(commentedAfs.f[0],'r // preserve this boundary\n+ 1','AFS cleanup must preserve physical line-comment boundaries');
assert.equal(new Parser(commentedAfs.f[0]).parse().o,'+','tokens after an AFS line comment must remain executable on the next physical line');
const continuedAfs=parseAFS(`${afsHeader}r +\\r\n1\n\ng\n\nb\n\na\n`,'continuation.afs');
assert.equal(continuedAfs.f[0],'r + 1','explicit historic AFS continuation markers must still join physical lines');
const commentParenAfs=parseAFS(`${afsHeader}(\nr // comment-only close )\n+ 1\n)\ng\nb\na\n`,'comment-depth.afs');
assert.equal(commentParenAfs.f.length,4,'parentheses inside AFS line comments must not change multiline group depth');
assert.equal(new Parser(commentParenAfs.f[0]).parse().o,'+');

assert.throws(()=>validateNativeFilter({format:'other',version:2,formulas:['r','g','b','a']}),/format must be/);
assert.throws(()=>validateNativeFilter({format:'filter-fab-js',version:3,formulas:['r','g','b','a']}),/version must be/);
assert.throws(()=>validateNativeFilter({format:'filter-fab-js',version:2,mathMode:'fast',formulas:['r','g','b','a']}),/mathMode/);
assert.throws(()=>validateNativeFilter({format:'filter-fab-js',version:2,formulas:['r','g','b','a','r']}),/exactly four/);
assert.throws(()=>validateNativeFilter({format:'filter-fab-js',version:2,formulas:['r','g','b','a'],controls:[{label:'Bad',value:Number.NaN}]}),/finite number/);
assert.throws(()=>validateNativeFilter({format:'filter-fab-js',version:2,formulas:['r','g','b','a'],controls:[{label:{},value:128}]}),/label must be a string/);
assert.throws(()=>validateNativeFilter({format:'filter-fab-js',version:2,name:{},formulas:['r','g','b','a']}),/name must be a string/);
assert.throws(()=>validateNativeFilter({format:'filter-fab-js',version:2,formulas:['r','g','unknown','a']}),/channel 3: Unknown variable/);
assert.throws(()=>detectFilterFormat(' '.repeat(FILTER_TEXT_MAX_LENGTH+1),'large.json'),/KiB limit/);
assert.throws(()=>new Parser('-'.repeat(FORMULA_LIMITS.maxDepth+1)+'1').parse(),/nesting limit/,'deep formulas must fail predictably instead of overflowing the stack');
assert.throws(()=>new Parser('1'.repeat(FORMULA_LIMITS.maxLength+1)).parse(),/character limit/,'oversized direct formula input must be rejected before tokenization');
assert.throws(()=>new Parser(`${'1+'.repeat(2100)}1`).parse(),/token limit/,'token-heavy formulas must stop at the parser budget');

const shapeSampler=presets.find(preset=>preset.id==='analyticshapesampler');
assert.ok(shapeSampler, 'analytic shape sampler preset must be present');
const shapeSamplerProgram=compileFilterProgram(shapeSampler.f.map(formula=>new Parser(formula).parse()));
for(const name of ['line','circle','ring','box','triangle','grid'])assert.ok(shapeSamplerProgram.metadata.functions.includes(name), `shape sampler must use ${name}()`);
assert.doesNotThrow(()=>WGSLCompiler.compile(shapeSamplerProgram), 'shape sampler must generate valid WGSL source');

const sierpinskiPreset=presets.find(preset=>preset.id==='sierpinskifractal');
assert.ok(sierpinskiPreset, 'Sierpiński fractal preset must be present');
assert.equal(presets.some(preset=>preset.id==='fractalshapestudy'||preset.name.includes('Fractal Shape Study')),false,'old Fractal Shape Study preset identity must be absent');
const sierpinskiProgram=compileFilterProgram(sierpinskiPreset.f.map(formula=>new Parser(formula).parse()));
assert.ok(sierpinskiProgram.metadata.functions.includes('sierpinski'), 'Sierpiński fractal preset must use the self-similar mask');
assert.doesNotThrow(()=>WGSLCompiler.compile(sierpinskiProgram), 'Sierpiński fractal preset must generate valid WGSL source');

const tartanPreset=presets.find(preset=>preset.id==='midnighttartan');
assert.ok(tartanPreset, 'Midnight Tartan preset must be present');
const tartanProgram=compileFilterProgram(tartanPreset.f.map(formula=>new Parser(formula).parse()));
for(const name of ['grid','checker'])assert.ok(tartanProgram.metadata.functions.includes(name), `Midnight Tartan must use ${name}()`);
assert.doesNotThrow(()=>WGSLCompiler.compile(tartanProgram), 'Midnight Tartan must generate valid WGSL source');

console.log(`Core smoke: ${presets.length} presets, ${gpuCompatible} GPU-compatible, ${cpuFallback} CPU fallback.`);
