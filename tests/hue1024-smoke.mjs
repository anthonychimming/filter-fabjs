import assert from 'node:assert/strict';
import fs from 'node:fs';
import {Worker} from 'node:worker_threads';
import {once} from 'node:events';
import {Parser} from '../src/core/formula-language.js';
import {compileFilterProgram} from '../src/core/ir.js';
import {validateNativeFilter,parseAFS} from '../src/io/filter-format.js';
import {workerProgram} from '../src/renderers/cpu-worker-source.js';
import {WGSLCompiler} from '../src/gpu/wgsl-compiler.js';
import {RendererManager} from '../src/renderers/renderer-manager.js';
import {WebGpuRenderer} from '../src/renderers/webgpu-renderer.js';
import {assertCpuRenderBudget,estimateCpuProgramCost} from '../src/renderers/cpu-renderer.js';
import {presets} from '../src/presets/builtins.js';
import {routeImageFileWithMetadata,validateFilterForPersistence} from '../src/app/filter-fab-app.js';
import {packageFixtureBytes,packageFixtureMetadata,packageFixtureDocument} from './helpers/online-package-fixture.js';
import {onlineCatalogEntry} from '../src/app/filter-catalog.js';
import {fetchOnlineFilterPackage} from '../src/io/filter-library-package.js';

const compile=(f,options)=>compileFilterProgram(f.map(s=>new Parser(s).parse()),options);
const hue='hue1024(r,g,b)',one=s=>compile([s,'g','b','a']);
assert.throws(()=>one('Hue1024(r,g,b)'),/Unknown function/);
assert.throws(()=>one('hue1024(r,g)'),/expects 3/);
const p=one(hue);
assert.equal(p.outputs[0].expression.type,'scalar');
assert.equal(p.irVersion,1);
assert(p.metadata.deterministic&&!p.metadata.stateful&&!p.metadata.usesSource);
assert.equal(WGSLCompiler.key(p),WGSLCompiler.key(one(hue)));
const formulas=['r','g','0?'+hue+':b','a'],legacyError=/Channel 3: hue1024\(\) requires native float mode/;
const native={...packageFixtureDocument,formulas},legacy={...native,mathMode:'legacy'};
assert.throws(()=>compile(formulas,{legacyMath:true}),legacyError);
assert.equal(validateNativeFilter(native).mathMode,'float');
assert.throws(()=>validateNativeFilter({...native,version:1,mathMode:undefined}),legacyError);
assert.throws(()=>validateNativeFilter(legacy),legacyError);
assert.throws(()=>parseAFS(['%RGB',...Array(8).fill('0'),formulas.join('\n\n')].join('\n')),legacyError);
assert.equal(validateFilterForPersistence(legacy),null);
const bytes=await packageFixtureBytes(legacy);
const png=await routeImageFileWithMetadata(new Blob([bytes],{type:'image/png'}),{chooseAction:async()=>'cancel',openImage:assert.fail,importFilter:assert.fail});
assert.match(png.metadataError.message,legacyError);
await assert.rejects(fetchOnlineFilterPackage(onlineCatalogEntry(packageFixtureMetadata(),{}),{manifestUrl:'https://fixture.test/list.json',fetchImpl:async()=>new Response(bytes)}),legacyError);
assert(WGSLCompiler.analyze(one('hue1024(clamp(min(r,255),0,max(g,b)),2,0)')).compatible);
const unsafe=one('hue1024(r,clamp(g/(b-r),0,255),b)');
assert.match(WGSLCompiler.analyze(unsafe).blockers.join(),/hue1024\(\): cannot establish finite producer for argument 2/);
const direct=new WebGpuRenderer();
assert.throws(()=>direct.planFor(unsafe,{compatible:true}),/argument 2/);
const mixed=one(hue+'+sdfRoundedBox(x,y,0,0,X,Y,ctl(1),0)');
const manager=new RendererManager({});
const cached=manager.analyze(p);
for(const [w,ok] of [[1,true],[32769,false],[40,true]]){
  await manager.setSource(new Uint8ClampedArray(w*4),w,1);
  assert.equal(manager.analyze(p),cached);
  assert.equal(manager.analyze(mixed).compatible,ok);
  assert.equal(manager.analyze(mixed,[0,NaN]).compatible,false);
}
assert(WGSLCompiler.compile(one('angle('+hue+',0)')).code.includes('ff_hue1024('));
const vectors=[],corners=[[255,0,0],[255,255,0],[0,255,0],[0,255,255],[0,0,255],[255,0,255]];
for(let sector=0;sector<6;sector++)for(let step=0;step<256;step++){
  const t=step/256;
  vectors.push([corners[sector].map((v,i)=>v+(corners[(sector+1)%6][i]-v)*t),(sector+t)*1024/6]);
}
const delta=1024/(6*255);
vectors.push([[255,255,255],0],[[0.75,0.5,0.25],256/3],[[300,-1,255],2560/3],
  [[255,1,0],delta],[[255,0,1],1024-delta],[[0,2**-149,0],1024/3],
  [[400,-4,0],0],[[128,128,128],0],[[-0,0,0],0],[[1,0,Number.MIN_VALUE],0],
  [[128,128+2**-15,128],1024/3],[[128,128+2**-20,128],1024/3],[[128,128+2**-20,128].map(Math.fround),0]);
