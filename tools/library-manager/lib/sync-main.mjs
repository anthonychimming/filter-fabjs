import fs from 'node:fs/promises';
import path from 'node:path';
import { randomUUID, createHash } from 'node:crypto';
import { problem, scanRepository, digest } from './repository.mjs';
import { preparedPublication } from './remote-publication.mjs';
import { onlinePublication } from './publication-state.mjs';
import { validationReport } from '../../online-library/publish-library.mjs';

const publicationBranch=/^library\/publish-\d{4}-\d{2}-\d{2}(?:-[2-9][0-9]*|-[1-9][0-9]+)?$/;
const shaPattern=/^(?:[a-f0-9]{40}|[a-f0-9]{64})$/;
const refuse=(code,message)=>{throw problem(code,message);};
async function exists(file){try{await fs.lstat(file);return true;}catch(error){if(error.code==='ENOENT')return false;throw error;}}
async function ancestor(git,before,after){return (await git.run(['rev-list','--count',`${after}..${before}`])).trim()==='0';}

// Canonical files are fingerprinted by scanRepository. Include other tracked
// and ignored files as well, so even Git-invisible edits expire a review.
async function otherFilesFingerprint(manager,snapshot){
  const lists=await Promise.all([manager.git.run(['ls-files','--cached','-z']),manager.git.run(['ls-files','--others','--ignored','--exclude-standard','-z'])]);
  const names=lists.flatMap(list=>list.split('\0').filter(Boolean));
  const files=[...new Set(names)].filter(file=>!snapshot.files.has(file)).sort();
  if(files.length>1024)refuse('SYNC_RECOVERY_REQUIRED','Blocked — too many ancillary/ignored files to fingerprint safely. Use the manual Git workflow.');
  const hash=createHash('sha256');let total=0;
  for(const file of files){
    const target=path.resolve(manager.root,file),relative=path.relative(manager.root,target);
    if(!relative||relative.startsWith('..')||path.isAbsolute(relative))refuse('SYNC_RECOVERY_REQUIRED','Blocked — unsafe ancillary path. Inspect manually.');
    let current=manager.root;
    for(const part of relative.split(path.sep)){current=path.join(current,part);if((await fs.lstat(current)).isSymbolicLink())refuse('SYNC_RECOVERY_REQUIRED','Blocked — ancillary symlink cannot be fingerprinted safely. Use the manual Git workflow.');}
    const before=await fs.stat(target);
    if(!before.isFile()||before.size>16*1024*1024)refuse('SYNC_RECOVERY_REQUIRED','Blocked — ancillary files exceed safe inspection limits. Use the manual Git workflow.');
    hash.update(JSON.stringify([file,before.size,before.mtimeMs,before.mode]));
    const handle=await fs.open(target,'r');let size=0;
    try{for await(const bytes of handle.createReadStream({autoClose:false})){
      size+=bytes.length;total+=bytes.length;
      if(size>16*1024*1024||total>64*1024*1024)refuse('SYNC_RECOVERY_REQUIRED','Blocked — ancillary files exceed safe inspection limits. Use the manual Git workflow.');
      hash.update(bytes);
    }}finally{await handle.close();}
    const after=await fs.stat(target);
    if(size!==before.size||after.size!==before.size||after.mtimeMs!==before.mtimeMs)refuse('SYNC_STATE_CHANGED','Stale preview — ancillary files changed during inspection. Recheck required.');
  }
  return hash.digest('hex');
}

