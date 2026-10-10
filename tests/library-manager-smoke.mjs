import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { deflateSync } from 'node:zlib';
import { request } from 'node:http';
import vm from 'node:vm';
import { GitClient } from '../tools/library-manager/lib/git-client.mjs';
import { GitHubClient, LIBRARY_REPOSITORY } from '../tools/library-manager/lib/github-client.mjs';
import { LibraryManager } from '../tools/library-manager/lib/operations.mjs';
import { catalogue, deriveState, changeSummary } from '../tools/library-manager/lib/catalogue-state.mjs';
import { checkedPath, relativePath, digest } from '../tools/library-manager/lib/repository.mjs';
import { startManagerServer } from '../tools/library-manager/server.mjs';
import { validateNativeFilter } from '../src/io/filter-format.js';
import { validationReport, validateLibrary, buildLibrary } from '../tools/online-library/publish-library.mjs';
import { createFilterFabPngEnvelope, embedFilterFabMetadata } from '../src/io/png-metadata.js';
import { packageFixtureDocument } from './helpers/online-package-fixture.js';

// Test artwork only, never an approved production reference.
function chunk(type,data){const label=Buffer.from(type),out=Buffer.alloc(data.length+12);out.writeUInt32BE(data.length);label.copy(out,4);data.copy(out,8);let crc=0xffffffff;for(const byte of Buffer.concat([label,data])){crc^=byte;for(let i=0;i<8;i++)crc=(crc>>>1)^((crc&1)?0xedb88320:0);}out.writeUInt32BE((crc^0xffffffff)>>>0,out.length-4);return out;}
function image(width=512){const header=Buffer.alloc(13);header.writeUInt32BE(width);header.writeUInt32BE(512,4);header[8]=8;header[9]=6;return new Blob([Buffer.from([137,80,78,71,13,10,26,10]),chunk('IHDR',header),chunk('IDAT',deflateSync(Buffer.alloc((width*4+1)*512))),chunk('IEND',Buffer.alloc(0))]);}
const document={...packageFixtureDocument,id:'manager-test',name:'Manager fixture'},date='2026-10-04';
const png=async(doc=document,width=512)=>Buffer.from(await(await embedFilterFabMetadata(image(width),createFilterFabPngEnvelope(doc,'2.9.3'))).arrayBuffer());
const original=await png(),sandbox=await fs.mkdtemp(path.join(os.tmpdir(),'filter-fab-manager-test-')),managers=[];
const put=async(root,file,value)=>{await fs.mkdir(path.dirname(path.join(root,file)),{recursive:true});await fs.writeFile(path.join(root,file),typeof value==='string'||Buffer.isBuffer(value)?value:JSON.stringify(value));};
const git=(root,...args)=>execFileSync('git',['-c',`safe.directory=${root.replaceAll('\\','/')}`,'-c','core.hooksPath=/dev/null','-C',root,...args],{encoding:'utf8',stdio:'pipe'}).trim();
async function fixture(name,{revision=1,unpublished=false}={}){
  const root=path.join(sandbox,name);await put(root,'registry.json',{schema:'filter-fab-js/library-registry',schemaVersion:1,libraryVersion:2,filters:unpublished?[]:[{id:document.id,revision,publishedAt:'2026-09-23'}]});
  await put(root,`source/${document.id}.json`,document);await put(root,`filters/${document.id}-r1.png`,original);if(revision>1)await put(root,`filters/${document.id}-r${revision}.png`,original);await put(root,'site/index.html','<!doctype html><title>Test library</title>');
  git(root,'init','-b','main');git(root,'config','user.name','Manager Test');git(root,'config','user.email','manager@example.invalid');git(root,'add','.');git(root,'commit','-m','Fixture baseline');return root;
}
const manifestFor=(entries=[{document,revision:1}])=>({schema:'filter-fab-js/library',schemaVersion:1,libraryVersion:3,filters:entries.map(({document:doc,revision})=>({id:doc.id,revision,name:doc.name,author:doc.author||'',description:doc.description||'',tags:doc.tags||[],documentType:'filter',filterFormat:2,preview:{url:`filters/${doc.id}-r${revision}.png`,width:512,height:512},package:{url:`filters/${doc.id}-r${revision}.png`}}))});
async function open(root,options={}){const manager=await LibraryManager.open({libraryRoot:root,date:()=>date,githubClient:new GitHubClient(root,{env:{},fetchImpl:()=>assert.fail('Tests must not use live GitHub or developer credentials')}),fetchImpl:async()=>new Response(JSON.stringify(manifestFor())),...options});managers.push(manager);return manager;}
async function queue(manager,kind,doc,bytes,{json=true}={}){bytes??=await png(doc);const inspected=await manager.inspect({kind,id:kind==='add'?undefined:doc.id,...(json?{sourceBase64:Buffer.from(JSON.stringify(doc)).toString('base64')}:{}),packageBase64:bytes.toString('base64')});await manager.accept({token:inspected.token,approved:true});return inspected;}
const code=expected=>error=>error.code===expected;
const httpStatus=(url,headers)=>new Promise((resolve,reject)=>{const call=request(url,{headers},response=>{response.resume();response.on('end',()=>resolve(response.statusCode));});call.on('error',reject);call.end();});
// Render the real UI functions against a small DOM double so status labels,
// older online revisions, preparation guidance and workspace counts are covered.
const uiSource=await fs.readFile(new URL('../tools/library-manager/ui/library-manager.js',import.meta.url),'utf8');
function publicationUi(summary,id){
  class Node{
    constructor(text=''){this.textContent=text;this.children=[];this.value='';this.dataset={};}
    append(...children){this.children.push(...children);}
    replaceChildren(...children){this.children=children;}
    setAttribute(){} addEventListener(){} remove(){} focus(){}
    querySelector(){return new Node();}
  }
  const nodes=new Map(),get=id=>{if(!nodes.has(id))nodes.set(id,new Node());return nodes.get(id);};get('status').value='All';get('sort').value='name';
  const context={state:summary,selected:id,section:'publish',review:null,$:get,el:(_tag,text)=>new Node(text),button:(text)=>new Node(text),image:()=>new Node(),note(){},document:{createTextNode:text=>new Node(text)}};
  const badgeHelpers=uiSource.slice(uiSource.indexOf('const statusSemantics='),uiSource.indexOf('const button='));
  vm.runInNewContext(badgeHelpers+uiSource.slice(uiSource.indexOf('function render(){'),uiSource.indexOf("$('search').addEventListener"))+';render();',context);
  const flatten=node=>[node.textContent,...node.children.flatMap(flatten)].filter(Boolean).join(' ');
  return{details:flatten(get('details')),workspace:flatten(get('publish-panel')),count:get('pending-count').textContent,list:flatten(get('filters'))};
}
try{
  const source={document:validateNativeFilter(document)},history=[{revision:1,document:source.document}],current={revision:1};
  const onlineOnlySnapshot={registry:{filters:[]},sources:new Map([[document.id,source]]),packages:new Map(),publishedIds:new Set(),historyComplete:true};
  const onlineProtected=catalogue(onlineOnlySnapshot,new Map(),{online:{state:'checked',manifest:manifestFor()}})[0];assert.equal(onlineProtected.historicallyProtected,true);assert.equal(onlineProtected.hasEverBeenPublished,true);assert.equal(onlineProtected.canDeleteDraft,false);assert.equal(onlineProtected.contentState,'incomplete');
  const offlineProtected=catalogue(onlineOnlySnapshot,new Map(),{online:{state:'unknown'},onlineHistory:new Set([document.id])})[0];assert.equal(offlineProtected.canDeleteDraft,false);assert.equal(offlineProtected.publication.deploymentState,'unknown');
  assert.equal(deriveState({source,current,history}),'Ready');assert.equal(deriveState({source}),'Draft');assert.equal(deriveState({source,history}),'Unpublished');assert.equal(deriveState({source,current,history:[]}),'Incomplete');assert.equal(deriveState({source:{error:{}},current,history}),'Invalid');assert.equal(deriveState({source:{document:{...source.document,name:'Changed'}},current,history}),'Changed');assert.equal(deriveState({pending:{approved:true,kind:'add'}}),'Ready to Publish');
  const summary=changeSummary(source.document,validateNativeFilter({...document,name:'New',author:'Someone',description:'Updated',tags:['Other'],mathMode:'legacy',controls:[{label:'New control',value:44}],formulas:['r','g','b','a']}));for(const field of ['name','author','description','tags','mathMode','Control 1 label','Control 1 default','R formula'])assert.ok(summary.some(item=>item.field===field));
  for(const file of ['../outside','source/../x.json','source/a\\b.json','/registry.json','filters/x-r0.png'])assert.throws(()=>relativePath(file),code('UNSAFE_PATH'));
  const root=await fixture('batch'),manager=await open(root),before=await fs.readFile(path.join(root,'registry.json'));
  const added={...document,id:'brand-new',name:'New filter'},updated={...document,description:'Revision two'};
  // Exact version persists through planning, canonical application, the index,
  // the final commit and generated catalogue; a batch increments only once.
  for(const [kind,beforeVersion,afterVersion] of [['add',3,4],['update',4,5],['unpublish',5,6]]){
    const versionRoot=await fixture('version-'+kind),registry=JSON.parse(await fs.readFile(path.join(versionRoot,'registry.json'),'utf8'));
    registry.libraryVersion=beforeVersion;await put(versionRoot,'registry.json',registry);git(versionRoot,'add','.');git(versionRoot,'commit','-m','Version baseline');
    const versionManager=await open(versionRoot);
    if(kind==='unpublish')await versionManager.unpublish({id:document.id,confirmed:true});else await queue(versionManager,kind,kind==='add'?added:updated);
    const result=await versionManager.validate();assert.equal(result.review.libraryVersion.after,afterVersion);
    assert.equal(JSON.parse(versionManager.review.plan.writes.get('registry.json')).libraryVersion,afterVersion);
    assert.equal(JSON.parse(await fs.readFile(path.join(versionManager.review.tree,'registry.json'))).libraryVersion,afterVersion);
    await versionManager.prepare({token:result.review.token,confirmed:true});
    assert.equal((await versionManager.git.registryAt(await versionManager.git.head())).libraryVersion,afterVersion);
    assert.equal(JSON.parse(await versionManager.git.stagedBytes('registry.json')).libraryVersion,afterVersion);
    assert.equal((await validateLibrary({libraryRoot:versionRoot,baseRef:'HEAD^'})).manifest.libraryVersion,afterVersion);
  }
  for(const fault of ['staged-version','staged-entry','planned-version','missing-write']){
    const faultRoot=await fixture(fault),faultManager=await open(faultRoot);await queue(faultManager,'add',added);const result=await faultManager.validate();
    if(fault.startsWith('staged-')){
      const stage=faultManager.git.stage.bind(faultManager.git);
      // Inject exact index bytes using a disposable file (no product hooks).
      faultManager.git.stage=async files=>{await stage(files);const registry=JSON.parse(faultManager.review.plan.writes.get('registry.json'));if(fault==='staged-version')registry.libraryVersion--;else registry.filters.find(entry=>entry.id===added.id).publishedAt='2026-10-01';const target=path.join(faultManager.temp,'wrong-registry');await fs.writeFile(target,JSON.stringify(registry));const blob=(await faultManager.git.run(['hash-object','-w',target])).trim();await faultManager.git.run(['update-index','--cacheinfo','100644',blob,'registry.json']);};
    }else if(fault==='planned-version')faultManager.review.plan.writes.set('registry.json',await fs.readFile(path.join(faultRoot,'registry.json')));
    else faultManager.review.plan.writes.delete('registry.json');
    await assert.rejects(faultManager.prepare({token:result.review.token,confirmed:true}),code(fault.startsWith('staged-')?'STAGING_MISMATCH':'REVIEW_MISMATCH'));
    assert.equal(git(faultRoot,'status','--porcelain'),'');assert.equal((await faultManager.git.registryAt(await faultManager.git.head())).libraryVersion,2);
  }
  // Match the failed live merge: r1 source, PNG and entry were retained while
  // conflict resolution silently restored the old catalogue version.
  const repairRoot=await fixture('metadata-repair');
  await put(repairRoot,`source/${added.id}.json`,added);await put(repairRoot,`filters/${added.id}-r1.png`,await png(added));
  const broken=JSON.parse(await fs.readFile(path.join(repairRoot,'registry.json'),'utf8'));broken.libraryVersion=3;await put(repairRoot,'registry.json',broken);git(repairRoot,'add','registry.json');git(repairRoot,'commit','-m','Version 3 baseline');const version3=git(repairRoot,'rev-parse','HEAD');
  broken.filters.push({id:added.id,revision:1,publishedAt:date});await put(repairRoot,'registry.json',broken);git(repairRoot,'add','.');git(repairRoot,'commit','-m','Invalid merge fixture');const invalidMerge=git(repairRoot,'rev-parse','HEAD');
  assert.match((await validationReport({libraryRoot:repairRoot,baseRef:version3})).errors[0].message,/catalogue change requires a higher libraryVersion/);
  const retainedSource=await fs.readFile(path.join(repairRoot,`source/${added.id}.json`)),retainedPng=await fs.readFile(path.join(repairRoot,`filters/${added.id}-r1.png`));
  broken.libraryVersion=4;await put(repairRoot,'registry.json',broken);
  assert.equal((await validationReport({libraryRoot:repairRoot,baseRef:invalidMerge})).valid,true);
  assert.equal((await validationReport({libraryRoot:repairRoot,baseRef:version3})).valid,true);
  assert.deepEqual(await fs.readFile(path.join(repairRoot,`source/${added.id}.json`)),retainedSource);assert.deepEqual(await fs.readFile(path.join(repairRoot,`filters/${added.id}-r1.png`)),retainedPng);
  assert.equal((await validateLibrary({libraryRoot:repairRoot,baseRef:version3})).manifest.filters.find(entry=>entry.id===added.id).revision,1);
  const repairedBuild=await buildLibrary({libraryRoot:repairRoot,baseRef:version3,generatedAt:'2026-10-09T00:00:00Z'}),repairedCatalogue=JSON.parse(await fs.readFile(path.join(repairedBuild.out,'catalogue.json')));
  assert.equal(repairedCatalogue.libraryVersion,4);assert.equal(repairedCatalogue.filters.find(entry=>entry.id===added.id).revision,1);
  // A ready Add is still never-published. Delete cancels its memory-only
  // artifacts, invalidates review, and preserves other candidates and edits.
  const cancelRoot=await fixture('cancel-add'),cancel=await open(cancelRoot);
  const cancelBefore=await fs.readFile(path.join(cancelRoot,'registry.json'));
  await queue(cancel,'add',added);await queue(cancel,'update',updated);
  const ready=cancel.summary().filters.find(item=>item.id===added.id);
  assert.equal(ready.status,'Ready to Publish');assert.equal(ready.hasEverBeenPublished,false);assert.equal(ready.canDeleteDraft,true);assert.equal(ready.canPrepareDraft,false);
  await cancel.validate();assert.ok(cancel.review);
  await put(cancelRoot,'unrelated.txt','Keep candidate cancellation unrelated');git(cancelRoot,'add','unrelated.txt');
  const dirtyBefore=git(cancelRoot,'status','--porcelain');
  const cancelled=await cancel.deleteDraft({id:added.id,confirmed:true});
  assert.equal(cancelled.pending.length,1);assert.equal(cancelled.pending[0].kind,'update');assert.equal(cancel.review,null);
  assert.ok(!cancelled.filters.some(item=>item.id===added.id));assert.equal(cancel.inspections.size,0);
  assert.ok(!cancel.plan(date).writes.has(`source/${added.id}.json`));assert.ok(!cancel.plan(date).writes.has(`filters/${added.id}-r1.png`));
  assert.equal(git(cancelRoot,'status','--porcelain'),dirtyBefore);assert.equal(await fs.readFile(path.join(cancelRoot,'unrelated.txt'),'utf8'),'Keep candidate cancellation unrelated');
  assert.deepEqual(await fs.readFile(path.join(cancelRoot,'registry.json')),cancelBefore);assert.deepEqual(await fs.readFile(path.join(cancelRoot,`filters/${document.id}-r1.png`)),original);
  await assert.rejects(fs.access(path.join(cancelRoot,`source/${added.id}.json`)));await assert.rejects(fs.access(path.join(cancelRoot,`filters/${added.id}-r1.png`)));
  const cleanCancelRoot=await fixture('clean-cancel-add'),cleanCancel=await open(cleanCancelRoot);
  await queue(cleanCancel,'add',added);const empty=await cleanCancel.deleteDraft({id:added.id,confirmed:true});assert.equal(empty.pending.length,0);assert.equal(git(cleanCancelRoot,'status','--porcelain'),'');assert.equal((await cleanCancel.validate()).review,null);
  const publishedFilter=manager.summary().filters.find(item=>item.id===document.id);assert.equal(publishedFilter.hasEverBeenPublished,true);assert.equal(publishedFilter.canDeleteDraft,false);assert.equal(publishedFilter.canPrepareDraft,false);assert.equal(publishedFilter.canUnpublish,true);
  // Publication evidence stays separate across preparation, restart, remote
  // propagation, catalogue deployment, newer revisions, removal, and offline use.
  const progressRoot=await fixture('publication-progress');
  // Registry observations accept the same BOM normalization as the publisher.
  const bomRegistry=await fs.readFile(path.join(progressRoot,'registry.json'));await put(progressRoot,'registry.json',Buffer.concat([Buffer.from([0xef,0xbb,0xbf]),bomRegistry]));git(progressRoot,'add','registry.json');git(progressRoot,'commit','-m','BOM registry baseline');
  git(progressRoot,'remote','add','origin','https://example.invalid/library.git');
  git(progressRoot,'update-ref','refs/remotes/origin/main',git(progressRoot,'rev-parse','HEAD'));
  let live=manifestFor(),transportFailure=null;
  const fetchProgress=async(url,options)=>{assert.equal(url,'https://anthonychimming.github.io/filter-fabjs-library/catalogue.json');assert.equal(options.cache,'no-store');if(transportFailure)throw new Error(transportFailure);return new Response(JSON.stringify(live));};
  const progress=await open(progressRoot,{fetchImpl:fetchProgress});
  const selectedProgress=()=>progress.summary().filters.find(item=>item.id===added.id);
  assert.equal(progress.summary().filters.find(item=>item.id===document.id).status,'Published Online');
  await queue(progress,'add',added);assert.equal(selectedProgress().status,'Ready to Publish');assert.equal(selectedProgress().publication.gitState,'unprepared');assert.equal(publicationUi(progress.summary(),added.id).count,1);
  const progressReview=await progress.validate();const preparedProgress=await progress.prepare({token:progressReview.review.token,confirmed:true});
  assert.equal(selectedProgress().status,'Prepared Locally');assert.equal(selectedProgress().publication.deploymentState,'not-online');assert.equal(selectedProgress().publication.localCommit,true);assert.equal(selectedProgress().publication.remoteMain,false);assert.equal(preparedProgress.workspaceCount,0);assert.equal(preparedProgress.pending.length,0);assert.equal(preparedProgress.gitPublication.headOnMain,false);assert.equal(selectedProgress().hasEverBeenPublished,null);assert.equal(selectedProgress().historicallyProtected,true);const preparedUi=publicationUi(preparedProgress,added.id);assert.equal(preparedUi.count,0);assert.match(preparedUi.details,/Prepared Locally/);assert.match(preparedUi.workspace,/does not publish to GitHub or the Online Library/);assert.ok(!preparedUi.details.includes('Published Online'));
  const restarted=await open(progressRoot,{fetchImpl:fetchProgress});assert.equal(restarted.lastPublication,null);assert.equal(restarted.summary().filters.find(item=>item.id===added.id).status,'Prepared Locally');
  const publicationBranch=git(progressRoot,'branch','--show-current');git(progressRoot,'update-ref','refs/remotes/origin/'+publicationBranch,git(progressRoot,'rev-parse','HEAD'));git(progressRoot,'branch','--set-upstream-to=origin/'+publicationBranch);
  await progress.refresh();assert.equal(selectedProgress().status,'Pushed');assert.equal(progress.summary().gitPublication.headOnUpstream,true);assert.ok(progress.summary().gitPublication.upstream);assert.match(progress.summary().gitPublication.refsFreshness,/local refs/);
  git(progressRoot,'update-ref','refs/remotes/origin/main',git(progressRoot,'rev-parse','HEAD'));await progress.refresh();assert.equal(selectedProgress().status,'Merged · Awaiting Online Deployment');assert.equal(selectedProgress().publication.deploymentState,'deployment-pending');assert.equal(progress.summary().gitPublication.headOnMain,true);
  transportFailure='offline';await progress.refresh();assert.equal(selectedProgress().status,'Merged · Online Status Unknown');assert.equal(selectedProgress().publication.deploymentState,'unknown');assert.equal(progress.summary().health.valid,true);assert.match(progress.summary().online.error,/Local library management remains available/);
  transportFailure=null;live=manifestFor([{document,revision:1},{document:added,revision:1}]);await progress.refresh();assert.equal(selectedProgress().status,'Published Online');assert.equal(selectedProgress().publication.onlineConfirmed,true);
  const nextAdded={...added,description:'New local revision'};await queue(progress,'update',nextAdded);assert.equal(selectedProgress().status,'Ready to Publish');assert.equal(selectedProgress().publication.expectedRevision,2);assert.equal(selectedProgress().publication.onlineRevision,1);assert.equal(selectedProgress().publication.deploymentState,'not-online');
  const nextReview=await progress.validate();await progress.prepare({token:nextReview.review.token,confirmed:true});assert.equal(selectedProgress().status,'Prepared Locally');assert.equal(selectedProgress().revision,2);assert.equal(selectedProgress().publication.onlineRevision,1);assert.equal(selectedProgress().publication.onlineConfirmed,false);const newerUi=publicationUi(progress.summary(),added.id);assert.match(newerUi.details,/Prepared Locally · Revision 2/);assert.match(newerUi.details,/r1 is Published Online; r2 is awaiting publication/);
  transportFailure='offline again';await progress.refresh();assert.equal(selectedProgress().status,'Prepared Locally');assert.equal(selectedProgress().publication.onlineRevision,null);assert.equal(selectedProgress().publication.deploymentState,'unknown');assert.equal(selectedProgress().hasEverBeenPublished,true);assert.match(publicationUi(progress.summary(),added.id).details,/Online status unknown/);
  transportFailure=null;live={schema:'invalid'};await progress.refresh();assert.equal(progress.summary().online.state,'unknown');assert.equal(selectedProgress().status,'Prepared Locally');
  progress.onlineOptions={fetchImpl:()=>new Promise(()=>{}),timeoutMs:5};await progress.refresh();assert.equal(progress.summary().online.state,'unknown');assert.match(progress.summary().online.error,/timed out/);assert.equal(progress.summary().health.valid,true);
  progress.onlineOptions={fetchImpl:async()=>({ok:true,headers:new Headers({'Content-Length':String(8*1024*1024+1)}),arrayBuffer:()=>assert.fail('oversized catalogue must not be read')}),timeoutMs:100};await progress.refresh();assert.equal(progress.summary().online.state,'unknown');assert.match(progress.summary().online.error,/8 MiB/);
  progress.onlineOptions={fetchImpl:fetchProgress,timeoutMs:100};live=manifestFor([{document,revision:1},{document:nextAdded,revision:2}]);await progress.refresh();assert.equal(selectedProgress().status,'Published Online');
  const observeGit=progress.git.publicationProgress.bind(progress.git);progress.git.publicationProgress=async()=>{throw new Error('Git observation unavailable');};await progress.refresh();assert.equal(selectedProgress().status,'Published Online');assert.equal(progress.summary().health.valid,true);assert.match(progress.summary().gitPublication.error,/Git observation unavailable/);progress.git.publicationProgress=observeGit;
  await assert.rejects(progress.deleteDraft({id:added.id,confirmed:true}),code('HISTORICAL_FILTER_PROTECTED'));
  const retainedRevision=await fs.readFile(path.join(progressRoot,'filters/'+added.id+'-r1.png'));await progress.unpublish({id:added.id,confirmed:true});assert.equal(selectedProgress().status,'Ready to Publish');const unpublishReview=await progress.validate();await progress.prepare({token:unpublishReview.review.token,confirmed:true});assert.equal(selectedProgress().contentState,'unpublished');assert.equal(selectedProgress().status,'Prepared Locally');assert.equal(selectedProgress().publication.onlineRevision,2);
  live=manifestFor();await progress.refresh();assert.equal(selectedProgress().status,'Unpublished');assert.equal(selectedProgress().canRepublish,true);assert.equal(selectedProgress().canDeleteDraft,false);assert.deepEqual(await fs.readFile(path.join(progressRoot,'filters/'+added.id+'-r1.png')),retainedRevision);await queue(progress,'republish',nextAdded);assert.equal(progress.pending.get(added.id).revision,3);
  const candidate=await manager.inspect({kind:'add',packageBase64:(await png(added)).toString('base64')});assert.equal(candidate.revision,1);assert.equal(candidate.document.id,added.id);await assert.rejects(manager.accept({token:candidate.token,approved:false}),code('VISUAL_REVIEW_REQUIRED'));await manager.accept({token:candidate.token,approved:true});
  await queue(manager,'update',updated);assert.equal(manager.pending.get(document.id).revision,2);assert.deepEqual(await fs.readFile(path.join(root,'registry.json')),before,'candidates do not alter canonical publication metadata');assert.equal(git(root,'status','--porcelain'),'');
  await assert.rejects(manager.inspect({kind:'add',packageBase64:(await png({...added,id:'BRAND-NEW'})).toString('base64')}),code('CASE_COLLISION'));
  // A pending new ID is also reserved ignoring case.
  const validation=await manager.validate();assert.equal(validation.valid,true);assert.equal(validation.review.libraryVersion.after,3);assert.match(validation.review.diff,/Revision two/);assert.match(validation.review.diff,/new file mode 100644/);assert.match(validation.review.diff,/\+\+\+ b\/source\/brand-new.json/);assert.ok(!validation.review.diff.includes(sandbox),'diff uses canonical paths rather than temporary absolute paths');assert.equal(validation.review.files.filter(item=>item.path==='registry.json').length,1);
  await assert.rejects(manager.prepare({token:validation.review.token,confirmed:false}),code('CONFIRMATION_REQUIRED'));
  const published=await manager.prepare({token:validation.review.token,confirmed:true});assert.match(published.lastPublication.branch,/^library\/publish-2026-10-04$/);assert.equal(published.pending.length,0);assert.equal(git(root,'status','--porcelain'),'');assert.deepEqual(await fs.readFile(path.join(root,`filters/${document.id}-r1.png`)),original);assert.equal((await validateLibrary({libraryRoot:root,baseRef:'HEAD^'})).registry.libraryVersion,3);
  const historical=await manager.history(document.id);assert.equal(historical.length,2);assert.equal(historical[0].publishedAt,date);assert.equal(historical[1].publishedAt,'2026-09-23');assert.ok(historical[0].metadata.document);
  await assert.rejects(manager.deleteDraft({id:document.id,confirmed:true}),code('HISTORICAL_FILTER_PROTECTED'));
  await manager.unpublish({id:document.id,confirmed:true});const removal=await manager.validate();await manager.prepare({token:removal.review.token,confirmed:true});assert.ok((await manager.summary()).filters.find(item=>item.id===document.id).contentState==='unpublished');assert.deepEqual(await fs.readFile(path.join(root,`filters/${document.id}-r1.png`)),original);assert.equal((await fs.readdir(path.join(root,'filters'))).length,3);
  const unpublishedFilter=manager.summary().filters.find(item=>item.id===document.id);assert.equal(unpublishedFilter.canDeleteDraft,false);assert.equal(unpublishedFilter.canRepublish,true);await assert.rejects(manager.deleteDraft({id:document.id,confirmed:true}),code('HISTORICAL_FILTER_PROTECTED'));
  const republish=await queue(manager,'republish',updated,await png(updated),{json:false});assert.equal(republish.revision,3);const returnReview=await manager.validate();assert.equal(returnReview.valid,true);await manager.prepare({token:returnReview.review.token,confirmed:true});assert.equal(manager.summary().filters.find(item=>item.id===document.id).revision,3);assert.match(manager.lastPublication.branch,/-3$/);
  const gapRoot=await fixture('gap',{revision:3}),gap=await open(gapRoot);assert.equal((await queue(gap,'update',{...document,name:'Above historical maximum'})).revision,4);await gap.discard({confirmed:true});assert.equal(git(gapRoot,'status','--porcelain'),'');
  const retiredRoot=await fixture('retired',{revision:3,unpublished:true}),retired=await open(retiredRoot);assert.equal((await queue(retired,'republish',document)).revision,4);
  const dirtyRoot=await fixture('dirty'),dirty=await open(dirtyRoot);await put(dirtyRoot,'unrelated.txt','Keep me');await assert.rejects(queue(dirty,'update',updated),code('DIRTY_REPOSITORY'));git(dirtyRoot,'add','unrelated.txt');await dirty.refresh();assert.equal(dirty.summary().dirty[0].path,'unrelated.txt');await dirty.discard({confirmed:true});assert.equal(await fs.readFile(path.join(dirtyRoot,'unrelated.txt'),'utf8'),'Keep me');assert.equal(git(dirtyRoot,'diff','--cached','--name-only'),'unrelated.txt');
  const staleRoot=await fixture('stale'),stale=await open(staleRoot);await queue(stale,'update',updated);await put(staleRoot,`source/${document.id}.json`,{...document,name:'External edit'});await stale.refresh();assert.equal(stale.summary().stale,true);await assert.rejects(stale.validate(),code('DIRTY_REPOSITORY'));await stale.discard({confirmed:true});assert.match(await fs.readFile(path.join(staleRoot,`source/${document.id}.json`),'utf8'),/External edit/);
  const invalidRoot=await fixture('invalid'),invalid=await open(invalidRoot);await assert.rejects(invalid.inspect({kind:'update',sourceBase64:Buffer.from(JSON.stringify(updated)).toString('base64'),packageBase64:original.toString('base64')}),code('PACKAGE_SOURCE_MISMATCH'));await assert.rejects(invalid.inspect({kind:'add',packageBase64:(await png(added,1)).toString('base64')}),code('PACKAGE_INVALID'));await assert.rejects(invalid.inspect({kind:'add',sourceBase64:Buffer.from('{').toString('base64'),packageBase64:(await png(added)).toString('base64')}));
  await put(invalidRoot,`filters/${document.id}-r1.png`,await png(updated));const parity=await validationReport({libraryRoot:invalidRoot});assert.equal(parity.valid,false);assert.equal(parity.errors[0].code,'PACKAGE_SOURCE_MISMATCH');assert.deepEqual(parity.warnings,[]);
  const candidateRoot=await fixture('candidate-validation'),candidateManager=await open(candidateRoot);await queue(candidateManager,'update',updated);const candidateItem=candidateManager.pending.get(document.id),correctPackage=candidateItem.packageFile;candidateItem.packageFile=`filters/${document.id}-r1.png`;const rejectedHistory=await candidateManager.validate();assert.equal(rejectedHistory.valid,false);candidateItem.packageFile=correctPackage;const correctBytes=candidateItem.packageBytes;candidateItem.packageBytes=original;const failedCandidate=await candidateManager.validate();assert.equal(failedCandidate.valid,false);assert.equal(failedCandidate.errors[0].code,'PACKAGE_SOURCE_MISMATCH');assert.equal(git(candidateRoot,'status','--porcelain'),'');assert.deepEqual(await fs.readFile(path.join(candidateRoot,`filters/${document.id}-r1.png`)),original);candidateItem.packageBytes=correctBytes;
  // Git conversion/clean-filter execution is refused before any canonical write.
  const attrRoot=await fixture('attributes');await put(attrRoot,'.gitattributes','source/*.json filter=untrusted\n');git(attrRoot,'add','.gitattributes');git(attrRoot,'commit','-m','Attribute fixture');const attributes=await open(attrRoot);await queue(attributes,'update',updated);const attrReview=await attributes.validate();await assert.rejects(attributes.prepare({token:attrReview.review.token,confirmed:true}),code('UNSAFE_GIT_ATTRIBUTE'));assert.equal(git(attrRoot,'status','--porcelain'),'');
  // Directory junctions/symlinks must never redirect canonical reads or writes.
  const linkRoot=await fixture('path-security'),outside=path.join(sandbox,'outside');await fs.mkdir(outside);await fs.rename(path.join(linkRoot,'source'),path.join(linkRoot,'source-backup'));await fs.symlink(outside,path.join(linkRoot,'source'),process.platform==='win32'?'junction':'dir');await assert.rejects(checkedPath(linkRoot,`source/${document.id}.json`,{missing:true}),code('UNSAFE_PATH'));await (process.platform==='win32'?fs.rmdir(path.join(linkRoot,'source')):fs.unlink(path.join(linkRoot,'source')));await fs.rename(path.join(linkRoot,'source-backup'),path.join(linkRoot,'source'));
  const protectedRoot=await fixture('protected');await fs.unlink(path.join(protectedRoot,`filters/${document.id}-r1.png`));await put(protectedRoot,'registry.json',{schema:'filter-fab-js/library-registry',schemaVersion:1,libraryVersion:3,filters:[]});assert.equal((await validationReport({libraryRoot:protectedRoot,baseRef:'HEAD'})).errors[0].code,'HISTORICAL_PACKAGE_DELETED');await put(protectedRoot,`filters/${document.id}-r1.png`,await png(updated));assert.equal((await validationReport({libraryRoot:protectedRoot,baseRef:'HEAD'})).errors[0].code,'HISTORICAL_PACKAGE_MODIFIED');
  const lostRoot=await fixture('lost-history');await fs.unlink(path.join(lostRoot,`filters/${document.id}-r1.png`));await put(lostRoot,'registry.json',{schema:'filter-fab-js/library-registry',schemaVersion:1,libraryVersion:3,filters:[]});git(lostRoot,'add','.');git(lostRoot,'commit','-m','Test invalid historical removal');const lost=await open(lostRoot),lostFilter=lost.summary().filters.find(item=>item.id===document.id);assert.equal(lostFilter.hasHistory,true);assert.equal(lostFilter.canDeleteDraft,false);assert.equal(lostFilter.status,'Incomplete');assert.ok(lost.summary().health.errors.some(item=>item.code==='HISTORICAL_PACKAGE_DELETED'));await assert.rejects(lost.deleteDraft({id:document.id,confirmed:true}),code('LIBRARY_INVALID'));
  const failRoot=await fixture('rollback'),rollback=await open(failRoot),failBefore=await fs.readFile(path.join(failRoot,'registry.json')),failHead=await rollback.git.head();await queue(rollback,'update',updated);const failReview=await rollback.validate();const realCommit=rollback.git.commit.bind(rollback.git);rollback.git.commit=async()=>{throw new Error('Injected commit failure');};await assert.rejects(rollback.prepare({token:failReview.review.token,confirmed:true}),/Injected commit failure/);assert.deepEqual(await fs.readFile(path.join(failRoot,'registry.json')),failBefore);assert.deepEqual(await fs.readFile(path.join(failRoot,`filters/${document.id}-r1.png`)),original);assert.equal(git(failRoot,'status','--porcelain'),'');assert.equal(await rollback.git.head(),failHead);assert.equal(await rollback.git.branch(),'main');rollback.git.commit=realCommit;assert.equal(rollback.pending.size,1);await rollback.discard({confirmed:true});
  const draftRoot=await fixture('draft'),draftDoc={...added,id:'draft-only'};await put(draftRoot,`source/${draftDoc.id}.json`,draftDoc);git(draftRoot,'add','.');git(draftRoot,'commit','-m','Never-published draft');await put(draftRoot,'.git/hooks/pre-commit','#!/bin/sh\nexit 99\n');await fs.chmod(path.join(draftRoot,'.git/hooks/pre-commit'),0o755);const draft=await open(draftRoot);
  const incompleteDraft=draft.summary().filters.find(item=>item.id===draftDoc.id);assert.equal(incompleteDraft.status,'Draft');assert.equal(incompleteDraft.canDeleteDraft,true);assert.equal(incompleteDraft.canPrepareDraft,true);
  await draft.deleteDraft({id:draftDoc.id,confirmed:true});assert.equal(draft.pending.get(draftDoc.id).kind,'delete-draft');await draft.discard({confirmed:true});
  await queue(draft,'add',draftDoc);assert.equal(draft.summary().filters.find(item=>item.id===draftDoc.id).status,'Ready to Publish');
  await put(draftRoot,'unrelated.txt','Keep draft edits');await assert.rejects(draft.deleteDraft({id:draftDoc.id,confirmed:true}),code('DIRTY_REPOSITORY'));assert.equal(await fs.readFile(path.join(draftRoot,'unrelated.txt'),'utf8'),'Keep draft edits');await fs.unlink(path.join(draftRoot,'unrelated.txt'));
  await draft.deleteDraft({id:draftDoc.id,confirmed:true});assert.equal(draft.pending.size,1);assert.equal(draft.pending.get(draftDoc.id).kind,'delete-draft');assert.equal(draft.summary().filters.find(item=>item.id===draftDoc.id).canDeleteDraft,false);assert.ok(!draft.plan(date).writes.has('filters/'+draftDoc.id+'-r1.png'));const draftReview=await draft.validate();assert.equal(draftReview.review.libraryVersion.after,2);await draft.prepare({token:draftReview.review.token,confirmed:true});await assert.rejects(fs.access(path.join(draftRoot,`source/${draftDoc.id}.json`)));assert.deepEqual(await fs.readFile(path.join(draftRoot,`filters/${document.id}-r1.png`)),original);
  const interruptedRoot=await fixture('interrupted'),interrupted=await open(interruptedRoot),recoveryBefore=await fs.readFile(path.join(interruptedRoot,'registry.json')),recoveryAfter=Buffer.from('{}');await fs.writeFile(interrupted.journal,JSON.stringify({root:interruptedRoot,head:await interrupted.git.head(),files:[{file:'registry.json',before:recoveryBefore.toString('base64'),after:digest(recoveryAfter)}]}));await put(interruptedRoot,'registry.json',recoveryAfter);await interrupted.refresh();assert.equal(interrupted.summary().recovery,true);await interrupted.discard({confirmed:true});assert.deepEqual(await fs.readFile(path.join(interruptedRoot,'registry.json')),recoveryBefore);
  // Real Git pushes use only a disposable bare remote. The transport mapping
  // exists exclusively in this fixture; production still validates GitHub origin.
  const remoteRoot=await fixture('remote-publication'),bare=path.join(sandbox,'bare.git');
  git(remoteRoot,'config','core.autocrlf','false');git(remoteRoot,'init','--bare',bare);git(remoteRoot,'push',bare,'main:refs/heads/main');
  const canonical='https://github.com/'+LIBRARY_REPOSITORY+'.git';git(remoteRoot,'remote','add','origin',canonical);
  const networkCalls=[];
  function transport(){const client=new GitClient(remoteRoot),originalRun=client.run.bind(client);client.run=(args,options)=>{if(args.includes('push')||args[0]==='fetch'||args[0]==='ls-remote')networkCalls.push([...args]);return originalRun(args.map(arg=>arg===canonical?bare:arg),options);};return client;}
  let prs=[],createMode='fail',creates=0,remoteLive=manifestFor(),remotePrepared;
  const apiSecret='sentinel_MANAGER_REST_SECRET';let checkConclusion='success',pagesConclusion='pending',apiUnavailable=false,changedRemoteHead=null;
  const apiReply=(data,status=200)=>new Response(JSON.stringify(data),{status,headers:{'Content-Type':'application/json'}});
  const github=new GitHubClient(remoteRoot,{env:{FILTER_FABJS_GITHUB_TOKEN:apiSecret},verifyRepository:async()=>({url:canonical,pushUrl:canonical}),createTimeoutMs:5,fetchImpl:async(url,options)=>{
    const target=new URL(url);assert.equal(target.origin,'https://api.github.com');assert.equal(options.headers.Authorization,'Bearer '+apiSecret);
    if(apiUnavailable)return apiReply({},503);
    if(target.pathname==='/user')return apiReply({login:'maintainer'});
    if(target.pathname==='/repos/'+LIBRARY_REPOSITORY)return apiReply({full_name:LIBRARY_REPOSITORY,default_branch:'main'});
    if(target.pathname.endsWith('/check-runs'))return apiReply({total_count:1,check_runs:[{head_sha:prs[0]?.head.sha||remotePrepared.commit,status:checkConclusion==='pending'?'in_progress':'completed',conclusion:checkConclusion==='pending'?null:checkConclusion}]});
    if(target.pathname.includes('/compare/'))return apiReply({status:'ahead',merge_base_commit:{sha:remotePrepared.commit}});
    if(target.pathname.endsWith('/pulls/17'))return apiReply(prs[0]);
    if(target.pathname.endsWith('/contents/registry.json')){const bytes=await fs.readFile(path.join(remoteRoot,'registry.json'));return apiReply({type:'file',path:'registry.json',encoding:'base64',size:bytes.length,content:bytes.toString('base64')});}
    if(target.pathname.endsWith('/actions/workflows/pages.yml/runs'))return apiReply({total_count:1,workflow_runs:[{id:1,head_sha:remotePrepared.commit,head_branch:'main',status:pagesConclusion==='pending'?'in_progress':'completed',conclusion:pagesConclusion==='pending'?null:pagesConclusion}]});
    if(options.method==='GET'&&target.pathname.endsWith('/pulls'))return apiReply(target.searchParams.get('per_page')==='1'?[]:prs);
    if(options.method==='POST'){
      creates++;
      if(createMode==='fail')return apiReply({message:apiSecret},403);
      prs=[{number:17,html_url:'https://github.com/'+LIBRARY_REPOSITORY+'/pull/17',state:'open',draft:false,merged_at:null,head:{ref:remotePrepared.branch,sha:remotePrepared.commit,repo:{full_name:LIBRARY_REPOSITORY}},base:{ref:'main',repo:{full_name:LIBRARY_REPOSITORY}},title:'Publish 1 online library change'}];
      if(createMode==='timeout')return new Promise(()=>{});
      return apiReply(prs[0],201);
    }
    assert.fail('Unexpected GitHub REST request');
  }});
  const remoteOptions=()=>({githubClient:github,gitClient:transport(),fetchImpl:async()=>new Response(JSON.stringify(remoteLive))});
  const remoteManager=await open(remoteRoot,remoteOptions());await queue(remoteManager,'update',updated);
  // Live main moves after a candidate was accepted: validation must not
  // approve the outdated local checkout, and a retry must revalidate.
  const trueRemoteCommit=remoteManager.git.remoteCommit.bind(remoteManager.git);
  const simulateAdvancedMain=async(url,ref)=>ref==='main'?'b'.repeat(40):trueRemoteCommit(url,ref);
  remoteManager.git.remoteCommit=simulateAdvancedMain;
  await assert.rejects(remoteManager.validate(),code('REMOTE_MAIN_ADVANCED'));
  assert.equal(git(remoteRoot,'status','--porcelain'),'');
  remoteManager.git.remoteCommit=trueRemoteCommit;
  const rr=await remoteManager.validate();
  // Main can also advance after review but before Prepare Publication.
  remoteManager.git.remoteCommit=simulateAdvancedMain;
  await assert.rejects(remoteManager.prepare({token:rr.review.token,confirmed:true}),code('REMOTE_MAIN_ADVANCED'));
  remoteManager.git.remoteCommit=trueRemoteCommit;
  await remoteManager.prepare({token:rr.review.token,confirmed:true});
  remotePrepared=remoteManager.remotePublication.prepared;assert.ok(remotePrepared);assert.equal(remoteManager.remotePublication.ready,true);
  // A previously prepared branch is not safe to push when main changed.
  remoteManager.git.remoteCommit=simulateAdvancedMain;
  await remoteManager.refresh();
  assert.equal(remoteManager.remotePublication.error.code,'REMOTE_MAIN_ADVANCED');
  assert.equal(remoteManager.remotePublication.ready,false);
  assert.equal(remoteManager.remotePublication.baseState.current,false);
  assert.match(publicationUi(remoteManager.summary(),document.id).workspace,/Revalidation required/);
  await assert.rejects(remoteManager.pushAndCreate({confirmed:true,commit:remotePrepared.commit,branch:remotePrepared.branch}),code('REMOTE_MAIN_ADVANCED'));
  remoteManager.git.remoteCommit=trueRemoteCommit;
  await remoteManager.refresh();
  assert.equal(remoteManager.remotePublication.ready,true);
  assert.equal(remoteManager.remotePublication.preview.repository,LIBRARY_REPOSITORY);assert.ok(!remoteManager.remotePublication.preview.body.includes(sandbox));
  const confirm={confirmed:true,commit:remotePrepared.commit,branch:remotePrepared.branch};
  await assert.rejects(remoteManager.pushAndCreate({...confirm,confirmed:false}),code('CONFIRMATION_REQUIRED'));
  await assert.rejects(remoteManager.pushAndCreate({...confirm,commit:'b'.repeat(40)}),code('STALE_PREPARATION'));
  await put(remoteRoot,'unrelated.txt','Keep me');await assert.rejects(remoteManager.pushAndCreate(confirm),code('DIRTY_REPOSITORY'));await fs.unlink(path.join(remoteRoot,'unrelated.txt'));
  git(remoteRoot,'switch','main');await assert.rejects(remoteManager.pushAndCreate(confirm),code('STALE_PREPARATION'));git(remoteRoot,'switch',remotePrepared.branch);
  git(remoteRoot,'commit','--allow-empty','-m','External commit');await assert.rejects(remoteManager.pushAndCreate(confirm),code('STALE_PREPARATION'));
  // Move only this fixture branch back; the product never resets preparation.
  git(remoteRoot,'reset','--hard',remotePrepared.commit);
  // A concurrent main update *after the branch push* must prevent PR creation
  // while preserving the pushed branch for later manual reconciliation.
  const truePush=remoteManager.git.pushPrepared.bind(remoteManager.git);
  remoteManager.git.pushPrepared=async(...args)=>{const pushed=await truePush(...args);remoteManager.git.remoteCommit=simulateAdvancedMain;return pushed;};
  const raced=await remoteManager.pushAndCreate(confirm);
  assert.equal(raced.remoteError.code,'REMOTE_MAIN_ADVANCED');
  assert.equal(raced.remotePublication.pushed,true);
  assert.equal(raced.remotePublication.pr,null);
  assert.equal(creates,0);
  remoteManager.git.remoteCommit=trueRemoteCommit;
  remoteManager.git.pushPrepared=truePush;
  await remoteManager.refresh();
  const partial=await remoteManager.pushAndCreate(confirm);assert.equal(partial.remotePublication.pushed,true);assert.equal(partial.remotePublication.pr,null);assert.equal(partial.remoteError.code,'GITHUB_PERMISSION');
  assert.equal(git(remoteRoot,'ls-remote',bare,'refs/heads/'+remotePrepared.branch).split(/\s/)[0],remotePrepared.commit);
  assert.equal(remoteManager.summary().filters.find(item=>item.id===document.id).status,'Pushed');
  const pushCount=()=>networkCalls.filter(args=>args.includes('push')).length;assert.equal(pushCount(),1);
  assert.ok(networkCalls.every(args=>!args.includes('--force')&&!args.includes('--force-with-lease')));
  assert.ok(networkCalls.filter(args=>args.includes('push')).every(args=>args.at(-1)===remotePrepared.commit+':refs/heads/'+remotePrepared.branch));
  assert.equal(git(remoteRoot,'ls-remote',bare,'refs/heads/main').split(/\s/)[0],remotePrepared.parent);
  const restartPushed=await open(remoteRoot,remoteOptions());assert.equal(restartPushed.summary().filters.find(item=>item.id===document.id).status,'Pushed');
  createMode='timeout';checkConclusion='pending';const uncertain=await restartPushed.pushAndCreate(confirm);assert.equal(uncertain.remotePublication.pr.number,17);assert.equal(uncertain.remoteError.code,'GITHUB_TIMEOUT');assert.equal(uncertain.remotePublication.pr.checks,'Pending');assert.equal(pushCount(),1);checkConclusion='success';
  const restartPr=await open(remoteRoot,remoteOptions());assert.equal(restartPr.remotePublication.pr.number,17);assert.equal(restartPr.summary().filters.find(item=>item.id===document.id).status,'PR Open');assert.equal(restartPr.remotePublication.pr.checks,'Passed');
  assert.equal(restartPr.summary().filters.find(item=>item.id===document.id).publication.onlineRevision,1);assert.equal(restartPr.summary().filters.find(item=>item.id===document.id).publication.onlineConfirmed,false);
  const prUi=publicationUi(restartPr.summary(),document.id);assert.match(prUi.workspace,/Open Pull Request/);assert.match(prUi.details,/r1 is Published Online; r2 is awaiting publication/);
  checkConclusion='failure';await restartPr.refresh();assert.equal(restartPr.summary().filters.find(item=>item.id===document.id).status,'PR Open · Checks Failed');assert.match(publicationUi(restartPr.summary(),document.id).workspace,/Do not merge this pull request until validation passes/);checkConclusion='success';
  await restartPr.pushAndCreate(confirm);assert.equal(creates,2);assert.equal(pushCount(),1);
  prs[0].state='closed';await restartPr.refresh();assert.equal(restartPr.summary().filters.find(item=>item.id===document.id).status,'PR Closed');await assert.rejects(restartPr.pushAndCreate(confirm),code('PR_CLOSED'));assert.equal(creates,2);
  prs[0].state='closed';prs[0].merged_at='2026-10-09T16:00:00Z';prs[0].merge_commit_sha=remotePrepared.commit;await restartPr.refresh();assert.equal(restartPr.summary().filters.find(item=>item.id===document.id).status,'Merged · Awaiting Online Deployment');await restartPr.pushAndCreate(confirm);assert.equal(creates,2);
  pagesConclusion='failure';await restartPr.refresh();assert.equal(restartPr.summary().filters.find(item=>item.id===document.id).status,'Merged · Deployment Failed');assert.match(publicationUi(restartPr.summary(),document.id).workspace,/Deployment failed. Check GitHub Actions/);
  apiUnavailable=true;await restartPr.refresh();assert.equal(restartPr.remotePublication.pr.state,'MERGED');assert.ok(!restartPr.summary().filters.find(item=>item.id===document.id).status.includes('PR Open'));apiUnavailable=false;
  pagesConclusion='success';await restartPr.refresh();assert.equal(restartPr.summary().filters.find(item=>item.id===document.id).status,'Merged · Awaiting Online Deployment');
  // A GitHub merge of main into the PR changes its head before merging. Lookup
  // must reconcile merged truth before the old exact-SHA branch check can fail.
  changedRemoteHead='b'.repeat(40);prs[0].head.sha=changedRemoteHead;
  const realRemoteCommit=restartPr.git.remoteCommit.bind(restartPr.git);restartPr.git.remoteCommit=async()=>changedRemoteHead;
  await restartPr.refresh();assert.equal(restartPr.remotePublication.pr.state,'MERGED');assert.equal(restartPr.remotePublication.pr.headChanged,true);assert.equal(restartPr.remotePublication.error,null);assert.equal(restartPr.summary().filters.find(item=>item.id===document.id).status,'Merged · Awaiting Online Deployment');
  restartPr.git.remoteCommit=realRemoteCommit;prs[0].head.sha=remotePrepared.commit;
  remoteLive=manifestFor([{document:updated,revision:2}]);await restartPr.refresh();assert.equal(restartPr.summary().filters.find(item=>item.id===document.id).status,'Published Online');
  // An existing remote ref at any other commit fails closed, even an ancestor.
  git(remoteRoot,'--git-dir='+bare,'update-ref','refs/heads/'+remotePrepared.branch,remotePrepared.parent);
  await restartPr.refresh();assert.equal(restartPr.remotePublication.error.code,'REMOTE_BRANCH_CONFLICT');await assert.rejects(restartPr.pushAndCreate(confirm),code('REMOTE_BRANCH_CONFLICT'));assert.equal(pushCount(),1);
  assert.ok(!JSON.stringify(restartPr.summary()).includes(apiSecret));assert.ok(!publicationUi(restartPr.summary(),document.id).workspace.includes(apiSecret));assert.ok(!git(remoteRoot,'show','-s','--format=%B',remotePrepared.commit).includes(apiSecret));
  const server=await startManagerServer({manager:restartPr,port:0});
  try{
    assert.equal((await fetch(server.url)).status,200);assert.equal((await fetch(`${server.url}/api/library`)).status,403);assert.equal((await fetch(`${server.url}/api/publication/remote-status`)).status,403);assert.equal((await fetch(`${server.url}/api/publication/push-and-create-pr`,{method:'POST',headers:{'Content-Type':'application/json'},body:'{}'})).status,403);assert.equal((await fetch(`${server.url}/api/session`,{headers:{Origin:'https://attacker.invalid'}})).status,403);assert.equal(await httpStatus(`${server.url}/api/session`,{Host:'attacker.invalid'}),403);
    const session=await(await fetch(`${server.url}/api/session`)).json(),headers={'X-Library-Token':session.token,'Content-Type':'application/json'};const safeSummary=await fetch(`${server.url}/api/library`,{headers});assert.equal(safeSummary.status,200);assert.ok(!(await safeSummary.text()).includes(apiSecret));assert.equal((await fetch(`${server.url}/api/preview/${document.id}/1?token=${session.token}`)).status,200);assert.equal((await fetch(`${server.url}/api/candidate/discard`,{method:'POST',headers,body:'{}'})).status,400);assert.equal((await fetch(`${server.url}/api/writeFile`,{method:'POST',headers,body:'{}'})).status,404);assert.equal((await fetch(`${server.url}/api/validate`,{method:'POST',headers:{...headers,Origin:'https://attacker.invalid'},body:'{}'})).status,403);
    const previews=await Promise.all(Array.from({length:5},()=>fetch(`${server.url}/api/preview/${document.id}/1?token=${session.token}`)));assert.ok(previews.every(response=>response.status===200),'concurrent previews are serialized without rejection');
  }finally{await server.close();}
  // Existing human CLI and new structured CLI share the same validation.
  const cli=path.resolve('tools/online-library/publish-library.mjs');const report=JSON.parse(execFileSync(process.execPath,[cli,'validate','--library-root',root,'--report-json'],{encoding:'utf8'}));assert.equal(report.valid,true);assert.equal(report.warnings[0].code,'PUBLICATION_BASE_MISSING');assert.match(execFileSync(process.execPath,[cli,'validate','--library-root',root],{encoding:'utf8'}),/Validated/);
  console.log('Library Manager lifecycle, batch revisions/versioning, source/PNG ingestion, history, validation, Git preparation/rollback/recovery, dirty/stale protection and HTTP security passed.');
}finally{for(const manager of managers)await manager.close();assert.equal(path.dirname(sandbox),await fs.realpath(os.tmpdir()));assert.match(path.basename(sandbox),/^filter-fab-manager-test-/);await fs.rm(sandbox,{recursive:true,force:true});}
