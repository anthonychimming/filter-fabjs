import assert from 'node:assert/strict';
import { imageDataFromPixels } from '../src/io/image-io.js';
import { createCanvasView } from '../src/ui/canvas-view.js';

const imageDataDescriptor=Object.getOwnPropertyDescriptor(globalThis,'ImageData'),animationFrameDescriptor=Object.getOwnPropertyDescriptor(globalThis,'requestAnimationFrame');
let imageDataCreations=0,nextFrame=1;const frames=[];
class TestImageData{constructor(data,width,height){imageDataCreations++;this.data=data;this.width=width;this.height=height}}

try{
  Object.defineProperty(globalThis,'ImageData',{configurable:true,value:TestImageData});
  Object.defineProperty(globalThis,'requestAnimationFrame',{configurable:true,value:callback=>{frames.push(callback);return nextFrame++}});

  const directPixels=new Uint8ClampedArray([1,2,3,255]),direct=imageDataFromPixels(directPixels,1,1),converted=imageDataFromPixels([4,5,6,255],1,1);
  assert.equal(direct.data,directPixels,'ImageData must reuse an existing Uint8ClampedArray without copying it');
  assert.ok(converted.data instanceof Uint8ClampedArray,'non-clamped pixel inputs must still be normalized safely');

  const state={source:new Uint8ClampedArray([10,20,30,255]),filtered:new Uint8ClampedArray([40,50,60,255]),width:1,height:1,view:'split',split:50,zoom:'fit',zoomLevel:1};
  const puts=[];let clears=0;const ctx={clearRect(){clears++},putImageData(...args){puts.push(args)},save(){},restore(){},beginPath(){},moveTo(){},lineTo(){},stroke(){}};
  const el={stage:{getBoundingClientRect(){return{width:100,height:100}}},wrap:{style:{}},canvas:{style:{}},zoomLabel:{textContent:''}},view=createCanvasView({state,el,ctx}),baseline=imageDataCreations;
  view.drawView();const sourceImageData=puts[0][0],filteredImageData=puts[1][0];
  assert.equal(imageDataCreations-baseline,2,'the first split draw must create one ImageData wrapper per pixel array');
  assert.equal(sourceImageData.data,state.source);assert.equal(filteredImageData.data,state.filtered);
  view.drawView();assert.equal(imageDataCreations-baseline,2,'unchanged split redraws must reuse both ImageData wrappers');
  assert.equal(puts[2][0],sourceImageData);assert.equal(puts[3][0],filteredImageData);

  state.filtered=new Uint8ClampedArray([70,80,90,255]);view.drawView();assert.equal(imageDataCreations-baseline,3,'replacing filtered pixels must invalidate only the filtered ImageData cache');
  assert.equal(puts[4][0],sourceImageData);assert.notEqual(puts[5][0],filteredImageData);

  view.invalidatePixels();view.drawView();assert.equal(imageDataCreations-baseline,5,'a source change must explicitly release and rebuild both cached wrappers');

  const clearsBeforeFrame=clears;view.requestDraw();view.requestDraw();view.requestDraw();assert.equal(frames.length,1,'multiple split inputs in one frame must schedule one redraw');assert.equal(clears,clearsBeforeFrame,'scheduled redraw must wait for the animation frame');frames.shift()();assert.equal(clears,clearsBeforeFrame+1);
}finally{
  if(imageDataDescriptor)Object.defineProperty(globalThis,'ImageData',imageDataDescriptor);else delete globalThis.ImageData;
  if(animationFrameDescriptor)Object.defineProperty(globalThis,'requestAnimationFrame',animationFrameDescriptor);else delete globalThis.requestAnimationFrame;
}

console.log('Canvas view zero-copy and redraw coalescing smoke: pass.');
