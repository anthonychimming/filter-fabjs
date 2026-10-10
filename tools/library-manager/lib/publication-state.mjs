import { DEFAULT_ONLINE_LIBRARY_MANIFEST_URL, fetchOnlineLibraryManifest } from '../../../src/io/filter-library-client.js';

export async function onlinePublication({fetchImpl=globalThis.fetch,timeoutMs=8000}={}){
  const url=DEFAULT_ONLINE_LIBRARY_MANIFEST_URL;
  try{
    const {manifest}=await fetchOnlineLibraryManifest(url,{fetchImpl,timeoutMs});
    return{state:'checked',url,checkedAt:new Date().toISOString(),manifest,error:null};
  }catch(error){
    // A failed refresh discards the old result; local files cannot substitute
    // for confirmation from the validated production catalogue.
    return{state:'unknown',url,checkedAt:new Date().toISOString(),manifest:null,error:`Could not confirm Online Library status. Local library management remains available. ${error.message}`};
  }
}

export function publicationState({id,current,pending,hasHistory,contentState,git={},online={}}){
  const expectedRevision=pending?.revision||current?.revision||null;
  const removing=pending?.kind==='unpublish'||(!pending&&!current&&hasHistory);
  const entry=online.manifest?.filters.find(item=>item.id===id)||null;
  const confirmed=online.state==='checked';
  const matches=confirmed&&(removing?!entry:expectedRevision!==null&&entry?.revision===expectedRevision);
  const inRegistry=registry=>registry?removing?!registry.filters.some(item=>item.id===id):expectedRevision!==null&&registry.filters.some(item=>item.id===id&&item.revision===expectedRevision):false;
  const localCommit=!pending&&(!!current||removing)&&inRegistry(git.localRegistry);
  // Absence alone cannot prove a removal was merged: require the containing
  // local commit to be reachable from origin/main for that case.
  const remote=git.remotePublication;
  const tracked=!pending&&!!remote?.prepared&&remote.prepared.commit===git.head&&remote.prepared.changes.some(change=>change.id===id&&((change.kind==='unpublish')===removing)&&(removing||change.revision===expectedRevision));
  const pr=tracked?remote.pr:null;
  const remoteMain=localCommit&&(pr?.state==='MERGED'||inRegistry(git.mainRegistry)&&(!removing||git.headOnMain));
  const pushed=localCommit&&(tracked&&remote.pushed||git.upstream?.startsWith('refs/remotes/')&&git.headOnUpstream&&inRegistry(git.upstreamRegistry));
  const gitState=pending?'unprepared':remoteMain?'merged-main':pushed?'pushed-branch':localCommit?'prepared-local':git.error?'unknown':'unprepared';
  const deploymentState=matches?'online':pr?.state==='MERGED'&&pr.deployment?.state==='Failed'?'deployment-failed':!confirmed?'unknown':gitState==='merged-main'?'deployment-pending':'not-online';
  let status=({draft:'Draft',ready:'Ready to Publish',changed:'Changed',unpublished:'Unpublished',invalid:'Invalid',incomplete:'Incomplete'})[contentState];
  if(!pending&&['ready','unpublished'].includes(contentState)){
    if(matches)status=removing?'Unpublished':'Published Online';
    else if(gitState==='merged-main')status=deploymentState==='deployment-failed'?'Merged · Deployment Failed':confirmed?'Merged · Awaiting Online Deployment':'Merged · Online Status Unknown';
    else if(pr?.state==='CLOSED')status='PR Closed';
    else if(gitState==='pushed-branch')status=pr?.state==='OPEN'?pr.remoteStatusUnavailable?'PR Status Unknown':pr.checks==='Failed'?'PR Open · Checks Failed':'PR Open':'Pushed';
    else if(gitState==='prepared-local')status='Prepared Locally';
    else if(!confirmed)status='Online Status Unknown';
  }
  return{status,pr,expectedRevision,gitState,deploymentState,localCandidate:!!pending,localCommit,remoteMain,onlineRevision:entry?.revision||null,onlinePublishedAt:entry?.publishedAt||null,onlineConfirmed:matches,removing};
}
