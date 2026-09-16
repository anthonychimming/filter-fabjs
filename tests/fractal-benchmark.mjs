import assert from 'node:assert/strict';
import { Worker } from 'node:worker_threads';
import { once } from 'node:events';
import { Parser } from '../src/core/formula-language.js';
import { compileFilterProgram } from '../src/core/ir.js';
import { workerProgram } from '../src/renderers/cpu-worker-source.js';
import { assertCpuRenderBudget } from '../src/renderers/cpu-renderer.js';
import { defaultControlValues } from '../src/core/controls.js';
import { fractalWorkloads } from './fractal-fixtures.js';

const worker=new Worker(`const {parentPort}=require('node:worker_threads');globalThis.postMessage=m=>parentPort.postMessage(m);parentPort.on('message',data=>onmessage({data}));${workerProgram()}`,{eval:true});
const width=64,height=64;
let id=0;
async function render(program){
  worker.postMessage({type:'render',id:++id,program,controls:defaultControlValues()});
  for(;;){const [message]=await once(worker,'message');if(message.type==='result')return message}
}
try{
  worker.postMessage({type:'init',width,height,buffer:new Uint8ClampedArray(width*height*4).buffer});
  await once(worker,'message');
  console.log('CPU Worker: 64x64, one fractal channel; median of 3 runs after warmup, no timing thresholds.');
  console.log('workload,iterations,median_ms,work_units');
  for(const [name,formula] of fractalWorkloads)for(const iterations of [128,256,512]){
    const program=compileFilterProgram([`${formula(iterations)}*255`,'0','0','255'].map(f=>new Parser(f).parse()));
    const work=assertCpuRenderBudget(program,width,height),warmup=await render(program),times=[];
    for(let repeat=0;repeat<3;repeat++){
      const result=await render(program);
      assert.deepEqual(new Uint8Array(result.buffer),new Uint8Array(warmup.buffer),'benchmark output must remain deterministic');
      times.push(result.ms);
    }
    console.log(`${name},${iterations},${times.sort((a,b)=>a-b)[1].toFixed(2)},${work}`);
  }
}finally{await worker.terminate()}
