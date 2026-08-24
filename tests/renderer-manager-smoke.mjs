import assert from 'node:assert/strict';
import { defaultControlValues } from '../src/core/controls.js';
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

const firstSource=new Uint8ClampedArray([1,0,0,255]);await manager.setSource(firstSource,1,1);
assert.equal(manager.source,firstSource,'the manager must retain the immutable clamped source without copying it');
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

class RetainingRenderer {
  constructor(id){this.id=id;this.releaseCalls=0;this.source=null}
  async setSource(pixels,width,height){this.source=new Uint8ClampedArray(pixels);this.width=width;this.height=height}
  releaseSource(){this.releaseCalls++;this.source=null;this.width=this.height=0}
  cancel(){return false}
  dispose(){}
}
const retainedCpu=new RetainingRenderer('cpu'),retainedGpu=new RetainingRenderer('webgpu'),resourceManager=new RendererManager({cpu:()=>retainedCpu,webgpu:()=>retainedGpu});
await resourceManager.setSource(new Uint8ClampedArray([3,0,0,255]),1,1);
await Promise.all([resourceManager.get('cpu'),resourceManager.get('webgpu')]);
assert.equal(retainedCpu.source[0],3);assert.equal(retainedGpu.source[0],3);
await resourceManager.setSource(new Uint8ClampedArray([4,0,0,255]),1,1);
assert.equal(retainedCpu.releaseCalls,1,'a new image must release the inactive CPU source');
assert.equal(retainedGpu.releaseCalls,1,'a new image must release the inactive WebGPU source');
assert.equal(retainedCpu.source,null);assert.equal(retainedGpu.source,null);
await resourceManager.get('cpu');
assert.equal(retainedCpu.source[0],4,'only the selected backend must lazily receive the replacement image');
assert.equal(retainedGpu.source,null,'inactive backends must not retain the replacement image');
assert.throws(()=>resourceManager.setSource(new Uint8ClampedArray(4),2,1),/pixel length/);
resourceManager.dispose();

const analysisManager=new RendererManager({});
const analysisProgram=compileFilterProgram(['r','g','b','a'].map(formula=>new Parser(formula).parse()));
const cachedAnalysis=analysisManager.analyze(analysisProgram);
assert.equal(analysisManager.analyze(analysisProgram),cachedAnalysis,'compatibility analysis must be reused for an unchanged program');
const legacyProgram=compileFilterProgram(['r','g','b','a'].map(formula=>new Parser(formula).parse()),{legacyMath:true});
assert.notEqual(analysisManager.programKey(analysisProgram),analysisManager.programKey(legacyProgram),'analysis keys must include arithmetic mode');
for(let index=0;index<70;index++){const formula=String(index),program=compileFilterProgram([formula,formula,formula,formula].map(value=>new Parser(value).parse()));analysisManager.analyze(program)}
assert.equal(analysisManager.analysisCache.size,64,'compatibility analyses must use a bounded LRU cache');
assert.equal(analysisManager.analysisCache.has(analysisManager.programKey(analysisProgram)),false,'least-recently-used analyses must be evicted');
const longKeySuffix='x'.repeat(600_000);analysisManager.programKey=program=>program.testKey;
for(let index=0;index<3;index++)analysisManager.analyze({kind:'filter-fab-program',irVersion:1,mathMode:'float',outputs:[],testKey:`${index}:${longKeySuffix}`});
assert.equal(analysisManager.analysisCache.size,1,'analysis cache payload must be byte-bounded as well as entry-bounded');
assert.ok(analysisManager.analysisCacheBytes<=2*1024*1024,'analysis cache must remain within its byte budget');
const failedGpu={device:{},deviceGeneration:1,dispose(){}};analysisManager.instances.set('webgpu',failedGpu);const persistentError=new Error('validation failed');persistentError.name='WGSLCompileError';
for(let index=0;index<3;index++)analysisManager.rememberGpuFailure({testKey:`failure-${index}:${longKeySuffix}`},failedGpu,persistentError);
assert.equal(analysisManager.gpuFailures.size,1,'GPU-failure cache payload must be byte-bounded as well as entry-bounded');
assert.ok(analysisManager.gpuFailureCacheBytes<=2*1024*1024,'GPU-failure cache must remain within its byte budget');
analysisManager.dispose();

