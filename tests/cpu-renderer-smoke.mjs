import assert from 'node:assert/strict';
import { Worker } from 'node:worker_threads';
import { CHROMA_MODELS } from '../src/core/chroma.js';
import { Parser, VARS } from '../src/core/formula-language.js';
import { compileFilterProgram } from '../src/core/ir.js';
import { presets } from '../src/presets/builtins.js';
import { assertCpuRenderBudget, CpuRenderer, estimateCpuProgramCost, MAX_CPU_RENDER_WORK } from '../src/renderers/cpu-renderer.js';
import { workerProgram } from '../src/renderers/cpu-worker-source.js';

const wrapper = `
const { parentPort } = require('node:worker_threads');
globalThis.postMessage = message => parentPort.postMessage(message);
parentPort.on('message', data => globalThis.onmessage({ data }));
${workerProgram()}
`;
const worker = new Worker(wrapper, { eval: true });
const waitFor = predicate => new Promise((resolve, reject) => {
  const timeout = setTimeout(() => reject(new Error('Worker smoke test timed out')), 5000);
  const onMessage = message => {
    if (!predicate(message)) return;
    clearTimeout(timeout);
    worker.off('message', onMessage);
    resolve(message);
  };
  worker.on('message', onMessage);
});

const source = new Uint8ClampedArray([10,20,30,255, 100,110,120,128, 0,0,255,255, 255,0,0,255]);
worker.postMessage({ type: 'init', width: 4, height: 1, buffer: source.buffer }, [source.buffer]);
await waitFor(message => message.type === 'ready');

let renderId = 0;
const render = async (formulas,{legacyMath=false,controls=Array(8).fill(128)}={}) => {
  const id = ++renderId;
  const program = compileFilterProgram(formulas.map(formula => new Parser(formula).parse()),{legacyMath});
  worker.postMessage({ type: 'render', id, program, controls, legacyMath });
  const message = await waitFor(result => result.type === 'result' && result.id === id);
  return new Uint8ClampedArray(message.buffer);
};

const renderProgram = async (program,programKey,includeProgram=true) => {
  const id=++renderId,message={type:'render',id,programKey,controls:Array(8).fill(128)};
  if(includeProgram)message.program=program;
  worker.postMessage(message);
  const result=await waitFor(candidate=>candidate.type==='result'&&candidate.id===id);
  return new Uint8ClampedArray(result.buffer);
};

const result = await render(['255-r','255-g','255-b','a']);
assert.deepEqual([...new Uint8ClampedArray(result.buffer)], [245,235,225,255, 155,145,135,128, 255,255,0,255, 0,255,255,255]);

const numericEdges = await render(['round(0.5)*255','pow(-2,2)','c2d(0,0)','a']);
assert.deepEqual([...numericEdges], [255,4,0,255, 255,4,0,128, 255,4,0,255, 255,4,0,255], 'CPU fallback semantics must remain defined at GPU edge cases');

const nativeSquare=await render(['sqr(4)','sqr(4)','sqr(4)','a']);
assert.deepEqual([...nativeSquare.slice(0,4)],[16,16,16,255],'native float sqr() must retain its documented square operation');
const legacyRoots=await render(['sqr(16)','sqr(0)','sqr(-4)+5','sqrt(81)'],{legacyMath:true});
assert.deepEqual([...legacyRoots.slice(0,4)],[4,0,1,9],'legacy sqr()/sqrt() must use Filter Factory integer square-root semantics, including negative inputs');
const legacyArithmetic=await render(['val(0,1,0)','mix(1,1,1,2)','scl(1,0,2,1,0)','2147483647+1<0?255:0'],{legacyMath:true});
assert.deepEqual([...legacyArithmetic.slice(0,4)],[1,0,1,255],'legacy helpers and expression arithmetic must truncate at integer boundaries and wrap signed 32-bit results');
const legacyMap=await render(['map(0,128)','map(0,128)','map(0,128)','a'],{legacyMath:true,controls:[255.9,0.9,...Array(6).fill(128)]});
assert.deepEqual([...legacyMap.slice(0,3)],[128,128,128],'legacy map() must use integer control values and integer division');
const legacyMultiplyAndPow=await render(['1073741824*2<0?255:0','pow(2,-1)','pow(5,0)','a'],{legacyMath:true});
assert.deepEqual([...legacyMultiplyAndPow.slice(0,4)],[255,1,1,255],'legacy multiplication must use signed 32-bit products and pow() must use legacy rounding');

