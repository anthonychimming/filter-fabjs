import assert from 'node:assert/strict';
import { Parser } from '../src/core/formula-language.js';
import { compileFilterProgram } from '../src/core/ir.js';
import { WGSLCompiler } from '../src/gpu/wgsl-compiler.js';
import { WebGpuRenderer } from '../src/renderers/webgpu-renderer.js';

const navigatorDescriptor=Object.getOwnPropertyDescriptor(globalThis,'navigator');
const usageDescriptor=Object.getOwnPropertyDescriptor(globalThis,'GPUBufferUsage');
const mapModeDescriptor=Object.getOwnPropertyDescriptor(globalThis,'GPUMapMode');
const originalWarn=console.warn;

function makeDevice(){
  let resolveLost;
  const stats={buffers:[],dispatches:0,copies:0,submits:0,queueWaits:0};
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
      const buffer={destroyed:false,mapState:'unmapped',destroy(){this.destroyed=true},async mapAsync(){this.mapState='mapped'},getMappedRange(){return data},unmap(){this.mapState='unmapped'}};
      stats.buffers.push(buffer);return buffer;
    },
    createCommandEncoder(){return{beginComputePass(){return{setPipeline(){},setBindGroup(){},dispatchWorkgroups(){stats.dispatches++},end(){}}},copyBufferToBuffer(){stats.copies++},finish(){return{}}}},
    queue:{writeBuffer(){},submit(){stats.submits++},async onSubmittedWorkDone(){stats.queueWaits++}},
    destroy(){this.destroyed=true}
  };
  return{device,stats,resolveLost};
}

try{
  const first=makeDevice(),second=makeDevice(),devices=[first.device,second.device];
  Object.defineProperty(globalThis,'navigator',{configurable:true,value:{gpu:{requestAdapter:async()=>({requestDevice:async()=>devices.shift()})}}});
  Object.defineProperty(globalThis,'GPUBufferUsage',{configurable:true,value:{STORAGE:1,COPY_DST:2,COPY_SRC:4,MAP_READ:8}});
  Object.defineProperty(globalThis,'GPUMapMode',{configurable:true,value:{READ:1}});
  console.warn=()=>{};

  const renderer=new WebGpuRenderer();
  await renderer.setSource(new Uint8ClampedArray([1,2,3,255]),1,1);
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
}finally{
  console.warn=originalWarn;
  if(navigatorDescriptor)Object.defineProperty(globalThis,'navigator',navigatorDescriptor);else delete globalThis.navigator;
  if(usageDescriptor)Object.defineProperty(globalThis,'GPUBufferUsage',usageDescriptor);else delete globalThis.GPUBufferUsage;
  if(mapModeDescriptor)Object.defineProperty(globalThis,'GPUMapMode',mapModeDescriptor);else delete globalThis.GPUMapMode;
}

console.log('WebGPU renderer recovery and dispatch smoke: pass.');
