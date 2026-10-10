import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { problem, relativePath, REGISTRY_LIMIT } from './repository.mjs';
import { FILTER_FILE_MAX_BYTES, normalizeFilterText } from '../../../src/io/filter-format.js';
import { ONLINE_LIBRARY_PACKAGE_MAX_BYTES } from '../../../src/io/filter-library-package.js';
import { repositoryIdentity } from './github-client.mjs';
import { validateRegistry } from '../../online-library/publish-library.mjs';

const execute=promisify(execFile);
export class GitClient{
  constructor(root){this.root=root;}
  async run(args,{bytes=false,allowedExit=[],timeout=30000,network=false}={}){
    const env={...process.env};delete env.FILTER_FABJS_GITHUB_TOKEN;for(const key of Object.keys(env))if(key.startsWith('GIT_'))delete env[key];
    Object.assign(env,{GIT_TERMINAL_PROMPT:'0',GIT_OPTIONAL_LOCKS:'0',GIT_NO_LAZY_FETCH:'1'});
    if(network)Object.assign(env,{GIT_ASKPASS:'',SSH_ASKPASS:'',GIT_SSH_COMMAND:'ssh -oBatchMode=yes -oStrictHostKeyChecking=yes'});
    try{const result=await execute('git',['-c',`safe.directory=${this.root.replaceAll('\\','/')}`,'-c','core.hooksPath=/dev/null','-c','core.fsmonitor=false','-c','commit.gpgsign=false','-C',this.root,...args],{encoding:bytes?'buffer':'utf8',maxBuffer:32*1024*1024,timeout,windowsHide:true,env});return result.stdout;}
    catch(error){if(allowedExit.includes(error.code))return error.stdout;if(network){const text=String(error.stderr||'');const auth=/authentication|permission denied|could not read Username|access denied|403/i.test(text);throw problem(error.killed?'GIT_TIMEOUT':auth?'GIT_AUTH_REQUIRED':'GIT_REMOTE_FAILED',error.killed?'Git network operation timed out. Refresh or retry to reconcile remote state.':auth?'Git authentication or repository permission is unavailable. Configure GitHub authentication for this repository, then retry. No local publication changes were lost.':'Git could not contact or update the official library remote. Check network access and repository permissions, then retry. No local publication changes were lost.');}throw problem('GIT_FAILED',`Git ${args[0]} failed: ${String(error.stderr||error.message).trim()}`);}
  }
  async status(){
    const rows=(await this.run(['status','--porcelain=v1','-z','--untracked-files=all'])).split('\0').filter(Boolean),result=[];
    for(let i=0;i<rows.length;i++){const row=rows[i];result.push({status:row.slice(0,2),path:row.slice(3)});if(/[RC]/.test(row.slice(0,2)))result.at(-1).originalPath=rows[++i];}
    return result;
  }
  async head(){return(await this.run(['rev-parse','--verify','HEAD'])).trim();}
  async branch(){return(await this.run(['symbolic-ref','--quiet','--short','HEAD'],{allowedExit:[1]})).trim()||'(detached)';}
  async resolve(ref){return(await this.run(['rev-parse','--verify','--end-of-options',`${ref}^{commit}`])).trim();}
  async registryAt(commit){
    const object=`${commit}:registry.json`;
    if(Number(await this.run(['cat-file','-s',object]))>REGISTRY_LIMIT)throw problem('FILE_TOO_LARGE','Git registry exceeds its byte limit.');
    const bytes=await this.run(['show',object],{bytes:true});
    return validateRegistry(JSON.parse(normalizeFilterText(new TextDecoder('utf-8',{fatal:true}).decode(bytes))));
  }
  async publicationProgress(head,branch){
    const result={head,branch,upstream:null,mainSha:null,upstreamSha:null,headOnMain:false,headOnUpstream:false,localRegistry:null,mainRegistry:null,upstreamRegistry:null,refsFreshness:'Remote state based on local refs; no automatic fetch.',error:null};
    const failures=[];
    // Each observation is independent. A missing upstream is ordinary local
    // preparation; a malformed remote registry cannot hide local inspection.
    const observe=async(work)=>{try{await work();}catch(error){failures.push(error.message);}};
    await observe(async()=>{result.localRegistry=await this.registryAt(head);});
    await observe(async()=>{
      result.mainSha=(await this.run(['rev-parse','--verify','--quiet','--end-of-options','refs/remotes/origin/main^{commit}'],{allowedExit:[1]})).trim()||null;
      if(result.mainSha){result.mainRegistry=await this.registryAt(result.mainSha);result.headOnMain=Number(await this.run(['rev-list','--count',`${result.mainSha}..${head}`]))===0;}
    });
    await observe(async()=>{
      result.upstream=(await this.run(['rev-parse','--symbolic-full-name','@{upstream}'],{allowedExit:[128]})).trim()||null;
      if(result.upstream?.startsWith('refs/remotes/')){result.upstreamSha=await this.resolve(result.upstream);result.upstreamRegistry=await this.registryAt(result.upstreamSha);result.headOnUpstream=Number(await this.run(['rev-list','--count',`${result.upstreamSha}..${head}`]))===0;}
    });
    if(failures.length)result.error=`Could not inspect all Git publication refs. Showing available local repository status. ${failures.join(' ')}`;
    return result;
  }
  async ensureClean(){const status=await this.status();if(status.length)throw problem('DIRTY_REPOSITORY','The library has existing changes. Commit or move them before preparing manager changes. Browsing remains available.',{details:status});}
  async exportBase(ref,target){
    const commit=await this.resolve(ref);await fs.mkdir(path.join(target,'source'),{recursive:true});await fs.mkdir(path.join(target,'filters'),{recursive:true});
    const rows=(await this.run(['ls-tree','-r','-z',commit])).split('\0').filter(Boolean);
    for(const row of rows){const [info,file]=row.split('\t');if(file!== 'registry.json'&&!file.startsWith('source/')&&!file.startsWith('filters/'))continue;if(file.endsWith('/.gitkeep'))continue;relativePath(file);const [mode,type,sha]=info.split(' ');if(!['100644','100755'].includes(mode)||type!=='blob')throw problem('UNSAFE_PATH',`Publication base contains a non-regular file: ${file}`);
      const limit=file==='registry.json'?REGISTRY_LIMIT:file.startsWith('source/')?FILTER_FILE_MAX_BYTES:ONLINE_LIBRARY_PACKAGE_MAX_BYTES;
      if(Number(await this.run(['cat-file','-s',sha]))>limit)throw problem('FILE_TOO_LARGE',`Publication base exceeds limit: ${file}`);
      await fs.writeFile(path.join(target,file),await this.run(['cat-file','blob',sha],{bytes:true}),{flag:'wx'});
    }return commit;
  }
  async diff(){return this.run(['diff','--no-ext-diff','--no-textconv','HEAD','--','registry.json','source','filters']);}
  async assertAttributes(files){
    const attributes=(await this.run(['check-attr','-z','filter','working-tree-encoding','--',...files])).split('\0');
    for(let i=0;i+2<attributes.length;i+=3)if(!['unspecified','unset'].includes(attributes[i+2]))throw problem('UNSAFE_GIT_ATTRIBUTE',`Refusing Git conversion for ${attributes[i]} (${attributes[i+1]}).`);
  }
  async publicationBranch(date){
    const prefix=`library/publish-${date}`;let branch=prefix;
    const names=new Set((await this.run(['for-each-ref','--format=%(refname:short)','refs/heads/'])).trim().split('\n'));
    for(let suffix=2;names.has(branch);suffix++)branch=`${prefix}-${suffix}`;
    await this.run(['switch','-c',branch]);return branch;
  }
  async stage(files){await this.run(['add','--',...files]);const staged=(await this.run(['diff','--cached','--name-only','-z'])).split('\0').filter(Boolean);if(staged.some(file=>!files.includes(file))||files.some(file=>!staged.includes(file)))throw problem('STAGING_MISMATCH','Staged files differ from the reviewed publication.');}
  async stagedBytes(file){return this.run(['show',`:${file}`],{bytes:true});}
  async commit(count,record){
    const directory=await fs.mkdtemp(path.join(os.tmpdir(),'filter-fab-commit-'));
    try{const file=path.join(directory,'message.txt'),message='Publish '+count+' online library change'+(count===1?'':'s')+(record?'\n\nFilter-FabJS-Prepared: '+Buffer.from(JSON.stringify(record)).toString('base64'):'');await fs.writeFile(file,message);await this.run(['commit','--file',file]);return this.head();}
    finally{await fs.rm(directory,{recursive:true,force:true});}
  }

