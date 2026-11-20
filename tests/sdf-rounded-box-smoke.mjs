import assert from 'node:assert/strict';
import {writeFileSync} from 'node:fs';
import { once } from 'node:events';
import { Worker } from 'node:worker_threads';
import { Parser } from '../src/core/formula-language.js';
import { compileFilterProgram } from '../src/core/ir.js';
import { validateNativeFilter,parseAFS } from '../src/io/filter-format.js';
import { routeImageFileWithMetadata,validateFilterForPersistence } from '../src/app/filter-fab-app.js';
import { packageFixtureBytes,packageFixtureDocument,packageFixtureMetadata } from './helpers/online-package-fixture.js';
import { onlineCatalogEntry } from '../src/app/filter-catalog.js';
import { fetchOnlineFilterPackage } from '../src/io/filter-library-package.js';
import { WGSLCompiler,NumericAdmissionError } from '../src/gpu/wgsl-compiler.js';
import { RendererManager } from '../src/renderers/renderer-manager.js';
import { WebGpuRenderer } from '../src/renderers/webgpu-renderer.js';
import { FilterThumbnailService,thumbnailDimensions } from '../src/app/filter-thumbnail-service.js';
import { estimateCpuProgramCost,assertCpuRenderBudget } from '../src/renderers/cpu-renderer.js';
import { workerProgram } from '../src/renderers/cpu-worker-source.js';
import { presets } from '../src/presets/builtins.js';

const compile=(fs,options)=>compileFilterProgram(fs.map(f=>new Parser(f).parse()),options);
const call='sdfRoundedBox(x,y,(X-1)/2,(Y-1)/2,X,Y,val(1,0,512),0)';
const distance='sdfBox(x,y,(X-1)/2,(Y-1)/2,X-2*min(val(1,0,512),min(X,Y)/2),Y-2*min(val(1,0,512),min(X,Y)/2),0)-min(val(1,0,512),min(X,Y)/2)';
const border=presets.find(p=>p.name==='Uniform Rounded Inset Border');
const substituted=border.f.map(f=>{
  assert.equal(f.split(distance).length,3);
  return f.replaceAll(distance,call);
});
const original=compile(border.f),program=compile(substituted);
assert.equal(program.irVersion,1);
const scalar=compile([call,'g','b','a']);
assert.equal(scalar.outputs[0].expression.type,'scalar');
assert.equal(scalar.metadata.stateful,false);
assert.equal(scalar.metadata.deterministic,true);
assert.equal(scalar.metadata.usesSource,false);
assert(scalar.metadata.controlMask[1]);
assert.throws(()=>new Parser(call.replace('Box','box')).parse(),/Unknown function/);
assert.throws(()=>new Parser(call.slice(0,-3)+')').parse(),/expects 8/);
const formulas=['r','g','0?'+call+':b','a'];
const legacyError=/Channel 3: sdfRoundedBox\(\) requires native float mode/;
assert.throws(()=>compile(formulas,{legacyMath:true}),legacyError);
const native={...packageFixtureDocument,formulas};
assert.equal(validateNativeFilter(native).mathMode,'float');
const legacy={...native,mathMode:'legacy'};
assert.throws(()=>validateNativeFilter(legacy),legacyError);
assert.throws(()=>validateNativeFilter({...native,version:1,mathMode:undefined}),legacyError);
assert.throws(()=>parseAFS(['%RGB',...Array(8).fill('0'),formulas.join('\n\n')].join('\n')),legacyError);
assert.equal(validateFilterForPersistence(legacy),null);
const bytes=await packageFixtureBytes(legacy);
const routed=await routeImageFileWithMetadata(new Blob([bytes],{type:'image/png'}),{
  chooseAction:async()=> 'cancel',openImage:assert.fail,importFilter:assert.fail
});
assert.match(routed.metadataError.message,legacyError);
const entry=onlineCatalogEntry(packageFixtureMetadata(),{favorite:false});
await assert.rejects(fetchOnlineFilterPackage(entry,{
  manifestUrl:'https://fixture.test/catalogue.json',fetchImpl:async()=>new Response(bytes)
}),legacyError);

