import assert from 'node:assert/strict';
import { CHROMA_MODELS } from '../src/core/chroma.js';
import { CONTROL_COUNT } from '../src/core/controls.js';
import { Parser } from '../src/core/formula-language.js';
import { compileFilterProgram } from '../src/core/ir.js';
import { WGSLCompiler } from '../src/gpu/wgsl-compiler.js';
import { WEBGPU_CONTROL_SLOT_COUNT } from '../src/gpu/params-layout.js';

const programFor = (formula, options = {}) => compileFilterProgram(
  [formula, formula, formula, formula].map(source => new Parser(source).parse()),
  options
);
const expressionNodeCount=node=>node.op==='const'||node.op==='var'?1:node.op==='unary'?1+expressionNodeCount(node.input):node.op==='binary'?1+expressionNodeCount(node.left)+expressionNodeCount(node.right):node.op==='select'?1+expressionNodeCount(node.condition)+expressionNodeCount(node.whenTrue)+expressionNodeCount(node.whenFalse):node.op==='call'?1+node.args.reduce((total,arg)=>total+expressionNodeCount(arg),0):1;
const jsonLength=value=>{let length=0,stack=[value];while(stack.length){const current=stack.pop();if(current===null){length+=4;continue}if(Array.isArray(current)){length+=2+Math.max(0,current.length-1);for(const item of current)stack.push(item);continue}if(typeof current==='object'){const entries=Object.entries(current);length+=2+Math.max(0,entries.length-1);for(const[key,item]of entries){length+=JSON.stringify(key).length+1;stack.push(item)}continue}length+=JSON.stringify(current).length}return length};

const largeFormula=Array(2048).fill('r').join('+'),largeProgram=programFor(largeFormula),largeKey=WGSLCompiler.key(largeProgram);
const largeAnalysis=WGSLCompiler.analyze(largeProgram);
assert.equal(largeAnalysis.compatible,false,'oversized IR programs must use the CPU path instead of generating unbounded WGSL');
assert.ok(largeAnalysis.blockers.some(blocker=>blocker.includes('program complexity')&&blocker.includes('WebGPU limit')));
const serializedIrKeyLength=jsonLength([largeProgram.kind,largeProgram.irVersion,largeProgram.mathMode,largeProgram.outputs.map(output=>output.expression)]);
assert.ok(largeKey.length<serializedIrKeyLength/10,`canonical IR key must stay compact (${largeKey.length} versus ${serializedIrKeyLength} characters)`);
assert.equal(WGSLCompiler.key(programFor(largeFormula)),largeKey,'equivalent programs must share a canonical cache key');
assert.notEqual(WGSLCompiler.key(programFor(`${largeFormula.slice(0,-1)}g`)),largeKey,'different programs must not share a cache key');
assert.notEqual(WGSLCompiler.key(programFor(largeFormula,{legacyMath:true})),largeKey,'cache keys must include arithmetic mode');
let keyReads=0;const observedExpression={get op(){keyReads++;return'var'},get name(){keyReads++;return'r'}},observedProgram={kind:'filter-fab-program',irVersion:1,mathMode:'float',outputs:[{expression:observedExpression}]};
WGSLCompiler.key(observedProgram);const readsAfterFirstKey=keyReads;WGSLCompiler.key(observedProgram);assert.equal(keyReads,readsAfterFirstKey,'a program cache key must be computed only once per IR object');

const logicalChain=Array.from({length:20},(_,index)=>`x==${index}`).join('&&'),logicalProgram=programFor(logicalChain),logicalExpression=logicalProgram.outputs[0].expression;
class CountingWGSLCompiler extends WGSLCompiler{
  constructor(program){super(program);this.valueVisits=0}
  value(node,channel){this.valueVisits++;return super.value(node,channel)}
}
const countingCompiler=new CountingWGSLCompiler(logicalProgram);countingCompiler.value(logicalExpression,0);
assert.equal(countingCompiler.valueVisits,expressionNodeCount(logicalExpression),'logical/comparison WGSL lowering must visit each IR node once instead of regenerating operands exponentially');

