import assert from 'node:assert/strict';
import { readOnlineLibraryCache as readCache, writeOnlineLibraryCache as writeCache, ONLINE_LIBRARY_CACHE_KEY as KEY, ONLINE_LIBRARY_PERSISTED_MANIFEST_MAX_BYTES as MAX } from '../src/io/filter-library-cache.js';
import { validateOnlineLibraryManifest } from '../src/io/filter-library-manifest.js';
import { createOnlineLibrarySession } from '../src/app/filter-fab-app.js';
import { readEntryPreference, writeEntryPreference } from '../src/app/filter-catalog.js';
import { packageFixtureMetadata } from './helpers/online-package-fixture.js';

const manifestUrl='https://fixture.test/catalogue.json',metadata=packageFixtureMetadata();
const manifest=(version=10,filters=[metadata])=>({schema:'filter-fab-js/library',schemaVersion:1,libraryVersion:version,filters});
const data=new Map();let reads=0,writes=0;
const storage={getItem:key=>{reads++;return data.get(key)??null;},setItem:(key,value)=>{writes++;data.set(key,value);},removeItem:()=>{throw new Error('No removal needed');}};
const write=value=>writeCache({storage,manifestUrl,manifest:value,now:()=> '2026-09-20T12:00:00Z'}),read=()=>readCache({storage,manifestUrl});
assert.equal(MAX,2*1024*1024);
const input=manifest(),original=JSON.stringify(input);input.extra='not persisted';input.filters[0].unknown='not persisted';
assert.equal(write(input),true);const goodRaw=data.get(KEY);
assert.deepEqual(read(),validateOnlineLibraryManifest(input));assert.equal(data.get(KEY).includes('not persisted'),false);
assert.equal(JSON.parse(goodRaw).cacheSchema,1);assert.equal(JSON.parse(goodRaw).storedAt,'2026-09-20T12:00:00Z');
assert.equal(input.extra,'not persisted');assert.equal(input.filters[0].unknown,'not persisted');delete input.extra;delete input.filters[0].unknown;assert.equal(JSON.stringify(input),original);
for(const raw of ['{','null','[]',JSON.stringify({cacheSchema:2,manifestUrl,manifest:input}),JSON.stringify({cacheSchema:1,manifestUrl:'https://other.test/catalogue.json',manifest:input}),JSON.stringify({cacheSchema:1,manifestUrl}),JSON.stringify({cacheSchema:1,manifestUrl,manifest:{...input,schemaVersion:99}}),JSON.stringify({cacheSchema:1,manifestUrl,manifest:manifest(10,[{...metadata,id:'bad:id'}])}),' '.repeat(MAX+1)]){
  data.set(KEY,raw);assert.equal(read(),null);assert.equal(data.get(KEY),raw,'invalid saved data is non-destructive');
}
data.set(KEY,goodRaw);
const large=manifest(11,Array.from({length:600},(_,i)=>({...metadata,id:`entry-${i}`,description:'界'.repeat(1500)})));
assert.equal(validateOnlineLibraryManifest(large).filters.length,600);assert.equal(write(large),false);assert.equal(data.get(KEY),goodRaw);
for(const broken of [{getItem(){throw new Error('SecurityError');}},{getItem:()=>null,setItem(){throw new Error('QuotaExceededError');}},()=>{throw new Error('storage denied');}]){
  assert.equal(readCache({storage:broken,manifestUrl}),null);assert.equal(writeCache({storage:broken,manifestUrl,manifest:input}),false);
}
assert.equal(write(manifest(9)),false);assert.equal(data.get(KEY),goodRaw,'older data cannot replace persisted data');

let finish,network=0,changes=0;reads=0;
const session=createOnlineLibrarySession({manifestUrl,storage,preference:key=>readEntryPreference(storage,key),fetchImpl:()=>{network++;return new Promise(resolve=>finish=resolve);},onChange:()=>changes++});
assert.equal(reads,0);assert.equal(network,0);assert.deepEqual(session.getEntries(),[]);assert.equal(reads,0);
const pending=session.load();assert.equal(session.load(),pending);assert.equal(session.getState().status,'ready');assert.equal(session.getState().provenance,'saved');assert.equal(session.getState().refreshing,true);assert.equal(session.getEntries()[0].document,null);assert.equal(changes,1);
const response=value=>new Response(JSON.stringify(value));
writeEntryPreference(storage,`online:${metadata.id}`,{favorite:true});
finish(response(manifest(11,[{...metadata,revision:2},{...metadata,id:'new',name:'New'}])));await pending;
assert.equal(session.getState().provenance,'network');assert.equal(session.getState().refreshing,false);assert.equal(read().libraryVersion,11);assert.equal(session.getEntries()[0].favorite,true);
const accepted=data.get(KEY);
for(const badResponse of [new Response('unavailable',{status:503}),new Response('{'),response({...manifest(12),filters:[{...metadata,id:'bad:id'}]}),new Response('too large',{headers:{'Content-Length':String(9*1024*1024)}}),response(manifest(10))]){
  const retry=session.load({retry:true});assert.equal(session.getEntries().length,2);assert.equal(session.getState().status,'ready');finish(badResponse);await retry;
  assert.equal(session.getState().status,'ready');assert.ok(session.getState().refreshWarning);assert.equal(session.getState().error,null);assert.equal(data.get(KEY),accepted);
}
const equal=session.load({retry:true});finish(response(manifest(11,[{...metadata,id:'new',name:'Changed'}])));await equal;
assert.equal(session.getState().refreshWarning,null);assert.deepEqual(session.getEntries().map(e=>e.key),['online:new']);assert.equal(readEntryPreference(storage,`online:${metadata.id}`).favorite,true,'removed entry preference survives');
const higher=session.load({retry:true});finish(response(manifest(12)));await higher;assert.equal(read().libraryVersion,12);
const oversized=session.load({retry:true});finish(response({...large,libraryVersion:13}));await oversized;assert.equal(session.getEntries().length,600);assert.equal(session.getState().refreshWarning,null);assert.equal(read().libraryVersion,12,'valid large catalogue remains session-only');
session.dispose();
const timeout=createOnlineLibrarySession({manifestUrl,storage,preference:()=>({favorite:false}),timeoutMs:5,fetchImpl:()=>new Promise(()=>{})});
await timeout.load();assert.equal(timeout.getState().status,'ready');assert.match(timeout.getState().refreshWarning.message,/timed out/);timeout.dispose();
const empty=createOnlineLibrarySession({manifestUrl,storage:()=>{throw new Error('SecurityError');},preference:()=>({favorite:false}),fetchImpl:async()=>new Response('missing',{status:404})});
await empty.load();assert.equal(empty.getState().status,'error');assert.deepEqual(empty.getEntries(),[]);empty.dispose();
const quota=createOnlineLibrarySession({manifestUrl,storage:{getItem:()=>null,setItem:()=>{throw new Error('quota');}},preference:()=>({favorite:false}),fetchImpl:async()=>response(manifest())});
await quota.load();assert.equal(quota.getState().status,'ready');assert.equal(quota.getEntries().length,1);quota.dispose();
console.log('Persistent catalogue bounds/revalidation/storage errors, lazy hydration, refresh/fallback, monotonic versions and preference preservation passed.');
