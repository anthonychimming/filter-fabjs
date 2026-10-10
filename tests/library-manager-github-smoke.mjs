import assert from 'node:assert/strict';
import { GitHubClient, LIBRARY_REPOSITORY, repositoryIdentity, pullRequestUrl, checkState, GITHUB_API_ORIGIN, GITHUB_API_VERSION, GITHUB_RESPONSE_LIMIT } from '../tools/library-manager/lib/github-client.mjs';

const repo=LIBRARY_REPOSITORY,prepared={branch:'library/publish-2026-10-09',commit:'a'.repeat(40)};
const secret='sentinel_PAT_MUST_NEVER_LEAK';
const row={number:17,html_url:'https://github.com/'+repo+'/pull/17',state:'open',draft:false,merged_at:null,head:{ref:prepared.branch,sha:prepared.commit,repo:{full_name:repo}},base:{ref:'main',repo:{full_name:repo}},title:'Publish 1 online library change',mergeable_state:'clean'};
const preview={repository:repo,base:'main',head:prepared.branch,title:row.title,body:'Reviewed summary'};
const remote={url:'https://github.com/'+repo+'.git',pushUrl:'https://github.com/'+repo+'.git'};
const code=value=>error=>error.code===value&&!String(error.stack).includes(secret);
const reply=(data,status=200,headers={})=>new Response(JSON.stringify(data),{status,headers:{'Content-Type':'application/json',...headers}});
for(const url of [remote.url,'https://github.com/'+repo,'git@github.com:'+repo+'.git'])assert.equal(repositoryIdentity(url),repo);
for(const url of ['https://example.com/'+repo,'https://github.com/user/repo.git','https://github.com/'+repo+'?x','https://user:token@github.com/'+repo,'ssh://git@github.com/'+repo,'https://github.com/'+repo+'/'])assert.throws(()=>repositoryIdentity(url));
for(const url of ['javascript:alert(1)','https://github.com.evil/pull/17','https://github.com/other/repo/pull/17','https://github.com/'+repo+'/pull/18'])assert.throws(()=>pullRequestUrl(url,17),code('UNSAFE_PR_URL'));
const calls=[];let rows=[row],detailRow=null,checks=[],failure=null,createMode='success',created=0,wrongRepo=false,descendant=false,pages='failure',remoteRegistry=null;
const fetchImpl=async(url,options)=>{
  const target=new URL(url);assert.equal(target.origin,GITHUB_API_ORIGIN);assert.equal(options.headers.Authorization,'Bearer '+secret);assert.equal(options.headers['X-GitHub-Api-Version'],GITHUB_API_VERSION);assert.equal(options.headers['User-Agent'],'Filter-FabJS-Library-Manager');assert.equal(options.redirect,'error');assert.equal(options.credentials,'omit');assert.equal(options.cache,'no-store');calls.push({path:target.pathname,method:options.method});
  if(failure){if(failure instanceof Error)throw failure;return failure();}
  if(target.pathname==='/user')return reply({login:'maintainer'});
  if(target.pathname==='/repos/'+repo)return reply({full_name:wrongRepo?'other/repo':repo,default_branch:'main'});
  if(target.pathname.includes('/compare/'))return reply({status:descendant?'ahead':'diverged',merge_base_commit:{sha:descendant?prepared.commit:'c'.repeat(40)}});
  if(target.pathname.endsWith('/contents/registry.json')){const bytes=Buffer.from(JSON.stringify(remoteRegistry));return reply({type:'file',path:'registry.json',encoding:'base64',size:bytes.length,content:bytes.toString('base64')});}
  if(target.pathname.endsWith('/actions/workflows/pages.yml/runs'))return reply({total_count:1,workflow_runs:[{id:42,head_sha:'c'.repeat(40),head_branch:'main',status:pages==='pending'?'in_progress':'completed',conclusion:pages==='pending'?null:pages}]});
  if(target.pathname.endsWith('/check-runs')){if(checks==='unavailable')return reply({message:secret},403);return reply({total_count:checks.length,check_runs:checks});}
  if(options.method==='GET'&&target.pathname.endsWith('/pulls/17'))return reply(detailRow||rows[0]);
  if(options.method==='GET'&&target.pathname.endsWith('/pulls')){if(target.searchParams.get('per_page')==='1')return reply([]);assert.equal(target.searchParams.get('head'),'anthonychimming:'+prepared.branch);assert.equal(target.searchParams.get('base'),'main');assert.equal(target.searchParams.get('state'),'all');return typeof rows==='string'?new Response(rows,{headers:{'Content-Type':'application/json'}}):reply(rows);}
  if(options.method==='POST'){
    created++;assert.deepEqual(JSON.parse(options.body),{title:preview.title,body:preview.body,head:prepared.branch,base:'main',draft:false});
    if(createMode==='permission')return reply({message:secret},403);
    if(createMode==='server')return reply({message:secret},503);
    if(createMode==='invalid')return reply({errors:[{field:'head',code:'invalid'}]},422);
    rows=[row];if(createMode==='duplicate')return reply({errors:[{resource:'PullRequest',code:'already_exists'}]},422);
    if(createMode==='timeout')return new Promise(()=>{});
    return reply(row,201);
  }
  assert.fail('Unexpected endpoint');
};
const options={fetchImpl,env:{FILTER_FABJS_GITHUB_TOKEN:secret},verifyRepository:async()=>remote,timeoutMs:50,createTimeoutMs:5};
const client=new GitHubClient('.',options);
const captured=[],originalLog=console.log;console.log=(...values)=>captured.push(values.join(' '));
try{
  assert.equal((await client.readiness()).login,'maintainer');assert.equal(client.authenticated,true);assert.ok(!JSON.stringify(client).includes(secret));
  wrongRepo=true;await assert.rejects(client.readiness(),code('REPOSITORY_MISMATCH'));wrongRepo=false;
  const absent=new GitHubClient('.',{env:{},credentialResolver:async()=>null,fetchImpl:()=>assert.fail('No credential may not call API')});await assert.rejects(absent.readiness(),code('GITHUB_AUTH_REQUIRED'));
   const gcm=new GitHubClient('.',{...options,env:{},credentialResolver:async()=>({token:secret,provider:'Git Credential Manager'})});
   assert.equal((await gcm.readiness()).provider,'Git Credential Manager');
   assert.ok(!JSON.stringify(gcm).includes(secret));
   const explicit=new GitHubClient('.',{...options,credentialResolver:()=>assert.fail('Explicit token must take precedence')});
   assert.equal((await explicit.readiness()).provider,'Environment variable');
   const invalidOverride=new GitHubClient('.',{...options,env:{FILTER_FABJS_GITHUB_TOKEN:'bad\\ntoken'},credentialResolver:()=>assert.fail('Never fall back on malformed override')});
   await assert.rejects(invalidOverride.readiness(),code('GITHUB_AUTH_REQUIRED'));
  const bad=new GitHubClient('.',{...options,env:{FILTER_FABJS_GITHUB_TOKEN:'invalid\n'+secret}});await assert.rejects(bad.readiness(),code('GITHUB_AUTH_REQUIRED'));
  for(const [status,headers,expected] of [[401,{},'GITHUB_AUTH_REQUIRED'],[403,{},'GITHUB_PERMISSION'],[403,{'X-RateLimit-Remaining':'0'},'GITHUB_RATE_LIMIT'],[403,{'Retry-After':'10'},'GITHUB_RATE_LIMIT'],[429,{},'GITHUB_RATE_LIMIT'],[404,{},'GITHUB_UNAVAILABLE'],[500,{},'GITHUB_SERVER']]){failure=()=>reply({message:secret},status,headers);await assert.rejects(client.readiness(),code(expected));}
  failure=new Error('Authorization: Bearer '+secret);await assert.rejects(client.readiness(),code('GITHUB_NETWORK'));
  failure=()=>new Response('bad JSON',{headers:{'Content-Type':'application/json'}});await assert.rejects(client.readiness(),code('GITHUB_RESPONSE_INVALID'));
  failure=()=>new Response('{}',{headers:{'Content-Type':'text/html'}});await assert.rejects(client.readiness(),code('GITHUB_RESPONSE_INVALID'));
  failure=()=>reply({},200,{'Content-Length':String(GITHUB_RESPONSE_LIMIT+1)});await assert.rejects(client.readiness(),code('GITHUB_RESPONSE_LIMIT'));
  failure=()=>new Response('x'.repeat(GITHUB_RESPONSE_LIMIT+1),{headers:{'Content-Type':'application/json'}});await assert.rejects(client.readiness(),code('GITHUB_RESPONSE_LIMIT'));
  failure=()=>new Response(new ReadableStream({start(controller){const error=new Error(secret);error.code='GITHUB_NETWORK';controller.error(error);}}),{headers:{'Content-Type':'application/json'}});await assert.rejects(client.readiness(),code('GITHUB_RESPONSE_INVALID'));
  failure=()=>reply({login:secret});await assert.rejects(client.readiness(),code('GITHUB_RESPONSE_INVALID'));
  failure=()=>{const encoded=JSON.stringify([row]).replace(row.title,Array.from(secret,char=>'\\u'+char.charCodeAt(0).toString(16).padStart(4,'0')).join(''));assert.ok(!encoded.includes(secret));assert.equal(JSON.parse(encoded)[0].title,secret);return new Response(encoded,{headers:{'Content-Type':'application/json'}});};await assert.rejects(client.find(prepared),code('GITHUB_RESPONSE_INVALID'));
  failure=()=>{const response=reply({login:'maintainer'});Object.defineProperty(response,'url',{value:'https://evil.example/path'});return response;};await assert.rejects(client.readiness(),code('GITHUB_RESPONSE_INVALID'));failure=null;
  const hanging=new GitHubClient('.',{...options,timeoutMs:5,fetchImpl:()=>new Promise(()=>{})});await assert.rejects(hanging.readiness(),code('GITHUB_TIMEOUT'));
  const hangingBody=new GitHubClient('.',{...options,timeoutMs:5,fetchImpl:async()=>new Response(new ReadableStream(),{headers:{'Content-Type':'application/json'}})});await assert.rejects(hangingBody.readiness(),code('GITHUB_TIMEOUT'));
  assert.equal((await client.find(prepared)).checks,'Pending');
  for(const [status,conclusion,expected] of [['queued',null,'Pending'],['in_progress',null,'Pending'],['completed','success','Passed'],['completed','failure','Failed'],['completed','cancelled','Failed'],['completed','timed_out','Failed'],['completed','action_required','Failed'],['completed','unknown','Unknown']]){checks=[{head_sha:prepared.commit,status,conclusion}];assert.equal((await client.find(prepared)).checks,expected);}
  checks=[{head_sha:prepared.commit,status:'completed',conclusion:'success'},{head_sha:prepared.commit,status:'in_progress',conclusion:null}];assert.equal((await client.find(prepared)).checks,'Pending');
  checks.push({head_sha:prepared.commit,status:'completed',conclusion:'failure'});assert.equal((await client.find(prepared)).checks,'Failed');
  checks='unavailable';const unavailable=await client.find(prepared);assert.equal(unavailable.state,'OPEN');assert.equal(unavailable.checks,'Unknown');assert.ok(!JSON.stringify(unavailable).includes(secret));checks=[];
  rows=[{...row,state:'closed'}];assert.equal((await client.find(prepared)).state,'CLOSED');rows=[{...row,state:'closed',merged_at:'2026-10-09T16:00:00Z'}];assert.equal((await client.find(prepared)).state,'MERGED');
  rows=[{...row,merged:true}];assert.equal((await client.find(prepared)).state,'MERGED','merged takes precedence over open');
  rows=[row];detailRow={...row,state:'closed',merged:true};assert.equal((await client.find(prepared)).state,'MERGED','detail lookup overrides stale open list');detailRow=null;
  descendant=true;rows=[{...row,state:'closed',merged:true,head:{...row.head,sha:'b'.repeat(40)},merge_commit_sha:'c'.repeat(40)}];checks=[];
  remoteRegistry={schema:'filter-fab-js/library-registry',schemaVersion:1,libraryVersion:3,filters:[{id:'signal-weave',revision:1,publishedAt:'2026-10-09'}]};
  const reviewed={...prepared,beforeVersion:3,afterVersion:4,changes:[{id:'signal-weave',kind:'add',revision:1}]};
  const reconciled=await client.find(reviewed);assert.equal(reconciled.state,'MERGED');assert.equal(reconciled.headChanged,true);assert.equal(reconciled.headSha,'b'.repeat(40));assert.equal(reconciled.publicationValid,false);assert.equal(reconciled.deployment.state,'Failed');
  for(const [conclusion,expected] of [['pending','Pending'],['success','Passed']]){pages=conclusion;assert.equal((await client.find(reviewed)).deployment.state,expected);}
  remoteRegistry.libraryVersion=4;assert.equal((await client.find(reviewed)).publicationValid,true);
  descendant=false;
  for(const bad of [{...row,html_url:'https://evil.test/'},{...row,head:{...row.head,sha:'b'.repeat(40)}},{...row,head:{...row.head,ref:'wrong'}},{...row,head:{...row.head,repo:{full_name:'fork/repo'}}},{...row,base:{...row.base,ref:'other'}},{...row,base:{...row.base,repo:{full_name:'other/repo'}}},{...row,number:0},{...row,draft:'yes'}]){rows=[bad];await assert.rejects(client.find(prepared));}
  rows=Array.from({length:100},()=>row);await assert.rejects(client.find(prepared),code('GITHUB_RESPONSE_INVALID'));
  checks=[{head_sha:'b'.repeat(40),status:'completed',conclusion:'success'}];rows=[row];assert.equal((await client.find(prepared)).checks,'Unknown');checks=[];
  rows='not JSON';await assert.rejects(client.find(prepared),code('GITHUB_RESPONSE_INVALID'));rows=[row,row];await assert.rejects(client.find(prepared),code('PR_AMBIGUOUS'));rows=[];assert.equal(await client.find(prepared),null);
  assert.equal((await client.create(prepared,preview)).number,17);assert.equal((await client.getPullRequest(17,prepared)).number,17);
  createMode='duplicate';assert.equal((await client.create(prepared,preview)).number,17);
  rows=[];createMode='invalid';await assert.rejects(client.create(prepared,preview),code('GITHUB_VALIDATION'));
  createMode='permission';await assert.rejects(client.create(prepared,preview),code('GITHUB_PERMISSION'));createMode='server';await assert.rejects(client.create(prepared,preview),code('GITHUB_SERVER'));
  createMode='timeout';await assert.rejects(client.create(prepared,preview),code('GITHUB_TIMEOUT'));const count=created;assert.equal((await client.find(prepared)).number,17);assert.equal(created,count);
  const changed=new GitHubClient('.',{...options,verifyRepository:async()=>({url:'https://github.com/other/repo.git',pushUrl:remote.url})});await assert.rejects(changed.create(prepared,preview),code('REPOSITORY_MISMATCH'));
  const before=calls.length;await assert.rejects(client.find({branch:'https://evil.test',commit:prepared.commit}),code('PREPARED_REQUIRED'));assert.equal(calls.length,before);
  assert.ok(calls.every(call=>!call.path.includes('/merge')));assert.ok(!captured.join('\n').includes(secret));
  assert.equal(checkState(null),'Unknown');assert.equal(checkState([{status:'completed',conclusion:'neutral'},{status:'completed',conclusion:'skipped'}]),'Passed');
}finally{console.log=originalLog;}
console.log('GitHub REST authentication, bounds, errors, rate limits, secrets, identities, PR lifecycle, checks and timeout recovery passed.');
