import { portableEqual } from '../../online-library/publish-library.mjs';

export function deriveState({source,current,history=[],pending,everPublished=false}){
  if(pending)return pending.kind==='unpublish'?'Ready to Publish':pending.approved?'Ready to Publish':'Draft';
  if(source?.error||history.some(item=>item.error))return 'Invalid';
  if(!source?.document)return 'Incomplete';
  if(everPublished&&!history.length)return 'Incomplete';
  if(current){const pkg=history.find(item=>item.revision===current.revision);if(!pkg)return 'Incomplete';return portableEqual(source.document,pkg.document)?'Published':'Changed';}
  return history.length?'Unpublished':'Draft';
}
export function catalogue(snapshot,pending=new Map()){
  const entries=new Map(snapshot.registry?.filters.map(entry=>[entry.id,entry])||[]),groups=new Map();
  for(const pkg of snapshot.packages.values()){if(!groups.has(pkg.id))groups.set(pkg.id,[]);groups.get(pkg.id).push(pkg);}
  const ids=new Set([...snapshot.sources.keys(),...entries.keys(),...groups.keys(),...(snapshot.publishedIds||[]),...pending.keys()]);
  return[...ids].map(id=>{
    const source=snapshot.sources.get(id),current=entries.get(id),history=groups.get(id)||[],candidate=pending.get(id),document=candidate?.document||source?.document||history.at(-1)?.document;
    const everPublished=snapshot.publishedIds?.has(id)||false;
    const hasEverBeenPublished=!!current||history.length>0||everPublished;
    const canDeleteDraft=!hasEverBeenPublished&&snapshot.historyComplete===true&&candidate?.kind!=='delete-draft'&&!!(source||candidate?.kind==='add');
    const canPrepareDraft=!hasEverBeenPublished&&!candidate;
    return{id,name:document?.name||id,author:document?.author||'',description:document?.description||'',tags:document?.tags||[],document:document||null,status:deriveState({source,current,history,pending:candidate,everPublished}),revision:current?.revision||null,publishedAt:current?.publishedAt||null,modifiedAt:source?.modifiedAt||null,nextRevision:Math.max(0,...history.map(item=>item.revision))+1,hasHistory:hasEverBeenPublished,hasEverBeenPublished,canDeleteDraft,canPrepareDraft,canUpdate:!!current,canUnpublish:!!current,canRepublish:hasEverBeenPublished&&!current,current:!!current,issues:[source?.error,...history.map(item=>item.error)].filter(Boolean),preview:current?`/api/preview/${encodeURIComponent(id)}/${current.revision}`:null,pending:candidate?{kind:candidate.kind,revision:candidate.revision,approved:candidate.approved}:null};
  }).sort((a,b)=>a.name.localeCompare(b.name)||a.id.localeCompare(b.id));
}
export function changeSummary(before,after){
  if(!before)return[{field:'Filter',before:null,after:'New filter'}];const changes=[];
  for(const field of ['name','author','description','tags','mathMode'])if(JSON.stringify(before[field])!==JSON.stringify(after[field]))changes.push({field,before:before[field],after:after[field]});
  for(let i=0;i<Math.max(before.controls.length,after.controls.length);i++){const a=before.controls[i],b=after.controls[i];for(const field of ['label','value','ui'])if(JSON.stringify(a?.[field])!==JSON.stringify(b?.[field]))changes.push({field:`Control ${i+1} ${field==='value'?'default':field==='ui'?'definition':field}`,before:a?.[field],after:b?.[field]});}
  for(let i=0;i<4;i++)if(before.formulas[i]!==after.formulas[i])changes.push({field:`${'RGBA'[i]} formula`,before:before.formulas[i],after:after.formulas[i]});
  return changes;
}