const statelessCases = [
  ['rad(0,2,z)', 'ff_sample_polar('],
  ['cnv(0,0,0,0,1,0,0,0,0,1)', 'ff_convolve3x3(pixelX, pixelY, 0.0'],
  ['map(4,c)', 'ff_map(4.0,'],
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
  ['radius(cx,cy)', 'length(vec2<f32>(centeredX, centeredY))'],
  ['angle(cx,cy)', 'ff_atan2(centeredY, centeredX)'],
  ['repeat(-1,4)', 'ff_wrap((-1.0), 4.0)'],
  ['mirrorRepeat(5,4)', 'ff_mirror(5.0, 4.0)'],
  ['gradient3(nx,0,128,255)', 'ff_gradient3(normalizedX, 0.0, 128.0, 255.0)'],
  ['gradient4(ny,0,64,192,255)', 'ff_gradient4(normalizedY, 0.0, 64.0, 192.0, 255.0)'],
  ['angularGrad(x,y,X/2,Y/2,0)', 'ff_angular_grad('],
  ['checker(x,y,8,8)', 'ff_checker('],
  ['brick(x,y,16,8,1,0.5)', 'ff_brick('],
  ['line(x,y,0,0,X,Y,2,1)', 'ff_line('],
  ['circle(x,y,X/2,Y/2,20,1)', 'ff_circle('],
  ['ring(x,y,X/2,Y/2,20,3,1)', 'ff_ring('],
  ['box(x,y,X/2,Y/2,30,20,128,1)', 'ff_box('],
  ['triangle(x,y,0,Y,X/2,0,X,Y,1)', 'ff_triangle('],
  ['grid(x,y,16,12,2,1)', 'ff_grid('],
  ['sierpinski(x,y,X/2,Y/2,64,6,1)', 'ff_sierpinski(']
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

for(const [formula,blocker] of [['c&1','operator &'],['~c','operator ~'],['c,255','comma sequencing']]){
  const program=programFor(formula),analysis=WGSLCompiler.analyze(program);
  assert.equal('gpuCompatible' in program.metadata,false,'renderer-neutral IR metadata must not predict WebGPU support');
  assert.equal('gpuBlockers' in program.metadata,false,'renderer-neutral IR metadata must not contain WebGPU blockers');
  assert.equal(analysis.compatible,false,`${formula} must be rejected by the authoritative WGSL analyzer`);
  assert.ok(analysis.blockers.includes(blocker));
}

const powAnalysis = WGSLCompiler.analyze(programFor('pow(-2,2)'));
assert.equal(powAnalysis.compatible, false, 'pow() must use CPU fallback until negative-base semantics are defined in WGSL');
assert.ok(powAnalysis.blockers.includes('pow()'));

const exactSeedAnalysis=WGSLCompiler.analyze(programFor('hash2(x,y,16777217)*255'));
assert.equal(exactSeedAnalysis.compatible,false,'integer noise inputs that are not exactly representable as f32 must use CPU fallback');
assert.ok(exactSeedAnalysis.blockers.some(blocker=>blocker.includes('16777217')&&blocker.includes('not exactly representable as f32')));
assert.equal(WGSLCompiler.analyze(programFor('hash2(x,y,16777216)*255')).compatible,true,'adjacent exactly representable integer noise inputs must remain GPU-compatible');

const outOfRangeLiteral=`1${'0'.repeat(40)}`,outOfRangeAnalysis=WGSLCompiler.analyze(programFor(outOfRangeLiteral));
assert.equal(outOfRangeAnalysis.compatible,false,'finite JavaScript literals outside f32 range must be rejected before shader creation');
assert.ok(outOfRangeAnalysis.blockers.some(blocker=>blocker.includes('outside f32 range')));
assert.throws(()=>WGSLCompiler.compile(programFor(outOfRangeLiteral)),error=>error?.name==='WGSLCompileError'&&error.blockers.some(blocker=>blocker.includes('outside f32 range')));

const underflowLiteral=`0.${'0'.repeat(45)}1`,underflowAnalysis=WGSLCompiler.analyze(programFor(underflowLiteral));
assert.equal(underflowAnalysis.compatible,false,'nonzero literals that underflow f32 must be rejected before shader creation');
assert.ok(underflowAnalysis.blockers.some(blocker=>blocker.includes('underflows f32')));

const roundCode = WGSLCompiler.compile(programFor('round(0.5)*255')).code;
const roundMain = roundCode.slice(roundCode.lastIndexOf('outPixels[index]'));
assert.ok(roundMain.includes('ff_round(0.5)'), 'formula round() must use the JavaScript-compatible helper');
assert.ok(roundCode.includes('fn ff_round(v:f32)'), 'generated WGSL must define the compatible round helper');
assert.ok(roundCode.includes('fn ff_pack(v:vec4<f32>)->u32{let c=vec4<u32>(round('), 'pixel packing must retain ties-to-even clamping');

const angleCode = WGSLCompiler.compile(programFor('c2d(0,0)+d')).code;
assert.ok(angleCode.includes('fn ff_atan2(y:f32,x:f32)'), 'generated WGSL must guard signed-zero atan2 inputs');
assert.ok(angleCode.includes('ff_atan2(0.0, 0.0)'), 'c2d() must use the guarded atan2 helper');
assert.ok(angleCode.includes('let direction=ff_atan2(-dy,-dx)'), 'the direction variable must use the guarded atan2 helper');
assert.ok(angleCode.includes('ff_wrap(ff_atan2(y-cy,x-cx)/FF_TAU+offset,1.0)'), 'angular gradients must use the guarded atan2 helper');

const phase35aCode=WGSLCompiler.compile(programFor('ctl(9)+map(4,c)+nx+ny+cx+cy')).code;
assert.ok(phase35aCode.includes(`controls:array<f32,${WEBGPU_CONTROL_SLOT_COUNT}>`),'WebGPU parameters must reserve aligned headroom beyond the ten public controls');
assert.ok(phase35aCode.includes(`i>=${CONTROL_COUNT}`),'WGSL control lookup must enforce the public ten-control boundary');
assert.ok(phase35aCode.includes('i>=5'),'WGSL map() must expose all five control pairs');
assert.ok(phase35aCode.includes('let normalizedX=ff_normalized_coordinate(pixelX,widthF)'),'WGSL must derive normalized coordinates once per pixel');
assert.ok(phase35aCode.includes('let centeredY=normalizedY*2.0-1.0'),'WGSL must derive centered coordinates from normalized coordinates');

const mirrorCode = WGSLCompiler.compile(programFor('srcMirror(X,y,z)')).code;
assert.ok(mirrorCode.includes('min(u32(trunc(ff_mirror(x,f32(params.width)))),params.width-1u)'), 'mirrored x indices must clamp to the final column');
assert.ok(mirrorCode.includes('min(u32(trunc(ff_mirror(y,f32(params.height)))),params.height-1u)'), 'mirrored y indices must clamp to the final row');

const chromaProgram=compileFilterProgram([
  'scl(u,umin,umax,0,255)',
  'scl(v,vmin,vmax,0,255)',
  'U',
  'V'
].map(formula=>new Parser(formula).parse()));
const chromaCode=WGSLCompiler.compile(chromaProgram).code;
const chromaMain=chromaCode.slice(chromaCode.lastIndexOf('outPixels[index]'));
const chroma=CHROMA_MODELS.float;
assert.ok(chromaMain.includes(`ff_scl(chromaU, ${chroma.uMin}.0, ${chroma.uMax}.0, 0.0, 255.0)`),'WGSL U normalization must use the signed float bounds');
assert.ok(chromaMain.includes(`ff_scl(chromaV, ${chroma.vMin}.0, ${chroma.vMax}.0, 0.0, 255.0)`),'WGSL V normalization must use the signed float bounds');
assert.ok(chromaMain.includes(`${chroma.uSpan}.0,${chroma.vSpan}.0`),'WGSL U and V variables must expose the corrected spans');

const sierpinskiCode = WGSLCompiler.compile(programFor('sierpinski(x,y,X/2,Y/2,64,4,2)')).code;
assert.ok(sierpinskiCode.includes('let w=1.0-u-v'), 'Sierpiński subdivision must fold barycentric child coordinates');
assert.ok(sierpinskiCode.includes('holeDistance'), 'Sierpiński holes must compute edge distance for feathering');
assert.ok(sierpinskiCode.includes('ff_shape_mask(holeDistance,feather)'), 'internal hole feathering must match other analytic masks');
assert.doesNotMatch(sierpinskiCode,/bitU|bitV/,'Sierpiński subdivision must not use the incoherent bit-overlap test');

console.log(`WGSL compiler smoke: ${statelessCases.length} Phase 3.5 functions pass; stateful fallbacks preserved.`);
