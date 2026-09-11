import { imageDataFromPixels } from '../io/image-io.js';

export const THUMBNAIL_MAX_DIMENSION=160;
export const THUMBNAIL_CACHE_LIMIT=48;
export const THUMBNAIL_CONCURRENCY=1;

export function thumbnailDimensions(width,height,maxDimension=THUMBNAIL_MAX_DIMENSION){
  if(!Number.isInteger(width)||!Number.isInteger(height)||width<1||height<1)throw new Error('Thumbnail source dimensions must be positive integers');
  if(!Number.isInteger(maxDimension)||maxDimension<1)throw new Error('Thumbnail maximum dimension must be a positive integer');
  const scale=Math.min(1,maxDimension/Math.max(width,height));
  return{width:Math.max(1,Math.round(width*scale)),height:Math.max(1,Math.round(height*scale))};
}

export function prepareThumbnailSource(pixels,width,height,{maxDimension=THUMBNAIL_MAX_DIMENSION}={}){
  const dimensions=thumbnailDimensions(width,height,maxDimension),count=width*height;
  if(!Number.isSafeInteger(count)||pixels?.length!==count*4)throw new Error('Thumbnail source pixel length does not match its dimensions');
  const sourcePixels=pixels instanceof Uint8ClampedArray?pixels:new Uint8ClampedArray(pixels);
  if(dimensions.width===width&&dimensions.height===height)return{pixels:sourcePixels.slice(),...dimensions};
  if(!globalThis.document?.createElement)throw new Error('Canvas thumbnail preparation is unavailable');
  const sourceCanvas=document.createElement('canvas'),targetCanvas=document.createElement('canvas');sourceCanvas.width=width;sourceCanvas.height=height;targetCanvas.width=dimensions.width;targetCanvas.height=dimensions.height;
  const sourceContext=sourceCanvas.getContext('2d',{alpha:true,willReadFrequently:true}),targetContext=targetCanvas.getContext('2d',{alpha:true,willReadFrequently:true});
  if(!sourceContext||!targetContext)throw new Error('Canvas thumbnail preparation is unavailable');
  sourceContext.putImageData(imageDataFromPixels(sourcePixels,width,height),0,0);targetContext.imageSmoothingEnabled=true;targetContext.imageSmoothingQuality='high';targetContext.clearRect(0,0,dimensions.width,dimensions.height);targetContext.drawImage(sourceCanvas,0,0,dimensions.width,dimensions.height);
  return{pixels:targetContext.getImageData(0,0,dimensions.width,dimensions.height).data,...dimensions};
}

function cancellation(error){return error?.name==='RenderCancelledError'}