for(const [w,h,oldPass,newPass] of [[1000,1000,true,true],[2000,2000,false,true],[4000,2000,false,false]]){
  for(const [p,pass,cost] of [[original,oldPass,815],[program,newPass,735]]){
    const analysis=WGSLCompiler.analyze(p,{width:w,height:h});
    assert(analysis.compatible);
    const code=WGSLCompiler.compile(p,analysis).code;
    if(process.env.ROUNDED_BOX_SHADER_PATH&&p===program&&w===4000)writeFileSync(process.env.ROUNDED_BOX_SHADER_PATH,code);
    assert.equal(code.split('ff_rounded_box(').length-1,p===original?0:9);
    assert.equal(estimateCpuProgramCost(p),cost);
    if(pass)assert.equal(assertCpuRenderBudget(p,w,h),cost*w*h);
    else assert.throws(()=>assertCpuRenderBudget(p,w,h),/work-unit limit/);
  }
}
const manager=new RendererManager({});
const setSize=(w,h)=>manager.setSource(new Uint8ClampedArray(w*h*4),w,h);
const stockAnalysis=manager.analyze(original);
assert(!manager.analyze(program).compatible);
const direct=new WebGpuRenderer();
const warmPlan={key:WGSLCompiler.key(program),code:'cached',analysis:{compatible:true}};
direct.rememberPipeline(warmPlan,{},0);
for(const [w,h,ok] of [[1,1,true],[1,32768,true],[1,32769,false],[32768,1,true],[32769,1,false],[32768,1,true]]){
  await setSize(w,h);
  const d=manager.diagnose(program);
  assert.equal(d.gpuCompatible,ok);
  direct.width=w;direct.height=h;
  if(ok)assert.equal(direct.planFor(program,null),warmPlan);
  else assert.throws(()=>direct.planFor(program,warmPlan.analysis),NumericAdmissionError);
  await setSize(w,h);
  assert.equal(manager.analyze(compile(substituted)),d.analysis);
  assert.equal(manager.analyze(original),stockAnalysis);
}
for(const v of [128,NaN,Infinity,-Infinity,-1,256,127.5,undefined]){
  const controls=[NaN,v],ok=v===undefined||v===128||v===127.5;
  const d=manager.diagnose(program,'auto',controls);
  assert.equal(d.gpuCompatible,ok);
  if(ok)assert.equal(direct.planFor(program,null,controls),warmPlan);
  else{
    assert.match(d.gpuReason,/argument 7/);
    assert.throws(()=>direct.planFor(program,null,controls),NumericAdmissionError);
  }
}
assert.equal(manager.gpuFailures.size,0);
// Select against a snapshot and keep it through the first asynchronous source sync.
const navigatorDescriptor=Object.getOwnPropertyDescriptor(globalThis,'navigator');
Object.defineProperty(globalThis,'navigator',{configurable:true,value:{gpu:{}}});
try{
  let seen,failAdmission=false;
  const backend=id=>({id,setSource(){},render(args){
    if(id==='webgpu'&&failAdmission)throw new NumericAdmissionError('GPU subset: test rejection');
    seen=args.controls;return {backend:id};
  }});
  const dispatcher=new RendererManager({webgpu:()=>backend('webgpu'),cpu:()=>backend('cpu')});
  await dispatcher.setSource(new Uint8ClampedArray(4),1,1);
  const values=[3,9];
  const pending=dispatcher.renderWithFallback({program,controls:values});
  values[1]=NaN;
  assert.equal((await pending).result.backend,'webgpu');assert.equal(seen[1],9);
  assert.equal((await dispatcher.renderWithFallback({program,controls:values})).result.backend,'cpu');
  values[1]=9;
  assert.equal((await dispatcher.renderWithFallback({program,controls:values})).result.backend,'webgpu');
  failAdmission=true;
  const fallback=await dispatcher.renderWithFallback({program,controls:values});
  assert.equal(fallback.runtimeFallback,false);assert.equal(fallback.gpuError,null);
  assert.equal(fallback.result.backend,'cpu');assert.equal(dispatcher.gpuFailures.size,0);
  const obsolete=dispatcher.renderWithFallback({program});
  await dispatcher.setSource(new Uint8ClampedArray(8),2,1);
  await assert.rejects(obsolete,{name:'RenderCancelledError'});
}finally{Object.defineProperty(globalThis,'navigator',navigatorDescriptor)}
const thumbnailManager=new RendererManager({});
const thumbs=new FilterThumbnailService({rendererManager:thumbnailManager,prepareSource:(_,w,h)=>{
  const size=thumbnailDimensions(w,h);
  return {...size,pixels:new Uint8ClampedArray(size.width*size.height*4)};
}});
await setSize(32769,1);
await thumbs.setSource(manager.source,32769,1);
assert(!manager.analyze(program).compatible);
assert(thumbnailManager.analyze(program).compatible);
for(const [radius,ok] of [['x/(g-b)',false],['clamp(1000000*1000000,0,1)',false],['max(ctl(1),min(X,Y)/2)',true]]){
  const p=compile([call.replace('val(1,0,512)',radius),'0','0','a']);
  const d=WGSLCompiler.analyze(p,{width:800,height:800});
  assert.equal(d.compatible,ok);
  if(!ok)assert.match(d.blockers.join(),/argument 7/);
}
assert.match(WGSLCompiler.analyze(compile([call.replace(',0)',',1025)'),'g','b','a']),{width:4,height:4}).blockers.join(),/argument 8/);
const angleProgram=compile(['angle('+call+',0)','g','b','a']);
assert(WGSLCompiler.compile(angleProgram,WGSLCompiler.analyze(angleProgram,{width:4,height:4})).code.includes('ff_rounded_box('));

