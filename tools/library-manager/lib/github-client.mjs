import { problem } from './repository.mjs';
import { readGcmCredential } from './github-credential-provider.mjs';
import { validateRegistry } from '../../online-library/publish-library.mjs';
import { normalizeFilterText } from '../../../src/io/filter-format.js';

const ownErrors=new WeakSet();
function githubProblem(code,message){const error=problem(code,message);ownErrors.add(error);return error;}

export const LIBRARY_REPOSITORY='anthonychimming/filter-fabjs-library';
export function repositoryIdentity(url){
  const match=/^(?:https:\/\/github\.com\/|git@github\.com:)([A-Za-z0-9](?:[A-Za-z0-9-]{0,38}))\/([A-Za-z0-9_.-]{1,100}?)(?:\.git)?$/.exec(url);
  if(!match||match[2]==='.'||match[2]==='..')throw githubProblem('REMOTE_REJECTED','Use a standard HTTPS or SSH GitHub origin for the official library.');
  const identity=match[1]+'/'+match[2];
  if(identity!==LIBRARY_REPOSITORY)throw githubProblem('REPOSITORY_MISMATCH','Automatic publication only targets '+LIBRARY_REPOSITORY+'.');
  return identity;
}
export function pullRequestUrl(url,number){
  if(typeof url!=='string'||url!=='https://github.com/'+LIBRARY_REPOSITORY+'/pull/'+number)throw githubProblem('UNSAFE_PR_URL','GitHub returned an unexpected pull request URL.');
  return url;
}

