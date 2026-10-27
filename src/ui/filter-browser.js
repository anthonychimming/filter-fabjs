import { installLibraryBackupUI } from './library-backup.js';
import { searchCatalog } from '../app/filter-catalog.js';
import { searchText, tagKey } from '../core/filter-metadata.js';

const PAGE_SIZE=50;
const THUMBNAIL_ROOT_MARGIN='180px 0px';
const THUMBNAIL_FALLBACK_COUNT=8;

function browserNode(tag,text,className){const node=document.createElement(tag);if(text)node.textContent=text;if(className)node.className=className;return node;}
function browserButton(text,action){const button=browserNode('button',text);button.type='button';button.onclick=action;return button;}

// Native modal dialogs provide focus containment and Escape handling.
export function chooseFilterAction(title,choices,{name,detail=''}={}){
  return new Promise(resolve=>{
    const previous=document.activeElement,dialog=browserNode('dialog',null,'filter-choice'),heading=browserNode('h2',title),body=browserNode('div',null,'modal-body');
    heading.id='filterChoiceTitle';dialog.setAttribute('aria-labelledby',heading.id);body.append(heading,browserNode('p',detail));
    let input;if(name!==undefined){const label=browserNode('label','Filter name');input=browserNode('input');input.type='text';input.maxLength=120;input.value=name;label.append(input);body.append(label);}
    const actions=browserNode('div',null,'filter-actions');
    let promoted=false;
    for(const [value,label] of choices){
      const choiceButton=browserButton(label,()=>{if(input&&!input.value.trim()){input.focus();return;}dialog.close(value);});
      if(value==='delete'||value==='keep')choiceButton.classList.add('danger');
      else if(value!=='cancel'&&!promoted){choiceButton.classList.add('primary');promoted=true;}
      actions.append(choiceButton);
    }
    body.append(actions);dialog.append(body);document.body.append(dialog);
    dialog.addEventListener('close',()=>{const result={action:dialog.returnValue||'cancel',name:input?.value.trim()};dialog.remove();if(previous?.isConnected&&!previous.disabled)previous.focus();resolve(result);},{once:true});dialog.showModal();
  });
}

