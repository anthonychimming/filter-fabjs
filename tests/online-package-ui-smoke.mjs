import assert from 'node:assert/strict';
import { installBrowserDom } from './helpers/browser-dom.mjs';
import { createFilterBrowser } from '../src/ui/filter-browser.js';
import { onlineCatalogEntry } from '../src/app/filter-catalog.js';
import { packageFixtureMetadata } from './helpers/online-package-fixture.js';

const dom=installBrowserDom(),launcher=document.createElement('button');document.body.append(launcher);
const a=onlineCatalogEntry(packageFixtureMetadata(),{favorite:false}),b={...a,key:'online:b',name:'Online B'};
let requests=[],downloadCalls=0,finishDownload,favorites=0,applies=0,cancels=0;
const browser=createFilterBrowser({launcher,getEntries:()=>[a,b],getOnlineState:()=>({status:'ready'}),loadOnline:()=>{},resolveOnlinePreviewUrl:()=>'/sample.png',begin:()=>true,
  preview:()=>{throw new Error('Online must never enter local definition resolution');},
  previewOnline:(entry,phase)=>new Promise((resolve,reject)=>requests.push({entry,phase,resolve,reject})),
  downloadOnline:()=>{downloadCalls++;return new Promise(resolve=>finishDownload=resolve);},
  apply:()=>{applies++;return true;},cancel:()=>{cancels++;return true;},toggleFavorite:()=>favorites++,
  requestThumbnail:()=>{throw new Error('Online must never request thumbnail renders');},onError:error=>{throw error;}});
const $=s=>browser.dialog.querySelector(s),rows=()=>browser.dialog.querySelectorAll('.filter-card');
const action=(index,kind)=>rows()[index].querySelector(`[data-entry-action="${kind}"]`);
try{
  await launcher.click();$('[data-source]').value='online';$('[data-source]').onchange();
  assert.equal(requests.length,0);assert.equal($('[data-apply]').disabled,true);
  await action(0,'favorite').click();assert.equal(favorites,1);assert.equal(requests.length,0);
  const downloading=action(0,'download').click();await action(0,'download').click();assert.equal(downloadCalls,1);assert.equal(action(0,'download').disabled,true);assert.equal(action(0,'preview').disabled,false);
  finishDownload(true);await downloading;assert.equal(requests.length,0);assert.equal($('[data-apply]').disabled,true);
  const first=action(0,'preview').click();requests[0].phase('loading');assert.match(rows()[0].textContent,/Loading preview/);assert.equal($('[data-apply]').disabled,true);
  requests[0].phase('rendering');assert.match(rows()[0].textContent,/Previewing/);requests[0].resolve(true);await first;
  assert.equal($('[data-apply]').disabled,false);assert.match(rows()[0].textContent,/Previewing on canvas/);assert.ok(rows()[0].querySelector('img'));assert.equal(rows()[0].querySelector('.filter-sample-badge').textContent,'Sample');
  const failed=action(1,'preview').click();requests[1].reject(new Error('bad package'));await failed;
  assert.equal($('[data-apply]').disabled,false);assert.match(rows()[0].textContent,/Previewing on canvas/);assert.match(rows()[1].textContent,/Preview unavailable/);assert.match($('[data-preview-status]').textContent,/previous preview/);
  const slow=action(0,'preview').click(),fast=action(1,'preview').click();requests[3].resolve(true);await fast;requests[2].resolve(true);await slow;
  assert.equal(rows()[0].dataset.selected,'false');assert.equal(rows()[1].dataset.selected,'true');
  await $('[data-apply]').click();assert.equal(applies,1);assert.equal(browser.dialog.open,false);
  await launcher.click();const closed=action(0,'preview').click();await $('[data-cancel]').click();requests[4].resolve(true);await closed;
  assert.equal(cancels,1);assert.equal(browser.dialog.open,false);assert.equal(document.activeElement,launcher);
  await launcher.click();const replaced=action(0,'preview').click();browser.invalidateSession();requests[5].resolve(true);await replaced;
  assert.equal(browser.dialog.open,false);assert.equal(cancels,1,'replacement has already invalidated app ownership');
}finally{dom.restore();}
console.log('Online Preview/Download/Favorite independence, loading/error/selection, races, Apply and close UI tests passed.');
