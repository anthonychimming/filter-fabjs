import { MUTATION_FACTORS, controlStatesEqual, createExploreSession, exploreValues, commitExploreValues, saveExploreSnapshot } from '../app/explore-state.js';

export function exploreMenuPlacement(anchor,menu,bounds){
  const below=Math.max(0,bounds.bottom-anchor.bottom),above=Math.max(0,anchor.top-bounds.top);
  const upwards=menu.height>below&&above>below;
  return {upwards,maxHeight:upwards?above:below,shiftX:Math.min(0,bounds.right-menu.right)+Math.max(0,bounds.left-menu.left)};
}

// Session state belongs to the app; this view never writes the filter document.
export function createExploreController({state,root,resetButton,syncControls,scheduleRender,onChange,resetPassThrough,toast}){
  const buttons={},slots={},saveButtons={},menus=[];
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
    trigger.setAttribute('aria-expanded','false');wrap.append(panel);menus.push({panel,trigger});return panel;
  }
  function commit(next,undo=true){commitExploreValues(state,next,{undo});syncControls();onChange();refresh();scheduleRender();}
  function reset({preserveDefaults=false}={}){const defaults=preserveDefaults?state.explore.defaults:state.controls;state.explore=createExploreSession(defaults);refresh();}
  function manual(){state.explore.undo=null;refresh();}
  function mutate(){commit(exploreValues(state.controls,state.controlUIs,state.usedControls,state.explore,true));}
  resetButton.textContent='Reset';resetButton.title='Reset to authored defaults';resetButton.onclick=()=>{if(!state.isRendering)commit(state.explore.defaults);};
  const resetMenu=menu(resetButton.parentElement,'▾',true);resetMenu.previousElementSibling?.setAttribute('aria-label','Reset options');
  button(resetMenu,'Reset to defaults',()=>commit(state.explore.defaults));
  button(resetMenu,'Reset to pass-through',resetPassThrough).title='Load Pass Through; clears this filter’s Explore session';
  const actions=document.createElement('div');actions.className='explore-actions';root.append(actions);
  buttons.random=button(actions,'Randomize',()=>commit(exploreValues(state.controls,state.controlUIs,state.usedControls,state.explore)));
  const strengths=menu(actions,'Mutate · Medium ▾',true);buttons.mutate=strengths.previousElementSibling;
  for(const strength of Object.keys(MUTATION_FACTORS))button(strengths,strength,()=>{state.explore.strength=strength;mutate();});
  const locks=menu(actions,'Locks ▾');
  for(const action of ['Lock all','Unlock all','Invert locks'])button(locks,action,()=>{state.usedControls.forEach((used,i)=>{if(used)state.explore.locks[i]=action==='Lock all'||(action==='Invert locks'&&!state.explore.locks[i]);});syncControls();});
  buttons.undo=button(actions,'Undo',()=>{if(state.explore.undo)commit(state.explore.undo,false);});
  const section=document.createElement('section');section.className='section snapshots-section';root.closest('.adjust-section').after(section);
  const heading=document.createElement('div');heading.className='section-head';const title=document.createElement('strong');title.textContent='Snapshots';heading.append(title);section.append(heading);
  const body=document.createElement('div');body.className='section-body';section.append(body);
  const row=document.createElement('div');row.className='snapshot-slots';body.append(row);
  for(const slot of ['A','B','C','D'])slots[slot]=button(row,slot,()=>{const saved=state.explore.snapshots[slot];if(!saved){toast(`Snapshot ${slot} is empty. Use Save current.`);return;}state.explore.active=slot;commit(saved);});
  const status=document.createElement('p');status.className='snapshot-status';status.setAttribute('role','status');body.append(status);
  const toolbar=document.createElement('div');toolbar.className='explore-actions';body.append(toolbar);
  const saves=menu(toolbar,'Save current ▾');
  for(const slot of Object.keys(slots))saveButtons[slot]=button(saves,`Save to ${slot}`,()=>saveExploreSnapshot(state,slot));
  buttons.update=button(toolbar,'Update',()=>saveExploreSnapshot(state,state.explore.active));
  const more=menu(toolbar,'•••',true);more.previousElementSibling.setAttribute('aria-label','Snapshot management');
  buttons.clear=button(more,'Clear active snapshot',()=>{state.explore.snapshots[state.explore.active]=null;state.explore.active=null;});
  buttons.clearAll=button(more,'Clear all snapshots',()=>{for(const slot of Object.keys(slots))state.explore.snapshots[slot]=null;state.explore.active=null;});
  function refresh(){
    const session=state.explore;if(!session)return;
    section.hidden=!state.usedControls.some(Boolean);
    if(section.hidden)closeMenus();
    const active=session.active,modified=active&&!controlStatesEqual(state.controls,session.snapshots[active]),busy=state.isRendering;
    buttons.mutate.textContent=`Mutate · ${session.strength} ▾`;
    buttons.random.disabled=buttons.mutate.disabled=busy||!state.usedControls.some((used,i)=>used&&!session.locks[i]);
    buttons.undo.disabled=busy||!session.undo;buttons.clear.disabled=busy||!active;
    buttons.clearAll.disabled=busy||!Object.values(session.snapshots).some(Boolean);
    buttons.update.hidden=!modified;buttons.update.textContent=`Update ${active||''}`;
    status.textContent=active?`${active}${modified?' · modified':' · active'}`:'No active snapshot';
    for(const [slot,node] of Object.entries(slots)){
      const saved=session.snapshots[slot],selected=active===slot;
      node.textContent=`${slot} ${saved?'●':'○'}${selected&&modified?' *':''}`;
      node.classList.toggle('active',selected);node.setAttribute('aria-pressed',String(selected));
      node.setAttribute('aria-label',`Snapshot ${slot}, ${selected?`active${modified?', modified':''}`:saved?'saved':'empty'}`);
      saveButtons[slot].textContent=`${saved?'Replace':'Save to'} ${slot}`;
    }
    if(busy)closeMenus();
  }
  document.addEventListener('click',event=>{if(!event.target.closest('.explore-menu'))closeMenus();});
  const reposition=event=>menus.forEach(({panel,trigger})=>{if(!panel.hidden&&event.target!==panel)positionMenu(panel,trigger);});
  document.addEventListener('scroll',reposition,true);document.defaultView.addEventListener('resize',reposition);
  document.addEventListener('keydown',event=>{if(event.key==='Escape'){const open=menus.find(item=>!item.panel.hidden);if(open){closeMenus();open.trigger.focus();event.preventDefault();}}});
  refresh();return {refresh,reset,manual};
}
