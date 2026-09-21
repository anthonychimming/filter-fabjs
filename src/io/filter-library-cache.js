import { validateOnlineLibraryManifest } from './filter-library-manifest.js';

export const ONLINE_LIBRARY_CACHE_KEY='ffw-online-library-cache-v1';
export const ONLINE_LIBRARY_PERSISTED_MANIFEST_MAX_BYTES=2*1024*1024;

function onlineCacheStorage(storage){return typeof storage==='function'?storage():storage;}
function onlineCacheFits(text){return text.length<=ONLINE_LIBRARY_PERSISTED_MANIFEST_MAX_BYTES&&new TextEncoder().encode(text).byteLength<=ONLINE_LIBRARY_PERSISTED_MANIFEST_MAX_BYTES;}

// Storage access is lazy and best-effort; browser-local data is untrusted.
export function readOnlineLibraryCache({storage,manifestUrl}){
  try{
    const raw=onlineCacheStorage(storage)?.getItem(ONLINE_LIBRARY_CACHE_KEY);
    if(typeof raw!=='string'||!onlineCacheFits(raw))return null;
    const record=JSON.parse(raw);
    if(record?.cacheSchema!==1||record.manifestUrl!==manifestUrl)return null;
    return validateOnlineLibraryManifest(record.manifest);
  }catch{return null;}
}

export function writeOnlineLibraryCache({storage,manifestUrl,manifest,now=()=>new Date().toISOString()}){
  try{
    const normalized=validateOnlineLibraryManifest(manifest),target=onlineCacheStorage(storage);
    if(!target)return false;
    // Another tab may have stored a newer valid catalogue since our hydration.
    const previous=readOnlineLibraryCache({storage:target,manifestUrl});
    if(previous&&previous.libraryVersion>normalized.libraryVersion)return false;
    const raw=JSON.stringify({cacheSchema:1,manifestUrl,storedAt:now(),manifest:normalized});
    if(!onlineCacheFits(raw))return false;
    target.setItem(ONLINE_LIBRARY_CACHE_KEY,raw);return true;
  }catch{return false;}
}
