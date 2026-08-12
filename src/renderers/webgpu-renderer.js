/**
 * Filter FabJS
 * Modular source extracted from v2.0.7; modular architecture v2.1.0.
 * Licensed GPL-2.0-or-later. See LICENSE and README.md.
 */
import { WGSLCompiler, WGSLCompileError } from '../gpu/wgsl-compiler.js';
import { RendererBackend, RenderCancelledError } from './renderer-backend.js';

export class WebGpuRenderer extends RendererBackend{
  constructor({onCompile=null}={}){super('webgpu','WebGPU');this.onCompile=onCompile;this.adapter=null;this.device=null;this.initPromise=null;this.source=null;this.width=0;this.height=0;this.sourceBuffer=null;this.outputBuffer=null;this.readbackBuffer=null;this.paramsBuffer=null;this.pipelineCache=new Map();this.cancelVersion=0;this.active=false;this.lastShader='';this.operationQueue=Promise.resolve()}
  static unavailableReason(){if(!globalThis.navigator?.gpu)return globalThis.isSecureContext===false?'WebGPU requires HTTPS or localhost':'WebGPU API unavailable';return''}
  async ensureDevice(){
    if(this.device)return this.device;if(this.initPromise)return this.initPromise;
    const reason=WebGpuRenderer.unavailableReason();if(reason)throw new Error(reason);
    this.initPromise=(async()=>{const adapter=await navigator.gpu.requestAdapter({powerPreference:'high-performance'});if(!adapter)throw new Error('No WebGPU adapter was returned');const device=await adapter.requestDevice();device.lost.then(info=>{console.warn('WebGPU device lost',info);this.device=null;this.adapter=null;this.pipelineCache.clear();this.destroyBuffers()});device.addEventListener?.('uncapturederror',event=>console.error('WebGPU uncaptured error',event.error));this.adapter=adapter;this.device=device;return device})();
    try{return await this.initPromise}finally{this.initPromise=null}
  }
  destroyBuffers(){for(const key of ['sourceBuffer','outputBuffer','readbackBuffer','paramsBuffer']){try{this[key]?.destroy()}catch{}this[key]=null}}
  setSource(pixels,width,height){const copy=new Uint8ClampedArray(pixels);this.cancelVersion++;const job=this.operationQueue.then(()=>this.configureSource(copy,width,height));this.operationQueue=job.catch(()=>{});return job}
  async configureSource(pixels,width,height){
    const device=await this.ensureDevice();this.active=false;this.destroyBuffers();this.source=pixels;this.width=width;this.height=height;
    const count=width*height,size=Math.max(4,count*4),packed=new Uint32Array(count);for(let i=0;i<count;i++){const o=i*4;packed[i]=(this.source[o]|(this.source[o+1]<<8)|(this.source[o+2]<<16)|(this.source[o+3]<<24))>>>0}
    this.sourceBuffer=device.createBuffer({label:'Filter FabJS source',size,usage:GPUBufferUsage.STORAGE|GPUBufferUsage.COPY_DST});
    this.outputBuffer=device.createBuffer({label:'Filter FabJS output',size,usage:GPUBufferUsage.STORAGE|GPUBufferUsage.COPY_SRC});
    this.readbackBuffer=device.createBuffer({label:'Filter FabJS readback',size,usage:GPUBufferUsage.COPY_DST|GPUBufferUsage.MAP_READ});
    this.paramsBuffer=device.createBuffer({label:'Filter FabJS params',size:48,usage:GPUBufferUsage.STORAGE|GPUBufferUsage.COPY_DST});
    device.queue.writeBuffer(this.sourceBuffer,0,packed);return true;
  }
  writeParams(startRow,rowCount,controls){const data=new ArrayBuffer(48),view=new DataView(data);view.setUint32(0,this.width,true);view.setUint32(4,this.height,true);view.setUint32(8,startRow,true);view.setUint32(12,rowCount,true);for(let i=0;i<8;i++)view.setFloat32(16+i*4,Number(controls[i]??128),true);this.device.queue.writeBuffer(this.paramsBuffer,0,data)}
  async pipelineFor(plan){
    if(this.pipelineCache.has(plan.key))return this.pipelineCache.get(plan.key);const device=await this.ensureDevice();device.pushErrorScope('validation');let pipeline,error;
    try{const module=device.createShaderModule({label:'Filter FabJS generated WGSL',code:plan.code});const info=await module.getCompilationInfo?.();const failures=info?.messages?.filter(message=>message.type==='error')||[];if(failures.length)throw new WGSLCompileError(failures.map(message=>`${message.lineNum}:${message.linePos} ${message.message}`).join('\n'));pipeline=device.createComputePipelineAsync?await device.createComputePipelineAsync({label:'Filter FabJS compute pipeline',layout:'auto',compute:{module,entryPoint:'main'}}):device.createComputePipeline({label:'Filter FabJS compute pipeline',layout:'auto',compute:{module,entryPoint:'main'}})}finally{error=await device.popErrorScope()}
    if(error)throw new Error(error.message);this.pipelineCache.set(plan.key,pipeline);return pipeline;
  }
  render(args){const job=this.operationQueue.then(()=>this.performRender(args));this.operationQueue=job.catch(()=>{});return job}
  async performRender({program,controls,onProgress}){
    if(!this.sourceBuffer||!this.width||!this.height)throw new Error('WebGPU source is not initialized');const plan=WGSLCompiler.compile(program);this.lastShader=plan.code;this.onCompile?.({wgsl:plan.code,analysis:plan.analysis});const device=await this.ensureDevice(),pipeline=await this.pipelineFor(plan),bindGroup=device.createBindGroup({layout:pipeline.getBindGroupLayout(0),entries:[{binding:0,resource:{buffer:this.sourceBuffer}},{binding:1,resource:{buffer:this.outputBuffer}},{binding:2,resource:{buffer:this.paramsBuffer}}]}),token=this.cancelVersion,start=performance.now(),chunkRows=128;this.active=true;
    try{
      for(let row=0;row<this.height;row+=chunkRows){if(token!==this.cancelVersion)throw new RenderCancelledError();const rows=Math.min(chunkRows,this.height-row);this.writeParams(row,rows,controls);const encoder=device.createCommandEncoder({label:'Filter FabJS GPU tile'}),pass=encoder.beginComputePass();pass.setPipeline(pipeline);pass.setBindGroup(0,bindGroup);pass.dispatchWorkgroups(Math.ceil(this.width/8),Math.ceil(rows/8));pass.end();device.queue.submit([encoder.finish()]);await device.queue.onSubmittedWorkDone();if(token!==this.cancelVersion)throw new RenderCancelledError();onProgress?.({row:row+rows,total:this.height,pct:(row+rows)/this.height*100})}
      if(this.readbackBuffer.mapState==='mapped')this.readbackBuffer.unmap();const copy=device.createCommandEncoder({label:'Filter FabJS GPU readback'});copy.copyBufferToBuffer(this.outputBuffer,0,this.readbackBuffer,0,this.width*this.height*4);device.queue.submit([copy.finish()]);await this.readbackBuffer.mapAsync(GPUMapMode.READ,0,this.width*this.height*4);if(token!==this.cancelVersion){this.readbackBuffer.unmap();throw new RenderCancelledError()}const raw=this.readbackBuffer.getMappedRange(0,this.width*this.height*4).slice(0);this.readbackBuffer.unmap();const words=new Uint32Array(raw),pixels=new Uint8ClampedArray(words.length*4);for(let i=0;i<words.length;i++){const v=words[i],o=i*4;pixels[o]=v&255;pixels[o+1]=(v>>>8)&255;pixels[o+2]=(v>>>16)&255;pixels[o+3]=(v>>>24)&255}return{pixels,ms:performance.now()-start,backend:this.id,label:this.label};
    }finally{this.active=false}
  }
  async cancel(){const hadWork=this.active;this.cancelVersion++;return hadWork}
  dispose(){this.cancelVersion++;this.active=false;this.destroyBuffers();this.pipelineCache.clear();try{this.device?.destroy?.()}catch{}this.device=null;this.adapter=null;this.source=null;this.width=this.height=0}
}
