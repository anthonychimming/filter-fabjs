import {Parser} from '../src/core/formula-language.js';
import {compileFilterProgram} from '../src/core/ir.js';
import {CpuRenderer} from '../src/renderers/cpu-renderer.js';
import {workerProgram} from '../src/renderers/cpu-worker-source.js';
import {WebGpuRenderer} from '../src/renderers/webgpu-renderer.js';
import {WGSLCompiler} from '../src/gpu/wgsl-compiler.js';
import {angularGradientSizes,angularGradientOffsets,angularGradientDirections,angularGradientCenters,angularGradientRayFormula,angularGradientRayControls,angularGradientValue} from './angular-gradient-fixtures.js';
const program=formula=>compileFilterProgram(Array(4).fill(`(${formula})*255`).map(f=>new Parser(f).parse()));
// A test-only reference to the former native path. Non-exact pixels must retain
// its exact bytes, even where native atan2 already differs from the CPU.
class NativeGradientRenderer extends WebGpuRenderer{
  planFor(p,a){const plan=super.planFor(p,a);return {...plan,code:plan.code.replace('ff_angular_turn(y-cy,x-cx)','ff_atan2(y-cy,x-cx)/FF_TAU')}}
}
async function turnProbe(device){
  const directions=[...angularGradientDirections,{dx:1,dy:1.0000001192092896,kind:'near'},{dx:1,dy:0.9999999403953552,kind:'near'}];
  const cases=directions.flatMap(d=>angularGradientOffsets.map(offset=>({...d,offset})));
  const base=WGSLCompiler.compile(program('angularGrad(x,y,0,0,0)')).code.split('@compute')[0];
  const code=base+`@compute @workgroup_size(64) fn main(@builtin(global_invocation_id) gid:vec3<u32>){
    let i=gid.x;if(i>=${cases.length}u){return;}let a=i*3u;
    let x=bitcast<f32>(srcPixels[a]);let y=bitcast<f32>(srcPixels[a+1u]);let offset0=bitcast<f32>(srcPixels[a+2u]);
    let offset=select(offset0/1024.0,offset0,abs(offset0)<=1.0);let turn=ff_angular_turn(y,x);let native=ff_atan2(y,x)/FF_TAU;
    outPixels[i*4u]=bitcast<u32>(turn);outPixels[i*4u+1u]=bitcast<u32>(native);
    outPixels[i*4u+2u]=bitcast<u32>(ff_wrap(turn+offset,1.0));outPixels[i*4u+3u]=bitcast<u32>(ff_wrap(native+offset,1.0));
  }`;
  const buffers=[],make=(size,usage)=>{const b=device.createBuffer({size,usage});buffers.push(b);return b};
  try{
    const input=make(cases.length*12,GPUBufferUsage.STORAGE|GPUBufferUsage.COPY_DST),output=make(cases.length*16,GPUBufferUsage.STORAGE|GPUBufferUsage.COPY_SRC),read=make(output.size,GPUBufferUsage.COPY_DST|GPUBufferUsage.MAP_READ);
    device.queue.writeBuffer(input,0,new Float32Array(cases.flatMap(r=>[r.dx,r.dy,r.offset])));
    const pipeline=await device.createComputePipelineAsync({layout:'auto',compute:{module:device.createShaderModule({code}),entryPoint:'main'}});
    const bind=device.createBindGroup({layout:pipeline.getBindGroupLayout(0),entries:[input,output].map((buffer,binding)=>({binding,resource:{buffer}}))});
    const encoder=device.createCommandEncoder(),pass=encoder.beginComputePass();pass.setPipeline(pipeline);pass.setBindGroup(0,bind);pass.dispatchWorkgroups(Math.ceil(cases.length/64));pass.end();encoder.copyBufferToBuffer(output,0,read,0,output.size);device.queue.submit([encoder.finish()]);
    await read.mapAsync(GPUMapMode.READ);const words=new Uint32Array(read.getMappedRange().slice(0)),floats=new Float32Array(words.buffer);read.unmap();
    return cases.map((r,i)=>{
      const o=i*4,expected=Math.atan2(r.dy,r.dx)/(2*Math.PI),cpuWrapped=angularGradientValue(r.dx,r.dy,r.offset);
      const pass=r.kind==='exact'?floats[o]===expected&&floats[o+2]===cpuWrapped:words[o]===words[o+1]&&words[o+2]===words[o+3];
      return {...r,pass,turn:floats[o],wrapped:floats[o+2],cpuWrapped,bits:Array.from(words.slice(o,o+4),n=>'0x'+n.toString(16).padStart(8,'0'))};
    });
  }finally{for(const buffer of buffers)buffer.destroy()}
}
async function run(){
  const cpu=new CpuRenderer(workerProgram),gpu=new WebGpuRenderer(),native=new NativeGradientRenderer(),rows=[];
  const compare=async(p,controls,description,expected,centerValues)=>{
    const [a,b]=await Promise.all([cpu.render({id:rows.length+1,program:p,controls}),gpu.render({program:p,controls})]);
    let max=0,sum=0;for(let i=0;i<a.pixels.length;i++){const d=Math.abs(a.pixels[i]-b.pixels[i]);max=Math.max(max,d);sum+=d}
    const cpuCorrect=expected===undefined||a.pixels.every(v=>v===expected);
    let exactPixels=0,exactFailures=0,nonExactChanges=0;
    if(centerValues){
      const reference=await native.render({program:p,controls}),[cx,cy]=centerValues;
      for(let i=0;i<a.pixels.length;i+=4){
        const x=(i/4)%description.width,y=Math.floor(i/4/description.width),dx=x-cx,dy=y-cy,exact=dx===0||dy===0||Math.abs(dx)===Math.abs(dy);
        if(exact)exactPixels++;
        for(let channel=0;channel<4;channel++){
          if(exact&&a.pixels[i+channel]!==b.pixels[i+channel])exactFailures++;
          if(!exact&&b.pixels[i+channel]!==reference.pixels[i+channel])nonExactChanges++;
        }
      }
    }
    rows.push({...description,max,mean:sum/a.pixels.length,cpuCorrect,exactPixels,exactFailures,nonExactChanges,pass:cpuCorrect&&(centerValues?exactFailures===0&&nonExactChanges===0:max===0)});
    document.querySelector('#summary').textContent=`Running ${rows.length} fixtures…`;
  };
  try{
    await gpu.ensureDevice();
    const turns=await turnProbe(gpu.device);
    await cpu.setSource(new Uint8ClampedArray(4),1,1);await gpu.setSource(new Uint8ClampedArray(4),1,1);
    const p=program(angularGradientRayFormula);
    for(const center of [16,16.5])for(const {dx,dy,kind} of angularGradientDirections)for(const offset of angularGradientOffsets){
      await compare(p,angularGradientRayControls(dx,dy,center,offset),{kind,dx,dy,center,offset},new Uint8ClampedArray([angularGradientValue(dx,dy,offset)*255])[0]);
    }
    for(const [width,height] of angularGradientSizes){
      const source=new Uint8ClampedArray(width*height*4);source.fill(127);
      await cpu.setSource(source,width,height);await gpu.setSource(source,width,height);
      await native.setSource(source,width,height);
      for(const center of angularGradientCenters)for(const offset of angularGradientOffsets){
        const formula=`angularGrad(x,y,${center.x},${center.y},${offset})`;
        await compare(program(formula),[31,23,0,0,0,0,0,0,0,0],{width,height,formula,center:center.name,offset},undefined,center.values(width,height));
      }
    }
    const rays=rows.filter(r=>!r.width),fields=rows.filter(r=>r.width);
    document.querySelector('#summary').textContent=`${rays.filter(r=>r.pass).length}/${rays.length} exact CPU/WebGPU ray fixtures; ${fields.filter(r=>r.pass).length}/${fields.length} fields with exact rays and unchanged native fallback; ${turns.filter(r=>r.pass).length}/${turns.length} turn/wrap probes. Full-field exact parity: ${fields.filter(r=>r.max===0).length}/${fields.length}.`;
    document.querySelector('#results').textContent=JSON.stringify({rows,turns},null,2);
  }finally{cpu.dispose();gpu.dispose();native.dispose()}
}
run().catch(error=>{document.querySelector('#summary').textContent=`ERROR: ${error.stack}`;console.error(error)});
