import assert from 'node:assert/strict';
import vm from 'node:vm';
import {Parser} from '../src/core/formula-language.js';
import {compileFilterProgram} from '../src/core/ir.js';
import {workerProgram} from '../src/renderers/cpu-worker-source.js';
import {WGSLCompiler} from '../src/gpu/wgsl-compiler.js';
import {centeredAngleFixtures,centeredAngleSizes,centeredAnglePoints} from './centered-angle-fixtures.js';
const program=formula=>compileFilterProgram([formula,'0','0','255'].map(f=>new Parser(f).parse()));
const code=formula=>WGSLCompiler.compile(program(formula)).code;
const context=vm.createContext({postMessage(){}});vm.runInContext(workerProgram(),context);
let assertions=0;
for(const [width,height] of centeredAngleSizes){
  context.width=width;context.height=height;vm.runInContext('W=width;H=height;',context);
  for(const {formula,values} of centeredAngleFixtures){
    const p=program(formula);context.expression=p.outputs[0].expression;
    for(const [x,y] of centeredAnglePoints(width,height)){
      context.x=x;context.y=y;
      const [a,b]=values(width>1?2*x/(width-1)-1:0,height>1?2*y/(height-1)-1:0,x);
      const expected=Math.atan2(b,a)*1024/(2*Math.PI);
      const actual=vm.runInContext('environment.x=x;environment.y=y;evFloat(expression,environment)',context);
      assert.ok(Object.is(actual,expected),`${formula} at ${width}x${height} (${x},${y})`);assertions++;
    }
    const shader=WGSLCompiler.compile(p).code;
    assert.match(shader,/select\(centeredX, 0\.0, 2u\*px == params\.width-1u\)/);
    assert.match(shader,/select\(centeredY, 0\.0, 2u\*py == params\.height-1u\)/);
  }
}
// The common coordinate definitions and non-angle consumers remain original.
for(const formula of ['cx+cy','mandelbrot(cx,cy,96)','julia(cx,cy,-0.8,0.156,96)','perlin(cx,cy,1,1)','src(cx,cy,0)','angularGrad(cx,cy,0,0,0)',
  'angle(mandelbrot(cx,cy,96),1)','angle(sin(cx),min(cy,1))','angle(cx==0,cy==0)']){
  const shader=code(formula);
  assert.doesNotMatch(shader,/select\(centered[XY], 0\.0/);
  assert.match(shader,/let centeredX=normalizedX\*2\.0-1\.0;let centeredY=normalizedY\*2\.0-1\.0;/);
}
assert.match(code('angle(angle(cx,cy),0)'),/select\(centeredX, 0\.0/,'nested explicit angles establish their own coordinate scope');
const mixed=code('angle(cx,cy)+mandelbrot(cx,cy,96)+src(cx,cy,0)');
assert.match(mixed,/ff_mandelbrot\(centeredX, centeredY, 96\.0\)/);
assert.match(mixed,/ff_sample_nearest\(centeredX, centeredY, 0\.0\)/);
console.log(`Centered-angle smoke: ${assertions} raw CPU coordinate/angle checks, ${centeredAngleFixtures.length} lowering fixtures, scoped-consumer checks pass.`);
