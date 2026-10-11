import assert from 'node:assert/strict';
import { applyPresetSafely, findCustomPresetById, importLatestFilterFile, initializeImagePreview, normalizeCustomPresetList, replaceStartupDemo, upsertCustomPreset, validateFilterForPersistence } from '../src/app/filter-fab-app.js';
import { loadDemoSplash } from '../src/io/image-io.js';

function deferred(){let resolve,reject;const promise=new Promise((nextResolve,nextReject)=>{resolve=nextResolve;reject=nextReject;});return{promise,resolve,reject};}
function filterText(name,description=''){return JSON.stringify({format:'filter-fab-js',version:2,name,description,formulas:['r','g','b','a']});}
function filterFile(name,textPromise){return{name:`${name}.json`,size:128,text:()=>textPromise};}

{
  const state={filterLoadId:0,isRendering:false},firstText=deferred(),secondText=deferred(),applied=[];
  const dependencies={state,cancelRender:async()=>assert.fail('stale imports must not cancel rendering'),applyFilter:filter=>applied.push({name:filter.name,description:filter.description})};
  const first=importLatestFilterFile(filterFile('first',firstText.promise),dependencies);
  const second=importLatestFilterFile(filterFile('second',secondText.promise),dependencies);
  secondText.resolve(filterText('Second','Newest description'));
  const secondResult=await second;
  assert.equal(secondResult.data.name,'Second','the newest completed import must be applied');
  assert.equal(secondResult.data.description,'Newest description','native import must preserve description metadata');
  firstText.resolve(filterText('First'));
  assert.equal(await first,null,'an older import that completes last must be ignored');
  assert.deepEqual(applied,[{name:'Second',description:'Newest description'}],'a stale import must not overwrite the newer described filter');
}

{
  const events=[],state={filterLoadId:0,isRendering:true};
  const result=await importLatestFilterFile(filterFile('active-render',Promise.resolve(filterText('Imported'))),{
    state,
    cancelRender:async()=>{events.push('cancel');state.isRendering=false;},
    applyFilter:filter=>events.push(`apply:${filter.name}`)
  });
  assert.equal(result.data.name,'Imported');
  assert.deepEqual(events,['cancel','apply:Imported'],'the active render must be cancelled before an imported filter mutates editor state');
}

{
  let validationError=null,persisted=false;
  const invalid={format:'filter-fab-js',version:2,name:'Invalid',formulas:['r+','g','b','a'],controls:[]};
  const filter=validateFilterForPersistence(invalid,error=>{validationError=error;});
  if(filter)persisted=true;
  assert.equal(filter,null,'invalid editor formulas must not produce a persistable filter');
  assert.equal(persisted,false,'invalid filters must not reach persistence');
  assert.match(validationError?.message||'',/channel 1/i,'persistence validation must identify the invalid channel');
}

{
  const events=[],selection='custom:0';let deleteEnabled=false,caughtError=null;
  const applied=applyPresetSafely({name:'Broken preset'},selection,{
    updatePresetDeleteState:()=>{events.push('delete-state');deleteEnabled=selection.startsWith('custom:');},
    applyFilter:()=>{events.push('apply');throw new Error('missing formulas');},
    onError:error=>{events.push('error');caughtError=error;}
  });
  assert.equal(applied,false,'a malformed preset must not be reported as applied');
  assert.deepEqual(events,['delete-state','apply','delete-state','error'],'delete state must update before validation and again after a caught failure');
  assert.equal(deleteEnabled,true,'a malformed custom preset must remain deletable');
  assert.match(caughtError?.message||'',/missing formulas/,'preset validation errors must reach the UI error handler');
}