export class FilterThumbnailService{
  constructor({rendererManager,prepareSource=prepareThumbnailSource,maxDimension=THUMBNAIL_MAX_DIMENSION,cacheLimit=THUMBNAIL_CACHE_LIMIT,getPreference=()=> 'auto'}={}){
    if(!rendererManager?.setSource||!rendererManager?.renderWithFallback)throw new Error('Thumbnail renderer manager is required');
    if(!Number.isInteger(cacheLimit)||cacheLimit<1)throw new Error('Thumbnail cache limit must be a positive integer');
    this.rendererManager=rendererManager;this.prepareSource=prepareSource;this.maxDimension=maxDimension;this.cacheLimit=cacheLimit;this.getPreference=getPreference;this.cache=new Map();this.queue=[];this.active=null;this.opened=false;this.suspended=false;this.pumping=false;this.sourceRevision=0;this.requestGeneration=0;this.renderId=0;this.sequence=0;this.width=0;this.height=0;this.sourceReady=false;this.sourcePromise=Promise.resolve(false);this.idleWaiters=[];this.stats={hits:0,misses:0,renders:0,failures:0,cancellations:0,invalidations:0};
  }
  cacheKey(signature){return`${this.sourceRevision}\u0000${this.width}x${this.height}\u0000${signature}`}
  notify(job,state){if(job.generation!==this.requestGeneration||job.sourceRevision!==this.sourceRevision)return;for(const callback of job.callbacks){try{callback(state)}catch{}}}
  cached(key){const value=this.cache.get(key);if(!value)return null;this.cache.delete(key);this.cache.set(key,value);return value}
  remember(key,value){this.cache.delete(key);this.cache.set(key,value);while(this.cache.size>this.cacheLimit)this.cache.delete(this.cache.keys().next().value)}
  async cancelManager(){try{return await this.rendererManager.cancelActive()}catch{return false}}
  clearRequests(){
    this.requestGeneration++;this.queue.length=0;
    if(this.active){this.active.discarded=true;this.stats.cancellations++;}
    const cancellationPromise=this.cancelManager();this.resolveIdle();return cancellationPromise;
  }
  async setSource(pixels,width,height){
    const dimensions=thumbnailDimensions(width,height,this.maxDimension),revision=++this.sourceRevision;this.stats.invalidations++;this.sourceReady=false;this.width=dimensions.width;this.height=dimensions.height;this.cache.clear();void this.clearRequests();
    const sourcePromise=(async()=>{
      const prepared=await this.prepareSource(pixels,width,height,{maxDimension:this.maxDimension});
      if(revision!==this.sourceRevision)return false;
      if(prepared?.width!==dimensions.width||prepared?.height!==dimensions.height||prepared?.pixels?.length!==dimensions.width*dimensions.height*4)throw new Error('Prepared thumbnail source is malformed');
      await this.rendererManager.setSource(prepared.pixels,prepared.width,prepared.height);
      if(revision!==this.sourceRevision)return false;this.sourceReady=true;this.pump();return true;
    })();
    this.sourcePromise=sourcePromise;return sourcePromise;
  }
  open(){this.opened=true;this.suspended=false;this.pump()}
  close(){this.opened=false;this.suspended=false;return this.clearRequests()}
  suspend(){if(this.suspended)return;this.suspended=true;if(this.active){this.active.interrupted=true;this.stats.cancellations++;void this.cancelManager();}}
  resume(){if(!this.suspended)return;this.suspended=false;this.pump()}
  request({entryKey='',signature,program,controls,legacyMath=false},callback,{priority=0}={}){
    if(typeof callback!=='function')throw new Error('Thumbnail state callback is required');
    if(typeof signature!=='string'||!signature)throw new Error('Thumbnail render signature is required');
    if(!program)throw new Error('Thumbnail program is required');
    if(this.sourceRevision<1){callback({state:'failed',error:new Error('Thumbnail source is unavailable')});return{cached:false}}
    const key=this.cacheKey(signature),cached=this.cached(key);
    if(cached){this.stats.hits++;callback({state:'ready',...cached,cached:true});return{cached:true,key}}
    this.stats.misses++;
    const duplicate=(this.active?.key===key&&!this.active.discarded?this.active:null)||this.queue.find(job=>job.key===key&&job.generation===this.requestGeneration);
    if(duplicate){duplicate.priority=Math.max(duplicate.priority,priority);if(!duplicate.callbacks.includes(callback))duplicate.callbacks.push(callback);this.queue.sort((a,b)=>b.priority-a.priority||a.sequence-b.sequence);callback({state:this.active===duplicate?'rendering':'queued'});return{cached:false,key}}
    const job={key,entryKey,signature,program,controls:[...(controls||[])],legacyMath:Boolean(legacyMath),priority:Number(priority)||0,sequence:++this.sequence,generation:this.requestGeneration,sourceRevision:this.sourceRevision,callbacks:[callback],interrupted:false,discarded:false};
    this.queue.push(job);this.queue.sort((a,b)=>b.priority-a.priority||a.sequence-b.sequence);callback({state:'queued'});this.pump();return{cached:false,key};
  }
  canRun(){return this.opened&&!this.suspended&&this.sourceRevision>0}
  current(job){return this.canRun()&&!job.discarded&&job.generation===this.requestGeneration&&job.sourceRevision===this.sourceRevision&&this.active===job}
  failQueued(error){const jobs=this.queue.splice(0);for(const job of jobs){this.stats.failures++;this.notify(job,{state:'failed',error})}}
  pump(){if(this.pumping||!this.canRun()||!this.queue.length)return;this.pumping=true;queueMicrotask(()=>this.runQueue())}
  async runQueue(){
    try{
      try{await this.sourcePromise}catch(error){this.failQueued(error);return}
      if(!this.sourceReady)return;
      while(this.canRun()&&this.queue.length){
        const job=this.queue.shift();if(job.generation!==this.requestGeneration||job.sourceRevision!==this.sourceRevision)continue;
        this.active=job;job.interrupted=false;this.notify(job,{state:'rendering'});const id=++this.renderId;
        try{
          const outcome=await this.rendererManager.renderWithFallback({id,program:job.program,preference:this.getPreference(),controls:job.controls,legacyMath:job.legacyMath,isCurrent:()=>this.current(job)});
          if(!this.current(job))continue;
          const result=outcome.result,value={pixels:result.pixels,width:this.width,height:this.height,backend:result.backend,ms:result.ms};this.remember(job.key,value);this.stats.renders++;this.notify(job,{state:'ready',...value,cached:false});
        }catch(error){
          const requested=!job.discarded&&job.generation===this.requestGeneration&&job.sourceRevision===this.sourceRevision;
          if(requested&&job.interrupted&&this.opened){job.interrupted=false;this.queue.unshift(job);this.notify(job,{state:'queued'});break;}
          if(requested&&!cancellation(error)){this.stats.failures++;this.notify(job,{state:'failed',error});}
        }finally{if(this.active===job)this.active=null}
      }
    }finally{
      this.pumping=false;this.resolveIdle();if(this.canRun()&&this.queue.length)queueMicrotask(()=>this.pump());
    }
  }
  resolveIdle(){if(this.pumping||this.active||this.queue.length)return;for(const resolve of this.idleWaiters.splice(0))resolve()}
  whenIdle(){if(!this.pumping&&!this.active&&!this.queue.length)return Promise.resolve();return new Promise(resolve=>this.idleWaiters.push(resolve))}
  diagnostics(){return Object.freeze({sourceRevision:this.sourceRevision,width:this.width,height:this.height,queueLength:this.queue.length,cacheSize:this.cache.size,cacheLimit:this.cacheLimit,active:Boolean(this.active),suspended:this.suspended,opened:this.opened,maxConcurrency:THUMBNAIL_CONCURRENCY,...this.stats})}
  dispose(){this.opened=false;this.suspended=false;void this.clearRequests();this.cache.clear();this.rendererManager.dispose();}
}
