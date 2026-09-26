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

  const listeners={},attrs={},captures=new Set();let resize;
  const oldObserver=globalThis.ResizeObserver;
  globalThis.ResizeObserver=class{constructor(callback){resize=callback}observe(){}};
  try{
    const divider={style:{},addEventListener(type,fn){listeners[type]=fn},setAttribute(k,v){attrs[k]=v},removeAttribute(k){delete attrs[k]},focus(){},setPointerCapture(id){captures.add(id)},hasPointerCapture(id){return captures.has(id)},releasePointerCapture(id){captures.delete(id)}};
    let bounds={left:120,top:80,width:400,height:200};
    const overlay={style:{},hidden:true};
    const preview={...el,splitDivider:divider,splitOverlay:overlay,canvas:{style:{},getBoundingClientRect:()=>bounds},stage:{getBoundingClientRect:()=>({left:20,top:30,width:600,height:400})}};
    state.width=800;state.height=400;state.split=50;state.zoom='manual';
    const interactive=createCanvasView({state,el:preview,ctx});
    interactive.drawView();
    assert.equal(overlay.style.left,'100px');assert.equal(overlay.style.top,'50px');assert.equal(divider.style.left,'50%');
    const fire=(type,extra={})=>listeners[type]({pointerId:1,button:0,isPrimary:true,clientX:320,preventDefault(){},...extra});
    for(const pointerType of ['mouse','touch','pen']){
      fire('pointerdown',{pointerType,clientX:220});assert.equal(state.split,25);assert.ok(captures.has(1));
      fire('pointermove',{clientX:420});assert.equal(state.split,75);
      fire('pointermove',{pointerId:2,clientX:120});assert.equal(state.split,75,'secondary pointer cannot move split');
      fire('pointermove',{clientX:900});assert.equal(state.split,100);
      fire('pointermove',{clientX:0});assert.equal(state.split,0);
      fire('pointerup');assert.equal(captures.size,0);assert.equal(attrs['data-dragging'],undefined);
    }
    for(const type of ['pointercancel','lostpointercapture']){
      fire('pointerdown');fire(type);fire('pointermove',{clientX:500});assert.equal(state.split,50);assert.equal(captures.size,0);
    }
    for(const [key,shiftKey,value] of [['ArrowLeft',false,49],['ArrowRight',false,50],['ArrowLeft',true,45],['ArrowRight',true,50],['Home',false,0],['ArrowLeft',false,0],['End',false,100],['ArrowRight',false,100]]){
      fire('keydown',{key,shiftKey});assert.equal(state.split,value);assert.equal(attrs['aria-valuenow'],String(value));
    }
    fire('pointerdown',{clientX:220});state.view='original';interactive.drawView();assert.ok(overlay.hidden);assert.equal(captures.size,0);
    state.view='split';interactive.drawView();assert.equal(state.split,25);assert.equal(overlay.hidden,false);
    fire('pointerdown');interactive.invalidatePixels();assert.equal(captures.size,0);
    fire('pointerdown');bounds={left:200,top:100,width:200,height:400};resize();assert.equal(captures.size,0);assert.equal(overlay.style.width,'200px');
    fire('pointerdown',{clientX:250});assert.equal(state.split,25,'resized image bounds must drive coordinates');fire('pointerup');
    interactive.zoom(1.2);assert.equal(divider.style.left,'25%');
    state.view='filtered';interactive.drawView();assert.ok(overlay.hidden);
  }finally{if(oldObserver)globalThis.ResizeObserver=oldObserver;else delete globalThis.ResizeObserver;}
}finally{
  if(imageDataDescriptor)Object.defineProperty(globalThis,'ImageData',imageDataDescriptor);else delete globalThis.ImageData;
  if(animationFrameDescriptor)Object.defineProperty(globalThis,'requestAnimationFrame',animationFrameDescriptor);else delete globalThis.requestAnimationFrame;
}

console.log('Canvas view zero-copy and redraw coalescing smoke: pass.');
