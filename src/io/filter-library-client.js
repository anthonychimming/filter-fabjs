import { validateOnlineLibraryManifest } from './filter-library-manifest.js';

export const DEFAULT_ONLINE_LIBRARY_MANIFEST_URL='https://anthonychimming.github.io/filter-fabjs-library/catalogue.json';
export const ONLINE_LIBRARY_MANIFEST_MAX_BYTES=8*1024*1024;
export const ONLINE_LIBRARY_TIMEOUT_MS=12000;

function onlineManifestUrl(value){
  const url=new URL(value);
  const loopback=['localhost','127.0.0.1','[::1]'].includes(url.hostname);
  if((url.protocol!=='https:'&&!(url.protocol==='http:'&&loopback))||url.username||url.password||url.hash)throw new Error('Online library manifest requires HTTPS (or localhost for testing)');
  return url;
}

// relativePath must come from the Stage 1 validator; also fail closed on origin escape.
export function resolveOnlineLibraryAssetUrl(manifestUrl,relativePath){
  const base=onlineManifestUrl(manifestUrl);
  if(typeof relativePath!=='string'||!relativePath||relativePath!==relativePath.trim()||/^[A-Za-z][A-Za-z0-9+.-]*:|^[\/\\]|[\\?#\p{Cc}]/u.test(relativePath))throw new Error('Online library asset must be a relative path');
  const url=new URL(relativePath,base);
  if(url.origin!==base.origin)throw new Error('Online library asset must remain on the manifest origin');
  return url.href;
}

export async function fetchOnlineLibraryManifest(manifestUrl,{fetchImpl=globalThis.fetch,signal,timeoutMs=ONLINE_LIBRARY_TIMEOUT_MS}={}){
  const url=onlineManifestUrl(manifestUrl).href;
  if(!Number.isFinite(timeoutMs)||timeoutMs<=0)throw new Error('Online library timeout must be positive and finite');
  const controller=new AbortController(),abort=()=>controller.abort(signal.reason);
  if(signal?.aborted)abort();else signal?.addEventListener('abort',abort,{once:true});
  const timer=setTimeout(()=>controller.abort(new Error('Online library request timed out')),timeoutMs);
  let rejectAbort;
  const aborted=new Promise((_,reject)=>{rejectAbort=()=>reject(controller.signal.reason);if(controller.signal.aborted)rejectAbort();else controller.signal.addEventListener('abort',rejectAbort,{once:true});});
  try{
    return await Promise.race([aborted,(async()=>{
      controller.signal.throwIfAborted();
      const response=await fetchImpl(url,{method:'GET',credentials:'omit',cache:'no-store',redirect:'error',signal:controller.signal});
      if(!response.ok)throw new Error(`Online library HTTP ${response.status}`);
      if(Number(response.headers.get('Content-Length'))>ONLINE_LIBRARY_MANIFEST_MAX_BYTES)throw new Error('Online library manifest exceeds 8 MiB');
      const bytes=new Uint8Array(await response.arrayBuffer());controller.signal.throwIfAborted();
      if(bytes.byteLength>ONLINE_LIBRARY_MANIFEST_MAX_BYTES)throw new Error('Online library manifest exceeds 8 MiB');
      if(!bytes.byteLength)throw new Error('Online library manifest is empty');
      let text;try{text=new TextDecoder('utf-8',{fatal:true}).decode(bytes);}catch{throw new Error('Online library manifest is not valid UTF-8');}
      let value;try{value=JSON.parse(text);}catch{throw new Error('Online library manifest is not valid JSON');}
      return{manifest:validateOnlineLibraryManifest(value),manifestUrl:url};
    })()]);
  }finally{clearTimeout(timer);signal?.removeEventListener('abort',abort);controller.signal.removeEventListener('abort',rejectAbort);}
}
