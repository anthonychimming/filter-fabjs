const frame=document.querySelector('#app'),output=document.querySelector('#result'),root=new URL('../',location.href),manifestUrl=new URL('tests/fixtures/online-library/catalogue.json',root).href;
let requests=0,failNext=true;
window.fixtureFetch=async(url,options)=>{requests++;if(failNext){failNext=false;return new Response('Fixture unavailable',{status:503});}return fetch(url,options);};
const standalone=new URLSearchParams(location.search).has('standalone');
const html=await(await fetch(new URL(standalone?'dist/filter-fabjs-v2.9.1.html':'index.html',root))).text();
const options=`{onlineStorage:null,onlineManifestUrl:${JSON.stringify(manifestUrl)},onlineFetchImpl:(...args)=>parent.fixtureFetch(...args)}`;
frame.srcdoc=html.replace('<head>',`<head><base href="${root.href}">`).replace(standalone?'initFilterFabApp();':'<script type="module" src="./src/main.js"></script>',standalone?`initFilterFabApp(${options});`:`<script type="module">import {initFilterFabApp} from './src/app/filter-fab-app.js';initFilterFabApp(${options});</script>`);
const until=async test=>{const end=Date.now()+15000;while(!test()){if(Date.now()>end)throw new Error('Fixture timed out');await new Promise(resolve=>setTimeout(resolve,30));}};
await until(()=>frame.contentWindow.FilterFabJS&&!frame.contentDocument.body.classList.contains('ui-locked'));
output.textContent='Ready. Open Filter Library for manual checks, or run the automated browser checks.';
document.querySelector('#run').onclick=async()=>{
  const win=frame.contentWindow,doc=frame.contentDocument,$=selector=>doc.querySelector(selector),assert=(value,label)=>{if(!value)throw new Error(label);output.textContent+=`PASS ${label}\n`;},change=(selector,value)=>{const node=$(selector);node.value=value;node.dispatchEvent(new win.Event('change'));},input=value=>{const node=$('[data-search]');node.value=value;node.dispatchEvent(new win.Event('input'));};
  const preferenceKey='ffw-entry-v1:online:fixture-colour',saved=localStorage.getItem(preferenceKey),savedLibrary=localStorage.getItem('ffw-custom-presets');
  output.textContent='';document.querySelector('#run').disabled=true;
  try{
    const api=win.FilterFabJS;
    // Manual inspection may have opened a session before Run. Restore that session
    // normally before capturing the closed, pre-open baseline for this test's session.
    if($('.filter-browser')?.open){$('[data-cancel]').click();await until(()=>!$('.filter-browser').open);}
    assert(!api.getLibraryPreviewState().open,'test baseline has no existing library session');
    assert(requests===0,'no startup manifest request');
    const original=JSON.stringify(api.getLibraryPreviewState()),program=JSON.stringify(api.getLastProgram()),diagnostics=JSON.stringify(api.getRendererDiagnostics());
    const canvas=$('#displayCanvas'),pixels=canvas.getContext('2d').getImageData(0,0,canvas.width,canvas.height).data;
    $('#browseFiltersBtn').click();await until(()=>$('.filter-browser').open);assert($('[data-source]').value==='local'&&requests===0,'All local opens without fetching');
    change('[data-source]','builtin');change('[data-source]','custom');assert(requests===0,'individual local sources do not fetch');
    change('[data-source]','online');await until(()=>$('.filter-library-empty')?.textContent.includes('Could not reach'));assert(requests===1,'failure stays inside Online');
    $('.filter-library-empty button').click();await until(()=>doc.querySelectorAll('.filter-card').length===3);assert(requests===2,'Retry loads controlled fixture');
    assert(doc.querySelectorAll('.filter-results [data-entry-action="preview"]').length===3&&$('[data-apply]').disabled&&!api.getLibraryPreviewState().candidateKey&&requests===2,'Online preview is explicit; browsing has no package request or Apply eligibility');
    await until(()=>doc.querySelectorAll('.filter-thumbnail[data-thumbnail-state="ready"]').length===2&&$('.filter-thumbnail[data-thumbnail-state="failed"]'));
    assert($('.filter-thumbnail[data-thumbnail-state="failed"]').textContent.includes('Sample unavailable'),'broken sample has isolated failure');
    assert(doc.querySelectorAll('.filter-sample-badge').length===3,'Sample indicators visible');
    for(const query of ['Colour','Adele','Warm']){input(query);assert(doc.querySelectorAll('.filter-card').length===1,`metadata search ${query}`);}
    $('.filter-card-favorite').click();assert(JSON.parse(localStorage.getItem(preferenceKey)).favorite===true,'Online favorite persists');
    const favorites=$('[data-favorites]');favorites.checked=true;favorites.dispatchEvent(new win.Event('change'));assert(doc.querySelectorAll('.filter-card').length===1,'favorites filter works');
    $('.result-tags button').click();assert($('[data-source]').value==='online','Online tag remains Online');
    assert(JSON.stringify(api.getLastProgram())===program&&JSON.stringify(api.getRendererDiagnostics())===diagnostics,'Online leaves program and diagnostics unchanged');
    if(pixels){const after=canvas.getContext('2d').getImageData(0,0,canvas.width,canvas.height).data;assert(pixels.every((value,i)=>value===after[i]),'Online leaves canvas pixels unchanged');}
    $('[data-reset]').click();assert($('[data-source]').value==='local'&&requests===2,'Reset returns local without fetching');
    input('Pass Through');$('.filter-results [data-entry-action="preview"]').click();await until(()=>api.getLibraryPreviewState().candidateRendered);assert(!$('[data-apply]').disabled,'local candidate still enables Apply');
    change('[data-source]','online');assert(!$('[data-apply]').disabled&&api.getLibraryPreviewState().candidateKey==='builtin:pass','Online browsing preserves a prior local candidate');
    $('[data-cancel]').click();await until(()=>!$('.filter-browser').open);
    const restored=api.getLibraryPreviewState(),expected=JSON.parse(original);
    for(const key of new Set([...Object.keys(expected),...Object.keys(restored)]))if(expected[key]!==restored[key])output.textContent+=`State difference ${key}: before=${JSON.stringify(expected[key])}, after=${JSON.stringify(restored[key])}\n`;
    assert(JSON.stringify(restored)===original,'Cancel restores exact local identity');assert(doc.activeElement===$('#browseFiltersBtn'),'Cancel restores launcher focus');
    assert(![...$('#presetSelect').options].some(option=>option.value.startsWith('online:')),'Author dropdown remains local-only');
    // Exercise restoration of raw pending work, rapid switching, and the separate close path.
    $('#formulaR').value='r+1';$('#formulaR').dispatchEvent(new win.Event('input',{bubbles:true}));
    await new Promise(resolve=>setTimeout(resolve,300));
    $('#browseFiltersBtn').click();await until(()=>$('.filter-browser').open);$('[data-reset]').click();input('Invert');$('.filter-results [data-entry-action="preview"]').click();input('Pass Through');$('.filter-results [data-entry-action="preview"]').click();
    await until(()=>api.getLibraryPreviewState().candidateKey==='builtin:pass'&&api.getLibraryPreviewState().candidateRendered);
    $('.filter-browser').dispatchEvent(new win.Event('cancel',{cancelable:true}));await until(()=>!$('.filter-browser').open);assert($('#formulaR').value==='r+1','Escape restores pending raw local formula after rapid candidates');
    $('#resetBtn').click();await until(()=>!doc.body.classList.contains('ui-locked')&&$('#formulaR').value==='r');
    const records=JSON.parse(savedLibrary||'[]');if(!Array.isArray(records))throw new Error('Fixture requires array-shaped custom storage');
    const custom={format:'filter-fab-js',version:2,id:'stage2-test-local',name:'Stage 2 Saved Test',tags:['Test'],formulas:['255-r','g','b','a']};
    localStorage.setItem('ffw-custom-presets',JSON.stringify([...records.filter(record=>record?.id!==custom.id),custom]));win.dispatchEvent(new win.StorageEvent('storage',{key:'ffw-custom-presets'}));
    $('#browseFiltersBtn').click();await until(()=>$('.filter-browser').open);$('[data-reset]').click();change('[data-source]','custom');input(custom.name);
    await until(()=>$('.filter-card[data-thumbnail-ready="true"]'));assert(Boolean($('.filter-card canvas')),'My Filters retains rendered canvas thumbnails');
    $('.filter-results [data-entry-action="preview"]').click();await until(()=>api.getLibraryPreviewState().candidateRendered);$('[data-apply]').click();await until(()=>!$('.filter-browser').open);assert(api.getLibraryPreviewState().activeKey==='custom:stage2-test-local','My Filter candidate Apply commits the saved identity');
    $('#browseFiltersBtn').click();await until(()=>$('.filter-browser').open);$('[data-reset]').click();input('Pass Through');$('.filter-results [data-entry-action="preview"]').click();await until(()=>api.getLibraryPreviewState().candidateRendered);$('[data-close]').click();await until(()=>!$('.filter-browser').open);assert(api.getLibraryPreviewState().activeKey==='custom:stage2-test-local'&&$('#formulaR').value==='255-r','Close restores the applied My Filter');
    $('#resetBtn').click();await until(()=>!doc.body.classList.contains('ui-locked')&&api.getLibraryPreviewState().activeKey==='builtin:pass');
    output.textContent+='Stage 2 browser checks passed. Reload this fixture to rerun.\n';
  }catch(error){output.textContent+=`FAIL ${error.stack}\n`;}
  finally{if(saved===null)localStorage.removeItem(preferenceKey);else localStorage.setItem(preferenceKey,saved);if(savedLibrary===null)localStorage.removeItem('ffw-custom-presets');else localStorage.setItem('ffw-custom-presets',savedLibrary);win.dispatchEvent(new win.StorageEvent('storage',{key:null}));}
};
