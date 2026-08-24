/**
 * Filter FabJS
 * Modular source extracted from v2.0.7; modular architecture v2.1.0.
 * Licensed GPL-2.0-or-later. See LICENSE and README.md.
 */
import { RendererBackend, RenderCancelledError } from './renderer-backend.js';
import { MAX_FRACTAL_ITERATIONS } from '../core/formula-language.js';
import { programCacheKey } from '../core/ir.js';

export const MAX_CPU_RENDER_WORK=3_000_000_000;
const CPU_CALL_WEIGHTS=Object.freeze({src:2,src0:2,src1:2,srcWrap:2,srcMirror:2,srcLinear:5,rad:3,rad0:3,rad1:3,cnv:10,cnv0:10,cnv1:10,hash2:4,valueNoise:12,perlin:20,worleyF1:30,worleyF2:30,fbm:240,turbulence:240,ridged:240,periodicNoise:12,mandelbrot:MAX_FRACTAL_ITERATIONS,julia:MAX_FRACTAL_ITERATIONS,sierpinski:12});

export class RenderBudgetError extends Error{constructor(message){super(message);this.name='RenderBudgetError'}}

export function estimateCpuProgramCost(program){
  if(!Array.isArray(program?.outputs)||program.outputs.length!==4)return Infinity;
  let cost=0;const stack=program.outputs.map(output=>output?.expression);
  while(stack.length){const node=stack.pop();if(!node||typeof node!=='object')return Infinity;cost+=node.op==='call'?(CPU_CALL_WEIGHTS[node.fn]||1):1;switch(node.op){case'const':case'var':break;case'unary':stack.push(node.input);break;case'binary':stack.push(node.left,node.right);break;case'select':stack.push(node.condition,node.whenTrue,node.whenFalse);break;case'call':if(!Array.isArray(node.args))return Infinity;stack.push(...node.args);break;default:return Infinity}}
  return cost;
}

export function assertCpuRenderBudget(program,width,height){
  const pixels=width*height,cost=estimateCpuProgramCost(program);
  if(!Number.isSafeInteger(pixels)||pixels<1||!Number.isFinite(cost)||cost>MAX_CPU_RENDER_WORK/pixels)throw new RenderBudgetError(`CPU render cost exceeds the ${MAX_CPU_RENDER_WORK.toLocaleString('en-US')} work-unit limit`);
  return cost*pixels;
}

export class CpuRenderer extends RendererBackend{
  constructor(programFactory){super('cpu','CPU Worker');this.programFactory=programFactory;this.worker=null;this.workerProgramKey=null;this.source=null;this.width=0;this.height=0;this.pending=new Map();this.readyPromise=Promise.resolve();this.resolveReady=null;this.rejectReady=null}
  spawnWorker(){
    this.worker?.terminate();
    const workerUrl=URL.createObjectURL(new Blob([this.programFactory()],{type:'application/javascript'}));
    const worker=new Worker(workerUrl);this.worker=worker;this.workerProgramKey=null;URL.revokeObjectURL(workerUrl);
    this.readyPromise=new Promise((resolve,reject)=>{this.resolveReady=resolve;this.rejectReady=reject});
    worker.onmessage=e=>{
      if(this.worker!==worker)return;
      const m=e.data;
      if(m.type==='ready'){this.resolveReady?.();this.resolveReady=this.rejectReady=null;return}
      const job=this.pending.get(m.id);if(!job)return;
      if(m.type==='progress'){job.onProgress?.(m);return}
      if(m.type==='result'){this.pending.delete(m.id);job.resolve({pixels:new Uint8ClampedArray(m.buffer),ms:m.ms,backend:this.id,label:this.label})}
    };
    worker.onerror=e=>this.failWorker(worker,new Error(e.message||`${this.label} failed`));
    worker.onmessageerror=e=>this.failWorker(worker,new Error(e.message||`${this.label} message failed`));
  }
  failWorker(worker,error){if(this.worker!==worker)return;this.worker=null;this.workerProgramKey=null;this.rejectReady?.(error);this.resolveReady=this.rejectReady=null;this.rejectPending(error);worker.terminate();this.readyPromise=Promise.resolve()}
  rejectPending(error){for(const job of this.pending.values())job.reject(error);this.pending.clear()}
  postSource(){
    if(!this.worker||!this.source||!this.width||!this.height)return;
    const copy=this.source.slice();
    this.worker.postMessage({type:'init',width:this.width,height:this.height,buffer:copy.buffer},[copy.buffer]);
  }
  ensureWorker(){if(!this.worker){this.spawnWorker();this.postSource()}return this.readyPromise}
  setSource(pixels,width,height){
    this.source=pixels instanceof Uint8ClampedArray?pixels:new Uint8ClampedArray(pixels);this.width=width;this.height=height;
    this.rejectPending(new RenderCancelledError('Source replaced'));
    this.spawnWorker();this.postSource();return this.readyPromise;
  }
  async render({id,program,controls,legacyMath,onProgress}){
    if(!this.source||!this.width||!this.height)throw new Error('Renderer source is not initialized');
    assertCpuRenderBudget(program,this.width,this.height);
    await this.ensureWorker();
    if(!this.worker)throw new Error(`${this.label} is unavailable`);
    return new Promise((resolve,reject)=>{
      this.pending.set(id,{resolve,reject,onProgress});
      try{const key=programCacheKey(program),message={type:'render',id,programKey:key,controls,legacyMath};if(key!==this.workerProgramKey)message.program=program;this.worker.postMessage(message);this.workerProgramKey=key}
      catch(error){this.pending.delete(id);reject(error)}
    });
  }
  async cancel(){
    const hadWork=this.pending.size>0;
    const error=new RenderCancelledError();
    this.rejectReady?.(error);this.resolveReady=this.rejectReady=null;
    this.rejectPending(error);
    this.worker?.terminate();this.worker=null;this.workerProgramKey=null;this.readyPromise=Promise.resolve();
    return hadWork;
  }
  releaseSource(){
    const error=new RenderCancelledError('Source released');
    this.rejectReady?.(error);this.resolveReady=this.rejectReady=null;
    this.rejectPending(error);this.worker?.terminate();this.worker=null;this.workerProgramKey=null;
    this.source=null;this.width=this.height=0;this.readyPromise=Promise.resolve();
  }
  dispose(){
    const error=new RenderCancelledError('Renderer disposed');
    this.rejectReady?.(error);this.resolveReady=this.rejectReady=null;
    this.rejectPending(error);this.worker?.terminate();this.worker=null;this.workerProgramKey=null;
    this.source=null;this.width=this.height=0;
  }
}
