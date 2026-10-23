import assert from 'node:assert/strict';
import {installBrowserDom} from './helpers/browser-dom.mjs';
import {createFilterBrowser} from '../src/ui/filter-browser.js';
import {catalogEntry} from '../src/app/filter-catalog.js';
const dom=installBrowserDom(),launcher=document.createElement('button');document.body.append(launcher);
const entries=Array.from({length:105},(_,i)=>catalogEntry({id:`compact-${i}`,name:`Filter ${i}`,author:'Author',description:'Description',tags:['Art'],formulas:['r','g','b','a']},'builtin',{favorite:i===0,tags:[]}));
let previews=0,applies=0,cancels=0;let removed=[];
const browser=createFilterBrowser({launcher,getEntries:()=>entries,begin:()=>true,preview:()=>{previews++;return true;},apply:()=>{applies++;return true;},cancel:()=>{cancels++;},toggleFavorite:e=>e.favorite=!e.favorite,deleteCustom:async e=>{removed.push(e.key);const i=entries.indexOf(e);if(i>=0)entries.splice(i,1);return true;},onError:e=>{throw e;}}),$=s=>browser.dialog.querySelector(s);
try{
 await launcher.click();assert.equal(document.activeElement,$('[data-search]'));assert.equal($('[data-filters]').open,false);assert.equal($('[data-restrictions]').hidden,true);assert.equal($('[data-reset]').hidden,true);
 assert.equal($('[data-pages]').parentNode.className,'browser-results-head');assert.equal($('[data-apply]').parentNode.parentNode.className,'library-actions');assert.equal(dom.observers.at(-1).options.root,$('.filter-results'));
 assert.equal(browser.dialog.querySelectorAll('.filter-card').length,50);$('[data-next]').click();assert.equal($('[data-page]').textContent,'Page 2 of 3');
 const q=$('[data-search]');q.oncompositionstart();q.value='Filter 10';q.oninput();assert.equal($('[data-page]').textContent,'Page 2 of 3');q.oncompositionend();assert.equal(browser.dialog.querySelectorAll('.filter-card').length,6);assert.equal($('[data-page]').textContent,'Page 1 of 1');
 const sort=$('[data-sort]');sort.value='relevance';sort.onchange();assert.equal($('[data-restrictions]').textContent,'1 active');
 $('[data-filters]').open=true;const tag=$('[data-choices] input');tag.checked=true;tag.onchange();$('[data-filters]').open=false;assert.equal(sort.value,'relevance');assert.equal($('[data-restrictions]').textContent,'2 active');assert.equal($('[data-reset]').hidden,false);
 $('[data-reset]').click();assert.equal($('[data-source]').value,'local');assert.equal(sort.value,'az');assert.equal($('[data-restrictions]').hidden,true);
 $('[data-entry-action="favorite"]').click();assert.equal(previews,0);assert.equal($('[data-apply]').disabled,true);assert.equal($('[data-image-view-toggle]').disabled,true,'favorite alone cannot enable image viewing');
 await $('[data-entry-action="preview"]').click();assert.equal(previews,1);assert.equal(applies,0);assert.equal($('[data-apply]').disabled,false);assert.equal($('[data-image-view-toggle]').disabled,false,'image viewing requires a ready preview');assert.equal($('[data-entry-action="preview"]').getAttribute('aria-pressed'),'true');await $('[data-cancel]').click();assert.equal(cancels,1);assert.equal(document.activeElement,launcher);
 await launcher.click();assert.equal($('[data-apply]').disabled,true);await $('[data-entry-action="preview"]').click();await $('[data-apply]').click();assert.equal(applies,1);
 await launcher.click();$('[data-source]').value='all';$('[data-source]').onchange();const lastTag=$('[data-choices] input');lastTag.checked=true;lastTag.onchange();$('[data-selected] button').click();assert.equal($('[data-reset]').hidden,true);assert.equal(document.activeElement,$('[data-filters] summary'),'last-chip removal focuses a visible control');await $('[data-cancel]').click();
 // Custom filter cards expose a separate deletion action while built-ins do not.
 await launcher.click();entries.push(catalogEntry({id:'my-test',name:'My test',author:'Artist',description:'Test',tags:[],formulas:['r','g','b','a']},'custom',{favorite:false,tags:[]}));
 $('[data-source]').value='custom';$('[data-source]').onchange();
 assert.equal(browser.dialog.querySelectorAll('.filter-card-delete').length,1,'My Filters have a delete button');
 assert.match($('.filter-card-delete').getAttribute('aria-label'),/Delete My test from My Filters/);
 assert.equal($('.filter-card-actions').children.length,2,'favorite and delete share an action row');
 await $('.filter-card-delete').click();await new Promise(resolve=>setTimeout(resolve,0));
 assert.deepEqual(removed,['custom:my-test']);assert.equal(browser.dialog.querySelectorAll('.filter-card-delete').length,0);
 assert.equal(document.activeElement,$('[data-source]'),'focus returns to source after last delete');
 $('[data-source]').value='builtin';$('[data-source]').onchange();
 assert.equal(browser.dialog.querySelectorAll('.filter-card-delete').length,0,'built-in cards never expose delete');
 await $('[data-cancel]').click();
 await launcher.click();$('[data-search]').value='Populated search';browser.dialog.dispatchEvent({type:'keydown',key:'Escape',isComposing:true});assert.equal(browser.dialog.open,true,'composition Escape stays with the input');let prevented=false;browser.dialog.dispatchEvent({type:'keydown',key:'Escape',preventDefault(){prevented=true;},stopPropagation(){}});await new Promise(resolve=>setTimeout(resolve,0));assert.equal(prevented,true);assert.equal(browser.dialog.open,false,'one Escape closes even with populated search');assert.equal(document.activeElement,launcher);
}finally{dom.restore();}
console.log('Compact Library disclosure values/badge/reset, composition, paging placement, thumbnail root, independent favorite/preview/Apply/Cancel and focus passed.');
