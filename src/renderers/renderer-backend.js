/**
 * Filter FabJS
 * Modular source extracted from v2.0.7; modular architecture v2.1.0.
 * Licensed GPL-2.0-or-later. See LICENSE and README.md.
 */
export class RenderCancelledError extends Error{constructor(message='Render cancelled'){super(message);this.name='RenderCancelledError'}}
export class RendererBackend{
  constructor(id,label){this.id=id;this.label=label}
  setSource(){throw new Error(`${this.label} does not implement setSource()`)}
  render(){throw new Error(`${this.label} does not implement render()`)}
  cancel(){return Promise.resolve(false)}
  dispose(){}
}
