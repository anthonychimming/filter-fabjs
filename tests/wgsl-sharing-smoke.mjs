import assert from 'node:assert/strict';
import vm from 'node:vm';
import { Parser } from '../src/core/formula-language.js';
import { compileFilterProgram, programCacheKey } from '../src/core/ir.js';
import { WGSLCompiler, MAX_WEBGPU_IR_NODES } from '../src/gpu/wgsl-compiler.js';
import { workerProgram } from '../src/renderers/cpu-worker-source.js';
import { presets } from '../src/presets/builtins.js';

const programFor=formulas=>compileFilterProgram(formulas.map(f=>new Parser(f).parse()));
const repeat=field=>[`${field}*255`,`${field}*128`,`${field}*64`,'255'];
const emitted=formulas=>{
  const program=programFor(formulas),compiler=new WGSLCompiler(program);
  compiler.prepareSharedFields();
  const expressions=program.outputs.map((o,i)=>compiler.value(o.expression,i));
  return{program,compiler,expressions,statements:compiler.statements.join('\n')};
};
const m='mandelbrot(x,y,512)',j='julia(x,y,-0.8,0.156,512)';
const fieldCases=[
  [m,'ff_mandelbrot'],[j,'ff_julia'],['fbm(x,y,16,4,2,0.5,7)','ff_fbm'],
  ['turbulence(x,y,16,4,7)','ff_turbulence'],['ridged(x,y,16,4,7)','ff_ridged'],
  ['worleyF1(x,y,16,7)','ff_worley'],['worleyF2(x,y,16,7)','ff_worley']
];
for(const [field,fn] of fieldCases){
  const {program,statements,expressions}=emitted(repeat(field));
  assert.equal((statements.match(new RegExp(`${fn}\\(`,'g'))||[]).length,1,`${field} must execute once`);
  assert.match(statements,/let ff_shared_0:f32 = /);
  assert.ok(expressions.slice(0,3).every(e=>e.includes('ff_shared_0')));
  const snapshot=JSON.stringify(program),key=programCacheKey(program);
  assert.equal(WGSLCompiler.compile(program).code,WGSLCompiler.compile(programFor(repeat(field))).code,'source must be deterministic across independent IR objects');
  assert.equal(JSON.stringify(program),snapshot,'sharing must not mutate IR or capability metadata');
  assert.equal(programCacheKey(program),key,'canonical program key is unchanged');
}
for(const sensitive of ['c','c0','c1','z','p','cnv(0,0,0,0,1,0,0,0,0,1)','cnv0(0,0,0,0,1,0,0,0,0,1)','cnv1(0,0,0,0,1,0,0,0,0,1)']){
  assert.equal(emitted(repeat(`mandelbrot(${sensitive},0,512)`)).compiler.sharedFields.size,0,`${sensitive} is channel-dependent`);
}
assert.equal(emitted(repeat('mandelbrot(src(x,y,z),0,512)')).compiler.sharedFields.size,0,'nested channel-dependent source sampling is excluded');
assert.equal(emitted(repeat('mandelbrot(src(x,y,0),0,512)')).compiler.sharedFields.size,1,'explicit fixed-channel source sampling is independent');
assert.equal(emitted(repeat('mandelbrot(c?0:1,0,512)')).compiler.sharedFields.size,0,'a channel-sensitive nested condition blocks sharing');
assert.equal(emitted([`${m}+${m}`,'0','0','255']).compiler.sharedFields.size,0,'same-channel repetition alone is out of scope');
assert.equal(emitted([m,'mandelbrot(x,y,256)','0','255']).compiler.sharedFields.size,0,'different arguments must not collide');
assert.equal(emitted(['mandelbrot(0,y,512)','mandelbrot(-0,y,512)','0','255']).compiler.sharedFields.size,0,'signed zero is structurally distinct');
assert.equal(emitted(['worleyF1(x,y,16,7)','worleyF2(x,y,16,7)','0','255']).compiler.sharedFields.size,0,'different function names remain distinct');
for(const guarded of [`x?${m}:${j}`,`x&&${m}`,`x||${m}`])assert.equal(emitted(repeat(guarded)).compiler.sharedFields.size,0,'branch-only work is never lifted');
assert.equal(emitted([m,`x?${m}:0`,'0','255']).compiler.sharedFields.size,0,'two unconditional output channels are required');
assert.equal(emitted([m,m,`x?${m}:0`,'255']).compiler.sharedFields.size,1,'an already-required global field may be reused in a guard');
assert.equal(emitted(repeat(`mandelbrot(${m},0,128)`)).compiler.sharedFields.size,2,'nested definitions are dependency ordered');
assert.equal(emitted([`(${m}>0)?1:2`,`(${m}>0)?3:4`,'0','255']).compiler.sharedFields.size,1,'always-evaluated select conditions may share');
assert.equal(emitted([`${m}&&x`,`${m}||y`,'0','255']).compiler.sharedFields.size,1,'always-evaluated logical left operands may share');
for(const blocked of ['rnd(0,255)','rst(7)','get(0)','put(1,0)','pow(2,3)']){
  const p=programFor(repeat(`mandelbrot(${blocked},0,512)`));
  assert.equal(WGSLCompiler.analyze(p).compatible,false);assert.throws(()=>WGSLCompiler.compile(p),/WebGPU subset/);
}
const oversized=programFor(Array(4).fill(Array(1100).fill('r').join('+')));
assert.ok(oversized.metadata.nodeCount>MAX_WEBGPU_IR_NODES);assert.equal(WGSLCompiler.analyze(oversized).compatible,false,'sharing never bypasses resource bounds');
const atlas=presets.find(p=>p.id==='mandelbrotatlas'),atlasMain=WGSLCompiler.compile(programFor(atlas.f)).code.split('fn main(')[1];
assert.equal((atlasMain.match(/ff_mandelbrot\(/g)||[]).length,1,'Atlas keeps its existing formulas while sharing the field');

// Execute generated scope/expressions with real CPU helpers and count field calls.
// Browser tests separately validate WGSL types and f32 arithmetic on WebGPU.
const worker=vm.createContext({postMessage(){}});vm.runInContext(workerProgram(),worker);
const invoke=vm.runInContext('(name,args)=>call(name,args,environment)',worker);
const functionNames={ff_mandelbrot:'mandelbrot',ff_julia:'julia',ff_fbm:'fbm',ff_turbulence:'turbulence',ff_ridged:'ridged',ff_worley:'worleyF1'};
const executionCases=[...fieldCases.map(([field])=>repeat(field)),repeat(`mandelbrot(${m},0,128)`),
  [m,m,`x?${m}:${j}`,'255'],[`${m}+c`,`${m}+c`,`${m}+c`,'255'],
  repeat(`mandelbrot(x?${m}:${j},y,128)`),repeat(`x?${m}:${j}`),
  repeat('mandelbrot(z,y,128)'),repeat('mandelbrot(c,y,128)')];
for(const formulas of executionCases){
  const {program,statements,expressions}=emitted(formulas);
  const script=new vm.Script(`${statements.replace(/:f32\b|:bool\b/g,'')}\n[${expressions.join(',')}];`);
  for(const x of [0,1])for(const y of [0,1]){
    const color=[0,20,30,255],context={pixelX:x,pixelY:y,sourceColor:color,ff_bool:v=>Boolean(v),ff_num:v=>v?1:0,ff_channel:(p,i)=>p[i],select:(no,yes,c)=>c?yes:no};
    let calls=0;
    for(const [name,fn] of Object.entries(functionNames))context[name]=(...args)=>{
      calls++;return name==='ff_worley'?{x:invoke('worleyF1',args),y:invoke('worleyF2',args)}:invoke(fn,args);
    };
    const actual=Array.from(script.runInNewContext(context));
    const expected=program.outputs.map((o,z)=>{worker.node=o.expression;worker.env={x,y,z,p:color};return vm.runInContext('evFloat(node,env)',worker)});
    assert.deepEqual(actual,expected,`shared result must preserve all channels: ${formulas}`);
    if(fieldCases.some(([field])=>formulas[0]===`${field}*255`))assert.equal(calls,1,'shared expensive field must execute exactly once per pixel');
  }
}
console.log('WGSL field sharing smoke: structure, channel safety, guards, dependencies, resource bounds, and scalar execution pass.');
