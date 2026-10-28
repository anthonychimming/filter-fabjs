import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

if(process.platform!=='win32'){
  console.log('Library Manager Windows launcher smoke: skipped on this platform.');
}else{
  const fixture=fs.mkdtempSync(path.join(os.tmpdir(),'filter-fab-launcher-'));
  try{
    const home=path.join(fixture,'profile with spaces');
    const app=path.join(home,'OneDrive/Documents/ChatGPT/filter-fabjs');
    const desktop=path.join(home,'Desktop');
    fs.mkdirSync(path.join(app,'tools/library-manager'),{recursive:true});
    fs.mkdirSync(desktop,{recursive:true});
    fs.writeFileSync(path.join(app,'tools/library-manager/server.mjs'),"console.log('LAUNCH_CHECK '+JSON.stringify({cwd:process.cwd(),args:process.argv.slice(2)}));");
    const launcher=fs.readFileSync(new URL('../start-library-manager.bat',import.meta.url));
    for(const folder of [app,desktop])fs.writeFileSync(path.join(folder,'start-library-manager.bat'),launcher);
    function run(folder,override,args=''){
      const env={...process.env,USERPROFILE:home};
      delete env.FILTER_FABJS_APP_ROOT;
      if(override)env.FILTER_FABJS_APP_ROOT=override;
      const result=spawnSync('cmd.exe',['/d','/c',`call "${path.join(folder,'start-library-manager.bat')}" ${args}`],{windowsVerbatimArguments:true,cwd:fixture,env,input:'\r\n',encoding:'utf8',timeout:15000});
      assert.ifError(result.error);
      return result;
    }
    for(const folder of [app,desktop]){
      const result=run(folder);
      assert.equal(result.status,0,result.stderr+' '+result.stdout);
      const launched=JSON.parse(result.stdout.match(/LAUNCH_CHECK (.+)/)[1]);
      assert.equal(launched.cwd,app,'both launch locations must use the app checkout');
      assert.deepEqual(launched.args,['--library-root','..\\filter-fabjs-library']);
    }
    const custom=run(desktop,app,'--library-root "C:\\custom library" --port 8092');
    assert.equal(custom.status,0,custom.stderr+' '+custom.stdout);
    assert.deepEqual(JSON.parse(custom.stdout.match(/LAUNCH_CHECK (.+)/)[1]).args,['--library-root','C:\\custom library','--port','8092']);
    const missing=run(desktop,path.join(fixture,'missing app'));
    assert.equal(missing.status,1);
    assert.match(missing.stdout,/Cannot find the ChromaMeld RGBA app checkout/);
    assert.doesNotMatch(missing.stdout,/Starting ChromaMeld RGBA Library Manager/);
    console.log('Library Manager Windows launcher: app folder, Desktop fallback, override, spaced paths, options and missing checkout pass.');
  }finally{
    fs.rmSync(fixture,{recursive:true,force:true});
  }
}
