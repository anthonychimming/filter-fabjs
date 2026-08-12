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
  const timeout = setTimeout(() => reject(new Error('Worker smoke test timed out')), 5000);
  const onMessage = message => {
    if (!predicate(message)) return;
    clearTimeout(timeout);
    worker.off('message', onMessage);
    resolve(message);
  };
  worker.on('message', onMessage);
});

const source = new Uint8ClampedArray([10,20,30,255, 100,110,120,128]);
worker.postMessage({ type: 'init', width: 2, height: 1, buffer: source.buffer }, [source.buffer]);
await waitFor(message => message.type === 'ready');

const program = compileFilterProgram(['255-r','255-g','255-b','a'].map(formula => new Parser(formula).parse()));
worker.postMessage({ type: 'render', id: 1, program, controls: Array(8).fill(128), legacyMath: false });
const result = await waitFor(message => message.type === 'result' && message.id === 1);
assert.deepEqual([...new Uint8ClampedArray(result.buffer)], [245,235,225,255, 155,145,135,128]);
await worker.terminate();
console.log('CPU renderer smoke: pass.');