for(let i=0;i<3;i++)for(const bad of [NaN,Infinity,-Infinity]){
  const rgb=[35,83,6];rgb[i]=bad;vectors.push([rgb,0]);
}
const worker=new Worker(`
  const {parentPort}=require('node:worker_threads');
  globalThis.postMessage=m=>{if(m.type!=='progress')parentPort.postMessage(m)};
  ${workerProgram()}
  parentPort.on('message',m=>{if(m.rgb)postMessage(m.rgb.map(rgb=>evFloat({op:'call',fn:'hue1024',args:rgb.map(value=>({op:'const',value}))},environment)));else onmessage({data:m})});
`,{eval:true});
async function request(msg){const pending=once(worker,'message');worker.postMessage(msg);return (await pending)[0]}
try{
  const values=await request({rgb:vectors.map(v=>v[0])});
  let worst=0;
  for(const [i,[,expected]] of vectors.entries()){
    const actual=values[i],delta=Math.abs(actual-expected);
    assert(actual>=0&&actual<1024);
    assert(Math.min(delta,1024-delta)<1e-10);
    if(expected===0)assert(Object.is(actual,0));
    if(i<1536)assert.equal(Math.floor(actual*6/1024),Math.floor(i/256));
    worst=Math.max(worst,Math.min(delta,1024-delta));
  }
  console.log('Maximum circular error:',worst);
  const group='((max(r,max(g,b))-min(r,min(g,b)))==0?0:max(r,max(g,b))==r?wrap((g-b)/(max(r,max(g,b))-min(r,min(g,b))),6):max(r,max(g,b))==g?(b-r)/(max(r,max(g,b))-min(r,min(g,b)))+2:(r-g)/(max(r,max(g,b))-min(r,min(g,b)))+4)';
  const builtin=presets.find(f=>f.name==='Photoshop-Style Hue/Saturation');
  const fixtures=[{name:builtin.name,formulas:builtin.f,controls:builtin.controls.map(c=>c.value)},
    JSON.parse(fs.readFileSync(new URL('fixtures/hue1024-vibrance-r3.json',import.meta.url)))];
  const pixels=Uint8ClampedArray.from({length:64*64*4},(_,i)=>((i*73)^(i>>3)^(i>>7))&255);
  await request({type:'init',width:64,height:64,buffer:pixels.buffer});
  for(const [idx,f] of fixtures.entries()){
    const replaced=f.formulas.map((s,ch)=>{
      assert.equal(s.split(group).length,ch===3?1:2);
      return s.replace(group,'('+hue+'*6/1024)');
    });
    assert.equal(replaced[3],'a');
    const pair=[compile(f.formulas),compile(replaced)];
    for(const [j,program] of pair.entries()){
      for(const [w,h] of [[1000,1000],[2000,2000],[4000,2000]]){
        assert(WGSLCompiler.analyze(program,{width:w,height:h}).compatible);
        if(w===4000)assert.throws(()=>assertCpuRenderBudget(program,w,h),/work-unit limit/);
        else assertCpuRenderBudget(program,w,h);
      }
      assert.equal(estimateCpuProgramCost(program),[[646,562],[595,511]][idx][j]);
      const code=WGSLCompiler.compile(program).code;
      if(j&&process.env.HUE_SHADER_PREFIX)fs.writeFileSync(process.env.HUE_SHADER_PREFIX+idx+'.wgsl',code);
    }
    for(const controls of [f.controls,Array(10).fill(196),Array(10).fill(127.5)]){
      const images=[];
      for(const program of pair)images.push(new Uint8Array((await request({type:'render',program,controls,id:1})).buffer));
      let changed=0,max=0;
      for(let i=0;i<pixels.length;i++){
        const delta=Math.abs(images[0][i]-images[1][i]);
        if(delta)changed++;
        max=Math.max(max,delta);
        if(i%4===3||controls.every(v=>v===127.5))assert.equal(images[1][i],pixels[i]);
      }
      console.log(f.name,'changed bytes:',changed,'max byte error:',max);
      assert(max<=1);
    }
  }
}finally{await worker.terminate()}
