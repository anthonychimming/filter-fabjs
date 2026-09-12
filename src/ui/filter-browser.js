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
    for(const [value,label] of choices)actions.append(browserButton(label,()=>{if(input&&!input.value.trim()){input.focus();return;}dialog.close(value);}));
    body.append(actions);dialog.append(body);document.body.append(dialog);
    dialog.addEventListener('close',()=>{const result={action:dialog.returnValue||'cancel',name:input?.value.trim()};dialog.remove();if(previous?.isConnected&&!previous.disabled)previous.focus();resolve(result);},{once:true});dialog.showModal();
  });
}

export function createFilterBrowser({launcher,getEntries,begin,preview,apply,cancel,toggleFavorite,requestThumbnail=null,clearThumbnailRequests=()=>{},onError}){
  const dialog=browserNode('dialog',null,'filter-browser');dialog.id='filterLibraryDialog';dialog.setAttribute('aria-labelledby','filterBrowserTitle');
  dialog.innerHTML='<div class="modal-head library-head"><div><strong id="filterBrowserTitle">Filter Library</strong><small>Preview treatments on your image, then apply one when it feels right.</small></div><button type="button" data-close aria-label="Cancel and close Filter Library">×</button></div><div class="browser-tools"><label class="library-search"><span>Search</span><input type="search" placeholder="Name, description, author or tag" data-search></label><button data-clear hidden>Clear search</button><div class="filter-actions"><label>Source<select data-source><option value="all">All</option><option value="builtin">Built-in</option><option value="custom">My Filters</option></select></label><label><input type="checkbox" data-favorites> Favorites only</label><label>Sort<select data-sort><option value="az">A–Z</option><option value="relevance">Relevance</option></select></label></div><details><summary>Tags</summary><label>Find tags<input type="search" data-tag-search></label><div data-choices class="tag-choices"></div><small>Match all selected tags. Up to 50 suggestions; type to narrow.</small></details><div data-selected class="chips"></div><div class="filter-actions browser-count-row"><span data-count role="status" aria-live="polite"></span><button data-reset>Reset view</button></div><p data-error role="alert"></p></div><ul class="filter-results" aria-label="Filter results"></ul><div class="browser-pages" data-pages><button data-prev>Previous</button><span data-page></span><button data-next>Next</button></div><div class="library-actions"><span data-preview-status role="status" aria-live="polite">Choose a filter to preview it on the canvas.</span><div><button type="button" data-cancel>Cancel</button><button type="button" class="primary" data-apply disabled>Apply Filter</button></div></div>';
  document.body.append(dialog);launcher.setAttribute('aria-controls',dialog.id);
  const find=selector=>dialog.querySelector(selector),query=find('[data-search]'),source=find('[data-source]'),favorites=find('[data-favorites]'),sort=find('[data-sort]'),selected=new Set();
  let page=0,composing=false,countTimer,selectedKey=null,previewing=false,sessionOpen=false,actionId=0,thumbnailObserver=null,thumbnailGeneration=0,thumbnailId=0;

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
  function enqueueThumbnail(row,priority=0){
    if(!requestThumbnail||!row?.isConnected)return;const requested=Number(row.dataset.thumbnailPriority??-1);if(requested>=priority)return;row.dataset.thumbnailPriority=String(priority);const entry=row.thumbnailEntry,generation=thumbnailGeneration,callback=result=>updateThumbnail(row,entry,result,generation);
    try{requestThumbnail(entry,callback,priority);}catch(error){updateThumbnail(row,entry,{state:'failed',error},generation);}
  }
  function observeThumbnails(list){
    disconnectThumbnailWork();const rows=[...list.querySelectorAll('.filter-card')];if(!requestThumbnail||!rows.length)return;
    if(typeof IntersectionObserver==='function'){
      thumbnailObserver=new IntersectionObserver(entries=>{for(const observation of entries)if(observation.isIntersecting){thumbnailObserver?.unobserve(observation.target);enqueueThumbnail(observation.target,20);}}, {root:list,rootMargin:THUMBNAIL_ROOT_MARGIN,threshold:0.01});rows.forEach(row=>thumbnailObserver.observe(row));
    }else rows.slice(0,THUMBNAIL_FALLBACK_COUNT).forEach(row=>enqueueThumbnail(row,10));
  }

  function syncActions(){find('[data-apply]').disabled=previewing||!selectedKey;find('[data-preview-status]').dataset.state=previewing?'busy':selectedKey?'ready':'idle';}
  async function cancelAndClose(){
    const id=++actionId;previewing=true;syncActions();find('[data-error]').textContent='';
    try{await cancel();if(id!==actionId)return;sessionOpen=false;dialog.close('cancel');}
    catch(error){previewing=false;syncActions();find('[data-error]').textContent=`Could not restore the working filter: ${error.message}`;onError(error);}
  }
  async function applyAndClose(){
    if(previewing||!selectedKey)return;
    const id=++actionId;previewing=true;syncActions();find('[data-error]').textContent='';find('[data-preview-status]').textContent='Applying selected filter…';
    try{if(!await apply()||id!==actionId){previewing=false;syncActions();return;}sessionOpen=false;dialog.close('apply');}
    catch(error){previewing=false;syncActions();find('[data-error]').textContent=`Could not apply filter: ${error.message}`;onError(error);}
  }
  find('[data-close]').onclick=cancelAndClose;find('[data-cancel]').onclick=cancelAndClose;find('[data-apply]').onclick=applyAndClose;
  dialog.addEventListener('cancel',event=>{event.preventDefault();cancelAndClose();});
  dialog.addEventListener('close',()=>{disconnectThumbnailWork();if(sessionOpen){Promise.resolve(cancel()).catch(onError);sessionOpen=false;}if(!launcher.disabled)launcher.focus();});

  function reset(){query.value='';source.value='all';favorites.checked=false;sort.value='az';selected.clear();find('[data-tag-search]').value='';page=0;refresh();}
  function createResult(entry){
    const row=browserNode('li',null,'filter-card');row.dataset.entryKey=entry.key;row.dataset.selected=String(entry.key===selectedKey);
    const cardTop=browserNode('div',null,'filter-card-main');
    const previewButton=browserButton('',async()=>{
      const previousKey=selectedKey,id=++actionId;selectedKey=entry.key;previewing=true;find('[data-error]').textContent='';find('[data-preview-status]').textContent=`Previewing ${entry.name}…`;refresh();syncActions();
      enqueueThumbnail(dialog.querySelector(`[data-entry-key="${CSS.escape(entry.key)}"]`),100);
      try{
        const accepted=await preview(entry);if(id!==actionId)return;
        if(!accepted){selectedKey=previousKey;previewing=false;refresh();syncActions();return;}
        previewing=false;find('[data-preview-status]').textContent=`Previewing ${entry.name}. Apply it or keep browsing.`;refresh();syncActions();
      }catch(error){if(id!==actionId)return;selectedKey=previousKey;previewing=false;refresh();syncActions();find('[data-error]').textContent=`Could not preview this filter. Your previous preview was kept.`;}
    });
    previewButton.className='filter-card-preview';previewButton.setAttribute('aria-label',`Preview ${entry.name}`);previewButton.setAttribute('aria-pressed',String(entry.key===selectedKey));previewButton.dataset.entryKey=entry.key;previewButton.dataset.entryAction='preview';
    const thumb=browserNode('span',null,'filter-thumbnail');thumb.dataset.thumbnailState='idle';thumb.setAttribute('aria-hidden','true');const thumbnailCanvas=browserNode('canvas',null,'filter-thumbnail-image'),thumbnailState=browserNode('span','Preview','filter-thumbnail-state'),thumbnailDescription=browserNode('span',null,'visually-hidden thumbnail-accessibility');thumbnailCanvas.width=1;thumbnailCanvas.height=1;thumbnailDescription.id=`filterThumbnailStatus${++thumbnailId}`;thumb.append(thumbnailCanvas,thumbnailState);previewButton.append(thumb,thumbnailDescription);
    const copy=browserNode('span',null,'filter-card-copy'),heading=browserNode('span',entry.name,'filter-card-name'),meta=browserNode('span',null,'result-meta');
    const sourceLabel=entry.source==='builtin'?'Built-in':'My Filter',authorLabel=entry.author||(entry.source==='builtin'?'Filter FabJS':'Author not specified');
    meta.append(browserNode('span',sourceLabel,'source-badge'),document.createTextNode(` · ${authorLabel}${entry.document.benchmark?' · Benchmark':''}${entry.unavailable?' · Unavailable':''}`));
    if(entry.key===selectedKey)copy.append(browserNode('span','✓ Selected preview','filter-selection-label'));copy.append(heading,meta,browserNode('span',entry.description||'No description provided.','filter-excerpt'));previewButton.append(copy);
    const star=browserButton(entry.favorite?'★':'☆',()=>{try{toggleFavorite(entry);find('[data-error]').textContent='';refresh();}catch(error){find('[data-error]').textContent=`Couldn’t save favorites in this browser. ${error.message}`;onError(error);}});star.className='filter-card-favorite';star.setAttribute('aria-pressed',String(entry.favorite));star.setAttribute('aria-label',`${entry.favorite?'Remove':'Add'} ${entry.name} ${entry.favorite?'from':'to'} favorites`);star.dataset.entryKey=entry.key;star.dataset.entryAction='favorite';
    cardTop.append(previewButton,star);row.append(cardTop);
    const tags=browserNode('div',null,'result-tags');
    for(const tag of entry.tags){
      const button=browserButton(tag,()=>{query.value='';source.value='all';favorites.checked=false;sort.value='az';selected.clear();selected.add(tagKey(tag));find('[data-tag-search]').value='';page=0;refresh();find('[data-selected] button')?.focus();});
      button.setAttribute('aria-label',`Show all filters tagged ${tag}`);tags.append(button);
    }
    row.append(tags);row.thumbnailEntry=entry;return row;
  }
  function refresh(){
    if(!dialog.open)return;
    const active=document.activeElement,focusKey=active?.dataset?.entryKey,focusAction=active?.dataset?.entryAction,oldButtons=[...dialog.querySelectorAll('[data-entry-action="favorite"]')],oldIndex=oldButtons.indexOf(active);
    let entries;try{entries=getEntries();}catch(error){find('[data-error]').textContent=error.message;entries=[];}
    const {results,choices}=searchCatalog(entries,{query:query.value,source:source.value,favorites:favorites.checked,tags:[...selected],sort:sort.value});
    sort.options[1].disabled=!query.value.trim();find('[data-clear]').hidden=!query.value;
    page=Math.min(page,Math.max(0,Math.ceil(results.length/PAGE_SIZE)-1));
    clearTimeout(countTimer);countTimer=setTimeout(()=>find('[data-count]').textContent=`${results.length} filters`,150);
    const selectedBox=find('[data-selected]');selectedBox.replaceChildren();for(const key of selected)selectedBox.append(browserButton(`${choices.find(item=>item[0]===key)?.[1]||key} ×`,()=>{selected.delete(key);page=0;refresh();find('[data-reset]').focus();}));
    const choiceBox=find('[data-choices]');choiceBox.replaceChildren();for(const [key,label] of choices.filter(item=>searchText(item[1]).includes(searchText(find('[data-tag-search]').value))).slice(0,50)){
      const wrapper=browserNode('label'),check=browserNode('input');check.type='checkbox';check.checked=selected.has(key);check.onchange=()=>{if(check.checked)selected.add(key);else selected.delete(key);page=0;refresh();[...choiceBox.querySelectorAll('input')].find(node=>node.value===key)?.focus();};check.value=key;wrapper.append(check,document.createTextNode(label));choiceBox.append(wrapper);
    }
    const list=find('.filter-results');list.replaceChildren();for(const entry of results.slice(page*PAGE_SIZE,page*PAGE_SIZE+PAGE_SIZE))list.append(createResult(entry));
    if(!results.length){const empty=browserNode('li',null,'filter-library-empty');empty.append(browserNode('p',favorites.checked&&!entries.some(entry=>entry.favorite)?'No favorites yet. Star a filter to keep it here.':source.value==='custom'&&!entries.some(entry=>entry.source==='custom')?'Saved filters appear here. Import a filter, then save it to keep it.':'No filters match this search.'),browserButton('Show all filters',reset));list.append(empty);}
    const pageCount=Math.max(1,Math.ceil(results.length/PAGE_SIZE)),pages=find('[data-pages]');pages.hidden=results.length<=PAGE_SIZE;find('[data-page]').textContent=`Page ${page+1} of ${pageCount}`;find('[data-prev]').disabled=page===0;find('[data-next]').disabled=(page+1)*PAGE_SIZE>=results.length;
    syncActions();
    observeThumbnails(list);const selectedRow=selectedKey?list.querySelector(`[data-entry-key="${CSS.escape(selectedKey)}"]`):null;if(selectedRow)enqueueThumbnail(selectedRow,100);
    if(focusKey){const same=[...list.querySelectorAll('button')].find(node=>node.dataset.entryKey===focusKey&&node.dataset.entryAction===focusAction),neighbors=[...list.querySelectorAll('[data-entry-action="favorite"]')];(same||neighbors[Math.min(Math.max(0,oldIndex),neighbors.length-1)]||list.querySelector('button')||find('[data-reset]')).focus();}
  }
  find('.filter-results').addEventListener('focusin',event=>enqueueThumbnail(event.target.closest('.filter-card'),80));
  query.oncompositionstart=()=>composing=true;query.oncompositionend=()=>{composing=false;page=0;refresh();};query.oninput=()=>{if(!composing){page=0;refresh();}};
  for(const field of [source,favorites,sort])field.onchange=()=>{page=0;refresh();};
  find('[data-tag-search]').oninput=refresh;find('[data-clear]').onclick=()=>{query.value='';page=0;refresh();query.focus();};find('[data-reset]').onclick=reset;
  find('[data-prev]').onclick=()=>{page--;refresh();};find('[data-next]').onclick=()=>{page++;refresh();};
  launcher.onclick=async()=>{try{await begin();sessionOpen=true;selectedKey=null;previewing=false;find('[data-error]').textContent='';find('[data-preview-status]').textContent='Choose a filter to preview it on the canvas.';dialog.showModal();refresh();query.focus();}catch(error){onError(error);}};
  return{refresh,dialog,showError:message=>{find('[data-error]').textContent=message;}};
}
