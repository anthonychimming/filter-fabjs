/**
 * Filter FabJS
 * Modular source extracted from v2.0.7; modular architecture v2.1.0.
 * Licensed GPL-2.0-or-later. See LICENSE and README.md.
 */

import { $ } from '../core/utils.js';
import {
  CONTROL_COUNT,
  CONTROL_DEFINITIONS,
  CONTROL_UNIT_MAX_LENGTH,
  cloneControlUI,
  displayToRaw,
  formatControlValue,
  normalizeControlUI,
  normalizeToggleRaw,
  randomSeedDisplay,
  rawToDisplay,
  validateControlUI
} from '../core/controls.js';

const AUTHORING_PRESETS=Object.freeze({
  generic:{widget:'slider',displayMin:0,displayMax:255,step:1,format:'number',unit:''},
  percentage:{widget:'slider',displayMin:0,displayMax:100,step:1,format:'number',unit:'%'},
  angle:{widget:'slider',displayMin:0,displayMax:360,step:1,format:'number',unit:'°'},
  seed:{widget:'seed',displayMin:1,displayMax:9999,step:1,format:'integer',unit:''}
});

function append(parent,tag,className='',text=''){const node=document.createElement(tag);if(className)node.className=className;if(text)node.textContent=text;parent.appendChild(node);return node}
function numericEditorUI(entry){return{widget:entry.ui.widget,displayMin:Number(entry.ui.displayMin),displayMax:Number(entry.ui.displayMax),step:Number(entry.ui.step),format:entry.ui.format,unit:entry.ui.unit}}

