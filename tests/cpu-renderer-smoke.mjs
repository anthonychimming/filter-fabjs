import assert from 'node:assert/strict';
import { Worker } from 'node:worker_threads';
import { CHROMA_MODELS } from '../src/core/chroma.js';
import { Parser, VARS } from '../src/core/formula-language.js';
import { compileFilterProgram } from '../src/core/ir.js';
import { CpuRenderer } from '../src/renderers/cpu-renderer.js';
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
const render = async (formulas,{legacyMath=false}={}) => {
  const id = ++renderId;
  const program = compileFilterProgram(formulas.map(formula => new Parser(formula).parse()),{legacyMath});
  worker.postMessage({ type: 'render', id, program, controls: Array(8).fill(128), legacyMath });
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
