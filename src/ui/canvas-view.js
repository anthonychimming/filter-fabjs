/**
 * Filter FabJS
 * Modular source extracted from v2.0.7; modular architecture v2.1.0.
 * Licensed GPL-2.0-or-later. See LICENSE and README.md.
 */

import { clamp } from '../core/utils.js';
import { imageDataFromPixels } from '../io/image-io.js';
export function createCanvasView({state,el,ctx}){
  function drawView(){if(!state.source)return;ctx.clearRect(0,0,state.width,state.height);if(state.view==='original'||!state.filtered)ctx.putImageData(imageDataFromPixels(state.source,state.width,state.height),0,0);else if(state.view==='filtered')ctx.putImageData(imageDataFromPixels(state.filtered,state.width,state.height),0,0);else{const cut=Math.round(state.width*state.split/100);ctx.putImageData(imageDataFromPixels(state.source,state.width,state.height),0,0,0,0,cut,state.height);ctx.putImageData(imageDataFromPixels(state.filtered,state.width,state.height),0,0,cut,0,state.width-cut,state.height);ctx.save();ctx.strokeStyle='rgba(255,255,255,.92)';ctx.lineWidth=Math.max(1,state.width/700);ctx.beginPath();ctx.moveTo(cut,0);ctx.lineTo(cut,state.height);ctx.stroke();ctx.restore();}}
  function fitCanvas(){if(!state.width)return;const rect=el.stage.getBoundingClientRect();state.zoomLevel=Math.min(Math.max(100,rect.width-48)/state.width,Math.max(100,rect.height-48)/state.height,1);state.zoom='fit';applyZoom();}
  function applyZoom(){el.wrap.style.width=`${Math.round(state.width*state.zoomLevel)}px`;el.wrap.style.height=`${Math.round(state.height*state.zoomLevel)}px`;el.canvas.style.width=el.canvas.style.height='100%';el.zoomLabel.textContent=state.zoom==='fit'?'Fit':`${Math.round(state.zoomLevel*100)}%`;}
  function zoom(factor){state.zoom='manual';state.zoomLevel=clamp(state.zoomLevel*factor,.1,4);applyZoom();}
  return{drawView,fitCanvas,applyZoom,zoom};
}