// This read does not refresh the Manager: refresh would erase live inspections.
async function localState(manager){
  const git=manager.git;
  if(manager.pending.size||manager.inspections.size||manager.uploadActive||manager.review||manager.stale)refuse('SYNC_PENDING_CHANGES','Blocked — pending workspace changes. Finish or explicitly discard candidates, uploads, inspections and reviews, then recheck.');
  if(manager.baseRef&&!['main','refs/heads/main'].includes(manager.baseRef))refuse('SYNC_UNSUPPORTED_BRANCH','Blocked — nonstandard publication base. Restart without --base-ref before synchronizing with main.');
  if(await exists(manager.journal))refuse('SYNC_RECOVERY_REQUIRED','Blocked — recovery required. Resolve the preparation journal before rechecking.');
  const markers=['MERGE_HEAD','CHERRY_PICK_HEAD','REVERT_HEAD','BISECT_START','rebase-merge','rebase-apply','sequencer','index.lock','HEAD.lock'];
  const paths=(await git.run(['rev-parse',...markers.flatMap(marker=>['--git-path',marker])])).trim().split(/\r?\n/);
  if(paths.length!==markers.length||(await Promise.all(paths.map(file=>exists(path.resolve(manager.root,file))))).some(Boolean))refuse('SYNC_RECOVERY_REQUIRED','Blocked — a Git operation or lock is active. Finish it before rechecking.');
  if((await git.status()).length)refuse('SYNC_DIRTY_REPOSITORY','Blocked — uncommitted Git changes. Commit or move all changes, including unrelated and untracked files, then recheck.');
  // Hidden tracked changes must not be overwritten by checkout/merge.
  const flags=await git.run(['ls-files','-v','-z']);
  if(flags.split('\0').some(row=>row&&(/[a-z]/.test(row[0])||row[0]==='S')))refuse('SYNC_DIRTY_REPOSITORY','Blocked — tracked files have assume-unchanged or skip-worktree flags. Review those files and restore normal tracking before rechecking.');
  const head=await git.head(),branch=await git.branch();
  if(branch.length>100||branch!=='main'&&!publicationBranch.test(branch))refuse('SYNC_UNSUPPORTED_BRANCH','Blocked — unknown or unsafe branch. Use main or a recorded, completed library publication branch.');
  const mainSha=(await git.run(['rev-parse','--verify','--quiet','refs/heads/main^{commit}'],{allowedExit:[1]})).trim();
  if(!shaPattern.test(mainSha))refuse('SYNC_MAIN_MISSING','Blocked — local main is missing. Restore main manually without overwriting local commits.');
  const worktrees=(await git.run(['worktree','list','--porcelain'])).trim().split(/\r?\n\r?\n/);
  for(const row of worktrees)if(row.split(/\r?\n/).includes('branch refs/heads/main')){
    const location=row.split(/\r?\n/).find(line=>line.startsWith('worktree '))?.slice(9);
    if(!location||await fs.realpath(location)!==manager.root)refuse('SYNC_UNSUPPORTED_BRANCH','Blocked — main is occupied by another worktree. Resolve that checkout before rechecking.');
  }
  const snapshot=await scanRepository(manager.root,manager.cache);
  if(head!==manager.head||branch!==manager.branch||snapshot.fingerprint!==manager.snapshot.fingerprint)refuse('SYNC_STATE_CHANGED','Stale preview — recheck required. Refresh the Manager after the external repository change.');
  if(snapshot.errors.length||!manager.health?.valid||manager.publicationErrors?.length)refuse('SYNC_RECOVERY_REQUIRED','Blocked — local library needs repair. Resolve library diagnostics before synchronizing.');
  return{root:manager.root,branch,head,mainSha,fingerprint:snapshot.fingerprint,otherFiles:await otherFilesFingerprint(manager,snapshot),index:digest(await git.run(['ls-files','--stage','-z'])),baseSha:manager.baseSha,baseRef:manager.baseRef||null};
}

async function completion(manager,state){
  if(state.branch==='main')return null;
  const prepared=await preparedPublication(manager.git,state.head,state.branch);
  if(!prepared)refuse('SYNC_INCOMPLETE_PUBLICATION','Blocked — publication completion cannot be verified. This branch has no reviewed preparation record; use the manual Git workflow.');
  const pr=await manager.github.find(prepared);
  if(pr?.state!=='MERGED'||pr.publicationValid!==true||!shaPattern.test(pr.mergeCommit||'')||pr.remoteStatusUnavailable)refuse('SYNC_INCOMPLETE_PUBLICATION','Blocked — publication awaiting review/merge/deployment. Confirm the matching PR is merged and its reviewed registry is valid, then recheck.');
  const online=await onlinePublication(manager.onlineOptions);
  if(online.state!=='checked'||online.manifest.libraryVersion<prepared.afterVersion||!prepared.changes.every(change=>change.kind==='delete-draft'||(change.kind==='unpublish'?!online.manifest.filters.some(entry=>entry.id===change.id):online.manifest.filters.some(entry=>entry.id===change.id&&entry.revision===change.revision))))refuse('SYNC_INCOMPLETE_PUBLICATION','Blocked — publication awaiting deployment or Online confirmation. Wait for the validated deployed catalogue to contain all reviewed changes, then recheck.');
  return{commit:prepared.commit,number:pr.number,mergeCommit:pr.mergeCommit,headSha:pr.headSha,afterVersion:prepared.afterVersion,onlineVersion:online.manifest.libraryVersion,changes:prepared.changes,pr};
}

