import assert from 'node:assert/strict';
import { Parser } from '../src/core/formula-language.js';
import { compileFilterProgram } from '../src/core/ir.js';
import { WGSLCompiler } from '../src/gpu/wgsl-compiler.js';
import { WebGpuRenderer } from '../src/renderers/webgpu-renderer.js';

const navigatorDescriptor=Object.getOwnPropertyDescriptor(globalThis,'navigator');
const usageDescriptor=Object.getOwnPropertyDescriptor(globalThis,'GPUBufferUsage');
const mapModeDescriptor=Object.getOwnPropertyDescriptor(globalThis,'GPUMapMode');
const originalWarn=console.warn;

function makeDevice({deferredMaps=0}={}){
  let resolveLost;
  const mapRequests=[],stats={buffers:[],writes:[],dispatches:0,copies:0,submits:0,queueWaits:0};
  const device={
    lost:new Promise(resolve=>{resolveLost=resolve}),
    addEventListener(){},
    pushErrorScope(){},
    async popErrorScope(){return null},
    createShaderModule(){return{async getCompilationInfo(){return{messages:[]}}}},
    async createComputePipelineAsync(){return{getBindGroupLayout(){return{}}}},
    createBindGroup(){return{}},
    createBuffer(){
      const data=new Uint32Array([0xff030201]).buffer;
      const pending=[];
      const buffer={destroyed:false,mapState:'unmapped',destroy(){this.destroyed=true;for(const request of pending.splice(0))request.reject(new Error('Buffer was destroyed'))},async mapAsync(){if(this.destroyed)throw new Error('Buffer was destroyed');if(deferredMaps>0){deferredMaps--;await new Promise((resolve,reject)=>{const request={resolve,reject};pending.push(request);mapRequests.push(request)})}if(this.destroyed)throw new Error('Buffer was destroyed');this.mapState='mapped'},getMappedRange(){return data},unmap(){this.mapState='unmapped'}};
      stats.buffers.push(buffer);return buffer;
    },
    createCommandEncoder(){return{beginComputePass(){return{setPipeline(){},setBindGroup(){},dispatchWorkgroups(){stats.dispatches++},end(){}}},copyBufferToBuffer(){stats.copies++},finish(){return{}}}},
    queue:{writeBuffer(buffer,offset,data){stats.writes.push({buffer,offset,data,bytes:[...new Uint8Array(data.buffer,data.byteOffset,data.byteLength)]})},submit(){stats.submits++},async onSubmittedWorkDone(){stats.queueWaits++}},
    destroy(){this.destroyed=true;for(const buffer of stats.buffers)buffer.destroy()}
  };
  return{device,stats,resolveLost,resolveNextMap(){const request=mapRequests.shift();if(!request)throw new Error('No deferred WebGPU map is pending');request.resolve()}};
}

