import assert from 'node:assert/strict';
import { Parser } from '../src/core/formula-language.js';
import { compileFilterProgram } from '../src/core/ir.js';
import { RenderCancelledError } from '../src/renderers/renderer-backend.js';
import { RendererManager } from '../src/renderers/renderer-manager.js';

class DeferredRenderer {
  constructor() {
    this.calls = [];
    this.pending = [];
  }

  setSource(pixels, width, height) {
    this.calls.push({ first: pixels[0], width, height });
    return new Promise(resolve => this.pending.push(resolve));
  }

  cancel() { return false; }
  dispose() {}
}

const renderer = new DeferredRenderer();
const manager = new RendererManager({ cpu: () => renderer });

await manager.setSource(new Uint8ClampedArray([1, 0, 0, 255]), 1, 1);
const firstGet = manager.get('cpu');
await Promise.resolve();
assert.deepEqual(renderer.calls, [{ first: 1, width: 1, height: 1 }]);

await manager.setSource(new Uint8ClampedArray([2, 0, 0, 255]), 1, 1);
const secondGet = manager.get('cpu');
assert.equal(renderer.calls.length, 1, 'concurrent get() calls must share one source synchronization');

renderer.pending.shift()();
while (renderer.calls.length < 2) await Promise.resolve();
assert.deepEqual(renderer.calls[1], { first: 2, width: 1, height: 1 }, 'source changes during upload must trigger the latest upload');
renderer.pending.shift()();

assert.equal(await firstGet, renderer);
assert.equal(await secondGet, renderer);
assert.equal(manager.instanceVersions.get('cpu'), 2, 'only the uploaded source generation may be recorded');
manager.dispose();

class ReleasingDeferredRenderer extends DeferredRenderer {
  setSource(pixels,width,height){this.calls.push({first:pixels[0],width,height});return new Promise((resolve,reject)=>this.pending.push({resolve,reject}))}
  releaseSource(){for(const job of this.pending.splice(0))job.reject(new RenderCancelledError('old source released'))}
}
const releasingRenderer=new ReleasingDeferredRenderer(),raceManager=new RendererManager({cpu:()=>releasingRenderer});
await raceManager.setSource(new Uint8ClampedArray([3,0,0,255]),1,1);
const staleGet=raceManager.get('cpu');await Promise.resolve();
await raceManager.setSource(new Uint8ClampedArray([4,0,0,255]),1,1);
const latestGet=raceManager.get('cpu');
for(let attempt=0;attempt<100&&releasingRenderer.calls.length<2;attempt++)await Promise.resolve();
assert.deepEqual(releasingRenderer.calls[1],{first:4,width:1,height:1},'a superseded source rejection must retry the latest synchronization');
releasingRenderer.pending.shift().resolve();
assert.equal(await staleGet,releasingRenderer);
assert.equal(await latestGet,releasingRenderer);
raceManager.dispose();

