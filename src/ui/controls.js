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
  normalizeColorGroups,
  normalizeToggleRaw,
  randomSeedDisplay,
  reconcileTogglePreservation,
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

export function groupLockState(locks,channels){const count=channels.filter(index=>Boolean(locks[index])).length;return count===0?'false':count===channels.length?'true':'mixed'}
export function toggleGroupLocks(locks,channels){const lock=groupLockState(locks,channels)!=='true';channels.forEach(index=>{locks[index]=lock});return lock}

export function createControlsController({state,el,scheduleRender,applyInteractionLocks,compileCurrentProgram,onManualChange=()=>{},onSchemaChange=()=>{}}){
  const grid=$('#sliderGrid'),dialog=$('#editControlsDialog'),editorList=$('#controlEditorList'),editorError=$('#controlEditorError'),mappingPanel=$('#controlMappingFeedback'),preview=$('#controlEditorPreview');
  const fields={label:$('#controlEditorLabel'),widget:$('#controlEditorWidget'),displayMin:$('#controlEditorMin'),displayMax:$('#controlEditorMax'),step:$('#controlEditorStep'),format:$('#controlEditorFormat'),unit:$('#controlEditorUnit')};
  let draft=null,selectedIndex=0,groupDraft=[],expandedGroups=new Set();

  function controlName(index){return String(state.labels[index]||`Control ${index+1}`)}
  function accessibleName(index){return `${controlName(index)}, control ${index}`}
  function displayValue(index){return rawToDisplay(state.controls[index],state.controlUIs[index])}
  function updateCanonical(index,value){state.controls[index]=displayToRaw(value,state.controlUIs[index]);onManualChange();refreshColors()}
  function addReadout(row,index,ui,value){const readout=append(row,'output','control-readout');readout.textContent=formatControlValue(value,ui);if(ui.unit)append(readout,'span','control-unit',` ${ui.unit}`);readout.setAttribute('aria-live','off');readout.setAttribute('aria-label',`${accessibleName(index)} value`);return readout}
  function buildRuntimeControl(definition,parent=grid,channel=''){
    const index=definition.index,ui=normalizeControlUI(state.controlUIs[index]),value=displayValue(index),row=append(parent,'div','slider-row');row.dataset.controlIndex=String(index);
    const lock=append(row,'button','control-lock');lock.type='button';
    const refreshLock=()=>{const locked=Boolean(state.explore?.locks[index]);lock.setAttribute('aria-pressed',String(locked));lock.title=`${locked?'Unlock':'Lock'} ${controlName(index)}`;lock.setAttribute('aria-label',lock.title);lock.innerHTML=locked?'<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="5" y="10" width="14" height="11" rx="2"/><path d="M8 10V6a4 4 0 0 1 8 0v4"/></svg>':'<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="5" y="10" width="14" height="11" rx="2"/><path d="M8 10V6a4 4 0 0 1 8 0"/></svg>';};
    lock.refreshLock=refreshLock;refreshLock();lock.onclick=()=>{state.explore.locks[index]=!state.explore.locks[index];refreshLock();refreshGroupLocks();applyInteractionLocks();};
    append(row,'span','control-label',`${channel?channel+' · ':''}${controlName(index)}`);
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
      input.onchange=()=>{state.controls[index]=input.checked?255:0;onManualChange();refreshColors();input.setAttribute('aria-checked',String(input.checked));readout.textContent=input.checked?'On':'Off';scheduleRender();};
    }
    const usage=append(row,'span','control-usage-status visually-hidden',state.usedControls[index]?'Used':'Unused');usage.setAttribute('aria-live','off');
  }
  function colorHex(group){return '#'+Object.values(group.channels).map(i=>Math.round(Math.max(0,Math.min(255,state.controls[i]))).toString(16).padStart(2,'0')).join('').toUpperCase()}
  function refreshColors(){grid.querySelectorAll('.color-group').forEach(row=>{const group=state.colorGroups[Number(row.dataset.groupIndex)];if(!group)return;const hex=colorHex(group),picker=row.querySelector('.color-picker'),field=row.querySelector('.color-hex');picker.value=hex;if(document.activeElement!==field)field.value=hex;});}
  function refreshGroupLocks(){grid.querySelectorAll('.group-lock').forEach(button=>button.refreshLock());}
  function buildColorGroup(group,index){
    const row=append(grid,'div','color-group');row.dataset.groupIndex=String(index);
    const heading=append(row,'div','color-group-heading');
    const groupLock=append(heading,'button','control-lock group-lock');groupLock.type='button';const indices=Object.values(group.channels);
    groupLock.refreshLock=()=>{const current=groupLockState(state.explore?.locks||{},indices),mixed=current==='mixed',locked=current==='true';groupLock.setAttribute('aria-pressed',current);groupLock.setAttribute('aria-label',mixed?`Some ${group.label} channels locked; lock all`:locked?`Unlock all ${group.label} channels`:`Lock all ${group.label} channels`);groupLock.title=mixed?'Some color channels locked':locked?'Unlock all color channels':'Lock all color channels';groupLock.classList.toggle('mixed',mixed);groupLock.innerHTML=current==='false'?'<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="5" y="10" width="14" height="11" rx="2"/><path d="M8 10V6a4 4 0 0 1 8 0"/></svg>':'<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="5" y="10" width="14" height="11" rx="2"/><path d="M8 10V6a4 4 0 0 1 8 0v4"/></svg>';};
    groupLock.refreshLock();groupLock.onclick=()=>{toggleGroupLocks(state.explore.locks,indices);groupLock.refreshLock();row.querySelectorAll('.slider-row .control-lock').forEach(button=>button.refreshLock());applyInteractionLocks();};
    append(heading,'span','color-group-label',group.label);
    const picker=append(heading,'input','color-picker');picker.type='color';picker.value=colorHex(group);picker.setAttribute('aria-label',`${group.label} color`);
    const hex=append(heading,'input','color-hex');hex.type='text';hex.value=colorHex(group);hex.maxLength=7;hex.setAttribute('aria-label',`${group.label} hexadecimal color`);
    const unavailable=Object.values(group.channels).some(i=>!state.usedControls[i]);picker.disabled=unavailable;hex.disabled=unavailable;if(unavailable){picker.title=hex.title='All RGB channels must be used by the formulas to edit the color.';}
    const error=append(row,'span','color-error');error.id=`color-error-${index}`;error.setAttribute('role','status');if(unavailable)error.textContent='All RGB channels must be used by the formulas to edit the color.';hex.setAttribute('aria-describedby',error.id);
    const toggle=append(heading,'button','color-expand');toggle.type='button';const isOpen=expandedGroups.has(index);toggle.textContent=isOpen?'▴':'▾';toggle.setAttribute('aria-label',`${isOpen?'Hide':'Show'} ${group.label} channels`);toggle.title=`${isOpen?'Hide':'Show'} channels`;toggle.setAttribute('aria-expanded',String(isOpen));
    const channels=append(row,'div','color-channels');channels.id=`color-channels-${index}`;toggle.setAttribute('aria-controls',channels.id);channels.hidden=!isOpen;
    for(const [name,i] of Object.entries(group.channels))buildRuntimeControl(CONTROL_DEFINITIONS[i],channels,name.toUpperCase());
    toggle.onclick=()=>{const open=channels.hidden;channels.hidden=!open;toggle.setAttribute('aria-expanded',String(open));toggle.textContent=open?'▴':'▾';toggle.setAttribute('aria-label',`${open?'Hide':'Show'} ${group.label} channels`);toggle.title=`${open?'Hide':'Show'} channels`;if(open)expandedGroups.add(index);else expandedGroups.delete(index);};
    const apply=value=>{if(!/^#[0-9a-f]{6}$/i.test(value))return false;const bytes=[1,3,5].map(start=>parseInt(value.slice(start,start+2),16));Object.values(group.channels).forEach((channel,i)=>state.controls[channel]=bytes[i]);onManualChange();error.textContent='';hex.setAttribute('aria-invalid','false');refreshColors();channels.replaceChildren();for(const [name,i] of Object.entries(group.channels))buildRuntimeControl(CONTROL_DEFINITIONS[i],channels,name.toUpperCase());applyInteractionLocks();scheduleRender();return true;};
    picker.onchange=()=>apply(picker.value);
    hex.oninput=()=>{const valid=/^#[0-9a-f]{6}$/i.test(hex.value);hex.setAttribute('aria-invalid',String(!valid));error.textContent=valid?'':'Enter a color as #RRGGBB.';};
    hex.onchange=()=>{if(apply(hex.value))return;};
    hex.onblur=()=>{if(!/^#[0-9a-f]{6}$/i.test(hex.value)){hex.value=colorHex(group);hex.setAttribute('aria-invalid','false');error.textContent='';}};
    hex.onkeydown=event=>{if(event.key==='Escape'){hex.value=colorHex(group);hex.setAttribute('aria-invalid','false');error.textContent='';event.stopPropagation();}};
  }
  function buildSliders(){grid.replaceChildren();const groups=state.colorGroups||[],members=new Set(groups.flatMap(group=>Object.values(group.channels)));for(const definition of CONTROL_DEFINITIONS){const index=definition.index,groupIndex=groups.findIndex(group=>Math.min(...Object.values(group.channels))===index);if(groupIndex>=0){const group=groups[groupIndex];if(Object.values(group.channels).some(i=>state.usedControls[i]))buildColorGroup(group,groupIndex);}else if(!members.has(index)&&state.usedControls[index])buildRuntimeControl(definition);}el.controlsEmpty.hidden=state.usedControls.some(Boolean);applyInteractionLocks();}
  function syncSliders(){buildSliders()}
  function updateControlUsage(program){const next=program?.metadata?.controlMask?[...program.metadata.controlMask]:Array(CONTROL_COUNT).fill(true),changed=next.some((used,index)=>used!==state.usedControls[index]);state.usedControls=next;const count=state.usedControls.filter(Boolean).length,label=count?`${count} active`:'No controls used';el.controlsUsage.textContent=label;el.authorControlsUsage.textContent=label;if(changed)buildSliders();else{grid.querySelectorAll('.control-usage-status').forEach(status=>{const index=Number(status.closest('.slider-row')?.dataset.controlIndex);status.textContent=state.usedControls[index]?'Used':'Unused';});applyInteractionLocks();}if(dialog.open)renderEditorList();}
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
  const groupEditor=$('#colorGroupEditor');
  function renderGroups(){
    groupEditor.replaceChildren();
    groupDraft.forEach((group,index)=>{
      const box=append(groupEditor,'fieldset','color-group-editor');const legend=append(box,'legend','',`Color group ${index+1}`);
      const label=append(box,'label','','Label');const name=append(label,'input');name.type='text';name.maxLength=80;name.value=group.label;name.oninput=()=>{group.label=name.value;};
      for(const channel of ['red','green','blue']){const wrapper=append(box,'label','',channel[0].toUpperCase()+channel.slice(1));const select=append(wrapper,'select');select.dataset.groupIndex=String(index);select.dataset.channel=channel;
        const empty=append(select,'option','','Choose control');empty.value='';
        CONTROL_DEFINITIONS.forEach(definition=>{const option=append(select,'option','',`${definition.index}: ${draft[definition.index].label}`);option.value=String(definition.index);option.disabled=groupDraft.some((other,j)=>Object.entries(other.channels).some(([key,value])=>(j!==index||key!==channel)&&value===definition.index));});
        select.value=Number.isInteger(group.channels[channel])?String(group.channels[channel]):'';select.onchange=()=>{group.channels[channel]=select.value===''?null:Number(select.value);renderGroups();groupEditor.querySelector(`select[data-group-index="${index}"][data-channel="${channel}"]`)?.focus();};
      }
      const remove=append(box,'button','','Remove group');remove.type='button';remove.onclick=()=>{groupDraft.splice(index,1);renderGroups();groupEditor.querySelector('.add-color-group')?.focus();};
    });
    const add=append(groupEditor,'button','add-color-group','Add color group');add.type='button';add.disabled=groupDraft.length>=Math.floor(CONTROL_COUNT/3);add.onclick=()=>{groupDraft.push({label:'',channels:{red:null,green:null,blue:null}});renderGroups();};
  }
  function openEditor(index=0){
    draft=CONTROL_DEFINITIONS.map((definition,controlIndex)=>({label:controlName(controlIndex),ui:cloneControlUI(state.controlUIs[controlIndex])}));groupDraft=normalizeColorGroups(state.colorGroups);renderGroups();selectedIndex=index;editorError.textContent='';$('#controlAuthoringPreset').value='';renderEditorList();loadEditorFields();dialog.showModal();fields.label.focus();
  }
  function closeEditor(){draft=null;dialog.close('cancel')}
  function commitEditor(){
    captureEditorFields();try{
      const labels=[],uis=[];draft.forEach((entry,index)=>{const label=String(entry.label).trim();if(label.length>80)throw new Error(`Control ${index} label exceeds 80 characters`);labels.push(label||`Control ${index+1}`);uis.push(validateControlUI(numericEditorUI(entry)));});
      const newGrouped=new Set(normalizeColorGroups(groupDraft).flatMap(group=>Object.values(group.channels)));
      const preserveToggleValues=reconcileTogglePreservation(uis,state.controls,state.preserveToggleValues,state.colorGroups,groupDraft);
      let valuesChanged=false;const values=state.controls.map((raw,index)=>{if(uis[index].widget!=='toggle'||newGrouped.has(index)||preserveToggleValues[index])return raw;const normalized=normalizeToggleRaw(raw);if(normalized!==raw)valuesChanged=true;return normalized;});
      const schemaChanged=JSON.stringify(uis)!==JSON.stringify(state.controlUIs);
      if(normalizeColorGroups(groupDraft).length!==groupDraft.length)throw new Error('Each color group needs a label and three distinct, unused channels.');
      state.labels=labels;state.controlUIs=uis;state.controls=values;state.preserveToggleValues=preserveToggleValues;state.colorGroups=normalizeColorGroups(groupDraft);expandedGroups.clear();if(schemaChanged)onSchemaChange();draft=null;dialog.close('done');syncSliders();if(valuesChanged)scheduleRender();
    }catch(error){editorError.textContent=error.message;}
  }
  Object.values(fields).forEach(field=>field.addEventListener('input',()=>{captureEditorFields();editorError.textContent='';updateEditorFieldState();renderEditorList();renderMappingFeedback();renderPreview();}));
  $('#controlAuthoringPreset').onchange=event=>{const preset=AUTHORING_PRESETS[event.target.value];if(!preset)return;draftEntry(selectedIndex).ui=cloneControlUI(preset);loadEditorFields();event.target.value='';};
  $('#editControlsBtn').onclick=()=>openEditor(0);$('#closeControlEditor').onclick=closeEditor;$('#cancelControlEditor').onclick=closeEditor;$('#doneControlEditor').onclick=commitEditor;
  dialog.addEventListener('cancel',event=>{event.preventDefault();closeEditor();});
  return{buildSliders,syncSliders,updateControlUsage,refreshControlUsage,openEditor};
}
