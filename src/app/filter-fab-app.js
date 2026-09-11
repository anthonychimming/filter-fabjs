/**
 * Filter FabJS
 * Modular source extracted from v2.0.7; modular architecture v2.1.0.
 * Licensed GPL-2.0-or-later. See LICENSE and README.md.
 */
import { normalizeTags, tagKey, portableContent, validatePortableId } from '../core/filter-metadata.js';
import { PREFERENCE_PREFIX, readEntryPreference, writeEntryPreference, catalogEntry, readLibrary, writeLibraryRecord } from './filter-catalog.js';
import { createFilterBrowser, chooseFilterAction } from '../ui/filter-browser.js';
import { $, $$, clamp, debounce, storageGet, storageSet, escapeHtml, slug } from '../core/utils.js';
import { CONTROL_COUNT, CONTROL_DEFINITIONS, cloneControlUI, defaultControlLabels, defaultControlUIs, defaultControlValues, normalizeControlUI, normalizeToggleRaw } from '../core/controls.js';
import { Parser } from '../core/formula-language.js';
import { IR_VERSION, compileFilterProgram } from '../core/ir.js';
import { workerProgram } from '../renderers/cpu-worker-source.js';
import { CpuRenderer } from '../renderers/cpu-renderer.js';
import { WebGpuRenderer } from '../renderers/webgpu-renderer.js';
import { RendererManager } from '../renderers/renderer-manager.js';
import { presets } from '../presets/builtins.js';
import { detectFilterFormat, FILTER_DESCRIPTION_MAX_LENGTH, FILTER_FILE_MAX_BYTES, getValidatedFormulaAsts, validateNativeFilter } from '../io/filter-format.js';
import { imageFromClipboardData, alphaStats, renderedImageCanvas, canvasBlob, verifyPngAlpha, writePngClipboard } from '../io/image-io.js';
import { createFilterFabPngEnvelope, embedFilterFabMetadata, extractFilterFabMetadata, PngMetadataError } from '../io/png-metadata.js';
import { getDom } from '../ui/dom.js';
import { createCanvasView } from '../ui/canvas-view.js';
import { createControlsController } from '../ui/controls.js';

export async function importLatestFilterFile(file,{state,cancelRender,applyFilter,beforeApply=async()=>true}){
  if(!file)return null;
  const loadId=++state.filterLoadId;
  try{
    if(Number.isFinite(Number(file.size))&&Number(file.size)>FILTER_FILE_MAX_BYTES)throw new Error(`Filter file exceeds the ${FILTER_FILE_MAX_BYTES/1024} KiB limit`);
    const text=await file.text();
    if(loadId!==state.filterLoadId)return null;
    const result=detectFilterFormat(text,file.name);
    if(state.isRendering){await cancelRender();if(loadId!==state.filterLoadId)return null;}
    if(!await beforeApply(result.data)||loadId!==state.filterLoadId)return null;
    applyFilter(result.data);
    return result;
  }catch(error){if(loadId!==state.filterLoadId)return null;throw error;}
}

export function validateFilterForPersistence(filter,onError=()=>{}){try{return validateNativeFilter(filter);}catch(error){onError(error);return null;}}

export function filterRenderSignature(filter){return JSON.stringify([filter.mathMode,filter.formulas,filter.controls.map(control=>typeof control==='number'?control:control.value)]);}

