import fs from 'node:fs/promises';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { validationReport } from '../../online-library/publish-library.mjs';
import { problem, relativePath, requireId, scanRepository } from './repository.mjs';
import { LIBRARY_REPOSITORY } from './github-client.mjs';

const branchPattern=/^library\/publish-\d{4}-\d{2}-\d{2}(?:-[2-9][0-9]*|-[1-9][0-9]+)?$/;
const shaPattern=/^[a-f0-9]{40,64}$/;
export async function preparedPublication(git,head,branch){
  if(typeof branch!=='string'||branch.length>100||!branchPattern.test(branch))return null;
  if(Number(await git.run(['cat-file','-s',head]))>128*1024)throw problem('PREPARED_INVALID','Prepared commit metadata exceeds its limit.');
  const message=await git.run(['show','-s','--format=%B',head]);
  const markers=message.split('\n').filter(line=>line.startsWith('Filter-FabJS-Prepared: '));
  if(!markers.length)return null;
  if(markers.length!==1)throw problem('PREPARED_INVALID','Ambiguous preparation record.');
  const encoded=markers[0].slice('Filter-FabJS-Prepared: '.length);
  if(encoded.length>100000||! /^[A-Za-z0-9+/]+={0,2}$/.test(encoded))throw problem('PREPARED_INVALID','Invalid preparation record.');
  let record;try{record=JSON.parse(Buffer.from(encoded,'base64').toString('utf8'));}catch{throw problem('PREPARED_INVALID','Invalid preparation record.');}
  if(record.version!==1||record.branch!==branch||!shaPattern.test(record.parent)||!shaPattern.test(record.base)||! /^[a-f0-9]{64}$/.test(record.fingerprint)||!Array.isArray(record.changes)||!record.changes.length||record.changes.length>100||!Array.isArray(record.files)||!record.files.length||record.files.length>201||!Number.isSafeInteger(record.beforeVersion)||record.beforeVersion<1||!Number.isSafeInteger(record.afterVersion)||![record.beforeVersion,record.beforeVersion+1].includes(record.afterVersion))throw problem('PREPARED_INVALID','Preparation record does not match this branch.');
  for(const change of record.changes){requireId(change.id);if(!['add','update','unpublish','republish','delete-draft'].includes(change.kind)||!(change.revision===null||Number.isSafeInteger(change.revision)&&change.revision>0))throw problem('PREPARED_INVALID','Invalid reviewed operation.');}
  for(const file of record.files)relativePath(file);
  if((await git.run(['show','-s','--format=%P',head])).trim()!==record.parent)throw problem('PREPARED_INVALID','Prepared parent changed.');
  const changed=(await git.run(['diff-tree','--no-commit-id','--name-only','--no-renames','-r','-z',record.parent,head])).split('\0').filter(Boolean).sort();
  if(JSON.stringify(changed)!==JSON.stringify([...record.files].sort()))throw problem('PREPARED_INVALID','Commit files differ from the reviewed preparation.');
  const registry=await git.registryAt(head),catalogueChanged=record.changes.some(change=>change.kind!=='delete-draft');
  if(record.afterVersion!==record.beforeVersion+(catalogueChanged?1:0)||registry.libraryVersion!==record.afterVersion)throw problem('PREPARED_INVALID','Committed libraryVersion differs from the reviewed batch.');
  return{version:record.version,branch:record.branch,parent:record.parent,base:record.base,fingerprint:record.fingerprint,files:record.files,changes:record.changes.map(({id,kind,revision})=>({id,kind,revision})),beforeVersion:record.beforeVersion,afterVersion:record.afterVersion,commit:head};
}
export function prPreview(prepared){
  const count=prepared.changes.length;
  const title='Publish '+count+' online library change'+(count===1?'':'s');
  // Validated portable IDs avoid injecting Markdown, URLs or uploaded text.
  const changes=prepared.changes.map(change=>'- '+({add:'Add',update:'Update',unpublish:'Unpublish',republish:'Republish','delete-draft':'Delete draft'})[change.kind]+' '+change.id+(change.revision?' r'+change.revision:'')).join('\n');
  const body='## Filter FabJS Online Library publication\n\n### Changes\n\n'+changes+'\n\n### Catalogue\n\n- libraryVersion: '+prepared.beforeVersion+' → '+prepared.afterVersion+'\n\n### Validation\n\n- Local authoritative publication validation passed.\n- Historical packages retained.\n\nCreated by the Filter FabJS Library Manager.\n\nMerge remains manual. GitHub CI and Pages deployment remain authoritative.\n';
  return{repository:LIBRARY_REPOSITORY,base:'main',head:prepared.branch,title,body};
}
export async function assertPrepared(manager,prepared){
  if(!prepared||manager.pending.size||manager.stale)throw problem('PREPARED_REQUIRED','Review and prepare a publication before remote writes. Pending or stale candidates must be resolved first.');
  if(await manager.readJournal())throw problem('RECOVERY_REQUIRED','Resolve interrupted preparation before remote publication.');
  await manager.git.ensureClean();
  if(await manager.git.head()!==prepared.commit||await manager.git.branch()!==prepared.branch||(await scanRepository(manager.root,manager.cache)).fingerprint!==prepared.fingerprint)throw problem('STALE_PREPARATION','Publication state changed after preparation. Refresh and review the publication before continuing.');
  const actual=await preparedPublication(manager.git,prepared.commit,prepared.branch);
  if(!actual||JSON.stringify(actual)!==JSON.stringify(prepared))throw problem('STALE_PREPARATION','The prepared record changed.');
}
export async function remoteStatus(manager){
  const result={prepared:null,preview:null,ready:false,git:true,remote:null,baseState:null,github:null,pushed:false,remoteKnown:false,pr:null,error:null};
  try{
    result.prepared=await preparedPublication(manager.git,manager.head,manager.branch);
    if(result.prepared&&manager.remotePublication?.prepared?.commit===result.prepared.commit)result.pr=manager.remotePublication.pr;
    result.remote=await manager.git.publicationRemote();
    if(!result.prepared){result.baseState=await manager.git.publicationMain(manager.baseSha);result.github=await manager.github.readiness();if(result.baseState.available&&!result.baseState.current)await manager.git.requirePublicationMain(manager.baseSha);throw problem('PREPARED_REQUIRED','Automatic push requires a reviewed preparation record. Older local commits remain viewable; use the manual GitHub workflow for them.');}
    result.preview=prPreview(result.prepared);
    result.github=await manager.github.readiness();
    const observed=result.pr?await manager.github.getPullRequest(result.pr.number,result.prepared):await manager.github.find(result.prepared);
    // Terminal truth survives transient failures and stale list observations.
    if(result.pr?.state!=='MERGED'||observed?.state==='MERGED')result.pr=observed;
    const remoteSha=await manager.git.remoteCommit(result.remote.pushUrl,result.prepared.branch);result.remoteKnown=true;result.pushed=remoteSha===result.prepared.commit||!!result.pr&&remoteSha===result.pr.headSha;
    if(remoteSha&&remoteSha!==result.prepared.commit&&remoteSha!==result.pr?.headSha)throw problem('REMOTE_BRANCH_CONFLICT','Remote publication branch conflict. It does not match the prepared commit or reconciled PR. No force push was attempted.');
    await assertPrepared(manager,result.prepared);
    result.baseState=await manager.git.publicationMain(result.prepared.parent);
    // A completed PR remains historical: main is expected to move after merge.
    if(result.pr?.state==='MERGED')return result;
    if(result.baseState.available&&!result.baseState.current)await manager.git.requirePublicationMain(result.prepared.parent);
    if(result.pr?.state==='CLOSED')throw problem('PR_CLOSED','This publication pull request was closed without merging. Review it on GitHub; another PR will not be created automatically.');
    if(result.pr?.headChanged)throw problem('REMOTE_BRANCH_CONFLICT','PR head changed after review. Check the remote diff and validation before merging. No further automatic writes are allowed.');
    if(result.pr?.publicationValid===false)throw problem('PUBLICATION_INVALID',result.pr.publicationError);
    result.ready=result.pr?.state!=='MERGED';
  }catch(error){if(result.pr)result.pr={...result.pr,remoteStatusUnavailable:true,checksError:'Remote status temporarily unavailable or changed. Showing last known PR state; Refresh to retry.'};result.apiAvailable=manager.github.available??null;result.apiAuthenticated=manager.github.authenticated??null;result.error={code:error.code||'REMOTE_UNAVAILABLE',message:error.message};}
  return result;
}
export async function pushAndCreate(manager,{confirmed,commit,branch}={}){
  if(confirmed!==true)throw problem('CONFIRMATION_REQUIRED','Confirm pushing the reviewed publication and creating its pull request. Merge remains manual.');
  const prepared=manager.remotePublication?.prepared;
  if(!prepared||commit!==prepared.commit||branch!==prepared.branch)throw problem('STALE_PREPARATION','The confirmed publication does not match the prepared branch and commit. Refresh and review it.');
  await assertPrepared(manager,prepared);
  // Reconcile every retry; neither a timeout nor a process error proves absence.
  const status=await remoteStatus(manager);manager.remotePublication=status;
  if(status.error)throw problem(status.error.code,status.error.message);
  if(status.pr?.state==='MERGED')return manager.refresh();
  const remote=status.remote;
  const baseRoot=path.join(manager.temp,'remote-base-'+randomUUID());
  try{
    await manager.git.exportBase(prepared.base,baseRoot);
    const report=await validationReport({libraryRoot:manager.root,baseRoot});
    if(!report.valid)throw problem('PUBLICATION_INVALID','Authoritative publication validation failed.',{details:report.errors});
  }finally{await fs.rm(baseRoot,{recursive:true,force:true});}
  let failure;
  try{
    await assertPrepared(manager,prepared);
    // Re-read canonical origin immediately before each remote mutation.
    if(JSON.stringify(await manager.git.publicationRemote())!==JSON.stringify(remote))throw problem('REMOTE_CHANGED','Origin changed during publication. Refresh and review it.');
    await manager.git.requirePublicationMain(prepared.parent);
    if(!status.pushed)await manager.git.pushPrepared(prepared,remote);
    status.pushed=true;status.remoteKnown=true;
    await manager.git.fetchPublicationMain(remote);
    await assertPrepared(manager,prepared);
    await manager.git.requirePublicationMain(prepared.parent);
    if(await manager.git.remoteCommit(remote.pushUrl,prepared.branch)!==prepared.commit)throw problem('REMOTE_BRANCH_CONFLICT','Remote publication branch changed before PR creation.');
    if(JSON.stringify(await manager.git.publicationRemote())!==JSON.stringify(remote))throw problem('REMOTE_CHANGED','Origin changed before PR creation.');
    const existing=await manager.github.find(prepared);
    if(existing?.state==='CLOSED')throw problem('PR_CLOSED','This PR was closed without merging. Review it on GitHub.');
    if(!existing){
      await assertPrepared(manager,prepared);
      if(JSON.stringify(await manager.git.publicationRemote())!==JSON.stringify(remote)||await manager.git.remoteCommit(remote.pushUrl,prepared.branch)!==prepared.commit)throw problem('REMOTE_CHANGED','Remote publication changed immediately before PR creation.');
      await manager.git.requirePublicationMain(prepared.parent);
    }
    status.pr=existing||await manager.github.create(prepared,status.preview);
  }catch(error){failure=error;}
  // Reconstruct after remote side effects, including partial success. No rollback.
  const summary=await manager.refresh();
  if(failure){manager.remotePublication.error={code:failure.code||'REMOTE_FAILED',message:failure.message};return{...manager.summary(),remoteError:manager.remotePublication.error};}
  return summary;
}
