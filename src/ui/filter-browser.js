import { searchCatalog } from '../app/filter-catalog.js';
import { searchText, tagKey } from '../core/filter-metadata.js';

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

export function createFilterBrowser({launcher,getEntries,load,toggleFavorite,onError}){
  const dialog=browserNode('dialog',null,'filter-browser');dialog.setAttribute('aria-labelledby','filterBrowserTitle');
  dialog.innerHTML='<div class="modal-head"><strong id="filterBrowserTitle">Filters</strong><button type="button" data-close>Close</button></div><div class="browser-tools"><label>Search filters<input type="search" placeholder="Name, description, author or tag" data-search></label><button data-clear hidden>Clear search</button><div class="filter-actions"><label>Source<select data-source><option value="all">All</option><option value="builtin">Built-in</option><option value="custom">My Filters</option></select></label><label><input type="checkbox" data-favorites> Favorites only</label><label>Sort<select data-sort><option value="az">A–Z</option><option value="relevance">Relevance</option></select></label></div><details><summary>Tags</summary><label>Find tags<input type="search" data-tag-search></label><div data-choices class="tag-choices"></div><small>Match all selected tags. Up to 50 suggestions; type to narrow.</small></details><div data-selected class="chips"></div><div class="filter-actions"><span data-count role="status" aria-live="polite"></span><button data-reset>Reset view</button></div><p data-error role="alert"></p></div><ul class="filter-results"></ul><div class="browser-pages"><button data-prev>Previous</button><span data-page></span><button data-next>Next</button></div>';
  dialog.querySelector('#filterBrowserTitle').textContent='Filter search';
  document.body.append(dialog);
  const find=selector=>dialog.querySelector(selector),query=find('[data-search]'),source=find('[data-source]'),favorites=find('[data-favorites]'),sort=find('[data-sort]'),selected=new Set();let page=0,composing=false,countTimer;
  const close=()=>dialog.close();find('[data-close]').onclick=close;dialog.addEventListener('close',()=>{if(!launcher.disabled)launcher.focus();});
  function reset(){query.value='';source.value='all';favorites.checked=false;sort.value='az';selected.clear();find('[data-tag-search]').value='';page=0;refresh();}
  function refresh(){
    if(!dialog.open)return;
    const active=document.activeElement,focusKey=active?.dataset?.entryKey,focusAction=active?.dataset?.entryAction,oldButtons=[...dialog.querySelectorAll('[data-entry-action="favorite"]')],oldIndex=oldButtons.indexOf(active);
    let entries;try{entries=getEntries();}catch(error){find('[data-error]').textContent=error.message;entries=[];}
    const {results,choices}=searchCatalog(entries,{query:query.value,source:source.value,favorites:favorites.checked,tags:[...selected],sort:sort.value});
    sort.options[1].disabled=!query.value.trim();find('[data-clear]').hidden=!query.value;
    page=Math.min(page,Math.max(0,Math.ceil(results.length/50)-1));
    clearTimeout(countTimer);countTimer=setTimeout(()=>find('[data-count]').textContent=`${results.length} filters`,150);
    const selectedBox=find('[data-selected]');selectedBox.replaceChildren();for(const key of selected)selectedBox.append(browserButton(`${choices.find(item=>item[0]===key)?.[1]||key} ×`,()=>{selected.delete(key);page=0;refresh();find('[data-reset]').focus();}));
    const choiceBox=find('[data-choices]');choiceBox.replaceChildren();for(const [key,label] of choices.filter(item=>searchText(item[1]).includes(searchText(find('[data-tag-search]').value))).slice(0,50)){
      const wrapper=browserNode('label'),check=browserNode('input');check.type='checkbox';check.checked=selected.has(key);check.onchange=()=>{if(check.checked)selected.add(key);else selected.delete(key);page=0;refresh();[...choiceBox.querySelectorAll('input')].find(node=>node.value===key)?.focus();};check.value=key;wrapper.append(check,document.createTextNode(label));choiceBox.append(wrapper);
    }
    const list=find('.filter-results');list.replaceChildren();
    for(const entry of results.slice(page*50,page*50+50)){
      const row=browserNode('li'),top=browserNode('div',null,'filter-result-head');
      const loadButton=browserButton(entry.name,async()=>{try{find('[data-error]').textContent='';if(await load(entry))close();}catch(error){find('[data-error]').textContent=`Could not load: ${error.message}`;}});loadButton.setAttribute('aria-label',`Load ${entry.name}`);loadButton.dataset.entryKey=entry.key;loadButton.dataset.entryAction='load';
      const star=browserButton(entry.favorite?'★':'☆',()=>{try{toggleFavorite(entry);find('[data-error]').textContent='';refresh();}catch(error){find('[data-error]').textContent=`Couldn’t save favorites in this browser. ${error.message}`;onError(error);}});star.setAttribute('aria-pressed',String(entry.favorite));star.setAttribute('aria-label',`${entry.favorite?'Remove':'Add'} ${entry.name} ${entry.favorite?'from':'to'} favorites`);star.dataset.entryKey=entry.key;star.dataset.entryAction='favorite';
      top.append(loadButton,star);
      const sourceLabel=entry.source==='builtin'?'Built-in':'My Filters';
      const authorLabel=entry.author|| (entry.source==='builtin'?'Filter FabJS':'Author not specified');
      row.append(top,browserNode('small',`${sourceLabel} · ${authorLabel}${entry.document.benchmark?' · Benchmark':''}${entry.unavailable?' · Unavailable':''}`,'result-meta'));
      row.append(browserNode('p',entry.description,'filter-excerpt'));
      const tags=browserNode('div',null,'result-tags');
      for(const tag of entry.tags){
        const button=browserButton(tag,()=>{
          query.value='';source.value='all';favorites.checked=false;sort.value='az';selected.clear();selected.add(tagKey(tag));find('[data-tag-search]').value='';page=0;refresh();
          find('[data-selected] button')?.focus();
        });
        button.setAttribute('aria-label',`Show all filters tagged ${tag}`);tags.append(button);
      }
      row.append(tags);list.append(row);
    }
    if(!results.length){const empty=browserNode('li');empty.append(browserNode('p',favorites.checked&&!entries.some(entry=>entry.favorite)?'No favorites yet. Star a filter to keep it here.':source.value==='custom'&&!entries.some(entry=>entry.source==='custom')?'Saved filters appear here. Import a filter, then save it to keep it.':'No filters match this search.'),browserButton('Show all filters',reset));list.append(empty);}
    find('[data-page]').textContent=`Page ${page+1} of ${Math.max(1,Math.ceil(results.length/50))}`;find('[data-prev]').disabled=page===0;find('[data-next]').disabled=(page+1)*50>=results.length;
    if(focusKey){const same=[...list.querySelectorAll('button')].find(node=>node.dataset.entryKey===focusKey&&node.dataset.entryAction===focusAction),neighbors=[...list.querySelectorAll('[data-entry-action="favorite"]')];(same||neighbors[Math.min(Math.max(0,oldIndex),neighbors.length-1)]||list.querySelector('button')||find('[data-reset]')).focus();}
  }
  query.oncompositionstart=()=>composing=true;query.oncompositionend=()=>{composing=false;page=0;refresh();};query.oninput=()=>{if(!composing){page=0;refresh();}};
  for(const field of [source,favorites,sort])field.onchange=()=>{page=0;refresh();};
  find('[data-tag-search]').oninput=refresh;find('[data-clear]').onclick=()=>{query.value='';page=0;refresh();query.focus();};find('[data-reset]').onclick=reset;
  find('[data-prev]').onclick=()=>{page--;refresh();};find('[data-next]').onclick=()=>{page++;refresh();};
  launcher.onclick=()=>{find('[data-error]').textContent='';dialog.showModal();refresh();query.focus();};
  return{refresh,dialog,showError:message=>{find('[data-error]').textContent=message;}};
}
