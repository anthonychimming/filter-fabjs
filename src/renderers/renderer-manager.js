/**
 * Filter FabJS
 * Modular source extracted from v2.0.7; modular architecture v2.1.0.
 * Licensed GPL-2.0-or-later. See LICENSE and README.md.
 */
import { WGSLCompiler } from '../gpu/wgsl-compiler.js';
import { WebGpuRenderer } from './webgpu-renderer.js';

export class RendererManager{
  constructor(factories){this.factories=factories;this.instances=new Map();this.instanceVersions=new Map();this.syncPromises=new Map();this.source=null;this.width=0;this.height=0;this.sourceVersion=0;this.active=null}
  setSource(pixels,width,height){this.active?.cancel?.();this.active=null;this.source=new Uint8ClampedArray(pixels);this.width=width;this.height=height;this.sourceVersion++;return Promise.resolve()}
  async syncSource(id,renderer){const source=this.source,width=this.width,height=this.height,version=this.sourceVersion;await renderer.setSource(source,width,height);if(version===this.sourceVersion)this.instanceVersions.set(id,version)}
  async get(id){let renderer=this.instances.get(id);if(!renderer){const factory=this.factories[id];if(!factory)throw new Error(`Unknown renderer backend “${id}”`);renderer=factory();this.instances.set(id,renderer)}while(this.source&&this.instanceVersions.get(id)!==this.sourceVersion){let sync=this.syncPromises.get(id);if(!sync){sync=this.syncSource(id,renderer);this.syncPromises.set(id,sync)}try{await sync}finally{if(this.syncPromises.get(id)===sync)this.syncPromises.delete(id)}}return renderer}
  async select(program,preference='auto'){
    const analysis=WGSLCompiler.analyze(program);program.metadata.webgpu={...analysis};
    if(preference==='cpu'){const renderer=await this.get('cpu');this.active=renderer;return{renderer,analysis,fallbackReason:''}}
    let reason='';if(!analysis.compatible)reason=`GPU subset: ${analysis.blockers.slice(0,3).join(', ')}`;else reason=WebGpuRenderer.unavailableReason();
    if(!reason){try{const renderer=await this.get('webgpu');this.active=renderer;return{renderer,analysis,fallbackReason:''}}catch(error){console.warn('WebGPU initialization failed; using CPU',error);reason=error.message||'WebGPU initialization failed'}}
    const renderer=await this.get('cpu');this.active=renderer;return{renderer,analysis,fallbackReason:reason};
  }
  async cancelActive(){return this.active?.cancel?.()??false}
  dispose(){for(const renderer of this.instances.values())renderer.dispose();this.instances.clear();this.instanceVersions.clear();this.syncPromises.clear();this.active=null}
}