{
  const events=[],pixels=new Uint8ClampedArray([10,20,30,255]),state={source:null,filtered:null,width:0,height:0};
  const canvas={set width(value){events.push(`width:${value}`);this._width=value;},get width(){return this._width;},set height(value){events.push(`height:${value}`);this._height=value;},get height(){return this._height;}};
  const canvasView={
    invalidatePixels:()=>events.push('invalidate'),
    fitCanvas:()=>events.push('fit'),
    drawView:()=>{events.push('draw');assert.equal(canvas.width,1);assert.equal(canvas.height,1);assert.equal(state.filtered,pixels);}
  };
  initializeImagePreview(pixels,1,1,{state,canvasView,canvas});
  assert.equal(state.source,pixels,'initial preview setup must retain an immutable clamped source without copying it');
  assert.equal(state.filtered,state.source,'the initial filtered preview must display the source pixels');
  assert.deepEqual(events,['invalidate','width:1','height:1','fit','draw'],'the source preview must draw only after the canvas has its new dimensions');
}

{
  let generated=0;const idFactory=()=>`preset-generated-${++generated}`;
  const legacy={name:'Legacy'},stable={name:'Stable',id:'preset-stable'},duplicate={name:'Duplicate',id:'preset-stable'},numeric={name:'Numeric ID',id:123},hidden=null;
  const normalized=normalizeCustomPresetList([legacy,stable,duplicate,numeric,hidden],idFactory);
  assert.equal(normalized.migrated,true,'legacy, duplicate, and invalid preset IDs must trigger migration');
  assert.deepEqual(normalized.presets.map(preset=>preset.id),['preset-generated-1','preset-stable','preset-generated-2','preset-generated-3']);
  assert.equal('id' in legacy,false,'legacy migration must not mutate the parsed source record');
  assert.equal(normalized.storageList.at(-1),hidden,'migration must preserve unrelated malformed storage entries');
  assert.equal(findCustomPresetById(normalized.presets.slice(1),'preset-stable'),stable,'stable ID lookup must keep selecting the same record after an earlier entry disappears');
  assert.equal(findCustomPresetById(normalized.presets.slice(1),'preset-generated-1'),null,'a removed stable ID must not resolve to the record that shifted into its old index');
}

{
  const controlUI={widget:'slider',displayMin:0,displayMax:100,step:1,format:'number',unit:'%'},existing={format:'filter-fab-js',version:2,name:'Existing',description:'Old description',id:'preset-existing',formulas:['r','g','b','a']},replacement={format:'filter-fab-js',version:2,description:'Replacement description',formulas:['255-r','g','b','a'],controls:[{label:'Mix',value:192,ui:controlUI}]};
  const updated=upsertCustomPreset([existing],replacement,'Existing',()=>assert.fail('overwriting a preset must preserve its stable ID'));
  assert.equal(updated.preset.id,'preset-existing');assert.equal(updated.preset.description,'Replacement description','overwriting a local preset must preserve edited description metadata');assert.deepEqual(updated.preset.controls[0].ui,controlUI,'overwriting a local preset must preserve rich control metadata');assert.equal(updated.list[0],updated.preset);
  const added=upsertCustomPreset(updated.list,replacement,'Added',()=> 'preset-added');
  assert.equal(added.preset.id,'preset-added');assert.equal(added.preset.description,'Replacement description','new local presets must carry description metadata');assert.deepEqual(added.preset.controls[0].ui,controlUI,'new local presets must carry rich control metadata');assert.equal(findCustomPresetById(added.list,'preset-existing').name,'Existing');assert.equal(findCustomPresetById(added.list,'preset-added').name,'Added');
}

{
  const pixels=new Uint8ClampedArray([10,20,30,128]),image={data:pixels,width:960,height:640};
  const state={imageLoadId:0,filter:'pass',controls:[0]},pending=deferred();let applied=0;
  const replacement=replaceStartupDemo({state,load:()=>pending.promise,initImage:(data,width,height)=>{applied++;assert.equal(data,pixels);assert.equal(width,960);assert.equal(height,640);}});
  state.filter='edited';state.controls[0]=192;pending.resolve(image);
  assert.equal(await replacement,true);assert.equal(applied,1);
  assert.equal(state.filter,'edited');assert.deepEqual(state.controls,[192],'late startup completion must preserve controls and filter choice');
  for(const outcome of ['pending','completed','failed']){
    const load=deferred(),race=replaceStartupDemo({state,load:()=>load.promise,initImage:()=>assert.fail('startup must not replace a newer user image request')});
    state.imageLoadId++;state.source=outcome==='completed'?'user':'fallback';load.resolve(image);
    assert.equal(await race,false,`newer ${outcome} user requests must permanently supersede startup`);
  }
  assert.equal(await replaceStartupDemo({state,load:async()=>{throw new Error('offline');},initImage:()=>assert.fail('failed startup must retain fallback')}),false);
  assert.equal(await replaceStartupDemo({state,load:async()=>image,canReplace:()=>false,initImage:()=>assert.fail('startup must not invalidate an active library preview')}),false);
}

