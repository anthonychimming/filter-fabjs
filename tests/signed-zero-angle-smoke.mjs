import assert from 'node:assert/strict';
import vm from 'node:vm';
import { Parser } from '../src/core/formula-language.js';
import { compileFilterProgram } from '../src/core/ir.js';
import { workerProgram } from '../src/renderers/cpu-worker-source.js';
import { WGSLCompiler } from '../src/gpu/wgsl-compiler.js';
import { signedZeroAngleFixtures, signedZeroControls } from './signed-zero-angle-fixtures.js';

const program=formula=>compileFilterProgram([formula,'0','0','255'].map(f=>new Parser(f).parse()));
const context=vm.createContext({postMessage(){}});
vm.runInContext(workerProgram(),context);
context.testControls=signedZeroControls;
vm.runInContext('controls=testControls; W=4; H=3; srcPixels=new Uint8ClampedArray(W*H*4)',context);
for(const {formula,expected} of signedZeroAngleFixtures){
  const p=program(formula);context.expression=p.outputs[0].expression;
  for(let x=0;x<4;x++){
    context.testX=x;
    const actual=vm.runInContext('environment.x=testX; evFloat(expression,environment)',context);
    assert.ok(Object.is(actual,expected(x)),`${formula}, x=${x}: expected ${Object.is(expected(x),-0)?'-0':expected(x)}, got ${Object.is(actual,-0)?'-0':actual}`);
  }
  assert.equal(WGSLCompiler.analyze(p).compatible,true,formula);
  assert.match(WGSLCompiler.compile(p).code,/ff_angle\(/,formula);
}
const code=formula=>WGSLCompiler.compile(program(formula)).code;
assert.match(code('c2d(-0,0)'),/ff_angle\(0\.0, ff_sign_\d+, false, true\)/);
assert.match(code('c2d(0,0)'),/ff_angle\(0\.0, 0\.0, false, false\)/);
assert.match(code('angle(x?-0:0,0)'),/var ff_sign_branch_\d+_negative:bool/);
assert.match(code('angle(ctl(0),0)'),/ff_control_negative\(0\.0\)/);
assert.doesNotMatch(code('r+sin(x)'),/fn ff_angle|ff_sign_/);
// Linear statement growth, including nested sign-sensitive consumers.
const short=code('angle(x*0,0)'),long=code(`angle(${Array(64).fill('x*0').join('+')},0)`);
assert.ok(long.length-short.length<64000,'provenance must not expand subtrees exponentially');
assert.match(code('angle(x?-0:mandelbrot(3,0,1),0)'),/else \{[\s\S]*ff_mandelbrot\(/);
console.log(`Signed-zero angle smoke: ${signedZeroAngleFixtures.length} raw CPU/codegen fixtures pass (4 runtime X values each).`);
