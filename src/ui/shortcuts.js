// Zoom intentionally supports key repeat; all other actions are one-shot.
export function dispatchShortcut(event,context){
  if(event.defaultPrevented||event.isComposing||event.keyCode===229||event.altKey||context.blocked||context.editable)return false;
  const key=event.key.toLowerCase(),mod=event.ctrlKey||event.metaKey;
  if(event.ctrlKey&&event.metaKey)return false;
  if(!mod&&!event.shiftKey&&!event.repeat&&['1','2','3','4'].includes(key)){
    if(context.restoreSnapshot?.(key)){event.preventDefault();return true;}
    return false;
  }
  let button,needsImage=false,zoom=false;
  if(mod){
    if(key==='o'&&!event.shiftKey)button=context.button('openImageBtn');
    else if(key==='e'&&event.shiftKey){button=context.button('exportImageBtn');needsImage=true;}
    else if(key==='c'&&!event.shiftKey&&!context.selectedText()){button=context.button('copyImageBtn');needsImage=true;}
  }else if(!event.shiftKey&&(key==='o'||key==='c')){button=context.viewButton(key==='o'?'original':'split');needsImage=true;}
  else if(!event.shiftKey&&key==='f')button=context.button('fullscreenBtn');
  else if(!event.shiftKey&&key==='0'){button=context.button('zoomFit');needsImage=true;}
  else if(!event.shiftKey&&key==='-'){button=context.button('zoomOut');needsImage=true;zoom=true;}
  else if((key==='+'||key==='=')&&(!event.shiftKey||key==='+')){button=context.button('zoomIn');needsImage=true;zoom=true;}
  if(!button||button.disabled||button.hidden||button.closest?.('[hidden], [inert]')||(needsImage&&!context.hasImage)||(event.repeat&&!zoom))return false;
  event.preventDefault();button.click();return true;
}
