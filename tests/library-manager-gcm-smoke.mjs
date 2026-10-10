import assert from 'node:assert/strict';
import {parseGcmCredential,readGcmCredential,GCM_CREDENTIAL_INPUT,GCM_CREDENTIAL_TIMEOUT_MS} from '../tools/library-manager/lib/github-credential-provider.mjs';

const secret='sentinel_GCM_SECRET_MUST_NOT_LEAK';
const output='protocol=https\nhost=github.com\nusername=anthonychimming\npassword='+secret+'\n';
assert.deepEqual(parseGcmCredential(output),{token:secret,provider:'Git Credential Manager'});
for(const bad of [
  '', 'host=evil.com\nprotocol=https\npassword='+secret,
  'host=github.com\nprotocol=http\npassword='+secret,
  output+'password='+secret+'\n',
  output.replace('password='+secret,'password=bad token'),
  output.replace('username=anthonychimming','username=bad@example.com'),
  output+'badline\n',
  'x'.repeat(8193)
])assert.equal(parseGcmCredential(bad),null);

let launches=0;
const execFileImpl=(command,args,options,done)=>{
  launches++;
  assert.equal(command,'git');assert.deepEqual(args,['credential-manager','get']);
  assert.equal(options.shell,false);assert.equal(options.windowsHide,true);
  assert.equal(options.timeout,GCM_CREDENTIAL_TIMEOUT_MS);
  assert.equal(options.env.GCM_INTERACTIVE,'0');
  assert.equal(options.env.GCM_PROVIDER,'github');
  assert.equal(options.env.GIT_TERMINAL_PROMPT,'0');
  assert.equal(options.env.FILTER_FABJS_GITHUB_TOKEN,undefined);
  assert.equal(options.env.GCM_TRACE_SECRETS,'0');
  return{stdin:{on(event,handler){assert.equal(event,'error');return this;},end(input){assert.equal(input,GCM_CREDENTIAL_INPUT);queueMicrotask(()=>done(null,output,''));}}};
};
const env={FILTER_FABJS_GITHUB_TOKEN:secret,GIT_TRACE:'true',GCM_TRACE_SECRETS:'true'};
const credential=await readGcmCredential({execFileImpl,env});
assert.equal(credential.token,secret);
assert.equal(launches,1);

const unavailable=await readGcmCredential({execFileImpl:(command,args,options,done)=>({stdin:{on(){},end(){queueMicrotask(()=>done(new Error('sensitive failure: '+secret),'','secret: '+secret));}}})});
assert.equal(unavailable,null);
assert.deepEqual(parseGcmCredential('host=github.com\nprotocol=https\npassword=bad_token\n'),{token:'bad_token',provider:'Git Credential Manager'}); // REST verifies permissions.
console.log('GCM protocol parsing, noninteractive subprocess boundaries, missing credentials and redaction passed.');
