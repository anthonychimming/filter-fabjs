/**
 * Filter FabJS
 * Modular source extracted from v2.0.7; modular architecture v2.1.0.
 * Licensed GPL-2.0-or-later. See LICENSE and README.md.
 */

import { clamp } from '../core/utils.js';
import { imageDataFromPixels } from '../io/image-io.js';
export function createCanvasView({state,el,ctx,canInteract=()=>true}){
  let sourceCache=null,filteredCache=null,drawScheduled=false;
  let activePointer=null;
  let splitTap=null, middleGesture=null;
  const divider=el.splitDivider;
  function syncView(){
    for(const button of el.viewButtons||[]){const selected=state.view===button.dataset.view;button.classList.toggle('active',selected);button.setAttribute('aria-pressed',String(selected));}
    if(el.viewLabel)el.viewLabel.textContent=`View: ${state.view==='filtered'?'Filtered':state.view==='original'?'Original':'Split'}`;
  }
  function toggleView(mode){
    if(state.isRendering||!['original','split'].includes(mode))return;
    cancelTap();state.view=state.view===mode?'filtered':mode;drawView();
  }
  function endSplitDrag(){
    if(activePointer===null)return;
    const pointer=activePointer;activePointer=null;
    divider.removeAttribute('data-dragging');
    if(divider.hasPointerCapture(pointer))divider.releasePointerCapture(pointer);
  }
  function syncDivider(){
    if(!divider)return;
    const visible=state.view==='split'&&Boolean(state.source);
    el.splitOverlay.hidden=!visible;
    if(!visible){endSplitDrag();return;}
    const image=el.canvas.getBoundingClientRect(),stage=el.stage.getBoundingClientRect();
    Object.assign(el.splitOverlay.style,{left:`${image.left-stage.left+(el.stage.scrollLeft||0)}px`,top:`${image.top-stage.top+(el.stage.scrollTop||0)}px`,width:`${image.width}px`,height:`${image.height}px`});
    // Align with the existing integer-pixel comparison boundary.
    divider.style.left=`${Math.round(state.width*state.split/100)/state.width*100}%`;
    divider.setAttribute('aria-valuenow',String(state.split));
    divider.setAttribute('aria-valuetext',`${state.split}% Original, ${100-state.split}% Filtered`);
  }
  function setSplit(value){state.split=clamp(value,0,100);syncDivider();requestDraw();}
  function moveSplit(event){
    const image=el.canvas.getBoundingClientRect();
    if(image.width>0)setSplit(Math.round((event.clientX-image.left)/image.width*100));
  }
  // A tap is a pointer sequence on the image itself. Never capture it or
  // prevent its default action: scrolling and native touch gestures retain priority.
  function insideImage(event){
    const image=el.canvas.getBoundingClientRect(),stage=el.stage.getBoundingClientRect();
    return event.clientX>=Math.max(image.left,stage.left)&&event.clientX<=Math.min(image.left+image.width,stage.left+stage.width)&&event.clientY>=Math.max(image.top,stage.top)&&event.clientY<=Math.min(image.top+image.height,stage.top+stage.height);
  }
  function cancelTap(){splitTap=null;}
  function navigationAllowed(){return Boolean(state.source&&state.width&&state.height&&!state.isRendering&&canInteract());}
  // Only the stage, image and noninteractive overlay are navigation surfaces.
  function navigationTarget(target){return target===el.stage||target===el.wrap||target===el.canvas||target===el.splitOverlay;}
  function endMiddleGesture(){
    if(!middleGesture)return;
    const id=middleGesture.id;middleGesture=null;
    el.stage.removeAttribute?.('data-panning');
    if(el.stage.hasPointerCapture?.(id))el.stage.releasePointerCapture(id);
  }
  el.stage.addEventListener?.('wheel',event=>{
    if(event.ctrlKey||!event.deltaY||!navigationAllowed()||!navigationTarget(event.target))return;
    const image=el.canvas.getBoundingClientRect();
    if(!image.width||!image.height)return;
    event.preventDefault();
    const unit=event.deltaMode===1?16:event.deltaMode===2?el.stage.clientHeight:1;
    const delta=clamp(event.deltaY*unit,-500,500),level=clamp(state.zoomLevel*Math.exp(-delta*.0015),.1,4);
    if(level===state.zoomLevel)return;
    // Whitespace uses the closest image point, avoiding extrapolation.
    const x=clamp(event.clientX,image.left,image.left+image.width),y=clamp(event.clientY,image.top,image.top+image.height);
    const fx=(x-image.left)/image.width,fy=(y-image.top)/image.height;
    state.zoom='manual';state.zoomLevel=level;applyZoom();
    const updated=el.canvas.getBoundingClientRect();
    el.stage.scrollLeft+=updated.left+fx*updated.width-x;
    el.stage.scrollTop+=updated.top+fy*updated.height-y;
    syncDivider();
  },{passive:false});
  el.stage.addEventListener?.('pointerdown',event=>{
    if(event.pointerType!=='mouse'||event.button!==1||middleGesture||!navigationAllowed()||!navigationTarget(event.target))return;
    event.preventDefault();cancelTap();endSplitDrag();
    middleGesture={id:event.pointerId,x:event.clientX,y:event.clientY,left:el.stage.scrollLeft||0,top:el.stage.scrollTop||0,dragged:false,source:state.source};
    el.stage.setPointerCapture?.(event.pointerId);
  });
  el.stage.addEventListener?.('pointermove',event=>{
    const gesture=middleGesture;if(!gesture||event.pointerId!==gesture.id)return;
    if(!navigationAllowed()||gesture.source!==state.source||(event.buttons&4)===0){endMiddleGesture();return;}
    const dx=event.clientX-gesture.x,dy=event.clientY-gesture.y;
    if(Math.hypot(dx,dy)>4)gesture.dragged=true;
    if(gesture.dragged){event.preventDefault();el.stage.setAttribute?.('data-panning','');el.stage.scrollLeft=gesture.left-dx;el.stage.scrollTop=gesture.top-dy;syncDivider();}
  });
  el.stage.addEventListener?.('pointerup',event=>{
    const gesture=middleGesture;if(!gesture||event.pointerId!==gesture.id)return;
    event.preventDefault();endMiddleGesture();
  });
  for(const type of ['pointercancel','lostpointercapture'])el.stage.addEventListener?.(type,event=>{if(middleGesture?.id===event.pointerId)endMiddleGesture();});
  el.stage.addEventListener?.('auxclick',event=>{if(event.button===1&&navigationTarget(event.target))event.preventDefault();});
  el.stage.ownerDocument?.defaultView?.addEventListener('blur',endMiddleGesture);
  el.stage.addEventListener?.('pointerdown',event=>{
    const pending=splitTap;cancelTap();
    if(pending||state.isRendering||state.view!=='split'||!state.source||activePointer!==null||event.button!==0||event.isPrimary===false||event.target!==el.canvas||!insideImage(event))return;
    splitTap={id:event.pointerId,x:event.clientX,y:event.clientY};
  });
  function trackTapMovement(event){
    if(splitTap&&event.pointerId===splitTap.id&&Math.hypot(event.clientX-splitTap.x,event.clientY-splitTap.y)>6)cancelTap();
  }
  el.stage.addEventListener?.('pointermove',trackTapMovement);
  el.stage.addEventListener?.('pointerup',event=>{
    const tap=splitTap;cancelTap();
    if(!tap||event.pointerId!==tap.id||event.isPrimary===false||event.button!==0||event.target!==el.canvas||activePointer!==null||state.isRendering||state.view!=='split'||!state.source)return;
    if(Math.hypot(event.clientX-tap.x,event.clientY-tap.y)<=6&&insideImage(event))moveSplit(event);
  });
  for(const type of ['pointercancel','lostpointercapture','dragstart','dragenter','wheel','scroll'])el.stage.addEventListener?.(type,cancelTap);
  // A second touch anywhere cancels the candidate, including outside the stage.
  el.stage.ownerDocument?.addEventListener('pointerdown',event=>{if(event.isPrimary===false)cancelTap();},true);
  el.stage.ownerDocument?.addEventListener('pointermove',trackTapMovement,true);
  el.stage.ownerDocument?.addEventListener('pointerup',cancelTap);
  el.stage.ownerDocument?.addEventListener('pointercancel',cancelTap);
  if(divider){
    divider.addEventListener('pointerdown',event=>{
      cancelTap();
      if(state.view!=='split'||!state.source||activePointer!==null||event.button!==0||event.isPrimary===false)return;
      event.preventDefault();divider.focus({preventScroll:true});
      divider.setPointerCapture(event.pointerId);activePointer=event.pointerId;
      divider.setAttribute('data-dragging','');moveSplit(event);
    });
    divider.addEventListener('pointermove',event=>{if(event.pointerId===activePointer)moveSplit(event);});
    for(const type of ['pointerup','pointercancel','lostpointercapture'])divider.addEventListener(type,event=>{if(event.pointerId===activePointer)endSplitDrag();});
    divider.addEventListener('keydown',event=>{
      if(state.view!=='split'||!state.source)return;
      const step=event.shiftKey?5:1;
      const value=event.key==='ArrowLeft'?state.split-step:event.key==='ArrowRight'?state.split+step:event.key==='Home'?0:event.key==='End'?100:null;
      if(value!==null){event.preventDefault();setSplit(value);}
    });
    const observer=new ResizeObserver(()=>{cancelTap();endSplitDrag();if(state.zoom==='fit')fitCanvas();else syncDivider();});
    observer.observe(el.stage);observer.observe(el.canvas);
    if(el.canvasToolbar)observer.observe(el.canvasToolbar);
    el.stage.addEventListener?.('scroll',syncDivider);
  }
  function cachedImageData(pixels,cache){if(!cache||cache.pixels!==pixels||cache.width!==state.width||cache.height!==state.height)cache={pixels,width:state.width,height:state.height,imageData:imageDataFromPixels(pixels,state.width,state.height)};return cache}
  function invalidatePixels(){cancelTap();endSplitDrag();endMiddleGesture();sourceCache=filteredCache=null}
  function drawView(){syncView();syncDivider();if(!state.source)return;ctx.clearRect(0,0,state.width,state.height);if(state.view==='original'||!state.filtered){sourceCache=cachedImageData(state.source,sourceCache);ctx.putImageData(sourceCache.imageData,0,0)}else if(state.view==='filtered'){filteredCache=cachedImageData(state.filtered,filteredCache);ctx.putImageData(filteredCache.imageData,0,0)}else{const cut=Math.round(state.width*state.split/100);sourceCache=cachedImageData(state.source,sourceCache);filteredCache=cachedImageData(state.filtered,filteredCache);ctx.putImageData(sourceCache.imageData,0,0,0,0,cut,state.height);ctx.putImageData(filteredCache.imageData,0,0,cut,0,state.width-cut,state.height);}}
  function requestDraw(){if(drawScheduled)return;drawScheduled=true;requestAnimationFrame(()=>{drawScheduled=false;drawView()})}
  function fitCanvas(){
    if(!state.width)return;
    const rect=el.stage.getBoundingClientRect(),rail=el.canvasToolbar?.getBoundingClientRect();
    let left=24,bottom=24;
    if(rail){if(rail.width>rail.height)bottom=Math.max(24,rect.top+rect.height-rail.top+12);else left=Math.max(24,rail.left+rail.width-rect.left+12);}
    el.stage.style?.setProperty('--canvas-left',`${left}px`);el.stage.style?.setProperty('--canvas-bottom',`${bottom}px`);
    state.zoomLevel=Math.min(Math.max(1,rect.width-left-24)/state.width,Math.max(1,rect.height-bottom-24)/state.height,1);state.zoom='fit';applyZoom();
  }
  function applyZoom(){cancelTap();endSplitDrag();el.stage.setAttribute?.('data-manual-zoom',String(state.zoom==='manual'));el.wrap.style.width=`${Math.round(state.width*state.zoomLevel)}px`;el.wrap.style.height=`${Math.round(state.height*state.zoomLevel)}px`;el.canvas.style.width=el.canvas.style.height='100%';el.zoomLabel.textContent=`${Math.round(state.zoomLevel*100)}%`;syncDivider();}
  function zoom(factor){state.zoom='manual';state.zoomLevel=clamp(state.zoomLevel*factor,.1,4);applyZoom();}
  syncView();
  function captureViewport(){return {zoom:state.zoom,zoomLevel:state.zoomLevel,left:el.stage.scrollLeft||0,top:el.stage.scrollTop||0};}
  function restoreViewport(saved){
    state.zoom=saved.zoom;state.zoomLevel=saved.zoomLevel;
    if(saved.zoom==='fit')fitCanvas();else applyZoom();
    el.stage.scrollLeft=saved.left;el.stage.scrollTop=saved.top;syncDivider();
  }
  return{drawView,requestDraw,invalidatePixels,fitCanvas,applyZoom,zoom,toggleView,captureViewport,restoreViewport,endMiddleGesture};
}
