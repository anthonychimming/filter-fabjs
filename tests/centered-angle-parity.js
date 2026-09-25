import {Parser} from '../src/core/formula-language.js';
import {compileFilterProgram} from '../src/core/ir.js';
import {WGSLCompiler} from '../src/gpu/wgsl-compiler.js';
import {AngleSignLowering} from '../src/gpu/angle-sign.js';
import {WEBGPU_PARAMS_BYTES} from '../src/gpu/params-layout.js';
import {CpuRenderer} from '../src/renderers/cpu-renderer.js';
import {workerProgram} from '../src/renderers/cpu-worker-source.js';
import {WebGpuRenderer} from '../src/renderers/webgpu-renderer.js';
import {centeredAngleFixtures,centeredAngleSizes,centeredAnglePoints} from './centered-angle-fixtures.js';
const program=formula=>compileFilterProgram(Array(4).fill(formula).map(f=>new Parser(f).parse()));

async function coordinateProbe(device,width,height){
  // Observe the actual values/signs produced by the production lowering, before
  // atan2 or packing. Compare every non-center coordinate with its original bits.
  const p=program('angle(cx,cy)'),compiler=new WGSLCompiler(p),lowering=new AngleSignLowering(compiler,0);
  const [x,y]=p.outputs[0].expression.args.map(n=>lowering.lower(n));
  const fields=[`bitcast<u32>(centeredX)`,`bitcast<u32>(centeredY)`,`bitcast<u32>(${x.v})`,`bitcast<u32>(${y.v})`,`select(0u,1u,${x.n})`,`select(0u,1u,${y.n})`];
  const code=compiler.shader(Array(4).fill('0.0')).replace(/outPixels\[index\]=.*;/,fields.map((v,i)=>`outPixels[index*6u+${i}u]=${v};`).join('\n'));
  const module=device.createShaderModule({code}),pipeline=await device.createComputePipelineAsync({layout:'auto',compute:{module,entryPoint:'main'}});
  const buffers=[];const make=(size,usage)=>{const b=device.createBuffer({size,usage});buffers.push(b);return b};
  try{
    const source=make(width*height*4,GPUBufferUsage.STORAGE),output=make(width*height*24,GPUBufferUsage.STORAGE|GPUBufferUsage.COPY_SRC),params=make(WEBGPU_PARAMS_BYTES,GPUBufferUsage.STORAGE|GPUBufferUsage.COPY_DST),read=make(output.size,GPUBufferUsage.COPY_DST|GPUBufferUsage.MAP_READ);
    const bytes=new ArrayBuffer(WEBGPU_PARAMS_BYTES);new Uint32Array(bytes).set([width,height,0,height]);device.queue.writeBuffer(params,0,bytes);
    const bind=device.createBindGroup({layout:pipeline.getBindGroupLayout(0),entries:[source,output,params].map((buffer,binding)=>({binding,resource:{buffer}}))});
    const encoder=device.createCommandEncoder(),pass=encoder.beginComputePass();pass.setPipeline(pipeline);pass.setBindGroup(0,bind);pass.dispatchWorkgroups(Math.ceil(width/8),Math.ceil(height/8));pass.end();encoder.copyBufferToBuffer(output,0,read,0,output.size);device.queue.submit([encoder.finish()]);
    await read.mapAsync(GPUMapMode.READ);const words=new Uint32Array(read.getMappedRange().slice(0));read.unmap();
    let exactCenters=0,unchanged=0;const failures=[];
    for(let i=0;i<width*height;i++)for(let axis=0;axis<2;axis++){
      const pixel=axis?Math.floor(i/width):i%width,size=axis?height:width,raw=words[i*6+axis],actual=words[i*6+2+axis],negative=words[i*6+4+axis];
      if(pixel*2===size-1){if((actual&0x7fffffff)!==0||negative!==0)failures.push({i,axis,raw,actual,negative});exactCenters++}
      else{if(raw!==actual)failures.push({i,axis,raw,actual,negative});unchanged++}
    }
    const samples=centeredAnglePoints(width,height).map(([x,y])=>({x,y,bits:Array.from(words.slice((y*width+x)*6,(y*width+x)*6+6),n=>'0x'+n.toString(16).padStart(8,'0'))}));
    return{width,height,exactCenters,unchanged,pass:failures.length===0,failures,samples};
  }finally{for(const b of buffers)b.destroy()}
}
async function run(){
  const cpu=new CpuRenderer(workerProgram),gpu=new WebGpuRenderer(),rows=[],coordinates=[];
  try{
    await gpu.ensureDevice();
    for(const [width,height] of centeredAngleSizes){
      coordinates.push(await coordinateProbe(gpu.device,width,height));
      const source=new Uint8ClampedArray(width*height*4);source.fill(127);
      await cpu.setSource(source,width,height);await gpu.setSource(source,width,height);
      for(const {formula,encoding} of centeredAngleFixtures){
        const p=program(encoding==='offset'?`((${formula})+512)/4`:`repeat(${formula},1024)/4`),controls=Array(10).fill(0);
        const [a,b]=await Promise.all([cpu.render({id:rows.length+1,program:p,controls}),gpu.render({program:p,controls})]);
        let max=0,sum=0;for(let i=0;i<a.pixels.length;i++){const d=Math.abs(a.pixels[i]-b.pixels[i]);max=Math.max(max,d);sum+=d}
        rows.push({width,height,formula,encoding,max,mean:sum/a.pixels.length,pass:max===0});
        document.querySelector('#summary').textContent=`Running ${rows.length}/${centeredAngleFixtures.length*centeredAngleSizes.length}…`;
      }
    }
    document.querySelector('#summary').textContent=`${rows.filter(r=>r.pass).length}/${rows.length} exact CPU/WebGPU fixtures; ${coordinates.filter(r=>r.pass).length}/${coordinates.length} coordinate bit-preservation checks passed.`;
    document.querySelector('#results').textContent=JSON.stringify({coordinates,rows},null,2);
  }finally{cpu.dispose();gpu.dispose()}
}
run().catch(error=>{document.querySelector('#summary').textContent=`ERROR: ${error.message}`;console.error(error)});