export function createFilterBrowser({launcher,getEntries,begin,preview,previewOnline=null,downloadOnline=null,apply,cancel,toggleFavorite,deleteCustom=null,requestThumbnail=null,clearThumbnailRequests=()=>{},getOnlineState=()=>({status:'idle'}),loadOnline=()=>{},resolveOnlinePreviewUrl,onOpen=()=>{},onClose=()=>{},onExportBackup=null,onImportBackup=null,onError}){
  const dialog=browserNode('dialog',null,'filter-browser');dialog.id='filterLibraryDialog';dialog.setAttribute('aria-labelledby','filterBrowserTitle');dialog.setAttribute('aria-describedby','filterBrowserDescription');
  dialog.innerHTML='<div class="modal-head library-head"><div><strong id="filterBrowserTitle">Filter Library</strong><small id="filterBrowserDescription" class="visually-hidden">Preview filters on your image. Apply to keep one; Cancel to restore your work.</small></div><button type="button" data-image-view-toggle hidden disabled aria-expanded="true" aria-controls="filterBrowserResults" aria-describedby="filterImageViewHelp">View Image</button><span id="filterImageViewHelp" class="visually-hidden">View your preview without applying it. Image controls remain unavailable until the Library closes.</span><button type="button" data-close aria-label="Cancel and close Filter Library">×</button></div><div class="browser-tools"><label class="library-search"><span>Search</span><input type="search" placeholder="Name, description, author or tag" data-search></label><button data-clear hidden>Clear search</button><div class="filter-actions library-discovery"><label>Source<select data-source><option value="all" selected>All</option><option value="local">All local</option><option value="builtin">Built-in</option><option value="custom">My Filters</option><option value="online">Online</option></select></label><label><input type="checkbox" data-favorites> ★ Favorites</label></div><details class="library-filters" data-filters><summary>Filters <span data-restrictions hidden></span></summary><div class="library-filter-fields"><label>Sort<select data-sort><option value="az">A–Z</option><option value="relevance">Relevance</option></select></label><label>Find tags<input type="search" data-tag-search></label><div data-choices class="tag-choices"></div><small>Match all selected tags. Up to 50 suggestions; type to narrow.</small><div data-selected class="chips"></div></div></details><button data-reset hidden>Reset view</button><div data-online-notice hidden><span data-online-message role="status" aria-live="polite"></span><button type="button" data-online-retry>Retry</button></div><p data-error role="alert"></p></div><div class="browser-results-head"><span data-count role="status" aria-live="polite"></span><nav class="browser-pages" data-pages aria-label="Filter result pages"><button type="button" data-prev aria-label="Previous page" title="Previous page"><svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="m15 18-6-6 6-6"/></svg></button><span data-page></span><button type="button" data-next aria-label="Next page" title="Next page"><svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="m9 18 6-6-6-6"/></svg></button></nav></div><ul id="filterBrowserResults" class="filter-results" aria-label="Filter results"></ul><div class="library-actions"><span data-preview-status role="status" aria-live="polite">Choose a filter to preview it on the canvas.</span><div><button type="button" data-cancel>Cancel</button><button type="button" class="primary" data-apply disabled>Apply Filter</button></div></div>';
  if(onExportBackup&&onImportBackup)installLibraryBackupUI({dialog,onExportBackup,onImportBackup});
  document.body.append(dialog);launcher.setAttribute('aria-controls',dialog.id);
  const find=selector=>dialog.querySelector(selector),query=find('[data-search]'),source=find('[data-source]'),favorites=find('[data-favorites]'),sort=find('[data-sort]'),selected=new Set();
  let page=0,composing=false,countTimer,selectedKey=null,previewing=false,sessionOpen=false,actionId=0,thumbnailObserver=null,thumbnailGeneration=0,thumbnailId=0,pendingKey=null,pendingPhase=null,previewErrorKey=null,sessionEpoch=0,sessionEnding=false;
  source.value='all';
  const includesOnline=()=>source.value==='all'||source.value==='online';
  const downloads=new Set();

  function disconnectThumbnailWork(){thumbnailGeneration++;thumbnailObserver?.disconnect();thumbnailObserver=null;clearThumbnailRequests();}
  function updateThumbnail(row,entry,result,generation){
    if(generation!==thumbnailGeneration||!dialog.open||!row.isConnected)return;
    const thumbnail=row.querySelector('.filter-thumbnail'),canvas=row.querySelector('.filter-thumbnail-image'),label=row.querySelector('.filter-thumbnail-state'),description=row.querySelector('.thumbnail-accessibility'),button=row.querySelector('[data-entry-action="preview"]'),state=result?.state||'failed';thumbnail.dataset.thumbnailState=state;
    if(state==='ready'){
      try{canvas.width=result.width;canvas.height=result.height;const context=canvas.getContext('2d',{alpha:true});if(!context)throw new Error('Canvas thumbnail display is unavailable');context.putImageData(new ImageData(result.pixels,result.width,result.height),0,0);label.textContent='';description.textContent='';button.removeAttribute('aria-describedby');row.dataset.thumbnailReady='true';}
      catch(error){updateThumbnail(row,entry,{state:'failed',error},generation);}
      return;
    }
    row.dataset.thumbnailReady='false';label.textContent=state==='failed'?'Preview unavailable':state==='idle'?'Preview':'Previewing…';
    if(state==='failed'){description.textContent=`Preview unavailable for ${entry.name}. The filter can still be selected.`;button.setAttribute('aria-describedby',description.id);}else{description.textContent='';button.removeAttribute('aria-describedby');}
  }
  function enqueueSample(row){
    if(row.dataset.sampleRequested)return;row.dataset.sampleRequested='true';
    const generation=thumbnailGeneration,thumb=row.querySelector('.filter-thumbnail'),image=row.querySelector('img'),label=row.querySelector('.filter-thumbnail-state'),description=row.querySelector('.thumbnail-accessibility');
    const complete=state=>{if(generation!==thumbnailGeneration||!dialog.open||!row.isConnected)return;thumb.dataset.thumbnailState=state;label.textContent=state==='ready'?'':'Sample unavailable';description.textContent=state==='ready'?'Standardized Online sample; the canvas preview uses your current image.':'Sample unavailable; you can still preview this filter on the canvas.';};
    image.onload=()=>complete('ready');image.onerror=()=>complete('failed');thumb.dataset.thumbnailState='loading';label.textContent='Loading sample…';
    try{image.src=resolveOnlinePreviewUrl(row.thumbnailEntry);}catch{complete('failed');}
  }
  function enqueueThumbnail(row,priority=0){
    if(!row?.isConnected||!dialog.open)return;
    if(row.thumbnailEntry.source==='online'){enqueueSample(row);return;}
    if(!requestThumbnail)return;const requested=Number(row.dataset.thumbnailPriority??-1);if(requested>=priority)return;row.dataset.thumbnailPriority=String(priority);const entry=row.thumbnailEntry,generation=thumbnailGeneration,callback=result=>updateThumbnail(row,entry,result,generation);
    try{requestThumbnail(entry,callback,priority);}catch(error){updateThumbnail(row,entry,{state:'failed',error},generation);}
  }
  function observeThumbnails(list){
    disconnectThumbnailWork();const rows=[...list.querySelectorAll('.filter-card')];if(!rows.length)return;
    if(typeof IntersectionObserver==='function'){
      const generation=thumbnailGeneration;
      thumbnailObserver=new IntersectionObserver(entries=>{if(generation!==thumbnailGeneration||!dialog.open)return;for(const observation of entries)if(observation.isIntersecting){thumbnailObserver?.unobserve(observation.target);enqueueThumbnail(observation.target,20);}}, {root:list,rootMargin:THUMBNAIL_ROOT_MARGIN,threshold:0.01});rows.forEach(row=>thumbnailObserver.observe(row));
    }else rows.slice(0,THUMBNAIL_FALLBACK_COUNT).forEach(row=>enqueueThumbnail(row,10));
  }

  function syncActions(){find('[data-image-view-toggle]').disabled=previewing||!selectedKey;find('[data-apply]').disabled=previewing||!selectedKey;find('[data-preview-status]').dataset.state=previewing?'busy':selectedKey?'ready':'idle';}
  async function cancelAndClose(){
    if(sessionEnding)return;sessionEnding=true;
    const id=++actionId;sessionEpoch++;downloads.clear();previewing=true;syncActions();find('[data-error]').textContent='';
    try{await cancel();if(id!==actionId)return;sessionOpen=false;dialog.close('cancel');}
    catch(error){sessionEnding=false;previewing=false;syncActions();find('[data-error]').textContent=`Could not restore the working filter: ${error.message}`;find('[data-preview-status]').textContent=find('[data-error]').textContent;onError(error);}
  }
  async function applyAndClose(){
    if(previewing||!selectedKey||sessionEnding)return;sessionEnding=true;
    const id=++actionId;sessionEpoch++;downloads.clear();previewing=true;syncActions();find('[data-error]').textContent='';find('[data-preview-status]').textContent='Applying selected filter…';
    try{if(!await apply()||id!==actionId){sessionEnding=false;previewing=false;syncActions();return;}sessionOpen=false;dialog.close('apply');}
    catch(error){sessionEnding=false;previewing=false;syncActions();find('[data-error]').textContent=`Could not apply filter: ${error.message}`;find('[data-preview-status]').textContent=find('[data-error]').textContent;onError(error);}
  }
  find('[data-close]').onclick=cancelAndClose;find('[data-cancel]').onclick=cancelAndClose;find('[data-apply]').onclick=applyAndClose;
  dialog.addEventListener('cancel',event=>{event.preventDefault();cancelAndClose();});
  // Search inputs can consume Escape to clear their value before native dialog
  // cancellation. Keep one Escape sufficient to restore the Library transaction.
  dialog.addEventListener('keydown',event=>{
    if(event.key==='Escape'&&!event.isComposing){event.preventDefault();event.stopPropagation();cancelAndClose();}
    if(event.key==='Tab'){
      const items=[...dialog.querySelectorAll('button,input,select,textarea,summary,a[href],[tabindex]')].filter(node=>!node.disabled&&node.tabIndex>=0&&node.getClientRects().length&&!node.closest('[inert]'));
      const first=items[0],last=items.at(-1);
      if(event.shiftKey&&document.activeElement===first){event.preventDefault();last?.focus();}else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first?.focus();}
    }
  });
  dialog.addEventListener('close',()=>{actionId++;sessionEpoch++;downloads.clear();disconnectThumbnailWork();if(sessionOpen){Promise.resolve(cancel()).catch(onError);sessionOpen=false;}onClose(dialog.returnValue);if(!launcher.disabled)launcher.focus({preventScroll:true});});

  function reset(){query.value='';source.value='local';favorites.checked=false;sort.value='az';selected.clear();find('[data-tag-search]').value='';page=0;refresh();}
  function createResult(entry){
    const online=entry.source==='online';
    const row=browserNode('li',null,'filter-card');row.dataset.entryKey=entry.key;row.dataset.selected=String(entry.key===selectedKey);
    const cardTop=browserNode('div',null,'filter-card-main');
    const previewButton=online&&!previewOnline?browserNode('div'):browserButton('',async()=>{
      if(sessionEnding)return;
      const id=++actionId;pendingKey=entry.key;pendingPhase=online?'loading':'rendering';previewErrorKey=null;previewing=true;find('[data-error]').textContent='';find('[data-preview-status]').textContent=`Previewing ${entry.name}…`;refresh();syncActions();
      enqueueThumbnail(dialog.querySelector(`[data-entry-key="${CSS.escape(entry.key)}"]`),100);
      try{
        const accepted=await (online?previewOnline(entry,phase=>{if(id!==actionId)return;pendingPhase=phase;find('[data-preview-status]').textContent=phase==='loading'?`Loading preview for ${entry.name}…`:`Previewing ${entry.name}…`;refresh();}):preview(entry));if(id!==actionId)return;
        if(!accepted){pendingKey=null;previewing=false;refresh();syncActions();return;}
        selectedKey=entry.key;pendingKey=null;
        previewing=false;find('[data-preview-status]').textContent=`Previewing ${entry.name}. Apply it or keep browsing.`;refresh();syncActions();
      }catch(error){if(id!==actionId)return;pendingKey=null;previewErrorKey=entry.key;previewing=false;find('[data-preview-status]').textContent=selectedKey?'Your previous preview is still on the canvas.':'Choose a filter to preview it on the canvas.';refresh();syncActions();find('[data-error]').textContent=`Could not preview this filter. Your previous preview was kept.`;}
    });
    previewButton.className='filter-card-preview';
    if(!online||previewOnline){previewButton.setAttribute('aria-label',`Preview ${entry.name}`);previewButton.setAttribute('aria-pressed',String(entry.key===selectedKey));previewButton.dataset.entryKey=entry.key;previewButton.dataset.entryAction='preview';}
    const thumb=browserNode('span',null,'filter-thumbnail');thumb.dataset.thumbnailState='idle';thumb.setAttribute('aria-hidden','true');const thumbnailCanvas=browserNode(online?'img':'canvas',null,'filter-thumbnail-image'),thumbnailState=browserNode('span',online?'Sample':'Preview','filter-thumbnail-state'),thumbnailDescription=browserNode('span',null,'visually-hidden thumbnail-accessibility');
    if(online){thumbnailCanvas.alt='';thumbnailCanvas.decoding='async';thumbnailCanvas.loading='lazy';thumbnailCanvas.referrerPolicy='no-referrer';thumbnailDescription.textContent='Standardized Online sample; the canvas preview uses your current image.';thumb.append(browserNode('span','Sample','filter-sample-badge'));}else{thumbnailCanvas.width=1;thumbnailCanvas.height=1;}
    thumbnailDescription.id=`filterThumbnailStatus${++thumbnailId}`;thumb.append(thumbnailCanvas,thumbnailState);previewButton.append(thumb,thumbnailDescription);
    const copy=browserNode('span',null,'filter-card-copy'),heading=browserNode('span',entry.name,'filter-card-name'),meta=browserNode('span',null,'result-meta');
    const sourceLabel=online?'Online':entry.source==='builtin'?'Built-in':'My Filter',authorLabel=entry.author||(entry.source==='builtin'?'Filter FabJS':'Author not specified');
    meta.append(browserNode('span',sourceLabel,'source-badge'),document.createTextNode(` · ${authorLabel}${entry.document?.benchmark?' · Benchmark':''}${entry.unavailable?' · Unavailable':''}`));
    if(entry.key===pendingKey)copy.append(browserNode('span',pendingPhase==='loading'?'Loading preview…':'Previewing…','filter-selection-label'));
    else if(entry.key===selectedKey)copy.append(browserNode('span',online?'✓ Previewing on canvas':'✓ Selected preview','filter-selection-label'));
    if(entry.key===previewErrorKey)copy.append(browserNode('span','Preview unavailable','filter-package-error'));copy.append(heading,meta,browserNode('span',entry.description||'No description provided.','filter-excerpt'));previewButton.append(copy);
    const star=browserButton(entry.favorite?'★':'☆',()=>{try{toggleFavorite(entry);find('[data-error]').textContent='';refresh();}catch(error){find('[data-error]').textContent=`Couldn’t save favorites in this browser. ${error.message}`;onError(error);}});star.className='filter-card-favorite';star.setAttribute('aria-pressed',String(entry.favorite));star.setAttribute('aria-label',`${entry.favorite?'Remove':'Add'} ${entry.name} ${entry.favorite?'from':'to'} favorites`);star.title=star.getAttribute('aria-label');star.dataset.entryKey=entry.key;star.dataset.entryAction='favorite';
    const actions=browserNode('div',null,'filter-card-actions');actions.append(star);
    if(entry.source==='custom'&&deleteCustom){
      const remove=browserButton('',async()=>{
        if(sessionEnding||previewing)return;
        remove.disabled=true;
        try{
          if(!await deleteCustom(entry))return;
          if(selectedKey===entry.key){selectedKey=null;pendingKey=null;previewErrorKey=null;find('[data-preview-status]').textContent='Choose a filter to preview it on the canvas.';}
          find('[data-error]').textContent='';refresh({preserveScroll:true});
          (find('[data-entry-action="favorite"]')||source).focus({preventScroll:true});
        }catch(error){find('[data-error]').textContent=`Could not delete this filter: ${error.message}`;onError(error);}
        finally{if(remove.isConnected)remove.disabled=false;}
      });
      remove.className='filter-card-delete';remove.innerHTML='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M3 6h18M8 6V4h8v2m3 0-1 14H6L5 6m5 4v7m4-7v7"/></svg>';
      remove.setAttribute('aria-label',`Delete ${entry.name} from My Filters`);remove.title=`Delete ${entry.name}`;remove.dataset.entryKey=entry.key;remove.dataset.entryAction='delete';actions.append(remove);
    }
    if(online&&downloadOnline){
      const download=browserButton(downloads.has(entry.key)?'…':'↓',async()=>{
        if(sessionEnding||downloads.has(entry.key))return;const epoch=sessionEpoch;downloads.add(entry.key);refresh();
        try{await downloadOnline(entry);}catch(error){if(epoch===sessionEpoch)find('[data-error]').textContent='Could not download this filter. The package was unavailable or invalid.';}
        finally{if(epoch===sessionEpoch){downloads.delete(entry.key);refresh();}}
      });
      download.className='filter-card-download';download.disabled=downloads.has(entry.key);download.setAttribute('aria-label',`Download PNG for ${entry.name}`);download.title=download.getAttribute('aria-label');download.setAttribute('aria-busy',String(download.disabled));download.dataset.entryKey=entry.key;download.dataset.entryAction='download';actions.append(download);
    }
    cardTop.append(previewButton,actions);row.append(cardTop);
    const tags=browserNode('div',null,'result-tags');
    for(const tag of entry.tags){
      const button=browserButton(tag,()=>{query.value='';favorites.checked=false;sort.value='az';selected.clear();selected.add(tagKey(tag));find('[data-tag-search]').value='';find('[data-filters]').open=true;page=0;refresh();find('[data-selected] button')?.focus();});
      button.setAttribute('aria-label',`Show all filters tagged ${tag}`);tags.append(button);
    }
    row.append(tags);row.thumbnailEntry=entry;return row;
  }
  function refresh({preserveScroll=false}={}){
    if(!dialog.open)return;
    const list=find('.filter-results'),scrollTop=list.scrollTop;
    const active=document.activeElement,focusKey=active?.dataset?.entryKey,focusAction=active?.dataset?.entryAction,oldButtons=[...dialog.querySelectorAll('[data-entry-action="favorite"]')],oldIndex=oldButtons.indexOf(active);
    let entries;try{entries=getEntries();}catch(error){find('[data-error]').textContent=error.message;entries=[];}
    const onlineOnly=source.value==='online',onlineState=includesOnline()?getOnlineState():{},onlineStatus=onlineState.status,waiting=onlineOnly&&onlineStatus!=='ready';
    const allLoading=source.value==='all'&&(onlineStatus==='idle'||onlineStatus==='loading'),allFailed=source.value==='all'&&onlineStatus==='error';
    const notice=find('[data-online-notice]'),message=find('[data-online-message]'),saved=onlineState.provenance==='saved'?'saved':'previous';
    notice.hidden=!includesOnline()||(!allLoading&&!allFailed&&!onlineState.refreshing&&!onlineState.refreshWarning);
    const noticeText=notice.hidden?'':allLoading?'Loading Online filters…':allFailed?'Online Library unavailable — showing local filters.':onlineState.refreshWarning?`Could not refresh Online Library — showing ${saved} catalogue.`:`Showing ${saved} catalogue · Checking for updates…`;
    if(message.textContent!==noticeText)message.textContent=noticeText;
    find('[data-online-retry]').hidden=!allFailed&&!onlineState.refreshWarning;
    const {results,choices}=searchCatalog(waiting?[]:entries,{query:query.value,source:source.value,favorites:favorites.checked,tags:[...selected],sort:sort.value});
    sort.options[1].disabled=!query.value.trim();find('[data-clear]').hidden=!query.value;
    const advancedCount=selected.size+(sort.value!=='az'?1:0),restrictionCount=advancedCount+(query.value.trim()?1:0)+(source.value!=='all'?1:0)+(favorites.checked?1:0);
    find('[data-restrictions]').textContent=advancedCount?`${advancedCount} active`:'';
    find('[data-restrictions]').hidden=!advancedCount;find('[data-reset]').hidden=!restrictionCount;
    page=Math.min(page,Math.max(0,Math.ceil(results.length/PAGE_SIZE)-1));
    clearTimeout(countTimer);if(waiting)find('[data-count]').textContent=onlineStatus==='error'?'Online Library unavailable':'Loading Online filters…';else countTimer=setTimeout(()=>{const count=`${results.length} filters`;if(find('[data-count]').textContent!==count)find('[data-count]').textContent=count;},150);
    const selectedBox=find('[data-selected]');selectedBox.replaceChildren();for(const key of selected)selectedBox.append(browserButton(`${choices.find(item=>item[0]===key)?.[1]||key} ×`,()=>{selected.delete(key);page=0;refresh();(find('[data-reset]').hidden?find('[data-filters] summary'):find('[data-reset]')).focus();}));
    const choiceBox=find('[data-choices]');choiceBox.replaceChildren();for(const [key,label] of choices.filter(item=>searchText(item[1]).includes(searchText(find('[data-tag-search]').value))).slice(0,50)){
      const wrapper=browserNode('label'),check=browserNode('input');check.type='checkbox';check.checked=selected.has(key);check.onchange=()=>{if(check.checked)selected.add(key);else selected.delete(key);page=0;refresh();[...choiceBox.querySelectorAll('input')].find(node=>node.value===key)?.focus();};check.value=key;wrapper.append(check,document.createTextNode(label));choiceBox.append(wrapper);
    }
    list.replaceChildren();for(const entry of results.slice(page*PAGE_SIZE,page*PAGE_SIZE+PAGE_SIZE))list.append(createResult(entry));
    if(!results.length){const empty=browserNode('li',null,'filter-library-empty');
      if(onlineOnly){
        const message=onlineStatus==='error'?'Could not reach the Online Library. Your Built-in and My Filters are still available.':waiting?'Loading Online filters…':entries.some(entry=>entry.source==='online')?'No Online filters match this search.':'No Online filters are currently available.';
        empty.append(browserNode('p',message));if(onlineStatus==='error')empty.append(browserButton('Retry',()=>{loadOnline({retry:true});refresh();}));
      }else empty.append(browserNode('p',source.value!=='all'&&favorites.checked&&!entries.some(entry=>entry.favorite)?'No favorites yet. Star a filter to keep it here.':source.value==='custom'&&!entries.some(entry=>entry.source==='custom')?'Saved filters appear here. Import a filter, then save it to keep it.':'No filters match this search.'),browserButton('Show all filters',reset));
      list.append(empty);
    }
    list.setAttribute('aria-busy',String(waiting&&onlineStatus!=='error'));
    const pageCount=Math.max(1,Math.ceil(results.length/PAGE_SIZE)),pages=find('[data-pages]');pages.hidden=results.length<=PAGE_SIZE;find('[data-page]').textContent=`Page ${page+1} of ${pageCount}`;find('[data-prev]').disabled=page===0;find('[data-next]').disabled=(page+1)*PAGE_SIZE>=results.length;
    syncActions();
    observeThumbnails(list);const selectedRow=selectedKey?list.querySelector(`[data-entry-key="${CSS.escape(selectedKey)}"]`):null;if(selectedRow)enqueueThumbnail(selectedRow,100);
    if(focusKey){const same=[...list.querySelectorAll('button')].find(node=>node.dataset.entryKey===focusKey&&node.dataset.entryAction===focusAction),neighbors=[...list.querySelectorAll('[data-entry-action="favorite"]')];(same||neighbors[Math.min(Math.max(0,oldIndex),neighbors.length-1)]||list.querySelector('button')||find('[data-reset]')).focus({preventScroll:preserveScroll});}
    if(preserveScroll)list.scrollTop=scrollTop;
  }
  find('.filter-results').addEventListener('focusin',event=>enqueueThumbnail(event.target.closest('.filter-card'),80));
  query.oncompositionstart=()=>composing=true;query.oncompositionend=()=>{composing=false;page=0;refresh();};query.oninput=()=>{if(!composing){page=0;refresh();}};
  for(const field of [source,favorites,sort])field.onchange=()=>{page=0;refresh();};
  source.onchange=()=>{page=0;if(includesOnline())loadOnline();refresh();};
  find('[data-online-retry]').onclick=()=>{loadOnline({retry:true});refresh();};
  find('[data-tag-search]').oninput=refresh;find('[data-clear]').onclick=()=>{query.value='';page=0;refresh();query.focus();};find('[data-reset]').onclick=reset;
  function changePage(offset){page+=offset;refresh();find('.filter-results').scrollTop=0;}
  find('[data-prev]').onclick=()=>changePage(-1);find('[data-next]').onclick=()=>changePage(1);
  launcher.onclick=async()=>{try{await begin();sessionEnding=false;sessionEpoch++;sessionOpen=true;selectedKey=null;pendingKey=null;previewErrorKey=null;previewing=false;find('[data-error]').textContent='';find('[data-preview-status]').textContent='Choose a filter to preview it on the canvas.';dialog.showModal();onOpen();if(includesOnline())loadOnline();refresh();if(globalThis.matchMedia?.('(pointer:coarse)').matches)find('[data-close]').focus();else query.focus();}catch(error){onError(error);}};
  return{invalidateSession:()=>{actionId++;sessionEpoch++;downloads.clear();sessionOpen=false;selectedKey=null;pendingKey=null;previewing=false;if(dialog.open)dialog.close('replaced');},refresh,refreshOnline:()=>{if(includesOnline())refresh({preserveScroll:true});},dialog,showError:message=>{find('[data-error]').textContent=message;}};
}
