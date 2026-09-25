import { resolveOnlineLibraryAssetUrl } from './filter-library-client.js';
import { extractFilterFabMetadata } from './png-metadata.js';
import { validateNativeFilter } from './filter-format.js';
import { normalizeTags, tagKey, validatePortableId } from '../core/filter-metadata.js';

export const ONLINE_LIBRARY_PACKAGE_MAX_BYTES=8*1024*1024;
export const ONLINE_LIBRARY_PACKAGE_TIMEOUT_MS=18000;

export function onlinePackageFilename(id){
  if(!validatePortableId(id))throw new Error('Online package requires a portable id');
  return `filterfab-${id}.png`;
}

async function readOnlinePackageBytes(response,signal){
  // Stop oversized bodies while receiving them, even without Content-Length.
  if(!response.body?.getReader){
    const bytes=new Uint8Array(await response.arrayBuffer());signal.throwIfAborted();
    if(bytes.byteLength>ONLINE_LIBRARY_PACKAGE_MAX_BYTES)throw new Error('Online package exceeds 8 MiB');
    return bytes;
  }
  const reader=response.body.getReader(),parts=[];
  let length=0,complete=false;
  const abort=()=>{reader.cancel().catch(()=>{});};signal.addEventListener('abort',abort,{once:true});
  try{
    while(true){
      signal.throwIfAborted();const {done,value}=await reader.read();signal.throwIfAborted();
      if(done){complete=true;break;}
      length+=value.byteLength;if(length>ONLINE_LIBRARY_PACKAGE_MAX_BYTES)throw new Error('Online package exceeds 8 MiB');
      parts.push(value);
    }
    const bytes=new Uint8Array(length);let offset=0;for(const part of parts){bytes.set(part,offset);offset+=part.byteLength;}return bytes;
  }finally{signal.removeEventListener('abort',abort);if(!complete)reader.cancel().catch(()=>{});reader.releaseLock();}
}

export function assertOnlinePackageIdentity(entry,document){
  for(const [field,expected] of [['id',entry.remote.id],['name',entry.name],['author',entry.author],['description',entry.description]]){
    if(document[field]!==expected)throw new Error(`Online package ${field} does not match the catalogue`);
  }
  const canonicalTags=tags=>JSON.stringify(normalizeTags(tags).map(tagKey).sort());
  if(canonicalTags(document.tags)!==canonicalTags(entry.tags))throw new Error('Online package tags do not match the catalogue');
}

// Network trust path; the session cache only stores successful results of this function.
export async function fetchOnlineFilterPackage(entry,{fetchImpl=globalThis.fetch,signal,manifestUrl,timeoutMs=ONLINE_LIBRARY_PACKAGE_TIMEOUT_MS}={}){
  if(entry?.source!=='online'||entry.document!==null||entry.remote?.documentType!=='filter'||entry.remote?.filterFormat!==2)throw new Error('Expected an Online filter entry');
  const packageUrl=resolveOnlineLibraryAssetUrl(manifestUrl,entry.remote.package.url);
  if(!Number.isFinite(timeoutMs)||timeoutMs<=0)throw new Error('Online package timeout must be positive and finite');
  const controller=new AbortController(),abort=()=>controller.abort(signal.reason);
  if(signal?.aborted)abort();else signal?.addEventListener('abort',abort,{once:true});
  const timer=setTimeout(()=>controller.abort(new Error('Online package request timed out')),timeoutMs);
  let rejectAbort;
  const aborted=new Promise((_,reject)=>{rejectAbort=()=>reject(controller.signal.reason);if(controller.signal.aborted)rejectAbort();else controller.signal.addEventListener('abort',rejectAbort,{once:true});});
  try{
    return await Promise.race([aborted,(async()=>{
      controller.signal.throwIfAborted();
      const response=await fetchImpl(packageUrl,{method:'GET',credentials:'omit',cache:'no-store',redirect:'error',signal:controller.signal});
      controller.signal.throwIfAborted();
      if(!response.ok)throw new Error(`Online package HTTP ${response.status}`);
      if(response.url&&new URL(response.url).origin!==new URL(packageUrl).origin)throw new Error('Online package response escaped the manifest origin');
      if(Number(response.headers.get('Content-Length'))>ONLINE_LIBRARY_PACKAGE_MAX_BYTES)throw new Error('Online package exceeds 8 MiB');
      const bytes=await readOnlinePackageBytes(response,controller.signal);controller.signal.throwIfAborted();
      if(!bytes.byteLength)throw new Error('Online package is empty');
      const envelope=await extractFilterFabMetadata(new Blob([bytes],{type:'image/png'}));controller.signal.throwIfAborted();
      if(!envelope)throw new Error('Online package has no FilterFabJS metadata');
      const document=validateNativeFilter(envelope.document);
      assertOnlinePackageIdentity(entry,document);
      controller.signal.throwIfAborted();
      return{entryKey:entry.key,revision:entry.remote.revision,packageUrl,bytes,document};
    })()]);
  }finally{clearTimeout(timer);signal?.removeEventListener('abort',abort);controller.signal.removeEventListener('abort',rejectAbort);controller.abort();}
}

