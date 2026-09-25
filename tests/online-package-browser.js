import { writeOnlineLibraryCache } from '../src/io/filter-library-cache.js';
import { packageFixtureBytes, packageFixtureDocument, packageFixtureMetadata } from './helpers/online-package-fixture.js';

const root=new URL('../',location.href),frame=document.querySelector('#app'),output=document.querySelector('#result'),run=document.querySelector('#run');
const parameters=new URLSearchParams(location.search),manual=parameters.has('manual'),savedMode=parameters.has('saved');
const a=packageFixtureDocument,b={...a,id:'fixture-online-b',name:'Online B',author:'Beatrice',description:'Invert green on your current image.',tags:['Colour','Cool'],formulas:['r','255-g','b','a']},bad={...a,id:'fixture-online-bad',name:'Online Broken'};
const packages=new Map([[a.id,await packageFixtureBytes(a)],[b.id,await packageFixtureBytes(b)]]),manifest={schema:'filter-fab-js/library',schemaVersion:1,libraryVersion:1,filters:[a,b,bad].map(document=>({...packageFixtureMetadata(document),preview:{url:document===bad?'intentionally-missing.png':document===b?'wave.png':'colour.png',width:128,height:128}}))};
// Cold aliases exercise real network races even after the main packages are cached.
const cold=[];
if(!manual)for(let i=0;i<8;i++){const document={...a,id:`fixture-cold-${i}`,name:`Cold race ${i}`};cold.push(document.id);packages.set(document.id,await packageFixtureBytes(document));manifest.filters.push(packageFixtureMetadata(document));}
let requests=[],holds=new Map(),failure=null,failManifest=parameters.has('manifestFailure'),finishManifest,manifestResponse;
const manifestUrl=new URL('tests/fixtures/online-library/catalogue.json',root).href;
if(savedMode){const records=new Map();window.packageFixtureStorage={getItem:key=>records.get(key)??null,setItem:(key,value)=>records.set(key,value)};writeOnlineLibraryCache({storage:window.packageFixtureStorage,manifestUrl,manifest});}
if(manual){run.hidden=true;output.textContent='Loading manual QA app…';}
window.packageFixtureFetch=async(url,options)=>{
  requests.push({url,signal:options.signal});
  if(manual)document.querySelector('#traffic').textContent=`Fixture requests: ${requests.filter(item=>item.url.endsWith('/catalogue.json')).length} catalogue, ${requests.filter(item=>!item.url.endsWith('/catalogue.json')).length} package. Completed package reuse does not increment these counts.`;
  if(url.endsWith('/catalogue.json')){if(savedMode){await new Promise(resolve=>finishManifest=resolve);return manifestResponse;}if(manual)await new Promise(resolve=>setTimeout(resolve,700));if(failManifest){failManifest=false;return new Response('Intentional manual QA failure',{status:503});}return new Response(JSON.stringify(manifest));}
  if(manual)await new Promise(resolve=>setTimeout(resolve,700));
  const id=url.split('/').at(-1).replace(/\.png$/,'');
  if(holds.has(id))await new Promise(resolve=>holds.set(id,resolve)); // Deliberately ignore abort to test late responses.
  if(failure===id)return new Response('failure',{status:503});
  return new Response(packages.get(id)||'invalid PNG');
};
const standalone=new URLSearchParams(location.search).has('standalone'),html=await(await fetch(new URL(standalone?'dist/filter-fabjs-v2.9.0.html':'index.html',root))).text();
const options=`{${savedMode?'onlineStorage:parent.packageFixtureStorage,':manual?'':'onlineStorage:null,'}onlineManifestUrl:${JSON.stringify(new URL('tests/fixtures/online-library/catalogue.json',root).href)},onlineFetchImpl:(...args)=>parent.packageFixtureFetch(...args)}`;
frame.srcdoc=html.replace('<head>',`<head><base href="${root.href}">`).replace(standalone?'initFilterFabApp();':'<script type="module" src="./src/main.js"></script>',standalone?`window.fixtureApp=initFilterFabApp(${options});`:`<script type="module">import {initFilterFabApp} from './src/app/filter-fab-app.js';window.fixtureApp=initFilterFabApp(${options});</script>`);
const until=async(test,label='condition')=>{const end=Date.now()+15000;while(!test()){if(Date.now()>end)throw new Error(`Timed out: ${label}`);await new Promise(resolve=>setTimeout(resolve,20));}};
await until(()=>frame.contentWindow.fixtureApp&&!frame.contentWindow.fixtureApp.state.isRendering,'app startup');run.disabled=false;output.textContent=manual?'Ready for manual QA. Open Filter Library → Source → Online. Downloads are real files; favorites and explicit saves use localhost browser storage.':'Ready';
run.onclick=async()=>{
  run.disabled=true;output.textContent='';const win=frame.contentWindow,doc=frame.contentDocument,app=win.fixtureApp,api=win.FilterFabJS,$=s=>doc.querySelector(s);
  if(new URLSearchParams(location.search).has('cpu'))app.state.rendererPreference='cpu';
  const assert=(condition,label)=>{if(!condition)throw new Error(label);output.textContent+=`PASS ${label}\n`;};
  const change=(s,value)=>{const node=$(s);node.value=value;node.dispatchEvent(new win.Event('change'));};
  const search=value=>{const node=$('[data-search]');node.value=value;node.dispatchEvent(new win.Event('input'));};
  const source=()=>change('[data-source]','online'),row=id=>$(`[data-entry-key="online:${id}"]`),action=(id,kind='preview')=>row(id).querySelector(`[data-entry-action="${kind}"]`);
  const snapshot=()=>JSON.stringify({identity:api.getLibraryPreviewState(),formulas:['R','G','B','A'].map(c=>$('#formula'+c).value),controls:app.state.controls,labels:app.state.labels,controlUIs:app.state.controlUIs,pending:app.state.hasPendingFormulaChanges,name:$('#filterName').value,program:api.getLastProgram(),diagnostics:api.getRendererDiagnostics(),pixels:Array.from(app.state.filtered),status:$('#statusText').textContent,formulaStatus:$('#formulaEditStatus').textContent});
  const pixels=()=>Array.from(app.state.filtered),equal=(a,b)=>a.length===b.length&&a.every((v,i)=>v===b[i]);
  const open=async()=>{$('#browseFiltersBtn').click();await until(()=>$('.filter-browser').open);$('[data-reset]').click();};
  const close=async(action='cancel')=>{$(`[data-${action}]`).click();await until(()=>!$('.filter-browser').open);};
  const preview=async id=>{source();await until(()=>row(id));action(id).click();await until(()=>api.getLibraryPreviewState().candidateKey===`online:${id}`&&api.getLibraryPreviewState().candidateRendered&&!$('[data-apply]').disabled,id);};
  const local=async name=>{change('[data-source]','builtin');search(name);$('.filter-results [data-entry-action="preview"]').click();await until(()=>api.getLibraryPreviewState().candidateRendered&&!$('[data-apply]').disabled);search('');};
  const heldAliases=new Map();
  const release=id=>{id=heldAliases.get(id)||id;const resolve=holds.get(id);holds.delete(id);resolve();};
  const hold=async originalId=>{const id=cold.shift();heldAliases.set(originalId,id);holds.set(id,null);source();await until(()=>row(id));action(id).click();await until(()=>typeof holds.get(id)==='function');};
  const settle=()=>new Promise(resolve=>setTimeout(resolve,150));
  const savedLibrary=localStorage.getItem('ffw-custom-presets'),prefKey='ffw-entry-v1:online:'+a.id,savedPref=localStorage.getItem(prefKey),prefBKey='ffw-entry-v1:online:'+b.id,savedPrefB=localStorage.getItem(prefBKey);
  const originalCreate=win.URL.createObjectURL,originalRevoke=win.URL.revokeObjectURL,originalClick=win.HTMLAnchorElement.prototype.click;
  try{
    assert(requests.length===0,'no startup catalogue or package traffic');
    // Small varied source makes baseline comparisons exact on either backend.
    const canvas=document.createElement('canvas');canvas.width=32;canvas.height=24;const ctx=canvas.getContext('2d');ctx.fillStyle='rgb(40,80,120)';ctx.fillRect(0,0,32,24);
    const sourceBlob=await new Promise(resolve=>canvas.toBlob(resolve));await app.loadImageFile(new win.File([sourceBlob],'source.png',{type:'image/png'}));await until(()=>!app.state.isRendering);
    $('#formulaR').value='r + 1';$('#formulaR').dispatchEvent(new win.Event('input',{bubbles:true}));
    await new Promise(resolve=>setTimeout(resolve,300));
    const baseline=pixels(),original=snapshot();
    if(savedMode){
      await open();assert(requests.length===0,'saved catalogue is not read or fetched by local browsing');source();
      assert(row(a.id)&&$('[data-online-message]').textContent.includes('Showing saved catalogue'),'saved cards appear while refresh is pending');
      await preview(a.id);const retained=snapshot();assert(requests.length===2,'saved card previews through real package validation during refresh');
      manifestResponse=new Response('offline',{status:503});finishManifest();await until(()=>$('[data-online-message]').textContent.includes('Could not refresh'));
      assert(snapshot()===retained&&row(a.id),'failed refresh preserves exact live candidate and cards');
      $('[data-online-retry]').click();assert(row(a.id)&&snapshot()===retained,'Retry keeps saved cards and candidate usable');
      manifestResponse=new Response(JSON.stringify({...manifest,libraryVersion:2,filters:manifest.filters.filter(entry=>entry.id===b.id)}));finishManifest();await until(()=>!row(a.id));
      assert(row(b.id)&&snapshot()===retained&&!$('[data-apply]').disabled,'accepted refresh removes card without changing its active candidate');
      await close();assert(snapshot()===original,'Cancel restores exact original after candidate card was removed');
      output.textContent+='Stage 4 saved catalogue browser checks passed.\n';return;
    }
    await open();assert(requests.length===0,'local library is still opt-in');source();await until(()=>row(a.id));assert(requests.length===1&&$('[data-apply]').disabled,'browsing only fetches manifest');
    action(a.id,'favorite').click();assert(requests.length===1&&!api.getLibraryPreviewState().candidateKey,'Favorite never fetches or previews a package');
    // Capture download bytes without letting this test save files on the user's disk.
    let downloads=[],revoked=[];win.URL.createObjectURL=blob=>{const url=originalCreate.call(win.URL,blob);if(blob.type==='image/png')downloads.push({blob,url});return url;};win.URL.revokeObjectURL=url=>{revoked.push(url);originalRevoke.call(win.URL,url);};win.HTMLAnchorElement.prototype.click=function(){downloads.at(-1).name=this.download;};
    holds.set(a.id,null);action(a.id,'download').click();await until(()=>typeof holds.get(a.id)==='function');const count=requests.length;action(a.id,'download').click();assert(requests.length===count,'double Download has one concurrent package request');release(a.id);
    await until(()=>downloads.length===1&&downloads[0].name);assert(equal(new Uint8Array(await downloads[0].blob.arrayBuffer()),packages.get(a.id))&&downloads[0].name===`filterfab-${a.id}.png`,'Download preserves exact original PNG bytes and safe filename');
    const downloadedImage=await win.createImageBitmap(downloads[0].blob);assert(downloadedImage.width===1&&downloadedImage.height===1,'Downloaded fixture remains a decodable PNG image');downloadedImage.close();
    assert(!api.getLibraryPreviewState().candidateKey&&$('[data-apply]').disabled&&equal(pixels(),baseline)&&localStorage.getItem('ffw-custom-presets')===savedLibrary,'Download does not preview, enable Apply, or install');
    action(bad.id,'download').click();await until(()=>$('[data-error]').textContent.includes('download'));assert(downloads.length===1,'invalid package cannot download');
    const fetchedBeforePreview=requests.length;await preview(a.id);assert(requests.length===fetchedBeforePreview,'Download then Preview reuses validated package');assert(row(a.id).textContent.includes('✓ Previewing on canvas')&&row(a.id).querySelector('.filter-sample-badge').textContent==='Sample','Online success keeps Sample and marks live canvas preview');
    assert(app.state.filtered[0]===215&&app.state.filtered[1]===80,'Online A renders from the user source');
    const beforeFailure=snapshot();failure=b.id;action(b.id).click();await until(()=>$('[data-error]').textContent.includes('previous preview'));assert(snapshot()===beforeFailure&&!$('[data-apply]').disabled,'package failure preserves exact prior candidate, canvas, and Apply');failure=null;
    await preview(b.id);assert(app.state.filtered[0]===40&&app.state.filtered[1]===175,'Online to Online uses source, never previous output');
    const downloadBaseline=snapshot(),beforeCachedDownload=requests.length;action(a.id,'download').click();action(b.id,'favorite').click();assert(snapshot()===downloadBaseline,'Favorite remains independent of a rendered candidate and Download');await until(()=>downloads.length===2);assert(snapshot()===downloadBaseline,'Download cannot replace a rendered candidate');assert(requests.length===beforeCachedDownload&&equal(new Uint8Array(await downloads[1].blob.arrayBuffer()),packages.get(a.id)),'cached Download preserves exact bytes without fetching');
    await local('Pass Through');assert(equal(pixels(),baseline),'Online to Built-in uses original source');await preview(a.id);assert(app.state.filtered[0]===215,'Built-in to Online uses original source');
    await close();assert(snapshot()===original,'Cancel restores exact identity, formulas, controls, pixels, status and diagnostics');
    for(const exit of ['close','cancel','escape']){
      await open();source();await until(()=>row(a.id));const beforeHit=requests.length;action(a.id).click();
      if(exit==='escape'){$('.filter-browser').dispatchEvent(new win.Event('cancel',{cancelable:true}));await until(()=>!$('.filter-browser').open);}else await close(exit);
      await settle();assert(requests.length===beforeHit&&snapshot()===original,`${exit} invalidates a pending cache hit and restores exact state`);
    }
    // Cached A is cancelled by a cold network candidate before the hit can render.
    await open();source();await until(()=>row(a.id));action(a.id).click();const coldWinner=cold[0];await hold(a.id);release(a.id);await until(()=>api.getLibraryPreviewState().candidateKey===`online:${coldWinner}`&&api.getLibraryPreviewState().candidateRendered);assert(app.state.filtered[0]===215,'cached A cannot overwrite a newer network selection');await close();assert(snapshot()===original,'Cancel restores original after cache-hit to network race');
    // Rapid network A→cached B; stale A completes after successful B.
    await open();await hold(a.id);const aborted=requests.at(-1).signal;await preview(b.id);const winner=snapshot();release(a.id);await settle();assert(aborted.aborted&&snapshot()===winner,'late A cannot overwrite B');await close();assert(snapshot()===original,'Cancel restores original after rapid Online selection');
    for(const exit of ['close','cancel','escape']){
      await open();await hold(a.id);const signal=requests.at(-1).signal;
      if(exit==='escape'){$('.filter-browser').dispatchEvent(new win.Event('cancel',{cancelable:true}));await until(()=>!$('.filter-browser').open);}else await close(exit);
      release(a.id);await settle();assert(signal.aborted&&snapshot()===original,`${exit} aborts fetch and ignores late completion`);
    }
    await open();await hold(a.id);await app.loadImageFile(new win.File([sourceBlob],'replacement.png',{type:'image/png'}));await until(()=>!app.state.isRendering);const replacement=snapshot();release(a.id);await settle();assert(!api.getLibraryPreviewState().open&&snapshot()===replacement,'source replacement invalidates package result and session');
    await open();await hold(a.id);app.applyFilter({...b,id:'local-replacement'},null);await until(()=>!app.state.isRendering);const replacedDocument=snapshot();release(a.id);await settle();assert(!api.getLibraryPreviewState().open&&snapshot()===replacedDocument,'document replacement invalidates package result and session');
    // Delay the existing renderer, not a second render path, to expose render races.
    const manager=app.state.rendererManager,realRender=manager.renderWithFallback.bind(manager);let finishRender;
    manager.renderWithFallback=options=>new Promise(resolve=>{finishRender=()=>resolve({result:{pixels:new Uint8ClampedArray(app.state.source),backend:'cpu',label:'CPU',ms:0},fallbackReason:null,runtimeFallback:false});});
    const beforeRender=snapshot();await open();source();await until(()=>row(a.id));action(a.id).click();await until(()=>finishRender);await close();finishRender();await settle();manager.renderWithFallback=realRender;assert(snapshot()===beforeRender,'Cancel during render ignores late pixels and restores exact state');
    await open();await preview(b.id);const completedCandidate=snapshot();finishRender=null;
    manager.renderWithFallback=options=>new Promise(resolve=>{finishRender=()=>resolve({result:{pixels:new Uint8ClampedArray(app.state.source),backend:'cpu',label:'CPU',ms:0},fallbackReason:null,runtimeFallback:false});});
    action(a.id).click();await until(()=>finishRender);action(bad.id).click();await until(()=>$('[data-error]').textContent.includes('previous preview'));finishRender();await settle();manager.renderWithFallback=realRender;
    assert(snapshot()===completedCandidate&&!$('[data-apply]').disabled,'failed request after interrupted render restores the last completed candidate');await close();
    await open();finishRender=null;let holdRender=true;
    manager.renderWithFallback=options=>holdRender?(holdRender=false,new Promise(resolve=>{finishRender=()=>resolve({result:{pixels:new Uint8ClampedArray(app.state.source),backend:'cpu',label:'CPU',ms:0},fallbackReason:null,runtimeFallback:false});})):realRender(options);
    source();await until(()=>row(a.id));action(a.id).click();await until(()=>finishRender);await preview(b.id);const renderWinner=snapshot();finishRender();await settle();manager.renderWithFallback=realRender;
    assert(snapshot()===renderWinner,'late A render cannot overwrite successfully rendered B');await close();
    await open();await preview(a.id);await close('apply');const applied=api.getLibraryPreviewState();
    assert(applied.activeKey===null&&applied.activeId===a.id&&applied.imported&&applied.importSource==='online'&&applied.recordBaseline===null,'Apply retains portable ID as unsaved imported Online identity');
    assert(localStorage.getItem('ffw-custom-presets')===savedLibrary,'Apply does not install into My Filters');
    assert(![...$('#presetSelect').options].some(option=>option.value.startsWith('online:')),'Author dropdown stays local-only');
    // All URL lifetimes must finish, including the Download started above.
    await until(()=>revoked.includes(downloads[0].url),'download URL revocation');assert(true,'Download object URL is revoked');
    output.textContent+='Stage 3/4 browser checks passed.\n';
  }catch(error){output.textContent+=`FAIL ${error.stack}\n`;}
  finally{
    win.URL.createObjectURL=originalCreate;win.URL.revokeObjectURL=originalRevoke;win.HTMLAnchorElement.prototype.click=originalClick;
    if(savedPref===null)localStorage.removeItem(prefKey);else localStorage.setItem(prefKey,savedPref);
    if(savedPrefB===null)localStorage.removeItem(prefBKey);else localStorage.setItem(prefBKey,savedPrefB);
  }
};