const navigatorDescriptor=Object.getOwnPropertyDescriptor(globalThis,'navigator');
const originalConsoleError=console.error;
Object.defineProperty(globalThis,'navigator',{configurable:true,value:{gpu:{}}});
console.error=()=>{};
try{
  const program=compileFilterProgram(['r','g','b','a'].map(formula=>new Parser(formula).parse()));
  class FakeRenderer {
    constructor(id,{render}={}){this.id=id;this.label=id==='webgpu'?'WebGPU':'CPU Worker';this.renderImpl=render;this.renderCalls=0;this.device=id==='webgpu'?{}:null;this.deviceGeneration=id==='webgpu'?1:0}
    async setSource(pixels,width,height){this.source=new Uint8ClampedArray(pixels);this.width=width;this.height=height}
    async render(args){this.renderCalls++;this.lastArgs=args;return this.renderImpl?.(args)??{pixels:this.source.slice(),ms:1,backend:this.id,label:this.label}}
    cancel(){return false}
    dispose(){}
  }

  const validationError=new Error('pipeline validation failed');validationError.name='WebGPUValidationError';
  const gpu=new FakeRenderer('webgpu',{render:async()=>{throw validationError}}),cpu=new FakeRenderer('cpu'),fallbackManager=new RendererManager({webgpu:()=>gpu,cpu:()=>cpu});
  await fallbackManager.setSource(new Uint8ClampedArray([9,8,7,255]),1,1);
  const selections=[];
  const first=await fallbackManager.renderWithFallback({id:1,program,controls:defaultControlValues(),legacyMath:false,isCurrent:()=>true,onSelection:(selection,context)=>selections.push([selection.renderer.id,context.runtimeFallback])});
  assert.equal(first.result.backend,'cpu','runtime WebGPU failure must be recovered by manager-owned CPU fallback');
  assert.deepEqual(selections,[['webgpu',false],['cpu',true]],'the manager must report initial selection and runtime fallback');
  assert.match(first.fallbackReason,/pipeline validation failed/);
  assert.equal(gpu.lastArgs.webgpuAnalysis?.compatible,true,'the manager must pass its cached compatibility analysis into WGSL planning');

  const second=await fallbackManager.renderWithFallback({id:2,program,controls:defaultControlValues(),legacyMath:false,isCurrent:()=>true});
  assert.equal(second.result.backend,'cpu');
  assert.equal(gpu.renderCalls,1,'persistent validation failures must be quarantined for later control renders');

  gpu.device=null;
  await fallbackManager.renderWithFallback({id:3,program,controls:defaultControlValues(),legacyMath:false,isCurrent:()=>true});
  assert.equal(gpu.renderCalls,2,'device loss must clear the failed device/program quarantine');
  fallbackManager.dispose();

  let resolveCpuSource,cpuSourceStarted=false,cpuRenderCalls=0,current=true;
  const transientGpu=new FakeRenderer('webgpu',{render:async()=>{throw new Error('transient device error')}}),deferredCpu=new FakeRenderer('cpu',{render:async()=>{cpuRenderCalls++;return{pixels:new Uint8ClampedArray(4),ms:1,backend:'cpu',label:'CPU Worker'}}});
  deferredCpu.setSource=()=>{cpuSourceStarted=true;return new Promise(resolve=>{resolveCpuSource=resolve})};
  const cancellationManager=new RendererManager({webgpu:()=>transientGpu,cpu:()=>deferredCpu});
  await cancellationManager.setSource(new Uint8ClampedArray([1,1,1,255]),1,1);
  const pending=cancellationManager.renderWithFallback({id:4,program,controls:defaultControlValues(),legacyMath:false,isCurrent:()=>current});
  for(let attempt=0;attempt<100&&!cpuSourceStarted;attempt++)await Promise.resolve();
  assert.equal(cpuSourceStarted,true,'CPU source synchronization must begin after runtime GPU failure');
  current=false;resolveCpuSource();
  await assert.rejects(pending,error=>error?.name==='RenderCancelledError','a stale render must stop after awaiting CPU initialization');
  assert.equal(cpuRenderCalls,0,'cancellation during CPU initialization must not launch stale work');
  cancellationManager.dispose();

  const cancelled=new RenderCancelledError('cancelled in fallback'),cancellingGpu=new FakeRenderer('webgpu',{render:async()=>{throw new Error('GPU failed')}}),cancellingCpu=new FakeRenderer('cpu',{render:async()=>{throw cancelled}}),propagationManager=new RendererManager({webgpu:()=>cancellingGpu,cpu:()=>cancellingCpu});
  await propagationManager.setSource(new Uint8ClampedArray([1,1,1,255]),1,1);
  await assert.rejects(propagationManager.renderWithFallback({id:5,program,controls:defaultControlValues(),legacyMath:false,isCurrent:()=>true}),error=>error===cancelled,'CPU fallback cancellation must be preserved');
  propagationManager.dispose();
}finally{
  console.error=originalConsoleError;
  if(navigatorDescriptor)Object.defineProperty(globalThis,'navigator',navigatorDescriptor);else delete globalThis.navigator;
}

console.log('Renderer manager synchronization smoke: pass.');
