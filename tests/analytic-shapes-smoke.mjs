import assert from 'node:assert/strict';
import { Worker } from 'node:worker_threads';
import { defaultControlValues } from '../src/core/controls.js';
import { Parser } from '../src/core/formula-language.js';
import { compileFilterProgram } from '../src/core/ir.js';
import { workerProgram } from '../src/renderers/cpu-worker-source.js';

const wrapper = `
const { parentPort } = require('node:worker_threads');
globalThis.postMessage = message => parentPort.postMessage(message);
parentPort.on('message', data => globalThis.onmessage({ data }));
${workerProgram()}
`;
const worker = new Worker(wrapper, { eval: true });
const waitFor = predicate => new Promise((resolve, reject) => {
  const timeout = setTimeout(() => reject(new Error('Analytic shape smoke test timed out')), 5000);
  const onMessage = message => {
    if (!predicate(message)) return;
    clearTimeout(timeout);
    worker.off('message', onMessage);
    resolve(message);
  };
  worker.on('message', onMessage);
});
const programFor = formulas => compileFilterProgram(formulas.map(formula => new Parser(formula).parse()));
const pixel = (pixels, width, x, y, channel) => pixels[(y * width + x) * 4 + channel];

const source = new Uint8ClampedArray(7 * 7 * 4);
worker.postMessage({ type: 'init', width: 7, height: 7, buffer: source.buffer }, [source.buffer]);
await waitFor(message => message.type === 'ready');

worker.postMessage({
  type: 'render',
  id: 1,
  program: programFor([
    'circle(x,y,3,3,1,0)*255',
    'line(x,y,0,0,6,6,1,0)*255',
    'box(x,y,3,3,2,2,0,0)*255',
    'triangle(x,y,3,0,0,6,6,6,0)*255'
  ]),
  controls: defaultControlValues(),
  legacyMath: false
});
const first = new Uint8ClampedArray((await waitFor(message => message.type === 'result' && message.id === 1)).buffer);
assert.equal(pixel(first,7,3,3,0),255,'circle center must be filled');
assert.equal(pixel(first,7,0,0,0),0,'circle exterior must be empty');
assert.equal(pixel(first,7,5,5,1),255,'line diagonal must be filled');
assert.equal(pixel(first,7,5,4,1),0,'line exterior must be empty without feathering');
assert.equal(pixel(first,7,3,3,2),255,'box center must be filled');
assert.equal(pixel(first,7,0,0,2),0,'box exterior must be empty');
assert.equal(pixel(first,7,3,3,3),255,'triangle center must be filled');
assert.equal(pixel(first,7,0,0,3),0,'triangle exterior must be empty');

worker.postMessage({
  type: 'render',
  id: 2,
  program: programFor([
    'ring(x,y,3,3,2,1,0)*255',
    'grid(x,y,3,3,1,0)*255',
    '0',
    '255'
  ]),
  controls: defaultControlValues(),
  legacyMath: false
});
const second = new Uint8ClampedArray((await waitFor(message => message.type === 'result' && message.id === 2)).buffer);
assert.equal(pixel(second,7,5,3,0),255,'ring stroke must be filled');
assert.equal(pixel(second,7,3,3,0),0,'ring center must remain empty');
assert.equal(pixel(second,7,3,1,1),255,'grid line must be filled');
assert.equal(pixel(second,7,1,1,1),0,'grid cell interior must be empty');

worker.postMessage({
  type: 'render',
  id: 3,
  program: programFor([
    'sierpinski(x,y,3,3,6,3,0)*255',
    '0',
    '0',
    '255'
  ]),
  controls: defaultControlValues(),
  legacyMath: false
});
const third = new Uint8ClampedArray((await waitFor(message => message.type === 'result' && message.id === 3)).buffer);
assert.equal(pixel(third,7,3,4,0),0,'Sierpiński central hole must be removed');
assert.equal(pixel(third,7,2,4,0),255,'Sierpiński child triangle must remain filled');

