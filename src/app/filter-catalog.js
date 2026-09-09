import { normalizeTags, tagKey, searchText } from '../core/filter-metadata.js';
export const PREFERENCE_PREFIX='ffw-entry-v1:';
export function readEntryPreference(storage,key){
  const raw=storage.getItem(PREFERENCE_PREFIX+key);
  if(raw===null)return{version:1,favorite:false,tags:[]};
  const value=JSON.parse(raw);
  if(!value||value.version!==1||typeof value.favorite!=='boolean')throw new Error('Organization preferences are corrupt; stored data was preserved');
  return{...value,tags:normalizeTags(value.tags)};
}
export function writeEntryPreference(storage,key,change){
  const next={...readEntryPreference(storage,key),...change,version:1};next.tags=normalizeTags(next.tags);
  storage.setItem(PREFERENCE_PREFIX+key,JSON.stringify(next));return next;
}
export function catalogEntry(document,source,preference){
  let tags=[],unavailable=false;
  try{tags=normalizeTags(document.tags);}catch{unavailable=true;}
  if(source==='builtin')tags=[...new Map([...tags,...preference.tags].map(tag=>[tagKey(tag),tag])).values()];
  const name=String(document.name||'Unavailable filter'),description=String(document.description||''),author=String(document.author||'');
  return{key:`${source}:${document.id}`,source,name,description,author,tags,favorite:preference.favorite,document,unavailable,index:[name,description,author,...tags].map(searchText)};
}
export function searchCatalog(entries,{query='',source='all',favorites=false,tags=[],sort='az'}={}){
  const text=searchText(query),terms=text.split(' ').filter(Boolean);
  const scoped=entries.filter(entry=>(source==='all'||entry.source===source)&&(!favorites||entry.favorite));
  const choices=new Map();for(const entry of scoped)for(const tag of entry.tags)if(!choices.has(tagKey(tag)))choices.set(tagKey(tag),tag);
  const rank=entry=>entry.index[0]===text?0:entry.index[0].startsWith(text)?1:terms.every(term=>entry.index[0].includes(term))?2:3;
  const results=scoped.filter(entry=>tags.every(tag=>entry.tags.some(label=>tagKey(label)===tag))&&terms.every(term=>entry.index.some(field=>field.includes(term))));
  results.sort((a,b)=>(text&&sort==='relevance'?rank(a)-rank(b):0)||a.name.localeCompare(b.name)||a.source.localeCompare(b.source)||a.key.localeCompare(b.key));
  return{results,choices:[...choices].sort((a,b)=>a[1].localeCompare(b[1]))};
}
export function readLibrary(storage,normalize){
  const raw=storage.getItem('ffw-custom-presets');
  const parsed=raw===null?[]:JSON.parse(raw);
  if(!Array.isArray(parsed))throw new Error('Saved filter storage is corrupt; Export your draft. Stored data was preserved.');
  const result=normalize(parsed);
  if(result.migrated)storage.setItem('ffw-custom-presets',JSON.stringify(result.storageList));
  return result;
}
export function writeLibraryRecord(storage,normalize,filter,{targetId=null,expected=null}={}){
  const {storageList}=readLibrary(storage,normalize),index=storageList.findIndex(item=>item?.id===(targetId||filter.id));
  if(targetId&&(index<0||JSON.stringify(storageList[index])!==expected))throw new Error('This filter changed in another tab. Review the current record before updating.');
  if(!targetId&&index>=0)throw new Error('An existing filter has this ID.');
  const now=new Date().toISOString(),record={...(targetId?storageList[index]:{}),...filter,createdAt:targetId?storageList[index].createdAt||now:now,updatedAt:now};
  if(targetId)storageList[index]=record;else storageList.push(record);
  storage.setItem('ffw-custom-presets',JSON.stringify(storageList));return record;
}
