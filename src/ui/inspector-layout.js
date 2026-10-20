/** UI-only shell state. Never owns filter data or schedules rendering. */
export const INSPECTOR_WIDTH_DEFAULT=384;
export function inspectorWidthBounds(appWidth){return {min:320,max:Math.max(320,Math.min(520,Math.floor(appWidth*.44),appWidth-640))};}
export function readInspectorWidth(storage){
  try{const value=JSON.parse(storage.getItem('ffw-workspace-layout'));return value?.version===1&&typeof value.inspectorWidth==='number'&&Number.isFinite(value.inspectorWidth)?Math.min(520,Math.max(320,value.inspectorWidth)):INSPECTOR_WIDTH_DEFAULT;}catch{return INSPECTOR_WIDTH_DEFAULT;}
}
export function createInspectorLayout({document:doc=globalThis.document,window:win=globalThis.window,storage=()=>win.localStorage}={}){
  const app=doc.querySelector('.app'),workspace=doc.querySelector('.workspace'),panel=doc.getElementById('inspector'),toggle=doc.getElementById('inspectorToggle'),separator=doc.getElementById('inspectorResize'),close=doc.getElementById('inspectorClose'),expand=doc.getElementById('inspectorExpand'),backdrop=doc.getElementById('inspectorBackdrop');
  const edge=doc.getElementById('inspectorEdge'),stage=doc.getElementById('canvasStage'),hint=doc.getElementById('inspectorHint'),hintDismiss=doc.getElementById('inspectorHintDismiss');
  const desktop=win.matchMedia('(min-width:1024px)'),mobile=win.matchMedia('(max-width:767px)');
  const removals=[];
  function listen(target,type,handler,options){target.addEventListener(type,handler,options);removals.push(()=>target.removeEventListener?.(type,handler,options));}
  let width;try{width=readInspectorWidth(storage());}catch{width=INSPECTOR_WIDTH_DEFAULT;}
  let discovered=false;
  try{discovered=storage().getItem('ffw-inspector-discovered')==='true';}catch{/* Preferences are optional. */}
  // Only an initially compact session is eligible; resizing desktop must not introduce a hint.
  const hintEligible=!desktop.matches;
  function completeDiscovery(){discovered=true;try{storage().setItem('ffw-inspector-discovered','true');}catch{/* Keep completion for this session. */}}
  let focused=false,opened=false,expanded=false,pointer=null,bounds,suspended=false;
  function persist(){try{storage().setItem('ffw-workspace-layout',JSON.stringify({version:1,inspectorWidth:width}));}catch{/* Preferences are optional. */}}
  function size(value){bounds=inspectorWidthBounds(app.getBoundingClientRect().width);const current=Math.min(bounds.max,Math.max(bounds.min,value));app.style.setProperty('--inspector-width',`${current}px`);separator.setAttribute('aria-valuemin',String(bounds.min));separator.setAttribute('aria-valuemax',String(bounds.max));separator.setAttribute('aria-valuenow',String(current));separator.setAttribute('aria-valuetext',`${current} pixels`);return current;}
  function positionEdge(){
    const rect=stage.getBoundingClientRect(),panelRect=panel.getBoundingClientRect();
    const visible=desktop.matches?!focused:opened;
    const viewportWidth=doc.documentElement.clientWidth;
    // A full-width mobile sheet keeps the tab inside its left edge.
    const x=visible?Math.max(0,panelRect.left-44):viewportWidth-44;
    const center=rect.top+rect.height/2;
    const y=visible&&!desktop.matches?Math.min(panelRect.bottom-32,Math.max(panelRect.top+32,center)):center;
    edge.style.setProperty('--inspector-toggle-x',`${Math.max(0,x)}px`);
    edge.style.setProperty('--inspector-toggle-y',`${y}px`);
  }
  function sync(){
    const modal=!suspended&&!desktop.matches&&opened,visible=!suspended&&(desktop.matches?!focused:opened);
    app.dataset.inspectorSuspended=String(suspended);
    app.dataset.inspectorLayout=desktop.matches?'desktop':mobile.matches?'mobile':'tablet';
    app.dataset.inspectorHidden=String(!visible);app.dataset.inspectorOpen=String(modal);app.dataset.inspectorExpanded=String(expanded);
    panel.inert=!visible;workspace.inert=modal;backdrop.hidden=!modal;
    toggle.setAttribute('aria-label',visible?'Hide inspector':'Show inspector');toggle.setAttribute('aria-expanded',String(visible));
    if(visible&&!discovered)completeDiscovery();
    hint.hidden=!hintEligible||discovered||visible;
    if(hint.hidden)toggle.removeAttribute('aria-describedby');else toggle.setAttribute('aria-describedby','inspectorHintText');
    // Keep the control within the compact dialog's accessible and keyboard scope.
    const host=modal?panel:app;if(edge.parentElement!==host)host.append(edge);
    if(modal){panel.setAttribute('role','dialog');panel.setAttribute('aria-modal','true');}else{panel.removeAttribute('role');panel.removeAttribute('aria-modal');}
    expand.textContent=expanded?'Reduce sheet':'Expand sheet';expand.setAttribute('aria-pressed',String(expanded));size(width);positionEdge();
  }
  function dismiss(){opened=false;expanded=false;sync();toggle.focus({preventScroll:true});}
  listen(toggle,'click',()=>{if(desktop.matches){focused=!focused;sync();}else{if(opened){dismiss();return;}opened=true;sync();const selected=panel.querySelector('[role=tab][aria-selected=true]');(selected.disabled?close:selected).focus({preventScroll:true});}});
  listen(hintDismiss,'click',()=>{completeDiscovery();sync();toggle.focus({preventScroll:true});});
  listen(close,'click',dismiss);listen(backdrop,'click',dismiss);
  listen(expand,'click',()=>{expanded=!expanded;sync();});
  function endDrag(){if(pointer===null)return;const id=pointer;pointer=null;app.removeAttribute('data-inspector-dragging');if(separator.hasPointerCapture(id))separator.releasePointerCapture(id);persist();}
  listen(separator,'pointerdown',event=>{if(!desktop.matches||focused||pointer!==null||event.button!==0||event.isPrimary===false)return;event.preventDefault();separator.focus({preventScroll:true});pointer=event.pointerId;separator.setPointerCapture(pointer);app.setAttribute('data-inspector-dragging','');});
  listen(separator,'pointermove',event=>{if(event.pointerId===pointer){const rect=app.getBoundingClientRect();width=size(rect.right-event.clientX);}});
  for(const type of ['pointerup','pointercancel','lostpointercapture'])listen(separator,type,event=>{if(event.pointerId===pointer)endDrag();});
  listen(separator,'keydown',event=>{const current=Number(separator.getAttribute('aria-valuenow')),step=event.shiftKey?32:16;const next=event.key==='ArrowLeft'?current+step:event.key==='ArrowRight'?current-step:event.key==='Home'?bounds.min:event.key==='End'?bounds.max:null;if(next!==null){event.preventDefault();width=size(next);persist();}});
  listen(separator,'dblclick',()=>{width=size(INSPECTOR_WIDTH_DEFAULT);persist();});
  function breakpoint(){if(suspended){sync();return;}endDrag();const hadFocus=panel.contains(doc.activeElement)||doc.activeElement===separator;opened=false;expanded=false;sync();if(hadFocus&&(!desktop.matches||focused))toggle.focus({preventScroll:true});}
  listen(desktop,'change',breakpoint);listen(mobile,'change',breakpoint);
  listen(win,'resize',()=>{size(width);positionEdge();});
  const observer=win.ResizeObserver?new win.ResizeObserver(positionEdge):null;
  for(const element of [stage,panel])observer?.observe(element);
  listen(doc,'keydown',event=>{
    if(suspended||!opened||desktop.matches||doc.querySelector('dialog[open]'))return;
    if(event.key==='Escape'){event.preventDefault();event.stopImmediatePropagation();dismiss();}
    if(event.key==='Tab'){
      const items=[...panel.querySelectorAll('button,input,select,textarea,summary,a[href],[tabindex="0"]')].filter(item=>!item.disabled&&!item.closest('[inert]')&&item.tabIndex>=0&&item.getClientRects().length);
      const first=items[0],last=items.at(-1);if(event.shiftKey&&doc.activeElement===first){event.preventDefault();last?.focus();}else if(!event.shiftKey&&doc.activeElement===last){event.preventDefault();first?.focus();}
    }
  },true);
  sync();
  function suspend(){
    if(suspended)return ()=>{};
    endDrag();
    const wasDesktop=desktop.matches,wasVisible=wasDesktop?!focused:opened;
    const scroll=[panel,...panel.querySelectorAll('.sidebar-scroll,input,textarea')].map(node=>({node,top:node.scrollTop,left:node.scrollLeft,selection:typeof node.selectionStart==='number'?[node.selectionStart,node.selectionEnd,node.selectionDirection]:null}));
    suspended=true;sync();
    let released=false;
    return ()=>{if(released)return;released=true;if(desktop.matches!==wasDesktop){if(desktop.matches)focused=!wasVisible;else opened=wasVisible;}suspended=false;sync();panel.getBoundingClientRect();for(const item of scroll){item.node.scrollTop=item.top;item.node.scrollLeft=item.left;if(item.selection)item.node.setSelectionRange(...item.selection);}};
  }
  return {suspend,destroy(){observer?.disconnect();endDrag();removals.splice(0).forEach(remove=>remove());workspace.inert=false;},hide(){if(desktop.matches){focused=true;const hadFocus=panel.contains(doc.activeElement);sync();if(hadFocus)toggle.focus({preventScroll:true});}else dismiss();}};
}
