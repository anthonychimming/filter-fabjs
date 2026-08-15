import assert from 'node:assert/strict';
import { Worker } from 'node:worker_threads';
import { Parser, VARS } from '../src/core/formula-language.js';
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

let renderId = 0;
const render = async formulas => {
  const id = ++renderId;
  const program = compileFilterProgram(formulas.map(formula => new Parser(formula).parse()));
  worker.postMessage({ type: 'render', id, program, controls: Array(8).fill(128), legacyMath: false });
  const message = await waitFor(result => result.type === 'result' && result.id === id);
  return new Uint8ClampedArray(message.buffer);
};

const result = await render(['255-r','255-g','255-b','a']);
assert.deepEqual([...new Uint8ClampedArray(result.buffer)], [245,235,225,255, 155,145,135,128]);

const numericEdges = await render(['round(0.5)*255','pow(-2,2)','c2d(0,0)','a']);
assert.deepEqual([...numericEdges], [255,4,0,255, 255,4,0,128], 'CPU fallback semantics must remain defined at GPU edge cases');

const mirroredEdge = await render(['srcMirror(X,y,0)','srcMirror(X,y,1)','srcMirror(X,y,2)','srcMirror(X,y,3)']);
assert.deepEqual([...mirroredEdge], [100,110,120,128, 100,110,120,128], 'CPU mirror sampling at X must select the final source column');

const chromaRanges = await render(['U','V','umax','vmax']);
assert.deepEqual([...chromaRanges], [110,156,55,78, 110,156,55,78], 'signed chroma variables must expose matching ranges and maxima');

const sourceText = workerProgram();
assert.doesNotMatch(sourceText, /const q=\{/, 'variable lookup must not allocate a complete variable object per access');
assert.match(sourceText, /function vars\(n,e\)\{const p=e\.p,z=e\.z;switch\(n\)/, 'variable lookup must dispatch lazily');
const variableBody = sourceText.match(/function vars\(n,e\)\{([\s\S]*?)\n\}return 0\}/)?.[1] || '';
const handledVariables = new Set([...variableBody.matchAll(/case'([^']+)'/g)].map(match => match[1]));
for (const name of VARS) assert.ok(handledVariables.has(name), `lazy CPU lookup must preserve variable ${name}`);
await worker.terminate();
console.log('CPU renderer smoke: pass.');