export const ONLINE_PACKAGE_CACHE_MAX_ENTRIES=12;
export const ONLINE_PACKAGE_CACHE_MAX_BYTES=32*1024*1024;

export function createOnlinePackageCache({manifestUrl,fetchImpl=globalThis.fetch,maxEntries=ONLINE_PACKAGE_CACHE_MAX_ENTRIES,maxBytes=ONLINE_PACKAGE_CACHE_MAX_BYTES}={}){
  if(!Number.isSafeInteger(maxEntries)||maxEntries<1||!Number.isSafeInteger(maxBytes)||maxBytes<1)throw new Error('Package cache bounds must be positive safe integers');
  const records=new Map();let byteLength=0,generation=0;
  const keyFor=entry=>JSON.stringify([manifestUrl,entry.key,entry.remote.revision,resolveOnlineLibraryAssetUrl(manifestUrl,entry.remote.package.url)]);
  const remove=key=>{const record=records.get(key);if(record){byteLength-=record.size;records.delete(key);}};
  const copy=record=>({entryKey:record.entryKey,revision:record.revision,packageUrl:record.packageUrl,bytes:record.bytes.slice(),document:JSON.parse(record.documentJson)});
  return{
    async resolve(entry,{signal}={}){
      signal?.throwIfAborted();const key=keyFor(entry),epoch=generation;
      let record=records.get(key);
      if(record){
        // Same-version catalogue metadata is authoritative too; never reuse a mismatch.
        try{assertOnlinePackageIdentity(entry,JSON.parse(record.documentJson));}catch{remove(key);record=null;}
      }
      if(record){records.delete(key);records.set(key,record);await Promise.resolve();signal?.throwIfAborted();return copy(record);}
      const resolved=await fetchOnlineFilterPackage(entry,{manifestUrl,fetchImpl,signal});signal?.throwIfAborted();
      const documentJson=JSON.stringify(resolved.document),bytes=resolved.bytes.slice(),size=bytes.byteLength+new TextEncoder().encode(documentJson).byteLength;
      record={entryKey:resolved.entryKey,revision:resolved.revision,packageUrl:resolved.packageUrl,bytes,documentJson,size};
      if(epoch===generation&&size<=maxBytes){
        remove(key);records.set(key,record);byteLength+=size;
        while(records.size>maxEntries||byteLength>maxBytes)remove(records.keys().next().value);
      }
      return copy(record);
    },
    prune(entries){
      generation++;const current=new Map(entries.map(entry=>[keyFor(entry),entry]));
      for(const [key,record] of records){
        const entry=current.get(key);if(!entry){remove(key);continue;}
        try{assertOnlinePackageIdentity(entry,JSON.parse(record.documentJson));}catch{remove(key);}
      }
    },
    clear(){generation++;records.clear();byteLength=0;},
    diagnostics:()=>({entries:records.size,bytes:byteLength})
  };
}
