import assert from 'node:assert/strict';
import { FilterThumbnailService, THUMBNAIL_CACHE_LIMIT, THUMBNAIL_CONCURRENCY, THUMBNAIL_MAX_DIMENSION, thumbnailDimensions } from '../src/app/filter-thumbnail-service.js';
import { RenderCancelledError } from '../src/renderers/renderer-backend.js';

const immediatePrepare=(pixels,width,height,{maxDimension})=>{const dimensions=thumbnailDimensions(width,height,maxDimension);return{pixels:new Uint8ClampedArray(dimensions.width*dimensions.height*4).fill(pixels?.[0]||0),...dimensions}};
const request=(service,signature,{entryKey=signature,program={name:signature},controls=[128],legacyMath=false,priority=0}={})=>{const events=[];service.request({entryKey,signature,program,controls,legacyMath},event=>events.push(event),{priority});return events};

class FakeManager{
  constructor({failPrograms=[]}={}){this.failPrograms=new Set(failPrograms);this.sources=[];this.calls=[];this.concurrent=0;this.maxConcurrent=0;this.cancelCalls=0;this.disposed=false}
  async setSource(pixels,width,height){this.sources.push({pixels,width,height})}
  async renderWithFallback(args){this.calls.push(args);this.concurrent++;this.maxConcurrent=Math.max(this.maxConcurrent,this.concurrent);try{await Promise.resolve();if(!args.isCurrent())throw new RenderCancelledError();if(this.failPrograms.has(args.program.name)){const error=new Error(args.program.name==='budget'?'CPU render cost exceeds the work-unit limit':'thumbnail failed');if(args.program.name==='budget')error.name='RenderBudgetError';throw error}const value=this.calls.length;return{result:{pixels:new Uint8ClampedArray(this.sources.at(-1).width*this.sources.at(-1).height*4).fill(value),ms:1,backend:'cpu',label:'CPU Worker'}}}finally{this.concurrent--}}
  cancelActive(){this.cancelCalls++;return false}
  dispose(){this.disposed=true}
}

class DeferredManager extends FakeManager{
  constructor(){super();this.pending=[]}
  renderWithFallback(args){this.calls.push(args);this.concurrent++;this.maxConcurrent=Math.max(this.maxConcurrent,this.concurrent);return new Promise((resolve,reject)=>this.pending.push({args,resolve:value=>{this.concurrent--;resolve({result:{pixels:new Uint8ClampedArray(this.sources.at(-1).width*this.sources.at(-1).height*4).fill(value),ms:1,backend:'cpu',label:'CPU Worker'}})},reject:error=>{this.concurrent--;reject(error)}}))}
  cancelActive(){this.cancelCalls++;const job=this.pending.shift();if(job){job.reject(new RenderCancelledError());return true}return false}
}

assert.deepEqual(thumbnailDimensions(1024,1024),{width:160,height:160});
assert.deepEqual(thumbnailDimensions(1920,1080),{width:160,height:90},'thumbnail source must preserve landscape aspect ratio');
assert.deepEqual(thumbnailDimensions(1080,1920),{width:90,height:160},'thumbnail source must preserve portrait aspect ratio');
assert.deepEqual(thumbnailDimensions(64,32),{width:64,height:32},'small sources must not be upscaled');
assert.equal(THUMBNAIL_MAX_DIMENSION,160);assert.equal(THUMBNAIL_CACHE_LIMIT,48);assert.equal(THUMBNAIL_CONCURRENCY,1);

{
  const manager=new FakeManager(),service=new FilterThumbnailService({rendererManager:manager,prepareSource:immediatePrepare,cacheLimit:2});
  await service.setSource(new Uint8ClampedArray([7,0,0,255]),1,1);service.open();
  const first=request(service,'same-render',{entryKey:'builtin:first'});await service.whenIdle();assert.deepEqual(first.map(event=>event.state),['queued','rendering','ready']);assert.equal(manager.calls.length,1);
  const metadataOnly=request(service,'same-render',{entryKey:'custom:renamed'});assert.equal(metadataOnly.at(-1).state,'ready','metadata-only identity changes must reuse render-semantic cache entries');assert.equal(metadataOnly.at(-1).cached,true);assert.equal(manager.calls.length,1);
  request(service,'formula-change');await service.whenIdle();request(service,'control-change');await service.whenIdle();assert.equal(manager.calls.length,3,'formula and control signature changes must rerender');assert.equal(service.diagnostics().cacheSize,2,'thumbnail cache must stay within its LRU entry bound');assert.equal(service.cache.has(service.cacheKey('same-render')),false,'the least-recently-used thumbnail must be evicted');
  const revision=service.diagnostics().sourceRevision;await service.setSource(new Uint8ClampedArray([8,0,0,255]),1,1);assert.equal(service.diagnostics().sourceRevision,revision+1);assert.equal(service.diagnostics().cacheSize,0,'a new source must invalidate the old-source cache');request(service,'control-change');await service.whenIdle();assert.equal(manager.calls.length,4,'the same filter signature must rerender for a new source');service.dispose();assert.equal(manager.disposed,true);
}

