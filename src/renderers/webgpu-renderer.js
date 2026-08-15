/**
 * Filter FabJS
 * Modular source extracted from v2.0.7; modular architecture v2.1.0.
 * Licensed GPL-2.0-or-later. See LICENSE and README.md.
 */
import { WGSLCompiler, WGSLCompileError } from '../gpu/wgsl-compiler.js';
import { RendererBackend, RenderCancelledError } from './renderer-backend.js';

const MAX_PIPELINES=32;
export class WebGPUValidationError extends Error{constructor(message){super(message);this.name='WebGPUValidationError'}}

export class WebGpuRenderer extends RendererBackend{
  constructor({onCompile=null}={}){super('webgpu','WebGPU');this.onCompile=onCompile;this.adapter=null;this.device=null;this.deviceGeneration=0;this.initPromise=null;this.source=null;this.width=0;this.height=0;this.sourceBuffer=null;this.outputBuffer=null;this.readbackBuffer=null;this.paramsBuffer=null;this.bufferGeneration=0;this.pipelineCache=new Map();this.cancelVersion=0;this.active=false;this.lastShader='';this.operationQueue=Promise.resolve();this.disposed=false}
  static unavailableReason(){if(!globalThis.navigator?.gpu)return globalThis.isSecureContext===false?'WebGPU requires HTTPS or localhost':'WebGPU API unavailable';return''}
  async ensureDevice(){
    if(this.disposed)throw new Error('WebGPU renderer is disposed');
    if(this.device)return this.device;if(this.initPromise)return this.initPromise;
    const reason=WebGpuRenderer.unavailableReason();if(reason)throw new Error(reason);
    const init=(async()=>{const adapter=await navigator.gpu.requestAdapter({powerPreference:'high-performance'});if(!adapter)throw new Error('No WebGPU adapter was returned');const device=await adapter.requestDevice();if(this.disposed){device.destroy?.();throw new Error('WebGPU renderer is disposed')}this.adapter=adapter;this.device=device;this.deviceGeneration++;device.lost.then(info=>{if(this.device!==device)return;console.warn('WebGPU device lost',info);this.cancelVersion++;this.active=false;this.device=null;this.adapter=null;this.pipelineCache.clear();this.destroyBuffers()});device.addEventListener?.('uncapturederror',event=>console.error('WebGPU uncaptured error',event.error));return device})();
    this.initPromise=init;try{return await init}finally{if(this.initPromise===init)this.initPromise=null}
  }
  destroyBuffers(){for(const key of ['sourceBuffer','outputBuffer','readbackBuffer','paramsBuffer']){try{if(key==='readbackBuffer'&&this[key]?.mapState==='mapped')this[key].unmap()}catch{}try{this[key]?.destroy()}catch{}this[key]=null}this.bufferGeneration=0}
  setSource(pixels,width,height){if(!Number.isInteger(width)||!Number.isInteger(height)||width<1||height<1)throw new Error('WebGPU source dimensions must be positive integers');const count=width*height;if(!Number.isSafeInteger(count)||pixels?.length!==count*4)throw new Error('WebGPU source pixel length does not match its dimensions');const copy=new Uint8ClampedArray(pixels);this.cancelVersion++;const job=this.operationQueue.then(()=>this.configureSource(copy,width,height));this.operationQueue=job.catch(()=>{});return job}
  async configureSource(pixels,width,height){
    this.active=false;this.source=pixels;this.width=width;this.height=height;await this.uploadSource();return true;
  }
  async uploadSource(){
    if(!this.source||!this.width||!this.height)throw new Error('WebGPU source is not initialized');const device=await this.ensureDevice();if(device!==this.device)throw new RenderCancelledError('WebGPU device changed during source upload');this.destroyBuffers();
    const count=this.width*this.height,size=Math.max(4,count*4),packed=new Uint32Array(count);for(let i=0;i<count;i++){const offset=i*4;packed[i]=(this.source[offset]|(this.source[offset+1]<<8)|(this.source[offset+2]<<16)|(this.source[offset+3]<<24))>>>0}
    try{this.sourceBuffer=device.createBuffer({label:'Filter FabJS source',size,usage:GPUBufferUsage.STORAGE|GPUBufferUsage.COPY_DST});this.outputBuffer=device.createBuffer({label:'Filter FabJS output',size,usage:GPUBufferUsage.STORAGE|GPUBufferUsage.COPY_SRC});this.readbackBuffer=device.createBuffer({label:'Filter FabJS readback',size,usage:GPUBufferUsage.COPY_DST|GPUBufferUsage.MAP_READ});this.paramsBuffer=device.createBuffer({label:'Filter FabJS params',size:48,usage:GPUBufferUsage.STORAGE|GPUBufferUsage.COPY_DST});device.queue.writeBuffer(this.sourceBuffer,0,packed);this.bufferGeneration=this.deviceGeneration}catch(error){this.destroyBuffers();throw error}
    return device;
  }
  async ensureSourceBuffers(){if(!this.source||!this.width||!this.height)throw new Error('WebGPU source is not initialized');if(this.device&&this.bufferGeneration===this.deviceGeneration&&this.sourceBuffer&&this.outputBuffer&&this.readbackBuffer&&this.paramsBuffer)return this.device;return this.uploadSource()}
  releaseSource(){this.cancelVersion++;const job=this.operationQueue.then(()=>{this.active=false;this.destroyBuffers();this.source=null;this.width=this.height=0});this.operationQueue=job.catch(()=>{});return job}
  writeParams(device,paramsBuffer,startRow,rowCount,controls){const data=new ArrayBuffer(48),view=new DataView(data);view.setUint32(0,this.width,true);view.setUint32(4,this.height,true);view.setUint32(8,startRow,true);view.setUint32(12,rowCount,true);for(let i=0;i<8;i++)view.setFloat32(16+i*4,Number(controls[i]??128),true);device.queue.writeBuffer(paramsBuffer,0,data)}
  cachedPipeline(key){const entry=this.pipelineCache.get(key);if(!entry)return null;this.pipelineCache.delete(key);this.pipelineCache.set(key,entry);return entry}
  rememberPipeline(plan,pipeline,deviceGeneration=this.deviceGeneration){this.pipelineCache.delete(plan.key);this.pipelineCache.set(plan.key,{plan,pipeline,deviceGeneration});while(this.pipelineCache.size>MAX_PIPELINES)this.pipelineCache.delete(this.pipelineCache.keys().next().value)}
  planFor(program,analysis){const key=WGSLCompiler.key(program),entry=this.cachedPipeline(key);return entry?.plan||WGSLCompiler.compile(program,analysis)}
  async pipelineFor(plan){
    const cached=this.cachedPipeline(plan.key);if(cached?.pipeline&&cached.deviceGeneration===this.deviceGeneration&&this.device)return cached.pipeline;const device=await this.ensureDevice(),generation=this.deviceGeneration;device.pushErrorScope('validation');let pipeline,pipelineError=null,validationError=null;
    try{const module=device.createShaderModule({label:'Filter FabJS generated WGSL',code:plan.code});const info=await module.getCompilationInfo?.();const failures=info?.messages?.filter(message=>message.type==='error')||[];if(failures.length)throw new WGSLCompileError(failures.map(message=>`${message.lineNum}:${message.linePos} ${message.message}`).join('\n'));pipeline=device.createComputePipelineAsync?await device.createComputePipelineAsync({label:'Filter FabJS compute pipeline',layout:'auto',compute:{module,entryPoint:'main'}}):device.createComputePipeline({label:'Filter FabJS compute pipeline',layout:'auto',compute:{module,entryPoint:'main'}})}catch(error){pipelineError=error}
    try{validationError=await device.popErrorScope()}catch(error){if(!pipelineError)pipelineError=error}
    if(device!==this.device||generation!==this.deviceGeneration)throw new RenderCancelledError('WebGPU device changed during pipeline creation');if(pipelineError?.name==='WGSLCompileError')throw pipelineError;if(validationError)throw new WebGPUValidationError(validationError.message);if(pipelineError)throw pipelineError;this.rememberPipeline(plan,pipeline,generation);return pipeline;
  }
  render(args){const job=this.operationQueue.then(()=>this.performRender(args));this.operationQueue=job.catch(()=>{});return job}
  async performRender({program,controls,onProgress,webgpuAnalysis}){
    if(!this.source||!this.width||!this.height)throw new Error('WebGPU source is not initialized');const token=this.cancelVersion,start=performance.now();this.active=true;
    try{
      const plan=this.planFor(program,webgpuAnalysis);this.lastShader=plan.code;this.onCompile?.({wgsl:plan.code,analysis:plan.analysis});const device=await this.ensureSourceBuffers();if(token!==this.cancelVersion||device!==this.device)throw new RenderCancelledError();const pipeline=await this.pipelineFor(plan);if(token!==this.cancelVersion||device!==this.device)throw new RenderCancelledError();
      const sourceBuffer=this.sourceBuffer,outputBuffer=this.outputBuffer,readbackBuffer=this.readbackBuffer,paramsBuffer=this.paramsBuffer;if(!sourceBuffer||!outputBuffer||!readbackBuffer||!paramsBuffer)throw new Error('WebGPU source buffers were lost before dispatch');if(readbackBuffer.mapState==='mapped')readbackBuffer.unmap();this.writeParams(device,paramsBuffer,0,this.height,controls);
      const bindGroup=device.createBindGroup({layout:pipeline.getBindGroupLayout(0),entries:[{binding:0,resource:{buffer:sourceBuffer}},{binding:1,resource:{buffer:outputBuffer}},{binding:2,resource:{buffer:paramsBuffer}}]}),encoder=device.createCommandEncoder({label:'Filter FabJS GPU frame'}),pass=encoder.beginComputePass();pass.setPipeline(pipeline);pass.setBindGroup(0,bindGroup);pass.dispatchWorkgroups(Math.ceil(this.width/8),Math.ceil(this.height/8));pass.end();encoder.copyBufferToBuffer(outputBuffer,0,readbackBuffer,0,this.width*this.height*4);device.queue.submit([encoder.finish()]);
      await readbackBuffer.mapAsync(GPUMapMode.READ,0,this.width*this.height*4);if(token!==this.cancelVersion||device!==this.device){readbackBuffer.unmap();throw new RenderCancelledError()}let raw;try{raw=readbackBuffer.getMappedRange(0,this.width*this.height*4).slice(0)}finally{if(readbackBuffer.mapState==='mapped')readbackBuffer.unmap()}onProgress?.({row:this.height,total:this.height,pct:100});const words=new Uint32Array(raw),pixels=new Uint8ClampedArray(words.length*4);for(let i=0;i<words.length;i++){const value=words[i],offset=i*4;pixels[offset]=value&255;pixels[offset+1]=(value>>>8)&255;pixels[offset+2]=(value>>>16)&255;pixels[offset+3]=(value>>>24)&255}return{pixels,ms:performance.now()-start,backend:this.id,label:this.label};
    }finally{this.active=false}
  }
  async cancel(){const hadWork=this.active;this.cancelVersion++;return hadWork}
  dispose(){this.disposed=true;this.cancelVersion++;this.active=false;this.destroyBuffers();this.pipelineCache.clear();const device=this.device;this.device=null;this.adapter=null;this.source=null;this.width=this.height=0;try{device?.destroy?.()}catch{}}
}
