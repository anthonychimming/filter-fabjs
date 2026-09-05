import assert from 'node:assert/strict';
import { CONTROL_COUNT } from '../src/core/controls.js';
import { FORMULA_LIMITS, MAX_FRACTAL_ITERATIONS, Parser } from '../src/core/formula-language.js';
import { compileFilterProgram, IRType } from '../src/core/ir.js';
import { presets } from '../src/presets/builtins.js';
import { WGSLCompiler } from '../src/gpu/wgsl-compiler.js';
import { detectFilterFormat, FILTER_DESCRIPTION_MAX_LENGTH, FILTER_TEXT_MAX_LENGTH, getValidatedFormulaAsts, parseAFS, validateNativeFilter } from '../src/io/filter-format.js';

let gpuCompatible = 0;
let cpuFallback = 0;
for (const preset of presets) {
  const formulas = preset.formulas || preset.f;
  assert.equal(typeof preset.description,'string',`${preset.name} must include filter-level description metadata`);
  assert.ok(preset.description.trim(),`${preset.name} must include a useful description`);
  assert.ok(preset.description.length<=FILTER_DESCRIPTION_MAX_LENGTH,`${preset.name} description must stay within the native metadata limit`);
  assert.equal(formulas.length, 4, `${preset.name} must have four formulas`);
  const program = compileFilterProgram(formulas.map(formula => new Parser(formula).parse()));
  assert.equal(program.outputs.length, 4);
  const analysis = WGSLCompiler.analyze(program);
  if (analysis.compatible) gpuCompatible += 1;
  else cpuFallback += 1;
}

