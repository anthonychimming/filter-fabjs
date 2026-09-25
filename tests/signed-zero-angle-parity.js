import { Parser } from '../src/core/formula-language.js';
import { compileFilterProgram } from '../src/core/ir.js';
import { CpuRenderer } from '../src/renderers/cpu-renderer.js';
import { workerProgram } from '../src/renderers/cpu-worker-source.js';
import { WebGpuRenderer } from '../src/renderers/webgpu-renderer.js';
import { signedZeroAngleFixtures, signedZeroControls } from './signed-zero-angle-fixtures.js';

async function run(){
  const cpu=new CpuRenderer(workerProgram),gpu=new WebGpuRenderer(),rows=[];
  try{
    const source=new Uint8ClampedArray(4*3*4);
    await cpu.setSource(source,4,3);await gpu.setSource(source,4,3);
    for(const {formula,expected} of signedZeroAngleFixtures){
      const program=compileFilterProgram([`((${formula})+512)/4`,`c2d((${formula}),0)/4`,'0','255'].map(f=>new Parser(f).parse()));
      const a=await cpu.render({id:rows.length+1,program,controls:signedZeroControls}),b=await gpu.render({program,controls:signedZeroControls});
      const gold=new Uint8ClampedArray(a.pixels.length);
      for(let i=0;i<12;i++){
        const v=expected(i%4);
        gold.set([(v+512)/4,(v<0||Object.is(v,-0))?128:0,0,255],i*4);
      }
      let max=0,sum=0,cpuCorrect=true;
      for(let i=0;i<a.pixels.length;i++){const delta=Math.abs(a.pixels[i]-b.pixels[i]);max=Math.max(max,delta);sum+=delta;if(a.pixels[i]!==gold[i])cpuCorrect=false}
      rows.push({formula,max,mean:sum/a.pixels.length,cpuCorrect,pass:max===0&&cpuCorrect});
      document.querySelector('#summary').textContent=`Running ${rows.length}/${signedZeroAngleFixtures.length}…`;
    }
    document.querySelector('#summary').textContent=`${rows.filter(r=>r.pass).length}/${rows.length} passed on actual WebGPU hardware (exact bytes).`;
    document.querySelector('#results').textContent=JSON.stringify({adapter:gpu.adapter.info,rows},null,2);
  }finally{cpu.dispose();gpu.dispose()}
}
run().catch(error=>{document.querySelector('#summary').textContent=`ERROR: ${error.message}`;console.error(error)});