// Nearest distance to the two straight segments and the angle-clipped arc.
function oracle(x,y){
  const t=Math.max(0,Math.min(Math.PI/2,Math.atan2(y-20,x-40)));
  const arc=Math.hypot(x-40-10*Math.cos(t),y-20-10*Math.sin(t));
  const side=Math.hypot(x-50,y-Math.min(y,20));
  const top=Math.hypot(x-Math.min(x,40),y-30);
  const inside=x<=50&&y<=30&&(x<=40||y<=20||(x-40)**2+(y-20)**2<=100);
  return Math.min(arc,side,top)*(inside?-1:1);
}
const vectors=[];
function sample(x,y,expected,w=100,h=60,r=10,angle=0){
  vectors.push({args:[x,y,0,0,w,h,r,angle],expected});
}
for(let x=0;x<=60;x++)for(let y=0;y<=40;y++)sample(x,y,oracle(x,y));
for(const [x,y,d] of [[0,0,-30],[50,0,0],[45,0,-5],[53,0,3],[46,28,0],[43,24,-5],[49,32,5],[50,30,Math.sqrt(200)-10],[50-1e-8,0,-1e-8],[50+1e-8,0,1e-8]])sample(x,y,d);
sample(46,28,0,-100,-60,-10);sample(50,0,0,100,60,500);
sample(3,34,5,0,60);sample(0,-20,0,0,60);sample(53,4,5,100,0);
sample(-0,0,0,100,0);sample(-3,4,5,0,0);sample(0,53,3,100,60,10,256);
sample(-53,0,3,100,60,10,512);sample(26*Math.SQRT2,26*Math.SQRT2,2,100,60,10,128);
sample(0,0,-0.125,1e6,.25,9);sample(0,0,-(2**-21),2**-20,2**-20,0);
sample(0,0,-.5,1,1,10);sample(53,0,3,100,60,10,2**100);
sample(1e150,0,1e150,0,0);sample(0,0,-5e299,1e300,1e300,1e300);
sample(53,34,5,100,60,0);sample(50,30,0,100,60,0);
for(const angle of [-768,-256,256,768])sample(0,28,0,100,0,0,angle);
for(const angle of [-512,512])sample(46,28,0,100,60,10,angle);
sample(3000,1000,0.05004779339833476,5945.71044921875,6000,10,1019.75);
for(let i=0;i<8;i++)for(const bad of [NaN,Infinity,-Infinity]){
  const args=[0,0,0,0,100,60,10,0];args[i]=bad;
  vectors.push({args,expected:1e20});
}
vectors.push({args:[1e308,0,-1e308,0,100,60,10,0],expected:1e20});
const worker=new Worker(`
  const {parentPort}=require('node:worker_threads');
  globalThis.postMessage=m=>parentPort.postMessage(m);
  ${workerProgram()}
  parentPort.on('message',m=>{
    if(m.testVectors){
      const values=m.testVectors.map(args=>evFloat({op:'call',fn:'sdfRoundedBox',args:args.map(value=>({op:'const',value}))},environment));
      postMessage({values});return;
    }
    onmessage({data:m});
  });
`,{eval:true});
try{
  worker.postMessage({testVectors:vectors.map(v=>v.args)});
  const [{values}]=await once(worker,'message');
  let maxError=0;
  for(const [i,{expected}] of vectors.entries()){
    const err=Math.abs(values[i]-expected);
    if(i<2501)maxError=Math.max(err,maxError);
    if(expected===1e20)assert.equal(values[i],1e20);
    else assert(err<=2e-13*Math.max(1,Math.abs(expected)),JSON.stringify(vectors[i]));
    if(i>=2501&&expected===0)assert(Object.is(values[i],0));
  }
  const w=61,h=41,pixels=Uint8ClampedArray.from({length:w*h*4},(_,i)=>i*73%256);
  worker.postMessage({type:'init',width:w,height:h,buffer:pixels.buffer});
  await once(worker,'message');
  async function render(p){
    const pending=new Promise((resolve,reject)=>{
      const listen=m=>{if(m.type==='result'){worker.off('message',listen);worker.off('error',reject);resolve(new Uint8ClampedArray(m.buffer))}};
      worker.on('message',listen);worker.once('error',reject);
    });
    worker.postMessage({type:'render',id:1,program:p,controls:border.controls.map(c=>c.value)});
    return pending;
  }
  assert.deepEqual(await render(program),await render(original));
  const signs=f=>compile(['('+f+'<0)*255','('+f+'==0)*255','('+f+'>0)*255','a']);
  assert.deepEqual(await render(signs(call)),await render(signs(distance)));
  assert.deepEqual(await render(signs(call.replace('val(1,0,512)','0'))),
    await render(signs('sdfBox(x,y,(X-1)/2,(Y-1)/2,X,Y,0)')));
  const fill=await render(compile(['255*sdfFill(0)','255*sdfFill(100000000000000000000)','0','a']));
  assert.equal(fill[0],255);assert.equal(fill[1],0);
  console.log('Rounded-box Worker oracle max error',maxError,'px. Border classifications and RGBA bytes agree on 61x41.');
}finally{await worker.terminate()}
