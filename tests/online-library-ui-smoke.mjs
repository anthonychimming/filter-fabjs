import assert from 'node:assert/strict';
import fs from 'node:fs';
import { installBrowserDom } from './helpers/browser-dom.mjs';
import { createFilterBrowser } from '../src/ui/filter-browser.js';
import { createOnlineLibrarySession } from '../src/app/filter-fab-app.js';
import { catalogEntry,readEntryPreference,writeEntryPreference } from '../src/app/filter-catalog.js';

const dom=installBrowserDom(),launcher=document.createElement('button');document.body.append(launcher);
const data=new Map(),storage={getItem:key=>data.get(key)??null,setItem:(key,value)=>data.set(key,value)},pref=key=>readEntryPreference(storage,key);
const localDoc={id:'local',name:'Local',tags:['Local tag'],formulas:['r','g','b','a']};
const locals=[catalogEntry(localDoc,'builtin',pref('builtin:local')),catalogEntry({...localDoc,name:'Saved'},'custom',pref('custom:local'))];
const metadata=i=>({id:`sample-${String(i).padStart(2,'0')}`,revision:1,name:`Sample ${String(i).padStart(2,'0')}`,description:i===0?'Radial displacement':'Texture',author:i===0?'André':'Bea',tags:i===0?['Colour','Art']:['Art'],documentType:'filter',filterFormat:2,preview:{url:`preview-${i}.png`,width:512,height:512},package:{url:`package-${i}.png`}});
const manifest={schema:'filter-fab-js/library',schemaVersion:1,libraryVersion:1,filters:Array.from({length:55},(_,i)=>metadata(i))};
let browser,finish,requests=0,thumbnails=0,candidates=0,applies=0,cancels=0,active='original';
const session=createOnlineLibrarySession({manifestUrl:'https://fixture.test/catalogue.json',fetchImpl:()=>{requests++;return new Promise(resolve=>finish=resolve);},preference:pref,onChange:()=>browser?.refreshOnline()});
browser=createFilterBrowser({launcher,getEntries:()=>[...locals,...session.getEntries()],getOnlineState:session.getState,loadOnline:session.load,resolveOnlinePreviewUrl:session.resolvePreview,begin:()=>true,preview:()=>{candidates++;active='candidate';return true;},apply:()=>{applies++;return true;},cancel:()=>{cancels++;active='original';return true;},toggleFavorite:entry=>{writeEntryPreference(storage,entry.key,{favorite:!entry.favorite});session.invalidate();},requestThumbnail:entry=>{assert.notEqual(entry.source,'online');thumbnails++;},onError:error=>{throw error;}});
const $=selector=>browser.dialog.querySelector(selector),rows=()=>browser.dialog.querySelectorAll('.filter-card'),observer=()=>dom.observers.at(-1);
const change=(selector,value)=>{const node=$(selector);if(node.type==='checkbox')node.checked=value;else node.value=value;node.onchange();};
const search=value=>{$('[data-search]').value=value;$('[data-search]').oninput();};
const finishRequest=async value=>{const pending=session.load();finish(new Response(JSON.stringify(value)));await pending;};
try{
  assert.deepEqual($('[data-source]').options.map(option=>[option.value,option.textContent]),[['all','All'],['local','All local'],['builtin','Built-in'],['custom','My Filters'],['online','Online']]);
  assert.equal(requests,0);await launcher.click();assert.equal($('[data-source]').value,'all');assert.equal(requests,1);assert.equal(rows().length,2);assert.equal(document.activeElement,$('[data-search]'));
  observer().show();assert.equal(thumbnails,2);
  change('[data-source]','builtin');assert.equal(rows().length,1);change('[data-source]','custom');assert.equal(rows().length,1);assert.equal(requests,1);
  change('[data-source]','online');assert.equal(requests,1);assert.match($('[data-count]').textContent,/Loading Online/);assert.equal($('[data-pages]').hidden,true);
  change('[data-source]','online');assert.equal(requests,1);
  const localThumbs=thumbnails;await finishRequest(manifest);assert.equal(rows().length,50);assert.equal($('[data-pages]').hidden,false);
  await new Promise(resolve=>setTimeout(resolve,170));assert.equal($('[data-count]').textContent,'55 filters');
  assert.ok(rows().every(row=>!row.querySelector('img').src));assert.equal(observer().options.rootMargin,'180px 0px');
  assert.equal(browser.dialog.querySelectorAll('[data-entry-action="preview"]').length,0);assert.equal($('[data-apply]').disabled,true);
  const row=rows()[0],image=row.querySelector('img');observer().show([row]);assert.match(image.src,/preview-0.png$/);assert.equal(rows()[1].querySelector('img').src,undefined);assert.equal(thumbnails,localThumbs);
  assert.equal(image.alt,'');assert.equal(image.loading,'lazy');assert.equal(image.decoding,'async');assert.equal(row.querySelector('.filter-sample-badge').textContent,'Sample');
  $('[data-search]').focus();image.onload();assert.equal(row.querySelector('.filter-thumbnail').dataset.thumbnailState,'ready');assert.equal(document.activeElement,$('[data-search]'));assert.equal(candidates,0);assert.equal(active,'original');assert.equal($('[data-apply]').disabled,true);
  const failed=rows()[1];observer().show([failed]);failed.querySelector('img').onerror();assert.equal(failed.querySelector('.filter-thumbnail-state').textContent,'Sample unavailable');assert.equal(failed.querySelector('[data-entry-action="favorite"]').disabled,false);
  for(const query of ['Sample 00','ANDRE','radial','colour']){search(query);assert.equal(rows().length,1);}
  search('');const tagChoice=$('[data-choices]').querySelectorAll('input').find(node=>node.value==='colour');tagChoice.checked=true;tagChoice.onchange();assert.equal(rows().length,1);
  rows()[0].querySelector('[data-entry-action="favorite"]').click();change('[data-favorites]',true);assert.equal(rows().length,1);assert.equal(data.size,1);assert.equal(data.has('ffw-custom-presets'),false);
  rows()[0].querySelector('.result-tags button').click();assert.equal($('[data-source]').value,'online');assert.equal($('[data-favorites]').checked,false);assert.equal($('[data-search]').value,'');
  $('[data-reset]').click();assert.equal($('[data-source]').value,'local');assert.equal(requests,1);assert.equal(rows().length,2);
  change('[data-source]','builtin');rows()[0].querySelector('.result-tags button').click();assert.equal($('[data-source]').value,'builtin');assert.equal(rows().length,1);
  $('[data-reset]').click();await rows()[0].querySelector('[data-entry-action="preview"]').click();assert.equal(candidates,1);assert.equal($('[data-apply]').disabled,false);
  change('[data-source]','online');assert.equal(active,'candidate');assert.equal($('[data-apply]').disabled,false);assert.match($('[data-preview-status]').textContent,/Local/);
  observer().show([rows()[0]]);const staleImage=rows()[0].querySelector('img'),staleRow=rows()[0],staleObserver=observer();$('[data-next]').click();assert.equal(rows().length,5);staleImage.onload();staleObserver.show();assert.equal(staleRow.querySelector('.filter-thumbnail').dataset.thumbnailState,'loading');
  await $('[data-cancel]').click();assert.equal(active,'original');assert.equal(cancels,1);assert.equal(document.activeElement,launcher);assert.equal(browser.dialog.open,false);
  await launcher.click();assert.equal(requests,1);assert.equal($('[data-apply]').disabled,true);
  observer().show([rows()[0]]);const closedRow=rows()[0],closedImage=closedRow.querySelector('img');await $('[data-cancel]').click();closedImage.onload();assert.equal(closedRow.querySelector('.filter-thumbnail').dataset.thumbnailState,'loading');
  session.dispose();await launcher.click();assert.equal(requests,2);const pending=session.load();finish(new Response('missing',{status:404}));await pending;
  assert.match($('.filter-library-empty').textContent,/Could not reach.*Built-in and My Filters/);assert.equal($('[data-pages]').hidden,true);assert.equal(active,'original');
  change('[data-source]','local');assert.equal(rows().length,2);change('[data-source]','online');assert.equal(requests,2);
  $('.filter-library-empty button').click();assert.equal(requests,3);await finishRequest({...manifest,filters:[]});assert.match($('.filter-library-empty').textContent,/No Online filters are currently available/);assert.equal($('.filter-library-empty button'),null);
  session.dispose();browser.refreshOnline();change('[data-source]','online');await finishRequest(manifest);search('not found');assert.match($('.filter-library-empty').textContent,/No Online filters match this search/);
  search('');globalThis.IntersectionObserver=undefined;browser.refresh();assert.equal(rows().filter(row=>row.querySelector('img').src).length,8);
  assert.equal(candidates,1);assert.equal(applies,0);assert.equal(active,'original');
  await $('[data-cancel]').click();
}finally{session.dispose();dom.restore();}

