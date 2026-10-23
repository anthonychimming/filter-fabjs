import { FILTER_FILE_MAX_BYTES, validateNativeFilter } from './filter-format.js';
import { normalizeTags, validatePortableId } from '../core/filter-metadata.js';
import { validateControlUI } from '../core/controls.js';

export const LIBRARY_BACKUP_FORMAT='filter-fabjs-library-backup';
export const LIBRARY_BACKUP_MAX_BYTES=16*1024*1024;
export const LIBRARY_BACKUP_MAX_FILTERS=2000;
// Conservative UTF-16 collection + custom preference budget, below common 5 MiB quotas.
export const LIBRARY_STORAGE_MAX_BYTES=4*1024*1024;
export const LIBRARY_STORAGE_KEY='ffw-custom-presets';
const backupPreferencePrefix='ffw-entry-v1:custom:';
const backupBytes=value=>new TextEncoder().encode(value).length;
function backupObject(value,label){if(!value||typeof value!=='object'||Array.isArray(value))throw new Error(`${label} must be an object`);}
function backupFields(value,allowed,label){backupObject(value,label);for(const key of Object.keys(value))if(!allowed.includes(key))throw new Error(`${label}: unsupported field “${key}”; data was preserved`);}
function backupTimestamp(value,label){if(value===undefined)return undefined;if(typeof value!=='string'||value.length>40||!/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d{1,3})?Z$/.test(value)||!Number.isFinite(Date.parse(value))||new Date(value).toISOString().slice(0,19)!==value.slice(0,19))throw new Error(`${label} must be a valid UTC timestamp`);return value;}
function backupDocument(value){
  backupFields(value,['format','version','id','name','author','description','tags','mathMode','formulas','controls','f','values','labels'],'Filter document');
  if(!validatePortableId(value.id))throw new Error('Every saved filter needs a portable id');
  if(backupBytes(JSON.stringify(value))>FILTER_FILE_MAX_BYTES)throw new Error('Filter document exceeds 256 KiB');
  for(const control of value.controls||[]){if(typeof control==='number'&&(control<0||control>255))throw new Error('Control value is outside 0–255');if(typeof control==='object'&&control){backupFields(control,['label','value','ui'],'Control');if(control.ui!==undefined){backupFields(control.ui,['widget','displayMin','displayMax','step','format','unit'],'Control UI');validateControlUI(control.ui);}if(control.value<0||control.value>255)throw new Error('Control value is outside 0–255');}}
  for(const number of value.values||[])if(number<0||number>255)throw new Error('Control value is outside 0–255');
  const document=validateNativeFilter(value);return{...document,version:2};
}
function backupPreference(value={favorite:false,tags:[]}){backupFields(value,['version','favorite','tags'],'Preferences');if((value.version!==undefined&&value.version!==1)||typeof value.favorite!=='boolean')throw new Error('Invalid custom filter preferences');return{favorite:value.favorite,tags:normalizeTags(value.tags)};}
function backupEntry(value){
  backupFields(value,['document','createdAt','updatedAt','preferences'],'Backup entry');
  const result={document:backupDocument(value.document),preferences:backupPreference(value.preferences)};
  for(const field of ['createdAt','updatedAt']){const stamp=backupTimestamp(value[field],field);if(stamp!==undefined)result[field]=stamp;}
  return result;
}
function backupEntries(values){if(!Array.isArray(values)||values.length>LIBRARY_BACKUP_MAX_FILTERS)throw new Error('Backup must contain at most 2,000 filters');const ids=new Set();return values.map((value,index)=>{try{const entry=backupEntry(value);if(ids.has(entry.document.id))throw new Error('Duplicate filter id');ids.add(entry.document.id);return entry;}catch(error){throw new Error(`Filter ${index+1}: ${error.message}`);}});}
function backupLocalEntries(records,preferences){
  if(!Array.isArray(records))throw new Error('Saved collection is not an array; stored data was preserved');
  return backupEntries(records.map(record=>{backupObject(record,'Saved record');const {createdAt,updatedAt,...document}=record;const raw=preferences[backupPreferencePrefix+document.id];return{document,createdAt,updatedAt,preferences:raw===undefined||raw===null?undefined:JSON.parse(raw)};}));
}
export function readLibraryBackupSnapshot(storage){
  const raw=storage.getItem(LIBRARY_STORAGE_KEY),records=raw===null?[]:JSON.parse(raw),preferences=Object.create(null);
  for(let index=0;index<storage.length;index++){const key=storage.key(index);if(key?.startsWith(backupPreferencePrefix))preferences[key]=storage.getItem(key);}
  // Read only: never run normal-save migrations while preparing a backup.
  return{raw,records,preferences};
}
export function createLibraryBackup(records,preferences={},metadata={}){
  const result={format:LIBRARY_BACKUP_FORMAT,backupVersion:1,appVersion:metadata.appVersion,exportedAt:backupTimestamp(metadata.exportedAt,'exportedAt'),filters:backupLocalEntries(records,preferences).sort((a,b)=>a.document.id.localeCompare(b.document.id))};
  return parseAndValidateBackup(JSON.stringify(result));
}
export function serializeLibraryBackup(backup){
  const text=JSON.stringify(parseAndValidateBackup(JSON.stringify(backup)),null,2)+'\n';
  if(backupBytes(text)>LIBRARY_BACKUP_MAX_BYTES)throw new Error('Formatted backup exceeds the 16 MiB UTF-8 limit');
  return text;
}
export function parseAndValidateBackup(text){
  if(typeof text!=='string'||backupBytes(text)>LIBRARY_BACKUP_MAX_BYTES)throw new Error('Backup exceeds the 16 MiB UTF-8 limit');
  let value;try{value=JSON.parse(text.replace(/^\uFEFF/,''));}catch{throw new Error('Backup is not valid JSON');}
  backupFields(value,['format','backupVersion','appVersion','exportedAt','filters'],'Backup');
  if(value.format!==LIBRARY_BACKUP_FORMAT)throw new Error('Choose a My Filters library backup, not a single-filter file');
  if(value.backupVersion!==1)throw new Error('Unsupported backup version; this app supports backup version 1');
  if(typeof value.appVersion!=='string'||value.appVersion.length>80)throw new Error('Invalid backup appVersion');
  if(value.exportedAt===undefined)throw new Error('Backup exportedAt is required');
  return{format:LIBRARY_BACKUP_FORMAT,backupVersion:1,appVersion:value.appVersion,exportedAt:backupTimestamp(value.exportedAt,'exportedAt'),filters:backupEntries(value.filters)};
}
// Exact normalized content, except identity. Object key order never affects equality.
function backupCanonical(value){if(Array.isArray(value))return value.map(backupCanonical);if(value&&typeof value==='object')return Object.fromEntries(Object.keys(value).sort().map(key=>[key,backupCanonical(value[key])]));return value;}
function backupContent(document){const {id,...content}=document;return JSON.stringify(backupCanonical(content));}
export function planLibraryMerge(snapshot,incoming,conflictPolicy='keep-both'){
  if(!['keep-both','skip'].includes(conflictPolicy))throw new Error('Unknown conflict policy');
  const backup=parseAndValidateBackup(JSON.stringify(incoming)),existing=backupLocalEntries(snapshot.records,snapshot.preferences),byId=new Map(existing.map(entry=>[entry.document.id,entry.document])),used=new Set([...byId.keys(),...backup.filters.map(entry=>entry.document.id)]),contentCopies=new Set(existing.map(entry=>backupContent(entry.document))),additions=[],preferenceWrites=[];
  const counts={new:0,identical:0,conflicts:0,copies:0,added:0};
  function freshId(base){for(let index=1;index<=10000;index++){const id=`${base.slice(0,64)}-copy-${index}`;if(!used.has(id)&&snapshot.preferences[backupPreferencePrefix+id]===undefined){used.add(id);return id;}}throw new Error('Could not allocate an unoccupied filter id');}
  for(const entry of backup.filters){
    const local=byId.get(entry.document.id),content=backupContent(entry.document);let id=entry.document.id;
    if(local){if(backupContent(local)===content){counts.identical++;continue;}counts.conflicts++;if(contentCopies.has(content)){counts.identical++;continue;}if(conflictPolicy==='skip')continue;id=freshId(id);counts.copies++;}
    else{
      if(snapshot.preferences[backupPreferencePrefix+id]!==undefined){
        // A previous restore may have remapped this ID around an orphan key.
        // Only this occupied-key path searches copies; ordinary new IDs stay distinct.
        const copyPrefix=`${id.slice(0,64)}-copy-`;
        if(existing.some(saved=>saved.document.id.startsWith(copyPrefix)&&/^\d+$/.test(saved.document.id.slice(copyPrefix.length))&&backupContent(saved.document)===content)){counts.identical++;continue;}
        id=freshId(id);
      }
      counts.new++;
    }
    const {document,preferences,...timestamps}=entry;additions.push({...document,id,...timestamps});preferenceWrites.push([backupPreferencePrefix+id,JSON.stringify({version:1,...preferences})]);contentCopies.add(content);
  }
  counts.added=additions.length;
  const destination=[...snapshot.records,...additions];backupLocalEntries(destination,{});
  const serialized=JSON.stringify(destination),storageBytes=2*(LIBRARY_STORAGE_KEY.length+serialized.length+[...Object.entries(snapshot.preferences),...preferenceWrites].reduce((sum,[key,value])=>sum+key.length+(value?.length||0),0));
  if(storageBytes>LIBRARY_STORAGE_MAX_BYTES)throw new Error('Proposed library exceeds the 4 MiB storage budget; existing library was preserved');
  return{serialized,preferenceWrites,counts,expectedRaw:snapshot.raw};
}
export function commitLibraryMerge(storage,snapshot,plan){
  if(plan.expectedRaw!==snapshot.raw||storage.getItem(LIBRARY_STORAGE_KEY)!==snapshot.raw||plan.preferenceWrites.some(([key])=>storage.getItem(key)!==null))throw new Error('Library changed in another tab. Review the import again.');
  if(!plan.counts.added)return plan.counts;
  const created=[];
  try{
    for(const [key,value] of plan.preferenceWrites){storage.setItem(key,value);created.push([key,value]);}
    // Collection last: failed preference preparation cannot expose partial filters.
    if(storage.getItem(LIBRARY_STORAGE_KEY)!==snapshot.raw)throw new Error('Library changed in another tab. Review the import again.');
    storage.setItem(LIBRARY_STORAGE_KEY,plan.serialized);
  }catch(error){let cleanupFailed=false;for(const [key,value] of created){try{if(storage.getItem(key)===value)storage.removeItem(key);}catch{cleanupFailed=true;}}throw new Error(`Import failed; the existing library was preserved. ${error.message}${cleanupFailed?' Some orphan preferences could not be removed.':''}`);}
  return plan.counts;
}