async function validateTarget(manager,remoteSha){
  const target=path.join(manager.temp,'sync-target-'+randomUUID());
  try{
    await manager.git.exportBase(remoteSha,target);
    const report=await validationReport({libraryRoot:target});
    if(!report.valid)refuse('SYNC_RECOVERY_REQUIRED','Blocked — official main fails library/history validation. Inspect library diagnostics manually.');
    const next=await scanRepository(target);
    if(next.errors.length||next.registry.libraryVersion<manager.snapshot.registry.libraryVersion)refuse('SYNC_RECOVERY_REQUIRED','Blocked — official main has invalid files or a regressed catalogue version. Inspect manually.');
    for(const [file,info] of manager.snapshot.files){
      if((file.startsWith('filters/')&&next.files.get(file)?.hash!==info.hash)||(file.startsWith('source/')&&!next.files.has(file)))refuse('SYNC_RECOVERY_REQUIRED','Blocked — official main would remove source data or alter a retained package. Reconcile manually before syncing.');
    }
  }finally{await fs.rm(target,{recursive:true,force:true});}
}

async function assess(manager,{fetchMain=true}={}){
  const state=await localState(manager),git=manager.git,remote=await git.publicationRemote();
  const remoteSha=await git.remoteCommit(remote.url,'main');
  if(!shaPattern.test(remoteSha||''))refuse('SYNC_REMOTE_UNAVAILABLE','Unavailable — official remote main cannot be verified. Check network access and Git authentication, then retry.');
  const publication=await completion(manager,state);
  // Preview fetches only a tracking ref, after local safety gates. It never
  // switches the checkout. This limited metadata side effect is shown in UI.
  if(fetchMain)await git.fetchPublicationMain(remote);
  if(await git.resolve('refs/remotes/origin/main')!==remoteSha)refuse('SYNC_STATE_CHANGED','Stale preview — official main changed during the check. Recheck required.');
  if(!await ancestor(git,state.mainSha,remoteSha))refuse('SYNC_MAIN_DIVERGED','Blocked — local main is ahead or diverged. Preserve and reconcile its commits manually before rechecking.');
  const behind=Number((await git.run(['rev-list','--count',`${state.mainSha}..${remoteSha}`])).trim());
  if(!Number.isSafeInteger(behind)||behind<0)refuse('SYNC_REMOTE_UNAVAILABLE','Unavailable — main ancestry could not be determined. Recheck.');
  if(publication&&!await ancestor(git,publication.mergeCommit,remoteSha))refuse('SYNC_INCOMPLETE_PUBLICATION','Blocked — merged publication is not confirmed on official main. Recheck when the remote is available.');
  await validateTarget(manager,remoteSha);
  if(JSON.stringify(await localState(manager))!==JSON.stringify(state)||JSON.stringify(await git.publicationRemote())!==JSON.stringify(remote)||await git.remoteCommit(remote.url,'main')!==remoteSha)refuse('SYNC_STATE_CHANGED','Stale preview — repository or official main changed during the check. Recheck required.');
  return{...state,remote,remoteSha,behind,publication};
}

export async function previewSyncMain(manager){
  manager.syncReview=null;
  try{
    const state=await assess(manager),alreadyCurrent=state.branch==='main'&&state.mainSha===state.remoteSha;
    const reviewToken=alreadyCurrent?null:randomUUID(),expiresAt=Date.now()+5*60*1000;
    if(reviewToken)manager.syncReview={reviewToken,expiresAt,state};
    return{ready:!alreadyCurrent,alreadyCurrent,status:alreadyCurrent?'Already on up-to-date main':'Ready to sync',branch:state.branch,head:state.head,mainSha:state.mainSha,remoteSha:state.remoteSha,behind:state.behind,publication:state.publication?{number:state.publication.number,state:'MERGED',onlineConfirmed:true}:null,workingTree:'Clean',proposedAction:'Switch to main, then fast-forward to origin/main',metadataEffect:'Checking fetches only official main into origin/main; the checkout and files are unchanged.',reviewToken,expiresAt:reviewToken?expiresAt:null,blockers:[]};
  }catch(error){return{ready:false,status:error.code?.startsWith('SYNC_')?error.message:'Unavailable — official remote or publication completion cannot be verified. Check Git/GitHub authentication and network access, then retry.',blockers:[{code:error.code?.startsWith('SYNC_')?error.code:'SYNC_REMOTE_UNAVAILABLE',message:error.code?.startsWith('SYNC_')?error.message:'Check official origin, Git/GitHub authentication and network access, then retry.'}],reviewToken:null};}
}