// All reuses the same metadata session and query path, without resolving packages.
{
  const dom=installBrowserDom(),launcher=document.createElement('button');document.body.append(launcher);
  const data=new Map(),storage={getItem:key=>data.get(key)??null,setItem:(key,value)=>data.set(key,value)},pref=key=>readEntryPreference(storage,key);
  const docs=[{...localDoc,id:'sample-00',name:'Sample 00',description:'Local radial',author:'André'}, {...localDoc,id:'saved',name:'Sample Saved'}];
  let browser,finish,requests=0,previews=0;
  const session=createOnlineLibrarySession({manifestUrl:'https://fixture.test/catalogue.json',preference:pref,fetchImpl:url=>{
    assert.equal(String(url),'https://fixture.test/catalogue.json','browsing and favorites must only fetch catalogue metadata');
    requests++;return new Promise(resolve=>finish=resolve);
  },onChange:()=>browser?.refreshOnline()});
  browser=createFilterBrowser({launcher,getEntries:()=>[...docs.map((doc,i)=>catalogEntry(doc,i?'custom':'builtin',pref(`${i?'custom':'builtin'}:${doc.id}`))),...session.getEntries()],
    getOnlineState:session.getState,loadOnline:session.load,resolveOnlinePreviewUrl:session.resolvePreview,begin:()=>true,preview:()=>{previews++;return true;},cancel:()=>true,
    toggleFavorite:entry=>{writeEntryPreference(storage,entry.key,{favorite:!entry.favorite});session.invalidate();},onError:error=>{throw error;}});
  const $=selector=>browser.dialog.querySelector(selector),rows=()=>browser.dialog.querySelectorAll('.filter-card'),keys=()=>rows().map(row=>row.dataset.entryKey);
  const change=(selector,value)=>{const node=$(selector);if(node.type==='checkbox')node.checked=value;else node.value=value;node.onchange();};
  const search=value=>{$('[data-search]').value=value;$('[data-search]').oninput();};
  const respond=async response=>{const pending=session.load();finish(response);await pending;};
  try{
    assert.equal(requests,0);await launcher.click();assert.equal($('[data-source]').value,'all');assert.equal(requests,1);
    change('[data-source]','all');assert.equal(requests,1);assert.equal(rows().length,2);assert.equal($('.filter-library-empty'),null);
    assert.match($('[data-online-message]').textContent,/Loading Online/);assert.equal($('.filter-results').getAttribute('aria-busy'),'false');
    await new Promise(resolve=>setTimeout(resolve,170));assert.equal($('[data-count]').textContent,'2 filters');
    search('not found');assert.match($('.filter-library-empty').textContent,/No filters match this search/);assert.match($('[data-online-message]').textContent,/Loading Online/);search('');
    await respond(new Response('offline',{status:503}));assert.equal(rows().length,2);assert.equal($('.filter-library-empty'),null);
    assert.match($('[data-online-message]').textContent,/unavailable.*showing local filters/);assert.equal($('[data-online-retry]').hidden,false);
    await rows()[0].querySelector('[data-entry-action="preview"]').click();assert.equal(previews,1);assert.equal($('[data-apply]').disabled,false);
    $('[data-online-retry]').click();assert.equal(requests,2);assert.equal(rows().length,2);
    const favorite=rows()[0].querySelector('[data-entry-action="favorite"]');favorite.focus();$('.filter-results').scrollTop=125;
    await respond(new Response(JSON.stringify(manifest)));
    assert.equal(document.activeElement.dataset.entryKey,'builtin:sample-00');assert.equal(document.activeElement.dataset.entryAction,'favorite');assert.equal($('.filter-results').scrollTop,125);
    assert.equal($('[data-apply]').disabled,false);assert.equal(rows().length,50);assert.equal($('[data-online-notice]').hidden,true);
    await new Promise(resolve=>setTimeout(resolve,170));assert.equal($('[data-count]').textContent,'57 filters');
    assert.deepEqual(keys().slice(0,2),['builtin:sample-00','online:sample-00'],'same name and portable ID remain distinct');
    $('.filter-results').scrollTop=450;
    $('[data-next]').click();assert.equal(rows().length,7);assert.equal($('[data-page]').textContent,'Page 2 of 2');
    assert.equal($('.filter-results').scrollTop,0,'Next starts the new page at the top');
    $('.filter-results').scrollTop=200;
    $('[data-prev]').click();assert.equal(rows().length,50);assert.equal($('[data-page]').textContent,'Page 1 of 2');
    assert.equal($('.filter-results').scrollTop,0,'Previous starts the new page at the top');
    search('  ANDRE radial ');assert.deepEqual(keys(),['builtin:sample-00','online:sample-00']);
    assert.deepEqual($('[data-choices]').querySelectorAll('input').map(node=>node.value),['art','colour','local tag']);
    search('Sample');change('[data-sort]','relevance');assert.deepEqual(keys().slice(0,2),['builtin:sample-00','online:sample-00']);
    search('Sample Saved');assert.deepEqual(keys(),['custom:saved']);search('Sample 00');change('[data-sort]','az');
    rows()[0].querySelector('[data-entry-action="favorite"]').click();rows()[1].querySelector('[data-entry-action="favorite"]').click();
    change('[data-favorites]',true);assert.deepEqual(keys(),['builtin:sample-00','online:sample-00']);assert.equal(requests,2);assert.equal(data.has('ffw-custom-presets'),false);
    for(const scope of ['all','local','builtin','custom','online']){
      $('[data-reset]').click();change('[data-source]',scope);search('Sample');change('[data-sort]','relevance');
      rows()[0].querySelector('.result-tags button').click();assert.equal($('[data-source]').value,scope);assert.equal($('[data-search]').value,'');assert.equal($('[data-sort]').value,'az');assert.equal($('[data-favorites]').checked,false);assert.equal($('[data-selected]').children.length,1);assert.equal($('[data-page]').textContent,'Page 1 of 1');
    }
    $('[data-reset]').click();assert.equal($('[data-source]').value,'local');assert.equal($('[data-selected]').children.length,0);assert.equal(requests,2);
    const firstRow=rows()[0];browser.refreshOnline();assert.equal(rows()[0],firstRow,'local-only views do not refresh for Online changes');
    change('[data-source]','all');search('missing');change('[data-favorites]',true);assert.match($('.filter-library-empty').textContent,/No filters match this search/);
    await $('[data-cancel]').click();assert.equal(document.activeElement,launcher);
  }finally{session.dispose();dom.restore();}
}

const app=fs.readFileSync('src/app/filter-fab-app.js','utf8');
assert.match(app,/function populatePresets\(\)\{[\s\S]*?const entries=catalog\(\)/,'Author keeps the local catalog');
assert.match(app,/function requestLibraryThumbnail\(entry,callback,priority=0\)\{\s*if\(entry.source==='online'\)return;/);
assert.match(app,/async function previewLibraryEntry\(entry\)\{\s*if\(entry.source==='online'\)return false;/);
assert.match(app,/catalogCache=null;onlineLibrary.invalidate\(\);refreshTags\(\);populatePresets\(\);/,'storage events refresh Online preference projection');
console.log('Online source states, explicit loading, lazy samples, favorites, pagination, stale callbacks and local UI regressions passed.');
