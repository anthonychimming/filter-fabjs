/**
 * Filter FabJS
 * Modular source extracted from v2.0.7; modular architecture v2.1.0.
 * Licensed GPL-2.0-or-later. See LICENSE and README.md.
 */

import { clamp } from '../core/utils.js';
import { imageDataFromPixels } from '../io/image-io.js';
export function createCanvasView({state,el,ctx}){
  let sourceCache=null,filteredCache=null,drawScheduled=false;
  function cachedImageData(pixels,cache){if(!cache||cache.pixels!==pixels||cache.width!==state.width||cache.height!==state.height)cache={pixels,width:state.width,height:state.height,imageData:imageDataFromPixels(pixels,state.width,state.height)};return cache}
  function invalidatePixels(){sourceCache=filteredCache=null}
  function drawView(){if(!state.source)return;ctx.clearRect(0,0,state.width,state.height);if(state.view==='original'||!state.filtered){sourceCache=cachedImageData(state.source,sourceCache);ctx.putImageData(sourceCache.imageData,0,0)}else if(state.view==='filtered'){filteredCache=cachedImageData(state.filtered,filteredCache);ctx.putImageData(filteredCache.imageData,0,0)}else{const cut=Math.round(state.width*state.split/100);sourceCache=cachedImageData(state.source,sourceCache);filteredCache=cachedImageData(state.filtered,filteredCache);ctx.putImageData(sourceCache.imageData,0,0,0,0,cut,state.height);ctx.putImageData(filteredCache.imageData,0,0,cut,0,state.width-cut,state.height);ctx.save();ctx.strokeStyle='rgba(255,255,255,.92)';ctx.lineWidth=Math.max(1,state.width/700);ctx.beginPath();ctx.moveTo(cut,0);ctx.lineTo(cut,state.height);ctx.stroke();ctx.restore();}}
  function requestDraw(){if(drawScheduled)return;drawScheduled=true;requestAnimationFrame(()=>{drawScheduled=false;drawView()})}
  function fitCanvas(){if(!state.width)return;const rect=el.stage.getBoundingClientRect();state.zoomLevel=Math.min(Math.max(100,rect.width-48)/state.width,Math.max(100,rect.height-48)/state.height,1);state.zoom='fit';applyZoom();}
  function applyZoom(){el.wrap.style.width=`${Math.round(state.width*state.zoomLevel)}px`;el.wrap.style.height=`${Math.round(state.height*state.zoomLevel)}px`;el.canvas.style.width=el.canvas.style.height='100%';el.zoomLabel.textContent=state.zoom==='fit'?'Fit':`${Math.round(state.zoomLevel*100)}%`;}
  function zoom(factor){state.zoom='manual';state.zoomLevel=clamp(state.zoomLevel*factor,.1,4);applyZoom();}
  return{drawView,requestDraw,invalidatePixels,fitCanvas,applyZoom,zoom};
}
