/**
 * Filter FabJS
 * Modular source extracted from v2.0.7; modular architecture v2.1.0.
 * Licensed GPL-2.0-or-later. See LICENSE and README.md.
 */
import { $, $$, clamp, debounce, storageGet, storageSet, escapeHtml, slug } from '../core/utils.js';
import { CONTROL_COUNT, CONTROL_DEFINITIONS, defaultControlLabels, defaultControlValues } from '../core/controls.js';
import { Parser } from '../core/formula-language.js';
import { IR_VERSION, compileFilterProgram } from '../core/ir.js';
import { workerProgram } from '../renderers/cpu-worker-source.js';
import { CpuRenderer } from '../renderers/cpu-renderer.js';
import { WebGpuRenderer } from '../renderers/webgpu-renderer.js';
import { RendererManager } from '../renderers/renderer-manager.js';
import { presets } from '../presets/builtins.js';
import { detectFilterFormat, FILTER_FILE_MAX_BYTES, getValidatedFormulaAsts, validateNativeFilter } from '../io/filter-format.js';
import { imageFromClipboardData, alphaStats, renderedImageCanvas, canvasBlob, verifyPngAlpha, writePngClipboard } from '../io/image-io.js';
import { getDom } from '../ui/dom.js';
import { createCanvasView } from '../ui/canvas-view.js';
import { createControlsController } from '../ui/controls.js';

export async function importLatestFilterFile(file,{state,cancelRender,applyFilter}){
  if(!file)return null;
  const loadId=++state.filterLoadId;
  try{
    if(Number.isFinite(Number(file.size))&&Number(file.size)>FILTER_FILE_MAX_BYTES)throw new Error(`Filter file exceeds the ${FILTER_FILE_MAX_BYTES/1024} KiB limit`);
    const text=await file.text();
    if(loadId!==state.filterLoadId)return null;
    const result=detectFilterFormat(text,file.name);
    if(state.isRendering){await cancelRender();if(loadId!==state.filterLoadId)return null;}
    applyFilter(result.data);
    return result;
  }catch(error){if(loadId!==state.filterLoadId)return null;throw error;}
}

export function validateFilterForPersistence(filter,onError=()=>{}){try{return validateNativeFilter(filter);}catch(error){onError(error);return null;}}

export function applyPresetSafely(definition,selection,{applyFilter,updatePresetDeleteState,onError}){
  updatePresetDeleteState();
  try{applyFilter(definition,selection);return true;}catch(error){updatePresetDeleteState();onError(error);return false;}
}

export function initializeImagePreview(data,width,height,{state,canvasView,canvas}){
  canvasView.invalidatePixels();state.width=width;state.height=height;state.source=data instanceof Uint8ClampedArray?data:new Uint8ClampedArray(data);state.filtered=state.source;canvas.width=width;canvas.height=height;canvasView.fitCanvas();canvasView.drawView();
}

const CUSTOM_PRESET_ID_PATTERN=/^[A-Za-z0-9_-]{1,80}$/;
export function createCustomPresetId(){try{const uuid=globalThis.crypto?.randomUUID?.();if(uuid)return`preset-${uuid}`}catch{}return`preset-${Date.now().toString(36)}-${Math.random().toString(36).slice(2,12)||'0'}`}
function isValidCustomPresetId(value){return typeof value==='string'&&CUSTOM_PRESET_ID_PATTERN.test(value)}
function allocateCustomPresetId(used,idFactory){for(let attempt=0;attempt<100;attempt++){const id=idFactory();if(isValidCustomPresetId(id)&&!used.has(id))return id}throw new Error('Could not create a unique custom preset ID')}
export function normalizeCustomPresetList(value,idFactory=createCustomPresetId){
  if(!Array.isArray(value))return{presets:[],storageList:[],migrated:false};
  const presets=[],storageList=[],used=new Set();let migrated=false;
  value.forEach(item=>{
    if(!item||typeof item!=='object'||Array.isArray(item)||typeof item.name!=='string'){storageList.push(item);return}
    let id=item.id;if(!isValidCustomPresetId(id)||used.has(id)){id=allocateCustomPresetId(used,idFactory);migrated=true}
    const preset=id===item.id?item:{...item,id};used.add(id);presets.push(preset);storageList.push(preset);
  });
  return{presets,storageList,migrated};
}
export function findCustomPresetById(list,id){return Array.isArray(list)?list.find(preset=>preset.id===id)||null:null}
export function upsertCustomPreset(list,filter,name,idFactory=createCustomPresetId){
  const next=[...list],index=next.findIndex(item=>item.name.toLowerCase()===name.toLowerCase()),used=new Set(next.map(item=>item.id)),id=index>=0?next[index].id:allocateCustomPresetId(used,idFactory),preset={...filter,name,id};if(index>=0)next[index]=preset;else next.push(preset);return{list:next,preset};
}