{
  const manager=new FakeManager(),service=new FilterThumbnailService({rendererManager:manager,prepareSource:immediatePrepare});await service.setSource(new Uint8ClampedArray(16),2,2);service.open();assert.equal(manager.calls.length,0,'opening the library must not eagerly render filters');service.suspend();const low=request(service,'low',{priority:10}),selected=request(service,'selected',{priority:100});assert.equal(manager.calls.length,0);service.resume();await service.whenIdle();assert.deepEqual(manager.calls.map(call=>call.program.name),['selected','low'],'selected candidates must outrank ordinary visible-card jobs');assert.equal(manager.maxConcurrent,1,'thumbnail concurrency must remain one');assert.equal(selected.at(-1).state,'ready');assert.equal(low.at(-1).state,'ready');
  service.suspend();request(service,'hidden-a');request(service,'hidden-b');service.clearRequests();service.resume();await service.whenIdle();assert.equal(manager.calls.length,2,'search refresh must be able to remove hidden pending jobs');service.dispose();
}

{
  const manager=new DeferredManager(),service=new FilterThumbnailService({rendererManager:manager,prepareSource:immediatePrepare});await service.setSource(new Uint8ClampedArray(16),2,2);service.open();const events=request(service,'interruptible');while(!manager.pending.length)await Promise.resolve();service.suspend();while(manager.concurrent||events.at(-1).state!=='queued')await Promise.resolve();assert.equal(events.at(-1).state,'queued','main rendering must return interrupted thumbnail work to the queue');service.resume();while(!manager.pending.length)await Promise.resolve();manager.pending.shift().resolve(4);await service.whenIdle();assert.equal(events.at(-1).state,'ready');assert.equal(manager.calls.length,2,'an interrupted thumbnail must resume without affecting main work');
  const stale=request(service,'stale-filter');while(!manager.pending.length)await Promise.resolve();service.clearRequests();while(manager.concurrent)await Promise.resolve();assert.notEqual(stale.at(-1).state,'ready','cleared DOM requests must never receive a stale result');
  const closing=request(service,'closing');while(!manager.pending.length)await Promise.resolve();await service.close();assert.equal(service.diagnostics().queueLength,0);assert.equal(service.diagnostics().opened,false);assert.notEqual(closing.at(-1).state,'ready','closing the library must cancel active thumbnail UI work');service.dispose();
}

{
  const manager=new FakeManager({failPrograms:['bad','budget']}),service=new FilterThumbnailService({rendererManager:manager,prepareSource:immediatePrepare});await service.setSource(new Uint8ClampedArray(16),2,2);service.open();const bad=request(service,'bad',{program:{name:'bad'}}),budget=request(service,'budget',{program:{name:'budget'}}),good=request(service,'good');await service.whenIdle();assert.equal(bad.at(-1).state,'failed');assert.equal(budget.at(-1).state,'failed','render-budget rejection must degrade to an unavailable thumbnail');assert.equal(good.at(-1).state,'ready','one thumbnail failure must not stop the queue');assert.equal(service.diagnostics().failures,2);service.dispose();
}

{
  const manager=new FakeManager(),preparations=[];
  const service=new FilterThumbnailService({rendererManager:manager,prepareSource:(pixels,width,height)=>new Promise(resolve=>preparations.push({pixels,width,height,resolve}))});
  const oldSource=service.setSource(new Uint8ClampedArray([1,0,0,255]),1,1),newSource=service.setSource(new Uint8ClampedArray([2,0,0,255]),1,1);while(preparations.length<2)await Promise.resolve();preparations[0].resolve({pixels:new Uint8ClampedArray([1,0,0,255]),width:1,height:1});preparations[1].resolve({pixels:new Uint8ClampedArray([2,0,0,255]),width:1,height:1});await Promise.all([oldSource,newSource]);assert.equal(manager.sources.length,1,'a stale source preparation must be discarded');assert.equal(manager.sources[0].pixels[0],2);service.dispose();
}

console.log('Lazy thumbnail source, cache, queue, cancellation and failure smoke checks passed.');
