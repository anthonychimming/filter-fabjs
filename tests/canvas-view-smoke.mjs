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
  const el={stage:{getBoundingClientRect(){return{width:100,height:100}}},wrap:{style:{}},canvas:{style:{}},zoomLabel:{textContent:''}},view=createCanvasView({state,el,ctx});
  const buttons=['original','split'].map(mode=>({dataset:{view:mode},classList:{toggle(){}},setAttribute(k,v){this[k]=v;}}));
  const transitionEl={...el,viewButtons:buttons,viewLabel:{}};
  const transitionView=createCanvasView({state,el:transitionEl,ctx:{clearRect(){},putImageData(){}}});
  const snapshot={source:state.source,filtered:state.filtered,split:state.split};
  for(const [start,action,result] of [['filtered','original','original'],['original','original','filtered'],['split','original','original'],['filtered','split','split'],['split','split','filtered'],['original','split','split']]){
    state.view=start;transitionView.toggleView(action);assert.equal(state.view,result);
    assert.equal(buttons[0]['aria-pressed'],String(result==='original'));assert.equal(buttons[1]['aria-pressed'],String(result==='split'));
    assert.equal(transitionEl.viewLabel.textContent,`View: ${result[0].toUpperCase()+result.slice(1)}`);
    assert.equal(state.source,snapshot.source);assert.equal(state.filtered,snapshot.filtered);assert.equal(state.split,snapshot.split);
  }
  state.isRendering=true;transitionView.toggleView('original');assert.equal(state.view,'split');state.isRendering=false;
  const baseline=imageDataCreations;puts.length=0;
  const fitState={...state,width:1000,height:800,zoom:'fit'},insets={};
  let stageRect={left:0,top:0,width:1200,height:900},railRect={left:14,top:14,width:50,height:254};
  const fitEl={...el,stage:{style:{setProperty(k,v){insets[k]=v}},getBoundingClientRect:()=>stageRect},canvasToolbar:{getBoundingClientRect:()=>railRect},zoomLabel:{}};
  const fitView=createCanvasView({state:fitState,el:fitEl,ctx});
  fitView.fitCanvas();assert.equal(fitState.zoomLevel,1,'Fit never enlarges');assert.equal(fitEl.zoomLabel.textContent,'100%');assert.equal(insets['--canvas-left'],'76px');
  stageRect={left:0,top:0,width:600,height:500};railRect={left:160,top:432,width:280,height:54};fitView.fitCanvas();
  assert.equal(insets['--canvas-bottom'],'80px');assert.equal(fitState.zoomLevel,.495,'horizontal rail reserves measured bottom space');assert.equal(fitEl.zoomLabel.textContent,'50%');
  fitView.zoom(1.2);assert.equal(fitState.zoomLevel,.594);assert.equal(fitState.zoom,'manual');assert.equal(fitEl.zoomLabel.textContent,'59%');
  fitView.zoom(100);assert.equal(fitState.zoomLevel,4);fitView.zoom(.0001);assert.equal(fitState.zoomLevel,.1);
  fitState.width=2000;fitState.height=4000;fitView.fitCanvas();assert.equal(fitState.zoomLevel,.099,'source replacement uses new dimensions');
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
    const stageListeners={},documentListeners={};
    const preview={...el,splitDivider:divider,splitOverlay:overlay,canvas:{style:{},getBoundingClientRect:()=>bounds},stage:{getBoundingClientRect:()=>({left:20,top:30,width:600,height:400}),addEventListener(type,fn){(stageListeners[type]??=[]).push(fn)},ownerDocument:{addEventListener(type,fn){(documentListeners[type]??=[]).push(fn)}}}};
    state.width=800;state.height=400;state.split=50;state.zoom='manual';
    const interactive=createCanvasView({state,el:preview,ctx});
    interactive.drawView();
    assert.equal(overlay.style.left,'100px');assert.equal(overlay.style.top,'50px');assert.equal(divider.style.left,'50%');
    const stageFire=(type,extra={})=>{const event={pointerId:1,button:0,isPrimary:true,clientX:320,clientY:180,target:preview.canvas,...extra};for(const fn of stageListeners[type]||[])fn(event);};
    const tap=(x,extra={})=>{stageFire('pointerdown',{clientX:x,...extra});stageFire('pointerup',{clientX:x,...extra});};
    for(const [x,value] of [[120,0],[320,50],[520,100]]){tap(x);assert.equal(state.split,value,'image taps map to image-relative positions');assert.equal(attrs['aria-valuenow'],String(value));}
    state.split=50;
    for(const extra of [{clientY:79},{clientY:281},{button:2},{isPrimary:false},{target:divider},{target:overlay}]){tap(220,extra);assert.equal(state.split,50);}
    for(const type of ['pointercancel','lostpointercapture','wheel','scroll','dragstart','dragenter']){stageFire('pointerdown',{clientX:220});stageFire(type);stageFire('pointerup',{clientX:220});assert.equal(state.split,50,`${type} cancels a tap`);}
    stageFire('pointerdown',{clientX:220});stageFire('pointermove',{clientX:235});stageFire('pointerup',{clientX:220});assert.equal(state.split,50,'movement out and back is still a drag');
    stageFire('pointerdown',{clientX:119});stageFire('pointerup',{clientX:120});assert.equal(state.split,50,'both endpoints must be in bounds');
    stageFire('pointerdown',{clientX:520});stageFire('pointerup',{clientX:521});assert.equal(state.split,50);
    stageFire('pointerdown',{clientX:220});stageFire('pointerup',{clientX:220,pointerId:2});stageFire('pointerup',{clientX:220});assert.equal(state.split,50,'unrelated pointer release cancels');
    stageFire('pointerdown',{clientX:220});for(const fn of documentListeners.pointerdown)fn({isPrimary:false});stageFire('pointerup',{clientX:220});assert.equal(state.split,50,'multitouch cancels even outside stage');
    stageFire('pointerdown',{clientX:220});for(const fn of documentListeners.pointermove)fn({pointerId:1,clientX:900,clientY:180});stageFire('pointerup',{clientX:220});assert.equal(state.split,50,'drag outside the stage and back is canceled');
    state.isRendering=true;tap(220);assert.equal(state.split,50);state.isRendering=false;
    state.view='original';tap(220);assert.equal(state.split,50);state.view='split';
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
    tap(350);assert.equal(state.split,75,'taps follow current resized image bounds');
    bounds={left:-100,top:-100,width:800,height:800};preview.stage.scrollLeft=200;preview.stage.scrollTop=180;
    tap(300);assert.equal(state.split,50,'zoomed/scrolled image uses viewport coordinates');
    tap(0);assert.equal(state.split,50,'off-viewport portion of the image is not interactive');
    stageFire('pointerdown',{clientX:300});resize();stageFire('pointerup',{clientX:300});assert.equal(state.split,50,'resize cancels pending taps');
    state.view='filtered';interactive.drawView();assert.ok(overlay.hidden);
  }finally{if(oldObserver)globalThis.ResizeObserver=oldObserver;else delete globalThis.ResizeObserver;}
}finally{
  if(imageDataDescriptor)Object.defineProperty(globalThis,'ImageData',imageDataDescriptor);else delete globalThis.ImageData;
  if(animationFrameDescriptor)Object.defineProperty(globalThis,'requestAnimationFrame',animationFrameDescriptor);else delete globalThis.requestAnimationFrame;
}

console.log('Canvas view zero-copy and redraw coalescing smoke: pass.');
