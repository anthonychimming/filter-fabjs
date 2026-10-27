import assert from 'node:assert/strict';
import {spawn,execFileSync} from 'node:child_process';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

const delay=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const port=18723;
const output=path.resolve('qa-output/night-circuit');
await fs.mkdir(output,{recursive:true});
let server,chrome,ws,cdp;
const report=[],failures=[];
async function until(fn,label,ms=18000){
  const start=Date.now();
  while(Date.now()-start<ms){
    try{const value=await fn();if(value)return value;}catch{}
    await delay(120);
  }
  throw new Error('Timeout: '+label);
}
function getChrome(){
  for(const name of [process.env.CHROME_BIN,'google-chrome','google-chrome-stable','chromium','chromium-browser'].filter(Boolean)){
    try{return execFileSync('which',[name],{encoding:'utf8'}).trim();}catch{}
  }
  throw new Error('Chrome/Chromium not found');
}
async function boot(){
  server=spawn(process.execPath,['scripts/dev-server.mjs'],{stdio:'ignore',env:{...process.env,PORT:String(port)}});
  await until(async()=>{const response=await fetch('http://127.0.0.1:'+port+'/index.html');return response.ok;},'dev server');
  const dir=await fs.mkdtemp(path.join(os.tmpdir(),'night-circuit-'));
  chrome=spawn(getChrome(),['--headless=new','--no-sandbox','--disable-gpu','--disable-dev-shm-usage','--remote-debugging-port=0','--user-data-dir='+dir,'about:blank'],{stdio:'ignore'});
  const debug=await until(async()=>Number((await fs.readFile(path.join(dir,'DevToolsActivePort'),'utf8')).split('\n')[0]),'Chrome debugger');
  const targets=await(await fetch('http://127.0.0.1:'+debug+'/json/list')).json();
  ws=new WebSocket(targets.find(t=>t.type==='page').webSocketDebuggerUrl);
  await new Promise((resolve,reject)=>{ws.onopen=resolve;ws.onerror=reject;});
  let next=0;const pending=new Map();
  ws.onmessage=event=>{const message=JSON.parse(event.data);if(pending.has(message.id)){pending.get(message.id)(message);pending.delete(message.id);}};
  cdp=async(method,params={})=>{
    const id=++next;
    const result=await Promise.race([new Promise(resolve=>{pending.set(id,resolve);ws.send(JSON.stringify({id,method,params}));}),delay(18000).then(()=>{throw new Error('CDP timeout: '+method);})]);
    if(result.error)throw new Error('CDP '+method+': '+result.error.message);
    return result.result;
  };
  await cdp('Page.enable');
  await cdp('Runtime.enable');
}
async function js(expression){
  const r=await cdp('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});
  if(r.exceptionDetails)throw new Error('Page JS: '+r.exceptionDetails.text);
  return r.result?.value;
}
async function when(expression,label,timeout){return until(()=>js(expression),label,timeout);}
async function click(selector){
  assert.ok(await js('(()=>{const n=document.querySelector('+JSON.stringify(selector)+');if(!n)return false;n.click();return true})()'),'Missing UI element '+selector);
}
async function photo(name){
  const result=await cdp('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});
  await fs.writeFile(path.join(output,name+'.png'),Buffer.from(result.data,'base64'));
}
async function readMetrics(){
  return js('(()=>{const rect=n=>{if(!n)return null;const r=n.getBoundingClientRect();return {left:r.left,top:r.top,right:r.right,bottom:r.bottom,width:r.width,height:r.height};};const d=document;const dialog=d.querySelector("#filterLibraryDialog");const cards=[...d.querySelectorAll(".filter-card")];const results=d.querySelector(".filter-results");return {vw:innerWidth,vh:innerHeight,scrollWidth:d.documentElement.scrollWidth,dialog:rect(dialog),open:!!dialog?.open,resultsWidth:results?.clientWidth,resultsScrollWidth:results?.scrollWidth,cards:cards.slice(0,30).map(c=>({preview:rect(c.querySelector(".filter-card-preview")),action:rect(c.querySelector(".filter-card-actions button"))})),actions:[...d.querySelectorAll(".filter-card-actions button")].slice(0,30).map(b=>({kind:b.dataset.entryAction,label:b.getAttribute("aria-label"),title:b.title,rect:rect(b)})),controls:[...d.querySelectorAll("#sliderGrid .slider-row")].map(rect),snapshots:[...d.querySelectorAll(".snapshot-slots button")].map(rect)};})()');
}
function audit(context,id,m,touch){
  const issues=[];
  if(m.scrollWidth>m.vw+3)issues.push('horizontal page overflow: '+m.scrollWidth+' > '+m.vw);
  if(context==='library'){
    if(!m.open||!m.dialog)issues.push('library failed to open');
    if(!m.cards.length)issues.push('library has no visible cards');
    if(m.dialog && (m.dialog.left< -3||m.dialog.right>m.vw+3||m.dialog.bottom>m.vh+3))issues.push('library drawer outside viewport');
    if(m.resultsScrollWidth>m.resultsWidth+3)issues.push('results horizontal overflow');
    for(const card of m.cards)if(card.preview&&card.action&&card.preview.right>card.action.left+2)issues.push('card preview/action collision');
    for(const a of m.actions){
      if(!a.label||!a.title)issues.push('icon action missing label or tooltip');
      if(a.rect.width<(touch?43:35)||a.rect.height<(touch?43:35))issues.push('icon action under minimum size');
    }
  }
  if(context==='adjusted'&&touch&&m.snapshots.length&&m.snapshots.some(b=>b.height<44))issues.push('snapshot touch target under 44px');
  report.push({id,context,touch,metrics:m,issues:[...new Set(issues)]});
  if(issues.length)failures.push({id,context,issues:[...new Set(issues)]});
  console.log('Layout',id,context,'cards='+m.cards.length,'actions='+m.actions.length,'controls='+m.controls.length,'snapshots='+m.snapshots.length,'overflow='+(m.scrollWidth-m.vw),'issues='+issues.length);
}
async function scenario(width,height,touch){
  const id=width+'x'+height;
  await cdp('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:touch});
  await cdp('Emulation.setTouchEmulationEnabled',{enabled:touch,maxTouchPoints:touch?1:0});
  await cdp('Page.navigate',{url:'http://127.0.0.1:'+port+'/?qa='+id});
  await when('document.readyState==="complete" && !!document.querySelector("#filterLibraryDialog") && !!document.querySelector("#browseFiltersBtn")','page initialization');
  await delay(400);
  await photo(id+'-workspace');
  audit('initial',id,await readMetrics(),touch);
  await click('#browseFiltersBtn');
  await when('!!document.querySelector("#filterLibraryDialog[open]") && document.querySelectorAll(".filter-card").length>0','library results');
  await photo(id+'-library');
  audit('library',id,await readMetrics(),touch);
  await js('(()=>{const q=document.querySelector("#filterLibraryDialog [data-search]");q.value="Brightness / Contrast";q.dispatchEvent(new Event("input",{bubbles:true}));})()');
  await when('!!document.querySelector("#filterLibraryDialog .filter-card-preview")','filtered cards');
  await click('#filterLibraryDialog .filter-card-preview');
  await when('!!document.querySelector("#filterLibraryDialog .filter-card[data-selected=true]") || !!document.querySelector("#filterLibraryDialog [data-error]")?.textContent','preview result',30000);
  if(await js('!document.querySelector("#filterLibraryDialog [data-apply]").disabled')){
    await click('#filterLibraryDialog [data-apply]');
    await when('!document.querySelector("#filterLibraryDialog[open]")','filter applied');
    await delay(200);
    await photo(id+'-adjust-snapshots');
    audit('adjusted',id,await readMetrics(),touch);
  }else{
    failures.push({id,context:'preview',issues:['Filter preview cannot be applied']});
    await click('#filterLibraryDialog [data-cancel]');
    await when('!document.querySelector("#filterLibraryDialog[open]")','cancel');
  }
  await click('#helpBtn');
  await when('!!document.querySelector("#helpDialog[open]")','help dialog');
  await photo(id+'-help-dialog');
  const help=await js('(()=>{const r=document.querySelector("#helpDialog").getBoundingClientRect();return [r.left,r.top,r.right,r.bottom,innerWidth,innerHeight]})()');
  if(help[0]< -3||help[1]< -3||help[2]>help[4]+3||help[3]>help[5]+3)failures.push({id,context:'help',issues:['Help dialog outside viewport']});
  await js('document.querySelector("#helpDialog").close()');
}
try{
  await boot();
  for(const [w,h,touch] of [[1440,900,false],[1024,768,false],[390,844,true],[320,700,true]])await scenario(w,h,touch);
  console.log('Browser viewport QA:',failures.length?'FAIL':'PASS',report.length,'views,',failures.length,'issue groups');
}catch(error){
  console.error('Browser QA failed:',error.stack||error);
  failures.push({context:'infrastructure or interaction',issues:[String(error)]});
  process.exitCode=1;
}finally{
  await fs.writeFile(path.join(output,'layout-report.json'),JSON.stringify({report,failures},null,2));
  if(failures.length){for(const issue of failures)console.error('ISSUE',JSON.stringify(issue));process.exitCode=1;}
  try{ws?.close();}catch{}
  try{chrome?.kill();}catch{}
  try{server?.kill();}catch{}
}
