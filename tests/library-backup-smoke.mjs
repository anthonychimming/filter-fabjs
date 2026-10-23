import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createLibraryBackup, serializeLibraryBackup, parseAndValidateBackup, readLibraryBackupSnapshot, planLibraryMerge, commitLibraryMerge, LIBRARY_BACKUP_MAX_BYTES, LIBRARY_STORAGE_KEY as collection } from '../src/io/library-backup.js';
import { validateNativeFilter, detectFilterFormat } from '../src/io/filter-format.js';
const pref=id=>'ffw-entry-v1:custom:'+id,metadata={appVersion:JSON.parse(readFileSync('package.json')).version,exportedAt:'2026-10-23T16:00:00.000Z'};
class Storage{
  constructor(records=[],prefs={}){this.data=new Map([[collection,JSON.stringify(records)],...Object.entries(prefs)]);this.writes=0;this.failAt=Infinity;}
  get length(){return this.data.size;}key(i){return[...this.data.keys()][i];}getItem(k){return this.data.get(k)??null;}
  setItem(k,v){if(++this.writes===this.failAt)throw new Error('QuotaExceededError');this.data.set(k,v);}removeItem(k){this.data.delete(k);}
}
const filter=(id='one',change={})=>({...validateNativeFilter({format:'filter-fab-js',version:2,id,name:'Été 雨',author:'Author',description:'Full description',tags:['光','Été'],mathMode:'legacy',formulas:['r+ctl(0)','g','b','a'],controls:[{label:'Angle',value:128,ui:{widget:'number',displayMin:-180,displayMax:180,step:0.5,format:'number',unit:'°'}}]}),createdAt:'2026-10-01T12:00:00.000Z',updatedAt:'2026-10-20T12:00:00.000Z',...change});
const makeBackup=(records,prefs={})=>createLibraryBackup(records,prefs,metadata);
const review=(storage,backup,policy)=>{const snap=readLibraryBackupSnapshot(storage);return{snap,plan:planLibraryMerge(snap,backup,policy)};};
const commit=(storage,backup,policy)=>{const{snap,plan}=review(storage,backup,policy);return commitLibraryMerge(storage,snap,plan);};
for(const count of [0,1,40,2000]){const records=Array.from({length:count},(_,i)=>filter('id-'+i));const backup=makeBackup(records);assert.equal(backup.filters.length,count);assert.equal(parseAndValidateBackup(JSON.stringify(backup)).filters.length,count);}
const original=filter(),favorite=JSON.stringify({version:1,favorite:true,tags:['私']});
const backup=makeBackup([original],{[pref('one')]:favorite});
assert.deepEqual(parseAndValidateBackup(serializeLibraryBackup(backup)),backup);
assert.equal(backup.filters[0].document.controls.length,10);assert.equal(backup.filters[0].document.controls[0].ui.unit,'°');
const fresh=new Storage();assert.equal(commit(fresh,backup).added,1);assert.deepEqual(JSON.parse(fresh.getItem(collection)),[original]);assert.deepEqual(JSON.parse(fresh.getItem(pref('one'))),JSON.parse(favorite));
fresh.setItem(pref('one'),JSON.stringify({version:1,favorite:false,tags:[]}));const before=fresh.writes;assert.equal(commit(fresh,backup).added,0);assert.equal(fresh.writes,before);assert.equal(JSON.parse(fresh.getItem(pref('one'))).favorite,false);
const conflict=new Storage([filter('one',{name:'Local'})]);const raw=conflict.getItem(collection);assert.equal(commit(conflict,backup,'skip').added,0);assert.equal(conflict.getItem(collection),raw);assert.equal(commit(conflict,backup).copies,1);assert.equal(commit(conflict,backup).added,0);assert.equal(JSON.parse(conflict.getItem(collection))[0].name,'Local');
const distinct=new Storage([filter('other')]);assert.equal(commit(distinct,backup).added,1,'equal content at a genuinely new ID is not globally deduplicated');
const distinctOrphan=new Storage([filter('unrelated')],{[pref('one')]:'occupied'});assert.equal(commit(distinctOrphan,backup).added,1,'an occupied preference key must not globally deduplicate distinct IDs');assert.equal(commit(distinctOrphan,backup).added,0);
const orphan=new Storage([],{[pref('one')]:'unrelated'});assert.equal(commit(orphan,backup).added,1);assert.equal(orphan.getItem(pref('one')),'unrelated');assert.notEqual(JSON.parse(orphan.getItem(collection))[0].id,'one');assert.equal(commit(orphan,backup).added,0,'repeated orphan-key remapping must be idempotent');
for(const failAt of [1,2,3]){const storage=new Storage([filter('local')]);storage.failAt=failAt;const previous=new Map(storage.data);const multiple=makeBackup([filter('a'),filter('b')]);assert.throws(()=>commit(storage,multiple),/preserved/);assert.deepEqual(storage.data,previous,'quota failures restore new-only preferences and preserve collection');}
for(const mutate of [storage=>storage.setItem(collection,'[] '),storage=>storage.setItem(pref('one'),'occupied')]){const storage=new Storage(),{snap,plan}=review(storage,backup);mutate(storage);assert.throws(()=>commitLibraryMerge(storage,snap,plan),/another tab/);}
const bad=[{...backup,backupVersion:2},{...backup,format:'filter-fab-js'},{...backup,filters:[...backup.filters,...backup.filters]},{...backup,filters:[{...backup.filters[0],createdAt:'yesterday'}]},{...backup,filters:[{...backup.filters[0],preferences:{favorite:'true'}}]},{...backup,filters:[{...backup.filters[0],document:{...original,formulas:['r+','g','b','a']}}]}];
for(const value of bad)assert.throws(()=>parseAndValidateBackup(JSON.stringify(value)));
assert.throws(()=>parseAndValidateBackup('['));assert.throws(()=>parseAndValidateBackup(' '.repeat(LIBRARY_BACKUP_MAX_BYTES+1)),/16 MiB/);assert.throws(()=>parseAndValidateBackup('雨'.repeat(Math.ceil(LIBRARY_BACKUP_MAX_BYTES/3))),/16 MiB|valid JSON/);
const text=JSON.stringify(makeBackup([]));assert.doesNotThrow(()=>parseAndValidateBackup(text+' '.repeat(LIBRARY_BACKUP_MAX_BYTES-Buffer.byteLength(text))));
assert.throws(()=>makeBackup(Array.from({length:2001},(_,i)=>filter('x'+i))),/2,000/);
for(const records of [[null],[{unknown:true}],[{...original,unknown:'data'}],[{...original,createdAt:123}],[original,original]]){const storage=new Storage(records),previous=storage.getItem(collection);assert.throws(()=>makeBackup(records));assert.throws(()=>review(storage,backup));assert.equal(storage.getItem(collection),previous);}
for(const change of [{controls:[256]},{controls:[{label:'x',value:-1}]},{controls:[{label:'x',value:0,ui:{widget:'invalid'}}]},{id:'bad:id'},{name:'x'.repeat(270000)}])assert.throws(()=>makeBackup([filter('bad',change)]));
const legacy=makeBackup([{format:'filter-fab-js',version:1,id:'old',name:'Legacy',f:['r','g','b','a'],values:[0]}]);assert.equal(legacy.filters[0].document.mathMode,'legacy');assert.equal(legacy.filters[0].document.version,2);assert.equal(legacy.filters[0].createdAt,undefined);
assert.throws(()=>detectFilterFormat(JSON.stringify(backup),'backup.json'),/format/);
// A full proposed collection is bounded, even when each individual filter is valid.
const large=makeBackup(Array.from({length:1400},(_,i)=>filter('big'+i,{description:'x'.repeat(2000)})));assert.throws(()=>review(new Storage(),large),/4 MiB/);
console.log('Library backup: round-trip, validation, bounds, idempotency, conflicts, races and quota rollback passed');
