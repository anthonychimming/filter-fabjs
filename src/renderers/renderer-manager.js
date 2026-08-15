/**
 * Filter FabJS
 * Modular source extracted from v2.0.7; modular architecture v2.1.0.
 * Licensed GPL-2.0-or-later. See LICENSE and README.md.
 */
import { WGSLCompiler } from '../gpu/wgsl-compiler.js';
import { RenderCancelledError } from './renderer-backend.js';
import { WebGpuRenderer } from './webgpu-renderer.js';

const MAX_GPU_FAILURES=64;

export class RendererManager{
  constructor(factories){this.factories=factories;this.instances=new Map();this.instanceVersions=new Map();this.syncPromises=new Map();this.source=null;this.width=0;this.height=0;this.sourceVersion=0;this.active=null;this.gpuFailures=new Map()}
  setSource(pixels,width,height){this.active?.cancel?.();this.active=null;this.source=new Uint8ClampedArray(pixels);this.width=width;this.height=height;this.sourceVersion++;return Promise.resolve()}
  async syncSource(id,renderer){const source=this.source,width=this.width,height=this.height,version=this.sourceVersion;await renderer.setSource(source,width,height);if(version===this.sourceVersion)this.instanceVersions.set(id,version)}
  async get(id){let renderer=this.instances.get(id);if(!renderer){const factory=this.factories[id];if(!factory)throw new Error(`Unknown renderer backend “${id}”`);renderer=factory();this.instances.set(id,renderer)}while(this.source&&this.instanceVersions.get(id)!==this.sourceVersion){let sync=this.syncPromises.get(id);if(!sync){sync=this.syncSource(id,renderer);this.syncPromises.set(id,sync)}try{await sync}finally{if(this.syncPromises.get(id)===sync)this.syncPromises.delete(id)}}return renderer}
  gpuFailure(program){
    const key=WGSLCompiler.key(program),failure=this.gpuFailures.get(key),renderer=this.instances.get('webgpu');
    if(!failure)return'';
    if(!renderer?.device||renderer.deviceGeneration!==failure.deviceGeneration){this.gpuFailures.delete(key);return''}
    return failure.reason;
  }
  rememberGpuFailure(program,renderer,error){
    const message=error?.message||'WebGPU render failed',persistent=error?.name==='WGSLCompileError'||(error?.name==='WebGPUValidationError'&&!/(?:device\s+(?:is\s+)?lost|destroyed|out\s+of\s+memory|internal)/i.test(message));
    if(!persistent)return;
    const key=WGSLCompiler.key(program);this.gpuFailures.delete(key);this.gpuFailures.set(key,{deviceGeneration:renderer?.deviceGeneration??0,reason:`GPU error: ${message}`});
    while(this.gpuFailures.size>MAX_GPU_FAILURES)this.gpuFailures.delete(this.gpuFailures.keys().next().value);
  }
  assertCurrent(isCurrent){if(typeof isCurrent==='function'&&!isCurrent())throw new RenderCancelledError()}
  throwIfCancelled(error,isCurrent){if(error?.name==='RenderCancelledError')throw error;this.assertCurrent(isCurrent)}
  progressHandler(onProgress,isCurrent){return message=>{if(typeof isCurrent==='function'&&!isCurrent())return;onProgress?.(message)}}
  async select(program,preference='auto',isCurrent){
    const analysis=WGSLCompiler.analyze(program);program.metadata.webgpu={...analysis};
    if(preference==='cpu'){const renderer=await this.get('cpu');this.assertCurrent(isCurrent);this.active=renderer;return{renderer,analysis,fallbackReason:''}}
    let reason='';if(!analysis.compatible)reason=`GPU subset: ${analysis.blockers.slice(0,3).join(', ')}`;else reason=WebGpuRenderer.unavailableReason()||this.gpuFailure(program);
    if(!reason){try{const renderer=await this.get('webgpu');this.assertCurrent(isCurrent);this.active=renderer;return{renderer,analysis,fallbackReason:''}}catch(error){this.throwIfCancelled(error,isCurrent);console.warn('WebGPU initialization failed; using CPU',error);reason=error.message||'WebGPU initialization failed'}}
    const renderer=await this.get('cpu');this.assertCurrent(isCurrent);this.active=renderer;return{renderer,analysis,fallbackReason:reason};
  }
  async renderWithFallback({program,preference='auto',id,controls,legacyMath,onProgress,onSelection,isCurrent}){
    let selection;
    try{selection=await this.select(program,preference,isCurrent)}catch(error){this.throwIfCancelled(error,isCurrent);throw error}
    this.assertCurrent(isCurrent);onSelection?.(selection,{runtimeFallback:false,gpuError:null});
    const args={id,program,controls,legacyMath,onProgress:this.progressHandler(onProgress,isCurrent)};
    try{
      const result=await selection.renderer.render(args);this.assertCurrent(isCurrent);return{...selection,result,gpuError:null,runtimeFallback:false};
    }catch(gpuError){
      this.throwIfCancelled(gpuError,isCurrent);
      if(selection.renderer.id!=='webgpu')throw gpuError;
      console.error('WebGPU render failed; retrying on CPU',gpuError);this.rememberGpuFailure(program,selection.renderer,gpuError);
      let cpu;
      try{cpu=await this.get('cpu');this.assertCurrent(isCurrent)}catch(cpuInitError){this.throwIfCancelled(cpuInitError,isCurrent);throw this.fallbackError(gpuError,cpuInitError)}
      this.active=cpu;selection={renderer:cpu,analysis:selection.analysis,fallbackReason:`GPU error: ${gpuError.message||'WebGPU render failed'}`};onSelection?.(selection,{runtimeFallback:true,gpuError});
      try{const result=await cpu.render({...args,onProgress:this.progressHandler(onProgress,isCurrent)});this.assertCurrent(isCurrent);return{...selection,result,gpuError,runtimeFallback:true}}
      catch(cpuError){this.throwIfCancelled(cpuError,isCurrent);throw this.fallbackError(gpuError,cpuError)}
    }
  }
  fallbackError(gpuError,cpuError){const error=new Error(`GPU: ${gpuError.message}; CPU: ${cpuError.message}`);error.name='RendererFallbackError';error.gpuError=gpuError;error.cpuError=cpuError;return error}
  async cancelActive(){return this.active?.cancel?.()??false}
  dispose(){for(const renderer of this.instances.values())renderer.dispose();this.instances.clear();this.instanceVersions.clear();this.syncPromises.clear();this.gpuFailures.clear();this.active=null}
}