const navigatorDescriptor=Object.getOwnPropertyDescriptor(globalThis,'navigator');
Object.defineProperty(globalThis,'navigator',{configurable:true,value:{gpu:{}}});
const originalConsoleError=console.error;console.error=()=>{};
try{
  const program=compileFilterProgram(['r','g','b','a'].map(formula=>new Parser(formula).parse()));
  class FakeRenderer {
    constructor(id,{render}={}){this.id=id;this.label=id==='webgpu'?'WebGPU':'CPU Worker';this.renderImpl=render;this.renderCalls=0;this.releaseCalls=0}
    async setSource(pixels,width,height){this.source=new Uint8ClampedArray(pixels);this.width=width;this.height=height}
    async render(args){this.renderCalls++;return this.renderImpl?.(args)??{pixels:this.source.slice(),ms:1,backend:this.id,label:this.label}}
    releaseSource(){this.releaseCalls++;this.source=null;this.width=this.height=0}
    cancel(){return false}
    dispose(){}
  }

  const validationError=new Error('pipeline validation failed');validationError.name='WebGPUValidationError';
  const gpu=new FakeRenderer('webgpu',{render:async()=>{throw validationError}}),cpu=new FakeRenderer('cpu'),fallbackManager=new RendererManager({webgpu:()=>gpu,cpu:()=>cpu});
  await fallbackManager.setSource(new Uint8ClampedArray([9,8,7,255]),1,1);
  const selections=[];
  const first=await fallbackManager.render({id:1,program,controls:Array(8).fill(128),legacyMath:false,isCurrent:()=>true,onSelection:(selection,context)=>selections.push([selection.renderer.id,context.runtimeFallback])});
  assert.equal(first.result.backend,'cpu','runtime WebGPU failure must be recovered by the manager-owned CPU fallback');
  assert.deepEqual(selections,[['webgpu',false],['cpu',true]],'the manager must report both initial selection and runtime fallback');
  assert.match(first.fallbackReason,/pipeline validation failed/);
  assert.equal(Object.hasOwn(program.metadata,'webgpu'),false,'renderer selection must not mutate neutral IR metadata');

  const second=await fallbackManager.render({id:2,program,controls:Array(8).fill(128),legacyMath:false,isCurrent:()=>true});
  assert.equal(second.result.backend,'cpu');
  assert.equal(gpu.renderCalls,1,'persistent shader validation failures must be quarantined for subsequent control renders');

  await fallbackManager.setSource(new Uint8ClampedArray([1,2,3,255]),1,1);
  assert.equal(gpu.releaseCalls,1,'inactive GPU image buffers must release when the source changes');
  assert.equal(cpu.releaseCalls,1,'inactive CPU worker sources must release when the source changes');
  fallbackManager.dispose();

  let resolveCpuSource,cpuSourceStarted=false,cpuRenderCalls=0,current=true;
  const transientGpu=new FakeRenderer('webgpu',{render:async()=>{throw new Error('transient device error')}});
  const deferredCpu=new FakeRenderer('cpu',{render:async()=>{cpuRenderCalls++;return{pixels:new Uint8ClampedArray(4),ms:1,backend:'cpu',label:'CPU Worker'}}});
  deferredCpu.setSource=()=>{cpuSourceStarted=true;return new Promise(resolve=>{resolveCpuSource=resolve})};
  const cancellationManager=new RendererManager({webgpu:()=>transientGpu,cpu:()=>deferredCpu});
  await cancellationManager.setSource(new Uint8ClampedArray([1,1,1,255]),1,1);
  const pending=cancellationManager.render({id:3,program,controls:Array(8).fill(128),legacyMath:false,isCurrent:()=>current});
  for(let attempt=0;attempt<100&&!cpuSourceStarted;attempt++)await Promise.resolve();
  assert.equal(cpuSourceStarted,true,'CPU source synchronization must begin after runtime GPU failure');
  current=false;resolveCpuSource();
  await assert.rejects(pending,error=>error?.name==='RenderCancelledError','a stale render must stop after awaiting CPU initialization');
  assert.equal(cpuRenderCalls,0,'cancellation during CPU initialization must not launch stale work');
  cancellationManager.dispose();

  const cancelled=new RenderCancelledError('cancelled in fallback');
  const cancellingGpu=new FakeRenderer('webgpu',{render:async()=>{throw new Error('GPU failed')}}),cancellingCpu=new FakeRenderer('cpu',{render:async()=>{throw cancelled}}),propagationManager=new RendererManager({webgpu:()=>cancellingGpu,cpu:()=>cancellingCpu});
  await propagationManager.setSource(new Uint8ClampedArray([1,1,1,255]),1,1);
  await assert.rejects(propagationManager.render({id:4,program,controls:Array(8).fill(128),legacyMath:false,isCurrent:()=>true}),error=>error===cancelled,'CPU fallback cancellation must not be wrapped as a renderer failure');
  propagationManager.dispose();
}finally{
  console.error=originalConsoleError;
  if(navigatorDescriptor)Object.defineProperty(globalThis,'navigator',navigatorDescriptor);else delete globalThis.navigator;
}

console.log('Renderer manager synchronization smoke: pass.');