export function initFilterFabApp(){
  const {el,ctx}=getDom();
  const state={source:null,filtered:null,width:0,height:0,view:'filtered',split:50,zoom:'fit',zoomLevel:1,controls:defaultControlValues(),labels:defaultControlLabels(),renderId:0,imageLoadId:0,filterLoadId:0,rendererManager:null,rendererPreference:storageGet('ffw-renderer','auto'),lastProgram:null,lastProgramKey:null,lastWGSL:null,lastGpuAnalysis:null,isRendering:false,usedControls:Array(CONTROL_COUNT).fill(false),legacyMath:false,hasPendingFormulaChanges:false,focusSnapshot:null};
  const canvasView=createCanvasView({state,el,ctx});
  let controlsController;

  const rendererFactories={
    cpu:()=>new CpuRenderer(workerProgram),
    webgpu:()=>new WebGpuRenderer({onCompile:({wgsl,analysis})=>{state.lastWGSL=wgsl;state.lastGpuAnalysis=analysis;}})
  };
  state.rendererManager=new RendererManager(rendererFactories);

  function setStatus(text,kind='good'){el.statusText.textContent=text;el.statusDot.className='status-dot'+(kind==='busy'?' busy':kind==='pending'?' pending':kind==='error'?' error':'');}
  function toast(text){el.toast.textContent=text;el.toast.classList.add('show');clearTimeout(toast.timer);toast.timer=setTimeout(()=>el.toast.classList.remove('show'),1800);}
  const interactiveNodes=()=>Array.from(document.querySelectorAll('button,input,select,textarea'));
  function updatePresetDeleteState(){const custom=el.preset?.value.startsWith('custom:');if(!el.deletePreset)return;el.deletePreset.disabled=state.isRendering||!custom;el.deletePreset.title=custom?'Delete selected custom preset':'Select a custom preset to delete';}
  function applyInteractionLocks(){interactiveNodes().forEach(node=>{node.disabled=state.isRendering;});$$('.slider-row',$('#sliderGrid')).forEach((row,index)=>{const unused=!state.usedControls[index];row.classList.toggle('control-unused',unused);row.setAttribute('aria-disabled',String(state.isRendering||unused));row.title=unused?'Not referenced by any channel formula':'';$$('input',row).forEach(node=>{node.disabled=state.isRendering||unused;});});updatePresetDeleteState();}
  function captureFocus(){const node=document.activeElement;if(!(node instanceof Element)||node===document.body||!node.matches('button,input,select,textarea'))return null;const snapshot={node};if(typeof node.selectionStart==='number'){snapshot.start=node.selectionStart;snapshot.end=node.selectionEnd;snapshot.direction=node.selectionDirection;}return snapshot;}
  function restoreFocus(snapshot){if(!snapshot?.node?.isConnected||snapshot.node.disabled)return;requestAnimationFrame(()=>{if(!snapshot.node.isConnected||snapshot.node.disabled)return;snapshot.node.focus({preventScroll:true});if(typeof snapshot.start==='number'&&typeof snapshot.node.setSelectionRange==='function')snapshot.node.setSelectionRange(snapshot.start,snapshot.end,snapshot.direction||'none');});}
  function setFormulaEditStatus(kind,text){el.formulaEditStatus.dataset.state=kind;el.formulaEditStatus.textContent=text;}
  function markFormulaPending(field=null){state.hasPendingFormulaChanges=true;if(field)field.classList.add('edited');setFormulaEditStatus('pending','Changes not rendered');setStatus('Formula changes ready to render','pending');}
  function markPreviewCurrent(){state.hasPendingFormulaChanges=false;el.formulas.forEach(field=>field.classList.remove('edited'));setFormulaEditStatus('current','Preview current');}
  function setProgress(pct,row,total){const safePct=clamp(Number.isFinite(Number(pct))?Number(pct):0,0,100),safeTotal=Math.max(0,Math.trunc(Number(total)||0)),safeRow=clamp(Math.trunc(Number(row)||0),0,safeTotal||0);el.progressFill.style.width=`${safePct}%`;el.progressFill.parentElement?.setAttribute('aria-valuenow',String(Math.round(safePct)));el.progressPercent.textContent=`${Math.round(safePct)}%`;el.progressRows.textContent=safeTotal?`${safeRow} / ${safeTotal} rows`:'Preparing…';}
  function setUILocked(locked,pct=0,row=0,total=0){const wasRendering=state.isRendering,nextRendering=Boolean(locked);if(nextRendering&&!wasRendering)state.focusSnapshot=captureFocus();state.isRendering=nextRendering;document.body.classList.toggle('ui-locked',state.isRendering);document.body.setAttribute('aria-busy',String(state.isRendering));applyInteractionLocks();el.renderOverlay.classList.toggle('show',state.isRendering);el.renderOverlay.setAttribute('aria-hidden',String(!state.isRendering));if(state.isRendering)setProgress(pct,row,total);else if(wasRendering){const snapshot=state.focusSnapshot;state.focusSnapshot=null;restoreFocus(snapshot);}}
  function initializeRendererSource(){if(!state.source||!state.width||!state.height)return Promise.resolve();return state.rendererManager.setSource(state.source,state.width,state.height);}
  async function cancelRender(){if(!state.isRendering)return false;state.renderId++;try{await state.rendererManager?.cancelActive();}catch(error){console.error('Renderer cancellation failed',error);}setUILocked(false);setProgress(0,0,state.height||0);setStatus('Render cancelled');el.renderInfo.textContent=`${state.rendererManager?.active?.label||'Renderer'} · cancelled`;toast('Rendering cancelled');return true;}

  function currentProgramKey(){return JSON.stringify([state.legacyMath,...el.formulas.map(field=>field.value)])}
  function compileCurrentProgram(){const key=currentProgramKey();if(state.lastProgram&&state.lastProgramKey===key)return state.lastProgram;const astList=el.formulas.map(field=>new Parser(field.value).parse());return compileFilterProgram(astList,{legacyMath:state.legacyMath});}
  const scheduleRender=debounce(()=>{if(!state.hasPendingFormulaChanges)render();},110);
  const scheduleFormulaValidation=debounce(validatePendingFormulas,220);
  controlsController=createControlsController({state,el,scheduleRender,applyInteractionLocks,compileCurrentProgram});

  function customList(){try{const normalized=normalizeCustomPresetList(JSON.parse(storageGet('ffw-custom-presets','[]')));if(normalized.migrated)storageSet('ffw-custom-presets',JSON.stringify(normalized.storageList));return normalized.presets}catch{return[];}}
  function populatePresets(){const selected=el.preset.value,custom=customList();el.preset.innerHTML='<optgroup label="Built-in">'+[...presets].sort((a,b)=>a.name.localeCompare(b.name)).map(preset=>`<option value="builtin:${preset.id}">${preset.name}</option>`).join('')+'</optgroup>'+(custom.length?'<optgroup label="My presets">'+custom.map(preset=>`<option value="custom:${escapeHtml(preset.id)}">${escapeHtml(preset.name)}</option>`).join('')+'</optgroup>':'');if(selected&&Array.from(el.preset.options).some(option=>option.value===selected))el.preset.value=selected;updatePresetDeleteState();}
  function currentFilter(){return{format:'filter-fab-js',version:2,mathMode:state.legacyMath?'legacy':'float',name:$('#filterName').value.trim().slice(0,120)||'Untitled Filter',author:$('#filterAuthor').value.trim().slice(0,120),formulas:el.formulas.map(field=>field.value.trim()),controls:state.controls.map((value,index)=>({label:String(state.labels[index]??'').slice(0,80)||`Control ${index+1}`,value}))};}
  function prepareFilter(input){
    if(!input||typeof input!=='object'||Array.isArray(input))throw new Error('Filter definition must be an object');
    const inputAsts=getValidatedFormulaAsts(input),definition=inputAsts?input:input.format==='filter-fab-js'?validateNativeFilter(input):input,mathMode=definition.mathMode??'float';
    if(!['float','legacy'].includes(mathMode))throw new Error('Filter mathMode must be “float” or “legacy”');
    const legacyMath=mathMode==='legacy',formulas=definition.formulas||definition.f;
    if(!Array.isArray(formulas)||formulas.length!==4||formulas.some(formula=>typeof formula!=='string'||!formula.trim()))throw new Error('Filter definition must contain exactly four formulas');
    const normalizedFormulas=formulas.map(formula=>formula.trim()),astList=inputAsts||getValidatedFormulaAsts(definition)||normalizedFormulas.map(formula=>new Parser(formula).parse()),program=compileFilterProgram(astList,{legacyMath});
    let rawValues,rawLabels;
    if(definition.controls!==undefined){
      if(!Array.isArray(definition.controls)||definition.controls.length>CONTROL_COUNT)throw new Error(`Filter definition may contain at most ${CONTROL_COUNT} controls`);
      rawValues=definition.controls.map((control,index)=>{if(typeof control==='number')return control;if(!control||typeof control!=='object'||Array.isArray(control))throw new Error(`Control ${index+1} is malformed`);return control.value});
      rawLabels=definition.controls.map((control,index)=>typeof control==='number'?`Control ${index+1}`:control.label);
    }else{
      rawValues=definition.values??[];rawLabels=definition.labels??[];
      if(!Array.isArray(rawValues)||!Array.isArray(rawLabels)||rawValues.length>CONTROL_COUNT||rawLabels.length>CONTROL_COUNT)throw new Error(`Filter definition may contain at most ${CONTROL_COUNT} controls`);
    }
    const controls=CONTROL_DEFINITIONS.map((definition,index)=>{const value=rawValues[index]??definition.defaultValue;if(typeof value!=='number'||!Number.isFinite(value))throw new Error(`Control ${index+1} must be a finite number`);return clamp(value,0,255)});
    const labels=CONTROL_DEFINITIONS.map((definition,index)=>{const value=rawLabels[index]??definition.defaultLabel;if(typeof value!=='string')throw new Error(`Control ${index+1} label must be a string`);const label=value.trim();if(label.length>80)throw new Error(`Control ${index+1} label exceeds 80 characters`);return label||definition.defaultLabel});
    if(definition.name!==undefined&&typeof definition.name!=='string')throw new Error('Filter name must be a string');if(definition.author!==undefined&&typeof definition.author!=='string')throw new Error('Filter author must be a string');
    const name=String(definition.name??'').trim()||'Untitled Filter',author=String(definition.author??'').trim();if(name.length>120||author.length>120)throw new Error('Filter name and author are limited to 120 characters');
    return{legacyMath,formulas:normalizedFormulas,controls,labels,name,author,program};
  }
  function applyFilter(definition,selection){const next=prepareFilter(definition);state.legacyMath=next.legacyMath;el.formulas.forEach((field,index)=>field.value=next.formulas[index]);state.controls=next.controls;state.labels=next.labels;state.lastProgram=next.program;state.lastProgramKey=currentProgramKey();$('#filterName').value=next.name;$('#filterAuthor').value=next.author;controlsController.syncSliders();controlsController.updateControlUsage(next.program);if(selection)el.preset.value=selection;updatePresetDeleteState();markFormulaPending();render();}

  function compileAll({cache=true}={}){const key=currentProgramKey();if(cache&&state.lastProgram&&state.lastProgramKey===key){controlsController.updateControlUsage(state.lastProgram);return state.lastProgram}const astList=[];let ok=true;el.formulas.forEach(field=>{const box=field.closest('.formula'),icon=$('.formula-state',box),errorElement=$('.formula-error',box);try{astList.push(new Parser(field.value).parse());field.classList.remove('invalid');field.setAttribute('aria-invalid','false');icon.textContent='✓';icon.classList.remove('bad','pending');errorElement.textContent='';errorElement.classList.remove('show');}catch(error){ok=false;astList.push(null);field.classList.add('invalid');field.setAttribute('aria-invalid','true');icon.textContent='!';icon.classList.remove('pending');icon.classList.add('bad');errorElement.textContent=`${error.message} at character ${(error.pos??0)+1}`;errorElement.classList.add('show');}});if(!ok){controlsController.updateControlUsage(null);return null;}try{const program=compileFilterProgram(astList,{legacyMath:state.legacyMath});if(cache){state.lastProgram=program;state.lastProgramKey=key}controlsController.updateControlUsage(program);return program;}catch(error){console.error('IR compilation failed',error);setStatus(`Compiler error: ${error.message}`,'error');controlsController.updateControlUsage(null);return null;}}
  function showFormulaFailure(){const hasFieldError=el.formulas.some(field=>field.classList.contains('invalid'));setFormulaEditStatus('invalid',hasFieldError?'Fix formula errors':'Compiler error');if(hasFieldError)setStatus('Fix formula errors before rendering','error');}
  function validatedCurrentFilter(){return validateFilterForPersistence(currentFilter(),error=>{console.error('Filter validation failed',error);compileAll();showFormulaFailure();setStatus(`Filter validation error: ${error.message}`,'error');toast(`Filter validation failed: ${error.message}`);});}
  function validatePendingFormulas(){if(!state.hasPendingFormulaChanges||state.isRendering)return;const program=compileAll({cache:false});if(program){setFormulaEditStatus('pending','Ready to render');setStatus('Formula valid · render to update preview','pending');}else showFormulaFailure();}
  async function render({focusInvalid=false}={}){
    if(!state.source||state.isRendering)return;
    const program=compileAll();
    if(!program){
      showFormulaFailure();
      if(focusInvalid)el.formulas.find(field=>field.classList.contains('invalid'))?.focus();
      return;
    }
    const id=++state.renderId,irLabel=`IR v${program.irVersion} · ${program.metadata.nodeCount} ops`;
    setUILocked(true,0,0,state.height||0);
    setStatus('Selecting renderer…','busy');
    el.renderInfo.textContent=`${irLabel} · selecting renderer…`;
    let selection=null,runtimeFallback=false;
    try{
      const outcome=await state.rendererManager.renderWithFallback({id,program,preference:state.rendererPreference,controls:[...state.controls],legacyMath:state.legacyMath,isCurrent:()=>id===state.renderId,onSelection:(next,context)=>{
        if(id!==state.renderId)return;selection=next;runtimeFallback=context.runtimeFallback;state.lastGpuAnalysis=next.analysis;const fallback=next.fallbackReason?' · CPU fallback':'';setStatus(runtimeFallback?'GPU failed; rendering on CPU… 0%':`Rendering with ${next.renderer.label}… 0%`,'busy');el.renderInfo.textContent=`${next.renderer.label}${fallback} · ${irLabel} · preparing…`;
      },onProgress:message=>{
        if(id!==state.renderId||!selection)return;const fallback=selection.fallbackReason?' · CPU fallback':'';setProgress(message.pct,message.row,message.total);setStatus(runtimeFallback?`GPU failed; CPU fallback… ${Math.round(message.pct)}%`:`Rendering with ${selection.renderer.label}… ${Math.round(message.pct)}%`,'busy');el.renderInfo.textContent=`${selection.renderer.label}${fallback} · ${irLabel} · ${message.row} / ${message.total} rows`;
      }}),result=outcome.result;
      if(id!==state.renderId)return;
      state.filtered=result.pixels;
      canvasView.drawView();
      markPreviewCurrent();
      setStatus(outcome.fallbackReason?'Ready · CPU fallback':'Ready');
      const reason=outcome.fallbackReason?` · ${outcome.fallbackReason}`:'';
      el.renderInfo.textContent=`${result.label} · ${irLabel} · ${result.ms.toFixed(0)} ms${reason}`;
    }catch(error){
      if(id!==state.renderId||error?.name==='RenderCancelledError')return;
      console.error('Render failed',error);
      setStatus(`Renderer error: ${error.message}`,'error');
      el.renderInfo.textContent=`${selection?.renderer?.label||'Renderer'} · ${irLabel} · error`;
    }finally{
      if(id===state.renderId)setUILocked(false);
    }
  }

  function initImage(data,width,height){state.renderId++;if(state.isRendering)setUILocked(false);initializeImagePreview(data,width,height,{state,canvasView,canvas:el.canvas});el.imageInfo.textContent=`${width} × ${height} px`;initializeRendererSource().catch(error=>{console.error('Renderer initialization failed',error);setStatus(`Renderer error: ${error.message}`,'error');});render();}
  function demoImage(){const width=960,height=640,canvas=document.createElement('canvas');canvas.width=width;canvas.height=height;const context=canvas.getContext('2d'),background=context.createLinearGradient(0,0,width,height);background.addColorStop(0,'#08050d');background.addColorStop(.48,'#6c47b1');background.addColorStop(1,'#c429a3');context.fillStyle=background;context.fillRect(0,0,width,height);for(let i=0;i<18;i++){context.globalAlpha=.09;context.fillStyle=i%2?'#fff':'#07111f';context.beginPath();context.arc(90+i*58,90+(i%4)*130,60+(i%3)*35,0,Math.PI*2);context.fill();}context.globalAlpha=1;context.fillStyle='rgba(6,16,5,.82)';context.roundRect(84,94,792,452,36);context.fill();context.fillStyle='#f6efc4';context.font='700 62px system-ui';context.fillText('FILTER',132,245);context.fillStyle='#e1ec1a';context.fillText('FABJS',132,316);context.font='24px system-ui';context.fillStyle='#cdddb7';context.fillText('Open an image or experiment with this demo.',136,370);const gradient=context.createLinearGradient(136,0,790,0);gradient.addColorStop(0,'#e45a87');gradient.addColorStop(.5,'#9fd36a');gradient.addColorStop(1,'#38a9d4');context.fillStyle=gradient;context.fillRect(136,412,654,18);return context.getImageData(0,0,width,height);}
  async function loadImageFile(file,{successMessage='Image loaded'}={}){if(!file||!String(file.type||'').startsWith('image/')){toast('Choose a valid image file');return false;}const loadId=++state.imageLoadId;let bitmap=null;setStatus('Loading image…','busy');try{bitmap=await createImageBitmap(file);if(loadId!==state.imageLoadId)return false;const maximum=1800,scale=Math.min(1,maximum/Math.max(bitmap.width,bitmap.height)),width=Math.max(1,Math.round(bitmap.width*scale)),height=Math.max(1,Math.round(bitmap.height*scale)),canvas=document.createElement('canvas');canvas.width=width;canvas.height=height;const context=canvas.getContext('2d',{willReadFrequently:true});if(!context)throw new Error('Canvas image loading is unavailable');context.drawImage(bitmap,0,0,width,height);const pixels=context.getImageData(0,0,width,height).data;if(loadId!==state.imageLoadId)return false;initImage(pixels,width,height);toast(scale<1?`${successMessage} · resized to 1800 px`:successMessage);return true;}catch(error){if(loadId!==state.imageLoadId)return false;setStatus('Could not load image','error');toast(error.message||'Could not load image');return false;}finally{bitmap?.close?.();}}

  function isEditableTarget(target){return target instanceof Element&&(target.matches('input,textarea,select,[contenteditable="true"]')||Boolean(target.closest('[contenteditable="true"]')));}
  async function copyImageToClipboard(){if(state.isRendering)return;const ClipboardItemCtor=globalThis.ClipboardItem;if(!navigator.clipboard?.write||!ClipboardItemCtor){toast('Image copy is unavailable in this browser');return;}setStatus('Encoding RGBA PNG…','busy');try{const expected=alphaStats(state.filtered),blob=await canvasBlob(renderedImageCanvas(state.filtered,state.width,state.height),'image/png');await verifyPngAlpha(blob,expected);setStatus('Writing image to clipboard…','busy');await writePngClipboard(blob);if(expected.hasAlpha){setStatus(`Ready · PNG alpha ${expected.min}–${expected.max}`);toast('RGBA PNG copied · alpha preserved');}else{setStatus('Ready · copied image is opaque');toast('PNG copied · output has no transparent pixels');}}catch(error){console.error('Clipboard copy failed',error);setStatus('Clipboard copy unavailable','error');toast(error?.name==='NotAllowedError'?'Clipboard permission was blocked by the browser':`Copy failed: ${error.message||'clipboard unavailable'}`);}}
  async function pasteImageFromClipboard(){if(state.isRendering)return;if(!navigator.clipboard?.read){toast('Clipboard reading is unavailable. Press Ctrl/⌘+V instead.');return;}setStatus('Reading clipboard…','busy');try{const items=await navigator.clipboard.read();for(const item of items){const types=Array.from(item.types||[]),type=['web image/png','image/png',...types.filter(value=>String(value).startsWith('image/'))].find(value=>types.includes(value));if(!type)continue;const raw=await item.getType(type),mime=String(type).replace(/^web\s+/,'');const blob=String(raw.type||'').startsWith('image/')?raw:new Blob([raw],{type:mime});await loadImageFile(blob,{successMessage:'Image pasted from clipboard'});return;}setStatus('Ready');toast('Clipboard does not contain an image');}catch(error){console.error('Clipboard paste failed',error);setStatus('Clipboard paste unavailable','error');toast(error?.name==='NotAllowedError'?'Clipboard permission was blocked. Press Ctrl/⌘+V instead.':`Paste failed: ${error.message||'clipboard unavailable'}`);}}

  function triggerDownload(href,name,revoke=false){try{const anchor=document.createElement('a');anchor.href=href;anchor.download=name;anchor.rel='noopener';anchor.style.display='none';document.body.appendChild(anchor);anchor.click();setTimeout(()=>{anchor.remove();if(revoke)URL.revokeObjectURL(href);},10000);toast(`Download started: ${name}`);return true;}catch(error){console.error('Download failed',error);toast(`Download failed: ${error.message||'browser blocked the file'}`);return false;}}
  function downloadBlob(blob,name){if(!(blob instanceof Blob)||!blob.size){toast('Nothing was generated to download');return false;}return triggerDownload(URL.createObjectURL(blob),name,true);}
  async function exportPNG(){if(!state.filtered||!state.width||!state.height){toast('Load and render an image before exporting');return;}setStatus('Encoding PNG…','busy');try{const canvas=renderedImageCanvas(state.filtered,state.width,state.height),name=slug($('#filterName').value||'filtered-image')+'.png',blob=await canvasBlob(canvas,'image/png');if(downloadBlob(blob,name))setStatus('Ready');}catch(error){console.error('PNG export failed',error);setStatus('PNG export failed','error');toast(`PNG export failed: ${error.message}`);}}
  function exportFilter(){const filter=validatedCurrentFilter();if(!filter)return;const base=slug(filter.name);try{downloadBlob(new Blob([JSON.stringify(filter,null,2)+'\n'],{type:'application/json;charset=utf-8'}),base+'.json');}catch(error){console.error('Filter export failed',error);toast(`Filter export failed: ${error.message}`);}}
  function deletePreset(){const[type,id]=el.preset.value.split(':');if(type!=='custom')return;const list=customList(),index=list.findIndex(preset=>preset.id===id),preset=list[index];if(!preset){populatePresets();toast('Preset could not be found');return;}if(!confirm(`Delete “${preset.name}” from My presets?`))return;list.splice(index,1);if(!storageSet('ffw-custom-presets',JSON.stringify(list))){toast('Browser storage is unavailable');return;}populatePresets();applyFilter(presets.find(item=>item.id==='pass'),'builtin:pass');toast(`Deleted “${preset.name}”`);}
  async function importFilterFile(file){if(!file)return;try{const result=await importLatestFilterFile(file,{state,cancelRender,applyFilter});if(!result)return;toast(result.kind==='afs'?'AFS filter imported · CPU legacy mode':'Filter FabJS project imported');}catch(error){console.error('Filter import failed',error);toast(`Import failed: ${error.message}`);}finally{el.filterInput.value='';}}
  function savePreset(){const filter=validatedCurrentFilter();if(!filter)return;const name=prompt('Preset name',filter.name)?.trim();if(!name)return;if(name.length>120){toast('Preset names are limited to 120 characters');return;}const saved=upsertCustomPreset(customList(),filter,name);if(storageSet('ffw-custom-presets',JSON.stringify(saved.list))){populatePresets();el.preset.value=`custom:${saved.preset.id}`;updatePresetDeleteState();toast('Preset saved in this browser');}else toast('Browser storage is unavailable');}

  function wire(){
    el.rendererSelect.value=['auto','webgpu','cpu'].includes(state.rendererPreference)?state.rendererPreference:'auto';
    el.rendererSelect.onchange=()=>{state.rendererPreference=el.rendererSelect.value;storageSet('ffw-renderer',state.rendererPreference);if(!state.hasPendingFormulaChanges)render();};
    $('#openImageBtn').onclick=()=>el.imageInput.click();
    el.imageInput.onchange=async()=>{await loadImageFile(el.imageInput.files[0]);el.imageInput.value='';};
    $('#pasteImageBtn').onclick=pasteImageFromClipboard;
    $('#copyImageBtn').onclick=copyImageToClipboard;
    $('#importBtn').onclick=()=>el.filterInput.click();
    el.filterInput.onchange=()=>importFilterFile(el.filterInput.files[0]);
    $('#exportFilterBtn').onclick=exportFilter;
    $('#exportImageBtn').onclick=exportPNG;
    $('#savePresetBtn').onclick=savePreset;
    el.deletePreset.onclick=deletePreset;
    el.renderBtn.onclick=()=>render({focusInvalid:true});
    $('#resetBtn').onclick=()=>applyFilter(presets.find(preset=>preset.id==='pass'),'builtin:pass');
    el.preset.onchange=()=>{const selection=el.preset.value,[type,id]=selection.split(':'),definition=type==='builtin'?presets.find(preset=>preset.id===id):findCustomPresetById(customList(),id);if(!definition){updatePresetDeleteState();return;}applyPresetSafely(definition,selection,{applyFilter,updatePresetDeleteState,onError:error=>{console.error('Preset application failed',error);setStatus(`Preset error: ${error.message}`,'error');toast(`Preset could not be loaded: ${error.message}`);}});};
    el.formulas.forEach(field=>{
      field.oninput=()=>{
        const box=field.closest('.formula'),icon=$('.formula-state',box),errorElement=$('.formula-error',box);
        field.classList.remove('invalid');
        field.setAttribute('aria-invalid','false');
        icon.textContent='…';
        icon.classList.remove('bad');
        icon.classList.add('pending');
        errorElement.textContent='';
        errorElement.classList.remove('show');
        markFormulaPending(field);
        scheduleFormulaValidation();
      };
      field.onblur=validatePendingFormulas;
      field.onkeydown=event=>{if((event.ctrlKey||event.metaKey)&&event.key==='Enter'){event.preventDefault();render({focusInvalid:true});}};
    });
    document.addEventListener('keydown',event=>{if(event.key==='Escape'&&state.isRendering){event.preventDefault();event.stopPropagation();cancelRender();return;}if((event.ctrlKey||event.metaKey)&&event.shiftKey&&event.key.toLowerCase()==='c'&&!state.isRendering&&!isEditableTarget(event.target)){event.preventDefault();copyImageToClipboard();}});
    document.addEventListener('paste',event=>{if(state.isRendering||isEditableTarget(event.target)||document.querySelector('dialog[open]'))return;const image=imageFromClipboardData(event.clipboardData);if(!image)return;event.preventDefault();loadImageFile(image,{successMessage:'Image pasted from clipboard'});});
    $$('#viewMode button').forEach(button=>button.onclick=()=>{$$('#viewMode button').forEach(item=>item.classList.remove('active'));button.classList.add('active');state.view=button.dataset.view;el.splitControl.classList.toggle('show',state.view==='split');canvasView.drawView();});
    el.split.oninput=()=>{state.split=Number(el.split.value);canvasView.requestDraw();};
    $('#zoomFit').onclick=canvasView.fitCanvas;
    $('#zoomIn').onclick=()=>canvasView.zoom(1.2);
    $('#zoomOut').onclick=()=>canvasView.zoom(1/1.2);
    window.onresize=debounce(()=>{if(state.zoom==='fit')canvasView.fitCanvas();},100);
    let dragDepth=0;
    const hasFiles=event=>Array.from(event.dataTransfer?.types||[]).includes('Files'),hideDrop=()=>{dragDepth=0;el.drop.classList.remove('show');};
    el.stage.addEventListener('dragenter',event=>{event.preventDefault();if(state.isRendering||!hasFiles(event))return;dragDepth++;el.drop.classList.add('show');});
    el.stage.addEventListener('dragover',event=>{event.preventDefault();if(state.isRendering||!hasFiles(event))return;if(event.dataTransfer)event.dataTransfer.dropEffect='copy';el.drop.classList.add('show');});
    el.stage.addEventListener('dragleave',event=>{event.preventDefault();if(state.isRendering)return;dragDepth=Math.max(0,dragDepth-1);if(dragDepth===0)el.drop.classList.remove('show');});
    el.stage.addEventListener('drop',event=>{event.preventDefault();hideDrop();if(state.isRendering)return;loadImageFile(event.dataTransfer?.files?.[0]);});
    document.addEventListener('dragend',hideDrop);
    window.addEventListener('blur',hideDrop);
    $('#helpBtn').onclick=()=>$('#helpDialog').showModal();
    $('#closeHelp').onclick=()=>$('#helpDialog').close();
    window.addEventListener('storage',event=>{if(event.key===null||event.key==='ffw-custom-presets')populatePresets();});
    window.addEventListener('beforeunload',()=>state.rendererManager?.dispose());
  }

  window.FilterFabJS=Object.freeze({version:'2.6.0',irVersion:IR_VERSION,getLastProgram:()=>state.lastProgram?JSON.parse(JSON.stringify(state.lastProgram)):null,getLastWGSL:()=>state.lastWGSL,getWebGPUAnalysis:()=>state.lastGpuAnalysis?JSON.parse(JSON.stringify(state.lastGpuAnalysis)):null,getRendererPreference:()=>state.rendererPreference});
  controlsController.buildSliders();populatePresets();wire();const demo=demoImage();initImage(demo.data,demo.width,demo.height);applyFilter(presets.find(preset=>preset.id==='pass'),'builtin:pass');
  return{state,render,applyFilter,loadImageFile};
}
