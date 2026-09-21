import assert from 'node:assert/strict';
import { installBrowserDom } from './helpers/browser-dom.mjs';
import { createFilterBrowser } from '../src/ui/filter-browser.js';
import { createOnlineLibrarySession } from '../src/app/filter-fab-app.js';
import { readEntryPreference, writeEntryPreference } from '../src/app/filter-catalog.js';
import { writeOnlineLibraryCache } from '../src/io/filter-library-cache.js';
import { packageFixtureMetadata } from './helpers/online-package-fixture.js';

const dom=installBrowserDom(),launcher=document.createElement('button');document.body.append(launcher);
const data=new Map(),storage={getItem:key=>data.get(key)??null,setItem:(key,value)=>data.set(key,value)};
const manifestUrl='https://fixture.test/catalogue.json',filters=Array.from({length:55},(_,i)=>({...packageFixtureMetadata(),id:`fixture-${i}`,name:`Fixture ${String(i).padStart(2,'0')}`}));
const manifest={schema:'filter-fab-js/library',schemaVersion:1,libraryVersion:10,filters};
writeOnlineLibraryCache({storage,manifestUrl,manifest});
let browser,finish,requests=0,candidate=null,previews=0,downloads=0;
const session=createOnlineLibrarySession({storage,manifestUrl,preference:key=>readEntryPreference(storage,key),fetchImpl:()=>{requests++;return new Promise(resolve=>finish=resolve);},onChange:()=>browser?.refreshOnline()});
browser=createFilterBrowser({launcher,getEntries:session.getEntries,getOnlineState:session.getState,loadOnline:session.load,resolveOnlinePreviewUrl:session.resolvePreview,begin:()=>true,
  previewOnline:async entry=>{candidate=entry;previews++;return true;},downloadOnline:async()=>{downloads++;return true;},cancel:()=>{candidate=null;return true;},
  toggleFavorite:entry=>{writeEntryPreference(storage,entry.key,{favorite:!entry.favorite});session.invalidate();},requestThumbnail:()=>{throw new Error('Online must not request renderer thumbnails');}});
const $=selector=>browser.dialog.querySelector(selector),rows=()=>browser.dialog.querySelectorAll('.filter-card');
const change=(selector,value)=>{const node=$(selector);if(node.type==='checkbox')node.checked=value;else node.value=value;node.onchange();};
const respond=async response=>{const pending=session.load();finish(response);await pending;};
try{
  await launcher.click();assert.equal(requests,0);assert.equal($('[data-online-notice]').hidden,true);
  change('[data-source]','online');assert.equal(requests,1);assert.equal(rows().length,50);assert.match($('[data-online-message]').textContent,/Showing saved catalogue.*Checking/);assert.equal($('[data-online-retry]').hidden,true);
  await rows()[0].querySelector('[data-entry-action="preview"]').click();const originalCandidate=candidate;
  await rows()[0].querySelector('[data-entry-action="download"]').click();assert.equal(previews,1);assert.equal(downloads,1);assert.equal($('[data-apply]').disabled,false);
  await respond(new Response('offline',{status:503}));assert.equal(rows().length,50);assert.match($('[data-online-message]').textContent,/Could not refresh.*saved catalogue/);assert.equal($('[data-online-retry]').hidden,false);assert.equal($('.filter-library-empty'),null);
  // A refresh must preserve view controls and an already previewed candidate.
  $('[data-search]').value='Fixture';$('[data-search]').oninput();change('[data-sort]','relevance');
  const tag=$('[data-choices]').querySelectorAll('input')[0];tag.checked=true;tag.onchange();
  rows()[0].querySelector('[data-entry-action="favorite"]').click();const prefRaw=data.get('ffw-entry-v1:online:fixture-0');
  $('[data-next]').click();assert.match($('[data-page]').textContent,/Page 2/);
  $('[data-online-retry]').click();assert.equal(rows().length,5);assert.equal(requests,2);assert.equal($('[data-online-retry]').hidden,true);
  $('[data-search]').focus();await respond(new Response(JSON.stringify({...manifest,libraryVersion:11,filters:[filters[1]]})));
  assert.equal(rows().length,1);assert.match($('[data-page]').textContent,/Page 1 of 1/);assert.equal($('[data-search]').value,'Fixture');assert.equal($('[data-sort]').value,'relevance');assert.equal($('[data-selected]').children.length,1);assert.equal(document.activeElement,$('[data-search]'));
  assert.equal($('[data-online-notice]').hidden,true);assert.equal(candidate,originalCandidate);assert.equal($('[data-apply]').disabled,false);assert.equal(data.get('ffw-entry-v1:online:fixture-0'),prefRaw);
  change('[data-favorites]',true);assert.equal(rows().length,0);const pending=session.load({retry:true});finish(new Response(JSON.stringify({...manifest,libraryVersion:12})));await pending;
  assert.equal($('[data-favorites]').checked,true);assert.equal(rows().length,1);assert.equal(candidate,originalCandidate);
  change('[data-source]','local');assert.equal($('[data-online-notice]').hidden,true);assert.equal(requests,3);
  await $('[data-cancel]').click();assert.equal(candidate,null);
}finally{session.dispose();dom.restore();}
console.log('Saved catalogue immediate actions, refresh fallback/Retry, view/focus/page preservation and candidate independence passed.');