try{
  const first=makeDevice(),second=makeDevice(),devices=[first.device,second.device];
  Object.defineProperty(globalThis,'navigator',{configurable:true,value:{gpu:{requestAdapter:async()=>({requestDevice:async()=>devices.shift()})}}});
  Object.defineProperty(globalThis,'GPUBufferUsage',{configurable:true,value:{STORAGE:1,COPY_DST:2,COPY_SRC:4,MAP_READ:8}});
  Object.defineProperty(globalThis,'GPUMapMode',{configurable:true,value:{READ:1}});
  console.warn=()=>{};

  const renderer=new WebGpuRenderer();
  await renderer.setSource(new Uint8ClampedArray([1,2,3,255]),1,1);
  assert.ok(first.stats.writes[0].data instanceof Uint8ClampedArray,'source upload must write the existing RGBA byte view without repacking it');
  assert.deepEqual(first.stats.writes[0].bytes,[1,2,3,255]);
  const retainedSource=renderer.source,oldSourceBuffer=renderer.sourceBuffer;
  first.resolveLost({reason:'unknown',message:'test device loss'});
  await new Promise(resolve=>setImmediate(resolve));

  assert.equal(renderer.device,null,'device loss must invalidate the current device');
  assert.equal(renderer.source,retainedSource,'device loss must retain the CPU-side source for recovery');
  assert.equal(renderer.sourceBuffer,null,'device loss must discard invalid GPU buffers');
  assert.equal(oldSourceBuffer.destroyed,true,'device-loss cleanup must destroy old GPU allocations');

  assert.equal(await renderer.ensureSourceBuffers(),second.device,'the next render must reacquire a WebGPU device');
  assert.ok(renderer.sourceBuffer,'the retained source must be uploaded without another image load');
  assert.equal(renderer.deviceGeneration,2,'device generations must advance after recovery');

  const program=compileFilterProgram(['r','g','b','a'].map(formula=>new Parser(formula).parse()));
  const progress=[];
  const result=await renderer.render({program,controls:Array(8).fill(128),onProgress:message=>progress.push(message)});
  assert.deepEqual([...result.pixels],[1,2,3,255]);
  assert.equal(second.stats.dispatches,1,'a GPU render must use one full-frame compute dispatch');
  assert.equal(second.stats.copies,1,'readback must be encoded in the same command submission');
  assert.equal(second.stats.submits,1,'compute and readback must use one queue submission');
  assert.equal(second.stats.queueWaits,0,'rendering must not serialize tiles with queue completion waits');
  assert.deepEqual(progress,[{row:1,total:1,pct:100}]);

  assert.equal(renderer.pipelineCache.size,1,'the first formula render must cache its WGSL plan and pipeline');
  const cachedEntry=renderer.pipelineCache.values().next().value;
  assert.ok(cachedEntry.plan?.code&&cachedEntry.pipeline,'pipeline cache entries must retain both the generated plan and pipeline');
  const originalCompile=WGSLCompiler.compile;
  WGSLCompiler.compile=()=>{throw new Error('cached control render unexpectedly regenerated WGSL')};
  try{await renderer.render({program,controls:Array(8).fill(64)})}finally{WGSLCompiler.compile=originalCompile}
  assert.equal(second.stats.dispatches,2,'a control-only render must reuse the cached formula pipeline and still dispatch');

  for(let index=0;index<40;index++)renderer.rememberPipeline({key:`plan-${index}`,code:'',analysis:{}},{id:index});
  assert.equal(renderer.pipelineCache.size,32,'WebGPU plans and pipelines must use a bounded cache');
  assert.equal(renderer.pipelineCache.has('plan-0'),false,'the bounded cache must evict least-recently-used entries');
  assert.equal(renderer.pipelineCache.has('plan-39'),true);

  const releasedSourceBuffer=renderer.sourceBuffer;
  await renderer.releaseSource();
  assert.equal(renderer.source,null,'source release must drop the retained image copy');
  assert.equal(renderer.sourceBuffer,null,'source release must clear GPU image buffers');
  assert.equal(releasedSourceBuffer.destroyed,true,'source release must destroy the prior GPU allocation');
  assert.equal(renderer.pipelineCache.size,32,'source release may retain only the bounded formula cache for reuse');
  renderer.dispose();

  const byteBoundRenderer=new WebGpuRenderer(),largeCode='x'.repeat(3*1024*1024);
  byteBoundRenderer.rememberPipeline({key:'large-plan-1',code:largeCode,analysis:{}},{id:1});
  byteBoundRenderer.rememberPipeline({key:'large-plan-2',code:largeCode,analysis:{}},{id:2});
  assert.equal(byteBoundRenderer.pipelineCache.size,1,'pipeline cache payload must be byte-bounded as well as entry-bounded');
  assert.equal(byteBoundRenderer.pipelineCache.has('large-plan-2'),true,'pipeline byte eviction must retain the most recent entry');
  assert.ok(byteBoundRenderer.pipelineCacheBytes<=8*1024*1024,'pipeline cache must remain within its byte budget');
  byteBoundRenderer.dispose();

  const cancellationDevice=makeDevice({deferredMaps:1}),recoveryDevice=makeDevice(),cancellationDevices=[cancellationDevice.device,recoveryDevice.device];
  navigator.gpu.requestAdapter=async()=>({requestDevice:async()=>cancellationDevices.shift()});
  const cancellationRenderer=new WebGpuRenderer();await cancellationRenderer.setSource(new Uint8ClampedArray([1,2,3,255]),1,1);
  const activeRender=cancellationRenderer.render({program,controls:Array(8).fill(128)});while(cancellationDevice.stats.dispatches<1)await new Promise(resolve=>setImmediate(resolve));
  const queuedRender=cancellationRenderer.render({program,controls:Array(8).fill(64)}),activeCancellation=assert.rejects(activeRender,error=>error?.name==='RenderCancelledError'),queuedCancellation=assert.rejects(queuedRender,error=>error?.name==='RenderCancelledError');
  assert.equal(await cancellationRenderer.cancel(),true,'cancelling an active WebGPU render must report work');await Promise.all([activeCancellation,queuedCancellation]);
  assert.equal(cancellationDevice.device.destroyed,true,'active cancellation must destroy the submitted device so pending readback stops');
  assert.equal(cancellationDevice.stats.dispatches,1,'a render queued before cancellation must not dispatch after the active render stops');
  await cancellationRenderer.render({program,controls:Array(8).fill(32)});assert.equal(recoveryDevice.stats.dispatches,1,'a render queued after cancellation must reacquire a device and restore the retained source');

  let releaseQueue;const buffersBeforeSourceChange=recoveryDevice.stats.buffers.length;cancellationRenderer.operationQueue=new Promise(resolve=>{releaseQueue=resolve});
  const staleSource=cancellationRenderer.setSource(new Uint8ClampedArray([4,5,6,255]),1,1),staleSourceCancellation=assert.rejects(staleSource,error=>error?.name==='RenderCancelledError');
  const latestSource=cancellationRenderer.setSource(new Uint8ClampedArray([7,8,9,255]),1,1);releaseQueue();await Promise.all([staleSourceCancellation,latestSource]);
  assert.equal(cancellationRenderer.source[0],7,'only the latest queued WebGPU source upload may become current');
  assert.equal(recoveryDevice.stats.buffers.length-buffersBeforeSourceChange,4,'a stale queued source upload must stop before allocating GPU buffers');
  cancellationRenderer.dispose();
}finally{
  console.warn=originalWarn;
  if(navigatorDescriptor)Object.defineProperty(globalThis,'navigator',navigatorDescriptor);else delete globalThis.navigator;
  if(usageDescriptor)Object.defineProperty(globalThis,'GPUBufferUsage',usageDescriptor);else delete globalThis.GPUBufferUsage;
  if(mapModeDescriptor)Object.defineProperty(globalThis,'GPUMapMode',mapModeDescriptor);else delete globalThis.GPUMapMode;
}

console.log('WebGPU renderer recovery and dispatch smoke: pass.');
