import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { inspectNativeSource, inspectPortablePackage, portableEqual, validateRegistry, validationReport } from '../../online-library/publish-library.mjs';
import { FILTER_FILE_MAX_BYTES, normalizeFilterText } from '../../../src/io/filter-format.js';
import { ONLINE_LIBRARY_PACKAGE_MAX_BYTES } from '../../../src/io/filter-library-package.js';
import { catalogue, changeSummary } from './catalogue-state.mjs';
import { onlinePublication } from './publication-state.mjs';
import { GitHubClient } from './github-client.mjs';
import { remoteStatus, pushAndCreate } from './remote-publication.mjs';
import { GitClient } from './git-client.mjs';
import { previewSyncMain, applySyncMain } from './sync-main.mjs';
import { openRepository, scanRepository, copySnapshot, readCanonical, checkedPath, relativePath, requireId, digest, problem, REGISTRY_LIMIT } from './repository.mjs';

const jsonBytes=value=>Buffer.from(JSON.stringify(value,null,2)+'\n');
const localDate=()=>{const d=new Date();return`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;};
const CANDIDATE_LIMIT=128*1024*1024;
function decode(value,limit,label){if(typeof value!=='string'||value.length>Math.ceil(limit/3)*4||! /^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(value))throw problem('INVALID_UPLOAD',`${label} must be bounded base64 bytes.`);const bytes=Buffer.from(value,'base64');if(!bytes.length||bytes.length>limit)throw problem('INVALID_UPLOAD',`${label} exceeds its byte limit or is empty.`);return bytes;}
async function replaceFile(target,bytes,mode){const temporary=path.join(path.dirname(target),`.library-manager-${randomUUID()}`);if(mode===undefined){try{mode=(await fs.lstat(target)).mode&0o777;}catch(error){if(error.code!=='ENOENT')throw error;}}try{await fs.writeFile(temporary,bytes,{flag:'wx',mode});await fs.rename(temporary,target);}finally{await fs.rm(temporary,{force:true});}}
async function createFile(target,bytes){const temporary=path.join(path.dirname(target),`.library-manager-${randomUUID()}`);try{await fs.writeFile(temporary,bytes,{flag:'wx'});await fs.link(temporary,target);}finally{await fs.rm(temporary,{force:true});}}

export class LibraryManager{
  static async open({libraryRoot,baseRef,date=localDate,fetchImpl=globalThis.fetch,onlineTimeoutMs=8000,githubClient,gitClient}={}){
    if(!libraryRoot)throw problem('ROOT_REQUIRED','--library-root is required.');
    const root=await openRepository(libraryRoot),manager=new LibraryManager(root,baseRef,date);
    manager.onlineOptions={fetchImpl,timeoutMs:onlineTimeoutMs};
    manager.temp=await fs.mkdtemp(path.join(os.tmpdir(),'filter-fab-manager-'));manager.git=gitClient||new GitClient(root);manager.github=githubClient||new GitHubClient(root);
    try{const gitRoot=await fs.realpath((await manager.git.run(['rev-parse','--show-toplevel'])).trim());if(gitRoot!==root)throw problem('ROOT_REQUIRED','Choose the library Git repository root.');manager.gitDir=await fs.realpath((await manager.git.run(['rev-parse','--absolute-git-dir'])).trim());manager.journal=path.join(manager.gitDir,'filter-fabjs-manager-transaction.json');await manager.refresh();return manager;}
    catch(error){await manager.close();throw error;}
  }
  constructor(root,baseRef,date){this.root=root;this.baseRef=baseRef;this.date=date;this.pending=new Map();this.inspections=new Map();this.cache=new Map();this.review=null;this.lastPublication=null;this.confirmedOnlineIds=new Set();}
  async close(){if(this.temp){if(path.dirname(this.temp)!==await fs.realpath(os.tmpdir())||!path.basename(this.temp).startsWith('filter-fab-manager-'))throw problem('UNSAFE_PATH','Unsafe temporary directory.');await fs.rm(this.temp,{recursive:true,force:true});}}
  async readJournal(){try{const stat=await fs.lstat(this.journal);if(!stat.isFile()||stat.isSymbolicLink()||stat.size>40*1024*1024)throw problem('RECOVERY_INVALID','Publication recovery file is unsafe.');const journal=JSON.parse(await fs.readFile(this.journal,'utf8'));if(journal.root!==this.root||!Array.isArray(journal.files)||journal.files.length>201||! /^[a-f0-9]{40,64}$/.test(journal.head))throw problem('RECOVERY_INVALID','Publication recovery file is invalid.');for(const item of journal.files){relativePath(item.file);if(!/^[a-f0-9]{64}$/.test(item.after)||!(item.before===null||typeof item.before==='string'))throw problem('RECOVERY_INVALID','Invalid recovery entry.');}return journal;}catch(error){if(error.code==='ENOENT')return null;throw error;}}
  async refresh(){
    const snapshot=await scanRepository(this.root,this.cache),head=await this.git.head(),branch=await this.git.branch(),status=await this.git.status();
    await this.loadPublicationHistory(head);snapshot.publishedIds=this.publishedIds;snapshot.historyComplete=this.historyComplete;
    this.publicationErrors=[];
    for(const [key] of this.historyCache){const [id,revision]=key.split(':');if(!snapshot.packages.has(`filters/${id}-r${revision}.png`))this.publicationErrors.push({code:'HISTORICAL_PACKAGE_DELETED',path:`filters/${id}-r${revision}.png`,message:`Historical published package is missing: ${id} revision ${revision}. Restore its original bytes before preparing publication.`});}
    this.stale=!!this.snapshot&&this.pending.size>0&&(head!==this.head||snapshot.fingerprint!==this.snapshot.fingerprint);
    if(!this.pending.size){this.snapshot=snapshot;this.head=head;this.branch=branch;this.review=null;this.inspections.clear();
      if(this.baseRoot)await fs.rm(this.baseRoot,{recursive:true,force:true});
      this.baseRoot=path.join(this.temp,`base-${randomUUID()}`);this.baseSha=await this.git.exportBase(this.baseRef||head,this.baseRoot);
      // Git for Windows can check out CRLF while its blobs use LF. Align only
      // equivalent source text in the disposable comparison base; immutable
      // PNG bytes and canonical working-tree files remain untouched.
      for(const [id,item] of snapshot.sources){
        if(!item.document)continue;
        const file=`source/${id}.json`,baseFile=path.join(this.baseRoot,file);
        let baseBytes;try{baseBytes=await fs.readFile(baseFile);}catch(error){if(error.code==='ENOENT')continue;throw error;}
        const current=await readCanonical(this.root,file,FILTER_FILE_MAX_BYTES);
        if(digest(current)!==snapshot.files.get(file)?.hash)throw problem('STALE_REPOSITORY','Library changed while refreshing its comparison base. Refresh again.');
        if(!baseBytes.equals(current)&&normalizeFilterText(baseBytes.toString('utf8'))===normalizeFilterText(current.toString('utf8')))await fs.writeFile(baseFile,current);
      }
    }
    this.liveSnapshot=snapshot;this.status=status;this.recovery=await this.readJournal();
    this.health=await validationReport({libraryRoot:this.root,baseRoot:this.baseRoot});
    const observations=await Promise.allSettled([this.git.publicationProgress(head,branch),onlinePublication(this.onlineOptions)]);
    this.gitPublication=observations[0].status==='fulfilled'?observations[0].value:{head,branch,error:observations[0].reason.message};
    this.online=observations[1].status==='fulfilled'?observations[1].value:{state:'unknown',manifest:null,error:observations[1].reason.message};
    // Retain positive history for bounded local inputs, plus the current
    // bounded catalogue. Do not accumulate every remotely seen ID forever.
    const retainedIds=new Set([...snapshot.sources.keys(),...[...snapshot.packages.values()].map(item=>item.id),...snapshot.publishedIds,...this.pending.keys()]);
    this.confirmedOnlineIds=new Set([...this.confirmedOnlineIds].filter(id=>retainedIds.has(id)));
    for(const entry of this.online.manifest?.filters||[])this.confirmedOnlineIds.add(entry.id);
    this.remotePublication=await remoteStatus(this);
    this.gitPublication.remotePublication=this.remotePublication;
    return this.summary();
  }
  async pushAndCreate(data){return pushAndCreate(this,data);}
  async startInspection(){this.uploadActive=true;this.syncReview=null;return this.summary();}
  async cancelInspection({confirmed}={}){
    if(confirmed!==true)throw problem('CONFIRMATION_REQUIRED','Confirm cancelling this candidate upload/inspection.');
    this.uploadActive=false;this.inspections.clear();this.syncReview=null;return this.summary();
  }
  async previewSyncMain(){return previewSyncMain(this);}
  async applySyncMain(data){return applySyncMain(this,data);}
  summary(){const online={state:this.online?.state||'unknown',url:this.online?.url,checkedAt:this.online?.checkedAt,libraryVersion:this.online?.manifest?.libraryVersion||null,error:this.online?.error||null};const gitPublication=this.gitPublication?Object.fromEntries(Object.entries(this.gitPublication).filter(([key])=>!key.endsWith('Registry'))):null;const errors=[...(this.health?.errors||[]),...(this.liveSnapshot?.errors||[]),...(this.publicationErrors||[])];return{inspectionActive:!!this.uploadActive||this.inspections.size>0,completedPublication:this.completedPublication||null,remotePublication:this.remotePublication,root:this.root,branch:this.branch,head:this.head,online,gitPublication,workspaceCount:this.pending.size,baseSha:this.baseSha,libraryVersion:this.snapshot?.registry?.libraryVersion,health:{...this.health,valid:!!this.health?.valid&&!errors.length,errors,warnings:[...(this.health?.warnings||[]),...(this.historyComplete?[]:[{code:'HISTORY_INCOMPLETE',message:'History inspection is limited or contains invalid registries. New IDs and draft deletion are disabled because prior publication cannot be ruled out.'}])]},dirty:this.status||[],stale:!!this.stale,recovery:!!this.recovery,filters:catalogue(this.pending.size?this.snapshot:this.liveSnapshot,this.pending,{git:this.gitPublication,online:this.online,onlineHistory:this.confirmedOnlineIds}),pending:[...this.pending].map(([id,item])=>({id,kind:item.kind,name:item.document?.name||id,revision:item.revision,approved:item.approved,changes:item.changes})),lastPublication:this.lastPublication};}
  async assertFresh({clean=true}={}){
    if(await this.readJournal())throw problem('RECOVERY_REQUIRED','A prior preparation was interrupted. Review and discard its manager-created changes before continuing.');
    if(clean)await this.git.ensureClean();
    const head=await this.git.head(),snapshot=await scanRepository(this.root,this.cache);
    if(head!==this.head||snapshot.fingerprint!==this.snapshot.fingerprint){this.stale=true;throw problem('STALE_REPOSITORY','The library changed since this workspace was created. Discard pending changes and refresh.');}
    if(snapshot.errors.length)throw problem('LIBRARY_INVALID','Fix invalid library files before creating a publication.',{details:snapshot.errors});
    if(this.publicationErrors?.length)throw problem('LIBRARY_INVALID','Restore missing published historical packages before creating a publication.',{details:this.publicationErrors});
    if(!snapshot.registry)throw problem('LIBRARY_INVALID','Registry is invalid.');
    return snapshot;
  }
  async inspect({kind='add',id,sourceBase64,packageBase64}={}){
    if(!['add','update','republish'].includes(kind))throw problem('INVALID_OPERATION','Choose Add, Update or Republish.');
    await this.assertFresh();
    const packageBytes=decode(packageBase64,ONLINE_LIBRARY_PACKAGE_MAX_BYTES,'Portable PNG'),pkg=await inspectPortablePackage(packageBytes,'candidate package');
    let sourceBytes=sourceBase64?decode(sourceBase64,FILTER_FILE_MAX_BYTES,'Native JSON'):jsonBytes(pkg.document),document=inspectNativeSource(sourceBytes,'candidate source');
    requireId(document.id);if(id!==undefined&&requireId(id)!==document.id)throw problem('ID_MISMATCH','The candidate ID must match the selected filter.');id=document.id;
    const filters=catalogue(this.snapshot,this.pending,{git:this.gitPublication,online:this.online,onlineHistory:this.confirmedOnlineIds}),existing=filters.find(item=>item.id===id),collision=filters.find(item=>item.id.toLowerCase()===id.toLowerCase()&&item.id!==id);
    if(collision)throw problem('CASE_COLLISION',`ID collides with ${collision.id} on case-insensitive filesystems.`);
    if(kind==='add'&&!existing?.hasHistory&&!this.historyComplete)throw problem('HISTORY_INCOMPLETE','Prior publication cannot be ruled out for a new ID because registry history inspection is incomplete.');
    if(kind==='add'&&(existing?.current||existing?.hasHistory))throw problem('ID_EXISTS','Use Update or Republish for a filter with publication history.');
    if(kind==='update'&&!existing?.current)throw problem('NOT_PUBLISHED','Only a discovered filter can be updated.');
    if(kind==='republish'&&(!existing?.hasHistory||existing.current))throw problem('NOT_UNPUBLISHED','Republish requires an unpublished historical filter.');
    if(!portableEqual(document,pkg.document))throw problem('PACKAGE_SOURCE_MISMATCH','The PNG contains a different filter definition. Export a package containing the supplied source.',{details:changeSummary(document,pkg.document)});
    // PNG-only ingestion preserves existing canonical bytes when its portable content is unchanged.
    const oldSource=this.snapshot.sources.get(id);
    if(!sourceBase64&&oldSource?.document&&portableEqual(document,oldSource.document))sourceBytes=await readCanonical(this.root,`source/${id}.json`,FILTER_FILE_MAX_BYTES);
    const revision=existing?.nextRevision||1;
    if(!Number.isSafeInteger(revision))throw problem('REVISION_LIMIT','Revision exceeds the safe integer limit.');
    const packageFile=`filters/${id}-r${revision}.png`;
    await checkedPath(this.root,packageFile,{missing:true});
    if(this.snapshot.files.has(packageFile))throw problem('HISTORICAL_PACKAGE_MODIFIED','Existing historical packages cannot be overwritten.');
    if(existing?.current){const oldPackage=await readCanonical(this.root,`filters/${id}-r${existing.revision}.png`,ONLINE_LIBRARY_PACKAGE_MAX_BYTES);if(oldPackage.equals(packageBytes)&&digest(sourceBytes)===this.snapshot.files.get(`source/${id}.json`)?.hash)throw problem('NO_CHANGE','This source and package are unchanged. No revision is needed.');}
    const previous=existing?.current?this.snapshot.packages.get(`filters/${id}-r${existing.revision}.png`)?.document:oldSource?.document;
    const item={kind,id,document,sourceBytes,packageBytes,revision,packageFile,approved:false,changes:changeSummary(previous,document)},token=randomUUID();
    this.inspections.clear();this.inspections.set(token,item);
    return{token,id,name:document.name,document,kind,currentRevision:existing?.revision||null,revision,changes:item.changes,checks:['Filter definition valid','Package valid · 512 × 512','Source and package match'],preview:`/api/inspection/${token}/preview`};
  }
  async accept({token,approved}={}){
    await this.assertFresh();const item=this.inspections.get(token);if(!item)throw problem('INSPECTION_EXPIRED','Inspect this candidate again.');
    if(approved!==true)throw problem('VISUAL_REVIEW_REQUIRED','Review the visual preview before adding it to the publication workspace.');
    const others=[...this.pending.values()].filter(value=>value.id!==item.id);
    if(others.length>=100||others.reduce((sum,value)=>sum+(value.sourceBytes?.length||0)+(value.packageBytes?.length||0),item.sourceBytes.length+item.packageBytes.length)>CANDIDATE_LIMIT)throw problem('WORKSPACE_LIMIT','A workspace supports at most 100 changes and 128 MiB of candidate data.');
    this.pending.set(item.id,{...item,approved:true});this.uploadActive=false;this.inspections.clear();this.review=null;return this.summary();
  }
  async unpublish({id,confirmed}={}){
    await this.assertFresh();requireId(id);if(confirmed!==true)throw problem('CONFIRMATION_REQUIRED','Confirm removal from Online discovery. Source and published packages will be preserved.');
    if(!this.snapshot.registry.filters.some(entry=>entry.id===id))throw problem('NOT_PUBLISHED','This filter is not currently published.');
    if(this.pending.size>=100&&!this.pending.has(id))throw problem('WORKSPACE_LIMIT','A workspace supports at most 100 changes.');
    this.pending.set(id,{kind:'unpublish',id,document:this.snapshot.sources.get(id)?.document,approved:true,changes:[{field:'Discovery',before:'Listed in local registry',after:'Removed from next catalogue'}]});this.review=null;return this.summary();
  }
  async deleteDraft({id,confirmed}={}){
    requireId(id);
    // New Add candidates exist only in memory. Cancelling them cannot touch
    // canonical files, and can safely preserve unrelated worktree edits.
    const candidateOnly=this.pending.get(id)?.kind==='add'&&!this.snapshot.sources.has(id);
    await this.assertFresh({clean:!candidateOnly});if(confirmed!==true)throw problem('CONFIRMATION_REQUIRED','Confirm draft deletion.');
    const item=catalogue(this.snapshot,this.pending,{git:this.gitPublication,online:this.online,onlineHistory:this.confirmedOnlineIds}).find(filter=>filter.id===id);
    if(!item||item.current||item.hasHistory)throw problem('HISTORICAL_FILTER_PROTECTED','Only never-published drafts can be deleted.');
    if(!this.historyComplete)throw problem('HISTORY_INCOMPLETE','Draft deletion requires complete registry history to rule out prior publication.');
    if(!item.canDeleteDraft)throw problem('INVALID_OPERATION','Draft deletion is already pending.');
    if(candidateOnly)this.pending.delete(id);
    else{
      if(this.pending.size>=100&&!this.pending.has(id))throw problem('WORKSPACE_LIMIT','A workspace supports at most 100 changes.');
      this.pending.set(id,{kind:'delete-draft',id,document:this.snapshot.sources.get(id)?.document,approved:true,changes:[{field:'Draft',before:'Present',after:'Removed'}]});
    }
    this.inspections.clear();this.review=null;return this.summary();
  }
  async discard({confirmed}={}){
    if(confirmed!==true)throw problem('CONFIRMATION_REQUIRED','Confirm discarding manager-created pending changes.');
    const journal=await this.readJournal();if(journal)await this.rollback(journal);
    this.pending.clear();this.uploadActive=false;this.inspections.clear();this.review=null;this.stale=false;return this.refresh();
  }
  plan(date){
    const registry=structuredClone(this.snapshot.registry),writes=new Map();let catalogueChanged=false;
    for(const [id,item] of this.pending){
      if(item.kind==='delete-draft'){writes.set(`source/${id}.json`,null);continue;}
      catalogueChanged=true;registry.filters=registry.filters.filter(entry=>entry.id!==id);
      if(item.kind!=='unpublish'){registry.filters.push({id,revision:item.revision,publishedAt:date});if(this.snapshot.files.get(`source/${id}.json`)?.hash!==digest(item.sourceBytes))writes.set(`source/${id}.json`,item.sourceBytes);writes.set(item.packageFile,item.packageBytes);}
    }
    if(catalogueChanged){registry.libraryVersion++;writes.set('registry.json',jsonBytes(validateRegistry(registry)));}
    return{registry,writes,expectedVersion:this.snapshot.registry.libraryVersion+(catalogueChanged?1:0)};
  }
  async validate(){
    await this.assertFresh();
    if(this.pending.size){
      await this.git.requirePublicationMain(this.baseSha);
      if(this.baseSha!==this.head)throw problem('PUBLICATION_BASE_INVALID','Publication must be reviewed against the current local main commit. Update main and validate again.');
    }
    if(!this.pending.size){const report=await validationReport({libraryRoot:this.root,baseRoot:this.baseRoot});return{...report,review:null};}
    if([...this.pending.values()].some(item=>!item.approved))throw problem('VISUAL_REVIEW_REQUIRED','All candidate previews must be reviewed.');
    const date=this.date(),plan=this.plan(date),tree=path.join(this.temp,`candidate-${randomUUID()}`);
    await fs.mkdir(tree);await copySnapshot(this.root,tree,this.snapshot);
    for(const [file,bytes] of plan.writes){const target=await checkedPath(tree,file,{missing:true});if(bytes===null)await fs.unlink(target);else await fs.writeFile(target,bytes);}
    const report=await validationReport({libraryRoot:tree,baseRoot:this.baseRoot});
    if(!report.valid){this.review=null;await fs.rm(tree,{recursive:true,force:true});return report;}
    let diff='';
    for(const [file,bytes] of plan.writes){
      const added=!this.snapshot.files.has(file),removed=bytes===null,before=added?'/dev/null':path.join(this.root,file),after=removed?'/dev/null':path.join(tree,file);
      const raw=await this.git.run(['diff','--no-index','--no-ext-diff','--no-textconv','--',before,after],{allowedExit:[1]});
      // Git quotes Windows absolute paths. Normalize only structural headers,
      // preserving the exact hunks/hashes while presenting canonical repository paths.
      diff+=raw.split('\n').map(line=>line.startsWith('diff --git ')?`diff --git a/${file} b/${file}`:line.startsWith('--- ')?`--- ${added?'/dev/null':`a/${file}`}`:line.startsWith('+++ ')?`+++ ${removed?'/dev/null':`b/${file}`}`:line.startsWith('Binary files ')?`Binary files ${added?'/dev/null':`a/${file}`} and ${removed?'/dev/null':`b/${file}`} differ`:line).join('\n');
    }
    if(this.review?.tree)await fs.rm(this.review.tree,{recursive:true,force:true});
    this.review={token:randomUUID(),tree,date,plan,diff,baseSha:this.baseSha};
    return{...report,review:{token:this.review.token,date,libraryVersion:{before:this.snapshot.registry.libraryVersion,after:plan.registry.libraryVersion},baseSha:this.baseSha,changes:this.summary().pending,files:[...plan.writes].map(([file,bytes])=>({path:file,action:bytes===null?'Removed':this.snapshot.files.has(file)?'Modified':'Added',size:bytes?.length||0})),diff,historicalFilesRetained:this.snapshot.packages.size}};
  }
  async rollback(journal){
    if(await this.git.head()!==journal.head)throw problem('RECOVERY_COMMITTED','HEAD changed after preparation. No committed history will be reverted; review the recovery file manually.');
    const status=await this.git.status(),intended=new Set(journal.files.map(item=>item.file));
    if(status.some(item=>!intended.has(item.path)))throw problem('RECOVERY_CONFLICT','Unrelated changes exist. Move them before discarding the interrupted publication.');
    const restore=new Set();
    for(const item of journal.files){const target=await checkedPath(this.root,item.file,{missing:true});let actual=null;try{actual=digest(await fs.readFile(target));}catch(error){if(error.code!=='ENOENT')throw error;}const before=item.before===null?null:digest(Buffer.from(item.before,'base64'));if(actual!==item.after&&actual!==before&&!(actual===null&&item.deleted))throw problem('RECOVERY_CONFLICT',`Refusing to overwrite external changes to ${item.file}.`);if(actual!==before)restore.add(item.file);}
    // Only restore our index paths; never reset the working tree or unrelated files.
    await this.git.run(['reset','--quiet',journal.head,'--',...journal.files.map(item=>item.file)]);
    for(const item of journal.files){if(!restore.has(item.file))continue;const target=await checkedPath(this.root,item.file,{missing:true});if(item.before===null)await fs.rm(target,{force:true});else await replaceFile(target,Buffer.from(item.before,'base64'),item.beforeMode);}
    if(journal.createdBranch&&await this.git.branch()===journal.createdBranch){if(journal.previousBranch==='(detached)')await this.git.run(['switch','--detach',journal.head]);else{if(await this.git.resolve(journal.previousBranch)!==journal.head)throw problem('RECOVERY_CONFLICT','The original branch moved during preparation. Review recovery manually.');await this.git.run(['switch',journal.previousBranch]);}await this.git.run(['branch','-d','--',journal.createdBranch]);}
    await fs.unlink(this.journal);
  }
  async prepare({token,confirmed}={}){
    if(confirmed!==true)throw problem('CONFIRMATION_REQUIRED','Confirm the reviewed publication branch and commit.');
    if(!this.review||token!==this.review.token)throw problem('REVIEW_REQUIRED','Validate and review the exact diff before preparation.');
    if(this.date()!==this.review.date)throw problem('REVIEW_EXPIRED','The preparation date changed. Validate and review again.');
    await this.assertFresh();const review=this.review;
    if(review.baseSha!==this.baseSha)throw problem('REVIEW_MISMATCH','Publication base changed. Validate and review again.');
    await this.git.requirePublicationMain(review.baseSha);
    if(review.baseSha!==this.head)throw problem('PUBLICATION_BASE_INVALID','Publication must be prepared from the current local main commit. Update main and validate again.');
    await this.verifyReview(review);
    const report=await validationReport({libraryRoot:review.tree,baseRoot:this.baseRoot});if(!report.valid)throw problem('PUBLICATION_INVALID','Authoritative publication validation failed.',{details:report.errors});
    const files=[...review.plan.writes.keys()];await this.git.assertAttributes(files);
    // Fail before writing if Git cannot create the maintainer's commit.
    await this.git.run(['var','GIT_AUTHOR_IDENT']);await this.git.run(['var','GIT_COMMITTER_IDENT']);
    const journal={root:this.root,head:this.head,previousBranch:await this.git.branch(),files:[]};
    for(const [file,bytes] of review.plan.writes){const before=this.snapshot.files.has(file)?await readCanonical(this.root,file,file==='registry.json'?REGISTRY_LIMIT:FILTER_FILE_MAX_BYTES):null,beforeMode=before?(await fs.lstat(await checkedPath(this.root,file))).mode&0o777:undefined;journal.files.push({file,before:before?.toString('base64')??null,beforeMode,after:digest(bytes||Buffer.alloc(0)),deleted:bytes===null});}
    await fs.writeFile(this.journal,jsonBytes(journal),{flag:'wx'});
    let commit;
    try{
      await this.assertTransactionFresh(journal);
      for(const [file,bytes] of review.plan.writes){const target=await checkedPath(this.root,file,{missing:true});if(file.startsWith('filters/')&&this.snapshot.files.has(file))throw problem('HISTORICAL_PACKAGE_MODIFIED','Refusing to overwrite a historical package.');if(bytes===null)await fs.unlink(target);else if(file.startsWith('filters/')||!this.snapshot.files.has(file))await createFile(target,bytes);else await replaceFile(target,bytes);}
      const final=await validationReport({libraryRoot:this.root,baseRoot:this.baseRoot});if(!final.valid)throw problem('PUBLICATION_INVALID','Applied publication failed validation.',{details:final.errors});
      await this.git.requirePublicationMain(review.baseSha);
      const status=await this.git.status();if(status.some(item=>!files.includes(item.path)))throw problem('DIRTY_REPOSITORY','External changes appeared during publication.');
      const branch=await this.git.publicationBranch(review.date);journal.createdBranch=branch;await replaceFile(this.journal,jsonBytes(journal));await this.git.stage(files);
      if(await this.git.head()!==journal.head)throw problem('STALE_REPOSITORY','HEAD changed during preparation.');
      const stagedRegistry=validateRegistry(JSON.parse(normalizeFilterText(new TextDecoder('utf-8',{fatal:true}).decode(await this.git.stagedBytes('registry.json')))));
      if(stagedRegistry.libraryVersion!==review.plan.expectedVersion)throw problem('STAGING_MISMATCH',`Expected staged libraryVersion ${review.plan.expectedVersion}, found ${stagedRegistry.libraryVersion}.`);
      for(const [file,bytes] of review.plan.writes){if(bytes===null?(await this.git.run(['ls-files','--stage','--',file])).trim()!== '':!bytes.equals(await this.git.stagedBytes(file)))throw problem('STAGING_MISMATCH',`Staged bytes differ from the reviewed publication: ${file}`);}
      const record={version:1,branch,parent:journal.head,base:this.baseSha,fingerprint:(await scanRepository(this.root,this.cache)).fingerprint,files,changes:[...this.pending].map(([id,item])=>({id,kind:item.kind,revision:item.revision||null})),beforeVersion:this.snapshot.registry.libraryVersion,afterVersion:review.plan.registry.libraryVersion};
      commit=await this.git.commit(this.pending.size,record);
      this.lastPublication={branch,commit,changes:this.pending.size,date:review.date};
    }catch(error){try{await this.rollback(journal);}catch(recovery){throw problem('RECOVERY_REQUIRED',`${error.message} Recovery paused: ${recovery.message}`,{details:journal.files.map(item=>item.file)});}throw error;}
    // A successful commit is the boundary: never roll it back automatically.
    try{await fs.unlink(this.journal);}catch(error){throw problem('RECOVERY_COMMITTED',`Publication committed as ${commit}, but its recovery marker could not be removed: ${error.message}`);}
    this.pending.clear();this.inspections.clear();this.review=null;return this.refresh();
  }
  async verifyReview(review){
    const expected=this.plan(review.date);
    if(review.plan.registry.libraryVersion!==expected.expectedVersion||review.plan.expectedVersion!==expected.expectedVersion||JSON.stringify([...review.plan.writes.keys()])!==JSON.stringify([...expected.writes.keys()]))throw problem('REVIEW_MISMATCH','Reviewed publication version or files changed. Validate and review again.');
    for(const [file,bytes] of expected.writes){
      const planned=review.plan.writes.get(file);
      if(bytes===null?planned!==null:!Buffer.isBuffer(planned)||!bytes.equals(planned))throw problem('REVIEW_MISMATCH',`Planned bytes changed: ${file}. Validate and review again.`);
      const target=await checkedPath(review.tree,file,{missing:bytes===null});
      if(bytes===null){try{await fs.lstat(target);throw problem('REVIEW_MISMATCH',`Candidate deletion changed: ${file}.`);}catch(error){if(error.code!=='ENOENT')throw error;}}
      else if(!bytes.equals(await fs.readFile(target)))throw problem('REVIEW_MISMATCH',`Candidate bytes changed: ${file}. Validate and review again.`);
    }
    const registry=validateRegistry(JSON.parse(normalizeFilterText(await fs.readFile(path.join(review.tree,'registry.json'),'utf8'))));
    if(registry.libraryVersion!==expected.expectedVersion)throw problem('REVIEW_MISMATCH','Candidate libraryVersion differs from the reviewed batch.');
  }
  async assertTransactionFresh(journal){await this.git.ensureClean();if(await this.git.head()!==journal.head||(await scanRepository(this.root,this.cache)).fingerprint!==this.snapshot.fingerprint)throw problem('STALE_REPOSITORY','Library changed immediately before application.');}
  async loadPublicationHistory(head){
    if(this.historyHead===head)return;const dates=new Map(),ids=new Set(),commits=(await this.git.run(['log','--max-count=2001','--format=%H','--','registry.json'])).trim().split('\n').filter(Boolean);let complete=commits.length<=2000&&(await this.git.run(['rev-parse','--is-shallow-repository'])).trim()==='false';
    for(const sha of commits.slice(0,2000)){const bytes=await this.git.run(['show',`${sha}:registry.json`],{allowedExit:[128]});if(Buffer.byteLength(bytes)>REGISTRY_LIMIT){complete=false;continue;}try{for(const entry of validateRegistry(JSON.parse(normalizeFilterText(bytes))).filters){ids.add(entry.id);const key=`${entry.id}:${entry.revision}`;if(!dates.has(key))dates.set(key,entry.publishedAt);if(dates.size>10000)throw problem('REPOSITORY_LIMIT','Manager supports at most 10,000 published revisions.');}}catch(error){if(error.code==='REPOSITORY_LIMIT')throw error;complete=false;}}
    this.historyCache=dates;this.publishedIds=ids;this.historyComplete=complete;this.historyHead=head;
  }
  async history(id){
    requireId(id);const snapshot=this.pending.size?this.snapshot:this.liveSnapshot,current=snapshot.registry?.filters.find(entry=>entry.id===id),items=[...snapshot.packages.values()].filter(item=>item.id===id).sort((a,b)=>b.revision-a.revision);
    const result=[];
    for(const item of items){let committedAt=null,publishedAt=current?.revision===item.revision?current.publishedAt:null;
      const log=(await this.git.run(['log','-1','--format=%cI','--',item.file])).trim();if(log)committedAt=log;
      // Registry entries, rather than commit dates, prove historical publication dates.
      publishedAt||=this.historyCache.get(`${id}:${item.revision}`)||null;
      result.push({revision:item.revision,file:item.file,size:item.size,current:current?.revision===item.revision,publishedAt,committedAt,valid:!item.error,error:item.error,metadata:item.envelope||null,preview:`/api/preview/${encodeURIComponent(id)}/${item.revision}`});
    }return result;
  }
  async preview(id,revision){requireId(id);if(!Number.isSafeInteger(revision)||revision<1)throw problem('INVALID_REVISION','Invalid preview revision.');return readCanonical(this.root,`filters/${id}-r${revision}.png`,ONLINE_LIBRARY_PACKAGE_MAX_BYTES);}
}