export async function routeImageFileWithMetadata(file,{extractMetadata=extractFilterFabMetadata,validateFilter=validateNativeFilter,chooseAction,openImage,importFilter}){
  const png=String(file?.type||'').toLowerCase()==='image/png'||/\.png$/i.test(String(file?.name||''));
  if(!png)return{action:'open',opened:await openImage(file)};
  let envelope;
  try{envelope=await extractMetadata(file);}catch(error){
    const unsupported=error instanceof PngMetadataError&&error.code==='unsupported',action=await chooseAction({kind:unsupported?'unsupported':'invalid',title:unsupported?'Newer Filter FabJS metadata':'Invalid Filter FabJS metadata',detail:unsupported?'This PNG contains Filter FabJS metadata created by a newer format.':'This image contains invalid Filter FabJS metadata.',choices:[['open','Open Image'],['cancel','Cancel']]});
    if(action==='open')return{action,opened:await openImage(file),metadataError:error};return{action:'cancel',metadataError:error};
  }
  if(!envelope)return{action:'open',opened:await openImage(file)};
  let filter;
  try{filter=validateFilter(envelope.document);}catch(error){
    const action=await chooseAction({kind:'invalid',title:'Invalid Filter FabJS metadata',detail:'This image contains invalid Filter FabJS metadata.',choices:[['open','Open Image'],['cancel','Cancel']]});
    if(action==='open')return{action,opened:await openImage(file),metadataError:error};return{action:'cancel',metadataError:error};
  }
  const attribution=filter.author?`\nby ${filter.author}`:'',action=await chooseAction({kind:'valid',title:'Filter FabJS filter found',detail:`This image contains the embedded filter:\n\n${filter.name}${attribution}`,choices:[['import','Import Filter'],['open','Open Image'],['cancel','Cancel']]});
  if(action==='import'){await importFilter(filter);return{action,filter};}
  if(action==='open')return{action,opened:await openImage(file),filter};
  return{action:'cancel',filter};
}

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
  const state={source:null,filtered:null,width:0,height:0,view:'filtered',workspaceMode:'explore',split:50,zoom:'fit',zoomLevel:1,controls:defaultControlValues(),labels:defaultControlLabels(),controlUIs:defaultControlUIs(),renderId:0,imageLoadId:0,filterLoadId:0,rendererManager:null,rendererPreference:storageGet('ffw-renderer','auto'),lastProgram:null,lastProgramKey:null,lastSuccessfulRenderSignature:null,lastWGSL:null,lastGpuAnalysis:null,lastRendererDiagnostics:null,isRendering:false,usedControls:Array(CONTROL_COUNT).fill(false),legacyMath:false,hasPendingFormulaChanges:false,focusSnapshot:null};
  const canvasView=createCanvasView({state,el,ctx});
  let controlsController,browser,catalogCache=null,librarySession=null;
  const activeDocument={key:null,id:undefined,tags:[],baseline:null,recordBaseline:null,imported:false,importSource:null};

  const rendererFactories={
    cpu:()=>new CpuRenderer(workerProgram),
    webgpu:()=>new WebGpuRenderer({onCompile:({wgsl,analysis})=>{state.lastWGSL=wgsl;state.lastGpuAnalysis=analysis;}})
  };
  state.rendererManager=new RendererManager(rendererFactories);

  function setStatus(text,kind='good'){el.statusText.textContent=text;el.statusDot.className='status-dot'+(kind==='busy'?' busy':kind==='pending'?' pending':kind==='error'?' error':'');}
  function toast(text){el.toast.textContent=text;el.toast.classList.add('show');clearTimeout(toast.timer);toast.timer=setTimeout(()=>el.toast.classList.remove('show'),1800);}
  const interactiveNodes=()=>Array.from(document.querySelectorAll('button,input,select,textarea'));
  function updatePresetDeleteState(){const custom=activeDocument.key?.startsWith('custom:');el.deletePreset.disabled=state.isRendering||!custom;el.deletePreset.title=custom?'Delete current saved filter':'Load a saved custom filter to delete';}
  function applyInteractionLocks(){interactiveNodes().forEach(node=>{if(librarySession&&node.closest('.filter-browser'))return;node.disabled=state.isRendering;});$$('.slider-row',$('#sliderGrid')).forEach(row=>{const index=Number(row.dataset.controlIndex),unused=!state.usedControls[index];row.classList.toggle('control-unused',unused);row.setAttribute('aria-disabled',String(state.isRendering||unused));row.title=unused?'Unused — not referenced by any channel formula':'';$$('button,input,select',row).forEach(node=>{node.disabled=state.isRendering||unused;});});updatePresetDeleteState();}
  function captureFocus(){const node=document.activeElement;if(!(node instanceof Element)||node===document.body||!node.matches('button,input,select,textarea'))return null;const snapshot={node};if(typeof node.selectionStart==='number'){snapshot.start=node.selectionStart;snapshot.end=node.selectionEnd;snapshot.direction=node.selectionDirection;}return snapshot;}
  function restoreFocus(snapshot){if(!snapshot?.node?.isConnected||snapshot.node.disabled)return;requestAnimationFrame(()=>{if(!snapshot.node.isConnected||snapshot.node.disabled)return;snapshot.node.focus({preventScroll:true});if(typeof snapshot.start==='number'&&typeof snapshot.node.setSelectionRange==='function')snapshot.node.setSelectionRange(snapshot.start,snapshot.end,snapshot.direction||'none');});}
  function setFormulaEditStatus(kind,text){el.formulaEditStatus.dataset.state=kind;el.formulaEditStatus.textContent=text;}
  function setRendererDiagnosticsState(kind,text,title=''){el.rendererDiagnostics.dataset.state=kind;el.rendererDiagnostics.textContent=text;el.rendererDiagnostics.title=title;const compact=kind==='gpu-eligible'?'GPU · Ready':kind==='cpu-fallback'?'CPU · Compatibility mode':kind==='cpu-selected'?'CPU · Selected':kind==='error'?'Renderer · Unavailable':'Renderer · Checking';el.rendererSummary.dataset.state=kind;el.rendererSummary.textContent=compact;el.rendererSummary.title=title;}
  function updateRendererDiagnostics(program,{rendererId=null,fallbackReason='',runtimeFallback=false}={}){
    const base=state.rendererManager.diagnose(program,state.rendererPreference),actualRenderer=rendererId||base.rendererId,reason=fallbackReason||base.gpuReason,mode=actualRenderer==='cpu'&&state.rendererPreference!=='cpu'&&reason?'cpu-fallback':base.mode,diagnostic={...base,rendererId:actualRenderer,mode,gpuReason:reason,runtimeFallback:Boolean(runtimeFallback)};
    const label=mode==='gpu-eligible'?'GPU eligible':mode==='cpu-fallback'?'CPU fallback':diagnostic.gpuEligible?'CPU selected · GPU eligible':diagnostic.gpuCompatible?'CPU selected · GPU unavailable':'CPU selected · GPU incompatible',passLabel=diagnostic.passes===1?'pass':'passes';
    setRendererDiagnosticsState(mode,`${label} · IR v${program.irVersion} · ${diagnostic.operationCount} ops · ${diagnostic.passes} ${passLabel}`,reason||'Current formula is compatible with the single-pass WebGPU renderer.');state.lastGpuAnalysis=diagnostic.analysis;state.lastRendererDiagnostics=diagnostic;return diagnostic;
  }
  function clearRendererDiagnostics(text,title){state.lastRendererDiagnostics=null;setRendererDiagnosticsState('error',text,title);}
  function markFormulaPending(field=null){state.hasPendingFormulaChanges=true;if(field)field.classList.add('edited');setFormulaEditStatus('pending','Changes not rendered');setStatus('Formula changes ready to render','pending');state.lastRendererDiagnostics=null;setRendererDiagnosticsState('pending','Rechecking GPU eligibility…','Formula changes have not been validated yet.');}
  function markPreviewCurrent(){state.hasPendingFormulaChanges=false;el.formulas.forEach(field=>field.classList.remove('edited'));setFormulaEditStatus('current','Preview current');}
  function setProgress(pct,row,total){const safePct=clamp(Number.isFinite(Number(pct))?Number(pct):0,0,100),safeTotal=Math.max(0,Math.trunc(Number(total)||0)),safeRow=clamp(Math.trunc(Number(row)||0),0,safeTotal||0);el.progressFill.style.width=`${safePct}%`;el.progressFill.parentElement?.setAttribute('aria-valuenow',String(Math.round(safePct)));el.progressPercent.textContent=`${Math.round(safePct)}%`;el.progressRows.textContent=safeTotal?`${safeRow} / ${safeTotal} rows`:'Preparing…';}
  function setUILocked(locked,pct=0,row=0,total=0){const wasRendering=state.isRendering,nextRendering=Boolean(locked);if(nextRendering&&!wasRendering)state.focusSnapshot=captureFocus();state.isRendering=nextRendering;document.body.classList.toggle('ui-locked',state.isRendering);document.body.setAttribute('aria-busy',String(state.isRendering));applyInteractionLocks();el.renderOverlay.classList.toggle('show',state.isRendering);el.renderOverlay.setAttribute('aria-hidden',String(!state.isRendering));if(state.isRendering)setProgress(pct,row,total);else if(wasRendering){const snapshot=state.focusSnapshot;state.focusSnapshot=null;restoreFocus(snapshot);}}
  function initializeRendererSource(){if(!state.source||!state.width||!state.height)return Promise.resolve();return state.rendererManager.setSource(state.source,state.width,state.height);}
  async function cancelRender({silent=false}={}){if(!state.isRendering)return false;state.renderId++;try{await state.rendererManager?.cancelActive();}catch(error){console.error('Renderer cancellation failed',error);}setUILocked(false);setProgress(0,0,state.height||0);if(!silent){setStatus('Render cancelled');el.renderInfo.textContent=`${state.rendererManager?.active?.label||'Renderer'} · cancelled`;toast('Rendering cancelled');}return true;}

  function currentProgramKey(){return JSON.stringify([state.legacyMath,...el.formulas.map(field=>field.value)])}
  function compileCurrentProgram(){const key=currentProgramKey();if(state.lastProgram&&state.lastProgramKey===key)return state.lastProgram;const astList=el.formulas.map(field=>new Parser(field.value).parse());return compileFilterProgram(astList,{legacyMath:state.legacyMath});}
  const scheduleRender=debounce(()=>{if(!state.hasPendingFormulaChanges)render();},110);
  const scheduleFormulaValidation=debounce(validatePendingFormulas,220);
  controlsController=createControlsController({state,el,scheduleRender,applyInteractionLocks,compileCurrentProgram});

  function library(){return readLibrary(localStorage,normalizeCustomPresetList);}
  function organizationError(error){browser?.showError(error.message||'Browser storage is unavailable');setStatus(error.message||'Browser storage is unavailable','error');toast(error.message||'Browser storage is unavailable');}
  function customList(){try{return library().presets;}catch(error){organizationError(error);return[];}}
  function preference(key){try{return readEntryPreference(localStorage,key);}catch(error){organizationError(error);return{version:1,favorite:false,tags:[]};}}
  function catalog(){if(catalogCache)return catalogCache;return catalogCache=[...presets.map(item=>catalogEntry(item,'builtin',preference(`builtin:${item.id}`))),...customList().map(item=>catalogEntry(item,'custom',preference(`custom:${item.id}`)))];}
  function effectiveTags(){return activeDocument.key?.startsWith('builtin:')?[...new Map([...activeDocument.tags,...preference(activeDocument.key).tags].map(tag=>[tagKey(tag),tag])).values()]:activeDocument.tags;}
  function documentSnapshot(){return portableContent({...currentFilter(),tags:activeDocument.tags});}
  function importedStatus(){return activeDocument.importSource==='png'?'Imported from PNG · Not saved':'Imported · not saved';}
  function isDirty(){return activeDocument.imported||!activeDocument.key||documentSnapshot()!==activeDocument.baseline;}
  function updateActiveFilterSummary(status){
    const previewEntry=librarySession?.candidateEntry,name=$('#filterName').value.trim()||'Untitled Filter',key=previewEntry?.key||activeDocument.key,source=previewEntry?(previewEntry.source==='builtin'?'Built-in preview':'My Filter preview'):key?.startsWith('builtin:')?'Built-in':key?.startsWith('custom:')?'My Filter':'Unsaved',description=el.description.value.trim();
    el.activeFilterName.textContent=name;el.activeFilterSource.textContent=source;el.activeFilterStatus.textContent=status;el.activeFilterDescription.textContent=description||'No description provided.';
    if(!key||previewEntry){el.activeFavorite.hidden=Boolean(previewEntry)||!key;el.activeFavorite.setAttribute('aria-pressed','false');return;}
    const favorite=preference(key).favorite;el.activeFavorite.hidden=false;el.activeFavorite.setAttribute('aria-pressed',String(favorite));el.activeFavorite.textContent=favorite?'★ Favorited':'☆ Favorite';el.activeFavorite.setAttribute('aria-label',`${favorite?'Remove':'Add'} ${name} ${favorite?'from':'to'} favorites`);
  }
  function updateDocumentHeader({forceSelection=false}={}){
    const name=$('#filterName').value.trim()||'Untitled Filter';
    const requestedSelection=el.preset.value;
    let draft=el.preset.querySelector('[data-draft]');
    if(!activeDocument.key){if(!draft){draft=document.createElement('option');draft.value='';draft.disabled=true;draft.dataset.draft='true';el.preset.prepend(draft);}draft.textContent=`${name} · ${activeDocument.imported?importedStatus():'Not saved'}`;}else draft?.remove();
    const requestedOption=requestedSelection&&Array.from(el.preset.options).some(option=>option.value===requestedSelection);
    if(forceSelection||!requestedOption||requestedSelection===activeDocument.key)el.preset.value=activeDocument.key||'';
    el.preset.title=name;
    const previewing=Boolean(librarySession?.candidateEntry),status=previewing?'Preview · not applied':activeDocument.imported?importedStatus():!activeDocument.key?'Not saved':isDirty()?'Unsaved changes':'Saved';$('#savedDocumentStatus').textContent=status;updateActiveFilterSummary(status);updatePresetDeleteState();
  }
  function populatePresets(){
    catalogCache=null;el.preset.replaceChildren();
    const entries=catalog();
    for(const [label,accept] of [['Built-in',entry=>entry.source==='builtin'&&!entry.document.benchmark],['Performance benchmarks',entry=>entry.source==='builtin'&&entry.document.benchmark],['My Filters',entry=>entry.source==='custom']]){
      const group=document.createElement('optgroup');group.label=label;
      for(const entry of entries.filter(accept).sort((a,b)=>a.name.localeCompare(b.name)||a.key.localeCompare(b.key))){const option=document.createElement('option');option.value=entry.key;option.textContent=entry.name;group.append(option);}
      if(group.children.length)el.preset.append(group);
    }
    browser?.refresh();updateDocumentHeader({forceSelection:true});
  }
  function refreshTags(){
    const focusedTag=$('#tagChips').contains(document.activeElement)?document.activeElement.getAttribute('aria-label'):null;
    const builtIn=activeDocument.key?.startsWith('builtin:'),tags=builtIn?preference(activeDocument.key).tags:activeDocument.tags;
    $('#includedTags').textContent=builtIn?`Included tags: ${activeDocument.tags.join(', ')||'None'}`:'';$('#tagHelp').textContent=builtIn?'Saved in this browser. Included tags cannot be removed.':'Up to 20 tags, 32 characters each. Spaces and punctuation are allowed.';
    const chips=$('#tagChips');chips.replaceChildren();for(const tag of tags){const button=document.createElement('button');button.textContent=`${tag} ×`;button.setAttribute('aria-label',`Remove tag ${tag}`);button.onclick=()=>{commitTags(tags.filter(item=>tagKey(item)!==tagKey(tag)));$('#newTag').focus();};chips.append(button);}
    if(focusedTag)([...chips.children].find(node=>node.getAttribute('aria-label')===focusedTag)||$('#newTag')).focus();
    const suggestions=$('#tagSuggestions');suggestions.replaceChildren();const all=[...new Set(catalog().flatMap(entry=>entry.tags))].filter(tag=>!tags.some(item=>tagKey(item)===tagKey(tag))).filter(tag=>tag.toLowerCase().includes($('#newTag').value.toLowerCase())).slice(0,50);for(const tag of all){const option=document.createElement('option');option.value=tag;suggestions.append(option);}
  }
  function commitTags(tags){try{const normalized=normalizeTags(tags);if(activeDocument.key?.startsWith('builtin:')){normalizeTags([...new Map([...activeDocument.tags,...normalized].map(tag=>[tagKey(tag),tag])).values()]);writeEntryPreference(localStorage,activeDocument.key,{tags:normalized});}else activeDocument.tags=normalized;$('#tagError').textContent='';catalogCache=null;refreshTags();populatePresets();return true;}catch(error){$('#tagError').textContent=error.message;return false;}}
  function resolveCatalogDefinition(entry){return entry.source==='builtin'?presets.find(item=>`builtin:${item.id}`===entry.key):findCustomPresetById(library().presets,entry.document.id);}
  async function loadCatalogEntry(entry,focusTarget=el.searchFilters){
    const definition=resolveCatalogDefinition(entry);
    if(!definition)throw new Error('This filter was deleted in another tab.');
    prepareFilter(definition);
    applyFilter(definition,entry.key);if(state.isRendering)state.focusSnapshot={node:focusTarget};return true;
  }
  function currentFilter(){return{format:'filter-fab-js',version:2,...(activeDocument.id?{id:activeDocument.id}:{}),tags:effectiveTags(),mathMode:state.legacyMath?'legacy':'float',name:$('#filterName').value.trim().slice(0,120)||'Untitled Filter',description:el.description.value.trim().slice(0,FILTER_DESCRIPTION_MAX_LENGTH),author:$('#filterAuthor').value.trim().slice(0,120),formulas:el.formulas.map(field=>field.value.trim()),controls:state.controls.map((value,index)=>({label:String(state.labels[index]??'').slice(0,80)||`Control ${index+1}`,value,ui:cloneControlUI(state.controlUIs[index])}))};}
  function prepareFilter(input){
    if(!input||typeof input!=='object'||Array.isArray(input))throw new Error('Filter definition must be an object');
    const inputAsts=getValidatedFormulaAsts(input),definition=inputAsts?input:input.format==='filter-fab-js'?validateNativeFilter(input):input,mathMode=definition.mathMode??'float';
    if(!['float','legacy'].includes(mathMode))throw new Error('Filter mathMode must be “float” or “legacy”');
    const legacyMath=mathMode==='legacy',formulas=definition.formulas||definition.f;
    if(!Array.isArray(formulas)||formulas.length!==4||formulas.some(formula=>typeof formula!=='string'||!formula.trim()))throw new Error('Filter definition must contain exactly four formulas');
    const normalizedFormulas=formulas.map(formula=>formula.trim()),astList=inputAsts||getValidatedFormulaAsts(definition)||normalizedFormulas.map(formula=>new Parser(formula).parse()),program=compileFilterProgram(astList,{legacyMath});
    let rawValues,rawLabels,rawUIs;
    if(definition.controls!==undefined){
      if(!Array.isArray(definition.controls)||definition.controls.length>CONTROL_COUNT)throw new Error(`Filter definition may contain at most ${CONTROL_COUNT} controls`);
      rawValues=definition.controls.map((control,index)=>{if(typeof control==='number')return control;if(!control||typeof control!=='object'||Array.isArray(control))throw new Error(`Control ${index+1} is malformed`);return control.value});
      rawLabels=definition.controls.map((control,index)=>typeof control==='number'?`Control ${index+1}`:control.label);
      rawUIs=definition.controls.map(control=>typeof control==='number'?undefined:control.ui);
    }else{
      rawValues=definition.values??[];rawLabels=definition.labels??[];
      rawUIs=definition.controlUIs??definition.uis??[];
      if(!Array.isArray(rawValues)||!Array.isArray(rawLabels)||rawValues.length>CONTROL_COUNT||rawLabels.length>CONTROL_COUNT)throw new Error(`Filter definition may contain at most ${CONTROL_COUNT} controls`);
      if(!Array.isArray(rawUIs)||rawUIs.length>CONTROL_COUNT)throw new Error(`Filter definition may contain at most ${CONTROL_COUNT} control presentations`);
    }
    const controlUIs=CONTROL_DEFINITIONS.map((definition,index)=>normalizeControlUI(rawUIs[index]));
    const controls=CONTROL_DEFINITIONS.map((definition,index)=>{const value=rawValues[index]??definition.defaultValue;if(typeof value!=='number'||!Number.isFinite(value))throw new Error(`Control ${index+1} must be a finite number`);const canonical=clamp(value,0,255);return controlUIs[index].widget==='toggle'?normalizeToggleRaw(canonical):canonical});
    const labels=CONTROL_DEFINITIONS.map((definition,index)=>{const value=rawLabels[index]??definition.defaultLabel;if(typeof value!=='string')throw new Error(`Control ${index+1} label must be a string`);const label=value.trim();if(label.length>80)throw new Error(`Control ${index+1} label exceeds 80 characters`);return label||definition.defaultLabel});
    if(definition.name!==undefined&&typeof definition.name!=='string')throw new Error('Filter name must be a string');if(definition.description!==undefined&&typeof definition.description!=='string')throw new Error('Filter description must be a string');if(definition.author!==undefined&&typeof definition.author!=='string')throw new Error('Filter author must be a string');
    const name=String(definition.name??'').trim()||'Untitled Filter',description=String(definition.description??'').trim(),author=String(definition.author??'').trim();if(name.length>120||author.length>120)throw new Error('Filter name and author are limited to 120 characters');if(description.length>FILTER_DESCRIPTION_MAX_LENGTH)throw new Error(`Filter description exceeds ${FILTER_DESCRIPTION_MAX_LENGTH} characters`);
    const tags=normalizeTags(definition.tags),id=definition.format==='filter-factory-afs'?undefined:validatePortableId(definition.id);
    return{tags,id,legacyMath,formulas:normalizedFormulas,controls,labels,controlUIs,name,description,author,program};
  }
  function applyPreparedPresentation(next){
    state.legacyMath=next.legacyMath;el.formulas.forEach((field,index)=>field.value=next.formulas[index]);state.controls=[...next.controls];state.labels=[...next.labels];state.controlUIs=next.controlUIs.map(cloneControlUI);state.lastProgram=next.program;state.lastProgramKey=currentProgramKey();$('#filterName').value=next.name;el.description.value=next.description;$('#filterAuthor').value=next.author;controlsController.updateControlUsage(next.program);controlsController.syncSliders();
  }
  function commitActiveDocument(next,definition,selection,{importSource=selection?null:'file'}={}){
    activeDocument.key=selection||null;activeDocument.id=selection?.startsWith('builtin:')?undefined:next.id;activeDocument.tags=[...next.tags];activeDocument.imported=!selection;activeDocument.importSource=selection?null:importSource;activeDocument.recordBaseline=selection?.startsWith('custom:')?JSON.stringify(definition):null;activeDocument.baseline=documentSnapshot();
  }
  function applyFilter(definition,selection,{importSource=selection?null:'file'}={}){
    const next=prepareFilter(definition);applyPreparedPresentation(next);commitActiveDocument(next,definition,selection,{importSource});refreshTags();updateDocumentHeader({forceSelection:true});markFormulaPending();render();
  }

  function captureLibraryWorkingState(){
    return{
      activeDocument:{...activeDocument,tags:[...activeDocument.tags]},
      presentation:{
        legacyMath:state.legacyMath,controls:[...state.controls],labels:[...state.labels],controlUIs:state.controlUIs.map(cloneControlUI),lastProgram:state.lastProgram,lastProgramKey:state.lastProgramKey,lastSuccessfulRenderSignature:state.lastSuccessfulRenderSignature,lastWGSL:state.lastWGSL,lastGpuAnalysis:state.lastGpuAnalysis,lastRendererDiagnostics:state.lastRendererDiagnostics,filtered:state.filtered,usedControls:[...state.usedControls],hasPendingFormulaChanges:state.hasPendingFormulaChanges,
        name:$('#filterName').value,description:el.description.value,author:$('#filterAuthor').value,
        formulas:el.formulas.map(field=>{const box=field.closest('.formula'),icon=$('.formula-state',box),error=$('.formula-error',box);return{value:field.value,className:field.className,invalid:field.getAttribute('aria-invalid'),iconClassName:icon.className,iconText:icon.textContent,errorClassName:error.className,errorText:error.textContent};})
      },
      ui:{formulaState:el.formulaEditStatus.dataset.state,formulaText:el.formulaEditStatus.textContent,statusClass:el.statusDot.className,statusText:el.statusText.textContent,renderInfo:el.renderInfo.textContent,rendererDiagnosticsState:el.rendererDiagnostics.dataset.state,rendererDiagnosticsText:el.rendererDiagnostics.textContent,rendererDiagnosticsTitle:el.rendererDiagnostics.title,rendererSummaryState:el.rendererSummary.dataset.state,rendererSummaryText:el.rendererSummary.textContent,rendererSummaryTitle:el.rendererSummary.title}
    };
  }
  function restoreLibraryWorkingState(snapshot){
    const saved=snapshot.presentation;Object.assign(activeDocument,snapshot.activeDocument);activeDocument.tags=[...snapshot.activeDocument.tags];
    state.legacyMath=saved.legacyMath;state.controls=[...saved.controls];state.labels=[...saved.labels];state.controlUIs=saved.controlUIs.map(cloneControlUI);state.lastProgram=saved.lastProgram;state.lastProgramKey=saved.lastProgramKey;state.lastSuccessfulRenderSignature=saved.lastSuccessfulRenderSignature;state.lastWGSL=saved.lastWGSL;state.lastGpuAnalysis=saved.lastGpuAnalysis;state.lastRendererDiagnostics=saved.lastRendererDiagnostics;state.filtered=saved.filtered;state.usedControls=[...saved.usedControls];state.hasPendingFormulaChanges=saved.hasPendingFormulaChanges;
    $('#filterName').value=saved.name;el.description.value=saved.description;$('#filterAuthor').value=saved.author;
    saved.formulas.forEach((formula,index)=>{const field=el.formulas[index],box=field.closest('.formula'),icon=$('.formula-state',box),error=$('.formula-error',box);field.value=formula.value;field.className=formula.className;if(formula.invalid===null)field.removeAttribute('aria-invalid');else field.setAttribute('aria-invalid',formula.invalid);icon.className=formula.iconClassName;icon.textContent=formula.iconText;error.className=formula.errorClassName;error.textContent=formula.errorText;});
    controlsController.syncSliders();refreshTags();updateDocumentHeader({forceSelection:true});
    el.formulaEditStatus.dataset.state=snapshot.ui.formulaState;el.formulaEditStatus.textContent=snapshot.ui.formulaText;el.statusDot.className=snapshot.ui.statusClass;el.statusText.textContent=snapshot.ui.statusText;el.renderInfo.textContent=snapshot.ui.renderInfo;el.rendererDiagnostics.dataset.state=snapshot.ui.rendererDiagnosticsState;el.rendererDiagnostics.textContent=snapshot.ui.rendererDiagnosticsText;el.rendererDiagnostics.title=snapshot.ui.rendererDiagnosticsTitle;el.rendererSummary.dataset.state=snapshot.ui.rendererSummaryState;el.rendererSummary.textContent=snapshot.ui.rendererSummaryText;el.rendererSummary.title=snapshot.ui.rendererSummaryTitle;canvasView.drawView();
  }
  async function beginLibrarySession(){
    if(librarySession)return true;
    if(state.isRendering)throw new Error('Wait for the current render to finish before opening the library.');
    librarySession={originalWorkingDocument:captureLibraryWorkingState(),candidateEntry:null,candidateDefinition:null,candidatePrepared:null,candidateRendered:false,requestId:0};return true;
  }
  async function previewLibraryEntry(entry){
    const session=librarySession;if(!session)throw new Error('The Filter Library session is no longer open.');
    const requestId=++session.requestId,definition=resolveCatalogDefinition(entry);if(!definition)throw new Error('This filter was deleted in another tab.');
    const prepared=prepareFilter(definition),previousWorkingState=captureLibraryWorkingState(),previousCandidate={entry:session.candidateEntry,definition:session.candidateDefinition,prepared:session.candidatePrepared,rendered:session.candidateRendered};
    if(state.isRendering)await cancelRender({silent:true});
    if(librarySession!==session||requestId!==session.requestId)return false;
    applyPreparedPresentation(prepared);session.candidateEntry=entry;session.candidateDefinition=definition;session.candidatePrepared=prepared;session.candidateRendered=false;markFormulaPending();updateDocumentHeader({forceSelection:true});
    const rendered=await render();
    if(librarySession!==session||requestId!==session.requestId)return false;
    if(!rendered){session.candidateEntry=previousCandidate.entry;session.candidateDefinition=previousCandidate.definition;session.candidatePrepared=previousCandidate.prepared;session.candidateRendered=previousCandidate.rendered;restoreLibraryWorkingState(previousWorkingState);throw new Error('The candidate could not be rendered. Your previous preview was restored.');}
    session.candidateRendered=true;updateDocumentHeader({forceSelection:true});return true;
  }
  async function cancelLibrarySession(){
    const session=librarySession;if(!session)return true;session.requestId++;
    if(state.isRendering)await cancelRender({silent:true});
    if(librarySession!==session)return false;librarySession=null;restoreLibraryWorkingState(session.originalWorkingDocument);return true;
  }
  async function applyLibraryCandidate(){
    const session=librarySession;if(!session?.candidateEntry||!session.candidatePrepared||!session.candidateRendered)throw new Error('Choose a successfully rendered candidate first.');
    if(session.candidateEntry.source==='custom'){
      const current=resolveCatalogDefinition(session.candidateEntry);if(!current)throw new Error('This filter was deleted in another tab.');if(JSON.stringify(current)!==JSON.stringify(session.candidateDefinition))throw new Error('This filter changed in another tab. Preview the updated filter before applying it.');
    }
    session.requestId++;librarySession=null;commitActiveDocument(session.candidatePrepared,session.candidateDefinition,session.candidateEntry.key);refreshTags();updateDocumentHeader({forceSelection:true});toast(`${session.candidatePrepared.name} applied`);return true;
  }

  function compileAll({cache=true}={}){const key=currentProgramKey();if(cache&&state.lastProgram&&state.lastProgramKey===key){controlsController.updateControlUsage(state.lastProgram);updateRendererDiagnostics(state.lastProgram);return state.lastProgram}const astList=[];let ok=true;el.formulas.forEach(field=>{const box=field.closest('.formula'),icon=$('.formula-state',box),errorElement=$('.formula-error',box);try{astList.push(new Parser(field.value).parse());field.classList.remove('invalid');field.setAttribute('aria-invalid','false');icon.textContent='✓';icon.classList.remove('bad','pending');errorElement.textContent='';errorElement.classList.remove('show');}catch(error){ok=false;astList.push(null);field.classList.add('invalid');field.setAttribute('aria-invalid','true');icon.textContent='!';icon.classList.remove('pending');icon.classList.add('bad');errorElement.textContent=`${error.message} at character ${(error.pos??0)+1}`;errorElement.classList.add('show');}});if(!ok){controlsController.updateControlUsage(null);clearRendererDiagnostics('GPU diagnostics unavailable','Fix formula errors to inspect renderer eligibility.');return null;}try{const program=compileFilterProgram(astList,{legacyMath:state.legacyMath});if(cache){state.lastProgram=program;state.lastProgramKey=key}controlsController.updateControlUsage(program);updateRendererDiagnostics(program);return program;}catch(error){console.error('IR compilation failed',error);setStatus(`Compiler error: ${error.message}`,'error');controlsController.updateControlUsage(null);clearRendererDiagnostics('GPU diagnostics unavailable',error.message);return null;}}
  function showFormulaFailure(){const hasFieldError=el.formulas.some(field=>field.classList.contains('invalid'));setFormulaEditStatus('invalid',hasFieldError?'Fix formula errors':'Compiler error');clearRendererDiagnostics('GPU diagnostics unavailable',hasFieldError?'Fix formula errors to inspect renderer eligibility.':'The typed IR could not be compiled.');if(hasFieldError)setStatus('Fix formula errors before rendering','error');}
  function validatedCurrentFilter(){return validateFilterForPersistence(currentFilter(),error=>{console.error('Filter validation failed',error);compileAll();showFormulaFailure();setStatus(`Filter validation error: ${error.message}`,'error');toast(`Filter validation failed: ${error.message}`);});}
  function validatePendingFormulas(){if(!state.hasPendingFormulaChanges||state.isRendering)return;const program=compileAll({cache:false});if(program){setFormulaEditStatus('pending','Ready to render');setStatus('Formula valid · render to update preview','pending');}else showFormulaFailure();}
  async function render({focusInvalid=false}={}){
    if(!state.source||state.isRendering)return false;
    const program=compileAll();
    if(!program){
      showFormulaFailure();
      if(focusInvalid)el.formulas.find(field=>field.classList.contains('invalid'))?.focus();
      return false;
    }
    const id=++state.renderId,renderSignature=filterRenderSignature(currentFilter()),irLabel=`IR v${program.irVersion} · ${program.metadata.nodeCount} ops`;
    setUILocked(true,0,0,state.height||0);
    setStatus('Selecting renderer…','busy');
    el.renderInfo.textContent=`${irLabel} · selecting renderer…`;
    let selection=null,runtimeFallback=false;
    try{
      const outcome=await state.rendererManager.renderWithFallback({id,program,preference:state.rendererPreference,controls:[...state.controls],legacyMath:state.legacyMath,isCurrent:()=>id===state.renderId,onSelection:(next,context)=>{
        if(id!==state.renderId)return;selection=next;runtimeFallback=context.runtimeFallback;updateRendererDiagnostics(program,{rendererId:next.renderer.id,fallbackReason:next.fallbackReason,runtimeFallback});const fallback=next.fallbackReason?' · CPU fallback':'';setStatus(runtimeFallback?'GPU failed; rendering on CPU… 0%':`Rendering with ${next.renderer.label}… 0%`,'busy');el.renderInfo.textContent=`${next.renderer.label}${fallback} · ${irLabel} · preparing…`;
      },onProgress:message=>{
        if(id!==state.renderId||!selection)return;const fallback=selection.fallbackReason?' · CPU fallback':'';setProgress(message.pct,message.row,message.total);setStatus(runtimeFallback?`GPU failed; CPU fallback… ${Math.round(message.pct)}%`:`Rendering with ${selection.renderer.label}… ${Math.round(message.pct)}%`,'busy');el.renderInfo.textContent=`${selection.renderer.label}${fallback} · ${irLabel} · ${message.row} / ${message.total} rows`;
      }}),result=outcome.result;
      if(id!==state.renderId)return false;
      state.filtered=result.pixels;
      state.lastSuccessfulRenderSignature=renderSignature;
      canvasView.drawView();
      markPreviewCurrent();
      setStatus(outcome.fallbackReason?'Ready · CPU fallback':'Ready');
      const reason=outcome.fallbackReason?` · ${outcome.fallbackReason}`:'';
      el.renderInfo.textContent=`${result.label} · ${irLabel} · ${result.ms.toFixed(0)} ms${reason}`;
      updateRendererDiagnostics(program,{rendererId:result.backend,fallbackReason:outcome.fallbackReason,runtimeFallback:outcome.runtimeFallback});
      return true;
    }catch(error){
      if(id!==state.renderId||error?.name==='RenderCancelledError')return false;
      console.error('Render failed',error);
      setStatus(`Renderer error: ${error.message}`,'error');
      el.renderInfo.textContent=`${selection?.renderer?.label||'Renderer'} · ${irLabel} · error`;
      setRendererDiagnosticsState('error',`Renderer error · ${irLabel}`,error.message);
      return false;
    }finally{
      if(id===state.renderId)setUILocked(false);
    }
  }

  function initImage(data,width,height){state.renderId++;state.lastSuccessfulRenderSignature=null;if(state.isRendering)setUILocked(false);initializeImagePreview(data,width,height,{state,canvasView,canvas:el.canvas});el.imageInfo.textContent=`${width} × ${height} px`;initializeRendererSource().catch(error=>{console.error('Renderer initialization failed',error);setStatus(`Renderer error: ${error.message}`,'error');});render();}
  function demoImage(){const width=960,height=640,canvas=document.createElement('canvas');canvas.width=width;canvas.height=height;const context=canvas.getContext('2d'),background=context.createLinearGradient(0,0,width,height);background.addColorStop(0,'#08050d');background.addColorStop(.48,'#6c47b1');background.addColorStop(1,'#c429a3');context.fillStyle=background;context.fillRect(0,0,width,height);for(let i=0;i<18;i++){context.globalAlpha=.09;context.fillStyle=i%2?'#fff':'#07111f';context.beginPath();context.arc(90+i*58,90+(i%4)*130,60+(i%3)*35,0,Math.PI*2);context.fill();}context.globalAlpha=1;context.fillStyle='rgba(6,16,5,.82)';context.roundRect(84,94,792,452,36);context.fill();context.fillStyle='#f6efc4';context.font='700 62px system-ui';context.fillText('FILTER',132,245);context.fillStyle='#e1ec1a';context.fillText('FABJS',132,316);context.font='24px system-ui';context.fillStyle='#cdddb7';context.fillText('Open an image or experiment with this demo.',136,370);const gradient=context.createLinearGradient(136,0,790,0);gradient.addColorStop(0,'#e45a87');gradient.addColorStop(.5,'#9fd36a');gradient.addColorStop(1,'#38a9d4');context.fillStyle=gradient;context.fillRect(136,412,654,18);return context.getImageData(0,0,width,height);}
  async function loadImageFile(file,{successMessage='Image loaded',requestId=null}={}){if(!file||!String(file.type||'').startsWith('image/')){toast('Choose a valid image file');return false;}const loadId=requestId??++state.imageLoadId;let bitmap=null;setStatus('Loading image…','busy');try{bitmap=await createImageBitmap(file);if(loadId!==state.imageLoadId)return false;const maximum=1800,scale=Math.min(1,maximum/Math.max(bitmap.width,bitmap.height)),width=Math.max(1,Math.round(bitmap.width*scale)),height=Math.max(1,Math.round(bitmap.height*scale)),canvas=document.createElement('canvas');canvas.width=width;canvas.height=height;const context=canvas.getContext('2d',{willReadFrequently:true});if(!context)throw new Error('Canvas image loading is unavailable');context.drawImage(bitmap,0,0,width,height);const pixels=context.getImageData(0,0,width,height).data;if(loadId!==state.imageLoadId)return false;initImage(pixels,width,height);toast(scale<1?`${successMessage} · resized to 1800 px`:successMessage);return true;}catch(error){if(loadId!==state.imageLoadId)return false;setStatus('Could not load image','error');toast(error.message||'Could not load image');return false;}finally{bitmap?.close?.();}}
  async function openImageFile(file){
    if(!file)return false;const requestId=++state.imageLoadId;
    const result=await routeImageFileWithMetadata(file,{chooseAction:async({title,detail,choices})=>(await chooseFilterAction(title,choices,{detail})).action,openImage:image=>requestId===state.imageLoadId?loadImageFile(image,{requestId}):false,importFilter:async filter=>{if(requestId!==state.imageLoadId)return false;if(state.isRendering)await cancelRender();if(requestId!==state.imageLoadId)return false;applyFilter(filter,null,{importSource:'png'});toast('Filter imported from PNG');return true;}});
    return result.action!=='cancel';
  }

  function isEditableTarget(target){return target instanceof Element&&(target.matches('input,textarea,select,[contenteditable="true"]')||Boolean(target.closest('[contenteditable="true"]')));}
  async function copyImageToClipboard(){if(state.isRendering)return;const ClipboardItemCtor=globalThis.ClipboardItem;if(!navigator.clipboard?.write||!ClipboardItemCtor){toast('Image copy is unavailable in this browser');return;}setStatus('Encoding RGBA PNG…','busy');try{const expected=alphaStats(state.filtered),blob=await canvasBlob(renderedImageCanvas(state.filtered,state.width,state.height),'image/png');await verifyPngAlpha(blob,expected);setStatus('Writing image to clipboard…','busy');await writePngClipboard(blob);if(expected.hasAlpha){setStatus(`Ready · PNG alpha ${expected.min}–${expected.max}`);toast('RGBA PNG copied · alpha preserved');}else{setStatus('Ready · copied image is opaque');toast('PNG copied · output has no transparent pixels');}}catch(error){console.error('Clipboard copy failed',error);setStatus('Clipboard copy unavailable','error');toast(error?.name==='NotAllowedError'?'Clipboard permission was blocked by the browser':`Copy failed: ${error.message||'clipboard unavailable'}`);}}
  async function pasteImageFromClipboard(){if(state.isRendering)return;if(!navigator.clipboard?.read){toast('Clipboard reading is unavailable. Press Ctrl/⌘+V instead.');return;}setStatus('Reading clipboard…','busy');try{const items=await navigator.clipboard.read();for(const item of items){const types=Array.from(item.types||[]),type=['web image/png','image/png',...types.filter(value=>String(value).startsWith('image/'))].find(value=>types.includes(value));if(!type)continue;const raw=await item.getType(type),mime=String(type).replace(/^web\s+/,'');const blob=String(raw.type||'').startsWith('image/')?raw:new Blob([raw],{type:mime});await loadImageFile(blob,{successMessage:'Image pasted from clipboard'});return;}setStatus('Ready');toast('Clipboard does not contain an image');}catch(error){console.error('Clipboard paste failed',error);setStatus('Clipboard paste unavailable','error');toast(error?.name==='NotAllowedError'?'Clipboard permission was blocked. Press Ctrl/⌘+V instead.':`Paste failed: ${error.message||'clipboard unavailable'}`);}}

  function triggerDownload(href,name,revoke=false){try{const anchor=document.createElement('a');anchor.href=href;anchor.download=name;anchor.rel='noopener';anchor.style.display='none';document.body.appendChild(anchor);anchor.click();setTimeout(()=>{anchor.remove();if(revoke)URL.revokeObjectURL(href);},10000);toast(`Download started: ${name}`);return true;}catch(error){console.error('Download failed',error);toast(`Download failed: ${error.message||'browser blocked the file'}`);return false;}}
  function downloadBlob(blob,name){if(!(blob instanceof Blob)||!blob.size){toast('Nothing was generated to download');return false;}return triggerDownload(URL.createObjectURL(blob),name,true);}
  async function exportPNG(){if(!state.filtered||!state.width||!state.height){toast('Load and render an image before exporting');return;}const filter=validatedCurrentFilter();if(!filter)return;if(state.lastSuccessfulRenderSignature!==filterRenderSignature(filter)){setStatus('Render the current filter changes before exporting.','error');toast('Render the current filter changes before exporting.');return;}setStatus('Encoding PNG…','busy');try{const canvas=renderedImageCanvas(state.filtered,state.width,state.height),name=slug($('#filterName').value||'filtered-image')+'.png',encoded=await canvasBlob(canvas,'image/png'),envelope=createFilterFabPngEnvelope(filter,'2.8.2'),blob=await embedFilterFabMetadata(encoded,envelope);if(downloadBlob(blob,name))setStatus('Ready');}catch(error){console.error('PNG export failed',error);setStatus('PNG export failed','error');toast(`PNG export failed: ${error.message}`);}}
  function exportFilter(){const filter=validatedCurrentFilter();if(!filter)return;if(!activeDocument.id)activeDocument.id=createCustomPresetId();filter.id=activeDocument.id;const base=slug(filter.name);try{downloadBlob(new Blob([JSON.stringify(filter,null,2)+'\n'],{type:'application/json;charset=utf-8'}),base+'.json');}catch(error){console.error('Filter export failed',error);toast(`Filter export failed: ${error.message}`);}}
  async function deletePreset(){
    if(!activeDocument.key?.startsWith('custom:'))return;
    try{
      const id=activeDocument.id,dirty=isDirty(),{action}=await chooseFilterAction(`Delete “${$('#filterName').value}” from My Filters?`,dirty?[['keep','Delete and keep unsaved draft'],['cancel','Cancel']]:[['delete','Delete'],['cancel','Cancel']]);
      if(!['keep','delete'].includes(action))return;
      const {storageList}=library();localStorage.setItem('ffw-custom-presets',JSON.stringify(storageList.filter(item=>item?.id!==id)));
      try{localStorage.removeItem(PREFERENCE_PREFIX+`custom:${id}`);}catch(error){organizationError(error);}
      catalogCache=null;
      if(action==='keep'){activeDocument.key=null;activeDocument.id=undefined;activeDocument.imported=false;activeDocument.importSource=null;activeDocument.recordBaseline=null;refreshTags();}else applyFilter(presets.find(item=>item.id==='pass'),'builtin:pass');
      populatePresets();
    }catch(error){organizationError(error);}
  }
  async function importFilterFile(file){if(!file)return;try{const result=await importLatestFilterFile(file,{state,cancelRender,applyFilter});if(!result)return;toast(result.kind==='afs'?'AFS filter imported · CPU legacy mode':'Filter FabJS project imported');}catch(error){console.error('Filter import failed',error);toast(`Import failed: ${error.message}`);}finally{el.filterInput.value='';}}
  async function savePreset(){
    const filter=validatedCurrentFilter();if(!filter){await chooseFilterAction('Could not save filter',[['cancel','Keep editing']],{detail:el.statusText.textContent});return false;}
    try{
      let list=library().presets,targetId=activeDocument.key?.startsWith('custom:')?activeDocument.id:null,expected=activeDocument.recordBaseline;
      const duplicateName=list.some(item=>item.name.toLowerCase()===filter.name.toLowerCase()&&item.id!==targetId&&item.id!==filter.id);
      const choice=await chooseFilterAction('Save filter',targetId?[['update','Update this filter'],['copy','Save as new filter'],['cancel','Cancel']]:[['save','Save as new filter'],['cancel','Cancel']],{name:duplicateName?`${filter.name.slice(0,113)} (copy)`:filter.name,detail:duplicateName?'Another filter has this name. A distinct name is suggested; same-name copies are allowed.':'Saved in this browser. Export also keeps a portable copy.'});
      if(choice.action==='cancel')return false;filter.name=choice.name;
      if(choice.action==='copy'){targetId=null;filter.id=createCustomPresetId();}
      else if(!targetId&&!filter.id)filter.id=createCustomPresetId();
      list=library().presets;
      const existing=findCustomPresetById(list,targetId||filter.id);
      if(targetId&&(!existing||JSON.stringify(existing)!==expected)){
        const conflict=await chooseFilterAction('This filter changed in another tab.',existing?[['update','Update existing with my draft'],['copy','Save as new filter'],['cancel','Cancel']]:[['copy','Save as new filter'],['cancel','Cancel']],{detail:existing?`Current saved filter: ${existing.name}. Updated: ${existing.updatedAt||'unknown'}. Updating replaces that saved content with your draft.`:'The saved record was deleted. Your draft is still here.'});
        if(conflict.action==='cancel')return false;
        if(conflict.action==='copy'){targetId=null;filter.id=createCustomPresetId();}else expected=JSON.stringify(existing);
      }else if(!targetId&&existing){
        let equal=false;try{equal=portableContent(validateNativeFilter(existing))===portableContent(filter);}catch{}
        const conflict=await chooseFilterAction(equal?'Already saved':'An existing filter has this ID.',equal?[['use','Use saved record'],['copy','Save as new filter'],['cancel','Cancel']]:[['update','Update existing'],['copy','Save as new filter'],['cancel','Cancel']]);
        if(conflict.action==='cancel')return false;
        if(conflict.action==='use'){adoptSaved(existing);return true;}
        if(conflict.action==='copy')filter.id=createCustomPresetId();else{targetId=existing.id;expected=JSON.stringify(existing);}
      }
      const record=writeLibraryRecord(localStorage,normalizeCustomPresetList,filter,{targetId,expected});adoptSaved(record);toast('Filter saved in this browser');return true;
    }catch(error){organizationError(error);await chooseFilterAction('Could not save filter',[['cancel','Keep editing']],{detail:error.message});return false;}
  }
  function adoptSaved(record){activeDocument.key=`custom:${record.id}`;activeDocument.id=record.id;activeDocument.tags=normalizeTags(record.tags);activeDocument.imported=false;activeDocument.importSource=null;activeDocument.recordBaseline=JSON.stringify(record);$('#filterName').value=record.name;activeDocument.baseline=documentSnapshot();refreshTags();populatePresets();}

  function wire(){
    const modeButtons=$$('#workspaceMode [role="tab"]'),modePanels=$$('[data-mode-panel]');
    function setWorkspaceMode(mode){if(!['explore','author'].includes(mode)||mode===state.workspaceMode)return;state.workspaceMode=mode;modeButtons.forEach(button=>{const selected=button.dataset.workspaceMode===mode;button.setAttribute('aria-selected',String(selected));button.tabIndex=selected?0:-1;});modePanels.forEach(panel=>panel.hidden=panel.dataset.modePanel!==mode);}
    modeButtons.forEach(button=>{button.onclick=()=>setWorkspaceMode(button.dataset.workspaceMode);button.onkeydown=event=>{const index=modeButtons.indexOf(button),offset=event.key==='ArrowRight'?1:event.key==='ArrowLeft'?-1:0,target=event.key==='Home'?0:event.key==='End'?modeButtons.length-1:offset?(index+offset+modeButtons.length)%modeButtons.length:-1;if(target<0)return;event.preventDefault();setWorkspaceMode(modeButtons[target].dataset.workspaceMode);modeButtons[target].focus();};});
    el.rendererSelect.value=['auto','webgpu','cpu'].includes(state.rendererPreference)?state.rendererPreference:'auto';
    el.rendererSelect.onchange=()=>{state.rendererPreference=el.rendererSelect.value;storageSet('ffw-renderer',state.rendererPreference);if(!state.hasPendingFormulaChanges)render();else validatePendingFormulas();};
    $('#openImageBtn').onclick=()=>el.imageInput.click();
    el.imageInput.onchange=async()=>{await openImageFile(el.imageInput.files[0]);el.imageInput.value='';};
    $('#pasteImageBtn').onclick=pasteImageFromClipboard;
    $('#copyImageBtn').onclick=copyImageToClipboard;
    $('#importBtn').onclick=()=>el.filterInput.click();
    el.filterInput.onchange=()=>importFilterFile(el.filterInput.files[0]);
    $('#exportFilterBtn').onclick=exportFilter;
    $('#exportImageBtn').onclick=exportPNG;
    $('#savePresetBtn').onclick=savePreset;
    el.deletePreset.onclick=deletePreset;
    el.renderBtn.onclick=()=>render({focusInvalid:true});
    const resetFilter=()=>applyFilter(presets.find(preset=>preset.id==='pass'),'builtin:pass');$('#resetBtn').onclick=resetFilter;$('#exploreResetBtn').onclick=resetFilter;
    el.activeFavorite.onclick=()=>{if(!activeDocument.key)return;try{const current=preference(activeDocument.key);writeEntryPreference(localStorage,activeDocument.key,{favorite:!current.favorite});catalogCache=null;browser?.refresh();updateDocumentHeader();}catch(error){organizationError(error);}};
    browser=createFilterBrowser({launcher:el.searchFilters,getEntries:catalog,begin:beginLibrarySession,preview:previewLibraryEntry,apply:applyLibraryCandidate,cancel:cancelLibrarySession,toggleFavorite:entry=>{writeEntryPreference(localStorage,entry.key,{favorite:!entry.favorite});catalogCache=null;if(entry.key===activeDocument.key)updateDocumentHeader();},onError:organizationError});
    populatePresets();
    el.preset.onchange=async()=>{
      const key=el.preset.value;
      if(key===activeDocument.key)return;
      const entry=catalog().find(item=>item.key===key);if(!entry)return;
      try{await loadCatalogEntry(entry,el.preset);}catch(error){organizationError(error);}finally{updateDocumentHeader({forceSelection:true});}
    };
    const addTag=()=>{const tags=activeDocument.key?.startsWith('builtin:')?preference(activeDocument.key).tags:activeDocument.tags;if(commitTags([...tags,$('#newTag').value])){$('#newTag').value='';refreshTags();$('#newTag').focus();}};
    $('#addTagBtn').onclick=addTag;$('#newTag').onkeydown=event=>{if(event.key==='Enter'&&!event.isComposing){event.preventDefault();addTag();}};$('#newTag').oninput=refreshTags;
    // The preset's native input event precedes change. Only its own change handler
    // may restore the selection, after capturing the requested ID.
    document.addEventListener('input',event=>{if(event.target!==el.preset&&event.target.closest('.sidebar'))queueMicrotask(updateDocumentHeader);});
    document.addEventListener('change',event=>{if(event.target!==el.preset&&event.target.closest('.sidebar'))queueMicrotask(updateDocumentHeader);});
    $('#editControlsDialog').addEventListener('close',updateDocumentHeader);
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
    document.addEventListener('keydown',event=>{if(event.key==='Escape'&&!document.querySelector('dialog[open]')&&state.isRendering){event.preventDefault();event.stopPropagation();cancelRender();return;}if((event.ctrlKey||event.metaKey)&&event.shiftKey&&event.key.toLowerCase()==='c'&&!state.isRendering&&!isEditableTarget(event.target)){event.preventDefault();copyImageToClipboard();}});
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
    el.stage.addEventListener('drop',event=>{event.preventDefault();hideDrop();if(state.isRendering)return;openImageFile(event.dataTransfer?.files?.[0]);});
    document.addEventListener('dragend',hideDrop);
    window.addEventListener('blur',hideDrop);
    $('#helpBtn').onclick=()=>$('#helpDialog').showModal();
    $('#closeHelp').onclick=()=>$('#helpDialog').close();
    window.addEventListener('storage',event=>{if(event.key===null||event.key==='ffw-custom-presets'||event.key.startsWith(PREFERENCE_PREFIX)){
      if(activeDocument.key?.startsWith('custom:')){try{const record=findCustomPresetById(library().presets,activeDocument.id);if(!record){activeDocument.key=null;activeDocument.id=undefined;activeDocument.imported=false;activeDocument.importSource=null;toast('Saved filter deleted in another tab. Save as new to keep this draft.');}else if(JSON.stringify(record)!==activeDocument.recordBaseline)toast('Saved filter changed in another tab. Update will require review.');}catch(error){organizationError(error);}}
      catalogCache=null;refreshTags();populatePresets();
    }});
    window.addEventListener('beforeunload',()=>state.rendererManager?.dispose());
  }

  window.FilterFabJS=Object.freeze({version:'2.8.2',irVersion:IR_VERSION,getLastProgram:()=>state.lastProgram?JSON.parse(JSON.stringify(state.lastProgram)):null,getLastWGSL:()=>state.lastWGSL,getWebGPUAnalysis:()=>state.lastGpuAnalysis?JSON.parse(JSON.stringify(state.lastGpuAnalysis)):null,getRendererDiagnostics:()=>state.lastRendererDiagnostics?JSON.parse(JSON.stringify(state.lastRendererDiagnostics)):null,getRendererPreference:()=>state.rendererPreference,getWorkspaceMode:()=>state.workspaceMode,getLibraryPreviewState:()=>({open:Boolean(librarySession),candidateKey:librarySession?.candidateEntry?.key||null,candidateRendered:Boolean(librarySession?.candidateRendered),activeKey:activeDocument.key,activeId:activeDocument.id,imported:activeDocument.imported,importSource:activeDocument.importSource,baseline:activeDocument.baseline,recordBaseline:activeDocument.recordBaseline})});
  controlsController.buildSliders();wire();const demo=demoImage();initImage(demo.data,demo.width,demo.height);applyFilter(presets.find(preset=>preset.id==='pass'),'builtin:pass');
  return{state,render,applyFilter,loadImageFile,openImageFile};
}
