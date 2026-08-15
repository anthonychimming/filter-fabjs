import assert from 'node:assert/strict';
import { Parser } from '../src/core/formula-language.js';
import { compileFilterProgram } from '../src/core/ir.js';
import { presets } from '../src/presets/builtins.js';
import { WGSLCompiler } from '../src/gpu/wgsl-compiler.js';
import { detectFilterFormat } from '../src/io/filter-format.js';

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
assert.equal(detectFilterFormat(JSON.stringify({ format: 'filter-fab-js', version: 2, formulas: ['r','g','b','a'] }), 'test.json').kind, 'native');
assert.equal(detectFilterFormat('%RGB-1.0\n128\n128\n128\n128\n128\n128\n128\n128\nr\n\ng\n\nb\n\na\n', 'test.afs').kind, 'afs');

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