assert.equal(presets.length, 31);
assert.equal(gpuCompatible, presets.length, 'every native built-in must compile for WebGPU after Phase 3.5');
assert.equal(cpuFallback, 0, 'native built-ins must not require CPU fallback');
assert.equal(gpuCompatible + cpuFallback, presets.length);
const mandelbrotPreset=presets.find(preset=>preset.id==='mandelbrotatlas');
assert.equal(mandelbrotPreset?.name,'Mandelbrot Atlas','Phase 3.5B must include the native Mandelbrot reference preset');
const mandelbrotPresetProgram=compileFilterProgram(mandelbrotPreset.f.map(formula=>new Parser(formula).parse()));
assert.ok(mandelbrotPresetProgram.metadata.functions.includes('mandelbrot'),'the Mandelbrot reference preset must use the public intrinsic');
assert.equal(WGSLCompiler.analyze(mandelbrotPresetProgram).compatible,true,'the Mandelbrot reference preset must remain GPU-compatible');
const warpedSdfPreset=presets.find(preset=>preset.id==='warpedsdfbloom');
assert.equal(warpedSdfPreset?.name,'Warped SDF Bloom','Phase 3.5C must include the domain-warped SDF reference preset');
const warpedSdfPresetProgram=compileFilterProgram(warpedSdfPreset.f.map(formula=>new Parser(formula).parse()));
for(const name of ['sdfCircle','sdfBox','sdfSmoothUnion','sdfSubtract','sdfFill','sdfOutline','valueNoise'])assert.ok(warpedSdfPresetProgram.metadata.functions.includes(name),`the Phase 3.5C reference preset must use ${name}()`);
assert.equal(WGSLCompiler.analyze(warpedSdfPresetProgram).compatible,true,'the domain-warped SDF reference preset must remain GPU-compatible');
const benchmarkPresets=presets.filter(preset=>preset.benchmark);
assert.deepEqual(benchmarkPresets.map(preset=>preset.id),['mandelbrotatlas','layerednoisebenchmark','warpedsdfbloom'],'Phase 3.5D must expose fractal, layered-noise, and warped-SDF benchmark workloads');
for(const preset of benchmarkPresets){const program=compileFilterProgram(preset.f.map(formula=>new Parser(formula).parse()));assert.equal(program.metadata.deterministic,true,`${preset.name} benchmark must be deterministic`);assert.equal(program.metadata.stateful,false,`${preset.name} benchmark must remain stateless`);assert.equal(WGSLCompiler.analyze(program).compatible,true,`${preset.name} benchmark must remain GPU-compatible`);}
const layeredNoiseProgram=compileFilterProgram(benchmarkPresets.find(preset=>preset.id==='layerednoisebenchmark').f.map(formula=>new Parser(formula).parse()));
for(const name of ['fbm','turbulence','ridged'])assert.ok(layeredNoiseProgram.metadata.functions.includes(name),`the layered-noise benchmark must exercise ${name}()`);
const native=detectFilterFormat(JSON.stringify({ format: 'filter-fab-js', version: 2, formulas: ['r','g','b','a'] }), 'test.json');
assert.equal(native.kind, 'native');
assert.equal(native.data.mathMode, 'float', 'version 2 files without mathMode must normalize to float mode');
assert.equal(native.data.description,'','legacy native files without description metadata must normalize to an empty string');
const describedNative=validateNativeFilter({format:'filter-fab-js',version:2,name:'Described',description:'  First line.\nSecond line.  ',formulas:['r','g','b','a']});
assert.equal(describedNative.description,'First line.\nSecond line.','native descriptions must preserve internal line breaks while trimming their outer whitespace');
assert.equal(CONTROL_COUNT,10,'Phase 3.5A must expose ten data-driven formula controls');
assert.equal(native.data.controls.length, CONTROL_COUNT, 'native controls must normalize completely before UI mutation');
assert.deepEqual(native.data.controls[0],{label:'Control 1',value:128});
assert.deepEqual(native.data.controls[9],{label:'Control 10',value:128},'older native filters must gain default controls 8 and 9 without migration');
assert.equal(getValidatedFormulaAsts(native.data)?.length,4,'native validation must carry its parsed channel ASTs into application preparation');
const legacyNative=validateNativeFilter({format:'filter-fab-js',version:1,f:['r','g','b','a'],values:[0,255],labels:['Low','High']});
assert.equal(legacyNative.mathMode,'legacy','version 1 files without mathMode must retain legacy arithmetic');
assert.deepEqual(legacyNative.controls.slice(0,2),[{label:'Low',value:0},{label:'High',value:255}]);
const tenControlNative=validateNativeFilter({format:'filter-fab-js',version:2,formulas:['ctl(8)','ctl(9)','map(4,c)','a'],controls:Array.from({length:CONTROL_COUNT},(_,index)=>({label:`Input ${index}`,value:index}))});
assert.equal(tenControlNative.controls.length,CONTROL_COUNT,'native v2 filters must accept all ten controls');
assert.equal(tenControlNative.controls[9].value,9);
assert.throws(()=>validateNativeFilter({format:'filter-fab-js',version:2,formulas:['r','g','b','a'],controls:Array(CONTROL_COUNT+1).fill(128)}),/at most 10 entries/,'native filters must reject an eleventh control');

