import assert from 'node:assert/strict';
import vm from 'node:vm';
import { Parser } from '../src/core/formula-language.js';
import { compileFilterProgram } from '../src/core/ir.js';
import { WGSLCompiler } from '../src/gpu/wgsl-compiler.js';
import { workerProgram } from '../src/renderers/cpu-worker-source.js';
import { conditionalFractalFixtures, conditionalFractalWorkloads } from './fractal-fixtures.js';

const programFor=formula=>compileFilterProgram(Array(4).fill(formula).map(f=>new Parser(f).parse()));
const emit=(formula,channel=0)=>{
  const program=programFor(formula),compiler=new WGSLCompiler(program);
  const expression=compiler.value(program.outputs[channel].expression,channel);
  return{program,expression,statements:compiler.statements.join('\n')};
};
const m='mandelbrot(-0.75,0.1,512)',j='julia(0.3,0.2,-0.8,0.156,512)';
const direct=emit(`x?${m}:${j}`);
assert.match(direct.statements,/var ff_branch_0:f32;\nif \(ff_bool\(pixelX\)\) \{/);
assert.match(direct.statements,/ff_branch_0 = ff_mandelbrot\([^;]+;\n} else \{\n\nff_branch_0 = ff_julia\(/);
assert.doesNotMatch(direct.statements,/select\(/,'expensive branches must not be eager select arguments');
assert.equal(direct.expression,'ff_branch_0');
assert.deepEqual(emit('x?1:2').statements,'','cheap selections retain expression lowering');
assert.equal(emit('x?1:2').expression,'select(2.0, 1.0, ff_bool(pixelX))');
for(const formula of ['fbm(x,y,16,4,2,0.5,7)','turbulence(x,y,16,4,7)','ridged(x,y,16,4,7)','worleyF1(x,y,16,7)','worleyF2(x,y,16,7)','cnv(0,0,0,0,1,0,0,0,0,1)','sierpinski(x,y,0,0,64,6,1)']){
  assert.match(emit(`x?${formula}:0`).statements,/if \(/,`${formula} must use the shared expensive-work classification`);
}
assert.match(emit(`x?sqrt(${m}):0`).statements,/sqrt\(max\(0\.0, ff_mandelbrot/,'classification sees expensive descendants through cheap wrappers');
const nested=emit(`x?(y?${m}:${j}):0`).statements;
assert.ok(nested.indexOf('if (ff_bool(pixelX))')<nested.indexOf('if (ff_bool(pixelY))'),'nested work stays inside its parent branch');
const logic=emit(`x&&(y?${m}:${j})`).statements;
assert.ok(logic.indexOf('if (ff_logic_')<logic.indexOf('if (ff_bool(pixelY))'),'short-circuit guard encloses nested branch statements');

// Execute the emitted scalar/control-flow subset as JS with instrumented real
// CPU intrinsic helpers. This checks branch execution and scope, not GPU f32
// arithmetic or driver WGSL validation (covered by the optional hardware suite).
const worker=vm.createContext({postMessage(){}});
vm.runInContext(workerProgram()+`\nconst originalFractal=fractalEscape2;globalThis.fractalCalls=[];fractalEscape2=(...args)=>{fractalCalls.push(args);return originalFractal(...args)};`,worker);
const fractal=vm.runInContext('fractalEscape2',worker);
const fixtures=[
  `x?${m}:${j}`,`x?0:${m}`,`x?(y?${m}:${j}):0`,
  `(x?${m}:0)?${j}:1`,`x?(${m}>0):(${j}<1)`,
  `x&&(y?${m}:${j})`,`x||(y?${m}:${j})`,
  `(x?${m}:0)&&(y?${j}:0)`,`!(x?${m}:${j})`,
  `(x?${m}:${j})+(y?${j}:${m})`,
  `max(x?${m}:${j},y?${j}:0)`,
  `x?(y&&(${m}?${j}:0)):${m}`,`c?${m}+z:${j}+p`,
  `x?((y?${m}:0)?1:2):${j}`
];
for(const formula of fixtures)for(const channel of [0,1,2,3]){
  const {program,expression,statements}=emit(formula,channel);
  const script=new vm.Script(`${statements.replace(/:f32\b|:bool\b/g,'')}\n${expression};`);
  for(const x of [0,1])for(const y of [0,1]){
    const color=[0,20,0,255];
    worker.node=program.outputs[channel].expression;worker.env={x,y,z:channel,p:color};
    worker.fractalCalls.length=0;
    const expected=vm.runInContext('evFloat(node,env)',worker),expectedCalls=worker.fractalCalls.map(args=>[...args]);
    worker.fractalCalls.length=0;
    const result=script.runInNewContext({pixelX:x,pixelY:y,sourceColor:color,
      ff_bool:v=>Boolean(v),ff_num:v=>v?1:0,ff_channel:(values,index)=>values[index],
      ff_mandelbrot:(cx,cy,n)=>fractal(0,0,cx,cy,n),ff_julia:fractal,
      select:(no,yes,condition)=>condition?yes:no,max:Math.max});
    assert.equal(result,expected,`${formula} at ${x},${y}, channel ${channel}`);
    assert.deepEqual(worker.fractalCalls.map(args=>[...args]),expectedCalls,'only the CPU-selected fractal calls must execute, in the same order');
  }
  const code=WGSLCompiler.compile(program).code;
  assert.equal(code,WGSLCompiler.compile(programFor(formula)).code,'temporary names and source generation must be deterministic');
  const declarations=[...code.matchAll(/var (ff_(?:branch|logic)_\d+):/g)].map(match=>match[1]);
  assert.equal(new Set(declarations).size,declarations.length,'temporary identifiers must be unique across scopes and channels');
}
const channels=WGSLCompiler.compile(programFor(`x?${m}:${j}`)).code.split('fn main(')[1];
assert.equal((channels.match(/= ff_mandelbrot\(/g)||[]).length,4,'channels remain independent; no Stage C hoisting');
assert.equal((channels.match(/= ff_julia\(/g)||[]).length,4);
for(const formula of [`x?${m}:rnd(0,255)`,`x?${m}:pow(2,3)`])assert.equal(WGSLCompiler.analyze(programFor(formula)).compatible,false,'unsupported branches remain CPU-only');
for(const [,formula] of [...conditionalFractalFixtures,...conditionalFractalWorkloads.map(([name,fn])=>[name,fn(512)])]){
  const p=programFor(formula);
  assert.equal(WGSLCompiler.analyze(p).compatible,true);
  assert.match(WGSLCompiler.compile(p).code,/var ff_branch_\d+:f32;/);
}
console.log('WGSL conditional smoke: lazy branches, nesting, short-circuit scope, and channel independence pass.');
