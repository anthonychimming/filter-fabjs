/**
 * Filter FabJS
 * Modular source extracted from v2.0.7; modular architecture v2.1.0.
 * Licensed GPL-2.0-or-later. See LICENSE and README.md.
 */
import { WGSLCompiler } from '../gpu/wgsl-compiler.js';
import { RenderCancelledError } from './renderer-backend.js';
import { WebGpuRenderer } from './webgpu-renderer.js';

const MAX_ANALYSES=64,MAX_GPU_FAILURES=64;

export class RendererManager{
  constructor(factories){
    this.factories=factories;this.instances=new Map();this.instanceVersions=new Map();this.syncPromises=new Map();this.source=null;this.width=0;this.height=0;this.sourceVersion=0;this.active=null;
    this.analysisCache=new Map();this.gpuFailures=new Map();
  }
  setSource(pixels,width,height){
    if(!Number.isInteger(width)||!Number.isInteger(height)||width<1||height<1)throw new Error('Renderer source dimensions must be positive integers');
    const count=width*height;if(!Number.isSafeInteger(count)||pixels?.length!==count*4)throw new Error('Renderer source pixel length does not match its dimensions');
    const releases=[];
    for(const [id,renderer] of this.instances){
      this.instanceVersions.delete(id);
      try{const release=typeof renderer.releaseSource==='function'?renderer.releaseSource():renderer.cancel?.();if(release)releases.push(Promise.resolve(release).catch(error=>console.warn(`${renderer.label||id} source release failed`,error)))}catch(error){console.warn(`${renderer.label||id} source release failed`,error)}
    }
    this.active=null;this.source=new Uint8ClampedArray(pixels);this.width=width;this.height=height;this.sourceVersion++;this.gpuFailures.clear();
    return Promise.all(releases).then(()=>undefined);
  }
  async syncSource(id,renderer){const source=this.source,width=this.width,height=this.height,version=this.sourceVersion;await renderer.setSource(source,width,height);if(version===this.sourceVersion)this.instanceVersions.set(id,version)}
  async get(id){
    let renderer=this.instances.get(id);
    if(!renderer){const factory=this.factories[id];if(!factory)throw new Error(`Unknown renderer backend “${id}”`);renderer=factory();this.instances.set(id,renderer)}
    while(this.source&&this.instanceVersions.get(id)!==this.sourceVersion){
      let sync=this.syncPromises.get(id);
      if(!sync){sync={version:this.sourceVersion,promise:this.syncSource(id,renderer)};this.syncPromises.set(id,sync)}
      try{await sync.promise}catch(error){if(sync.version===this.sourceVersion)throw error}finally{if(this.syncPromises.get(id)===sync)this.syncPromises.delete(id)}
    }
    return renderer;
  }
  programKey(program){return WGSLCompiler.key(program)}
  analyze(program){
    const key=this.programKey(program),cached=this.analysisCache.get(key);
    if(cached){this.analysisCache.delete(key);this.analysisCache.set(key,cached);return cached}
    const analysis=WGSLCompiler.analyze(program);this.analysisCache.set(key,analysis);
    while(this.analysisCache.size>MAX_ANALYSES)this.analysisCache.delete(this.analysisCache.keys().next().value);
    return analysis;
  }
  cachedGpuFailure(key){const failure=this.gpuFailures.get(key);if(!failure)return'';this.gpuFailures.delete(key);this.gpuFailures.set(key,failure);return failure}
  rememberGpuFailure(key,message){this.gpuFailures.delete(key);this.gpuFailures.set(key,message);while(this.gpuFailures.size>MAX_GPU_FAILURES)this.gpuFailures.delete(this.gpuFailures.keys().next().value)}
  persistentGpuFailure(error){const message=error?.message||'';return error?.name==='WGSLCompileError'||(error?.name==='WebGPUValidationError'&&!/(?:device\s+(?:is\s+)?lost|destroyed)/i.test(message))||/No WebGPU adapter was returned/.test(message)}
  async select(program,preference='auto'){
    const analysis=this.analyze(program),key=this.programKey(program);
    if(preference==='cpu'){const renderer=await this.get('cpu');this.active=renderer;return{renderer,analysis,fallbackReason:''}}
    let reason='';
    if(!analysis.compatible)reason=`GPU subset: ${analysis.blockers.slice(0,3).join(', ')}`;
    else reason=WebGpuRenderer.unavailableReason()||this.cachedGpuFailure(key);
    if(!reason){
      try{const renderer=await this.get('webgpu');this.active=renderer;return{renderer,analysis,fallbackReason:''}}
      catch(error){console.warn('WebGPU initialization failed; using CPU',error);reason=error.message||'WebGPU initialization failed';if(this.persistentGpuFailure(error))this.rememberGpuFailure(key,`GPU error: ${reason}`)}
    }
    const renderer=await this.get('cpu');this.active=renderer;return{renderer,analysis,fallbackReason:reason};
  }
  assertCurrent(isCurrent){if(typeof isCurrent==='function'&&!isCurrent())throw new RenderCancelledError()}
  throwIfCancelled(error,isCurrent){if(error?.name==='RenderCancelledError')throw error;this.assertCurrent(isCurrent)}
  progressHandler(onProgress,isCurrent,selection){return message=>{if(typeof isCurrent==='function'&&!isCurrent())return;onProgress?.(message,selection)}}
  async render({program,preference='auto',id,controls,legacyMath,onProgress,onSelection,isCurrent}){
    let selection=await this.select(program,preference);this.assertCurrent(isCurrent);onSelection?.(selection,{runtimeFallback:false,gpuError:null});
    const renderArgs={id,program,controls,legacyMath,onProgress:this.progressHandler(onProgress,isCurrent,selection)};
    try{
      const result=await selection.renderer.render(renderArgs);this.assertCurrent(isCurrent);return{...selection,result,gpuError:null};
    }catch(error){
      this.throwIfCancelled(error,isCurrent);
      if(selection.renderer.id!=='webgpu')throw error;
      console.error('WebGPU render failed; retrying on CPU',error);
      const key=this.programKey(program);if(this.persistentGpuFailure(error))this.rememberGpuFailure(key,`GPU error: ${error.message||'WebGPU render failed'}`);
      let cpu;
      try{cpu=await this.get('cpu');this.assertCurrent(isCurrent)}catch(cpuInitError){this.throwIfCancelled(cpuInitError,isCurrent);throw this.fallbackError(error,cpuInitError)}
      this.active=cpu;selection={renderer:cpu,analysis:selection.analysis,fallbackReason:`GPU error: ${error.message||'WebGPU render failed'}`};
      onSelection?.(selection,{runtimeFallback:true,gpuError:error});
      try{
        const result=await cpu.render({...renderArgs,onProgress:this.progressHandler(onProgress,isCurrent,selection)});this.assertCurrent(isCurrent);return{...selection,result,gpuError:error};
      }catch(cpuError){this.throwIfCancelled(cpuError,isCurrent);throw this.fallbackError(error,cpuError)}
    }
  }
  fallbackError(gpuError,cpuError){const error=new Error(`GPU: ${gpuError.message}; CPU: ${cpuError.message}`);error.name='RendererFallbackError';error.gpuError=gpuError;error.cpuError=cpuError;return error}
  async cancelActive(){return this.active?.cancel?.()??false}
  dispose(){for(const renderer of this.instances.values())renderer.dispose();this.instances.clear();this.instanceVersions.clear();this.syncPromises.clear();this.analysisCache.clear();this.gpuFailures.clear();this.active=null;this.source=null;this.width=this.height=0}
}
