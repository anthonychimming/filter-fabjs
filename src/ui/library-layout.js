/** Temporary Library geometry; candidate/document state remains in the app. */
export function libraryPresentation(width,height){
  const drawer=Math.min(378,Math.max(344,Math.round(width*.32)));
  return {mode:width>=740&&height>=460&&width-drawer-12>=360?'side':'sheet',drawer};
}

export function createLibraryLayout({dialog,inspectorLayout,canvasView,document:doc=globalThis.document,window:win=globalThis.window}){
  const app=doc.querySelector('.app'),workspace=doc.querySelector('.workspace'),stage=doc.getElementById('canvasStage'),head=workspace.querySelector('.topbar'),status=workspace.querySelector('.statusbar');
  const imageToggle=dialog.querySelector('[data-image-view-toggle]'),libraryHead=dialog.querySelector('.library-head'),actions=dialog.querySelector('.library-actions'),results=dialog.querySelector('.filter-results'),tools=dialog.querySelector('.browser-tools');
  let saved=null,resume=null,observer=null,frame=null,imageRequested=false,browsingScroll=null;
  function sync(){
    if(!saved)return;
    // Measure the normal chrome even while it is hidden for image viewing, so
    // hiding it cannot turn a sheet into a drawer and cause breakpoint feedback.
    delete app.dataset.libraryImageView;
    const rect=workspace.getBoundingClientRect(),viewport=win.visualViewport,height=viewport?.height||win.innerHeight,top=viewport?.offsetTop||0;
    // Workspace bounds remain unsplit: reserving only the preview pane prevents
    // header wrapping from feeding back into the breakpoint calculation.
    const usable=Math.min(rect.height,height)-(head?.getBoundingClientRect().height||0)-(status?.getBoundingClientRect().height||0);
    const {mode,drawer}=libraryPresentation(rect.width,usable);
    app.dataset.libraryLayout=mode;dialog.dataset.layout=mode;app.style.setProperty('--library-width',`${drawer}px`);
    const imageView=imageRequested&&mode==='sheet',wasImageView=dialog.dataset.imageView==='true',focusedToggle=doc.activeElement===imageToggle;
    if(imageView&&!wasImageView)browsingScroll={results:results.scrollTop,tools:tools.scrollTop};
    app.dataset.libraryImageView=String(imageView);dialog.dataset.imageView=String(imageView);imageToggle.hidden=mode!=='sheet';
    imageToggle.textContent=imageView?'Back to Filters':'View Image';imageToggle.setAttribute('aria-expanded',String(!imageView));
    const dialogHeight=imageView?Math.min(height,Math.ceil(libraryHead.getBoundingClientRect().height+actions.getBoundingClientRect().height+2)):mode==='side'?height:rect.width<=560||height<=500?height:Math.min(height*.76,760);
    app.style.setProperty('--library-image-inset',`${dialogHeight+8+Math.max(0,rect.bottom-top-height)}px`);
    dialog.style.setProperty('--library-top',`${top+height-dialogHeight}px`);dialog.style.setProperty('--library-height',`${dialogHeight}px`);dialog.style.setProperty('--library-width',`${drawer}px`);
    stage.getBoundingClientRect();canvasView.restoreViewport(saved);
    if(!imageView&&wasImageView&&browsingScroll){results.scrollTop=browsingScroll.results;tools.scrollTop=browsingScroll.tools;}
    if(focusedToggle&&imageToggle.hidden)dialog.querySelector('[data-close]').focus({preventScroll:true});
  }
  imageToggle.addEventListener('click',()=>{if(!saved||imageToggle.disabled||imageToggle.hidden)return;imageRequested=!imageRequested;sync();imageToggle.focus({preventScroll:true});});
  function schedule(){if(frame!==null||!saved)return;frame=win.requestAnimationFrame(()=>{frame=null;sync();});}
  function open(){
    if(saved)return;
    imageRequested=false;saved=canvasView.captureViewport();resume=inspectorLayout.suspend();sync();
    observer=win.ResizeObserver?new win.ResizeObserver(schedule):null;
    for(const node of [workspace,head,status,libraryHead,actions])if(node)observer?.observe(node);
    win.addEventListener('resize',schedule);win.visualViewport?.addEventListener('resize',schedule);win.visualViewport?.addEventListener('scroll',schedule);
  }
  function close({restoreViewport=true}={}){
    if(!saved)return;
    observer?.disconnect();observer=null;if(frame!==null)win.cancelAnimationFrame(frame);frame=null;
    win.removeEventListener('resize',schedule);win.visualViewport?.removeEventListener('resize',schedule);win.visualViewport?.removeEventListener('scroll',schedule);
    const snapshot=restoreViewport?saved:canvasView.captureViewport();saved=null;delete app.dataset.libraryLayout;delete dialog.dataset.layout;app.style.removeProperty('--library-width');
    imageRequested=false;browsingScroll=null;delete app.dataset.libraryImageView;delete dialog.dataset.imageView;app.style.removeProperty('--library-image-inset');imageToggle.hidden=true;imageToggle.textContent='View Image';imageToggle.setAttribute('aria-expanded','true');
    for(const name of ['--library-top','--library-height','--library-width'])dialog.style.removeProperty(name);
    resume?.();resume=null;stage.getBoundingClientRect();canvasView.restoreViewport(snapshot);
  }
  return {open,close,destroy:close};
}
