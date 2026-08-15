import assert from 'node:assert/strict';
import { Parser } from '../src/core/formula-language.js';
import { compileFilterProgram } from '../src/core/ir.js';
import { WGSLCompiler } from '../src/gpu/wgsl-compiler.js';

const programFor = (formula, options = {}) => compileFilterProgram(
  [formula, formula, formula, formula].map(source => new Parser(source).parse()),
  options
);

const statelessCases = [
  ['rad(0,2,z)', 'ff_sample_polar('],
  ['cnv(0,0,0,0,1,0,0,0,0,1)', 'ff_convolve3x3(pixelX, pixelY, 0.0'],
  ['map(0,c)', 'ff_map('],
  ['bias(c/255,128)', 'ff_bias('],
  ['gain(c/255,128)', 'ff_gain('],
  ['hash2(x,y,7)', 'ff_hash01(pixelX, pixelY, 7.0)'],
  ['valueNoise(x,y,16,7)', 'ff_value_noise('],
  ['perlin(x,y,16,7)', 'ff_perlin('],
  ['worleyF1(x,y,16,7)', 'ff_worley(pixelX, pixelY, 16.0, 7.0).x'],
  ['worleyF2(x,y,16,7)', 'ff_worley(pixelX, pixelY, 16.0, 7.0).y'],
  ['fbm(x,y,16,4,2,0.5,7)', 'ff_fbm('],
  ['turbulence(x,y,16,4,7)', 'ff_turbulence('],
  ['ridged(x,y,16,4,7)', 'ff_ridged('],
  ['periodicNoise(x,y,16,12,7)', 'ff_periodic_noise('],
  ['angularGrad(x,y,X/2,Y/2,0)', 'ff_angular_grad('],
  ['checker(x,y,8,8)', 'ff_checker('],
  ['brick(x,y,16,8,1,0.5)', 'ff_brick(']
];

for (const [formula, emittedCall] of statelessCases) {
  const program = programFor(formula);
  const analysis = WGSLCompiler.analyze(program);
  assert.equal(analysis.compatible, true, `${formula} must be WebGPU-compatible`);
  assert.equal(analysis.subset, 'phase-3.5-stateless');
  const { code } = WGSLCompiler.compile(program);
  const mainBody = code.slice(code.lastIndexOf('outPixels[index]'));
  assert.ok(mainBody.includes(emittedCall), `${formula} must emit ${emittedCall}`);
}

const convolutionCode = WGSLCompiler.compile(programFor('cnv(0,0,0,0,1,0,0,0,0,1)')).code;
const convolutionMain = convolutionCode.slice(convolutionCode.lastIndexOf('outPixels[index]'));
for (let channel = 0; channel < 4; channel += 1) {
  assert.ok(
    convolutionMain.includes(`ff_convolve3x3(pixelX, pixelY, ${channel}.0`),
    `cnv() output ${channel} must sample its own source channel`
  );
}

const noiseCode = WGSLCompiler.compile(programFor('hash2(x,y,7)')).code;
assert.ok(
  noiseCode.includes('var h=(bitcast<u32>(i32(trunc(x)))*374761393u)^(bitcast<u32>(i32(trunc(y)))*668265263u)^(bitcast<u32>(i32(trunc(seed)))*1442695041u);'),
  'hash multiplication terms must be parenthesized before WGSL bitwise XOR'
);

const statefulCases = [
  ['rnd(0,255)', 'rnd()'],
  ['rst(7)', 'rst()'],
  ['get(0)', 'get()'],
  ['put(c,0)', 'put()']
];
for (const [formula, blocker] of statefulCases) {
  const program = programFor(formula);
  const analysis = WGSLCompiler.analyze(program);
  assert.equal(analysis.compatible, false, `${formula} must remain CPU-only`);
  assert.ok(analysis.blockers.includes(blocker));
  assert.equal(program.metadata.stateful, true);
}

assert.equal(programFor('rnd(0,255)').metadata.deterministic, false);
assert.equal(programFor('get(0)').metadata.deterministic, true);
assert.equal(WGSLCompiler.analyze(programFor('c', { legacyMath: true })).compatible, false);

console.log(`WGSL compiler smoke: ${statelessCases.length} Phase 3.5 functions pass; stateful fallbacks preserved.`);