// Supported until at least March 2028; centralized to preserve this REST contract.
export const GITHUB_API_ORIGIN='https://api.github.com';
export const GITHUB_API_VERSION='2022-11-28';
export const GITHUB_RESPONSE_LIMIT=1024*1024;
const REPO_PATH='/repos/'+LIBRARY_REPOSITORY;
const branchPattern=/^library\/publish-\d{4}-\d{2}-\d{2}(?:-[2-9][0-9]*|-[1-9][0-9]+)?$/;
const shaPattern=/^(?:[a-f0-9]{40}|[a-f0-9]{64})$/;
const invalid=()=>githubProblem('GITHUB_RESPONSE_INVALID','GitHub returned an invalid or unexpected response. Refresh to retry.');
function preparedInput(prepared){if(!prepared||typeof prepared.branch!=='string'||prepared.branch.length>100||!branchPattern.test(prepared.branch)||typeof prepared.commit!=='string'||!shaPattern.test(prepared.commit))throw githubProblem('PREPARED_REQUIRED','A recorded publication branch and exact commit are required.');}
export function checkState(checks){
  if(!Array.isArray(checks)||checks.length>100)return 'Unknown';
  if(!checks.length)return 'Pending';
  const failures=['failure','cancelled','timed_out','action_required','startup_failure','stale'];
  if(checks.some(item=>failures.includes(item?.conclusion)))return 'Failed';
  if(checks.some(item=>['queued','in_progress','waiting','requested','pending'].includes(item?.status)))return 'Pending';
  if(checks.every(item=>item?.status==='completed'&&['success','neutral','skipped'].includes(item.conclusion)))return 'Passed';
  return 'Unknown';
}
export class GitHubClient{
  #fetch;#environment;#verifyRepository;#timeout;#createTimeout;#credentialResolver;#credentialCache;
  constructor(root,{fetchImpl=globalThis.fetch,env=process.env,verifyRepository,credentialResolver=readGcmCredential,timeoutMs=20000,createTimeoutMs=60000}={}){
    this.root=root;this.#fetch=fetchImpl;this.#environment=env;this.#timeout=Math.min(20000,Math.max(1,timeoutMs));this.#createTimeout=Math.min(60000,Math.max(1,createTimeoutMs));
    this.#verifyRepository=verifyRepository||(async()=>{const {GitClient}=await import('./git-client.mjs');return new GitClient(root).publicationRemote();});
    this.available=null;this.authenticated=false;this.authProvider=null;
    this.#credentialResolver=credentialResolver;this.#credentialCache=null;
  }
  async #token(){
    const explicit=this.#environment.FILTER_FABJS_GITHUB_TOKEN;
    // An explicitly supplied token takes precedence. An invalid explicit
    // token must not silently switch to a different GitHub account via GCM.
    if(explicit!==undefined){
      this.available=typeof explicit==='string'&&explicit.length>0;
      if(!/^[A-Za-z0-9_.-]{1,4096}$/.test(explicit||''))throw githubProblem('GITHUB_AUTH_REQUIRED','The configured FILTER_FABJS_GITHUB_TOKEN is invalid. Replace it or unset it to use Git Credential Manager.');
      this.authProvider='Environment variable';return explicit;
    }
    if(this.#credentialCache&&this.#credentialCache.until>Date.now()){
      this.available=true;this.authProvider='Git Credential Manager';
      return this.#credentialCache.token;
    }
    let credential=null;
    try{credential=await this.#credentialResolver();}catch{credential=null;}
    if(!credential||typeof credential.token!=='string'||!/^[A-Za-z0-9_.-]{1,4096}$/.test(credential.token)){
      this.available=false;this.authProvider=null;
      throw githubProblem('GITHUB_AUTH_REQUIRED','No usable GitHub API credential was found. Sign in once using git credential-manager github login, then Refresh; alternatively set FILTER_FABJS_GITHUB_TOKEN and restart the Manager.');
    }
    // Keep only a short-lived private in-process copy to avoid repeated GCM
    // launches across the multiple REST requests in one publication refresh.
    this.#credentialCache={token:credential.token,until:Date.now()+60000};
    this.available=true;this.authProvider='Git Credential Manager';
    return credential.token;
  }
  async #request(endpoint,{method='GET',body,created=false}={}){
    const url=new URL(endpoint,GITHUB_API_ORIGIN);
    const route=url.pathname;
    const sha='(?:[a-f0-9]{40}|[a-f0-9]{64})';
    const allowed=route==='/user'||route===REPO_PATH||route===REPO_PATH+'/pulls'||new RegExp('^'+REPO_PATH+'/pulls/[1-9][0-9]{0,14}$').test(route)||new RegExp('^'+REPO_PATH+'/commits/'+sha+'/check-runs$').test(route)||new RegExp('^'+REPO_PATH+'/compare/'+sha+'\\.\\.\\.'+sha+'$').test(route)||route===REPO_PATH+'/contents/registry.json'||route===REPO_PATH+'/actions/workflows/pages.yml/runs';
    if(url.origin!==GITHUB_API_ORIGIN||url.username||url.password||url.hash||!allowed||!['GET','POST'].includes(method)||method==='POST'&&route!==REPO_PATH+'/pulls')throw githubProblem('GITHUB_ENDPOINT_REJECTED','Unsupported GitHub API intent.');
    if(method==='POST'){const remote=await this.#verifyRepository();repositoryIdentity(remote.url);repositoryIdentity(remote.pushUrl);}
    const token=await this.#token(),controller=new AbortController();
    const payload=body===undefined?undefined:JSON.stringify(body);
    if(payload!==undefined&&Buffer.byteLength(payload)>32768)throw githubProblem('GITHUB_REQUEST_LIMIT','Pull request content exceeds its request limit.');
    let timer;
    const timeout=new Promise((_,reject)=>{timer=setTimeout(()=>{controller.abort();reject(githubProblem('GITHUB_TIMEOUT','GitHub API timed out. A remote change may have succeeded. Refresh or retry to reconcile it.'));},created?this.#createTimeout:this.#timeout);});
    const work=(async()=>{
      let response;
      try{response=await this.#fetch(url.href,{method,headers:{Accept:'application/vnd.github+json',Authorization:'Bearer '+token,'X-GitHub-Api-Version':GITHUB_API_VERSION,'User-Agent':'Filter-FabJS-Library-Manager',...(payload===undefined?{}:{'Content-Type':'application/json'})},...(payload===undefined?{}:{body:payload}),signal:controller.signal,redirect:'error',cache:'no-store',credentials:'omit'});}
      catch{if(controller.signal.aborted)throw githubProblem('GITHUB_TIMEOUT','GitHub API timed out. A remote change may have succeeded. Refresh or retry to reconcile it.');throw githubProblem('GITHUB_NETWORK','GitHub API could not be reached. Local changes are retained. Retry later.');}
      if(response.redirected||response.url&&new URL(response.url).origin!==GITHUB_API_ORIGIN)throw invalid();
      const status=response.status;
      if(!Number.isInteger(status))throw invalid();
      // Never propagate remote messages, headers or raw bodies into errors/UI.
      if(status===401){this.#credentialCache=null;throw githubProblem('GITHUB_AUTH_REQUIRED','GitHub API authentication failed. Reauthenticate with Git Credential Manager and Refresh, or replace FILTER_FABJS_GITHUB_TOKEN and restart the Manager.');}
      if(status===429||status===403&&(response.headers.get('x-ratelimit-remaining')==='0'||response.headers.has('retry-after')))throw githubProblem('GITHUB_RATE_LIMIT','GitHub API rate limit reached. PR status cannot be refreshed now. Local publication state is unchanged. Retry later.');
      if(status===403)throw githubProblem('GITHUB_PERMISSION','GitHub API permission denied. Check the token repository selection and required permissions.');
      if(status===404)throw githubProblem('GITHUB_UNAVAILABLE','GitHub repository or resource is unavailable, or the token lacks access.');
      if(status>=500)throw githubProblem('GITHUB_SERVER','GitHub API is temporarily unavailable. Retry later.');
      if(status!== (created?201:200)&&!(created&&status===422))throw githubProblem('GITHUB_HTTP','GitHub API could not complete this operation. Check access and retry later.');
      if(!/^application\/(?:json|[A-Za-z0-9.+-]+\+json)(?:\s*;|$)/i.test(response.headers.get('content-type')||''))throw invalid();
      const length=response.headers.get('content-length');if(length!==null&&(!/^\d+$/.test(length)||Number(length)>GITHUB_RESPONSE_LIMIT))throw githubProblem('GITHUB_RESPONSE_LIMIT','GitHub API response exceeds its byte limit.');
      const reader=response.body?.getReader();if(!reader)throw invalid();
      const cancel=()=>{reader.cancel().catch(()=>{});};controller.signal.addEventListener('abort',cancel,{once:true});
      const chunks=[];let size=0;
      try{for(;;){const part=await reader.read();if(part.done)break;size+=part.value.byteLength;if(size>GITHUB_RESPONSE_LIMIT){controller.abort();throw githubProblem('GITHUB_RESPONSE_LIMIT','GitHub API response exceeds its byte limit.');}chunks.push(part.value);}}
      finally{controller.signal.removeEventListener('abort',cancel);cancel();}
      let data,text;try{text=new TextDecoder('utf-8',{fatal:true}).decode(Buffer.concat(chunks));if(text.includes(token))throw new Error();data=JSON.parse(text);if(JSON.stringify(data).includes(token))throw new Error();}catch{throw invalid();}
      if(status===422){
        if(!data||typeof data!=='object'||!Array.isArray(data.errors)||data.errors.length>100)throw githubProblem('GITHUB_VALIDATION','GitHub rejected the PR parameters. Refresh to reconcile existing PRs, then review the prepared branch/base.');
        // A duplicate is discovered via lookup; never trust or display error text.
        throw githubProblem('GITHUB_VALIDATION','GitHub rejected PR creation. Refresh to reconcile an existing PR or review the prepared head/base.');
      }
      return data;
    })();
    try{return await Promise.race([work,timeout]);}catch(error){if(ownErrors.has(error))throw error;throw invalid();}finally{clearTimeout(timer);controller.abort();}
  }
  async authenticatedUser(){const user=await this.#request('/user');if(!user||typeof user.login!=='string'||! /^[A-Za-z0-9-]{1,39}$/.test(user.login))throw invalid();return{login:user.login};}
  async repository(){const repo=await this.#request(REPO_PATH);if(repo?.full_name!==LIBRARY_REPOSITORY||repo.default_branch!=='main')throw githubProblem('REPOSITORY_MISMATCH','The API repository must be the official library with main as its default branch.');if(repo.archived===true)throw githubProblem('GITHUB_PERMISSION','The official repository is archived and cannot accept a publication.');return{repository:repo.full_name,base:'main'};}
  async readiness(){
    this.authenticated=false;const user=await this.authenticatedUser();this.authenticated=true;
    const repo=await this.repository();const list=await this.#request(REPO_PATH+'/pulls?state=open&base=main&per_page=1&page=1');if(!Array.isArray(list)||list.length>1)throw invalid();
    return{available:true,authenticated:true,login:user.login,...repo,pullRequestAccess:'Read access verified; write permission checked on creation',provider:this.authProvider};
  }
  #pr(item,prepared){
    preparedInput(prepared);
    if(!item||!Number.isSafeInteger(item.number)||item.number<1||item.number>999999999999999||item.head?.ref!==prepared.branch||item.head?.sha!==prepared.commit||item.head?.repo?.full_name!==LIBRARY_REPOSITORY||item.base?.ref!=='main'||item.base?.repo?.full_name!==LIBRARY_REPOSITORY||!['open','closed'].includes(item.state)||typeof item.draft!=='boolean'||typeof item.title!=='string'||item.title.length>512||!(item.merged_at===null||typeof item.merged_at==='string'&&item.merged_at.length<=40&&!Number.isNaN(Date.parse(item.merged_at)))||item.merged!==undefined&&typeof item.merged!=='boolean')throw githubProblem('PR_MISMATCH','The pull request does not match the exact prepared publication commit and branches.');
    const merged=item.merged===true||item.merged_at!==null;
    return{number:item.number,url:pullRequestUrl(item.html_url,item.number),state:merged?'MERGED':item.state==='open'?'OPEN':'CLOSED',headSha:item.head.sha,mergeCommit:shaPattern.test(item.merge_commit_sha||'')?item.merge_commit_sha:null,isDraft:item.draft,title:item.title,mergeStateStatus:['clean','dirty','blocked','behind','unstable','unknown','has_hooks'].includes(item.mergeable_state)?item.mergeable_state.toUpperCase():'UNKNOWN',checks:'Unknown',checksError:null};
  }
  async #observe(item,prepared){
    let actual=prepared;
    if(item?.head?.sha!==prepared.commit){
      // Validate identity before requesting ancestry for an externally changed head.
      if(!shaPattern.test(item?.head?.sha||''))throw invalid();
      this.#pr(item,{...prepared,commit:item.head.sha});
      const comparison=await this.#request(REPO_PATH+'/compare/'+prepared.commit+'...'+item.head.sha);
      if(!['ahead','identical'].includes(comparison?.status)||comparison.merge_base_commit?.sha!==prepared.commit)throw githubProblem('PR_MISMATCH','Changed PR head does not descend from the reviewed publication.');
      actual={...prepared,commit:item.head.sha};
    }
    const pr=await this.#checks(this.#pr(item,actual),actual);
    pr.headChanged=actual.commit!==prepared.commit;
    if(Number.isSafeInteger(prepared.afterVersion)){
      try{
        const registry=await this.registryAt(actual.commit);
        const matches=prepared.changes.every(change=>change.kind==='delete-draft'||(change.kind==='unpublish'?!registry.filters.some(entry=>entry.id===change.id):registry.filters.some(entry=>entry.id===change.id&&entry.revision===change.revision)));
        pr.publicationValid=registry.libraryVersion===prepared.afterVersion&&matches;
        pr.registryVersion=registry.libraryVersion;
        if(!pr.publicationValid)pr.publicationError='Publication requires repair: remote registry differs from the reviewed publication. Check libraryVersion and filter entries.';
      }catch{pr.publicationValid=null;pr.publicationError='Remote registry verification unavailable. Refresh before publication.';}
    }
    if(pr.state==='MERGED'){
      try{pr.deployment=pr.mergeCommit?await this.deployment(pr.mergeCommit):{state:'Unknown'};}
      catch{pr.deployment={state:'Unknown',error:'Pages status unavailable. Check GitHub Actions.'};}
    }
    return pr;
  }
  async registryAt(commit){
    if(!shaPattern.test(commit))throw invalid();
    const data=await this.#request(REPO_PATH+'/contents/registry.json?ref='+commit);
    if(data?.type!=='file'||data.path!=='registry.json'||data.encoding!=='base64'||!Number.isSafeInteger(data.size)||data.size<1||data.size>700000||typeof data.content!=='string'||data.content.length>1000000)throw invalid();
    const encoded=data.content.replace(/\n/g,'');if(!/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(encoded))throw invalid();
    const bytes=Buffer.from(encoded,'base64');if(bytes.length!==data.size)throw invalid();
    return validateRegistry(JSON.parse(normalizeFilterText(new TextDecoder('utf-8',{fatal:true}).decode(bytes))));
  }
  async deployment(commit){
    if(!shaPattern.test(commit))throw invalid();
    const data=await this.#request(REPO_PATH+'/actions/workflows/pages.yml/runs?branch=main&head_sha='+commit+'&per_page=20&page=1');
    if(!Number.isSafeInteger(data?.total_count)||data.total_count<0||!Array.isArray(data.workflow_runs)||data.workflow_runs.length>20)throw invalid();
    for(const run of data.workflow_runs)if(run.head_sha!==commit||run.head_branch!=='main'||!Number.isSafeInteger(run.id)||typeof run.status!=='string'||!(run.conclusion===null||typeof run.conclusion==='string'))throw invalid();
    const run=[...data.workflow_runs].sort((a,b)=>b.id-a.id)[0];
    return{state:run?checkState([run]):'Pending'};
  }
  async getCheckState(prepared){
    preparedInput(prepared);const data=await this.#request(REPO_PATH+'/commits/'+prepared.commit+'/check-runs?filter=latest&per_page=100&page=1');
    if(!data||!Number.isSafeInteger(data.total_count)||data.total_count<0||!Array.isArray(data.check_runs)||data.check_runs.length>100||data.total_count!==data.check_runs.length)throw invalid();
    for(const item of data.check_runs)if(!item||item.head_sha!==prepared.commit||typeof item.status!=='string'||!(item.conclusion===null||typeof item.conclusion==='string'))throw invalid();
    return checkState(data.check_runs);
  }
  async #checks(pr,prepared){try{pr.checks=await this.getCheckState(prepared);}catch(error){pr.checks='Unknown';pr.checksError=error.code==='GITHUB_RATE_LIMIT'?'Checks unavailable: GitHub API rate limit reached. Retry later.':'Checks unavailable. Check token permissions or network access, then Refresh.';}return pr;}
  async find(prepared){
    preparedInput(prepared);const query=new URLSearchParams({state:'all',head:LIBRARY_REPOSITORY.split('/')[0]+':'+prepared.branch,base:'main',per_page:'100',page:'1'});
    const list=await this.#request(REPO_PATH+'/pulls?'+query);
    if(!Array.isArray(list)||list.length>=100)throw invalid();if(list.length>1)throw githubProblem('PR_AMBIGUOUS','Multiple pull requests exist for this publication branch. Review them on GitHub.');if(!list.length)return null;
    return this.getPullRequest(list[0].number,prepared);
  }
  async getPullRequest(number,prepared){if(!Number.isSafeInteger(number)||number<1||number>999999999999999)throw invalid();const item=await this.#request(REPO_PATH+'/pulls/'+number);if(item?.number!==number)throw invalid();return this.#observe(item,prepared);}
  async create(prepared,preview){
    preparedInput(prepared);if(preview?.repository!==LIBRARY_REPOSITORY||preview.base!=='main'||preview.head!==prepared.branch||typeof preview.title!=='string'||!preview.title.length||preview.title.length>100||typeof preview.body!=='string'||preview.body.length>30000)throw githubProblem('GITHUB_REQUEST_LIMIT','Invalid generated pull request preview.');
    try{const item=await this.#request(REPO_PATH+'/pulls',{method:'POST',created:true,body:{title:preview.title,body:preview.body,head:prepared.branch,base:'main',draft:false}});return this.#checks(this.#pr(item,prepared),prepared);}
    catch(error){if(error.code==='GITHUB_VALIDATION'){const existing=await this.find(prepared);if(existing?.state==='OPEN'||existing?.state==='MERGED')return existing;}throw error;}
  }
}