const nativeRandom=await render(Array(4).fill('rnd(0,255)'));
assert.deepEqual([...nativeRandom.slice(0,4)],[29,21,234,135],'native float random generation must retain its existing sequence');
const legacyRandom=await render(Array(4).fill('rnd(0,255)'),{legacyMath:true});
assert.deepEqual([...legacyRandom],[10,35,106,115,158,111,120,91,134,88,37,145,64,117,125,164],'legacy rnd() must match Filter Factory’s subtractive generator sequence');
const legacyReset=await render(Array(4).fill('rst(1),rnd(0,255)'),{legacyMath:true});
assert.deepEqual([...legacyReset],Array(16).fill(148),'legacy rst() must rebuild the Filter Factory generator before the next rnd() call');

const exactNoiseSeed=await render(Array(3).fill('hash2(x,y,16777217)*255').concat('a'));
assert.equal(exactNoiseSeed[0],253,'CPU fallback must preserve exact integer noise seeds that f32 cannot represent');

const mirroredEdge = await render(['srcMirror(X,y,0)','srcMirror(X,y,1)','srcMirror(X,y,2)','srcMirror(X,y,3)']);
assert.deepEqual([...mirroredEdge], Array(4).fill([255,0,0,255]).flat(), 'CPU mirror sampling at X must select the final source column');

const {float:floatChroma,legacy:legacyChroma}=CHROMA_MODELS;
const floatBounds=await render(['umin+128','umax','vmin+128','vmax']);
assert.deepEqual([...floatBounds.slice(0,4)],[floatChroma.uMin+128,floatChroma.uMax,floatChroma.vMin+128,floatChroma.vMax],'float chroma minima and maxima must form signed bounds');
const floatSpans=await render(['U','V','scl(u,umin,umax,0,255)','scl(v,vmin,vmax,0,255)']);
assert.deepEqual([...floatSpans.slice(8,10)],[floatChroma.uSpan,floatChroma.vSpan],'float U and V must equal their signed chroma spans');
assert.equal(floatSpans[10],255,'pure blue must map to the top of the float U range');
assert.equal(floatSpans[15],255,'pure red must map to the top of the float V range');
const legacyBounds=await render(['umin','umax','vmin','vmax'],{legacyMath:true});
assert.deepEqual([...legacyBounds.slice(0,4)],[legacyChroma.uMin,legacyChroma.uMax,legacyChroma.vMin,legacyChroma.vMax],'legacy math must retain the complete Filter Factory chroma-bound contract');
const legacySpans=await render(['U','V','U','V'],{legacyMath:true});
assert.deepEqual([...legacySpans.slice(0,4)],[legacyChroma.uSpan,legacyChroma.vSpan,legacyChroma.uSpan,legacyChroma.vSpan]);

const cachedProgram=compileFilterProgram(['r','g','b','a'].map(formula=>new Parser(formula).parse()));
assert.equal(estimateCpuProgramCost(cachedProgram),4,'CPU work estimation must aggregate all four output expressions');
assert.equal(assertCpuRenderBudget(cachedProgram,1800,1800),12_960_000,'ordinary full-size renders must remain within the CPU work budget');
const maximalFormula=Array(2048).fill('r').join('+'),maximalProgram=compileFilterProgram(Array(4).fill(maximalFormula).map(formula=>new Parser(formula).parse()));
assert.ok(estimateCpuProgramCost(maximalProgram)>MAX_CPU_RENDER_WORK/(1800*1800));
assert.throws(()=>assertCpuRenderBudget(maximalProgram,1800,1800),error=>error?.name==='RenderBudgetError','maximal imported programs must be rejected before full-size CPU dispatch');
assert.doesNotThrow(()=>assertCpuRenderBudget(maximalProgram,64,64),'the CPU budget must remain image-scaled for small previews');
for(const preset of presets){const program=compileFilterProgram(preset.f.map(formula=>new Parser(formula).parse()));assert.doesNotThrow(()=>assertCpuRenderBudget(program,1800,1800),`built-in ${preset.id} must remain CPU-renderable at the maximum image size`)}
const firstCachedResult=await renderProgram(cachedProgram,'identity-program');
const reusedCachedResult=await renderProgram(null,'identity-program',false);
assert.deepEqual([...reusedCachedResult],[...firstCachedResult],'the worker must reuse a previously validated IR program when only its cache key is sent');

