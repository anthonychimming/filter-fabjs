const $=id=>document.getElementById(id);
let token='',state=null,selected=null,review=null,busy=false,section='library';
const el=(tag,text,className)=>{const node=document.createElement(tag);if(text!==undefined)node.textContent=String(text);if(className)node.className=className;return node;};
// Exact API state keys, independent of display copy. Unmapped states stay neutral.
const statusSemantics={
  publication:{'Published Online':'success','Ready to Publish':'progress','Prepared Locally':'progress',Pushed:'progress','PR Open':'progress','Merged · Awaiting Online Deployment':'attention','Merged · Online Status Unknown':'attention','Online Status Unknown':'attention','PR Status Unknown':'attention','PR Closed':'attention',Changed:'attention','Merged · Deployment Failed':'failure','PR Open · Checks Failed':'failure','Deployment Failed':'failure','Validation Failed':'failure',Invalid:'failure'},
  pr:{OPEN:'progress',MERGED:'attention',CLOSED:'attention'},
  checks:{Passed:'success',Pending:'progress',Failed:'failure',Unknown:'attention'},
  deployment:{Passed:'success',Pending:'attention',Failed:'failure',Unknown:'attention'},
  validation:{valid:'success',invalid:'failure'}
};
function statusSemanticClass(value,kind='publication'){const mapping=Object.hasOwn(statusSemantics,kind)?statusSemantics[kind]:null;return 'status-'+(mapping&&Object.hasOwn(mapping,value)?mapping[value]:'neutral');}
function statusBadge(text,value,kind='publication'){return el('span',text,'status-badge '+statusSemanticClass(value,kind));}
function filterStatusBadge(item,detail=false){const revision=item.publication.expectedRevision??item.revision;return statusBadge(`${statusLabel(item)}${revision?` · ${detail?'Revision ':'r'}${revision}`:''}`,item.status);}
const button=(text,handler,className)=>{const node=el('button',text,className);node.type='button';node.addEventListener('click',()=>run(handler));return node;};
const note=(message,error=false)=>{$('notice').textContent=message;$('notice').dataset.error=String(error);};
async function api(route,data){const response=await fetch(route,{method:data===undefined?'GET':'POST',headers:{'X-Library-Token':token,...(data===undefined?{}:{'Content-Type':'application/json'})},...(data===undefined?{}:{body:JSON.stringify(data)})});const value=await response.json();if(!response.ok){const error=new Error(value.error.message);error.details=value.error.details;error.code=value.error.code;throw error;}return value;}
async function run(work){if(busy)return;busy=true;document.body.setAttribute('aria-busy','true');try{await work();}catch(error){note(error.message,true);if(error.details){const details=el('details'),summary=el('summary','Technical details');details.append(summary,el('pre',JSON.stringify(error.details,null,2)));$('notice').append(details);}}finally{busy=false;document.body.removeAttribute('aria-busy');}}
function image(url,alt){const img=el('img',undefined,'preview');img.src=`${url}?token=${encodeURIComponent(token)}`;img.alt=alt;img.width=512;img.height=512;img.addEventListener('error',()=>{img.alt='Preview could not be displayed. Refresh and inspect the package.';});return img;}
function switchSection(name){section=name;for(const key of ['library','history','publish']){$(`${key}-panel`).hidden=key!==name;if(key===name)$(`${key}-tab`).setAttribute('aria-current','page');else $(`${key}-tab`).removeAttribute('aria-current');}if(name==='publish')renderPublish();if(name==='history')return renderHistory();}
function render(){
  const healthy=state.health.valid&&!state.health.errors.length;$('health').replaceChildren(statusBadge(healthy?'✓ Library healthy':'Library needs attention',healthy?'valid':'invalid','validation'));$('pending-count').textContent=(state.workspaceCount??state.pending.length);$('pending-summary').textContent=state.pending.length?`${state.pending.length} pending workspace change${state.pending.length===1?'':'s'}`:'No pending workspace changes';
  if(state.stale)note('The library changed outside the manager. Discard the pending workspace, then refresh.',true);
  else if(state.recovery)note('A publication preparation was interrupted. Review recovery information under Publish.',true);
  else if(state.dirty.length)note(`Read-only browsing is available. The library has ${state.dirty.length} existing Git change(s); commit or move them before preparing manager changes.`,true);
  renderList();if(section==='publish')renderPublish();
}
function renderList(){
  const query=$('search').value.normalize('NFD').replace(/\p{M}/gu,'').toLowerCase().trim(),status=$('status').value,sort=$('sort').value;
  const filters=state.filters.filter(item=>(status==='All'||item.status===status)&&[item.id,item.name,item.author,item.description,...item.tags].join(' ').normalize('NFD').replace(/\p{M}/gu,'').toLowerCase().includes(query));
  filters.sort((a,b)=>sort==='revision'?(b.revision||0)-(a.revision||0):sort.endsWith('At')?String(b[sort]||'').localeCompare(String(a[sort]||'')):String(a[sort]).localeCompare(String(b[sort])));
  if(!filters.some(item=>item.id===selected))selected=filters[0]?.id||null;
  $('result-count').textContent=`${filters.length} filter${filters.length===1?'':'s'}`;$('filters').replaceChildren();
  for(const item of filters){const node=button(item.name,()=>{selected=item.id;renderList();renderDetails();});node.append(filterStatusBadge(item));node.setAttribute('aria-pressed',String(selected===item.id));$('filters').append(node);}
  renderDetails();
}
function statusLabel(item){return item.status==='Ready to Publish'?'Ready for Publication Review':item.status;}
function canReviewPublication(item){return item.publication.localCandidate&&item.contentState==='ready';}
function openPublicationWorkspace(id=selected){
  if(state.filters.some(item=>item.id===id))selected=id;
  switchSection('publish');
  const panel=$('publish-panel'),target=[...panel.children].find(node=>node.dataset.filterId===id)||panel.querySelector('h1');
  target.focus({preventScroll:true});target.scrollIntoView({block:'start'});
}
function technical(parent,title,value){const details=el('details');details.append(el('summary',title),el('pre',typeof value==='string'?value:JSON.stringify(value,null,2)));parent.append(details);}
function diagnostics(parent,errors){const guidance={PACKAGE_SOURCE_MISMATCH:'The PNG contains a different filter definition. Export a new 512 × 512 portable PNG containing the current source.',HISTORICAL_PACKAGE_MODIFIED:'Restore the original historical PNG. Revised content must use a new revision.',HISTORICAL_PACKAGE_DELETED:'Restore the original historical PNG. Unpublish removes discovery while retaining package URLs.',PACKAGE_MISSING:'Supply the approved matching portable PNG for this revision.'};for(const error of errors){parent.append(el('p',guidance[error.code]||error.message,'issue'));technical(parent,'Technical details',{code:error.code,path:error.path,message:error.message});}}
function renderDetails(){
  const panel=$('details'),item=state.filters.find(filter=>filter.id===selected);panel.replaceChildren();
  if(!item){panel.append(el('h1','Your library'),el('p','Choose a filter to review its definition and publication history, or add a new filter.','muted'));return;}
  panel.append(el('h1',item.name),filterStatusBadge(item,true),el('p',item.author?`By ${item.author}`:'No author supplied','muted'));
  if(canReviewPublication(item))publicationDetails(panel,item);
  if(item.pending?.kind!=='unpublish'&&item.pending?.kind!=='delete-draft'&&item.pending)panel.append(image(`/api/candidate/${encodeURIComponent(item.id)}/preview`,`${item.name} candidate preview`));else if(item.preview)panel.append(image(item.preview,`${item.name} published preview`));
  panel.append(el('p',item.description||'No description supplied.'));const tags=el('div',undefined,'tags');for(const tag of item.tags)tags.append(el('span',tag,'tag'));panel.append(tags);
  if(!canReviewPublication(item))publicationDetails(panel,item);
  if(item.issues.length)diagnostics(panel,item.issues);else panel.append(el('p',item.contentState==='changed'?'The current source differs from its published package. Prepare a new revision with a matching package.':'No filter problems detected.','muted'));
  const actions=el('div',undefined,'actions');actions.append(button('History',()=>switchSection('history')));
  if(item.canUpdate){actions.append(button('Update',()=>editor('update',item), 'primary'),button('Unpublish',()=>confirmation(panel,'Unpublish this filter?','This prepares removal from Online discovery. Source, revision history and published package URLs are preserved.',async()=>{state=await api('/api/candidate/unpublish',{id:item.id,confirmed:true});review=null;render();note('Unpublish added to the pending workspace.');}), 'danger'));}
  else if(item.canRepublish)actions.append(button('Republish',()=>editor('republish',item),'primary'));
  else{if(item.canPrepareDraft)actions.append(button('Prepare Draft',()=>editor('add',item),'primary'));if(item.canDeleteDraft)actions.append(button('Delete Draft',()=>confirmation(panel,'Delete this draft?',item.pending?.kind==='add'?'The pending Add and its candidate source/package will be cancelled. Any existing draft source will be removed in the prepared change set.':'Only this never-published source will be removed in the prepared change set.',async()=>{state=await api('/api/candidate/delete-draft',{id:item.id,confirmed:true});review=null;render();}),'danger'));}
  panel.append(actions);technical(panel,'Filter definition',item.document);technical(panel,'Publication Details',{id:item.id,localRegistryDate:item.publishedAt,nextRevision:item.nextRevision,publication:item.publication,git:state.gitPublication,online:state.online});
}
function publicationDetails(panel,item){
  const progress=item.publication;
  panel.append(el('h2','Publication'));
  const rows=el('dl');
  for(const [label,value] of [
    ['Local candidate',progress.localCandidate?'Ready in workspace':item.contentState==='draft'?'Draft source':'No pending candidate'],
    ['Local commit',progress.localCommit?'Revision recorded locally':'Not prepared'],
    ['Remote main',progress.remoteMain?'Expected state present (local refs)':state.gitPublication?.mainSha?'Expected state not confirmed (local refs)':'Unknown — no origin/main ref'],
    ['Online catalogue',state.online.state==='unknown'?'Online status unknown':progress.onlineRevision?`Published Online · r${progress.onlineRevision}`:'Filter not in the deployed catalogue']
  ]){const cell=el('dd');if(label==='Online catalogue'&&(state.online.state==='unknown'||progress.onlineRevision))cell.append(statusBadge(value,state.online.state==='unknown'?'Online Status Unknown':'Published Online'));else cell.textContent=value;rows.append(el('dt',label),cell);}
  panel.append(rows);
  if(canReviewPublication(item)){
    panel.append(el('h3','Next step'),el('p','This filter is in the publication workspace and is ready for validation and review.'),button('Review & Publish',()=>openPublicationWorkspace(item.id),'primary'));
  }
  if(progress.pr)renderPr(panel,progress.pr,progress.onlineConfirmed);
  if(progress.deploymentState==='deployment-failed')panel.append(el('p','Deployment failed. Check GitHub Actions.','issue'));
  if(item.status==='Prepared Locally')panel.append(el('p','This revision is recorded in a local commit. It has not yet been confirmed in the Online Library.','muted'));
  if(state.online.error)panel.append(el('p',state.online.error,'muted'));
  if(state.gitPublication?.error)panel.append(el('p',state.gitPublication.error,'muted'));
  if(progress.expectedRevision&&progress.onlineRevision&&progress.expectedRevision!==progress.onlineRevision)panel.append(el('p',`r${progress.onlineRevision} is Published Online; r${progress.expectedRevision} is awaiting publication.`,'muted'));
  if(state.online.checkedAt)panel.append(el('p',`Online status checked: ${state.online.checkedAt}`,'muted'));
}
function confirmation(parent,title,message,action){
  const existing=parent.querySelector('.confirmation');if(existing)existing.remove();const panel=el('section',undefined,'confirmation');panel.append(el('h2',title),el('p',message));const actions=el('div',undefined,'actions');actions.append(button('Confirm',action,'primary'),button('Cancel',()=>panel.remove()));panel.append(actions);parent.append(panel);panel.querySelector('button').focus();
}
async function bytesBase64(file,limit){if(!file)return undefined;if(file.size>limit)throw new Error(`${file.name} exceeds the ${limit/1024/1024} MiB limit.`);const bytes=new Uint8Array(await file.arrayBuffer());let binary='';for(let i=0;i<bytes.length;i+=8192)binary+=String.fromCharCode(...bytes.subarray(i,i+8192));return btoa(binary);}
function changesTable(changes){
  const table=el('table'),head=el('thead'),row=el('tr');for(const title of ['Change','Previous','Candidate'])row.append(el('th',title));head.append(row);table.append(head);const body=el('tbody');
  for(const change of changes){const tr=el('tr');tr.append(el('td',change.field));for(const value of [change.before,change.after])tr.append(el('td',value===null||value===undefined?'—':typeof value==='string'?value:JSON.stringify(value), 'changed-value'));body.append(tr);}table.append(body);return table;
}
function editor(kind,item){
  switchSection('library');const panel=$('details');panel.replaceChildren();panel.append(el('h1',kind==='add'?'Add Filter':kind==='update'?`Update ${item.name}`:`Republish ${item.name}`),el('p','Supply an approved 512 × 512 portable PNG. Native JSON is optional when the PNG contains the complete filter definition.','muted'));
  const form=el('form',undefined,'upload');const source=el('input');source.type='file';source.accept='.json,application/json';source.id='candidate-source';const sourceLabel=el('label','Native Filter FabJS JSON (optional)');sourceLabel.htmlFor=source.id;sourceLabel.append(source);
  const pkg=el('input');pkg.type='file';pkg.accept='.png,image/png';pkg.required=true;pkg.id='candidate-package';const packageLabel=el('label','Approved portable PNG (required)');packageLabel.htmlFor=pkg.id;packageLabel.append(pkg);const inspect=el('button','Inspect Candidate','primary');inspect.type='submit';form.append(sourceLabel,packageLabel,inspect);form.addEventListener('submit',event=>{event.preventDefault();run(async()=>{
    const result=await api('/api/candidate/inspect',{kind,...(item?{id:item.id}:{}),sourceBase64:await bytesBase64(source.files[0],256*1024),packageBase64:await bytesBase64(pkg.files[0],8*1024*1024)});
    let candidate=panel.querySelector('#candidate-review');if(candidate)candidate.remove();candidate=el('section');candidate.id='candidate-review';const preview=image(result.preview,`${result.name} candidate preview`);candidate.append(el('h2',result.name),el('p',`Revision ${result.currentRevision?`${result.currentRevision} → `:''}${result.revision}`),preview);for(const check of result.checks)candidate.append(el('p',`✓ ${check}`));if(result.changes.length)candidate.append(changesTable(result.changes));
    const approval=el('label',undefined,'check'),checkbox=el('input');checkbox.type='checkbox';checkbox.disabled=true;preview.addEventListener('load',()=>{checkbox.disabled=preview.naturalWidth!==512||preview.naturalHeight!==512;});preview.addEventListener('error',()=>{note('The candidate preview could not be decoded. Supply a working portable PNG before visual approval.',true);});approval.append(checkbox,document.createTextNode('Visual preview reviewed — I approve this package for publication.'));const accept=button('Add to Pending Publication',async()=>{state=await api('/api/candidate/accept',{token:result.token,approved:checkbox.checked});review=null;render();note(`${result.name} is ready in the pending publication workspace.`);},'primary');accept.disabled=true;checkbox.addEventListener('change',()=>{accept.disabled=!checkbox.checked;});
    source.addEventListener('change',()=>{accept.disabled=true;candidate.remove();},{once:true});pkg.addEventListener('change',()=>{accept.disabled=true;candidate.remove();},{once:true});candidate.append(approval,accept);panel.append(candidate);
  });});panel.append(form,button('Back to Filter',renderDetails));pkg.focus();
}
async function renderHistory(){
  const panel=$('history-panel'),item=state.filters.find(filter=>filter.id===selected);panel.replaceChildren(el('h1',item?`${item.name} · History`:'Filter history'));if(!item){panel.append(el('p','Choose a filter in Library to inspect its history.'));return;}
  const history=await api(`/api/filters/${encodeURIComponent(item.id)}/history`);if(!history.length)panel.append(el('p',item.hasHistory?'Retained revision packages are missing. Restore the original historical files before publication.':'No retained packages. No registry history was found for this filter.','muted'));
  for(const revision of history){const row=el('article',undefined,'history-row');row.append(el('h2',`r${revision.revision}${revision.current?' · Current':''}`),el('p',revision.publishedAt?`Registry date: ${revision.publishedAt}`:'Registry date unavailable','muted'),el('p',`${revision.file} · ${revision.size??'?'} bytes · ${revision.valid?'Valid package':'Invalid package'}`),image(revision.preview,`${item.name} revision ${revision.revision}`));if(revision.error)diagnostics(row,[revision.error]);technical(row,'Embedded metadata and Git information',{metadata:revision.metadata,committedAt:revision.committedAt});panel.append(row);}
}
function renderPr(panel,pr,onlineConfirmed=false){
  const summary=el('p','Pull Request #'+pr.number+' · ');summary.append(statusBadge(pr.state,pr.state,'pr'),document.createTextNode(' · Checks: '),statusBadge(pr.checks,pr.checks,'checks'));panel.append(summary);
  if(pr.checks==='Failed')panel.append(el('p',pr.state==='OPEN'?'Checks Failed. Do not merge this pull request until validation passes.':'Checks Failed. Check GitHub Actions.','issue'));
  if(pr.deployment){const deployment=el('p','Pages deployment: ');deployment.append(statusBadge(pr.deployment.state,pr.deployment.state,'deployment'));panel.append(deployment);}
  if(pr.publicationError&&!onlineConfirmed)panel.append(el('p',pr.publicationError,'issue'));
  if(pr.state==='MERGED'&&pr.publicationValid===false&&!onlineConfirmed)panel.append(el('p','Repair the Online Library catalogue version and redeploy. See the manual repair procedure in docs/LIBRARY_MANAGER.md.','issue'));
  if(pr.checksError)panel.append(el('p',pr.checksError,'muted'));
  if(pr.mergeStateStatus)panel.append(el('p','Merge status: '+pr.mergeStateStatus,'muted'));
  // Defence in depth: the backend already binds this URL to repo and PR number.
  if(pr.url==='https://github.com/anthonychimming/filter-fabjs-library/pull/'+pr.number){const link=el('a','Open Pull Request');link.href=pr.url;link.target='_blank';link.rel='noopener noreferrer';panel.append(link);}
}
function renderRemotePublication(panel){
  const remote=state.remotePublication;
  if(!remote)return;
  panel.append(el('h2','GitHub Publication Readiness'));
  const rows=el('dl');
  for(const [label,value] of [
    ['Git',remote.git?'Available':'Unavailable'],
    ['Git remote',remote.remote?'✓ origin · '+remote.remote.repository:'Unavailable or unsupported'],
    ['Git push authentication',remote.pushed?'✓ Verified by confirmed push':'Verified when pushed; uses Git credentials'],
    ['GitHub API authentication',remote.github?'✓ '+remote.github.login:remote.apiAuthenticated?'Authenticated; repository access unconfirmed':remote.apiAvailable===false?'Set FILTER_FABJS_GITHUB_TOKEN and restart':'Not confirmed'],
    ['Pull request access',remote.github?.pullRequestAccess||'Not confirmed'],
    ['Prepared branch',remote.prepared?.branch||'No recorded preparation'],
    ['Prepared commit',remote.prepared?.commit||'Not prepared'],
    ['Working tree',state.dirty.length?'Changes require review':'✓ clean'],
    ['Remote',remote.pushed?'✓ Branch pushed':remote.remoteKnown?'Not pushed':'Unknown'],
    ['Pull Request',remote.pr?'#'+remote.pr.number+' · '+remote.pr.state:remote.pushed?'Pushed · PR not created or unavailable':'Not created']
  ]){const cell=el('dd');if(label==='Pull Request'&&remote.pr)cell.append(statusBadge(value,remote.pr.state,'pr'));else if(label==='Pull Request'&&remote.pushed)cell.append(statusBadge(value,'Pushed'));else cell.textContent=value;rows.append(el('dt',label),cell);}
  panel.append(rows);
  panel.append(el('p','The publication is not online until the pull request is merged and GitHub Pages deploys the validated catalogue. Merge remains manual.','muted'));
  if(remote.error)panel.append(el('p',remote.error.message,'issue'));
  if(remote.pr)renderPr(panel,remote.pr,remote.prepared?.changes.every(change=>state.filters.find(item=>item.id===change.id)?.publication.onlineConfirmed));
  if(remote.preview){panel.append(el('h3','Pull request preview'),el('p',remote.preview.title),el('p','Target: '+remote.preview.repository+' · Base: '+remote.preview.base+' · Head: '+remote.preview.head));const changes=el('ul');for(const change of remote.prepared.changes)changes.append(el('li',change.kind+' · '+change.id+(change.revision?' · r'+change.revision:'')));panel.append(changes);technical(panel,'Pull request body',remote.preview.body);}
  if(remote.prepared&&!remote.pr&&remote.ready){
    const prepared=remote.prepared;
    panel.append(button(remote.pushed?'Retry Create Pull Request':'Push & Create Pull Request',()=>confirmation(panel,'Push publication and create pull request?','This will push '+prepared.branch+' to origin and create a pull request into main in '+remote.preview.repository+'. It will not merge the pull request.',async()=>{
      state=await api('/api/publication/push-and-create-pr',{confirmed:true,branch:prepared.branch,commit:prepared.commit});render();note(state.remoteError?.message||'Remote publication reconciled. Review the pull request on GitHub; merge remains manual.',!!state.remoteError);
    }),'primary'));
  }
}
function renderPublish(){
  const panel=$('publish-panel');const heading=el('h1','Publication workspace');heading.tabIndex=-1;panel.replaceChildren(heading,el('p','Review filter changes, validate the complete batch, then prepare a local branch and commit. GitHub CI and Pages remain the publication gate.','muted'));
  if(state.lastPublication){panel.append(el('h2','Publication prepared locally'),el('p','Prepare Publication created a local branch and commit. It does not publish to GitHub or the Online Library.'),el('p','Continue with the GitHub publication controls below. Online publication remains unconfirmed until the deployed catalogue shows the expected revision.'));technical(panel,'Prepared branch and commit',state.lastPublication);}
  renderRemotePublication(panel);
  panel.append(el('p','Workspace count includes pending local changes awaiting preparation. Prepared commits are tracked separately below.','muted'));
  if(state.online.error)panel.append(el('p',state.online.error,'muted'));
  if(state.gitPublication?.error)panel.append(el('p',state.gitPublication.error,'muted'));
  panel.append(el('p',state.gitPublication?.refsFreshness||'Remote Git state unavailable.','muted'));
  for(const item of state.filters.filter(item=>!item.pending&&['prepared-local','pushed-branch','merged-main'].includes(item.publication.gitState)&&!item.publication.onlineConfirmed)){const progress=el('article',undefined,'history-row');progress.append(el('h2',item.name),filterStatusBadge(item));publicationDetails(progress,item);panel.append(progress);}
  if(state.recovery){panel.append(el('p','Interrupted preparation detected. Discard restores only manager-created files when they have not been changed externally. Committed history is never reverted.','issue'));}
  if(state.dirty.length)technical(panel,'Existing Git changes',state.dirty);
  if(state.health.errors.length)diagnostics(panel,state.health.errors);
  for(const warning of state.health.warnings||[])panel.append(el('p',warning.message,'muted'));
  if(!state.pending.length)panel.append(el('p','No pending filter changes.','muted'));
  for(const item of state.pending){const row=el('article',undefined,'history-row');row.dataset.filterId=item.id;row.tabIndex=-1;const heading=el('h2',`${({add:'Add',update:'Revise',republish:'Republish',unpublish:'Unpublish','delete-draft':'Delete Draft'})[item.kind]} · ${item.name}${item.revision?` · r${item.revision}`:''}`);heading.id='publication-pending-'+item.id;row.setAttribute('aria-labelledby',heading.id);row.append(heading);const filter=state.filters.find(filter=>filter.id===item.id);if(filter)row.append(filterStatusBadge(filter));if(item.revision)row.append(image(`/api/candidate/${encodeURIComponent(item.id)}/preview`,`${item.name} approved candidate`));if(item.changes?.length)row.append(changesTable(item.changes));panel.append(row);}
  const actions=el('div',undefined,'actions');actions.append(button('Validate Publication',async()=>{const result=await api('/api/validate',{});if(!result.valid){review=null;renderPublish();diagnostics(panel,result.errors);note('Publication validation failed.',true);return;}review=result.review;renderPublish();note(review?'✓ Publication valid. Review the diff and confirm preparation.':'✓ Library validation passed.');},'primary'));
  if(state.pending.length||state.recovery)actions.append(button('Discard Publication Changes',()=>confirmation(panel,'Discard pending changes?','Manager-created candidates will be removed. Unrelated user files and committed history are preserved.',async()=>{state=await api('/api/candidate/discard',{confirmed:true});review=null;render();note('Manager-created pending changes discarded.');}),'danger'));panel.append(actions);
  if(review){panel.append(el('h2','Publication review'));const files=el('ul');for(const file of review.files)files.append(el('li',`${file.action}: ${file.path}`));panel.append(files,el('p',`${review.historicalFilesRetained} historical package(s) retained.`));technical(panel,'Exact candidate Git diff',review.diff);technical(panel,'Publication details',{libraryVersion:review.libraryVersion,publishedAt:review.date,baseSha:review.baseSha,files:review.files});
    const approval=el('label',undefined,'check'),check=el('input');check.type='checkbox';approval.append(check,document.createTextNode('I reviewed these changes and approve creating a publication branch and commit.'));const prepare=button('Prepare Publication',async()=>{state=await api('/api/prepare-publication',{token:review.token,confirmed:check.checked});review=null;render();note(`✓ Publication prepared locally on ${state.lastPublication.branch}. This does not publish online. Review the GitHub publication controls below.`);},'primary');prepare.disabled=true;check.addEventListener('change',()=>{prepare.disabled=!check.checked;});panel.append(approval,prepare);
  }
  panel.append(button('Inspect Working Tree Diff',async()=>{const result=await api('/api/diff');technical(panel,'Working tree Git diff',result.workingTree||'No tracked working tree differences.');}));
}
$('search').addEventListener('input',renderList);$('status').addEventListener('change',renderList);$('sort').addEventListener('change',renderList);
$('refresh').addEventListener('click',()=>run(async()=>{state=await api('/api/refresh',{});review=null;render();if(!state.stale&&!state.dirty.length&&!state.recovery)note('Library refreshed.');}));
$('add').addEventListener('click',()=>editor('add'));for(const name of ['library','history','publish'])$(`${name}-tab`).addEventListener('click',()=>run(()=>name==='publish'?openPublicationWorkspace():switchSection(name)));$('review-button').addEventListener('click',()=>run(()=>openPublicationWorkspace()));
await run(async()=>{token=(await api('/api/session')).token;state=await api('/api/library');render();});