export async function applySyncMain(manager,{confirmed,reviewToken}={}){
  if(confirmed!==true)refuse('CONFIRMATION_REQUIRED','Confirm the reviewed branch switch and fast-forward.');
  const review=manager.syncReview;manager.syncReview=null; // consume even on failure
  if(!review||typeof reviewToken!=='string'||reviewToken!==review.reviewToken||Date.now()>review.expiresAt)refuse('SYNC_PREVIEW_EXPIRED','Stale preview — recheck required. This confirmation expired or was already used.');
  let changedCheckout=false;
  const oldLibraryVersion=manager.snapshot?.registry?.libraryVersion;
  try{
    const state=await assess(manager,{fetchMain:false});
    if(JSON.stringify(state)!==JSON.stringify(review.state))refuse('SYNC_STATE_CHANGED','Stale preview — repository, workspace, publication or official main changed. Recheck required.');
    await manager.git.fetchPublicationMain(state.remote);
    if(await manager.git.resolve('refs/remotes/origin/main')!==state.remoteSha||await manager.git.remoteCommit(state.remote.url,'main')!==state.remoteSha)refuse('SYNC_STATE_CHANGED','Stale preview — official main changed before synchronization. Recheck required.');
    if(JSON.stringify(await localState(manager))!==JSON.stringify(Object.fromEntries(Object.entries(state).filter(([key])=>!['remote','remoteSha','behind','publication'].includes(key))))||JSON.stringify(await manager.git.publicationRemote())!==JSON.stringify(state.remote)||await manager.git.remoteCommit(state.remote.url,'main')!==state.remoteSha)refuse('SYNC_STATE_CHANGED','Stale preview — repository changed before switching. Recheck required.');
    if(state.branch!=='main'){await manager.git.run(['switch','--no-overwrite-ignore','--no-recurse-submodules','main']);changedCheckout=true;}
    if(await manager.git.branch()!=='main'||await manager.git.head()!==state.mainSha||(await manager.git.status()).length)refuse('SYNC_STATE_CHANGED','Repository changed before fast-forward. Inspect the current checkout and recheck.');
    await manager.git.run(['-c','merge.autoStash=false','-c','submodule.recurse=false','merge','--ff-only','--no-autostash','--no-overwrite-ignore',state.remoteSha]);changedCheckout=true;
    if(await manager.git.branch()!=='main'||await manager.git.head()!==state.remoteSha||(await manager.git.status()).length)refuse('SYNC_PARTIAL','Sync failed — checkout verification failed. Inspect the current branch and retry safely.');
    manager.lastPublication=null;
    const summary=await manager.refresh();
    if(!summary.health.valid||summary.branch!=='main'||summary.head!==state.remoteSha||summary.baseSha!==state.remoteSha||summary.dirty.length)refuse('SYNC_PARTIAL','Sync failed — refreshed library needs inspection. Recheck safely.');
    if(state.publication)manager.completedPublication={branch:state.branch,commit:state.head,pr:state.publication.pr};
    const remoteAdvanced=await manager.git.remoteCommit(state.remote.url,'main')!==state.remoteSha;
    return{...manager.summary(),syncResult:{status:remoteAdvanced?'Sync completed — reviewed main; official main advanced':'Sync completed — on up-to-date main',oldBranch:state.branch,newBranch:'main',oldMainSha:state.mainSha,newMainSha:state.remoteSha,oldLibraryVersion,libraryVersion:summary.libraryVersion,remoteAdvanced,message:remoteAdvanced?'Reviewed main synchronized; official main has since advanced. Check Sync Status again.':'Sync completed — on up-to-date main. Publication branches retained; local catalogue refreshed.'}};
  }catch(error){
    const branch=await manager.git.branch().catch(()=>'(unknown)'),head=await manager.git.head().catch(()=>null);
    // Never reverse a successful switch or fast-forward, including refresh errors.
    if(changedCheckout){try{await manager.refresh();}catch{}refuse('SYNC_PARTIAL',`Sync failed — current checkout ${branch}, HEAD ${head?.slice(0,12)||'unknown'}. ${error.code==='SYNC_PARTIAL'?'Refreshed checkout/library verification failed.':'Git operation or refresh failed.'} Inspect the checkout, refresh and recheck safely. No rollback was attempted.`);}
    if(error.code?.startsWith('SYNC_'))throw error;
    refuse('SYNC_REMOTE_UNAVAILABLE','Sync failed — official remote or Git operation unavailable. Inspect the checkout, check authentication/network and recheck safely.');
  }
}
