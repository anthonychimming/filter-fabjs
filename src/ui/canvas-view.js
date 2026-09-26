/**
 * Filter FabJS
 * Modular source extracted from v2.0.7; modular architecture v2.1.0.
 * Licensed GPL-2.0-or-later. See LICENSE and README.md.
 */

import { clamp } from '../core/utils.js';
import { imageDataFromPixels } from '../io/image-io.js';
export function createCanvasView({state,el,ctx}){
  let sourceCache=null,filteredCache=null,drawScheduled=false;
  let activePointer=null;
  const divider=el.splitDivider;
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
    Object.assign(el.splitOverlay.style,{left:`${image.left-stage.left}px`,top:`${image.top-stage.top}px`,width:`${image.width}px`,height:`${image.height}px`});
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
  if(divider){
    divider.addEventListener('pointerdown',event=>{
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
    const observer=new ResizeObserver(()=>{endSplitDrag();if(state.zoom==='fit')fitCanvas();else syncDivider();});
    observer.observe(el.stage);observer.observe(el.canvas);
  }
  function cachedImageData(pixels,cache){if(!cache||cache.pixels!==pixels||cache.width!==state.width||cache.height!==state.height)cache={pixels,width:state.width,height:state.height,imageData:imageDataFromPixels(pixels,state.width,state.height)};return cache}
  function invalidatePixels(){endSplitDrag();sourceCache=filteredCache=null}
  function drawView(){syncDivider();if(!state.source)return;ctx.clearRect(0,0,state.width,state.height);if(state.view==='original'||!state.filtered){sourceCache=cachedImageData(state.source,sourceCache);ctx.putImageData(sourceCache.imageData,0,0)}else if(state.view==='filtered'){filteredCache=cachedImageData(state.filtered,filteredCache);ctx.putImageData(filteredCache.imageData,0,0)}else{const cut=Math.round(state.width*state.split/100);sourceCache=cachedImageData(state.source,sourceCache);filteredCache=cachedImageData(state.filtered,filteredCache);ctx.putImageData(sourceCache.imageData,0,0,0,0,cut,state.height);ctx.putImageData(filteredCache.imageData,0,0,cut,0,state.width-cut,state.height);}}
  function requestDraw(){if(drawScheduled)return;drawScheduled=true;requestAnimationFrame(()=>{drawScheduled=false;drawView()})}
  function fitCanvas(){if(!state.width)return;const rect=el.stage.getBoundingClientRect();state.zoomLevel=Math.min(Math.max(100,rect.width-48)/state.width,Math.max(100,rect.height-48)/state.height,1);state.zoom='fit';applyZoom();}
  function applyZoom(){endSplitDrag();el.wrap.style.width=`${Math.round(state.width*state.zoomLevel)}px`;el.wrap.style.height=`${Math.round(state.height*state.zoomLevel)}px`;el.canvas.style.width=el.canvas.style.height='100%';el.zoomLabel.textContent=state.zoom==='fit'?'Fit':`${Math.round(state.zoomLevel*100)}%`;syncDivider();}
  function zoom(factor){state.zoom='manual';state.zoomLevel=clamp(state.zoomLevel*factor,.1,4);applyZoom();}
  return{drawView,requestDraw,invalidatePixels,fitCanvas,applyZoom,zoom};
}
