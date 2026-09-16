import assert from 'node:assert/strict';
import vm from 'node:vm';
import { Parser, MAX_FRACTAL_ITERATIONS } from '../src/core/formula-language.js';
import { compileFilterProgram } from '../src/core/ir.js';
import { workerProgram } from '../src/renderers/cpu-worker-source.js';
import { estimateCpuProgramCost, assertCpuRenderBudget, MAX_CPU_RENDER_WORK } from '../src/renderers/cpu-renderer.js';
import { WGSLCompiler } from '../src/gpu/wgsl-compiler.js';
import { fractalParityFixtures, fractalWorkloads } from './fractal-fixtures.js';

const program=(formula,legacyMath=false)=>compileFilterProgram([formula,'0','0','0'].map(f=>new Parser(f).parse()),{legacyMath});
const cost=formula=>estimateCpuProgramCost(program(formula));
const context=vm.createContext({postMessage(){}});
vm.runInContext(workerProgram(),context);
const evaluate=formula=>{context.expression=program(formula).outputs[0].expression;return vm.runInContext('evFloat(expression,environment)',context)};
assert.equal(MAX_FRACTAL_ITERATIONS,512);
assert.equal(MAX_CPU_RENDER_WORK,3_000_000_000);
// Captured from the v2.8.4 f32 worker, before changing its 256 ceiling.
const historical=[
  [1,1,1,1],[24,1,1,1],[64,0.5,1,1],[128,0.25,1,1],
  [192,0.1666666716337204,1,0.9791666865348816],[256,0.125,0.86328125,0.734375]
];
for(const [n,m,j,k] of historical){
  assert.equal(evaluate(`mandelbrot(-0.75,0.1,${n})`),m);
  assert.equal(evaluate(`julia(0,0,-0.8,0.156,${n})`),j);
  assert.equal(evaluate(`julia(0.3,0.2,-0.8,0.156,${n})`),k);
}
for(const n of [257,384,512,513,9999]){
  const limit=Math.min(n,512);
  assert.equal(evaluate(`mandelbrot(-0.75,0.1,${n})`),Math.fround(32/limit));
  assert.equal(evaluate(`julia(0.3,0.2,-0.8,0.156,${n})`),Math.fround(188/limit));
  for(const f of [`mandelbrot(3,0,${n})`,`julia(3,0,0,0,${n})`])assert.equal(evaluate(f),0);
  for(const f of [`mandelbrot(0,0,${n})`,`julia(0,0,0,0,${n})`])assert.equal(evaluate(f),1);
  const p=program(`mandelbrot(cx,cy,${n})+julia(cx,cy,-0.8,0.156,${n})`);
  assert.equal(WGSLCompiler.analyze(p).compatible,true);
  assert.match(WGSLCompiler.compile(p).code,/const FF_MAX_FRACTAL_ITERATIONS : i32 = 512;/);
}
for(const n of [-20,0,1,24,64,128,192,256,257,384,512,9999,127.9999999]){
  const limit=Math.max(1,Math.min(512,Math.trunc(Math.fround(n))));
  // Subtract actual argument expression costs, retaining the loop weight.
  assert.equal(cost(`mandelbrot(0,0,${n})`)-cost(`${n}`)-2,limit);
}
for(const [expression,limit] of [
  ['ctl(3)',255],['val(3,32,256)',256],['val(3,256,32)',256],['val(3,32,512)',512],
  ['clamp(x,32,128)',128],['clamp(x,192,32)',192],['min(x,128)',128],
  ['max(ctl(0),128)',255],['max(x,128)',512],['min(max(x,24),192)',192],
  ['x',512],['ctl(0)*2',512],['val(0,0,x)',512],['-ctl(0)',1],
  ['x?128:256',256],['clamp(pow(-1,0.5),1,128)',128]
])assert.equal(cost(`mandelbrot(0,0,${expression})`)-cost(expression)-2,limit,expression);
const a='mandelbrot(0,0,128)',b='julia(0,0,0,0,256)',condition='mandelbrot(0,0,24)';
assert.equal(cost(`${condition}?${a}:${b}`),1+cost(condition)+Math.max(cost(a),cost(b))-3);
assert.equal(cost(`x?(${condition}?${a}:${b}):${a}`),2+cost(`${condition}?${a}:${b}`));
assert.equal(cost(`mandelbrot(0,0,mandelbrot(0,0,128))`),512+2+cost(a));
assert.equal(estimateCpuProgramCost(program(a,true)),512+6,'legacy integer wraparound must not use float bounds');
assert.doesNotThrow(()=>assertCpuRenderBudget(program('x?mandelbrot(0,0,512):julia(0,0,0,0,512)'),1800,1800));
assert.throws(()=>assertCpuRenderBudget(program('mandelbrot(0,0,512)+julia(0,0,0,0,512)'),1800,1800),/work-unit limit/);
assert.equal(estimateCpuProgramCost({outputs:[]}),Infinity);
for(const [,formula] of [...fractalParityFixtures,...fractalWorkloads.map(([name,fn])=>[name,fn(512)])]){
  const p=program(formula);
  assert.equal(WGSLCompiler.analyze(p).compatible,true);
  assert.ok(WGSLCompiler.compile(p).code.includes('ff_fractal_escape'));
  assert.ok(Number.isFinite(evaluate(formula)));
}
console.log('Fractal Stage A smoke: pass.');
