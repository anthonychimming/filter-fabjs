/**
 * Filter FabJS
 * Modular source extracted from v2.0.7; modular architecture v2.1.0.
 * Licensed GPL-2.0-or-later. See LICENSE and README.md.
 */

import { $, $$, clamp } from '../core/utils.js';
export function createControlsController({state,el,scheduleRender,applyInteractionLocks,compileCurrentProgram}){
  function updateControlUsage(program){state.usedControls=program?.metadata?.controlMask?[...program.metadata.controlMask]:Array(8).fill(true);const count=state.usedControls.filter(Boolean).length;el.controlsUsage.textContent=count?`${count} active · 0–255`:'No controls used';applyInteractionLocks();}
  function refreshControlUsage(){try{updateControlUsage(compileCurrentProgram())}catch{updateControlUsage(null)}}
  function buildSliders(){const grid=$('#sliderGrid');grid.innerHTML='';for(let i=0;i<8;i++){const row=document.createElement('div');row.className='slider-row';row.innerHTML=`<span class="slider-index">${i}</span><input class="slider-label" type="text"><input class="slider-range" type="range" min="0" max="255"><input class="slider-value" type="number" min="0" max="255">`;const label=$('.slider-label',row),range=$('.slider-range',row),number=$('.slider-value',row);label.value=state.labels[i];range.value=number.value=state.controls[i];label.oninput=()=>state.labels[i]=label.value;const update=value=>{value=clamp(Number(value)||0,0,255);state.controls[i]=value;range.value=number.value=value;};range.oninput=()=>update(range.value);range.onchange=()=>scheduleRender();number.oninput=()=>update(number.value);number.onchange=()=>scheduleRender();grid.appendChild(row);}applyInteractionLocks();}
  function syncSliders(){$$('.slider-row',$('#sliderGrid')).forEach((row,index)=>{$('.slider-label',row).value=state.labels[index];$('.slider-range',row).value=state.controls[index];$('.slider-value',row).value=state.controls[index];});applyInteractionLocks();}
  return{buildSliders,syncSliders,updateControlUsage,refreshControlUsage};
}