const sourceText = workerProgram();
assert.doesNotMatch(sourceText, /const q=\{/, 'variable lookup must not allocate a complete variable object per access');
assert.match(sourceText, /function vars\(n,e\)\{const p=e\.p,z=e\.z;switch\(n\)/, 'variable lookup must dispatch lazily');
assert.match(sourceText,/legacyMath=program\.mathMode==='legacy'/,'CPU arithmetic and chroma bounds must use the IR program math mode as their shared authority');
assert.doesNotMatch(sourceText,/n\.args\.map/,'CPU call evaluation must not allocate an argument array per call and pixel');
assert.match(sourceText,/const pixel=\[0,0,0,0\],environment=\{x:0,y:0,z:0,p:pixel\}/,'CPU rendering must reuse its pixel and environment records');
const variableBody = sourceText.match(/function vars\(n,e\)\{([\s\S]*?)\n\}return 0\}/)?.[1] || '';
const handledVariables = new Set([...variableBody.matchAll(/case'([^']+)'/g)].map(match => match[1]));
for (const name of VARS) assert.ok(handledVariables.has(name), `lazy CPU lookup must preserve variable ${name}`);
await worker.terminate();

const workerDescriptor=Object.getOwnPropertyDescriptor(globalThis,'Worker');
const createObjectUrlDescriptor=Object.getOwnPropertyDescriptor(URL,'createObjectURL');
const revokeObjectUrlDescriptor=Object.getOwnPropertyDescriptor(URL,'revokeObjectURL');
const fakeWorkers=[];
class FakeWorker{
  constructor(){this.messages=[];this.terminated=false;fakeWorkers.push(this)}
  postMessage(message){this.messages.push(message);if(message.type==='init')queueMicrotask(()=>this.onmessage?.({data:{type:'ready'}}))}
  terminate(){this.terminated=true}
  finish(id,pixels=[1,2,3,255]){const buffer=new Uint8ClampedArray(pixels).buffer;this.onmessage?.({data:{type:'result',id,buffer,ms:1}})}
  fail(message='Worker startup failed'){this.onerror?.({message})}
  failMessage(message='Worker message failed'){this.onmessageerror?.({message})}
}
Object.defineProperty(globalThis,'Worker',{configurable:true,value:FakeWorker});
Object.defineProperty(URL,'createObjectURL',{configurable:true,value:()=> 'blob:cpu-worker-test'});
Object.defineProperty(URL,'revokeObjectURL',{configurable:true,value:()=>{}});

try{
  const lifecycleRenderer=new CpuRenderer(()=> '');
  const programA=compileFilterProgram(['r','g','b','a'].map(formula=>new Parser(formula).parse()));
  const programB=compileFilterProgram(['255-r','g','b','a'].map(formula=>new Parser(formula).parse()));
  const lifecycleSource=new Uint8ClampedArray([1,2,3,255]);await lifecycleRenderer.setSource(lifecycleSource,1,1);
  assert.equal(lifecycleRenderer.source,lifecycleSource,'the CPU renderer must share the immutable main-thread source buffer');
  assert.equal(fakeWorkers.length,1);

  const firstRender=lifecycleRenderer.render({id:1,program:programA,controls:Array(8).fill(128)});await new Promise(resolve=>setImmediate(resolve));
  const firstRenderMessage=fakeWorkers[0].messages.at(-1);assert.equal(firstRenderMessage.type,'render');assert.equal(firstRenderMessage.program,programA,'the first render on a worker must send its IR program');fakeWorkers[0].finish(1);await firstRender;
  const repeatedRender=lifecycleRenderer.render({id:2,program:programA,controls:Array(8).fill(64)});await new Promise(resolve=>setImmediate(resolve));
  const repeatedRenderMessage=fakeWorkers[0].messages.at(-1);assert.equal(repeatedRenderMessage.type,'render');assert.equal('program' in repeatedRenderMessage,false,'control-only renders must not structured-clone unchanged IR');fakeWorkers[0].finish(2);await repeatedRender;
  const changedRender=lifecycleRenderer.render({id:3,program:programB,controls:Array(8).fill(64)});await new Promise(resolve=>setImmediate(resolve));
  assert.equal(fakeWorkers[0].messages.at(-1).program,programB,'a changed formula program must be sent to the worker');fakeWorkers[0].finish(3);await changedRender;

  const pendingRender=lifecycleRenderer.render({id:4,program:programB,controls:Array(8).fill(32)});await new Promise(resolve=>setImmediate(resolve));
  const pendingCancellation=assert.rejects(pendingRender,error=>error?.name==='RenderCancelledError');assert.equal(await lifecycleRenderer.cancel(),true);await pendingCancellation;
  assert.equal(fakeWorkers.length,1,'cancellation must not eagerly create a replacement worker');
  assert.equal(fakeWorkers[0].terminated,true);

  const resumedRender=lifecycleRenderer.render({id:5,program:programB,controls:Array(8).fill(16)});await new Promise(resolve=>setImmediate(resolve));
  assert.equal(fakeWorkers.length,2,'the next render must lazily replace the cancelled worker');
  assert.equal(fakeWorkers[1].messages[0].type,'init','a replacement worker must receive the retained source before rendering');
  assert.equal(fakeWorkers[1].messages.at(-1).program,programB,'a replacement worker must receive the full current IR program');fakeWorkers[1].finish(5);await resumedRender;
  lifecycleRenderer.releaseSource();

  const startupRecoveryRenderer=new CpuRenderer(()=> ''),startupSource=new Uint8ClampedArray([4,5,6,255]),startupWorkerCount=fakeWorkers.length;
  const startupReady=startupRecoveryRenderer.setSource(startupSource,1,1),startupFailure=assert.rejects(startupReady,/Worker startup failed/),failedStartupWorker=fakeWorkers.at(-1);
  failedStartupWorker.fail();await startupFailure;
  assert.equal(failedStartupWorker.terminated,true,'a startup error must terminate the failed CPU Worker');
  assert.equal(startupRecoveryRenderer.worker,null,'a startup error must clear the failed Worker instance');
  assert.equal(startupRecoveryRenderer.workerProgramKey,null,'a startup error must clear the failed Worker program cache');
  await startupRecoveryRenderer.readyPromise;
  const recoveredStartupRender=startupRecoveryRenderer.render({id:6,program:programA,controls:Array(8).fill(128)});await new Promise(resolve=>setImmediate(resolve));
  assert.equal(fakeWorkers.length,startupWorkerCount+2,'the next render must lazily replace a Worker that failed during startup');
  const startupReplacement=fakeWorkers.at(-1);assert.equal(startupReplacement.messages[0].type,'init');assert.equal(startupReplacement.messages.at(-1).program,programA);startupReplacement.finish(6);await recoveredStartupRender;
  startupRecoveryRenderer.releaseSource();

  const messageRecoveryRenderer=new CpuRenderer(()=> ''),messageSource=new Uint8ClampedArray([7,8,9,255]);await messageRecoveryRenderer.setSource(messageSource,1,1);
  const failedMessageWorker=fakeWorkers.at(-1),failedMessageRender=messageRecoveryRenderer.render({id:7,program:programA,controls:Array(8).fill(128)});await new Promise(resolve=>setImmediate(resolve));
  const messageFailure=assert.rejects(failedMessageRender,/Worker message failed/);failedMessageWorker.failMessage();await messageFailure;
  assert.equal(failedMessageWorker.terminated,true,'a message error must terminate the failed CPU Worker');
  assert.equal(messageRecoveryRenderer.worker,null,'a message error must clear the failed Worker instance');
  assert.equal(messageRecoveryRenderer.workerProgramKey,null,'a message error must clear the failed Worker program cache');
  const recoveredMessageRender=messageRecoveryRenderer.render({id:8,program:programA,controls:Array(8).fill(128)});await new Promise(resolve=>setImmediate(resolve));
  const messageReplacement=fakeWorkers.at(-1);assert.notEqual(messageReplacement,failedMessageWorker,'the next render must replace a Worker that raised a message error');assert.equal(messageReplacement.messages[0].type,'init');messageReplacement.finish(8);await recoveredMessageRender;
  messageRecoveryRenderer.releaseSource();
}finally{
  if(workerDescriptor)Object.defineProperty(globalThis,'Worker',workerDescriptor);else delete globalThis.Worker;
  if(createObjectUrlDescriptor)Object.defineProperty(URL,'createObjectURL',createObjectUrlDescriptor);else delete URL.createObjectURL;
  if(revokeObjectUrlDescriptor)Object.defineProperty(URL,'revokeObjectURL',revokeObjectUrlDescriptor);else delete URL.revokeObjectURL;
}

const renderer=new CpuRenderer(()=> '');
let terminated=false,pendingError=null,readyError=null;
renderer.source=new Uint8ClampedArray([1,2,3,255]);renderer.width=renderer.height=1;
renderer.worker={terminate(){terminated=true}};
renderer.pending.set(1,{reject:error=>{pendingError=error}});
renderer.rejectReady=error=>{readyError=error};
renderer.releaseSource();
assert.equal(terminated,true,'CPU source release must terminate the image-owning worker');
assert.equal(renderer.source,null,'CPU source release must drop the retained image copy');
assert.equal(renderer.worker,null);
assert.equal(renderer.pending.size,0);
assert.equal(pendingError?.name,'RenderCancelledError');
assert.equal(readyError?.name,'RenderCancelledError');
console.log('CPU renderer smoke: pass.');
