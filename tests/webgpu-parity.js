import { Parser } from '../src/core/formula-language.js';
import { CONTROL_DEFINITIONS } from '../src/core/controls.js';
import { compileFilterProgram } from '../src/core/ir.js';
import { CpuRenderer } from '../src/renderers/cpu-renderer.js';
import { workerProgram } from '../src/renderers/cpu-worker-source.js';
import { WebGpuRenderer } from '../src/renderers/webgpu-renderer.js';

const summary = document.querySelector('#summary');
const results = document.querySelector('#results');
const width = 31;
const height = 23;
const controls = CONTROL_DEFINITIONS.map((_,index)=>[43,87,129,171,213,65,107,149,191,233][index]);
const source = new Uint8ClampedArray(width * height * 4);
for (let y = 0; y < height; y += 1) {
  for (let x = 0; x < width; x += 1) {
    const offset = (y * width + x) * 4;
    source[offset] = (x * 17 + y * 5) & 255;
    source[offset + 1] = (x * 7 + y * 19) & 255;
    source[offset + 2] = (x * 13 + y * 11) & 255;
    source[offset + 3] = 64 + ((x * 3 + y * 5) % 192);
  }
}
source.set([0,0,255,255,255,0,0,255],0);

const fixtures = [
  ['Hash', 'hash2(x,y,711)*255'],
  ['Value noise', 'valueNoise(x,y,9.5,711)*255'],
  ['Perlin', 'perlin(x,y,9.5,711)*255'],
  ['Worley F1', 'worleyF1(x,y,9.5,711)*255'],
  ['Worley F2', 'worleyF2(x,y,9.5,711)*255'],
  ['FBM', 'fbm(x,y,14,5,2,0.5,711)*255'],
  ['Turbulence', 'turbulence(x,y,14,5,711)*255'],
  ['Ridged noise', 'ridged(x,y,14,5,711)*255'],
  ['Periodic noise', 'periodicNoise(x,y,19,13,711)*255'],
  ['Mandelbrot field', 'mandelbrot(cx*1.5-0.5,cy,96)*255'],
  ['Julia field', 'julia(cx*1.4,cy*1.4,-0.8,0.156,96)*255'],
  ['Control 8', 'ctl(8)'],
  ['Control 9', 'val(9,0,255)'],
  ['Control pair 4', 'map(4,c)'],
  ['Normalized coordinates', 'gradient4(nx,0,64,192,255)'],
  ['Centered radius', 'clamp(radius(cx,cy),0,1)*255'],
  ['Centered angle', 'repeat(angle(cx,cy),1024)/4'],
  ['Mirror repeat', 'mirrorRepeat(x,7)*32'],
  ['Three-stop ramp', 'gradient3(ny,0,128,255)'],
  ['Polar sample', 'rad(128,3,z)'],
  ['Mirror boundary', 'srcMirror(X,y,z)'],
  ['3×3 convolution', 'clamp(cnv(0,-1,0,-1,5,-1,0,-1,0,1),0,255)'],
  ['Chroma U bounds', 'scl(u,umin,umax,0,255)'],
  ['Chroma V bounds', 'scl(v,vmin,vmax,0,255)'],
  ['Round half tie', 'round(0.5)*255'],
  ['Signed-zero angle', 'c2d(-0,0)/4'],
  ['Angular gradient', 'angularGrad(x,y,X/2,Y/2,128)*255'],
  ['Checker', 'checker(x,y,7,5)*255'],
  ['Brick', 'brick(x,y,11,7,1,0.5)*255'],
  ['Line mask', 'line(x,y,2,3,X-3,Y-4,2.5,1.25)*255'],
  ['Circle mask', 'circle(x,y,X/2,Y/2,7.5,1.25)*255'],
  ['Ring mask', 'ring(x,y,X/2,Y/2,7.5,2.5,1.25)*255'],
  ['Rotated box mask', 'box(x,y,X/2,Y/2,13,9,137,1.25)*255'],
  ['Triangle mask', 'triangle(x,y,3,Y-3,X/2,2,X-3,Y-4,1.25)*255'],
  ['Grid mask', 'grid(x,y,9,7,1.5,1.25)*255'],
  ['Sierpiński mask', 'sierpinski(x,y,X/2,Y/2,19,5,1.25)*255'],
  ['SDF fill', 'sdfFill(sdfCircle(x,y,X/2,Y/2,7.5),1.25)*255'],
  ['SDF outline', 'sdfOutline(sdfBox(x,y,X/2,Y/2,13,9,137),2.5,1.25)*255'],
  ['SDF boolean composition', 'sdfFill(sdfSubtract(sdfUnion(sdfCircle(x,y,10,11,6),sdfBox(x,y,20,11,9,9,64)),sdfCircle(x,y,15,11,2)),1)*255'],
  ['SDF smooth union', 'sdfFill(sdfSmoothUnion(sdfCircle(x,y,10,11,5),sdfCircle(x,y,20,11,5),4),1)*255'],
  ['Domain-warped SDF', 'sdfFill(sdfCircle(x+(valueNoise(x,y,9,711)-0.5)*4,y+(valueNoise(x+31,y+47,9,711)-0.5)*4,X/2,Y/2,7),1)*255']
];

const programFor = formula => compileFilterProgram(
  [formula, formula, formula, formula].map(sourceText => new Parser(sourceText).parse())
);

function compare(cpuPixels, gpuPixels) {
  let max = 0;
  let sum = 0;
  for (let index = 0; index < cpuPixels.length; index += 1) {
    const delta = Math.abs(cpuPixels[index] - gpuPixels[index]);
    max = Math.max(max, delta);
    sum += delta;
  }
  return { max, mean: sum / cpuPixels.length };
}

async function run() {
  if (!navigator.gpu) throw new Error(WebGpuRenderer.unavailableReason() || 'WebGPU API unavailable');
  const cpu = new CpuRenderer(workerProgram);
  const gpu = new WebGpuRenderer();
  let passed = 0;
  try {
    await Promise.all([
      cpu.setSource(source, width, height),
      gpu.setSource(source, width, height)
    ]);
    for (let index = 0; index < fixtures.length; index += 1) {
      const [name, formula] = fixtures[index];
      const program = programFor(formula);
      const [cpuResult, gpuResult] = await Promise.all([
        cpu.render({ id: index + 1, program, controls, legacyMath: false }),
        gpu.render({ program, controls })
      ]);
      const delta = compare(cpuResult.pixels, gpuResult.pixels);
      const ok = delta.max <= 3 && delta.mean <= 0.35;
      if (ok) passed += 1;
      const row = document.createElement('tr');
      row.innerHTML = `<td><code>${name}</code></td><td>${delta.max}</td><td>${delta.mean.toFixed(4)}</td><td class="${ok ? 'pass' : 'fail'}">${ok ? 'PASS' : 'FAIL'}</td>`;
      results.append(row);
    }
  } finally {
    cpu.dispose();
    gpu.dispose();
  }
  const ok = passed === fixtures.length;
  summary.className = ok ? 'pass' : 'fail';
  summary.textContent = `${passed}/${fixtures.length} fixtures passed on actual WebGPU hardware.`;
}

run().catch(error => {
  summary.className = 'fail';
  summary.textContent = `Parity test could not run: ${error.message}`;
  console.error(error);
});