{
  const pixels=new Uint8ClampedArray(960*640*4);pixels.set([10,20,30,128]);
  let closed=0,drawn=0,signal;
  const bitmap={width:960,height:640,close:()=>closed++};
  const options={baseURI:'https://example.test/filter-fabjs/',timeoutMs:1000,
    fetchImpl:async(url,request)=>{assert.equal(url.href,'https://example.test/filter-fabjs/assets/demo-splash.png');assert.equal(request.mode,'same-origin');signal=request.signal;return{ok:true,blob:async()=>({type:'image/png'})};},
    decode:async()=>bitmap,
    createCanvas:()=>({getContext:(type,settings)=>{assert.equal(type,'2d');assert.equal(settings.alpha,true);return{drawImage:(value,x,y)=>{assert.equal(value,bitmap);assert.equal(x,0);assert.equal(y,0);drawn++;},getImageData:(x,y,width,height)=>{assert.equal(width,960);assert.equal(height,640);return{data:pixels};}};}})};
  const image=await loadDemoSplash(options);assert.equal(image.data,pixels);assert.equal(image.width,960);assert.equal(image.height,640);assert.equal(closed,1);assert.equal(drawn,1);assert.equal(signal.aborted,false);
  for(const status of [404,500])await assert.rejects(loadDemoSplash({...options,fetchImpl:async()=>({ok:false,status})}),/unavailable/);
  await assert.rejects(loadDemoSplash({...options,fetchImpl:async()=>{throw new Error('file URL blocked');}}),/blocked/);
  await assert.rejects(loadDemoSplash({...options,fetchImpl:async()=>({ok:true,blob:async()=>({type:'text/html'})})}),/PNG/);
  await assert.rejects(loadDemoSplash({...options,decode:async()=>{throw new Error('corrupt PNG');}}),/corrupt/);
  for(const dimensions of [[0,0],[959,640]]){
    const before=closed;
    await assert.rejects(loadDemoSplash({...options,decode:async()=>({width:dimensions[0],height:dimensions[1],close:()=>closed++})}),/960/);
    assert.equal(closed,before+1,'unexpected bitmap dimensions must close the bitmap');
  }
  const before=closed;
  await assert.rejects(loadDemoSplash({...options,createCanvas:()=>({getContext:()=>({drawImage:()=>{throw new Error('canvas failed');}})})}),/canvas failed/);
  assert.equal(closed,before+1,'canvas failures must close the bitmap');
  for(const phase of ['fetch','body','decode']){
    const pending=deferred();let timeoutSignal;
    const fetchImpl=async(url,request)=>{timeoutSignal=request.signal;if(phase==='fetch')return pending.promise;return{ok:true,blob:()=>phase==='body'?pending.promise:Promise.resolve({type:'image/png'})};};
    const before=closed;
    await assert.rejects(loadDemoSplash({...options,timeoutMs:5,fetchImpl,decode:()=>pending.promise}),/timed out/);
    assert.equal(timeoutSignal.aborted,true,'timeouts must abort pending requests');
    pending.resolve(phase==='decode'?bitmap:phase==='body'?{type:'image/png'}:{ok:true});
    await new Promise(resolve=>setTimeout(resolve,0));
    assert.equal(closed,before+(phase==='decode'?1:0),'late decoded bitmaps must be closed without drawing');
  }
}

console.log('App workflow smoke checks passed.');
