import { Parser } from '../src/core/formula-language.js';
import { compileFilterProgram } from '../src/core/ir.js';
import { defaultControlValues } from '../src/core/controls.js';
import { WGSLCompiler } from '../src/gpu/wgsl-compiler.js';
import { WebGpuRenderer } from '../src/renderers/webgpu-renderer.js';
import { CpuRenderer } from '../src/renderers/cpu-renderer.js';
import { workerProgram } from '../src/renderers/cpu-worker-source.js';

// Test-only Stage B reference: use the same lowering, omitting the Stage C pass.
class UnsharedGpuRenderer extends WebGpuRenderer{
  planFor(program,analysis=WGSLCompiler.analyze(program)){
    const key=WGSLCompiler.key(program),cached=this.cachedPipeline(key);if(cached?.plan)return cached.plan;
    if(!analysis.compatible)throw new Error(analysis.blockers.join(', '));
    const compiler=new WGSLCompiler(program),expressions=program.outputs.map((o,i)=>compiler.value(o.expression,i)),code=compiler.shader(expressions);
    WGSLCompiler.validateGeneratedSource(code);return{key,code,analysis};
  }
}
const compile=formulas=>compileFilterProgram(formulas.map(f=>new Parser(f).parse()));
const palette=field=>[`(${field})*255`,`(${field})*128`,`(${field})*64`,'255'];
const controls=defaultControlValues(),summary=document.querySelector('#summary'),results=document.querySelector('#results');
const fixtures=[
  ...[128,256,512].flatMap(n=>[
    [`Mandelbrot / ${n}`,palette(`mandelbrot(-0.75,0.1,${n})`)],
    [`Julia / ${n}`,palette(`julia(0.3,0.2,-0.8,0.156,${n})`)]
  ]),
  ...['fbm(x,y,16,4,2,0.5,7)','turbulence(x,y,16,4,7)','ridged(x,y,16,4,7)','worleyF1(x,y,16,7)','worleyF2(x,y,16,7)'].map(f=>[f,palette(f)]),
  ['Independent field with channel palette',['mandelbrot(-0.75,0.1,512)*c','mandelbrot(-0.75,0.1,512)*c','mandelbrot(-0.75,0.1,512)*c','a']],
  ['Channel-dependent field',palette('mandelbrot(c/255,z/10,128)')],
  ['Guard-only field',palette('x<X/2?mandelbrot(-0.75,0.1,512):julia(0.3,0.2,-0.8,0.156,512)')],
  ['Shared field in guard',['mandelbrot(-0.75,0.1,512)*255','mandelbrot(-0.75,0.1,512)*128','x<X/2?mandelbrot(-0.75,0.1,512)*64:0','255']],
  ['Nested shared field',palette('mandelbrot(mandelbrot(-0.75,0.1,128),0,512)')],
  ['Shared call with lazy argument',palette('mandelbrot(x<X/2?mandelbrot(-0.75,0.1,128):julia(0.3,0.2,-0.8,0.156,128),0,512)')],
  ['Shared condition',palette('mandelbrot(-0.75,0.1,512)>0.01?1:0')]
];
function compare(a,b){let max=0,sum=0;for(let i=0;i<a.length;i++){const delta=Math.abs(a[i]-b[i]);max=Math.max(max,delta);sum+=delta}return{max,mean:sum/a.length}}
function source(width,height){return Uint8ClampedArray.from({length:width*height*4},(_,i)=>(i*17+23)%256)}
async function run(){
  const shared=new WebGpuRenderer(),unshared=new UnsharedGpuRenderer(),cpu=new CpuRenderer(workerProgram);
  let id=0,passed=0;
  try{
    const pixels=source(31,23);await Promise.all([shared.setSource(pixels,31,23),unshared.setSource(pixels,31,23),cpu.setSource(pixels,31,23)]);
    for(const [name,formulas] of fixtures){
      const program=compile(formulas),options={program,controls};
      const reference=await cpu.render({...options,id:++id});
      const before=await unshared.render(options),after=await shared.render(options);
      const gpuDelta=compare(before.pixels,after.pixels),cpuDelta=compare(reference.pixels,after.pixels),ok=gpuDelta.max===0&&cpuDelta.max<=3&&cpuDelta.mean<=0.35;
      if(ok)passed++;
      const row=document.createElement('tr');
      for(const text of [name,String(gpuDelta.max),`${cpuDelta.max} / ${cpuDelta.mean.toFixed(4)}`,ok?'PASS':'FAIL']){const cell=document.createElement('td');cell.textContent=text;row.append(cell)}
      row.className=ok?'pass':'fail';results.append(row);
    }
    summary.textContent=`${passed}/${fixtures.length} Stage C fixtures passed on WebGPU.`;summary.className=passed===fixtures.length?'pass':'fail';
    if(new URLSearchParams(location.search).has('benchmark')){
      const width=512,height=384,pixels=source(width,height);await Promise.all([shared.setSource(pixels,width,height),unshared.setSource(pixels,width,height)]);
      const timings=[];
      const workloads=[
        ['Mandelbrot early',n=>`mandelbrot(3+nx,ny,${n})`],
        ['Mandelbrot boundary',n=>`mandelbrot(-0.75+nx*0.02,0.09+ny*0.02,${n})`],
        ['Mandelbrot interior',n=>`mandelbrot(nx*0.1,ny*0.1,${n})`],
        ['Julia interior',n=>`julia(nx*0.1,ny*0.1,0,0,${n})`]
      ];
      for(const [name,field] of workloads)for(const iterations of [128,256,512]){
        const program=compile(palette(field(iterations))),options={program,controls},before=[],after=[];
        await unshared.render(options);await shared.render(options);
        for(let repeat=0;repeat<7;repeat++){
          const pair=repeat%2?[shared,unshared]:[unshared,shared],runs=[];
          for(const renderer of pair)runs.push(await renderer.render(options));
          if(compare(runs[0].pixels,runs[1].pixels).max!==0)throw new Error(`Shared/unshared benchmark pixels differ: ${name} ${iterations}`);
          for(let i=0;i<2;i++)(pair[i]===shared?after:before).push(runs[i].ms);
        }
        const median=times=>times.sort((a,b)=>a-b)[3];
        timings.push({name,iterations,width,height,unsharedMs:median(before),sharedMs:median(after)});
      }
      const pre=document.createElement('pre');pre.textContent=JSON.stringify(timings,null,2);document.querySelector('#benchmarks').append(pre);
      console.log(JSON.stringify({sharingBenchmark:timings}));
    }
  }finally{cpu.dispose();shared.dispose();unshared.dispose()}
}
run().catch(error=>{summary.className='fail';summary.textContent=`Stage C validation failed: ${error.message}`;console.error(error)});
