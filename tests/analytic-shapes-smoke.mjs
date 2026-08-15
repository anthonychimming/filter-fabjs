import assert from 'node:assert/strict';
import { Worker } from 'node:worker_threads';
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
const pixel = (pixels, x, y, channel) => pixels[(y * 7 + x) * 4 + channel];

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
  controls: Array(8).fill(128),
  legacyMath: false
});
const first = new Uint8ClampedArray((await waitFor(message => message.type === 'result' && message.id === 1)).buffer);
assert.equal(pixel(first,3,3,0),255,'circle center must be filled');
assert.equal(pixel(first,0,0,0),0,'circle exterior must be empty');
assert.equal(pixel(first,5,5,1),255,'line diagonal must be filled');
assert.equal(pixel(first,5,4,1),0,'line exterior must be empty without feathering');
assert.equal(pixel(first,3,3,2),255,'box center must be filled');
assert.equal(pixel(first,0,0,2),0,'box exterior must be empty');
assert.equal(pixel(first,3,3,3),255,'triangle center must be filled');
assert.equal(pixel(first,0,0,3),0,'triangle exterior must be empty');

worker.postMessage({
  type: 'render',
  id: 2,
  program: programFor([
    'ring(x,y,3,3,2,1,0)*255',
    'grid(x,y,3,3,1,0)*255',
    '0',
    '255'
  ]),
  controls: Array(8).fill(128),
  legacyMath: false
});
const second = new Uint8ClampedArray((await waitFor(message => message.type === 'result' && message.id === 2)).buffer);
assert.equal(pixel(second,5,3,0),255,'ring stroke must be filled');
assert.equal(pixel(second,3,3,0),0,'ring center must remain empty');
assert.equal(pixel(second,3,1,1),255,'grid line must be filled');
assert.equal(pixel(second,1,1,1),0,'grid cell interior must be empty');

worker.postMessage({
  type: 'render',
  id: 3,
  program: programFor([
    'sierpinski(x,y,3,3,6,3,0)*255',
    '0',
    '0',
    '255'
  ]),
  controls: Array(8).fill(128),
  legacyMath: false
});
const third = new Uint8ClampedArray((await waitFor(message => message.type === 'result' && message.id === 3)).buffer);
assert.equal(pixel(third,3,3,0),0,'Sierpiński center must be recursively removed');
assert.equal(pixel(third,2,4,0),255,'Sierpiński child triangle must remain filled');

await worker.terminate();
console.log('Analytic shapes CPU smoke: pass.');