export function createControlsController({state,el,scheduleRender,applyInteractionLocks,compileCurrentProgram}){
  const grid=$('#sliderGrid'),dialog=$('#editControlsDialog'),editorList=$('#controlEditorList'),editorError=$('#controlEditorError'),mappingPanel=$('#controlMappingFeedback'),preview=$('#controlEditorPreview');
  const fields={label:$('#controlEditorLabel'),widget:$('#controlEditorWidget'),displayMin:$('#controlEditorMin'),displayMax:$('#controlEditorMax'),step:$('#controlEditorStep'),format:$('#controlEditorFormat'),unit:$('#controlEditorUnit')};
  let draft=null,selectedIndex=0;

  function controlName(index){return String(state.labels[index]||`Control ${index+1}`)}
  function accessibleName(index){return `${controlName(index)}, control ${index}`}
  function displayValue(index){return rawToDisplay(state.controls[index],state.controlUIs[index])}
  function updateCanonical(index,value){state.controls[index]=displayToRaw(value,state.controlUIs[index])}
  function addReadout(row,index,ui,value){const readout=append(row,'output','control-readout');readout.textContent=formatControlValue(value,ui);if(ui.unit)append(readout,'span','control-unit',` ${ui.unit}`);readout.setAttribute('aria-label',`${accessibleName(index)} value`);return readout}
  function buildRuntimeControl(definition){
    const index=definition.index,ui=normalizeControlUI(state.controlUIs[index]),value=displayValue(index),row=append(grid,'div','slider-row');row.dataset.controlIndex=String(index);
    append(row,'span','slider-index',String(index));
    const label=append(row,'button','control-label-button',controlName(index));label.type='button';label.title=`Edit ${controlName(index)}`;label.setAttribute('aria-label',`Edit ${accessibleName(index)}`);label.onclick=()=>openEditor(index);
    const widget=append(row,'div',`control-widget control-widget-${ui.widget}`),name=accessibleName(index);let readout;
    if(ui.widget==='slider'){
      const input=append(widget,'input','slider-range');input.type='range';input.min=String(ui.displayMin);input.max=String(ui.displayMax);input.step=String(ui.step);input.value=String(value);input.setAttribute('aria-label',name);readout=addReadout(row,index,ui,value);
      input.oninput=()=>{updateCanonical(index,input.value);const shown=rawToDisplay(state.controls[index],ui);readout.firstChild.textContent=formatControlValue(shown,ui);};input.onchange=()=>scheduleRender();
    }else if(ui.widget==='number'||ui.widget==='seed'){
      const input=append(widget,'input','slider-value');input.type='number';input.min=String(ui.displayMin);input.max=String(ui.displayMax);input.step=String(ui.step);input.value=formatControlValue(value,ui);input.setAttribute('aria-label',name);readout=addReadout(row,index,ui,value);readout.classList.add('unit-only');readout.firstChild.textContent='';
      const commit=()=>{if(input.value==='')return;updateCanonical(index,input.value);const shown=rawToDisplay(state.controls[index],ui);input.value=formatControlValue(shown,ui);readout.firstChild.textContent='';};input.oninput=()=>{if(input.value!=='')updateCanonical(index,input.value);};input.onchange=()=>{commit();scheduleRender();};
      if(ui.widget==='seed'){
        const randomize=append(widget,'button','seed-randomize','↻');randomize.type='button';randomize.setAttribute('aria-label',`Generate new ${controlName(index)} value`);randomize.onclick=()=>{const seed=randomSeedDisplay(ui);updateCanonical(index,seed);input.value=formatControlValue(seed,ui);scheduleRender();};
      }
    }else{
      const input=append(widget,'input','toggle-input');input.type='checkbox';input.setAttribute('role','switch');input.checked=normalizeToggleRaw(state.controls[index])===255;input.setAttribute('aria-label',name);input.setAttribute('aria-checked',String(input.checked));readout=addReadout(row,index,ui,input.checked?1:0);readout.textContent=input.checked?'On':'Off';
      input.onchange=()=>{state.controls[index]=input.checked?255:0;input.setAttribute('aria-checked',String(input.checked));readout.textContent=input.checked?'On':'Off';scheduleRender();};
    }
    const usage=append(row,'span','control-usage-status visually-hidden',state.usedControls[index]?'Used':'Unused');usage.setAttribute('aria-live','polite');
  }
  function buildSliders(){grid.replaceChildren();for(const definition of CONTROL_DEFINITIONS)buildRuntimeControl(definition);applyInteractionLocks();}
  function syncSliders(){buildSliders()}
  function updateControlUsage(program){state.usedControls=program?.metadata?.controlMask?[...program.metadata.controlMask]:Array(CONTROL_COUNT).fill(true);const count=state.usedControls.filter(Boolean).length;el.controlsUsage.textContent=count?`${count} active`:'No controls used';grid.querySelectorAll('.control-usage-status').forEach((status,index)=>status.textContent=state.usedControls[index]?'Used':'Unused');if(dialog.open)renderEditorList();applyInteractionLocks();}
  function refreshControlUsage(){try{updateControlUsage(compileCurrentProgram())}catch{updateControlUsage(null)}}

  function draftEntry(index){return draft[index]}
  function captureEditorFields(){
    if(!draft)return;const entry=draftEntry(selectedIndex);entry.label=fields.label.value;entry.ui={widget:fields.widget.value,displayMin:fields.displayMin.value,displayMax:fields.displayMax.value,step:fields.step.value,format:fields.format.value,unit:fields.unit.value};
  }
  function loadEditorFields(){
    const entry=draftEntry(selectedIndex);fields.label.value=entry.label;fields.widget.value=entry.ui.widget;fields.displayMin.value=entry.ui.displayMin;fields.displayMax.value=entry.ui.displayMax;fields.step.value=entry.ui.step;fields.format.value=entry.ui.format;fields.unit.value=entry.ui.unit;updateEditorFieldState();renderMappingFeedback();renderPreview();
  }
  function updateEditorFieldState(){const toggle=fields.widget.value==='toggle',seed=fields.widget.value==='seed';if(seed)fields.format.value='integer';fields.displayMin.disabled=toggle;fields.displayMax.disabled=toggle;fields.step.disabled=toggle;fields.format.disabled=toggle||seed;fields.unit.disabled=false;}
  function renderEditorList(){
    if(!draft)return;editorList.replaceChildren();draft.forEach((entry,index)=>{const button=append(editorList,'button','control-editor-item');button.type='button';button.classList.toggle('active',index===selectedIndex);append(button,'span','control-editor-index',String(index));append(button,'span','control-editor-name',String(entry.label||`Control ${index+1}`));append(button,'span',state.usedControls[index]?'control-editor-used':'control-editor-unused',state.usedControls[index]?'Used':'Unused');button.setAttribute('aria-current',index===selectedIndex?'true':'false');button.onclick=()=>{captureEditorFields();selectedIndex=index;renderEditorList();loadEditorFields();};});
  }
  function currentMapping(){try{return compileCurrentProgram()?.metadata?.controlMappings?.[selectedIndex]??null}catch{return null}}
  function renderMappingFeedback(){
    mappingPanel.replaceChildren();append(mappingPanel,'strong','','Formula mapping');const mapping=currentMapping();
    if(mapping?.type==='conflict'){append(mappingPanel,'p','mapping-warning','Multiple or dynamic formula mappings detected. Automatic display-range suggestion is unavailable.');return}
    if(mapping?.type!=='val'){append(mappingPanel,'p','mapping-neutral','No simple val() mapping detected.');return}
    append(mappingPanel,'code','',`val(${selectedIndex}, ${mapping.min}, ${mapping.max})`);append(mappingPanel,'p','mapping-suggestion',`Suggested display range: ${mapping.min} → ${mapping.max}`);
    const ui=numericEditorUI(draftEntry(selectedIndex)),validSuggestion=mapping.max>mapping.min,matches=validSuggestion&&Number.isFinite(ui.displayMin)&&Number.isFinite(ui.displayMax)&&Math.abs(ui.displayMin-mapping.min)<1e-9&&Math.abs(ui.displayMax-mapping.max)<1e-9;
    if(!validSuggestion){append(mappingPanel,'p','mapping-warning','This reversed or empty mapping cannot be used as an increasing UI display range.');return}
    append(mappingPanel,'p',matches?'mapping-match':'mapping-warning',matches?'✓ Matches formula mapping':'⚠ Display range differs from formula mapping');
    const use=append(mappingPanel,'button','use-mapping-button','Use suggested range');use.type='button';use.disabled=matches;use.onclick=()=>{fields.displayMin.value=String(mapping.min);fields.displayMax.value=String(mapping.max);const range=mapping.max-mapping.min;if(!(Number(fields.step.value)>0&&Number(fields.step.value)<=range))fields.step.value='1';captureEditorFields();renderMappingFeedback();renderPreview();};
  }
  function renderPreview(){
    preview.replaceChildren();const entry=draftEntry(selectedIndex),ui=normalizeControlUI(numericEditorUI(entry)),value=rawToDisplay(state.controls[selectedIndex],ui);append(preview,'span','control-preview-label',String(entry.label||`Control ${selectedIndex+1}`));
    if(ui.widget==='toggle'){const input=append(preview,'input');input.type='checkbox';input.setAttribute('role','switch');input.checked=normalizeToggleRaw(state.controls[selectedIndex])===255;input.disabled=true;append(preview,'span','control-preview-value',input.checked?'On':'Off');return}
    const input=append(preview,'input');input.type=ui.widget==='slider'?'range':'number';input.min=String(ui.displayMin);input.max=String(ui.displayMax);input.step=String(ui.step);input.value=String(value);input.disabled=true;append(preview,'span','control-preview-value',`${formatControlValue(value,ui)}${ui.unit?` ${ui.unit}`:''}`);
  }
  function openEditor(index=0){
    draft=CONTROL_DEFINITIONS.map((definition,controlIndex)=>({label:controlName(controlIndex),ui:cloneControlUI(state.controlUIs[controlIndex])}));selectedIndex=index;editorError.textContent='';$('#controlAuthoringPreset').value='';renderEditorList();loadEditorFields();dialog.showModal();fields.label.focus();
  }
  function closeEditor(){draft=null;dialog.close('cancel')}
  function commitEditor(){
    captureEditorFields();try{
      const labels=[],uis=[];draft.forEach((entry,index)=>{const label=String(entry.label).trim();if(label.length>80)throw new Error(`Control ${index} label exceeds 80 characters`);labels.push(label||`Control ${index+1}`);uis.push(validateControlUI(numericEditorUI(entry)));});
      let valuesChanged=false;const values=state.controls.map((raw,index)=>{if(uis[index].widget!=='toggle')return raw;const normalized=normalizeToggleRaw(raw);if(normalized!==raw)valuesChanged=true;return normalized;});
      state.labels=labels;state.controlUIs=uis;state.controls=values;draft=null;dialog.close('done');syncSliders();if(valuesChanged)scheduleRender();
    }catch(error){editorError.textContent=error.message;}
  }
  Object.values(fields).forEach(field=>field.addEventListener('input',()=>{captureEditorFields();editorError.textContent='';updateEditorFieldState();renderEditorList();renderMappingFeedback();renderPreview();}));
  $('#controlAuthoringPreset').onchange=event=>{const preset=AUTHORING_PRESETS[event.target.value];if(!preset)return;draftEntry(selectedIndex).ui=cloneControlUI(preset);loadEditorFields();event.target.value='';};
  $('#editControlsBtn').onclick=()=>openEditor(0);$('#closeControlEditor').onclick=closeEditor;$('#cancelControlEditor').onclick=closeEditor;$('#doneControlEditor').onclick=commitEditor;
  dialog.addEventListener('cancel',event=>{event.preventDefault();closeEditor();});
  return{buildSliders,syncSliders,updateControlUsage,refreshControlUsage,openEditor};
}
