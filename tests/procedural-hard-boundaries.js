import { Parser } from '../src/core/formula-language.js';
import { compileFilterProgram } from '../src/core/ir.js';

// Exercise both discontinuous consumers after production compilation and RGBA packing.
export async function checkProceduralBoundaries(cpu, gpu) {
  const wheel = [
    [[255, 0, 0], 0], [[255, 255, 0], 1], [[0, 255, 0], 2],
    [[0, 255, 255], 3], [[0, 0, 255], 4], [[255, 0, 255], 5],
    [[128, 128, 128], 0], [[128, 129, 128], 2], [[128, 128, 129], 4],
    [[255, 1, 0], 0], [[255, 0, 1], 5],
  ];
  const width = 4001;
  const source = new Uint8ClampedArray(width * 4);
  for (let x = 0; x < width; x++) source.set(wheel[x % wheel.length][0], x * 4);
  const program = compileFilterProgram([
    '255*sdfFill(sdfRoundedBox(x,1000,0,0,5945.71044921875,6000,10,ctl(0)*4))',
    'floor(hue1024(r,g,b)*6/1024)', '0', '255',
  ].map(formula => new Parser(formula).parse()));
  for (const renderer of [cpu, gpu]) {
    await renderer.setSource(source, width, 1);
    const { pixels } = await renderer.render({ id: 1, program, controls: [254.9375] });
    if (pixels[3000 * 4] !== 0) throw Error(renderer.id + ' filled the exterior rounded-box pixel');
    for (let x = 0; x < width; x++) {
      const [rgb, expected] = wheel[x % wheel.length];
      if (pixels[x * 4 + 1] !== expected) throw Error(renderer.id + ' hue sector mismatch for ' + rgb);
    }
  }
}