  async publicationRemote(){
    const rewrites=await this.run(['config','--get-regexp','^url\\..*\\.(insteadof|pushinsteadof)$'],{allowedExit:[1]});
    if(rewrites.trim())throw problem('REMOTE_REJECTED','Automatic publication requires an origin without URL rewrite rules. Review Git configuration manually.');
    const urls=(await this.run(['remote','get-url','--all','origin'])).trim().split('\n');
    const pushUrls=(await this.run(['remote','get-url','--push','--all','origin'])).trim().split('\n');
    if(urls.length!==1||pushUrls.length!==1)throw problem('REMOTE_REJECTED','Origin must have one unambiguous fetch and push URL.');
    const repository=repositoryIdentity(urls[0]);repositoryIdentity(pushUrls[0]);
    return{repository,url:urls[0],pushUrl:pushUrls[0]};
  }
  async remoteCommit(url,branch){
    const text=(await this.run(['ls-remote','--refs','--',url,'refs/heads/'+branch],{network:true})).trim();
    if(!text)return null;
    const match=/^([a-f0-9]{40,64})\s+([^\s]+)$/.exec(text);
    if(!match||match[2]!=='refs/heads/'+branch)throw problem('REMOTE_REJECTED','Unexpected remote branch response.');
    return match[1];
  }
  async pushPrepared(prepared,remote){
    repositoryIdentity(remote.pushUrl);
    if(!/^library\/publish-\d{4}-\d{2}-\d{2}(?:-[2-9][0-9]*|-[1-9][0-9]+)?$/.test(prepared.branch)||! /^[a-f0-9]{40,64}$/.test(prepared.commit))throw problem('PREPARED_REQUIRED','A recorded publication branch and commit are required.');
    await this.ensureClean();
    if(await this.head()!==prepared.commit||await this.branch()!==prepared.branch)throw problem('STALE_PREPARATION','Publication state changed after preparation. Refresh and review it before continuing.');
    const sha=await this.remoteCommit(remote.pushUrl,prepared.branch);
    if(sha&&sha!==prepared.commit)throw problem('REMOTE_BRANCH_CONFLICT','The remote publication branch does not match the prepared commit. No force push was attempted.');
    if(!sha)await this.run(['-c','push.followTags=false','push','--porcelain','--no-follow-tags','--recurse-submodules=no','--',remote.pushUrl,prepared.commit+':refs/heads/'+prepared.branch],{timeout:120000,network:true});
    if(await this.remoteCommit(remote.pushUrl,prepared.branch)!==prepared.commit)throw problem('REMOTE_BRANCH_CONFLICT','The remote branch could not be confirmed at the prepared commit. Refresh and review it.');
    return{pushed:true};
  }
  async fetchPublicationMain(remote){
    await this.run(['fetch','--no-tags','--no-recurse-submodules','--',remote.url,'refs/heads/main:refs/remotes/origin/main'],{timeout:60000,network:true});
  }

}
