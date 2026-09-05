import assert from 'node:assert/strict';
import { applyPresetSafely, findCustomPresetById, importLatestFilterFile, initializeImagePreview, normalizeCustomPresetList, upsertCustomPreset, validateFilterForPersistence } from '../src/app/filter-fab-app.js';

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
  const existing={format:'filter-fab-js',version:2,name:'Existing',description:'Old description',id:'preset-existing',formulas:['r','g','b','a']},replacement={format:'filter-fab-js',version:2,description:'Replacement description',formulas:['255-r','g','b','a']};
  const updated=upsertCustomPreset([existing],replacement,'Existing',()=>assert.fail('overwriting a preset must preserve its stable ID'));
  assert.equal(updated.preset.id,'preset-existing');assert.equal(updated.preset.description,'Replacement description','overwriting a local preset must preserve edited description metadata');assert.equal(updated.list[0],updated.preset);
  const added=upsertCustomPreset(updated.list,replacement,'Added',()=> 'preset-added');
  assert.equal(added.preset.id,'preset-added');assert.equal(added.preset.description,'Replacement description','new local presets must carry description metadata');assert.equal(findCustomPresetById(added.list,'preset-existing').name,'Existing');assert.equal(findCustomPresetById(added.list,'preset-added').name,'Added');
}

console.log('App workflow smoke checks passed.');
