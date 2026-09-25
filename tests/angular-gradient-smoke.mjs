import assert from 'node:assert/strict';
import vm from 'node:vm';
import {Parser} from '../src/core/formula-language.js';
import {compileFilterProgram} from '../src/core/ir.js';
import {WGSLCompiler} from '../src/gpu/wgsl-compiler.js';
import {workerProgram} from '../src/renderers/cpu-worker-source.js';
import {angularGradientSizes,angularGradientOffsets,angularGradientDirections,angularGradientCenters,angularGradientRayFormula,angularGradientRayControls,angularGradientValue} from './angular-gradient-fixtures.js';
const program=f=>compileFilterProgram([f,'0','0','255'].map(s=>new Parser(s).parse()));
const context=vm.createContext({postMessage(){}});vm.runInContext(workerProgram(),context);
const evaluate=(expression,x,y,controls)=>{Object.assign(context,{expression,x,y,inputControls:controls});return vm.runInContext('environment.x=x;environment.y=y;controls=inputControls;evFloat(expression,environment)',context)};
let checks=0;
const ray=program(angularGradientRayFormula);
assert.equal(WGSLCompiler.analyze(ray).compatible,true);
for(const center of [16,16.5])for(const {dx,dy} of angularGradientDirections)for(const offset of angularGradientOffsets){
  const controls=angularGradientRayControls(dx,dy,center,offset);
  assert.ok(controls.every(v=>v>=0&&v<=255));
  assert.equal(evaluate(ray.outputs[0].expression,0,0,controls),angularGradientValue(dx,dy,offset));checks++;
}
for(const [width,height] of angularGradientSizes){
  Object.assign(context,{width,height});vm.runInContext('W=width;H=height',context);
  for(const center of angularGradientCenters)for(const offset of angularGradientOffsets){
    const p=program(`angularGrad(x,y,${center.x},${center.y},${offset})`),[cx,cy]=center.values(width,height);
    assert.equal(WGSLCompiler.analyze(p).compatible,true);
    for(let y=0;y<height;y++)for(let x=0;x<width;x++){
      assert.equal(evaluate(p.outputs[0].expression,x,y,[31,23,0,0,0,0,0,0,0,0]),angularGradientValue(x-cx,y-cy,offset));checks++;
    }
  }
}
assert.equal(angularGradientValue(11.5,-11.5,128),0,'exact seam');
assert.equal(angularGradientValue(-0.5,0.5,128),0.5,'opposite half-byte boundary');
assert.equal(new Uint8ClampedArray([angularGradientValue(-0.5,0.5,128)*255])[0],128);
assert.equal(angularGradientValue(-1,0,512),0,'exact one wraps to zero');
const shader=WGSLCompiler.compile(ray).code;
assert.match(shader,/if\(abs\(x\)==abs\(y\)\)/);
assert.match(shader,/ff_wrap\(ff_angular_turn\(y-cy,x-cx\)\+offset,1\.0\)/);
assert.match(shader,/if\(x==0\.0&&y==0\.0\)\{return ff_atan2\(y,x\)\/FF_TAU;\}/);
for(const formula of ['angle(cx,cy)','c2d(x,y)','r+g','mandelbrot(cx,cy,96)']){
  assert.doesNotMatch(WGSLCompiler.compile(program(formula)).code,/fn ff_angular_turn/,'helper is emitted only for angularGrad');
}
console.log(`Angular-gradient smoke: ${checks} raw CPU checks; exact seam, half-byte, wrap and scoped-helper checks pass.`);
