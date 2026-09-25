import assert from 'node:assert/strict';
import { fetchOnlineLibraryManifest as fetchManifest, resolveOnlineLibraryAssetUrl as resolveAsset, ONLINE_LIBRARY_MANIFEST_MAX_BYTES as MAX, DEFAULT_ONLINE_LIBRARY_MANIFEST_URL } from '../src/io/filter-library-client.js';
import { createOnlineLibrarySession } from '../src/app/filter-fab-app.js';
import { readEntryPreference, writeEntryPreference } from '../src/app/filter-catalog.js';

const url='https://example.test/library/catalogue.json';
const filter={id:'sample',revision:1,name:' Sample ',tags:['Art'],documentType:'filter',filterFormat:2,preview:{url:'previews/sample.png',width:512,height:512},package:{url:'packages/sample.png'}};
const manifest={schema:'filter-fab-js/library',schemaVersion:1,libraryVersion:1,filters:[filter]};
const response=body=>new Response(typeof body==='string'||body instanceof Uint8Array?body:JSON.stringify(body));
let calls=0;
const result=await fetchManifest(url,{fetchImpl:async(actual,options)=>{calls++;assert.equal(actual,url);assert.equal(options.method,'GET');assert.equal(options.credentials,'omit');assert.equal(options.cache,'no-store');assert.equal(options.redirect,'error');assert.ok(options.signal instanceof AbortSignal);return response(manifest);}});
assert.equal(calls,1);assert.equal(result.manifestUrl,url);assert.equal(result.manifest.filters[0].name,'Sample');assert.equal('formulas' in result.manifest.filters[0],false);
assert.equal(resolveAsset(url,filter.preview.url),'https://example.test/library/previews/sample.png');
assert.equal(resolveAsset(DEFAULT_ONLINE_LIBRARY_MANIFEST_URL,'filters/example.png'),'https://anthonychimming.github.io/filter-fabjs-library/filters/example.png');
assert.equal(resolveAsset('http://localhost:8080/fixtures/catalogue.json','sample.png'),'http://localhost:8080/fixtures/sample.png');
for(const path of ['https://evil.test/a.png','//evil.test/a.png','\\evil.test\\a.png','/a.png','data:a.png','a.png?x','a.png#x'])assert.throws(()=>resolveAsset(url,path),/relative|origin/);
for(const invalidUrl of ['http://example.test/catalogue.json','file:///catalogue.json','https://user:pass@example.test/catalogue.json'])await assert.rejects(fetchManifest(invalidUrl,{fetchImpl:()=>assert.fail('invalid URL must not fetch')}),/HTTPS/);
for(const status of [404,500])await assert.rejects(fetchManifest(url,{fetchImpl:async()=>new Response('failure',{status})}),new RegExp(`HTTP ${status}`));
for(const [body,error] of [['',/empty/],['{',/JSON/],[new Uint8Array([0xc3,0x28]),/UTF-8/],[{...manifest,schema:'wrong'},/schema/],[{...manifest,filters:[filter,{...filter,id:'invalid:id'}]},/id/],[new Uint8Array(MAX+1),/8 MiB/]])await assert.rejects(fetchManifest(url,{fetchImpl:async()=>response(body)}),error);
await assert.rejects(fetchManifest(url,{fetchImpl:async()=>({ok:true,headers:new Headers({'Content-Length':String(MAX+1)}),arrayBuffer:()=>assert.fail('declared oversized body must not be read')})}),/8 MiB/);
const json=JSON.stringify(manifest);await fetchManifest(url,{fetchImpl:async()=>response(json+' '.repeat(MAX-json.length))});
await assert.rejects(fetchManifest(url,{fetchImpl:async()=>{throw new Error('offline');}}),/offline/);
const beforeAbort=new AbortController();beforeAbort.abort();await assert.rejects(fetchManifest(url,{signal:beforeAbort.signal,fetchImpl:()=>assert.fail('pre-abort must not fetch')}),{name:'AbortError'});
const duringAbort=new AbortController();let requestSignal;
const pending=fetchManifest(url,{signal:duringAbort.signal,fetchImpl:async(_,options)=>{requestSignal=options.signal;return new Promise(()=>{});}});
duringAbort.abort();await assert.rejects(pending,{name:'AbortError'});assert.equal(requestSignal.aborted,true);
await assert.rejects(fetchManifest(url,{timeoutMs:1,fetchImpl:()=>new Promise(()=>{})}),/timed out/);
await assert.rejects(fetchManifest(url,{timeoutMs:1,fetchImpl:async()=>({ok:true,headers:new Headers(),arrayBuffer:()=>new Promise(()=>{})})}),/timed out/);

// Session state reuses in-flight work and refreshes preference projections, never documents.
const data=new Map(),storage={getItem:key=>data.get(key)??null,setItem:(key,value)=>data.set(key,value)};
let finish,loads=0,changes=0;
const session=createOnlineLibrarySession({manifestUrl:url,fetchImpl:()=>{loads++;return new Promise(resolve=>finish=resolve);},preference:key=>readEntryPreference(storage,key),onChange:()=>changes++});
assert.equal(session.getState().status,'idle');assert.equal(loads,0);assert.deepEqual(session.getEntries(),[]);
const first=session.load();assert.equal(session.load(),first);assert.equal(session.load({retry:true}),first);assert.equal(loads,1);assert.equal(session.getState().status,'loading');
finish(response(manifest));await first;assert.equal(session.getState().status,'ready');assert.equal(session.getEntries()[0].document,null);assert.equal(changes,2);
await session.load();assert.equal(loads,1);
writeEntryPreference(storage,'online:sample',{favorite:true,tags:['Personal']});session.invalidate();assert.equal(session.getEntries()[0].favorite,true);assert.deepEqual(session.getEntries()[0].tags,['Art']);assert.equal(data.size,1);
assert.equal(session.resolvePreview(session.getEntries()[0]),'https://example.test/library/previews/sample.png');
let attempts=0;
const retry=createOnlineLibrarySession({manifestUrl:url,preference:()=>({favorite:false,tags:[]}),fetchImpl:async()=>{attempts++;return attempts===1?new Response('missing',{status:404}):response({...manifest,filters:[]});}});
await retry.load();assert.equal(retry.getState().status,'error');await retry.load();assert.equal(attempts,1);
await retry.load({retry:true});assert.equal(attempts,2);assert.equal(retry.getState().status,'ready');assert.deepEqual(retry.getEntries(),[]);
// Dispose invalidates late completions even if an injected transport ignores cancellation.
const old=session.load();await old;session.dispose();const stale=session.load(),finishStale=finish;session.dispose();const latest=session.load();finish(response({...manifest,filters:[]}));await latest;finishStale(response(manifest));await stale;assert.equal(session.getState().status,'ready');assert.deepEqual(session.getEntries(),[]);
console.log('Online bounded client, URL resolution, cancellation/timeout, session reuse and preference refresh passed.');
