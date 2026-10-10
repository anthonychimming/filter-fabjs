import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { execFileSync } from 'node:child_process';
import { deflateSync } from 'node:zlib';
import { GitClient } from '../tools/library-manager/lib/git-client.mjs';
import { LibraryManager } from '../tools/library-manager/lib/operations.mjs';
import { startManagerServer } from '../tools/library-manager/server.mjs';
import { LIBRARY_REPOSITORY } from '../tools/library-manager/lib/github-client.mjs';
import { packageFixtureDocument } from './helpers/online-package-fixture.js';
import { createFilterFabPngEnvelope, embedFilterFabMetadata } from '../src/io/png-metadata.js';

const official='https://github.com/'+LIBRARY_REPOSITORY+'.git';
const sandbox=await fs.mkdtemp(path.join(os.tmpdir(),'filter-fab-sync-test-')),managers=[];
const git=(root,...args)=>execFileSync('git',['-c',`safe.directory=${root.replaceAll('\\','/')}`,'-c','core.hooksPath=/dev/null','-C',root,...args],{encoding:'utf8',stdio:'pipe'}).trim();
const put=async(root,file,data)=>{await fs.mkdir(path.dirname(path.join(root,file)),{recursive:true});await fs.writeFile(path.join(root,file),typeof data==='string'?data:JSON.stringify(data));};
const code=expected=>error=>error.code===expected;
class FixtureGit extends GitClient{
  constructor(root,remote){super(root);this.remote=remote;this.calls=[];}
  async run(args,options){
    this.calls.push([...args]);
    if(this.failFetch&&args[0]==='fetch')throw new Error('sentinel-credential-do-not-display');
    if(this.failMerge&&args.includes('merge'))throw new Error('sentinel-credential-do-not-display');
    const result=await super.run(args.map(arg=>arg===official?this.remote:arg),options);
    if(args[0]==='fetch'&&this.afterFetch){const work=this.afterFetch;this.afterFetch=null;await work();}
    return result;
  }
}
async function fixture(name){
  const root=path.join(sandbox,name+' checkout with spaces'),bare=path.join(sandbox,name+' remote.git'),writer=path.join(sandbox,name+' writer');
  await put(root,'registry.json',{schema:'filter-fab-js/library-registry',schemaVersion:1,libraryVersion:1,filters:[]});
  await put(root,'source/.gitkeep','');await put(root,'filters/.gitkeep','');await put(root,'README.md','Baseline\n');
  git(root,'init','-b','main');git(root,'config','user.name','Sync Test');git(root,'config','user.email','sync@example.invalid');git(root,'add','.');git(root,'commit','-m','Baseline');
  await fs.mkdir(bare);git(bare,'init','--bare');git(root,'remote','add','origin',official);git(root,'push',bare,'main:main');
  git(sandbox,'clone','--branch','main',bare,writer);git(writer,'config','user.name','Sync Test');git(writer,'config','user.email','sync@example.invalid');
  const client=new FixtureGit(root,bare),state={pr:null,online:true,registry:null};
  const github={readiness:async()=>({login:'fixture'}),find:async()=>state.pr,getPullRequest:async()=>state.pr};
  const manager=await LibraryManager.open({libraryRoot:root,gitClient:client,githubClient:github,fetchImpl:async()=>{
    if(!state.online)throw new Error('Offline fixture');
    const registry=state.registry||JSON.parse(await fs.readFile(path.join(writer,'registry.json'),'utf8'));
    return new Response(JSON.stringify({schema:'filter-fab-js/library',schemaVersion:1,libraryVersion:registry.libraryVersion,filters:registry.filters.map(entry=>({id:entry.id,revision:entry.revision,name:'Fixture',author:'',description:'',tags:[],documentType:'filter',filterFormat:2,preview:{url:`filters/${entry.id}-r${entry.revision}.png`,width:512,height:512},package:{url:`filters/${entry.id}-r${entry.revision}.png`}}))}));
  }});managers.push(manager);
  return{root,bare,writer,client,manager,state};
}
async function advance(f,count=1){for(let i=0;i<count;i++){await put(f.writer,'README.md','Remote '+Math.random());git(f.writer,'add','.');git(f.writer,'commit','-m','Advance main');}git(f.writer,'push','origin','main');return git(f.writer,'rev-parse','HEAD');}
async function preview(f,expected){const value=await f.manager.previewSyncMain();assert.equal(value.blockers[0]?.code,expected,JSON.stringify(value));return value;}
async function sync(f){const value=await preview(f);assert.equal(value.ready,true);return f.manager.applySyncMain({confirmed:true,reviewToken:value.reviewToken});}
function chunk(type,data){const label=Buffer.from(type),out=Buffer.alloc(data.length+12);out.writeUInt32BE(data.length);label.copy(out,4);data.copy(out,8);let crc=0xffffffff;for(const byte of Buffer.concat([label,data])){crc^=byte;for(let i=0;i<8;i++)crc=(crc>>>1)^((crc&1)?0xedb88320:0);}out.writeUInt32BE((crc^0xffffffff)>>>0,out.length-4);return out;}
async function packageBytes(doc){const header=Buffer.alloc(13);header.writeUInt32BE(512);header.writeUInt32BE(512,4);header[8]=8;header[9]=6;const image=new Blob([Buffer.from([137,80,78,71,13,10,26,10]),chunk('IHDR',header),chunk('IDAT',deflateSync(Buffer.alloc(512*(512*4+1)))),chunk('IEND',Buffer.alloc(0))]);return Buffer.from(await(await embedFilterFabMetadata(image,createFilterFabPngEnvelope(doc,'2.9.3'))).arrayBuffer());}
async function publication(f,id,{unpublish=false}={}){
  const parent=f.manager.head;
  if(unpublish)await f.manager.unpublish({id,confirmed:true});
  else{const doc={...packageFixtureDocument,id,name:id},bytes=await packageBytes(doc);const inspected=await f.manager.inspect({packageBase64:bytes.toString('base64')});await f.manager.accept({token:inspected.token,approved:true});}
  const report=await f.manager.validate();assert.equal(report.valid,true,JSON.stringify(report));
  await f.manager.prepare({token:report.review.token,confirmed:true});
  const branch=f.manager.branch,commit=f.manager.head,tree=git(f.root,'rev-parse','HEAD^{tree}');
  git(f.root,'push',f.bare,branch+':'+branch);git(f.writer,'fetch','origin',branch);git(f.writer,'merge','--squash','FETCH_HEAD');git(f.writer,'commit','-m','Squash publication');git(f.writer,'push','origin','main');
  f.state.pr={number:17,state:'MERGED',headSha:commit,mergeCommit:git(f.writer,'rev-parse','HEAD'),publicationValid:true,checks:'Passed',deployment:{state:'Passed'}};
  await f.manager.refresh();
  assert.notEqual(git(f.writer,'rev-parse','HEAD'),commit);assert.equal(git(f.writer,'rev-list','--count',parent+'..'+commit),'1');
  return{branch,commit,tree};
}
try{
  const fast=await fixture('fast-forward'),remote=await advance(fast,3),check=await preview(fast);
  assert.equal(check.behind,3);assert.equal(git(fast.root,'branch','--show-current'),'main');assert.notEqual(git(fast.root,'rev-parse','HEAD'),remote);
  await assert.rejects(fast.manager.applySyncMain({reviewToken:check.reviewToken}),code('CONFIRMATION_REQUIRED'));
  const result=await fast.manager.applySyncMain({confirmed:true,reviewToken:check.reviewToken});assert.equal(result.head,remote);assert.equal(result.baseSha,remote);assert.equal(result.dirty.length,0);assert.equal(git(fast.root,'rev-list','--count',check.head+'..HEAD'),'3');
  await assert.rejects(fast.manager.applySyncMain({confirmed:true,reviewToken:check.reviewToken}),code('SYNC_PREVIEW_EXPIRED'));
  const before=fast.client.calls.length,current=await preview(fast);assert.equal(current.alreadyCurrent,true);assert.equal(current.reviewToken,null);assert.ok(!fast.client.calls.slice(before).some(args=>args.includes('merge')||args[0]==='switch'));

  const cycles=await fixture('squash-cycles');
  for(const id of ['sync-first','sync-second']){
    const published=await publication(cycles,id),oldMain=git(cycles.root,'rev-parse','main');
    if(id==='sync-first'){const reviewed=await preview(cycles);git(cycles.root,'update-ref','refs/heads/main',reviewed.remoteSha,reviewed.mainSha);await assert.rejects(cycles.manager.applySyncMain({confirmed:true,reviewToken:reviewed.reviewToken}),code('SYNC_STATE_CHANGED'));}
    for(const pr of [null,{...cycles.state.pr,state:'OPEN'},{...cycles.state.pr,state:'CLOSED'},{...cycles.state.pr,publicationValid:null}]){const actual=cycles.state.pr;cycles.state.pr=pr;await preview(cycles,'SYNC_INCOMPLETE_PUBLICATION');cycles.state.pr=actual;}
    cycles.state.online=false;await preview(cycles,'SYNC_INCOMPLETE_PUBLICATION');cycles.state.online=true;
    cycles.manager.remotePublication.pr={...cycles.state.pr,state:'OPEN'}; // stale workspace observation must not replace fresh completion proof
    const next=await sync(cycles);assert.equal(next.branch,'main');assert.equal(next.head,git(cycles.writer,'rev-parse','HEAD'));assert.equal(next.baseSha,next.head);assert.equal(next.libraryVersion,cycles.manager.snapshot.registry.libraryVersion);assert.equal(next.lastPublication,null);assert.equal(next.completedPublication.pr.state,'MERGED');
    assert.equal(git(cycles.root,'rev-parse',published.branch),published.commit);assert.equal(git(cycles.root,'rev-parse',published.branch+'^{tree}'),published.tree);assert.notEqual(next.head,oldMain);assert.equal(cycles.manager.plan('2026-10-10').expectedVersion,next.libraryVersion);
  }
  const removed=await publication(cycles,'sync-first',{unpublish:true});
  cycles.state.registry={schema:'filter-fab-js/library-registry',schemaVersion:1,libraryVersion:1,filters:[]};await preview(cycles,'SYNC_INCOMPLETE_PUBLICATION');cycles.state.registry=null;
  assert.equal((await sync(cycles)).libraryVersion,4);assert.equal(git(cycles.root,'rev-parse',removed.branch),removed.commit);

  const blocked=await fixture('workspace');
  for(const kind of ['add','update','unpublish','republish']){blocked.manager.pending.set('test',{kind,approved:true});await preview(blocked,'SYNC_PENDING_CHANGES');blocked.manager.pending.clear();}
  blocked.manager.inspections.set('test',{});await preview(blocked,'SYNC_PENDING_CHANGES');blocked.manager.inspections.clear();
  await blocked.manager.startInspection();await preview(blocked,'SYNC_PENDING_CHANGES');assert.equal(blocked.manager.summary().inspectionActive,true);await blocked.manager.cancelInspection({confirmed:true});assert.equal(blocked.manager.summary().inspectionActive,false);
  blocked.manager.review={token:'test'};await preview(blocked,'SYNC_PENDING_CHANGES');blocked.manager.review=null;
  blocked.manager.stale=true;await preview(blocked,'SYNC_PENDING_CHANGES');blocked.manager.stale=false;
  blocked.manager.baseRef='origin/experimental';await preview(blocked,'SYNC_UNSUPPORTED_BRANCH');blocked.manager.baseRef=null;
  await fs.writeFile(blocked.manager.journal,'{}');await preview(blocked,'SYNC_RECOVERY_REQUIRED');await fs.unlink(blocked.manager.journal);
  for(const marker of ['MERGE_HEAD','CHERRY_PICK_HEAD','REVERT_HEAD','BISECT_START','index.lock']){const file=path.join(blocked.manager.gitDir,marker);await fs.writeFile(file,blocked.manager.head);await preview(blocked,'SYNC_RECOVERY_REQUIRED');await fs.unlink(file);}
  for(const marker of ['rebase-merge','rebase-apply','sequencer']){const directory=path.join(blocked.manager.gitDir,marker);await fs.mkdir(directory);await preview(blocked,'SYNC_RECOVERY_REQUIRED');await fs.rmdir(directory);}
  const pristine=git(blocked.root,'rev-parse','HEAD');
  await put(blocked.root,'unrelated.txt','Preserve me');await preview(blocked,'SYNC_DIRTY_REPOSITORY');assert.equal(await fs.readFile(path.join(blocked.root,'unrelated.txt'),'utf8'),'Preserve me');await fs.unlink(path.join(blocked.root,'unrelated.txt'));
  await put(blocked.root,'README.md','Unstaged');await preview(blocked,'SYNC_DIRTY_REPOSITORY');git(blocked.root,'add','README.md');await preview(blocked,'SYNC_DIRTY_REPOSITORY');git(blocked.root,'restore','--staged','README.md');git(blocked.root,'restore','README.md');
  git(blocked.root,'mv','README.md','renamed.md');await preview(blocked,'SYNC_DIRTY_REPOSITORY');git(blocked.root,'mv','renamed.md','README.md');
  await fs.unlink(path.join(blocked.root,'README.md'));await preview(blocked,'SYNC_DIRTY_REPOSITORY');git(blocked.root,'restore','README.md');
  git(blocked.root,'update-index','--assume-unchanged','README.md');await preview(blocked,'SYNC_DIRTY_REPOSITORY');git(blocked.root,'update-index','--no-assume-unchanged','README.md');
  git(blocked.root,'update-index','--skip-worktree','README.md');await preview(blocked,'SYNC_DIRTY_REPOSITORY');git(blocked.root,'update-index','--no-skip-worktree','README.md');assert.equal(git(blocked.root,'rev-parse','HEAD'),pristine);
  git(blocked.root,'switch','-c','feature/conflict');await put(blocked.root,'README.md','Feature bytes');git(blocked.root,'add','.');git(blocked.root,'commit','-m','Feature');git(blocked.root,'switch','main');await put(blocked.root,'README.md','Main bytes');git(blocked.root,'add','.');git(blocked.root,'commit','-m','Main');assert.throws(()=>git(blocked.root,'merge','feature/conflict'));const conflicted=await fs.readFile(path.join(blocked.root,'README.md'));await preview(blocked,'SYNC_RECOVERY_REQUIRED');assert.deepEqual(await fs.readFile(path.join(blocked.root,'README.md')),conflicted);

  const ahead=await fixture('ahead');await put(ahead.root,'README.md','Local commit');git(ahead.root,'add','.');git(ahead.root,'commit','-m','Local');await ahead.manager.refresh();await preview(ahead,'SYNC_MAIN_DIVERGED');await advance(ahead);await preview(ahead,'SYNC_MAIN_DIVERGED');
  const unsafe=await fixture('unsafe');git(unsafe.root,'switch','-c','feature/test');await unsafe.manager.refresh();await preview(unsafe,'SYNC_UNSUPPORTED_BRANCH');git(unsafe.root,'switch','--detach','HEAD');await unsafe.manager.refresh();await preview(unsafe,'SYNC_UNSUPPORTED_BRANCH');
  git(unsafe.root,'switch','-c','library/publish-2026-10-10');await unsafe.manager.refresh();await preview(unsafe,'SYNC_INCOMPLETE_PUBLICATION');git(unsafe.root,'branch','-d','main');await preview(unsafe,'SYNC_MAIN_MISSING');
  const occupied=await fixture('occupied');git(occupied.root,'switch','-c','library/publish-2026-10-10');await occupied.manager.refresh();git(occupied.root,'worktree','add',path.join(sandbox,'other worktree'),'main');await preview(occupied,'SYNC_UNSUPPORTED_BRANCH');
  const badRemote=await fixture('bad-remote');git(badRemote.root,'remote','set-url','origin','https://example.invalid/library.git');await preview(badRemote,'SYNC_REMOTE_UNAVAILABLE');git(badRemote.root,'remote','set-url','origin',official);git(badRemote.root,'config','url.https://example.invalid/.insteadOf','https://github.com/');await preview(badRemote,'SYNC_REMOTE_UNAVAILABLE');git(badRemote.root,'config','--unset-all','url.https://example.invalid/.insteadOf');badRemote.client.failFetch=true;const failed=await preview(badRemote,'SYNC_REMOTE_UNAVAILABLE');assert.ok(!JSON.stringify(failed).includes('sentinel-credential'));badRemote.client.failFetch=false;
  const rawRemote=badRemote.client.remoteCommit.bind(badRemote.client);badRemote.client.remoteCommit=async()=> 'malformed';await preview(badRemote,'SYNC_REMOTE_UNAVAILABLE');badRemote.client.remoteCommit=rawRemote;
  badRemote.client.remoteCommit=async()=> 'a'.repeat(41);await preview(badRemote,'SYNC_REMOTE_UNAVAILABLE');badRemote.client.remoteCommit=rawRemote;

  const ignored=await fixture('ignored-files');await fs.writeFile(path.join(ignored.manager.gitDir,'info','exclude'),'ignored.txt\n');await put(ignored.root,'ignored.txt','User bytes');await put(ignored.writer,'ignored.txt','Official bytes');git(ignored.writer,'add','.');git(ignored.writer,'commit','-m','Remote tracked file');git(ignored.writer,'push','origin','main');
  const ignoredPreview=await preview(ignored);assert.equal(ignoredPreview.ready,true);await assert.rejects(ignored.manager.applySyncMain({confirmed:true,reviewToken:ignoredPreview.reviewToken}),code('SYNC_REMOTE_UNAVAILABLE'));assert.equal(await fs.readFile(path.join(ignored.root,'ignored.txt'),'utf8'),'User bytes');assert.equal(git(ignored.root,'rev-parse','HEAD'),ignoredPreview.head);
  const ignoredMutation=await preview(ignored);await put(ignored.root,'ignored.txt','Changed ignored bytes');await assert.rejects(ignored.manager.applySyncMain({confirmed:true,reviewToken:ignoredMutation.reviewToken}),code('SYNC_STATE_CHANGED'));assert.equal(await fs.readFile(path.join(ignored.root,'ignored.txt'),'utf8'),'Changed ignored bytes');

  const invalidMain=await fixture('invalid-main');await put(invalidMain.writer,'registry.json','{}');git(invalidMain.writer,'add','.');git(invalidMain.writer,'commit','-m','Invalid registry');git(invalidMain.writer,'push','origin','main');await preview(invalidMain,'SYNC_RECOVERY_REQUIRED');

  const stale=await fixture('stale');await advance(stale);
  for(const mutate of [async()=>{await advance(stale);},async()=>{stale.manager.pending.set('changed',{kind:'add'});},async()=>{await put(stale.root,'external.txt','Keep');}]){
    const p=await preview(stale);assert.equal(p.ready,true);await mutate();await assert.rejects(stale.manager.applySyncMain({confirmed:true,reviewToken:p.reviewToken}),error=>['SYNC_STATE_CHANGED','SYNC_PENDING_CHANGES','SYNC_DIRTY_REPOSITORY'].includes(error.code));stale.manager.pending.clear();await fs.rm(path.join(stale.root,'external.txt'),{force:true});
  }
  const expired=await preview(stale);stale.manager.syncReview.expiresAt=0;await assert.rejects(stale.manager.applySyncMain({confirmed:true,reviewToken:expired.reviewToken}),code('SYNC_PREVIEW_EXPIRED'));
  const changedHead=await preview(stale);await put(stale.root,'README.md','External commit');git(stale.root,'add','.');git(stale.root,'commit','-m','External');await assert.rejects(stale.manager.applySyncMain({confirmed:true,reviewToken:changedHead.reviewToken}),code('SYNC_STATE_CHANGED'));
  const changedBranch=await fixture('changed-branch');await advance(changedBranch);const branchPreview=await preview(changedBranch);git(changedBranch.root,'switch','-c','feature/external');await assert.rejects(changedBranch.manager.applySyncMain({confirmed:true,reviewToken:branchPreview.reviewToken}),code('SYNC_UNSUPPORTED_BRANCH'));
  const differentMain=await fixture('changed-main');await advance(differentMain);const mainPreview=await preview(differentMain);differentMain.manager.baseSha='a'.repeat(40);await assert.rejects(differentMain.manager.applySyncMain({confirmed:true,reviewToken:mainPreview.reviewToken}),code('SYNC_STATE_CHANGED'));

  const race=await fixture('fetch-race');await advance(race);const racePreview=await preview(race);race.client.afterFetch=()=>advance(race);await assert.rejects(race.manager.applySyncMain({confirmed:true,reviewToken:racePreview.reviewToken}),code('SYNC_STATE_CHANGED'));assert.equal(git(race.root,'rev-parse','HEAD'),racePreview.head);
  const partial=await fixture('partial');const retained=await publication(partial,'sync-partial');const partialPreview=await preview(partial);partial.client.failMerge=true;await assert.rejects(partial.manager.applySyncMain({confirmed:true,reviewToken:partialPreview.reviewToken}),error=>error.code==='SYNC_PARTIAL'&&error.message.includes('main')&&!error.message.includes('sentinel-credential'));assert.equal(git(partial.root,'branch','--show-current'),'main');assert.equal(git(partial.root,'rev-parse',retained.branch),retained.commit);partial.client.failMerge=false;await sync(partial);

  const serverFixture=await fixture('api');await advance(serverFixture);const server=await startManagerServer({manager:serverFixture.manager,port:0});
  try{
    const session=await(await fetch(server.url+'/api/session')).json(),headers={'Content-Type':'application/json','X-Library-Token':session.token};
    assert.equal((await fetch(server.url+'/api/git/sync-main/preview',{method:'POST',headers:{'Content-Type':'application/json'},body:'{}'})).status,403);
    assert.equal((await fetch(server.url+'/api/git/sync-main/preview',{method:'POST',headers:{...headers,Origin:'https://evil.invalid'},body:'{}'})).status,403);
    const p=await(await fetch(server.url+'/api/git/sync-main/preview',{method:'POST',headers,body:'{}'})).json();assert.equal(p.ready,true);
    await fetch(server.url+'/api/candidate/start-inspection',{method:'POST',headers,body:'{}'});
    const uploading=await(await fetch(server.url+'/api/git/sync-main/preview',{method:'POST',headers,body:'{}'})).json();assert.equal(uploading.blockers[0].code,'SYNC_PENDING_CHANGES');
    await fetch(server.url+'/api/candidate/cancel-inspection',{method:'POST',headers,body:JSON.stringify({confirmed:true})});
    await fetch(server.url+'/api/refresh',{method:'POST',headers,body:'{}'});
    const rejected=await(await fetch(server.url+'/api/git/sync-main/apply',{method:'POST',headers,body:JSON.stringify({confirmed:true,reviewToken:p.reviewToken})})).json();assert.equal(rejected.error.code,'SYNC_PREVIEW_EXPIRED');
    const fresh=await(await fetch(server.url+'/api/git/sync-main/preview',{method:'POST',headers,body:'{}'})).json();
    const responses=await Promise.all([1,2].map(()=>fetch(server.url+'/api/git/sync-main/apply',{method:'POST',headers,body:JSON.stringify({confirmed:true,reviewToken:fresh.reviewToken})})));assert.deepEqual(responses.map(response=>response.status).sort(),[200,400]);
  }finally{await server.close();}
  for(const manager of managers){const calls=manager.git.calls;assert.ok(!calls.some(args=>args.some(arg=>['reset','clean','stash','push','--force','-f','--autostash','--ignore-other-worktrees','-D'].includes(arg))),JSON.stringify(calls));}
  console.log('Sync main: real Git Windows fixtures, fast-forward, successive squash publications, unpublish proof, preservation, blockers, stale/reused tokens, races, partial failure and protected serialized API passed.');
}finally{for(const manager of managers)await manager.close();await fs.rm(sandbox,{recursive:true,force:true});}
