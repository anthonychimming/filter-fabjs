import assert from 'node:assert/strict';
import { RendererManager } from '../src/renderers/renderer-manager.js';

class DeferredRenderer {
  constructor() {
    this.calls = [];
    this.pending = [];
  }

  setSource(pixels, width, height) {
    this.calls.push({ first: pixels[0], width, height });
    return new Promise(resolve => this.pending.push(resolve));
  }

  cancel() { return false; }
  dispose() {}
}

const renderer = new DeferredRenderer();
const manager = new RendererManager({ cpu: () => renderer });

await manager.setSource(new Uint8ClampedArray([1, 0, 0, 255]), 1, 1);
const firstGet = manager.get('cpu');
await Promise.resolve();
assert.deepEqual(renderer.calls, [{ first: 1, width: 1, height: 1 }]);

await manager.setSource(new Uint8ClampedArray([2, 0, 0, 255]), 1, 1);
const secondGet = manager.get('cpu');
assert.equal(renderer.calls.length, 1, 'concurrent get() calls must share one source synchronization');

renderer.pending.shift()();
while (renderer.calls.length < 2) await Promise.resolve();
assert.deepEqual(renderer.calls[1], { first: 2, width: 1, height: 1 }, 'source changes during upload must trigger the latest upload');
renderer.pending.shift()();

assert.equal(await firstGet, renderer);
assert.equal(await secondGet, renderer);
assert.equal(manager.instanceVersions.get('cpu'), 2, 'only the uploaded source generation may be recorded');
manager.dispose();

console.log('Renderer manager synchronization smoke: pass.');