const phase35aProgram=compileFilterProgram(['ctl(8)+ctl(9)','map(4,c)','nx+ny+cx+cy','gradient4(repeat(nx,1),0,64,192,255)+radius(cx,cy)+angle(cx,cy)+mirrorRepeat(x,4)'].map(formula=>new Parser(formula).parse()));
assert.equal(phase35aProgram.metadata.controlMask.length,CONTROL_COUNT);
assert.deepEqual(phase35aProgram.metadata.controlMask.slice(8),[true,true],'control references and the fifth map pair must track controls 8 and 9');
for(const variable of ['nx','ny','cx','cy'])assert.ok(phase35aProgram.metadata.variables.includes(variable),`Phase 3.5A program must track ${variable}`);
for(const name of ['angle','gradient4','mirrorRepeat','radius','repeat'])assert.ok(phase35aProgram.metadata.functions.includes(name),`Phase 3.5A program must track ${name}()`);
assert.doesNotThrow(()=>WGSLCompiler.compile(phase35aProgram),'Phase 3.5A vocabulary must compile for WebGPU');
const phase35bProgram=compileFilterProgram(['mandelbrot(cx,cy,256)','julia(cx,cy,-0.8,0.156,val(0,1,256))','fbm(x,y,16,12,2,0.5,7)','a'].map(formula=>new Parser(formula).parse()));
assert.equal(MAX_FRACTAL_ITERATIONS,256,'Phase 3.5B fractal iteration work must have a stable hard ceiling');
assert.equal(phase35bProgram.outputs[0].expression.type,IRType.MASK,'mandelbrot() must produce a normalized mask field');
assert.equal(phase35bProgram.outputs[1].expression.type,IRType.MASK,'julia() must produce a normalized mask field');
for(const name of ['fbm','julia','mandelbrot'])assert.ok(phase35bProgram.metadata.functions.includes(name),`Phase 3.5B program must track ${name}()`);
assert.equal(phase35bProgram.metadata.stateful,false,'bounded fractal intrinsics must remain stateless');
assert.equal(phase35bProgram.metadata.deterministic,true,'bounded fractal intrinsics must remain deterministic');
assert.doesNotThrow(()=>WGSLCompiler.compile(phase35bProgram),'Phase 3.5B vocabulary must compile for WebGPU');
assert.throws(()=>new Parser('mandelbrot(0,0)').parse(),/expects 3 arguments/,'mandelbrot() arity must be validated before compilation');
assert.throws(()=>new Parser('julia(0,0,0,0)').parse(),/expects 5 arguments/,'julia() arity must be validated before compilation');
const phase35cProgram=compileFilterProgram([
  'sdfFill(sdfSubtract(sdfSmoothUnion(sdfCircle(x,y,8,8,4),sdfBox(x,y,8,8,6,6,0),2),sdfLine(x,y,4,8,12,8,2)),1)',
  'sdfOutline(sdfUnion(sdfCircle(x,y,4,4,2),sdfBox(x,y,8,8,4,4,0)),2,1)',
  'sdfFill(sdfIntersect(sdfCircle(x,y,8,8,6),sdfBox(x,y,8,8,8,8,0)))',
  'a'
].map(formula=>new Parser(formula).parse()));
assert.equal(phase35cProgram.outputs[0].expression.type,IRType.MASK,'sdfFill() must convert a signed distance into a normalized mask');
assert.equal(phase35cProgram.outputs[1].expression.type,IRType.MASK,'sdfOutline() must convert a signed distance into a normalized outline mask');
for(const name of ['sdfBox','sdfCircle','sdfFill','sdfIntersect','sdfLine','sdfOutline','sdfSmoothUnion','sdfSubtract','sdfUnion'])assert.ok(phase35cProgram.metadata.functions.includes(name),`Phase 3.5C program must track ${name}()`);
assert.equal(phase35cProgram.metadata.stateful,false,'SDF composition must remain stateless');
assert.equal(phase35cProgram.metadata.deterministic,true,'SDF composition must remain deterministic');
assert.doesNotThrow(()=>WGSLCompiler.compile(phase35cProgram),'Phase 3.5C vocabulary must compile for WebGPU');
assert.throws(()=>new Parser('sdfCircle(0,0,0,0)').parse(),/expects 5 arguments/,'SDF primitive arity must be validated before compilation');
assert.throws(()=>new Parser('sdfOutline(0)').parse(),/expects 2 or 3 arguments/,'SDF outline arity must be validated before compilation');
const afsHeader='%RGB-1.0\n128\n128\n128\n128\n128\n128\n128\n128\n';
const afsWithFirstControl=value=>`%RGB-1.0\n${value}\n128\n128\n128\n128\n128\n128\n128\nr\ng\nb\na\n`;
const fourGroupAfs=parseAFS(`${afsHeader}r\n\ng\n\nb\n\na\n`,'test.afs');
assert.deepEqual(fourGroupAfs.f,['r','g','b','a'],'AFS import must accept exactly four separated formula groups');
assert.equal(fourGroupAfs.description,'','historic AFS imports must normalize missing description metadata to an empty string');
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
assert.throws(()=>validateNativeFilter({format:'filter-fab-js',version:2,description:{},formulas:['r','g','b','a']}),/description must be a string/);
assert.throws(()=>validateNativeFilter({format:'filter-fab-js',version:2,description:'x'.repeat(FILTER_DESCRIPTION_MAX_LENGTH+1),formulas:['r','g','b','a']}),new RegExp(`description exceeds ${FILTER_DESCRIPTION_MAX_LENGTH} characters`));
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