const largeSource = new Uint8ClampedArray(101 * 101 * 4);
worker.postMessage({ type: 'init', width: 101, height: 101, buffer: largeSource.buffer }, [largeSource.buffer]);
await waitFor(message => message.type === 'ready');
worker.postMessage({
  type: 'render',
  id: 4,
  program: programFor([
    'sierpinski(x,y,50,50,90,1,0)*255',
    'sierpinski(x,y,50,50,90,4,0)*255',
    'sierpinski(x,y,50,50,90,0,0)*255',
    'sierpinski(x,y,50,50,90,1,2)*255'
  ]),
  controls: defaultControlValues(),
  legacyMath: false
});
const fourth = new Uint8ClampedArray((await waitFor(message => message.type === 'result' && message.id === 4)).buffer);
assert.equal(pixel(fourth,101,41,58,0),0,'a first-level central hole must be present at depth one');
assert.equal(pixel(fourth,101,41,58,1),0,'the same central hole must remain stable at deeper subdivision');
assert.equal(pixel(fourth,101,41,58,2),255,'depth zero must preserve the base triangle');
const featheredHole=pixel(fourth,101,39,69,3);
assert.ok(featheredHole>0&&featheredHole<255,'internal Sierpiński edges must honor feathering');

const sdfSource = new Uint8ClampedArray(7 * 7 * 4);
worker.postMessage({ type: 'init', width: 7, height: 7, buffer: sdfSource.buffer }, [sdfSource.buffer]);
await waitFor(message => message.type === 'ready');
worker.postMessage({
  type: 'render',
  id: 5,
  program: programFor([
    'sdfFill(sdfCircle(x,y,3,3,2))*255',
    'sdfOutline(sdfCircle(x,y,3,3,2),2)*255',
    'sdfFill(sdfSmoothUnion(sdfCircle(x,y,1,3,1),sdfCircle(x,y,5,3,1),4))*255',
    'sdfFill(sdfSubtract(sdfBox(x,y,3,3,6,6,0),sdfCircle(x,y,3,3,1)))*255'
  ]),
  controls: defaultControlValues(),
  legacyMath: false
});
const fifth = new Uint8ClampedArray((await waitFor(message => message.type === 'result' && message.id === 5)).buffer);
assert.equal(pixel(fifth,7,3,3,0),255,'SDF fill must include negative circle distances');
assert.equal(pixel(fifth,7,0,0,0),0,'SDF fill must exclude positive circle distances');
assert.equal(pixel(fifth,7,3,3,1),0,'SDF outline must leave the deep interior empty');
assert.equal(pixel(fifth,7,5,3,1),255,'SDF outline must cover the signed-distance boundary');
assert.equal(pixel(fifth,7,3,3,2),255,'smooth union must bridge nearby signed-distance fields');
assert.equal(pixel(fifth,7,3,0,2),0,'smooth union must retain a bounded exterior');
assert.equal(pixel(fifth,7,3,3,3),0,'SDF subtraction must remove the second field');
assert.equal(pixel(fifth,7,1,1,3),255,'SDF subtraction must retain the uncut first field');

worker.postMessage({
  type: 'render',
  id: 6,
  program: programFor([
    'sdfFill(sdfUnion(sdfCircle(x,y,2,3,1),sdfCircle(x,y,4,3,1)))*255',
    'sdfFill(sdfIntersect(sdfCircle(x,y,3,3,3),sdfBox(x,y,3,3,4,4,0)))*255',
    'sdfFill(sdfLine(x,y,0,0,6,6,1))*255',
    'sdfFill(sdfCircle(x,y,3,3,2),2)*255'
  ]),
  controls: defaultControlValues(),
  legacyMath: false
});
const sixth = new Uint8ClampedArray((await waitFor(message => message.type === 'result' && message.id === 6)).buffer);
assert.equal(pixel(sixth,7,2,3,0),255,'SDF union must include either input field');
assert.equal(pixel(sixth,7,3,3,1),255,'SDF intersection must include shared interior');
assert.equal(pixel(sixth,7,3,0,1),0,'SDF intersection must exclude points outside either field');
assert.equal(pixel(sixth,7,5,5,2),255,'SDF line distance must include its stroked segment');
assert.equal(pixel(sixth,7,5,4,2),0,'SDF line distance must exclude points beyond its hard edge');
const featheredSdf=pixel(sixth,7,6,3,3);
assert.ok(featheredSdf>0&&featheredSdf<255,'SDF fill must support outward feathering');

await worker.terminate();
console.log('Analytic shapes CPU smoke: pass.');
