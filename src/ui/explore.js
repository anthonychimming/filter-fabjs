import { controlStatesEqual, createExploreSession, exploreValues, commitExploreValues, saveExploreSnapshot } from '../app/explore-state.js';
import { storageGet, storageSet } from '../core/utils.js';

const MUTATION_STRENGTHS=Object.freeze({Subtle:'Low',Medium:'Medium',Strong:'High',Random:'Random'});
const MUTATION_STRENGTH_KEY='ffw-mutation-strength';

export function exploreMenuPlacement(anchor,menu,bounds){
  const below=Math.max(0,bounds.bottom-anchor.bottom),above=Math.max(0,anchor.top-bounds.top);
  const upwards=menu.height>below&&above>below;
  return {upwards,maxHeight:upwards?above:below,shiftX:Math.min(0,bounds.right-menu.right)+Math.max(0,bounds.left-menu.left)};
}

// Session state belongs to the app; this view never writes the filter document.
export function createExploreController({state,root,resetButton,syncControls,scheduleRender,onChange,resetPassThrough,toast,readPreference=storageGet,writePreference=storageSet,confirmOverwrite=message=>document.defaultView.confirm(message)}){
  const buttons={},slots={},saveButtons={},menus=[];
  const preference=readPreference(MUTATION_STRENGTH_KEY,'Medium');
  let selectedStrength=Object.hasOwn(MUTATION_STRENGTHS,preference)?preference:'Medium';
  let snapshotFeedback='';
  function button(parent,text,action){const node=document.createElement('button');node.type='button';node.textContent=text;node.onclick=()=>{if(state.isRendering)return;const owner=menus.find(item=>item.panel===parent);closeMenus();owner?.trigger.focus();action();refresh();};parent.append(node);return node;}
  function closeMenus(){menus.forEach(({panel,trigger})=>{panel.hidden=true;trigger.setAttribute('aria-expanded','false');});}
  function positionMenu(panel,trigger){
    const view=document.defaultView,bounds={top:4,left:4,right:view.innerWidth-4,bottom:view.innerHeight-4};
    // Overflow ancestors can clip a menu even when the viewport has space.
    for(let parent=trigger.parentElement;parent;parent=parent.parentElement){
      const style=view.getComputedStyle(parent),rect=parent.getBoundingClientRect();
      if(/auto|scroll|hidden|clip/.test(style.overflowY)){bounds.top=Math.max(bounds.top,rect.top+4);bounds.bottom=Math.min(bounds.bottom,rect.bottom-4);}
      if(/auto|scroll|hidden|clip/.test(style.overflowX)){bounds.left=Math.max(bounds.left,rect.left+4);bounds.right=Math.min(bounds.right,rect.right-4);}
    }
    panel.classList.toggle('opens-above',false);panel.style.maxHeight='';panel.style.transform='';
    const placement=exploreMenuPlacement(trigger.getBoundingClientRect(),panel.getBoundingClientRect(),bounds);
    panel.classList.toggle('opens-above',placement.upwards);panel.style.maxHeight=`${placement.maxHeight}px`;panel.style.transform=`translateX(${placement.shiftX}px)`;
  }
  function menu(parent,label,alignEnd=false){
    const wrap=document.createElement('span');wrap.className=`explore-menu${alignEnd?' align-end':''}`;parent.append(wrap);
    const panel=document.createElement('div');panel.className='explore-menu-items';panel.hidden=true;
    const trigger=button(wrap,label,()=>{panel.hidden=!panel.hidden;trigger.setAttribute('aria-expanded',String(!panel.hidden));});
    // Toggle without the action button's automatic close.
    trigger.onclick=()=>{if(state.isRendering)return;const open=panel.hidden;closeMenus();panel.hidden=!open;trigger.setAttribute('aria-expanded',String(open));if(open)positionMenu(panel,trigger);};
    trigger.setAttribute('aria-expanded','false');wrap.append(panel);menus.push({panel,trigger});
    wrap.addEventListener('keydown',event=>{
      if(!['ArrowDown','ArrowUp','Home','End'].includes(event.key))return;
      const items=Array.from(panel.querySelectorAll('button')).filter(node=>!node.disabled&&!node.hidden);
      if(!items.length)return;
      if(panel.hidden){closeMenus();panel.hidden=false;trigger.setAttribute('aria-expanded','true');positionMenu(panel,trigger);}
      const index=items.indexOf(document.activeElement);
      const next=event.key==='Home'?0:event.key==='End'?items.length-1:event.key==='ArrowDown'?(index+1)%items.length:(index<0?items.length-1:(index-1+items.length)%items.length);
      items[next].focus();event.preventDefault();
    });
    wrap.addEventListener('focusout',event=>{if(!wrap.contains(event.relatedTarget)){panel.hidden=true;trigger.setAttribute('aria-expanded','false');}});
    return panel;
  }
  function commit(next,undo=true,feedback=''){snapshotFeedback=feedback;commitExploreValues(state,next,{undo});syncControls();onChange();refresh();scheduleRender();}
  function reset({preserveDefaults=false}={}){snapshotFeedback='';const defaults=preserveDefaults?state.explore.defaults:state.controls;state.explore=createExploreSession(defaults);refresh();}
  function manual(){snapshotFeedback='';state.explore.undo=null;refresh();}
  function saveSnapshot(slot){
    if(!Object.hasOwn(slots,slot))return;
    if(state.explore.snapshots[slot]&&!confirmOverwrite(`Replace snapshot ${slot} with the current controls? The saved controls in ${slot} will be lost.`))return;
    saveExploreSnapshot(state,slot);snapshotFeedback=`Snapshot ${slot} saved`;
  }
  function mutate(){
    if(state.isRendering||!state.usedControls.some((used,i)=>used&&!state.explore.locks[i]))return;
    commit(exploreValues(state.controls,state.controlUIs,state.usedControls,state.explore,selectedStrength!=='Random'));
  }
  resetButton.textContent='Reset';resetButton.title='Reset to authored defaults';resetButton.onclick=()=>{if(!state.isRendering)commit(state.explore.defaults);};
  const resetMenu=menu(resetButton.parentElement,'▾',true);resetMenu.previousElementSibling?.setAttribute('aria-label','Reset options');
  button(resetMenu,'Reset to defaults',()=>commit(state.explore.defaults));
  button(resetMenu,'Reset to pass-through',resetPassThrough).title='Load Pass Through; clears this filter’s Explore session';
  const actions=document.createElement('div');actions.className='explore-actions';root.append(actions);
  buttons.mutate=button(actions,'Mutate',mutate);buttons.mutate.className='mutation-action';
  buttons.mutate.title='Apply the selected strength to unlocked controls';
  const strengthLabel=document.createElement('label');strengthLabel.className='mutation-strength';
  const strengthText=document.createElement('span');strengthText.textContent='Strength:';strengthLabel.append(strengthText);
  const strengthSelect=document.createElement('select');strengthSelect.setAttribute('aria-label','Mutation strength');
  strengthSelect.title='Subtle, Medium, and Strong vary current values; Random tries a fresh combination';
  for(const strength of Object.keys(MUTATION_STRENGTHS)){const option=document.createElement('option');option.value=strength;option.textContent=strength;strengthSelect.append(option);}
  strengthSelect.onchange=()=>{
    if(state.isRendering||!Object.hasOwn(MUTATION_STRENGTHS,strengthSelect.value)){strengthSelect.value=selectedStrength;return;}
    selectedStrength=strengthSelect.value;state.explore.strength=MUTATION_STRENGTHS[selectedStrength];
    writePreference(MUTATION_STRENGTH_KEY,selectedStrength);
  };
  strengthLabel.append(strengthSelect);actions.append(strengthLabel);
  const locks=menu(actions,'Locks ▾');
  for(const action of ['Lock all','Unlock all','Invert locks'])button(locks,action,()=>{state.usedControls.forEach((used,i)=>{if(used)state.explore.locks[i]=action==='Lock all'||(action==='Invert locks'&&!state.explore.locks[i]);});syncControls();});
  buttons.undo=button(actions,'Undo',()=>{if(state.explore.undo)commit(state.explore.undo,false);});
  const section=document.createElement('section');section.className='section snapshots-section';root.closest('.adjust-section').after(section);
  const heading=document.createElement('div');heading.className='section-head';const title=document.createElement('strong');title.textContent='Snapshots';heading.append(title);section.append(heading);
  const helpWrap=document.createElement('span');helpWrap.className='snapshot-help';heading.append(helpWrap);
  const help=button(helpWrap,'?',()=>{});help.setAttribute('aria-label','About snapshots');help.setAttribute('aria-describedby','snapshot-help-text');
  const tooltip=document.createElement('span');tooltip.id='snapshot-help-text';tooltip.className='snapshot-tooltip';tooltip.setAttribute('role','tooltip');tooltip.textContent='Save up to four filter configurations and restore them to compare variations.';helpWrap.append(tooltip);
  help.onkeydown=event=>{if(event.key==='Escape'){tooltip.hidden=true;event.preventDefault();}};
  help.onfocus=help.onmouseenter=()=>{tooltip.hidden=false;};
  const body=document.createElement('div');body.className='section-body';section.append(body);
  const helper=document.createElement('p');helper.className='snapshot-helper';helper.textContent='Save and restore filter variations.';body.append(helper);
  const row=document.createElement('div');row.className='snapshot-slots';body.append(row);
  for(const slot of ['A','B','C','D']){
    const node=button(row,'',()=>{const saved=state.explore.snapshots[slot];if(!saved){toast(`Snapshot ${slot} is empty. Use Save current.`);return;}state.explore.active=slot;commit(saved,true,`Snapshot ${slot} restored`);});
    const icon=document.createElement('span');icon.className='snapshot-icon';icon.setAttribute('aria-hidden','true');
    const identifier=document.createElement('strong');identifier.textContent=slot;
    const label=document.createElement('span');label.className='snapshot-label';node.append(icon,identifier,label);slots[slot]=node;
  }
  const status=document.createElement('p');status.className='snapshot-status';status.setAttribute('role','status');body.append(status);
  const toolbar=document.createElement('div');toolbar.className='explore-actions';body.append(toolbar);
  const saves=menu(toolbar,'Save current ▾');
  for(const slot of Object.keys(slots))saveButtons[slot]=button(saves,`Save to ${slot}`,()=>saveSnapshot(slot));
  buttons.update=button(toolbar,'Update',()=>saveSnapshot(state.explore.active));
  const more=menu(toolbar,'•••',true);more.previousElementSibling.setAttribute('aria-label','Snapshot management');
  buttons.clear=button(more,'Clear active snapshot',()=>{state.explore.snapshots[state.explore.active]=null;state.explore.active=null;snapshotFeedback='';});
  buttons.clearAll=button(more,'Clear all snapshots',()=>{for(const slot of Object.keys(slots))state.explore.snapshots[slot]=null;state.explore.active=null;snapshotFeedback='';});
  buttons.clear.className=buttons.clearAll.className='danger';
  function refresh(){
    const session=state.explore;if(!session)return;
    section.hidden=!state.usedControls.some(Boolean);
    if(section.hidden)closeMenus();
    const active=session.active,modified=active&&!controlStatesEqual(state.controls,session.snapshots[active]),busy=state.isRendering;
    session.strength=MUTATION_STRENGTHS[selectedStrength];strengthSelect.value=selectedStrength;
    strengthSelect.disabled=busy;
    buttons.mutate.disabled=busy||!state.usedControls.some((used,i)=>used&&!session.locks[i]);
    buttons.undo.disabled=busy||!session.undo;buttons.clear.disabled=busy||!active;
    buttons.clearAll.disabled=busy||!Object.values(session.snapshots).some(Boolean);
    buttons.clear.title=active?`Delete snapshot ${active}; current controls are kept`:'Select a saved snapshot to clear it';
    buttons.clearAll.title=Object.values(session.snapshots).some(Boolean)?'Delete all saved snapshots; current controls are kept':'No saved snapshots to clear';
    buttons.update.hidden=!modified;buttons.update.textContent=`Update ${active||''}`;
    const message=active?`${snapshotFeedback||`Snapshot ${active} selected`}${modified?' · modified':''}`:Object.values(session.snapshots).some(Boolean)?'No snapshot selected':'No snapshots saved';
    if(status.textContent!==message)status.textContent=message;
    for(const [slot,node] of Object.entries(slots)){
      const saved=session.snapshots[slot],selected=active===slot;
      node.querySelector('.snapshot-icon').textContent=selected?'✓':saved?'●':'○';
      node.querySelector('.snapshot-label').textContent=selected?'Active':saved?'Saved':'Empty';
      node.classList.toggle('empty',!saved);node.classList.toggle('modified',Boolean(selected&&modified));
      node.classList.toggle('active',selected);node.setAttribute('aria-pressed',String(selected));
      node.setAttribute('aria-label',`Snapshot ${slot}, ${selected?`selected${modified?', modified':''}`:saved?'saved':'empty'}`);
      node.setAttribute('aria-disabled',String(!saved||busy));node.disabled=busy;
      node.title=saved?`Restore snapshot ${slot}${selected&&modified?' (working controls modified)':''}`:`Snapshot ${slot} is empty. Use Save current.`;
      saveButtons[slot].textContent=`${saved?'Replace':'Save to'} ${slot} · ${saved?'Saved':'Empty'}`;
    }
    if(busy)closeMenus();
  }
  document.addEventListener('click',event=>{if(!event.target.closest('.explore-menu'))closeMenus();});
  const reposition=event=>menus.forEach(({panel,trigger})=>{if(!panel.hidden&&event.target!==panel)positionMenu(panel,trigger);});
  document.addEventListener('scroll',reposition,true);document.defaultView.addEventListener('resize',reposition);
  document.addEventListener('keydown',event=>{if(event.key==='Escape'){const open=menus.find(item=>!item.panel.hidden);if(open){closeMenus();open.trigger.focus();event.preventDefault();}}});
  refresh();return {refresh,reset,manual};
}
