import assert from 'node:assert/strict';
import fs from 'node:fs';
import { WebGpuRenderer } from '../src/renderers/webgpu-renderer.js';

const navigatorDescriptor=Object.getOwnPropertyDescriptor(globalThis,'navigator');
const usageDescriptor=Object.getOwnPropertyDescriptor(globalThis,'GPUBufferUsage');
const originalWarn=console.warn;
const devices=[];
const makeDevice=()=>{
  let resolveLost;
  const buffers=[];
  const device={
    lost:new Promise(resolve=>{resolveLost=resolve}),
    addEventListener(){},
    createBuffer(){const buffer={destroyed:false,mapState:'unmapped',destroy(){this.destroyed=true},unmap(){this.mapState='unmapped'}};buffers.push(buffer);return buffer},
    queue:{writeBuffer(){}},
    destroy(){this.destroyed=true}
  };
  return{device,buffers,resolveLost};
};

try{
  const first=makeDevice(),second=makeDevice();devices.push(first.device,second.device);
  Object.defineProperty(globalThis,'navigator',{configurable:true,value:{gpu:{requestAdapter:async()=>({requestDevice:async()=>devices.shift()})}}});
  Object.defineProperty(globalThis,'GPUBufferUsage',{configurable:true,value:{STORAGE:1,COPY_DST:2,COPY_SRC:4,MAP_READ:8}});
  console.warn=()=>{};

  const renderer=new WebGpuRenderer();
  await renderer.setSource(new Uint8ClampedArray([1,2,3,255]),1,1);
  const retainedSource=renderer.source,oldSourceBuffer=renderer.sourceBuffer;
  first.resolveLost({reason:'unknown',message:'test loss'});
  await new Promise(resolve=>setImmediate(resolve));
  assert.equal(renderer.device,null,'device loss must invalidate the current WebGPU device');
  assert.equal(renderer.source,retainedSource,'device loss must retain the CPU-side source needed for recovery');
  assert.equal(renderer.sourceBuffer,null,'device loss must discard invalid GPU buffers');
  assert.equal(oldSourceBuffer.destroyed,true,'device-loss cleanup must destroy old GPU allocations');

  assert.equal(await renderer.ensureSourceBuffers(),second.device,'the next render path must reacquire a device');
  assert.ok(renderer.sourceBuffer,'the retained source must be uploaded without a new image load');

  for(let index=0;index<40;index++)renderer.rememberPipeline({key:`plan-${index}`,code:'',analysis:{}},{id:index});
  assert.equal(renderer.pipelineCache.size,32,'WebGPU pipeline plans must use a bounded cache');
  assert.equal(renderer.pipelineCache.has('plan-0'),false,'the bounded pipeline cache must evict least-recently-used entries');
  assert.equal(renderer.pipelineCache.has('plan-39'),true);

  await renderer.releaseSource();
  assert.equal(renderer.source,null,'source release must drop the retained image');
  assert.equal(renderer.sourceBuffer,null,'source release must destroy GPU image buffers');
  assert.equal(renderer.pipelineCache.size,32,'source release may retain bounded formula pipelines for reuse');
  renderer.dispose();

  const source=fs.readFileSync('src/renderers/webgpu-renderer.js','utf8');
  assert.doesNotMatch(source,/onSubmittedWorkDone|chunkRows/,'full-frame WebGPU work must not be serialized by per-tile queue waits');
  assert.equal((source.match(/dispatchWorkgroups/g)||[]).length,1,'WebGPU rendering must issue one full-frame compute dispatch');
}finally{
  console.warn=originalWarn;
  if(navigatorDescriptor)Object.defineProperty(globalThis,'navigator',navigatorDescriptor);else delete globalThis.navigator;
  if(usageDescriptor)Object.defineProperty(globalThis,'GPUBufferUsage',usageDescriptor);else delete globalThis.GPUBufferUsage;
}

console.log('WebGPU renderer recovery/cache smoke: pass.');
