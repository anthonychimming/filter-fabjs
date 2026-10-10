import { execFile } from 'node:child_process';
import os from 'node:os';

// Invoke GCM directly, never "git credential fill": the latter runs arbitrary
// user-configured credential helpers and can fall through to terminal prompts.
// Reads an existing github.com credential only. The user performs any first
// interactive sign-in outside the Manager.
export const GCM_CREDENTIAL_INPUT='protocol=https\nhost=github.com\n\n';
export const GCM_CREDENTIAL_TIMEOUT_MS=8000;
const outputLimit=8192;
const tokenPattern=/^[A-Za-z0-9_.-]{1,4096}$/;

export function parseGcmCredential(output){
  if(typeof output!=='string'||Buffer.byteLength(output,'utf8')>outputLimit)return null;
  const attributes=new Map();
  for(const line of output.split(/\r?\n/)){
    if(!line)continue;
    const index=line.indexOf('=');
    if(index<=0)return null;
    const key=line.slice(0,index),value=line.slice(index+1);
    if(attributes.has(key))return null;
    attributes.set(key,value);
  }
  if(attributes.get('protocol')!=='https'||attributes.get('host')!=='github.com')return null;
  const token=attributes.get('password');
  if(!tokenPattern.test(token||''))return null;
  const username=attributes.get('username');
  if(username!==undefined&&!/^[A-Za-z0-9-]{1,39}$/.test(username))return null;
  return{token,provider:'Git Credential Manager'};
}

export async function readGcmCredential({execFileImpl=execFile,env=process.env,cwd=os.homedir()}={}){
  // GCM's noninteractive mode may reuse or silently refresh credentials already
  // in the OS vault; it must never open a login dialog during a status refresh.
  const childEnv={...env,
    GCM_INTERACTIVE:'0',
    GCM_PROVIDER:'github',
    GCM_TRACE:'0',
    GCM_TRACE_SECRETS:'0',
    GIT_TERMINAL_PROMPT:'0',
    GIT_ASKPASS:''
  };
  delete childEnv.FILTER_FABJS_GITHUB_TOKEN;
  for(const key of Object.keys(childEnv)){
    if(key.startsWith('GIT_TRACE')||key.startsWith('GCM_TRACE_')&&key!=='GCM_TRACE_SECRETS')delete childEnv[key];
  }
  return new Promise(resolve=>{
    let finished=false;
    const finish=value=>{if(!finished){finished=true;resolve(value);}};
    try{
      const child=execFileImpl('git',['credential-manager','get'],{
        cwd,env:childEnv,encoding:'utf8',windowsHide:true,
        timeout:GCM_CREDENTIAL_TIMEOUT_MS,maxBuffer:outputLimit,
        shell:false
      },(error,stdout)=>finish(error?null:parseGcmCredential(stdout)));
      if(!child?.stdin){finish(null);return;}
      // Never log stdout, stderr, token values or subprocess exceptions.
      child.stdin.on?.('error',()=>finish(null));
      child.stdin.end(GCM_CREDENTIAL_INPUT);
    }catch{finish(null);}
  });
}
